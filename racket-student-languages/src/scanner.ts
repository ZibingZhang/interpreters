import { UnreachableCode } from './errors.js';
import {
  RacketComplexNumber,
  RacketExactNumber,
  RacketInexactFloat,
  RacketInexactFraction,
  RacketRealNumber,
  RacketString,
  RACKET_FALSE,
  RACKET_TRUE
} from './values.js';
import { 
  KEYWORDS,
  Token, 
  TokenType 
} from './tokens.js'
import racket from './racket.js';

enum State {
  // Miscellaneous
  TOP,
  POUND,
  // Numbers
  EXPLICIT_EXACTNESS,
  REAL_NUMERATOR,
  REAL_DENOMINATOR,
  REAL_DECIMAL,
  // Strings
  STRING,
  ESCAPED_CHAR,
  // Name
  NAME
}

/**
 * A scanner for transforming text into tokens.
 */
class Scanner {
  private static ScannerError = class extends Error {
    msg: string;

    constructor(msg: string) {
      super();
      this.msg = msg;
    }
  }

  private static NextLexeme = class extends Error {}

  private escapedChars = new Map<string, string>([
    ['a', '\a'],
    ['b', '\b'],
    ['e', '\e'],
    ['f', '\f'],
    ['n', '\n'],
    ['r', '\r'],
    ['t', '\t'],
    ['v', '\v'],
    ['\\', '\\'],
    ["'", '\''],
    ['"', '\"']
  ]);
  private singleCharTokens = new Map<string, TokenType>([
    ['(', TokenType.OPEN],
    [')', TokenType.CLOSE],
    ['{', TokenType.OPEN_BRACE],
    ['}', TokenType.CLOSE_BRACE],
    ['[', TokenType.OPEN_BRACKET],
    [']', TokenType.CLOSE_BRACKET],
    ["'", TokenType.QUOTE]
  ]);

