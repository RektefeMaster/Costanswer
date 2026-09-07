import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  AdvancedSection,
  CalculationReceipt,
  ConfidenceChip,
  ReverseSolve,
  ScenarioCompare,
} from '@/components/calculators/CalculatorUI';
import {
  compareScenarios,
  confidenceStatement,
  receiptText,
  solveForTarget,
} from '@/lib/calculators/depth';
import { ANALYTICS_EVENTS, parseAnalyticsEvent } from '@/lib/analytics';

const money = (value: number) => `$${value.toFixed(2)}`;

describe('confidence', () => {
  it('never states a level without a reason behind it', () => {
    expect(confidenceStatement('medium', ['2025 schedule, not 2026'])).toEqual({
      level: 'medium',
      reason: '2025 schedule, not 2026.',
    });
    // Reasons are often built by filtering, and a filter can empty the list
    // while the type still says it is non-empty.
    expect(confidenceStatement('high', [''] as unknown as [string])).toBeNull();
    expect(confidenceStatement('low', ['  '] as unknown as [string])).toBeNull();
  });

  it('joins several reasons into one sentence and does not double the full stop', () => {
    const statement = confidenceStatement('low', ['local tax is not included', 'the schedule is a year old.']);
    expect(statement?.reason).toBe('local tax is not included; the schedule is a year old.');
  });

  it('renders the reason, and renders nothing at all when there is none', () => {
    const markup = renderToStaticMarkup(
      createElement(ConfidenceChip, { level: 'medium', reasons: ['Maryland county tax is not included'] }),
    );
    expect(markup).toContain('Medium confidence');
    expect(markup).toContain('Maryland county tax is not included.');

    const empty = renderToStaticMarkup(
      createElement(ConfidenceChip, { level: 'high', reasons: [''] as unknown as [string] }),
    );
    expect(empty).toBe('');
  });
});

describe('scenario compare', () => {
  it('names the difference rather than leaving the reader to subtract', () => {
    const [row] = compareScenarios([{ label: 'Monthly payment', a: 1_800, b: 1_950, format: money }]);
    expect(row.a).toBe('$1800.00');
    expect(row.b).toBe('$1950.00');
    expect(row.change).toBe('+$150.00');
    expect(row.direction).toBe('up');
  });

  it('reads a floating-point hair as unchanged, because that is what it is', () => {
    const [row] = compareScenarios([{ label: 'Total', a: 0.1 + 0.2, b: 0.3, format: money }]);
    expect(row.direction).toBe('unchanged');
    expect(row.change).toBe('$0.00');
  });

  it('marks a fall as down and writes it with a minus sign', () => {
    const [row] = compareScenarios([{ label: 'Interest', a: 900, b: 400, format: money }]);
    expect(row.direction).toBe('down');
    expect(row.change).toBe('−$500.00');
  });

  it('renders both columns and the difference', () => {
    const markup = renderToStaticMarkup(createElement(ScenarioCompare, {
      labelA: 'Now',
      labelB: 'After refinancing',
      rows: [{ label: 'Monthly payment', a: 1_800, b: 1_650, format: money }],
    }));
    expect(markup).toContain('After refinancing');
    expect(markup).toContain('delta-down');
    expect(markup).toContain('−$150.00');
  });
});

describe('reverse solve', () => {
  const takeHome = (salary: number) => salary * 0.72;

  it('finds the input that reaches a target', () => {
    const result = solveForTarget({ evaluate: takeHome, target: 72_000, lower: 0, upper: 500_000, tolerance: 1 });
    expect(result.status).toBe('solved');
    if (result.status === 'solved') expect(result.value).toBeCloseTo(100_000, 0);
  });

  it('says a target is out of reach instead of returning the closest value', () => {
    const result = solveForTarget({ evaluate: takeHome, target: 900_000, lower: 0, upper: 500_000, tolerance: 1 });
    expect(result.status).toBe('unreachable');
    if (result.status === 'unreachable') expect(result.reason).toMatch(/reaches that result/i);
  });

  it('solves a decreasing relationship as readily as an increasing one', () => {
    const monthly = (years: number) => 300_000 / (years * 12);
    const result = solveForTarget({ evaluate: monthly, target: 1_250, lower: 5, upper: 40, tolerance: 1 });
    expect(result.status).toBe('solved');
    if (result.status === 'solved') expect(result.value).toBeCloseTo(20, 1);
  });

  it('refuses an input that does not move the result', () => {
    const result = solveForTarget({ evaluate: () => 500, target: 500, lower: 0, upper: 100 });
    expect(result.status).toBe('flat');
  });

  it('refuses a range that is not a range', () => {
    expect(solveForTarget({ evaluate: takeHome, target: 1, lower: 100, upper: 100 }).status).toBe('invalid-range');
    expect(solveForTarget({ evaluate: takeHome, target: Number.NaN, lower: 0, upper: 10 }).status).toBe('invalid-range');
  });

  it('renders the target field and the solve control', () => {
    const markup = renderToStaticMarkup(createElement(ReverseSolve, {
      solvedFor: 'annual-gross-salary',
      targetLabel: 'Target take-home',
      inputLabel: 'Salary needed',
      evaluate: takeHome,
      lower: 0,
      upper: 500_000,
      formatInput: money,
      prefix: '$',
    }));
    expect(markup).toContain('Target take-home');
    expect(markup).toContain('id="reverse-annual-gross-salary"');
    expect(markup).toContain('Solve');
  });
});

