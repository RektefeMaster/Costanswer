/**
 * Minimal ZIP reader for ingestion.
 *
 * BLS publishes OEWS as a ZIP holding a single XLSX, and XLSX is itself a ZIP.
 * Node has no archive reader, and adding one would put a parsing dependency in
 * a repository whose runtime dependencies are next, react and zod. This reads
 * the central directory rather than scanning for local headers, so a truncated
 * or tampered archive fails here instead of yielding a partial file list, and
 * every entry's CRC-32 is checked against the value the archive declares.
 *
 * Bytes are handled as `Uint8Array` rather than `Buffer`: the Workers type
 * globals this project compiles against declare `Buffer` as `any`, so Node's
 * own buffer methods do not type-check here at all.
 */
import { crc32, inflateRawSync } from 'node:zlib';

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_FILE_HEADER = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;
const ZIP64_SENTINEL_32 = 0xffffffff;
const ZIP64_SENTINEL_16 = 0xffff;
const STORED = 0;
const DEFLATED = 8;
/** ZIP allows a trailing comment of at most 64 KiB after the end record. */
const MAX_END_RECORD_SEARCH = 0xffff + 22;

function view(archive: Uint8Array): DataView {
  return new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
}

function findEndOfCentralDirectory(bytes: DataView): number {
  const earliest = Math.max(0, bytes.byteLength - MAX_END_RECORD_SEARCH);
  for (let offset = bytes.byteLength - 22; offset >= earliest; offset -= 1) {
    if (bytes.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY) return offset;
  }
  throw new Error('Not a ZIP archive: no end-of-central-directory record.');
}

const utf8 = new TextDecoder('utf-8', { fatal: true });

/** Every file in the archive, keyed by its path inside the archive. */
export function readZipEntries(archive: Uint8Array): Map<string, Uint8Array> {
  const bytes = view(archive);
  const endOffset = findEndOfCentralDirectory(bytes);
  const entryCount = bytes.getUint16(endOffset + 10, true);
  const directoryOffset = bytes.getUint32(endOffset + 16, true);
  if (entryCount === ZIP64_SENTINEL_16 || directoryOffset === ZIP64_SENTINEL_32) {
    throw new Error('ZIP64 archives are not supported by this reader.');
  }

  const entries = new Map<string, Uint8Array>();
  let cursor = directoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (bytes.getUint32(cursor, true) !== CENTRAL_FILE_HEADER) {
      throw new Error(`Corrupt ZIP central directory at entry ${index}.`);
    }
    const method = bytes.getUint16(cursor + 10, true);
    const declaredCrc = bytes.getUint32(cursor + 16, true);
    const compressedSize = bytes.getUint32(cursor + 20, true);
    const uncompressedSize = bytes.getUint32(cursor + 24, true);
    const nameLength = bytes.getUint16(cursor + 28, true);
    const extraLength = bytes.getUint16(cursor + 30, true);
    const commentLength = bytes.getUint16(cursor + 32, true);
    const localHeaderOffset = bytes.getUint32(cursor + 42, true);
    const name = utf8.decode(archive.subarray(cursor + 46, cursor + 46 + nameLength));
    cursor += 46 + nameLength + extraLength + commentLength;

    if (name.endsWith('/')) continue;
    if (compressedSize === ZIP64_SENTINEL_32 || uncompressedSize === ZIP64_SENTINEL_32 || localHeaderOffset === ZIP64_SENTINEL_32) {
      throw new Error(`ZIP64 entry ${name} is not supported by this reader.`);
    }
    if (bytes.getUint32(localHeaderOffset, true) !== LOCAL_FILE_HEADER) {
      throw new Error(`Corrupt ZIP local header for ${name}.`);
    }

    // The local header repeats the name and extra fields with its own lengths;
    // the central directory's lengths do not apply here.
    const localNameLength = bytes.getUint16(localHeaderOffset + 26, true);
    const localExtraLength = bytes.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = archive.subarray(dataStart, dataStart + compressedSize);

    let contents: Uint8Array;
    if (method === STORED) contents = compressed.slice();
    else if (method === DEFLATED) contents = new Uint8Array(inflateRawSync(compressed));
    else throw new Error(`Unsupported ZIP compression method ${method} for ${name}.`);

    if (contents.length !== uncompressedSize) {
      throw new Error(`${name} inflated to ${contents.length} bytes, not the declared ${uncompressedSize}.`);
    }
    if (crc32(contents) !== declaredCrc) {
      throw new Error(`${name} failed its CRC-32 check.`);
    }
    entries.set(name, contents);
  }
  return entries;
}

export function readZipEntry(archive: Uint8Array, name: string): Uint8Array {
  const entry = readZipEntries(archive).get(name);
  if (!entry) throw new Error(`ZIP archive has no entry named ${name}.`);
  return entry;
}
