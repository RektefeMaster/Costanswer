/**
 * Minimal XLSX reader for ingestion.
 *
 * Only what an official data workbook uses: the workbook part, its
 * relationships, the shared-string table, and cell values. Formulas, styles,
 * dates and merged ranges are deliberately unsupported — a government release
 * that starts using them should fail loudly here rather than be half-read.
 *
 * The OEWS state sheet is a 45 MB XML part, so rows are scanned and yielded one
 * at a time instead of being parsed into a document tree.
 */
import { readZipEntries } from './zip';

const SPREADSHEET_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const RELATIONSHIP_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

export function decodeXmlText(value: string): string {
  if (!value.includes('&')) return value;
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    const named = NAMED_ENTITIES[entity];
    if (named === undefined) throw new Error(`Unsupported XML entity &${entity}; in workbook text.`);
    return named;
  });
}

/** `AA` in a cell reference such as `AA37409` is the 27th column, index 26. */
export function columnIndexFromReference(reference: string): number {
  let index = 0;
  for (let position = 0; position < reference.length; position += 1) {
    const code = reference.charCodeAt(position);
    if (code < 65 || code > 90) break;
    index = index * 26 + (code - 64);
  }
  if (index === 0) throw new Error(`Cell reference ${reference} has no column letters.`);
  return index - 1;
}

function attributeValue(attributes: string, name: string): string | undefined {
  const needle = ` ${name}="`;
  const start = attributes.indexOf(needle);
  if (start === -1) return undefined;
  const valueStart = start + needle.length;
  const end = attributes.indexOf('"', valueStart);
  if (end === -1) throw new Error(`Unterminated ${name} attribute in workbook XML.`);
  return attributes.slice(valueStart, end);
}

/** True when `<tag` at `start` is that element and not a longer name such as `<rowBreaks`. */
function isElementStart(xml: string, start: number, tag: string): boolean {
  const following = xml.charCodeAt(start + tag.length + 1);
  return following === 32 || following === 62 || following === 47 || following === 9 || following === 10 || following === 13;
}

function readSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  let cursor = 0;
  for (;;) {
    const itemStart = xml.indexOf('<si', cursor);
    if (itemStart === -1) return strings;
    if (!isElementStart(xml, itemStart, 'si')) { cursor = itemStart + 3; continue; }
    const openEnd = xml.indexOf('>', itemStart);
    if (xml.charCodeAt(openEnd - 1) === 47) { strings.push(''); cursor = openEnd + 1; continue; }
    const itemEnd = xml.indexOf('</si>', openEnd);
    if (itemEnd === -1) throw new Error('Unterminated shared string entry.');
    // A shared string is split across runs when parts of it are styled
    // differently; the cell's value is every run's text concatenated.
    let text = '';
    let runCursor = openEnd;
    for (;;) {
      const textStart = xml.indexOf('<t', runCursor);
      if (textStart === -1 || textStart > itemEnd) break;
      if (!isElementStart(xml, textStart, 't')) { runCursor = textStart + 2; continue; }
      const textOpenEnd = xml.indexOf('>', textStart);
      if (xml.charCodeAt(textOpenEnd - 1) === 47) { runCursor = textOpenEnd + 1; continue; }
      const textEnd = xml.indexOf('</t>', textOpenEnd);
      text += decodeXmlText(xml.slice(textOpenEnd + 1, textEnd));
      runCursor = textEnd + 4;
    }
    strings.push(text);
    cursor = itemEnd + 5;
  }
}

export type Workbook = {
  sheetNames: string[];
  /** Cells of one sheet, row by row, indexed by column with gaps as `null`. */
  rows(sheetName: string): Generator<(string | null)[]>;
};

const utf8 = new TextDecoder('utf-8', { fatal: true });

