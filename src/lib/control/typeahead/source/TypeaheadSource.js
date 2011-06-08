/**
 * @requires javelin-install
 *           javelin-util
 *           javelin-dom
 *           javelin-typeahead-normalizer
 * @provides javelin-typeahead-source
 * @javelin
 */

JX.install('TypeaheadSource', {
  construct : function() {
    this._raw = {};
    this._lookup = {};
    this.setNormalizer(JX.TypeaheadNormalizer.normalize);
  },

  events : ['waiting', 'resultsready', 'complete'],

  properties : {

    /**
     * Allows you to specify a function which will be used to normalize strings.
     * Strings are normalized before being tokenized, and before being sent to
     * the server. The purpose of normalization is to strip out irrelevant data,
     * like uppercase/lowercase, extra spaces, or punctuation. By default,
     * the @{JX.TypeaheadNormalizer} is used to normalize strings, but you may
     * want to provide a different normalizer, particiularly if there are
     * special characters with semantic meaning in your object names.
     *
     * @param function
     */
    normalizer : null,

    /**
     * Transformers convert data from a wire format to a runtime format. The
     * transformation mechanism allows you to choose an efficient wire format
     * and then expand it on the client side, rather than duplicating data
     * over the wire. The transformation is applied to objects passed to
     * addResult(). It should accept whatever sort of object you ship over the
     * wire, and produce a dictionary with these keys:
     *
     *    - **id**: a unique id for each object.
     *    - **name**: the string used for matching against user input.
     *    - **uri**: the URI corresponding with the object (must be present
     *      but need not be meaningful)
     *    - **display**: the text or nodes to show in the DOM. Usually just the
     *      same as ##name##.
     *
     * The default transformer expects a three element list with elements
     * [name, uri, id]. It assigns the first element to both ##name## and
     * ##display##.
     *
     * @param function
     */
    transformer : null,

    /**
     * Configures the maximum number of suggestions shown in the typeahead
     * dropdown.
     *
     * @param int
     */
    maximumResultCount : 5

  },

  members : {
    _raw : null,
    _lookup : null,
    _normalizer : null,

    bindToTypeahead : function(typeahead) {
      typeahead.listen('change', JX.bind(this, this.didChange));
      typeahead.listen('start', JX.bind(this, this.didStart));
    },

    didChange : function(value) {
      return;
    },

    didStart : function() {
      return;
    },

    clearCache : function() {
      this._raw = {};
      this._lookup = {};
    },

    addResult : function(obj) {
      obj = (this.getTransformer() || this._defaultTransformer)(obj);

      if (obj.id in this._raw) {
        // We're already aware of this result. This will happen if someone
        // searches for "zeb" and then for "zebra" with a
        // TypeaheadRequestSource, for example, or the datasource just doesn't
        // dedupe things properly. Whatever the case, just ignore it.
        return;
      }

      if (__DEV__) {
        for (var k in {name : 1, id : 1, display : 1, uri : 1}) {
          if (!(k in obj)) {
            throw new Error(
              "JX.TypeaheadSource.addResult(): " +
              "result must have properties 'name', 'id', 'uri' and 'display'.");
          }
        }
      }

      this._raw[obj.id] = obj;
      var t = this.tokenize(obj.name);
      for (var jj = 0; jj < t.length; ++jj) {
        this._lookup[t[jj]] = this._lookup[t[jj]] || [];
        this._lookup[t[jj]].push(obj.id);
      }
    },

    waitForResults : function() {
      this.invoke('waiting');
      return this;
    },

    matchResults : function(value) {

      // This table keeps track of the number of tokens each potential match
      // has actually matched. When we're done, the real matches are those
      // which have matched every token (so the value is equal to the token
      // list length).
      var match_count = {};

      // This keeps track of distinct matches. If the user searches for
      // something like "Chris C" against "Chris Cox", the "C" will match
      // both fragments. We need to make sure we only count distinct matches.
      var match_fragments = {};

      var matched = {};
      var seen = {};

      var t = this.tokenize(value);

      // Sort tokens by longest-first. We match each name fragment with at
      // most one token.
      t.sort(function(u, v) { return v.length - u.length; });

      for (var ii = 0; ii < t.length; ++ii) {
        // Do something reasonable if the user types the same token twice; this
        // is sort of stupid so maybe kill it?
        if (t[ii] in seen) {
          t.splice(ii--, 1);
          continue;
        }
        seen[t[ii]] = true;
        var fragment = t[ii];
        for (var name_fragment in this._lookup) {
          if (name_fragment.substr(0, fragment.length) === fragment) {
            if (!(name_fragment in matched)) {
              matched[name_fragment] = true;
            } else {
              continue;
            }
            var l = this._lookup[name_fragment];
            for (var jj = 0; jj < l.length; ++jj) {
              var match_id = l[jj];
              if (!match_fragments[match_id]) {
                match_fragments[match_id] = {};
              }
              if (!(fragment in match_fragments[match_id])) {
                match_fragments[match_id][fragment] = true;
                match_count[match_id] = (match_count[match_id] || 0) + 1;
              }
            }
          }
        }
      }

      var hits = [];
      for (var k in match_count) {
        if (match_count[k] == t.length) {
          hits.push(k);
        }
      }

      var nodes = this.renderNodes(value, hits);
      this.invoke('resultsready', nodes);
      this.invoke('complete');
    },

    renderNodes : function(value, hits) {
      var n = Math.min(this.getMaximumResultCount(), hits.length);
      var nodes = [];
      for (var kk = 0; kk < n; kk++) {
        nodes.push(this.createNode(this._raw[hits[kk]]));
      }
      return nodes;
    },

    createNode : function(data) {
      return JX.$N(
        'a',
        {
          href: data.uri,
          name: data.name,
          rel: data.id,
          className: 'jx-result'
        },
        data.display
      );
    },

    normalize : function(str) {
      return (this.getNormalizer() || JX.bag())(str);
    },
    tokenize : function(str) {
      str = this.normalize(str);
      if (!str.length) {
        return [];
      }
      return str.split(/ /g);
    },
    _defaultTransformer : function(object) {
      return {
        name : object[0],
        display : object[0],
        uri : object[1],
        id : object[2]
      };
    }
  }
});


