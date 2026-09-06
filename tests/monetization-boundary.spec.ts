/**
 * The rule "money may read the answer, the answer may never read money" is only
 * worth anything if it is enforced. These tests read the source tree and assert
 * the dependency direction, so a future edit that reaches for a payout inside a
 * calculation fails the build rather than shipping and being noticed later, or
 * never.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function walk(directory: string, extensions = ['.ts', '.tsx']): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      out.push(...walk(path, extensions));
      continue;
    }
    if (extensions.some((extension) => entry.endsWith(extension))) out.push(path);
  }
  return out;
}

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

/** Executable text only. A comment naming a forbidden term is documentation. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function importsOf(source: string): string[] {
  const specifiers: string[] = [];
  const staticImport = /(?:^|\n)\s*import\s[^;]*?from\s+['"]([^'"]+)['"]/g;
  const dynamicImport = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
  const typeOnly = /(?:^|\n)\s*import\s+type\s[^;]*?from\s+['"]([^'"]+)['"]/g;
  for (const pattern of [staticImport, dynamicImport, typeOnly]) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source))) specifiers.push(match[1]);
  }
  return specifiers;
}

describe('calculation never depends on monetization', () => {
  const engineFiles = walk(join(ROOT, 'lib', 'calculations'));

  it('has engine files to check', () => {
    expect(engineFiles.length).toBeGreaterThan(30);
  });

  it('imports nothing from lib/monetization', () => {
    const offenders: string[] = [];
    for (const file of engineFiles) {
      for (const specifier of importsOf(read(file))) {
        if (specifier.includes('monetization') || specifier.includes('affiliates')) {
          offenders.push(`${relative(ROOT, file)} -> ${specifier}`);
        }
      }
    }
    expect(offenders, 'A calculation engine must never import the monetization layer').toEqual([]);
  });

  it('contains no monetization vocabulary in any engine', () => {
    // Narrow on purpose. "Payout" is a legitimate word in an insurance engine
    // (a claim settlement) and a bonus engine (when the money is paid), and a
    // test that flags real domain language is a test somebody deletes. These
    // are terms that only ever mean the commercial layer.
    const forbidden = /\b(advertiser|affiliate|sponsorship|expectedPayoutMinor|commercialWeight|merchantId|campaignId|leadId|cpc|cpl|epc|rpm)\b/i;
    const offenders: string[] = [];
    for (const file of engineFiles) {
      const source = stripComments(read(file));
      const match = forbidden.exec(source);
      if (match) offenders.push(`${relative(ROOT, file)}: ${match[0]}`);
    }
    expect(offenders, 'Monetization vocabulary appeared inside a calculation engine').toEqual([]);
  });
});

describe('relevance never depends on commerce', () => {
  it('imports no merchant, offer or payout', () => {
    const source = read(join(ROOT, 'lib', 'monetization', 'affiliate', 'relevance.ts'));
    for (const specifier of importsOf(source)) {
      expect(specifier, 'relevance.ts must not know about merchants or offers')
        .not.toMatch(/catalog|commercial|links|merchants|types/);
    }
    // Comments describe the rule and legitimately name what must not be here,
    // so only executable text is checked.
    expect(stripComments(source)).not.toMatch(/\b(commission|payout|commercialWeight|merchant|offer)\b/i);
  });
});

describe('the boundary type cannot restate an answer', () => {
  it('has no estimate, range or confidence field on a monetization decision', () => {
    const source = read(join(ROOT, 'lib', 'monetization', 'boundary.ts'));
    const decision = /export type MonetizationDecision = \{([\s\S]*?)\n\};/.exec(source)?.[1] ?? '';
    expect(decision).not.toMatch(/estimate|range|confidence|assumption|formula|result/i);
  });
});

describe('provider secrets never reach the browser', () => {
  const clientFiles = [
    ...walk(join(ROOT, 'components')),
    ...walk(join(ROOT, 'lib', 'monetization')),
  ].filter((file) => read(file).includes("'use client'"));

  it('reads no server-only credential in a client module', () => {
    const serverOnly = /process\.env\.(?!NEXT_PUBLIC_)[A-Z0-9_]*(KEY|SECRET|TOKEN|PEPPER|CLIENT_ID|TRACKING_ID|PUBLISHER_ID)/;
    const offenders = clientFiles
      .filter((file) => serverOnly.test(read(file)))
      .map((file) => relative(ROOT, file));
    expect(offenders, 'A client component read a server-only credential').toEqual([]);
  });

  it('never imports the lead service or a provider adapter into a client module', () => {
    const offenders: string[] = [];
    for (const file of clientFiles) {
      for (const specifier of importsOf(read(file))) {
        if (/leads\/(service|providers)|store\/(d1|repositories)/.test(specifier)) {
          offenders.push(`${relative(ROOT, file)} -> ${specifier}`);
        }
      }
    }
    expect(offenders, 'Lead delivery code must stay on the server').toEqual([]);
  });
});

describe('the quote checker is never accusatory', () => {
  it('contains no word implying a contractor is cheating the reader', () => {
    const directories = [join(ROOT, 'lib', 'monetization'), join(ROOT, 'components', 'monetization')];
    const forbidden = /\b(rip[- ]?off|ripoff|overcharg\w*|scam\w*|cheat\w*|swindl\w*)\b/i;
    const offenders: string[] = [];
    for (const directory of directories) {
      let files: string[] = [];
      try {
        files = walk(directory);
      } catch {
        continue;
      }
      for (const file of files) {
        if (forbidden.test(read(file))) offenders.push(relative(ROOT, file));
      }
    }
    expect(offenders, 'Accusatory vocabulary appeared in a commercial module').toEqual([]);
  });
});

describe('no PII is logged', () => {
  it('never console-logs a contact field', () => {
    const files = walk(join(ROOT, 'lib', 'monetization'));
    const offenders: string[] = [];
    for (const file of files) {
      const source = read(file);
      const logs = source.match(/console\.\w+\([^)]*\)/g) ?? [];
      for (const log of logs) {
        if (/phone|email|firstName|lastName|contact\b|addressLine/i.test(log)) {
          offenders.push(`${relative(ROOT, file)}: ${log}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