export function readWorkbook(xlsx: Uint8Array): Workbook {
  const parts = readZipEntries(xlsx);

  function part(name: string): string {
    const entry = parts.get(name);
    if (!entry) throw new Error(`Workbook is missing ${name}.`);
    return utf8.decode(entry);
  }

  const workbookXml = part('xl/workbook.xml');
  if (!workbookXml.includes(SPREADSHEET_NS)) throw new Error('Workbook is not a SpreadsheetML document.');
  const relationshipsXml = part('xl/_rels/workbook.xml.rels');
  if (!relationshipsXml.includes(RELATIONSHIP_NS)) throw new Error('Workbook relationships part is not an OPC relationship document.');

  const targetsByRelationshipId = new Map<string, string>();
  for (const match of relationshipsXml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const id = attributeValue(match[1], 'Id');
    const target = attributeValue(match[1], 'Target');
    if (id && target) targetsByRelationshipId.set(id, target.startsWith('/') ? target.slice(1) : `xl/${target}`);
  }

  const sheetPaths = new Map<string, string>();
  for (const match of workbookXml.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const name = attributeValue(match[1], 'name');
    const relationshipId = attributeValue(match[1], 'r:id') ?? attributeValue(match[1], 'id');
    if (!name || !relationshipId) continue;
    const target = targetsByRelationshipId.get(relationshipId);
    if (!target) throw new Error(`Sheet ${name} points at missing relationship ${relationshipId}.`);
    sheetPaths.set(decodeXmlText(name), target);
  }

  const sharedStrings = parts.has('xl/sharedStrings.xml') ? readSharedStrings(part('xl/sharedStrings.xml')) : [];

  function* rows(sheetName: string): Generator<(string | null)[]> {
    const sheetPath = sheetPaths.get(sheetName);
    if (!sheetPath) throw new Error(`Workbook has no sheet named ${sheetName}. Found: ${[...sheetPaths.keys()].join(', ')}.`);
    const xml = part(sheetPath);
    let cursor = 0;
    for (;;) {
      const rowStart = xml.indexOf('<row', cursor);
      if (rowStart === -1) return;
      if (!isElementStart(xml, rowStart, 'row')) { cursor = rowStart + 4; continue; }
      const rowOpenEnd = xml.indexOf('>', rowStart);
      if (xml.charCodeAt(rowOpenEnd - 1) === 47) { yield []; cursor = rowOpenEnd + 1; continue; }
      const rowEnd = xml.indexOf('</row>', rowOpenEnd);
      if (rowEnd === -1) throw new Error('Unterminated row in worksheet XML.');

      const cells = new Map<number, string>();
      let cellCursor = rowOpenEnd + 1;
      for (;;) {
        const cellStart = xml.indexOf('<c', cellCursor);
        if (cellStart === -1 || cellStart > rowEnd) break;
        if (!isElementStart(xml, cellStart, 'c')) { cellCursor = cellStart + 2; continue; }
        const cellOpenEnd = xml.indexOf('>', cellStart);
        const attributes = xml.slice(cellStart + 2, cellOpenEnd);
        const reference = attributeValue(attributes, 'r');
        if (!reference) throw new Error('Worksheet cell is missing its reference.');
        const column = columnIndexFromReference(reference);

        if (xml.charCodeAt(cellOpenEnd - 1) === 47) { cellCursor = cellOpenEnd + 1; continue; }
        const cellEnd = xml.indexOf('</c>', cellOpenEnd);
        const inner = xml.slice(cellOpenEnd + 1, cellEnd);
        const type = attributeValue(attributes, 't') ?? 'n';

        let value: string | undefined;
        if (type === 'inlineStr') {
          const textStart = inner.indexOf('<t');
          if (textStart !== -1) {
            const textOpenEnd = inner.indexOf('>', textStart);
            value = decodeXmlText(inner.slice(textOpenEnd + 1, inner.indexOf('</t>', textOpenEnd)));
          }
        } else {
          const valueStart = inner.indexOf('<v>');
          if (valueStart !== -1) {
            const raw = inner.slice(valueStart + 3, inner.indexOf('</v>', valueStart));
            if (type === 's') {
              const shared = sharedStrings[Number(raw)];
              if (shared === undefined) throw new Error(`Cell ${reference} references shared string ${raw}, which does not exist.`);
              value = shared;
            } else if (type === 'n' || type === 'str' || type === 'b') {
              value = decodeXmlText(raw);
            } else {
              throw new Error(`Cell ${reference} has unsupported type "${type}".`);
            }
          }
        }
        if (value !== undefined) cells.set(column, value);
        cellCursor = cellEnd + 4;
      }

      const width = cells.size === 0 ? 0 : Math.max(...cells.keys()) + 1;
      const row: (string | null)[] = [];
      for (let column = 0; column < width; column += 1) row.push(cells.get(column) ?? null);
      yield row;
      cursor = rowEnd + 6;
    }
  }

  return { sheetNames: [...sheetPaths.keys()], rows };
}
