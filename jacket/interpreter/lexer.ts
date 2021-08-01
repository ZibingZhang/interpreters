import * as moo from 'moo';

export const lexer = moo.compile({
  whiteSpace: {
    match: /\s+/,
    lineBreaks: true,
  },
  comment: {
    match: /(?:#\|.*\|#|;;.*(?:$|\n))/,
    lineBreaks: true,
  },
  commentNextExpr: /#;/,
  quote: "'",
  lparen: /[(|[|{]/,
  rparen: /[)|\]|}]/,
  true: /(?:#true|#t|#T)(?=$|\s)/,
  false: /(?:#false|#f|#F)(?=$|\s)/,
  string: /"[^"]*"/,
  decimal: /-?(?:\d*\.\d+|\d+\.\d*)(?=$|\s)/,
  errorDivZero: /-?\d+\/0+(?=$|\s)/,
  fraction: /-?\d+\/\d+(?=$|\s)/,
  integer: /-?\d+(?=$|\s)/,
  errorPound: {
    match: /(?:#.+?|#(?=$|\s))/,
    error: true,
  },
  name: {
    match: /[^",'`()[\]{}|;\s]+/,
    type: moo.keywords({
      'keyword': [
        'define',
        'define-struct',
        'lambda',
        'local',
        'letrec',
        'let',
        'let*',
        'cond',
        'else',
        'if',
        'and',
        'or',
        'time',
        'check-expect',
        'check-random',
        'check-within',
        'check-member-of',
        'check-range',
        'check-satisfied',
        'check-error',
        'require',
      ],
    })
  },
  errorFallthrough: /./,
});
