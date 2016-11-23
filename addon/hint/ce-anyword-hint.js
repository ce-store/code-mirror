// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE
// Edited to include CE words by Anna Thomas

/* globals CodeMirror: true */
/* globals define: true */

(function(mod) {
  'use strict';
  if (typeof exports === "object" && typeof module === "object") {// CommonJS
    mod(require("../../lib/codemirror"));
  } else if (typeof define === "function" && define.amd) { // AMD
    define(["../../lib/codemirror"], mod);
  } else {// Plain browser env
    mod(CodeMirror);
  }
})(function(CodeMirror) {
  'use strict';

  var WORD = /[\w$]+/, RANGE = 500;

  var ceWords = [
    'conceptualise a',
    'conceptualise an',
    'conceptualise',
    'there is a',
    'there is an',
    'there',
    'that',
    'is a',
    'is an',
    'has the',
    'has',
    'named',
    'and',
    'as',
    'the',
    'value',
    'perform reset store with starting uid',
    'perform load sentences from url',
    'perform set \'ce root\' to ',
    'perform run'
  ];

  CodeMirror.registerHelper("hint", "ce", function(editor, options) {
    var word = options && options.word || WORD;
    var range = options && options.range || RANGE;
    var cur = editor.getCursor(), curLine = editor.getLine(cur.line);
    var end = cur.ch, start = end;
    while (start && word.test(curLine.charAt(start - 1))) {--start;}
    var curWord = start !== end && curLine.slice(start, end);

    var list = ceWords.filter(function (ceWord) {
      return ceWord.indexOf(curWord) > -1;
    });
    var seen = {};
    var re = new RegExp(word.source, "g");
    for (var dir = -1; dir <= 1; dir += 2) {
      var line = cur.line, endLine = Math.min(Math.max(line + dir * range, editor.firstLine()), editor.lastLine()) + dir;
      for (; line !== endLine; line += dir) {
        var text = editor.getLine(line), m;
        while (m = re.exec(text)) {
          if (line === cur.line && m[0] === curWord) {continue;}
          if ((!curWord || m[0].lastIndexOf(curWord, 0) === 0) && !Object.prototype.hasOwnProperty.call(seen, m[0]) && ceWords.indexOf(m[0]) < 0) {
            seen[m[0]] = true;
            list.push(m[0]);
          }
        }
      }
    }
    list.sort(function(a, b) {
      return a.indexOf(curWord) - b.indexOf(curWord);
    });
    return {list: list, from: CodeMirror.Pos(cur.line, start), to: CodeMirror.Pos(cur.line, end)};
  });
});