describe('calculation receipt', () => {
  const receipt = {
    title: 'Salary after tax',
    headline: { label: 'Annual take-home', value: '$72,000' },
    breakdown: [
      { label: 'Gross annual', value: '$100,000' },
      { label: 'Federal income tax', value: '$14,000', detail: 'After the standard deduction' },
    ],
    assumptions: ['Tax year 2026.'],
    calculationVersion: 'salary-after-tax-v1.0.0',
    datasetSnapshotIds: ['us-tax-2026-v1'],
  };

  it('carries the answer and its working into plain text', () => {
    const text = receiptText(receipt);
    expect(text).toContain('Annual take-home: $72,000');
    expect(text).toContain('- Federal income tax: $14,000 (After the standard deduction)');
    expect(text).toContain('- Tax year 2026.');
    expect(text).toContain('Method salary-after-tax-v1.0.0');
    expect(text).toContain('Data us-tax-2026-v1');
  });

  it('says where the numbers came from even when nothing was loaded', () => {
    expect(receiptText({ ...receipt, datasetSnapshotIds: [] })).toContain('Data Manual inputs / fixed rules');
  });

  it('offers the copy action alongside the breakdown', () => {
    const markup = renderToStaticMarkup(createElement(CalculationReceipt, receipt));
    expect(markup).toContain('How we got this');
    expect(markup).toContain('What we assumed');
    expect(markup).toContain('Copy result and working');
  });
});

describe('advanced section', () => {
  it('starts collapsed, and keeps its contents in the document', () => {
    const markup = renderToStaticMarkup(createElement(
      AdvancedSection,
      { id: 'trade-in', title: 'Trade-in and fees' },
      createElement('p', null, 'Registration, title, doc fee'),
    ));
    // `details` without the attribute is closed. The content is still present,
    // which is the reason for a details element over a conditional render.
    expect(markup).not.toContain('<details class="advanced-section" open');
    expect(markup).toContain('Trade-in and fees');
    expect(markup).toContain('Registration, title, doc fee');
  });
});

describe('analytics boundary', () => {
  const valid: Record<string, unknown> = {
    advanced_opened: { toolId: 'car-affordability', category: 'car', section: 'trade-in' },
    compare_used: { toolId: 'mortgage', category: 'home' },
    reverse_used: { toolId: 'salary-after-tax', category: 'money', solvedFor: 'annual-gross-salary' },
    quote_checked: { toolId: 'cost-estimate', category: 'home', verdict: 'within' },
    source_clicked: { toolId: 'salary-after-tax', category: 'money', sourceId: 'us-tax-2026-v1' },
    guide_to_calculator: { toolId: 'mortgage', category: 'home', guideSlug: 'how-much-house' },
    language_switched: { from: 'en-US', to: 'es-US' },
  };

  it('accepts exactly the payload each new event declares', () => {
    for (const [name, payload] of Object.entries(valid)) {
      expect(parseAnalyticsEvent(name as never, payload), name).not.toBeNull();
    }
  });

  it('rejects an extra field, a missing field, and a value outside the allowlist', () => {
    for (const [name, payload] of Object.entries(valid)) {
      const fields = Object.keys(payload as Record<string, unknown>);
      expect(parseAnalyticsEvent(name as never, { ...(payload as object), salary: 120_000 }), `${name} extra`).toBeNull();

      const [dropped, ...rest] = fields;
      const missing = Object.fromEntries(rest.map((key) => [key, (payload as Record<string, unknown>)[key]]));
      expect(parseAnalyticsEvent(name as never, missing), `${name} missing ${dropped}`).toBeNull();

      /*
       * A number, not an odd string. Free-text id fields accept any short
       * string by design — that is what `boundedId` is — so only a wrong
       * *type* is rejected across every field alike.
       */
      const wrong = { ...(payload as Record<string, unknown>), [fields[fields.length - 1]]: 42_000 };
      expect(parseAnalyticsEvent(name as never, wrong), `${name} bad value`).toBeNull();
    }
  });

  it('never lets a calculator input value through, whatever it is called', () => {
    expect(parseAnalyticsEvent('advanced_opened', {
      toolId: 'car-affordability', category: 'car', section: 'trade-in', amount: 42_000,
    })).toBeNull();
  });

  it('keeps one name per action rather than a synonym for related tools', () => {
    expect(ANALYTICS_EVENTS).toContain('related_tool_click');
    expect(ANALYTICS_EVENTS).not.toContain('related_calculator_clicked');
  });
});