  /**
   * Produces a tokenized representation of the text.
   * @param text the text which the tokens will represent
   */
  scan(text: string): Token[] {
    let groups = text.split(/(\s+|\(|\)|\[|\]|\{|\}|')/);
    let lexeme = '';
    let tokens: Token[] = [];
    let exact = true;
    let explicitExactness = false;
    let realNumerator = '';
    let realDenominator = '';

    for (let group of groups) {
      let state = State.TOP;

      try {
        for (let char of group) {
          switch (true) {
            /* STATE  = TOP */
            // LEXEME = .+
            case state === State.TOP: {
              lexeme = char;
              switch (true) {
                case /\s/.exec(char) !== null: {
                  this.nextLexeme();
                }
                case this.singleCharTokens.has(char): {
                  // @ts-ignore
                  tokens.push(new Token(this.singleCharTokens.get(char), char));
                  break;
                }
                case char === '#': {
                  state = State.POUND;
                  break;
                }
                case !isNaN(+char):
                  state = State.REAL_NUMERATOR;
                  explicitExactness = false;
                  realNumerator = char;
                  break;
                case char === '"':
                  state = State.STRING;
                  break;
                default: {
                  state = State.NAME;
                }
              }
              break;
            }
            
            /* STATE  = POUND */
            // LEXEME = #.*
            case state === State.POUND: {
              lexeme += char;
              switch (true) {
                // LEXEME = #t.*
                case char === 't': {
                  if (['#t', '#true'].includes(group)) {
                    tokens.push(new Token(TokenType.BOOLEAN, group, RACKET_TRUE));
                    this.nextLexeme();
                  } else {
                    this.error(`bad syntax \`${group.substring(0, 3)}\``);
                  }
                }
                // LEXEME = #f.*
                case char === 'f': {
                  if (['#f', '#false'].includes(group)) {
                    tokens.push(new Token(TokenType.BOOLEAN, group, RACKET_FALSE));
                    this.nextLexeme();
                  } else {
                    this.error(`bad syntax \`${group.substring(0, 3)}\``);
                  }
                }
                // LEXEME = #e.*
                case char === 'e': {
                  state = State.EXPLICIT_EXACTNESS;
                  explicitExactness = true;
                  exact = true;
                  break;
                }
                // LEXEME = #i.*
                case char === 'i': {
                  state = State.EXPLICIT_EXACTNESS;
                  explicitExactness = true;
                  exact = false;
                  break;
                }
                // LEXEME = #(?!t|f|e|i).*
                default: {
                  this.error(`bad syntax \`${group.substring(0, 2)}\``);
                }
              }
              break;
            }

            /* STATE  = EXPLICIT EXACTNESS */
            // LEXEME = #[e|i].*
            case state === State.EXPLICIT_EXACTNESS: {
              lexeme += char;
              switch (true) {
                case !isNaN(+char): {
                  state = State.REAL_NUMERATOR;
                  realNumerator = char;
                  break;
                }
                default: {
                  this.error(`bad digit \`${char}\``);
                }
              }
              break;
            }
            
            /* STATE  = REAL NUMERATOR */
            // LEXEME = [#[e|i]]?\d.*
            case state === State.REAL_NUMERATOR: {
              switch (true) {
                case !isNaN(+char): {
                  lexeme += char;
                  realNumerator += char;
                  break;
                }
                case char === '/': {
                  state = State.REAL_DENOMINATOR;
                  lexeme += char;
                  realDenominator = '';
                  break;
                }
                // case char === '+' || char == '-': {
                //   lexeme += char;
                //   break;
                // }
                case char === '"':
                  state = State.STRING;
                  tokens.push(this.makeInteger(lexeme, exact, realNumerator));
                  lexeme = char;
                  break;
                default: {
                  if (explicitExactness) {
                    this.error(`bad digit \`${char}\``);
                  } else {
                    state = State.NAME;
                    lexeme += char;
                  }
                }
              }
              break;
            }

            /* STATE  = REAL DENOMINATOR */
            // LEXEME = [#[e|i]]?\d+/.*
            case state === State.REAL_DENOMINATOR: {
              switch (true) {
                case !isNaN(+char): {
                  lexeme += char;
                  realDenominator += char;
                  break;
                }
                // case char === '+' || char == '-': {
                //   lexeme += char;
                //   break;
                // }
                case char === '"':
                  state = State.STRING;
                  if (realDenominator.length === 0) {
                    if (explicitExactness) {
                      this.error(`missing digits after \`/\` in ${lexeme}`);
                    } else {
                      tokens.push(this.makeName(lexeme));
                    }
                  } else {
                    tokens.push(this.makeFraction(lexeme, exact, realDenominator, realDenominator));
                  }
                  lexeme = char;
                  break;
                default: {
                  lexeme += char;
                  if (explicitExactness) {
                    this.error(`bad digit \`${char}\``);
                  } else {
                    state = State.NAME;
                  }
                }
              }
              break;
            }

            /* STATE  = STRING */
            // LEXEME = ".*
            case state === State.STRING: {
              switch (true) {
                case char === '\\': {
                  state = State.ESCAPED_CHAR;
                  break;
                }
                case char === '"':
                  state = State.TOP;
                  lexeme += char;
                  tokens.push(new Token(TokenType.STRING, lexeme, new RacketString(lexeme.slice(1, -1))));
                  break;
                default: {
                  lexeme += char;
                }
              }
              break;
            }

            /* STATE  = ESCAPED_CHAR */
            // LEXEME = ".*\\.*
            case state === State.ESCAPED_CHAR: {
              switch (true) {
                case this.escapedChars.has(char): {
                  state = State.STRING;
                  lexeme += this.escapedChars.get(char);
                  break;
                }
                default: {
                  this.error(`unknown escape sequence \`\\${char}\` in string`);
                }
              }
              break;
            }

            /* STATE  = NAME */
            case state === State.NAME: {
              switch (true) {
                case char === '"': {
                  state = State.STRING;
                  if (KEYWORDS.has(lexeme)) {
                    // @ts-ignore
                    tokens.push(new Token(KEYWORDS.get(lexeme), lexeme));
                  } else {
                    tokens.push(new Token(TokenType.IDENTIFIER, lexeme));
                  }
                  lexeme = char;
                  break;
                }
                default: {
                  lexeme += char;
                }
              }
              break;
            }
  
            default: {
              throw new UnreachableCode();
            }
          }
        }

        if (state === State.REAL_DENOMINATOR) {
          if (realDenominator === '') {
            if (explicitExactness) {
              // LEXEME = #[e|i]\d+/
              this.error(`missing digits after \`/\` in \`${lexeme}\``);
            } else {
              // LEXEME = \d+/
              state = State.NAME;
            }
          }
        }

        switch (true) {
          case state === State.TOP: {
            break;
          }
          case state === State.POUND: {
            this.error('bad syntax: `#`');
          }
          case state === State.EXPLICIT_EXACTNESS: {
            this.error('no digits');
          }
          case state === State.REAL_NUMERATOR: {
            tokens.push(this.makeInteger(lexeme, exact, realNumerator));
            break;
          }
          case state === State.REAL_DENOMINATOR: {
            tokens.push(this.makeFraction(lexeme, exact, realNumerator, realDenominator));
            break;
          }
          case state === State.STRING:
          case state === State.ESCAPED_CHAR: {
            this.error('expected a closing `"`');
          }
          case state === State.NAME: {
            tokens.push(this.makeName(lexeme));
            break;
          }
          default: {
            throw new UnreachableCode();
          }
        }
      } catch (err) {
        if (err instanceof Scanner.ScannerError) {
          racket.error(err.msg);
          return [];
        } else if (!(err instanceof Scanner.NextLexeme)) {
          throw err;
        }
      }
    }

    tokens.push(new Token(TokenType.EOF, ''));
    return tokens;
  }

  /* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
   * Constructing Tokens
   * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */
  
  private makeFraction(lexeme: string, exact: boolean, numeratorStr: string, denominatorStr: string): Token {
  let numerator = BigInt(numeratorStr)
  let denominator = BigInt(denominatorStr);
  if (denominator === 0n) {
    this.error(`division by zero in \`${numerator}/${denominator}\``);
  }
  let value;
  if (exact) {
    value = new RacketExactNumber(numerator, denominator);
  } else {
    value = new RacketInexactFraction(numerator, denominator);
  }
  return new Token(TokenType.NUMBER, lexeme, value);
  }

  private makeInteger(lexeme: string, exact: boolean, integerStr: string): Token {
  return this.makeFraction(lexeme, exact, integerStr, '1');
  }

  private makeName(lexeme: string): Token {
    if (KEYWORDS.has(lexeme)) {
      // @ts-ignore
      return new Token(KEYWORDS.get(lexeme), lexeme);
    } else {
      return new Token(TokenType.IDENTIFIER, lexeme);
    }
  }

  /* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
   * Error Reporting
   * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

  private error(msg: string): never {
    throw new Scanner.ScannerError(`read-syntax: ${msg}`);
  }

  private nextLexeme(): never {
    throw new Scanner.NextLexeme();
  }
}

export default new Scanner();
