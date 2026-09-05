const MAX_EXPRESSION_LENGTH = 180;
const MAX_DEPTH = 32;
const MAX_FACTORIAL = 18;
const MAX_ABS_RESULT = 1e308;
const ALLOWED_FUNCTIONS = ['sqrt', 'log', 'ln', 'sin', 'cos', 'tan', 'abs'] as const;
const ALLOWED_CONSTANTS = ['pi', 'π', 'e'] as const;

export type AngleMode = 'radians' | 'degrees';

export type ScientificEvaluateOptions = {
  angleMode: AngleMode;
};

type Token =
  | { kind: 'number'; value: number }
  | { kind: 'op'; value: string }
  | { kind: 'ident'; value: string }
  | { kind: 'lparen' }
  | { kind: 'rparen' };

class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (char === ' ' || char === '\t' || char === '\n') {
      index += 1;
      continue;
    }
    if (char === '×') {
      tokens.push({ kind: 'op', value: '*' });
      index += 1;
      continue;
    }
    if (char === '÷') {
      tokens.push({ kind: 'op', value: '/' });
      index += 1;
      continue;
    }
    if ('+-*/^!'.includes(char)) {
      tokens.push({ kind: 'op', value: char });
      index += 1;
      continue;
    }
    if (char === '(') {
      tokens.push({ kind: 'lparen' });
      index += 1;
      continue;
    }
    if (char === ')') {
      tokens.push({ kind: 'rparen' });
      index += 1;
      continue;
    }
    if (char === 'π') {
      tokens.push({ kind: 'ident', value: 'π' });
      index += 1;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      const start = index;
      index += 1;
      while (index < source.length && /[0-9.]/.test(source[index])) index += 1;
      if (index < source.length && (source[index] === 'e' || source[index] === 'E')) {
        let probe = index + 1;
        if (probe < source.length && (source[probe] === '+' || source[probe] === '-')) probe += 1;
        if (probe < source.length && /[0-9]/.test(source[probe])) {
          index = probe;
          while (index < source.length && /[0-9]/.test(source[index])) index += 1;
        }
      }
      const raw = source.slice(start, index);
      if (!/^\d+(\.\d+)?([eE][+-]?\d+)?$|^\.\d+([eE][+-]?\d+)?$/.test(raw)) {
        throw new ParseError('Use a valid number.');
      }
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new ParseError('Number is out of range.');
      tokens.push({ kind: 'number', value });
      continue;
    }
    if (/[A-Za-z]/.test(char)) {
      const start = index;
      index += 1;
      while (index < source.length && /[A-Za-z]/.test(source[index])) index += 1;
      tokens.push({ kind: 'ident', value: source.slice(start, index).toLowerCase() });
      continue;
    }
    throw new ParseError('This expression contains a character that is not allowed.');
  }
  return insertImplicitMultiplication(tokens);
}

function isImplicitMulLeft(token?: Token): boolean {
  if (!token) return false;
  if (token.kind === 'number' || token.kind === 'rparen') return true;
  if (token.kind === 'op' && token.value === '!') return true;
  if (token.kind === 'ident' && (token.value === 'pi' || token.value === 'π' || token.value === 'e')) return true;
  return false;
}

function isImplicitMulRight(token?: Token): boolean {
  if (!token) return false;
  if (token.kind === 'lparen' || token.kind === 'number') return true;
  if (token.kind === 'ident') return true;
  return false;
}

function insertImplicitMultiplication(tokens: Token[]): Token[] {
  const result: Token[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const current = tokens[i];
    result.push(current);
    const next = tokens[i + 1];
    if (next && isImplicitMulLeft(current) && isImplicitMulRight(next)) {
      result.push({ kind: 'op', value: '*' });
    }
  }
  return result;
}

function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new ParseError('Factorial is only defined for whole numbers 0 through 18.');
  if (n > MAX_FACTORIAL) throw new ParseError(`Factorial is limited to ${MAX_FACTORIAL}! to keep the result exact.`);
  let result = 1;
  for (let i = 2; i <= n; i += 1) result *= i;
  return result;
}

function finiteResult(value: number, label: string): number {
  if (!Number.isFinite(value) || Math.abs(value) > MAX_ABS_RESULT) {
    throw new ParseError(`${label} is out of range.`);
  }
  return value;
}

function toRadians(value: number, mode: AngleMode): number {
  return mode === 'degrees' ? value * (Math.PI / 180) : value;
}

function callFunction(name: string, argument: number, mode: AngleMode): number {
  switch (name) {
    case 'sqrt':
      if (argument < 0) throw new ParseError('Square root of a negative number is not supported.');
      return finiteResult(Math.sqrt(argument), 'Square root');
    case 'log':
      if (argument <= 0) throw new ParseError('log is only defined for positive numbers.');
      return finiteResult(Math.log10(argument), 'log');
    case 'ln':
      if (argument <= 0) throw new ParseError('ln is only defined for positive numbers.');
      return finiteResult(Math.log(argument), 'ln');
    case 'sin':
      return finiteResult(Math.sin(toRadians(argument, mode)), 'sin');
    case 'cos':
      return finiteResult(Math.cos(toRadians(argument, mode)), 'cos');
    case 'tan': {
      const radians = toRadians(argument, mode);
      const cosine = Math.cos(radians);
      if (Math.abs(cosine) < 1e-15) throw new ParseError('Tangent is undefined for this angle.');
      return finiteResult(Math.sin(radians) / cosine, 'tan');
    }
    case 'abs':
      return Math.abs(argument);
    default:
      throw new ParseError(`Unknown function: ${name}.`);
  }
}