/*
 * The §M P5 rule, asserted over the components themselves.
 *
 * Counted per `CalculatorPanel` rather than per file: several files hold four
 * or five small tools, and their combined field count says nothing about
 * whether any one of them is crowded.
 */
describe('depth primitives are actually used', () => {
  const directory = path.join(process.cwd(), 'components', 'calculators');

  // Calculators sit in per-category folders, so this walks rather than lists.
  // A flat read would silently find nothing and pass, which is the failure mode
  // this whole check exists to prevent.
  const calculatorFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return calculatorFiles(full);
      return entry.isFile() && entry.name.endsWith('.tsx') && entry.name !== 'CalculatorUI.tsx' ? [full] : [];
    });

  const panels = calculatorFiles(directory)
    .map((full) => path.relative(directory, full))
    .flatMap((file) => {
      const source = readFileSync(path.join(directory, file), 'utf8');
      const starts = [...source.matchAll(/<CalculatorPanel[\s>]/g)].map((match) => match.index ?? 0);
      return starts.map((start, index) => {
        const body = source.slice(start, starts[index + 1] ?? source.length);
        return {
          file,
          index,
          fields: (body.match(/<Field[\s>]/g) ?? []).length,
          usesAdvanced: body.includes('<AdvancedSection'),
        };
      });
    });

  it('finds the calculator panels to check', () => {
    expect(panels.length).toBeGreaterThan(40);
  });

  /*
   * One exemption, named rather than silently skipped.
   *
   * Duration arithmetic takes two durations. Each is three boxes — hours,
   * minutes, seconds — so it counts as six fields while asking for two things.
   * Folding any of them would hide half of one duration behind a disclosure,
   * which is worse than showing all six. If a second entry ever wants to join
   * this list, that is the argument it has to make.
   */
  const GROUPED_INPUT_PANELS = new Set(['everyday/EverydayCalculators.tsx:1']);

  it('folds every tool with more than five inputs behind an advanced section', () => {
    const crowded = panels
      .filter((panel) => panel.fields > 5 && !panel.usesAdvanced)
      .filter((panel) => !GROUPED_INPUT_PANELS.has(`${panel.file}:${panel.index + 1}`))
      .map((panel) => `${panel.file} panel ${panel.index + 1} has ${panel.fields} inputs`);
    expect(crowded).toEqual([]);
  });

  it('keeps the exemption list honest: every entry still exists and is still crowded', () => {
    for (const entry of GROUPED_INPUT_PANELS) {
      const [file, index] = entry.split(':');
      const panel = panels.find((candidate) => candidate.file === file && candidate.index + 1 === Number(index));
      expect(panel, `${entry} is exempted but no longer exists`).toBeDefined();
      expect(panel!.fields, `${entry} no longer needs an exemption`).toBeGreaterThan(5);
    }
  });

  it('does not keep a one-off advanced disclosure beside AdvancedSection', () => {
    const offenders = calculatorFiles(directory)
      .filter((file) => /className="[^"]*(health-advanced|insurance-customize)/.test(readFileSync(file, 'utf8')))
      .map((file) => path.relative(directory, file));
    expect(offenders).toEqual([]);
  });
});
