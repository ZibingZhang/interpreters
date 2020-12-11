ace.define("ace/mode/racket_highlight_rules",["require","exports","module","ace/lib/oop","ace/mode/doc_comment_highlight_rules","ace/mode/text_highlight_rules"], function(require, exports, module) {
"use strict";

let oop = require("../lib/oop");
let TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;
let identifierRe = /[^#\s"][^\s\[({\])}]*/;

let RacketHighlightRules = function(options) {
    let keywordMapper = this.createKeywordMapper({
        "constant.language.boolean": "true|false",
        "keyword": "and|check-expect|cond|define|define-struct|else|if|lambda|or|quote",
        "constant.numeric": "+NaN.0|+NaN.f|-NaN.0|-NaN.f|+inf.0|+inf.f|-inf.0|-inf.f"
    }, "identifier");

    this.$rules = {
        "start" : [
            {
                token: "whitespace",
                regex: /\s+/
            },
            {
                token: "constant.language.boolean",
                regex: /#true|#false|#t(?=\s|\[|(|{|\]|)|})|#f(?=\s|\[|(|{|\]|)|})/
            }, {
                token : "comment", // multi line comment
                regex : /#\|/,
                next: [
                    {token : "comment", regex : /\|#/, next : "start"},
                    {defaultToken : "comment", caseInsensitive: true}
                ]
            }, {
                token : "comment",
                regex : /;/,
                next: [
                    {token : "comment", regex : "$|^", next : "start"},
                    {defaultToken : "comment", caseInsensitive: true}
                ]
            }, {
                token: "invalid",
                regex: /#[^\s\[({\])}]*/
            }, {
                token : "paren.lparen",
                regex : /[\[({]/,
            }, {
                token : "paren.rparen",
                regex : /[\])}]/
            }, {
            token : "string",
                regex : '"',
                next  : "string"
            }, {
                token : "constant.numeric",
                regex : /[+|-]?(\.\d+|\d+(\.\d*|\/\d+)?)([+|-]\d+(\.\d+|\d+(\.\d*|\/\d+)?)?i)?/
            }, {
                token : keywordMapper,
                regex : identifierRe
            }
        ],
        "string" : [
            {
                token : "string",
                regex : '"',
                next: "start"
            }, {
                defaultToken: "string"
            }
        ]
    };

    this.normalizeRules();
};

oop.inherits(RacketHighlightRules, TextHighlightRules);

exports.RacketHighlightRules = RacketHighlightRules;
});

ace.define("ace/mode/matching_brace_outdent",["require","exports","module","ace/range"], function(require, exports, module) {
"use strict";

let Range = require("../range").Range;

let MatchingBraceOutdent = function() {};

(function() {

    this.checkOutdent = function(line, input) {
        if (! /^\s+$/.test(line))
            return false;

        return /^\s*\}/.test(input);
    };

    this.autoOutdent = function(doc, row) {
        let line = doc.getLine(row);
        let match = line.match(/^(\s*\})/);

        if (!match) return 0;

        let column = match[1].length;
        let openBracePos = doc.findMatchingBracket({row: row, column: column});

        if (!openBracePos || openBracePos.row == row) return 0;

        let indent = this.$getIndent(doc.getLine(openBracePos.row));
        doc.replace(new Range(row, 0, row, column-1), indent);
    };

    this.$getIndent = function(line) {
        return line.match(/^\s*/)[0];
    };

}).call(MatchingBraceOutdent.prototype);

exports.MatchingBraceOutdent = MatchingBraceOutdent;
});