function constantValue(name: string): number {
  switch (name) {
    case 'pi':
    case 'π':
      return Math.PI;
    case 'e':
      return Math.E;
    default:
      throw new ParseError(`Unknown name: ${name}.`);
  }
}

class Parser {
  private readonly tokens: Token[];

  private readonly angleMode: AngleMode;

  private index = 0;

  private depth = 0;

  constructor(tokens: Token[], angleMode: AngleMode) {
    this.tokens = tokens;
    this.angleMode = angleMode;
  }

  parse(): number {
    if (this.tokens.length === 0) throw new ParseError('Enter an expression.');
    const value = this.parseAdd();
    if (this.peek()) throw new ParseError('This expression has leftover characters.');
    return finiteResult(value, 'Result');
  }

  private peek(): Token | undefined {
    return this.tokens[this.index];
  }

  private take(): Token {
    const token = this.tokens[this.index];
    if (!token) throw new ParseError('This expression is incomplete.');
    this.index += 1;
    return token;
  }

  private parseAdd(): number {
    let value = this.parseMul();
    while (this.peek()?.kind === 'op' && (this.peek() as { value: string }).value === '+' || this.peek()?.kind === 'op' && (this.peek() as { value: string }).value === '-') {
      const op = this.take() as Extract<Token, { kind: 'op' }>;
      const right = this.parseMul();
      value = finiteResult(op.value === '+' ? value + right : value - right, 'Addition');
    }
    return value;
  }

  private parseMul(): number {
    let value = this.parseUnary();
    while (this.peek()?.kind === 'op' && (this.peek() as { value: string }).value === '*' || this.peek()?.kind === 'op' && (this.peek() as { value: string }).value === '/') {
      const op = this.take() as Extract<Token, { kind: 'op' }>;
      const right = this.parseUnary();
      if (op.value === '/') {
        if (right === 0) throw new ParseError('Cannot divide by zero.');
        value = finiteResult(value / right, 'Division');
      } else {
        value = finiteResult(value * right, 'Multiplication');
      }
    }
    return value;
  }

  private parseUnary(): number {
    if (this.peek()?.kind === 'op' && (this.peek() as { value: string }).value === '+') {
      this.take();
      return this.parseUnary();
    }
    if (this.peek()?.kind === 'op' && (this.peek() as { value: string }).value === '-') {
      this.take();
      return finiteResult(-this.parseUnary(), 'Negation');
    }
    return this.parsePower();
  }

  private parsePower(): number {
    const base = this.parsePostfix();
    if (this.peek()?.kind === 'op' && (this.peek() as { value: string }).value === '^') {
      this.take();
      const exponent = this.parseUnary();
      if (Math.abs(exponent) > 1_000) throw new ParseError('Exponent is too large.');
      const result = base ** exponent;
      return finiteResult(result, 'Power');
    }
    return base;
  }

  private parsePostfix(): number {
    const value = this.parsePrimary();
    if (this.peek()?.kind === 'op' && (this.peek() as { value: string }).value === '!') {
      this.take();
      return factorial(value);
    }
    return value;
  }

  private parsePrimary(): number {
    this.depth += 1;
    if (this.depth > MAX_DEPTH) throw new ParseError('This expression is nested too deeply.');
    try {
      const token = this.take();
      if (token.kind === 'number') return token.value;
      if (token.kind === 'ident') {
        if ((ALLOWED_CONSTANTS as readonly string[]).includes(token.value) && this.peek()?.kind !== 'lparen') {
          return constantValue(token.value);
        }
        if (!(ALLOWED_FUNCTIONS as readonly string[]).includes(token.value)) {
          throw new ParseError(`Unknown name: ${token.value}.`);
        }
        if (this.peek()?.kind !== 'lparen') throw new ParseError(`Function ${token.value} needs parentheses.`);
        this.take();
        const argument = this.parseAdd();
        if (this.peek()?.kind !== 'rparen') throw new ParseError('Missing a closing parenthesis.');
        this.take();
        return callFunction(token.value, argument, this.angleMode);
      }
      if (token.kind === 'lparen') {
        const value = this.parseAdd();
        if (this.peek()?.kind !== 'rparen') throw new ParseError('Missing a closing parenthesis.');
        this.take();
        return value;
      }
      throw new ParseError('This expression is not valid.');
    } finally {
      this.depth -= 1;
    }
  }
}

export function evaluateScientific(expression: string, options: ScientificEvaluateOptions): number {
  if (typeof expression !== 'string') throw new ParseError('Enter an expression.');
  if (expression.length > MAX_EXPRESSION_LENGTH) {
    throw new ParseError(`Expressions cannot be longer than ${MAX_EXPRESSION_LENGTH} characters.`);
  }
  if (/[`$]|constructor|__proto__|prototype|window|document|Function|eval/.test(expression)) {
    throw new ParseError('This expression is not allowed.');
  }
  const tokens = tokenize(expression);
  return new Parser(tokens, options.angleMode).parse();
}

export const SCIENTIFIC_LIMITS = {
  maxExpressionLength: MAX_EXPRESSION_LENGTH,
  maxDepth: MAX_DEPTH,
  maxFactorial: MAX_FACTORIAL,
  allowedFunctions: ALLOWED_FUNCTIONS,
  allowedConstants: ALLOWED_CONSTANTS,
} as const;
