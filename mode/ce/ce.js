/* globals CodeMirror: true */
/* globals define: true */

(function(mod) {
  "use strict";
  if (typeof exports === "object" && typeof module === "object") { // CommonJS
    mod(require("../../lib/codemirror"));
  } else if (typeof define === "function" && define.amd) { // AMD
    define(["../../lib/codemirror"], mod);
  } else { // Plain browser env
    mod(CodeMirror);
  }
})(function(CodeMirror) {
  "use strict";

  CodeMirror.defineMode("ce", function() {
    Array.prototype.peek = function(n) {
      if (n && n > 0 && n < this.length) {
        return this[this.length - n];
      } else {
        return this[this.length - 1];
      }
    };

    var ch, word;

    var comment = function(stream) {
      stream.skipToEnd();
      return 'comment';
    };

    var keyword = function(state, words) {
      for (var i = 0; i < words.length - 1; ++i) {
        state.prevWords.push(words[i]);
      }
      state.currentWord = words.peek();

      if (words[0] === 'conceptualise') {
        state.statementType = 'conceptualise';
      } else if (words[0] === 'there') {
        state.statementType = 'there is';
      }

      return 'keyword';
    };

    var thereIs = function(state) {
      state.prevWords.push('there');
      state.currentWord = 'is';
      state.statementType = 'there is';
      return 'keyword';
    };

    var tilde = function(state, stream) {
      stream.skipTo('~');
      state.currentWord = '~';
      return 'atom';
    };

    var value = function(state) {
      state.currentWord = 'value';
      return 'operator';
    };

    var isA = function(state) {
      state.prevWords.push('is');
      state.currentWord = 'a';
      return 'null';
    };

    var singleQuotes = function(state, stream) {
      stream.skipTo('\'');
      state.currentWord = "''";
      return 'variable-2';
    };

    var doubleQuotes = function(state, stream) {
      stream.skipTo('"');
      state.currentWord = '""';
      return 'variable-2';
    };

    var fullStop = function(state) {
      if (state.currentWord.length > 0) {
        state.prevWords.push(state.currentWord);
      }
      state.prevWords.push('.');
      state.currentWord = '';
      return null;
    };

    var space = function(state, stream) {
      while (stream.eatSpace()) {}
      state.space = true;
      return null;
    };

    var prevIsA = function(state, stream) {
      ch = true;
      word = '';
      while (ch && !stream.match('and', false)) {
        ch = stream.next();
        word += ch;
      }

      state.prevWords.push(ch);
      return 'operator';
    };

    var prevNamed = function(state, stream) {
      ch = true;
      word = '';
      while (ch && !stream.match(' ', false)) {
        ch = stream.next();
        word += ch;
      }

      state.prevWords.push(word);
      return 'variable-2';
    };

    var prevHasTheValue = function(state, stream) {
      if (stream.match('the')) {
        state.prevWords.push('the');
        return null;
      }

      ch = true;
      word = '';
      while (ch && !stream.match(' ', false)) {
        ch = stream.next();
        word += ch;
      }

      state.prevWords.push(word);
      return 'variable-2';
    };

    // var prevTilde = function(state, stream) {
    //   ch = true;
    //   word = '';
    //   while (ch && !stream.match(' ', false)) {
    //     ch = stream.next();
    //     word += ch;
    //   }

    //   state.prevWords.push(word);
    //   return 'variable-2';
    // };

    return {
      startState: function() {
        var state = {
          prevWords: [],
          currentWord: '',
          space: false,
          indented: 0,
          statementType: null
        };
        return state;
      },

      token: function(stream, state) {
        if (stream.sol()) {
          state.indented = stream.indentation();
        }

        ch = stream.peek();

        if (state.space) {
          if (state.currentWord.length > 0) {
            state.prevWords.push(state.currentWord);
          }
          state.currentWord = '';
          state.space = false;
        }

        if (stream.match('--')) {
          return comment(stream);
        } else if (stream.match('conceptualise an')) {
          return keyword(state, ['conceptualise', 'an']);
        } else if (stream.match('conceptualise a')) {
          return keyword(state, ['conceptualise', 'a']);
        } else if (stream.match('there is an')) {
          return keyword(state, ['there', 'is', 'an']);
        } else if (stream.match('there is a')) {
          return keyword(state, ['there', 'is', 'a']);
        } else if (stream.match('named')) {
          return keyword(state, ['named']);
        } else if (stream.match('~')) {
          return tilde(state, stream);
        } else if (stream.match('value')) {
          return value(state);
        } else if (stream.match('is an') || stream.match('is a')) {
          return isA(state);
        } else if (stream.match('\'')) {
          return singleQuotes(state, stream);
        } else if (stream.match('"')) {
          return doubleQuotes(state, stream);
        } else if (stream.match('.')) {
          return fullStop(state);
        } else if (stream.match(' ')) {
          return space(state, stream);
        } else {
          if (state.prevWords.peek() === 'is a') {
            return prevIsA(state, stream);
          } else if (state.prevWords.peek() === 'named') {
            return prevNamed(state, stream);
          } else if (state.prevWords.peek() === 'has' || (
              state.prevWords.peek(3) === 'has' &&
              state.prevWords.peek(2) === 'the' &&
              state.prevWords.peek(1) === 'value')) {
            return prevHasTheValue(state, stream);
          // } else if (state.prevWords.peek(3) === 'conceptualise' &&
          //     state.prevWords.peek(2) === 'a' &&
          //     state.prevWords.peek(1) === '~') {
          //   return prevTilde(state, stream);
          }

          ch = stream.next();
          state.currentWord += ch;
          // console.log(state.prevWords);
        }

        return null;
      },

      indent: function(state) {
        var prev = state.prevWords.peek();
        if (prev === 'that' || prev === 'and') {
          return 2;
        } else if (prev.charAt(prev.length - 1) === '.') {
          return 0;
        } else {
          return state.indented;
        }
      }
    };
  });
});

// CodeMirror.defineSimpleMode("ce", {
//   // The start state contains the rules that are intially used
//   start: [
//     // Match anything surrounded with quotes
//     {regex: /"(?:[^\\]|\\.)*?(?:"|$)/, token: "variable"},
//     {regex: /'(?:[^\\]|\\.)*?(?:'|$)/, token: "variable"},
//     {regex: /(\w+)(?=\s+that)/, token: "variable"},
//     {regex: /(\w+)(?=\s+as)/, token: "variable"},
//     // Match anything surrounded with tildes
//     {regex: /~(?:[^\\]|\\.)*?(?:~|$)/, token: "atom"},
//     // Match anything before the word named
//     {regex: /(\w+)(?=\s+named)/, token: "atom"},
//     {regex: /(\w+)(?=\s+and)/, token: "atom"},
//     {regex: /\w+(\s\w+)+(?=\s+(the))/, token: "atom"},
//     // Match conceptualise
//     {regex: /conceptualise|there is|value/, token: "keyword"},
//     // Match capital letter variables
//     {regex: /([A-Z]+)(?=[\s\.]+)/, token: "variable"},
//     // Match comments
//     {regex: /\-\-.*/, token: "comment"},
//     // Indent after that or and
//     {regex: /(?:that)/, indent: true},
//     // Dedent end of sentences
//     {regex: /\./, dedent: true},
//   ],
//   // The meta property contains global information about the mode. It
//   // can contain properties like lineComment, which are supported by
//   // all modes, and also directives like dontIndentStates, which are
//   // specific to simple modes.
//   meta: {
//     dontIndentStates: ["comment"],
//     lineComment: "--"
//   }
// });