ace.define("ace/mode/folding/cstyle",["require","exports","module","ace/lib/oop","ace/range","ace/mode/folding/fold_mode"], function(require, exports, module) {
"use strict";

let oop = require("../../lib/oop");
let Range = require("../../range").Range;
let BaseFoldMode = require("./fold_mode").FoldMode;

let FoldMode = exports.FoldMode = function(commentRegex) {
    if (commentRegex) {
        this.foldingStartMarker = new RegExp(
            this.foldingStartMarker.source.replace(/\|[^|]*?$/, "|" + commentRegex.start)
        );
        this.foldingStopMarker = new RegExp(
            this.foldingStopMarker.source.replace(/\|[^|]*?$/, "|" + commentRegex.end)
        );
    }
};
oop.inherits(FoldMode, BaseFoldMode);

(function() {
    
    this.foldingStartMarker = /([\{\[\(])[^\}\]\)]*$|^\s*(#\|)/;
    this.foldingStopMarker = /^[^\[\{\(]*([\}\]\)])|^[\s\*]*(\|#)/;
    this.singleLineBlockCommentRe = /^\s*(#\|).*\|#\s*$/;
    this.startRegionRe = /^\s*(#\||\/\/)#?region\b/;
    this._getFoldWidgetBase = this.getFoldWidget;
    this.getFoldWidget = function(session, foldStyle, row) {
        let line = session.getLine(row);
    
        if (this.singleLineBlockCommentRe.test(line)) {
            if (!this.startRegionRe.test(line))
                return "";
        }
    
        let fw = this._getFoldWidgetBase(session, foldStyle, row);
    
        if (!fw && this.startRegionRe.test(line))
            return "start"; // lineCommentRegionStart
    
        return fw;
    };

    this.getFoldWidgetRange = function(session, foldStyle, row, forceMultiline) {
        let line = session.getLine(row);
        
        if (this.startRegionRe.test(line))
            return this.getCommentRegionBlock(session, line, row);
        
        let match = line.match(this.foldingStartMarker);
        if (match) {
            let i = match.index;

            if (match[1])
                return this.openingBracketBlock(session, match[1], row, i);
                
            let range = session.getCommentFoldRange(row, i + match[0].length, 1);
            
            if (range && !range.isMultiLine()) {
                if (forceMultiline) {
                    range = this.getSectionRange(session, row);
                } else if (foldStyle != "all")
                    range = null;
            }
            
            return range;
        }

        if (foldStyle === "markbegin")
            return;

        match = line.match(this.foldingStopMarker);
        if (match) {
            let i = match.index + match[0].length;

            if (match[1])
                return this.closingBracketBlock(session, match[1], row, i);

            return session.getCommentFoldRange(row, i, -1);
        }
    };
    
    this.getSectionRange = function(session, row) {
        let line = session.getLine(row);
        let startIndent = line.search(/\S/);
        let startRow = row;
        let startColumn = line.length;
        row = row + 1;
        let endRow = row;
        let maxRow = session.getLength();
        while (++row < maxRow) {
            line = session.getLine(row);
            let indent = line.search(/\S/);
            if (indent === -1)
                continue;
            if  (startIndent > indent)
                break;
            let subRange = this.getFoldWidgetRange(session, "all", row);
            
            if (subRange) {
                if (subRange.start.row <= startRow) {
                    break;
                } else if (subRange.isMultiLine()) {
                    row = subRange.end.row;
                } else if (startIndent == indent) {
                    break;
                }
            }
            endRow = row;
        }
        
        return new Range(startRow, startColumn, endRow, session.getLine(endRow).length);
    };
    this.getCommentRegionBlock = function(session, line, row) {
        let startColumn = line.search(/\s*$/);
        let maxRow = session.getLength();
        let startRow = row;
        
        let re = /^\s*(?:#\||;|--)#?(end)?region\b/;
        let depth = 1;
        while (++row < maxRow) {
            line = session.getLine(row);
            let m = re.exec(line);
            if (!m) continue;
            if (m[1]) depth--;
            else depth++;

            if (!depth) break;
        }

        let endRow = row;
        if (endRow > startRow) {
            return new Range(startRow, startColumn, endRow, line.length);
        }
    };

}).call(FoldMode.prototype);

});

ace.define("ace/mode/behaviour/racket",["require","exports","module","ace/lib/oop","ace/mode/behaviour","ace/token_iterator","ace/lib/lang"], function(require, exports, module) {
"use strict";

let oop = require("../../lib/oop");
let Behaviour = require("../behaviour").Behaviour;
let TokenIterator = require("../../token_iterator").TokenIterator;

let SAFE_INSERT_IN_TOKENS =
    ["text", "paren.rparen", "rparen", "paren", "punctuation.operator"];
let SAFE_INSERT_BEFORE_TOKENS =
    ["text", "paren.rparen", "rparen", "paren", "punctuation.operator", "comment"];

let context;
let contextCache = {};
let defaultQuotes = {'"' : '"'};

let initContext = function(editor) {
    let id = -1;
    if (editor.multiSelect) {
        id = editor.selection.index;
        if (contextCache.rangeCount != editor.multiSelect.rangeCount)
            contextCache = {rangeCount: editor.multiSelect.rangeCount};
    }
    if (contextCache[id])
        return context = contextCache[id];
    context = contextCache[id] = {
        autoInsertedBrackets: 0,
        autoInsertedRow: -1,
        autoInsertedLineEnd: "",
        maybeInsertedBrackets: 0,
        maybeInsertedRow: -1,
        maybeInsertedLineStart: "",
        maybeInsertedLineEnd: ""
    };
};

let getWrapped = function(selection, selected, opening, closing) {
    let rowDiff = selection.end.row - selection.start.row;
    return {
        text: opening + selected + closing,
        selection: [
                0,
                selection.start.column + 1,
                rowDiff,
                selection.end.column + (rowDiff ? 0 : 1)
            ]
    };
};

let insertion = (opening, closing) => (state, action, editor, session, text) => {
    if (text == opening) {
        initContext(editor);
        let selection = editor.getSelectionRange();
        let selected = session.doc.getTextRange(selection);
        if (selected !== "" && editor.getWrapBehavioursEnabled()) {
            return getWrapped(selection, selected, opening, closing);
        } else if (RacketStyleBehaviour.isSaneInsertion(editor, session)) {
            RacketStyleBehaviour.recordAutoInsert(editor, session, opening);
            return {
                text: opening + closing,
                selection: [1, 1]
            };
        }
    } else if (text == closing) {
        initContext(editor);
        let cursor = editor.getCursorPosition();
        let line = session.doc.getLine(cursor.row);
        let rightChar = line.substring(cursor.column, cursor.column + 1);
        if (rightChar == closing) {
            let matching = session.$findOpeningBracket(closing, {column: cursor.column + 1, row: cursor.row});
            if (matching !== null && RacketStyleBehaviour.isAutoInsertedClosing(cursor, line, text)) {
                RacketStyleBehaviour.popAutoInsertedClosing();
                return {
                    text: '',
                    selection: [1, 1]
                };
            }
        }
    }
}

let deletion = (opening, closing) => (state, action, editor, session, range) => {
    let selected = session.doc.getTextRange(range);
    if (!range.isMultiLine() && selected == opening) {
        initContext(editor);
        let line = session.doc.getLine(range.start.row);
        let rightChar = line.substring(range.start.column + 1, range.start.column + 2);
        if (rightChar == closing) {
            range.end.column++;
            return range;
        }
    }
}

let RacketStyleBehaviour = function(options) {
    this.add("braces", "insertion", insertion('{', '}'));
    this.add("braces", "deletion", deletion('{', '}'));

    this.add("parens", "insertion", insertion('(', ')'));
    this.add("parens", "deletion", deletion('(', ')'));

    this.add("brackets", "insertion", insertion('[', ']'));
    this.add("brackets", "deletion", deletion('[', ']'));

    this.add("string_dquotes", "insertion", function(state, action, editor, session, text) {
        let quotes = session.$mode.$quotes || defaultQuotes;
        if (text.length == 1 && quotes[text]) {
            if (this.lineCommentStart && this.lineCommentStart.indexOf(text) != -1) 
                return;
            initContext(editor);
            let quote = text;
            let selection = editor.getSelectionRange();
            let selected = session.doc.getTextRange(selection);
            if (selected !== "" && (selected.length != 1 || !quotes[selected]) && editor.getWrapBehavioursEnabled()) {
                return getWrapped(selection, selected, quote, quote);
            } else if (!selected) {
                let cursor = editor.getCursorPosition();
                let line = session.doc.getLine(cursor.row);
                let leftChar = line.substring(cursor.column-1, cursor.column);
                let rightChar = line.substring(cursor.column, cursor.column + 1);
                
                let token = session.getTokenAt(cursor.row, cursor.column);
                let rightToken = session.getTokenAt(cursor.row, cursor.column + 1);
                if (leftChar == "\\" && token && /escape/.test(token.type))
                    return null;
                
                let stringBefore = token && /string|escape/.test(token.type);
                let stringAfter = !rightToken || /string|escape/.test(rightToken.type);
                
                let pair;
                if (rightChar == quote) {
                    pair = stringBefore !== stringAfter;
                    if (pair && /string\.end/.test(rightToken.type))
                        pair = false;
                } else {
                    if (stringBefore && !stringAfter)
                        return null; // wrap string with different quote
                    if (stringBefore && stringAfter)
                        return null; // do not pair quotes inside strings
                    let wordRe = session.$mode.tokenRe;
                    wordRe.lastIndex = 0;
                    let isWordBefore = wordRe.test(leftChar);
                    wordRe.lastIndex = 0;
                    let isWordAfter = wordRe.test(leftChar);
                    if (isWordBefore || isWordAfter)
                        return null; // before or after alphanumeric
                    if (rightChar && !/[\s;,.})\]\\]/.test(rightChar))
                        return null; // there is rightChar and it isn't closing
                    let charBefore = line[cursor.column - 2];
                    if (leftChar == quote &&  (charBefore == quote || wordRe.test(charBefore)))
                        return null;
                    pair = true;
                }
                return {
                    text: pair ? quote + quote : "",
                    selection: [1,1]
                };
            }
        }
    });

    this.add("string_dquotes", "deletion", function(state, action, editor, session, range) {
        let quotes = session.$mode.$quotes || defaultQuotes;

        let selected = session.doc.getTextRange(range);
        if (!range.isMultiLine() && quotes.hasOwnProperty(selected)) {
            initContext(editor);
            let line = session.doc.getLine(range.start.row);
            let rightChar = line.substring(range.start.column + 1, range.start.column + 2);
            if (rightChar == selected) {
                range.end.column++;
                return range;
            }
        }
    });

};

    
RacketStyleBehaviour.isSaneInsertion = function(editor, session) {
    let cursor = editor.getCursorPosition();
    let iterator = new TokenIterator(session, cursor.row, cursor.column);
    if (!this.$matchTokenType(iterator.getCurrentToken() || "text", SAFE_INSERT_IN_TOKENS)) {
        if (/[)}\]]/.test(editor.session.getLine(cursor.row)[cursor.column]))
            return true;
        let iterator2 = new TokenIterator(session, cursor.row, cursor.column + 1);
        if (!this.$matchTokenType(iterator2.getCurrentToken() || "text", SAFE_INSERT_IN_TOKENS))
            return false;
    }
    iterator.stepForward();
    return iterator.getCurrentTokenRow() !== cursor.row ||
        this.$matchTokenType(iterator.getCurrentToken() || "text", SAFE_INSERT_BEFORE_TOKENS);
};

RacketStyleBehaviour.$matchTokenType = function(token, types) {
    return types.indexOf(token.type || token) > -1;
};

RacketStyleBehaviour.recordAutoInsert = function(editor, session, bracket) {
    let cursor = editor.getCursorPosition();
    let line = session.doc.getLine(cursor.row);
    if (!this.isAutoInsertedClosing(cursor, line, context.autoInsertedLineEnd[0]))
        context.autoInsertedBrackets = 0;
    context.autoInsertedRow = cursor.row;
    context.autoInsertedLineEnd = bracket + line.substr(cursor.column);
    context.autoInsertedBrackets++;
};

RacketStyleBehaviour.recordMaybeInsert = function(editor, session, bracket) {
    let cursor = editor.getCursorPosition();
    let line = session.doc.getLine(cursor.row);
    if (!this.isMaybeInsertedClosing(cursor, line))
        context.maybeInsertedBrackets = 0;
    context.maybeInsertedRow = cursor.row;
    context.maybeInsertedLineStart = line.substr(0, cursor.column) + bracket;
    context.maybeInsertedLineEnd = line.substr(cursor.column);
    context.maybeInsertedBrackets++;
};

RacketStyleBehaviour.isAutoInsertedClosing = function(cursor, line, bracket) {
    return context.autoInsertedBrackets > 0 &&
        cursor.row === context.autoInsertedRow &&
        bracket === context.autoInsertedLineEnd[0] &&
        line.substr(cursor.column) === context.autoInsertedLineEnd;
};

RacketStyleBehaviour.isMaybeInsertedClosing = function(cursor, line) {
    return context.maybeInsertedBrackets > 0 &&
        cursor.row === context.maybeInsertedRow &&
        line.substr(cursor.column) === context.maybeInsertedLineEnd &&
        line.substr(0, cursor.column) == context.maybeInsertedLineStart;
};

RacketStyleBehaviour.popAutoInsertedClosing = function() {
    context.autoInsertedLineEnd = context.autoInsertedLineEnd.substr(1);
    context.autoInsertedBrackets--;
};

RacketStyleBehaviour.clearMaybeInsertedClosing = function() {
    if (context) {
        context.maybeInsertedBrackets = 0;
        context.maybeInsertedRow = -1;
    }
};

oop.inherits(RacketStyleBehaviour, Behaviour);

exports.RacketStyleBehaviour = RacketStyleBehaviour;
});

