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

    var CONCEPT = 'atom';
    var VARIABLE = 'builtin';
    var PROPERTY = 'operator';
    var COMMENT = 'comment';
    var RULE = 'def';

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
      return COMMENT;
    };

    var tilde = function(state, stream) {
      var result;
      stream.skipTo('~');
      state.currentWord = '~';
      var word = stream.current().substring(1).trim();
      stream.next();

      if (state.prevWords.peek(2) === 'conceptualise' &&
          (state.prevWords.peek(1) === 'a' ||
          state.prevWords.peek(1) === 'an')) {
        if (word.length) {
          state.concepts.push(word);
        }
        result = CONCEPT;
      } else {
        if (word.length) {
          state.properties.push(word);
        }
        result = PROPERTY;
      }
      return result;
    };

    var squareBrackets = function(state, stream) {
      stream.skipTo(']');
      state.currentWord = '[]';

      var word = stream.current().substring(1).trim();
      state.rules.push(word);
      stream.next();

      return RULE;
    };

    var singleQuotes = function(state, stream) {
      stream.skipTo('\'');
      stream.next();
      state.currentWord = '\'\'';
      return VARIABLE;
    };

    var doubleQuotes = function(state, stream) {
      stream.skipTo('"');
      stream.next();
      state.currentWord = '""';
      return VARIABLE;
    };

    var fullStop = function(state) {
      if (state.currentWord.length > 0) {
        addToPrevWords(state, state.currentWord);
      }
      addToPrevWords(state, '.');
      state.currentWord = '';
      state.inSentence = false;
      return null;
    };

    var space = function(state, stream) {
      while (stream.eatSpace()) {}
      state.space = true;
      return null;
    };

    var prevIsA = function(state, stream) {
      searchFor(state, stream, 'and', '.', CONCEPT);

      var word = stream.current().trim();
      state.concepts.push(word);

      return CONCEPT;
    };

    var prevNamed = function(state, stream) {
      searchFor(state, stream, ' ');
      return VARIABLE;
    };

    var prevHas = function(state, stream) {
      if (stream.match('the')) {
        addToPrevWords(state, 'the');
        return null;
      }

      searchFor(state, stream, ' ', '.');
      return VARIABLE;
    };

    var prevThereIs = function(state, stream) {
      searchFor(state, stream, 'named');
      return CONCEPT;
    };

    var prevConceptualiseTilde = function(state, stream) {
      searchFor(state, stream, ' ');
      return VARIABLE;
    };

    return {
      startState: function() {
        var state = {
          prevWords: [],
          currentWord: '',
          space: false,
          indented: 0,
          inSentence: false,
          concepts: ['thing', 'value'],
          properties: [],
          rules: []
        };
        return state;
      },

      token: function(stream, state) {
        if (stream.sol()) {
          state.indented = stream.indentation();
          // console.log(state.prevWords);
        }

        ch = stream.peek();

        if (state.space) {
          if (state.currentWord.length > 0) {
            addToPrevWords(state, state.currentWord);
          }
          state.currentWord = '';
          state.space = false;
        }

        if (stream.match('conceptualise', false) ||
            stream.match('there ', false) ||
            stream.match('the ', false)) {
          state.inSentence = true;
        }

        if (stream.match('--')) {
          return comment(stream);
        } else if (stream.match('~')) {
          return tilde(state, stream);
        } else if (stream.match('[')) {
          return squareBrackets(state, stream);
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

          if (prev3 !== 'there' && // that is a _person_
              prev2 === 'is' &&
              (prev1 === 'a' ||
              prev1 === 'an')) {
            return prevIsA(state, stream);
          } else if (prev1 === 'named') { // named _John_
            return prevNamed(state, stream);
          } else if (prev1 === 'has') {   // has _53_ as
            return prevHas(state, stream);
          } else if (prev2 === 'the' &&   // the value _53_
              prev1 === CONCEPT) {
            return prevHas(state, stream);
          } else if (prev3 === 'there' && // there is a _man_ named
              prev2 === 'is' &&
              (prev1 === 'a' ||
              prev1 === 'an')) {
            return prevThereIs(state, stream);
          } else if (prev3 === 'conceptualise' && // conceptualise a ~ man ~ _M_
              prev2 === 'a' &&
              prev1 === '~') {
            return prevConceptualiseTilde(state, stream);
          }

          var result;
          state.concepts.forEach(function(concept) {
            if (stream.match(concept)) {
              state.currentWord = CONCEPT;
              if (!stream.peek() || !stream.peek().match(/[a-z]/i)) {
                result = CONCEPT;
              }
            }
          });
          if (!result) {
            state.properties.forEach(function(property) {
              if (stream.match(property)) {
                state.currentWord = PROPERTY;
                if (!stream.peek() || !stream.peek().match(/[a-z]/i)) {
                  result = PROPERTY;
                }
              }
            });
          }

          if (result) {
            return result;
          }

          ch = stream.next();
          state.currentWord += ch;
        }

        return null;
      },

      indent: function(state) {
        if (state.inSentence) {
          return 2;
        } else {
          return 0;
        }
      },

      lineComment: '--'
    };
  });
});
