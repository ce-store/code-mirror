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
      if (n && n > 0 && n <= this.length) {
        return this[this.length - n];
      } else {
        return this[this.length - 1];
      }
    };

    var ch, word;

    var CONCEPT = 'concept';

    var addToPrevWords = function(state, word) {
      state.prevWords.push(word.trim());
    };

    var searchFor = function(state, stream, match1, match2, type) {
      ch = true;
      word = '';
      var lastWord;

      if (match2) {
        while (ch && !stream.match(match1, false) && !stream.match(match2, false)) {
          ch = stream.next();
          word += ch;

          if (ch === ' ') {
            lastWord = '';
          } else {
            lastWord += ch;
          }
        }
      } else {
        while (ch && !stream.match(match1, false)) {
          ch = stream.next();
          word += ch;
        }
      }

      if (type) {
        addToPrevWords(state, type);
      } else {
        addToPrevWords(state, word);
      }
      return lastWord;
    };

    var comment = function(stream) {
      stream.skipToEnd();
      return 'comment';
    };

    var keyword = function(state, words) {
      for (var i = 0; i < words.length - 1; ++i) {
        addToPrevWords(state, words[i]);
      }
      state.currentWord = words.peek();

      if (words[0] === 'conceptualise') {
        state.statementType = 'conceptualise';
      } else if (words[0] === 'there') {
        state.statementType = 'there is';
      }

      // return 'keyword';
      return null;
    };

    var tilde = function(state, stream) {
      var result;
      if (state.prevWords.peek(2) === 'conceptualise' &&
          (state.prevWords.peek(1) === 'a' ||
          state.prevWords.peek(1) === 'an')) {
        result = 'atom';
      } else {
        result = 'operator';
      }
      stream.skipTo('~');
      state.currentWord = '~';
      return result;
    };

    var value = function(state) {
      state.currentWord = CONCEPT;
      return 'atom';
    };

    // var isA = function(state) {
    //   addToPrevWords(state, 'is');
    //   state.currentWord = 'a';
    //   return 'null';
    // };

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
        addToPrevWords(state, state.currentWord);
      }
      addToPrevWords(state, '.');
      state.currentWord = '';
      state.statementType = null;
      return null;
    };

    var space = function(state, stream) {
      while (stream.eatSpace()) {}
      state.space = true;
      return null;
    };

    var prevIsA = function(state, stream) {
      searchFor(state, stream, 'and', null, CONCEPT);
      return 'atom';
    };

    var prevNamed = function(state, stream) {
      searchFor(state, stream, ' ');
      return 'variable-2';
    };

    var prevHas = function(state, stream) {
      if (stream.match('the')) {
        addToPrevWords(state, 'the');
        return null;
      }

      searchFor(state, stream, ' ');
      return 'variable-2';
    };

    var prevThereIs = function(state, stream) {
      searchFor(state, stream, 'named');
      return 'atom';
    };

    var prevConceptualiseTilde = function(state, stream) {
      searchFor(state, stream, ' ');
      return 'variable-2';
    };

    var prevPropertyTilde = function(state, stream) {
      var lastWord = searchFor(state, stream, 'and', '.');

      stream.backUp(lastWord.length);
      word = word.substring(0, word.length - lastWord.length);

      addToPrevWords(state, word);
      return 'atom';
    };

    var prevAs = function(state, stream) {
      searchFor(state, stream, 'and', '.');
      return 'operator';
    };

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
            addToPrevWords(state, state.currentWord);
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
        // } else if (stream.match('is an')) {
        //   return isA(state);
        // } else if (stream.match('is a')) {
        //   return isA(state);
        } else if (stream.match('\'')) {
          return singleQuotes(state, stream);
        } else if (stream.match('"')) {
          return doubleQuotes(state, stream);
        } else if (stream.match('.')) {
          return fullStop(state);
        } else if (stream.match(' ')) {
          return space(state, stream);
        } else {
          var prev1 = state.prevWords.peek(1);
          var prev2 = state.prevWords.peek(2);
          var prev3 = state.prevWords.peek(3);

          if (prev3 !== 'there' &&
              prev2 === 'is' &&
              (prev1 === 'a' ||
              prev1 === 'an')) {
            return prevIsA(state, stream);
          } else if (prev1 === 'named') {
            return prevNamed(state, stream);
          } else if (prev1 === 'has') {
          //     (prev2 === 'the' &&
          //     prev1 === 'value')) {
            return prevHas(state, stream);
          } else if (prev3 === 'there' &&
              prev2 === 'is' &&
              (prev1 === 'a' ||
              prev1 === 'an')) {
            return prevThereIs(state, stream);
          } else if (prev3 === 'conceptualise' &&
              prev2 === 'a' &&
              prev1 === '~') {
            return prevConceptualiseTilde(state, stream);
          } else if (prev2 === '~' &&
              prev1 === 'the') {
            return prevPropertyTilde(state, stream);
          } else if (prev1 === 'as') {
            return prevAs(state, stream);
          }

          ch = stream.next();
          state.currentWord += ch;
          console.log(state.prevWords);
        }

        return null;
      },

      indent: function(state) {
        if (state.statementType) {
          return 2;
        } else {
          return 0;
        }
      }
    };
  });
});