ace.define("ace/mode/racket",["require","exports","module","ace/lib/oop","ace/mode/text","ace/mode/behavior/racket","ace/mode/racket_highlight_rules","ace/mode/matching_brace_outdent","ace/worker/worker_client","ace/mode/behaviour/cstyle","ace/mode/folding/cstyle"], function(require, exports, module) {
"use strict";

let oop = require("../lib/oop");
let TextMode = require("./text").Mode;
let RacketHighlightRules = require("./racket_highlight_rules").RacketHighlightRules;
let MatchingBraceOutdent = require("./matching_brace_outdent").MatchingBraceOutdent;
let RacketStyleBehaviour = require("./behaviour/racket").RacketStyleBehaviour;
let CStyleFoldMode = require("./folding/cstyle").FoldMode;

let Mode = function() {
    this.HighlightRules = RacketHighlightRules;
    
    this.$outdent = new MatchingBraceOutdent();
    this.$behaviour = new RacketStyleBehaviour();
    this.foldingRules = new CStyleFoldMode();
};
oop.inherits(Mode, TextMode);

(function() {

    this.lineCommentStart = ";";
    this.blockComment = {start: "#|", end: "|#"};
    this.$quotes = {'"': '"'};

    this.getNextLineIndent = function(state, line, tab) {
        let indent = 0;

        let tokenizedLine = this.getTokenizer().getLineTokens(line, state);
        let tokens = tokenizedLine.tokens;

        let opens = [];

        if (state === 'comment') {
            return ' '.repeat(indent);
        }
        
        for (let token of tokens) {
            indent += token.value.length;
            if (token.type === 'paren.lparen') {
                for (let _ of token.value) {
                    opens.unshift([indent]);
                }
            } else if (token.type === 'paren.rparen') {
                for (let _ of token.value) {
                    opens.shift();
                }
            } else {
                if (opens.length > 0) {
                    opens[0].push(indent);
                }
            }
        }

        if (opens.length === 0) {
            return '';
        } else if (opens[0].length < 4) {
            return ' '.repeat(opens[0][0]);
        } else {
            return ' '.repeat(opens[0][1]+1);
        }
    };

    this.checkOutdent = function(state, line, input) {
        return this.$outdent.checkOutdent(line, input);
    };

    this.autoOutdent = function(state, doc, row) {
        this.$outdent.autoOutdent(doc, row);
    };

    this.$id = "ace/mode/racket";
    this.snippetFileId = "ace/snippets/racket";
}).call(Mode.prototype);

exports.Mode = Mode;
});                (function() {
                    ace.require(["ace/mode/racket"], function(m) {
                        if (typeof module == "object" && typeof exports == "object" && module) {
                            module.exports = m;
                        }
                    });
                })();
