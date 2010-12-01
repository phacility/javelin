/**
 * @requires javelin-install
 *           javelin-dom
 *           javelin-vector
 *           javelin-util
 * @provides javelin-typeahead
 * @javelin
 */

/**
 * A typeahead is a UI component similar to a text input, except that it
 * suggests some set of results (like friends' names, common searches, or
 * repository paths) as the user types them. Familiar examples of this UI
 * include Google Suggest, the Facebook search box, and OS X's Spotlight
 * feature.
 *
 * To build a @{JX.Typeahead}, you need to do four things:
 *
 *  1. Construct it, passing some DOM nodes for it to attach to. See the
 *     constructor for more information.
 *  2. Attach a datasource by calling setDatasource() with a valid datasource,
 *     often a @{JX.TypeaheadPreloadedSource}.
 *  3. Configure any special options that you want.
 *  4. Call start().
 *
 * If you do this correctly, a dropdown menu should appear under the input as
 * the user types, suggesting matching results.
 *
 * @task build        Building a Typeahead
 * @task datasource   Configuring a Datasource
 * @task config       Configuring Options
 * @task start        Activating a Typeahead
 * @task control      Controlling Typeaheads from Javascript
 * @task internal     Internal Methods
 */
JX.install('Typeahead', {
  /**
   * Construct a new Typeahead on some "hardpoint". At a minimum, the hardpoint
   * should be a ##<div>## with "position: relative;" wrapped around a text
   * ##<input>##. The typeahead's dropdown suggestions will be appended to the
   * hardpoint in the DOM. Basically, this is the bare minimum requirement:
   *
   *   LANG=HTML
   *   <div style="position: relative;">
   *     <input type="text" />
   *   </div>
   *
   * Then get a reference to the ##<div>## and pass it as 'hardpoint', and pass
   * the ##<input>## as 'control'. This will enhance your boring old
   * ##<input />## with amazing typeahead powers.
   *
   * On the Facebook/Tools stack, ##<javelin:typeahead-template />## can build
   * this for you.
   *
   * @param Node  "Hardpoint", basically an anchorpoint in the document which
   *              the typeahead can append its suggestion menu to.
   * @param Node? Actual ##<input />## to use; if not provided, the typeahead
   *              will just look for a (solitary) input inside the hardpoint.
   * @task build
   */
  construct : function(hardpoint, control) {
    this._hardpoint = hardpoint;
    this._control = control || JX.DOM.find(hardpoint, 'input');

    this._root = JX.$N(
      'div',
      {className: 'LTypeaheadResults jx-typeahead-results'});
    this._display = [];

    JX.DOM.listen(
      this._control,
      ['focus', 'blur', 'keypress', 'keydown'],
      null,
      JX.bind(this, this.handleEvent));

    JX.DOM.listen(
      this._root,
      ['mouseover', 'mouseout'],
      null,
      JX.bind(this, this._onmouse));

    JX.DOM.listen(
      this._root,
      'mousedown',
      'tag:a',
      JX.bind(this, function(e) {
        this._choose(e.getTarget());
        e.prevent();
      }));

  },

  events : ['choose', 'query', 'start', 'change'],

  properties : {

    /**
     * Boolean. If true (default), the user is permitted to submit the typeahead
     * with a custom or empty selection. This is a good behavior if the
     * typeahead is attached to something like a search input, where the user
     * might type a freeform query or select from a list of suggestions.
     * However, sometimes you require a specific input (e.g., choosing which
     * user owns something), in which case you can prevent null selections.
     *
     * @task config
     */
    allowNullSelection : true,

    /**
     * Function. Allows you to reconfigure the Typeahead's normalizer, which is
     * @{JX.TypeaheadNormalizer} by default. The normalizer is used to convert
     * user input into strings suitable for matching, e.g. by lowercasing all
     * input and removing punctuation. See @{JX.TypeaheadNormalizer} for more
     * details. Any replacement function should accept an arbitrary user-input
     * string and emit a normalized string suitable for tokenization and
     * matching.
     *
     * @task config
     */
    normalizer : null,

    /**
     * Boolean. If true (default), disable the control once the user makes a
     * selection. This is good for a "search" or "lookup" typeahead where the
     * suggestions are queries or documents and the action when the user makes a
     * choice is to take the user to a result page, but you may want to disable
     * it if your use case is more complex.
     *
     * @task config
     * @param bool True (default) to disable the control once the user makes a
     *             choice.
     */
    disableOnChoose : true
  },

  members : {
    _root : null,
    _control : null,
    _hardpoint : null,
    _value : null,
    _stop : false,
    _focus : -1,
    _display : null,

    /**
     * Activate your properly configured typeahead. It won't do anything until
     * you call this method!
     *
     * @task start
     * @return void
     */
    start : function() {
      this.invoke('start');
    },


    /**
     * Configure a datasource, which is where the Typeahead gets suggestions
     * from. See @{JX.TypeaheadDatasource} for more information. You must
     * provide a datasource.
     *
     * @task datasource
     * @param JX.TypeaheadDatasource The datasource which the typeahead will
     *                               draw from.
     */
    setDatasource : function(datasource) {
      datasource.bindToTypeahead(this);
    },


    /**
     * Hide the typeahead's dropdown suggestion menu.
     *
     * @task control
     * @return void
     */
    hide : function() {
      this._changeFocus(Number.NEGATIVE_INFINITY);
      this._display = [];
      this._moused = false;
      JX.DOM.setContent(this._root, '');
      JX.DOM.remove(this._root);
    },


    /**
     * Show a given result set in the typeahead's dropdown suggestion menu.
     * Normally, you only call this method if you are implementing a datasource.
     * Otherwise, the datasource you have configured calls it for you in
     * response to the user's actions.
     *
     * @task   control
     * @param  list List of ##<a />## tags to show as suggestions/results.
     * @return void
     */
    showResults : function(results) {
      this._display = results;
      if (results.length) {
        JX.DOM.setContent(this._root, results);
        this._changeFocus(Number.NEGATIVE_INFINITY);
        var d = JX.$V.getDim(this._hardpoint);
        d.x = 0;
        d.setPos(this._root);
        this._hardpoint.appendChild(this._root);
      } else {
        this.hide();
      }
    },

    refresh : function() {
      if (this._stop) {
        return;
      }

      this._value = this._control.value;
      if (!this.invoke('change', this._value).getPrevented()) {
        if (__DEV__) {
          throw new Error(
            "JX.Typeahead._update(): " +
              "No listener responded to Typeahead 'change' event. Create a " +
              "datasource and call setDatasource().");
        }
      }
    },
    /**
     * Show a "waiting for results" UI in place of the typeahead's dropdown
     * suggestion menu. NOTE: currently there's no such UI, lolol.
     *
     * @task control
     * @return void
     */
    waitForResults : function() {
      // TODO: Build some sort of fancy spinner or "..." type UI here to
      // visually indicate that we're waiting on the server.
      this.hide();
    },


    /**
     * @task internal
     */
    _onmouse : function(event) {
      this._moused = (event.getType() == 'mouseover');
      this._drawFocus();
    },


    /**
     * @task internal
     */
    _changeFocus : function(d) {
      var n = Math.min(Math.max(-1, this._focus + d), this._display.length - 1);
      if (!this.getAllowNullSelection()) {
        n = Math.max(0, n);
      }
      if (this._focus >= 0 && this._focus < this._display.length) {
        JX.DOM.alterClass(this._display[this._focus], 'focused', 0);
      }
      this._focus = n;
      this._drawFocus();
      return true;
    },


    /**
     * @task internal
     */
    _drawFocus : function() {
      var f = this._display[this._focus];
      if (f) {
        JX.DOM.alterClass(f, 'focused', !this._moused);
      }
    },


    /**
     * @task internal
     */
    _choose : function(target) {
      var result = this.invoke('choose', target);
      if (result.getPrevented()) {
        return;
      }

      this._control.value = target.name;
      this.hide();

      if (this.getDisableOnChoose()) {
        this._control.blur();
        this._control.disabled = true;
        this._stop = true;
      }
    },


    /**
     * @task control
     */
    clear : function() {
      this._control.value = '';
      this.hide();
    },


    /**
     * @task internal
     */
    _submit : function() {
      if (this._focus >= 0 && this._display[this._focus]) {
        this._choose(this._display[this._focus]);
        return true;
      } else {
        result = this.invoke('query', this._control.value);
        if (result.getPrevented()) {
          return true;
        }
      }
      return false;
    },

    setValue : function(value) {
      this._control.value = value;
    },
    getValue : function() {
      return this._control.value;
    },

    /**
     * @task internal
     */
    _update : function(event) {
      var k = event && event.getSpecialKey();
      if (k && event.getType() == 'keydown') {
        switch (k) {
          case 'up':
            if (this._display.length && this._changeFocus(-1)) {
              event.prevent();
            }
            break;
          case 'down':
            if (this._display.length && this._changeFocus(1)) {
              event.prevent();
            }
            break;
          case 'return':
            if (this._submit()) {
              event.prevent();
              return;
            }
            break;
          case 'esc':
            if (this._display.length && this.getAllowNullSelection()) {
              this.hide();
              event.prevent();
            }
            break;
        }
      }

      // We need to defer because the keystroke won't be present in the input's
      // value field yet.
      JX.defer(JX.bind(this, function() {
        if (this._value == this._control.value) {
          // The typeahead value hasn't changed.
          return;
        }
        this.refresh();
      }));
    },

    /**
     * This method is pretty much internal but @{JX.Tokenizer} needs access to
     * it for delegation. You might also need to delegate events here if you
     * build some kind of meta-control.
     *
     * Reacts to user events in accordance to configuration.
     *
     * @task internal
     * @param JX.Event User event, like a click or keypress.
     * @return void
     */
    handleEvent : function(e) {
      if (this._stop || e.getPrevented()) {
        return;
      }
      var type = e.getType();
      if (type == 'blur') {
        this.hide();
      } else {
        this._update(e);
      }
    }
  }
});
/**
 * @requires javelin-install
 * @provides javelin-typeahead-normalizer
 * @javelin
 */

JX.install('TypeaheadNormalizer', {
  statics : {
    normalize : function(str) {
      return ('' + str)
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/ +/g, ' ')
        .replace(/^\s*|\s*$/g, '');
    }
  }
});
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
    _typeahead : null,
    _normalizer : null,

    bindToTypeahead : function(typeahead) {
      this._typeahead = typeahead;
      typeahead.listen('change', JX.bind(this, this.didChange));
      typeahead.listen('start', JX.bind(this, this.didStart));
    },

    didChange : function(value) {
      return;
    },

    didStart : function() {
      return;
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
      this._typeahead.waitForResults();
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

      var n = Math.min(this.getMaximumResultCount(), hits.length);
      var nodes = [];
      for (var kk = 0; kk < n; kk++) {
        var data = this._raw[hits[kk]];
        nodes.push(JX.$N(
          'a',
          {
            href: data.uri,
            name: data.name,
            rel: data.id,
            className: 'jx-result'
          },
          data.display));
      }

      this._typeahead.showResults(nodes);
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


/**
 * @requires javelin-install
 *           javelin-util
 *           javelin-stratcom
 *           javelin-request
 *           javelin-typeahead-source
 * @provides javelin-typeahead-preloaded-source
 * @javelin
 */

/**
 * Simple datasource that loads all possible results from a single call to a
 * URI. This is appropriate if the total data size is small (up to perhaps a
 * few thousand items). If you have more items so you can't ship them down to
 * the client in one repsonse, use @{JX.TypeaheadOnDemandSource}.
 */
JX.install('TypeaheadPreloadedSource', {

  extend : 'TypeaheadSource',

  construct : function(uri) {
    this.__super__.call(this);
    this.uri = uri;
  },

  members : {

    ready : false,
    uri : null,
    lastValue : null,

    didChange : function(value) {
      if (this.ready) {
        this.matchResults(value);
      } else {
        this.lastValue = value;
        this.waitForResults();
      }
      JX.Stratcom.context().kill();
    },

    didStart : function() {
      var r = new JX.Request(this.uri, JX.bind(this, this.ondata));
      r.setMethod('GET');
      r.send();
    },

    ondata : function(results) {
      for (var ii = 0; ii < results.length; ++ii) {
        this.addResult(results[ii]);
      }
      if (this.lastValue !== null) {
        this.matchResults(this.lastValue);
      }
      this.ready = true;
    }
  }
});



/**
 * @requires javelin-install
 *           javelin-util
 *           javelin-stratcom
 *           javelin-request
 *           javelin-typeahead-source
 * @provides javelin-typeahead-ondemand-source
 * @javelin
 */

JX.install('TypeaheadOnDemandSource', {

  extend : 'TypeaheadSource',

  construct : function(uri) {
    this.__super__.call(this);
    this.uri = uri;
    this.haveData = {
      '' : true
    };
  },

  properties : {
    /**
     * Configures how many milliseconds we wait after the user stops typing to
     * send a request to the server. Setting a value of 250 means "wait 250
     * milliseconds after the user stops typing to request typeahead data".
     * Higher values reduce server load but make the typeahead less responsive.
     */
    queryDelay : 125,
    /**
     * Auxiliary data to pass along when sending the query for server results.
     */
    auxiliaryData : {}
  },

  members : {
    uri : null,
    lastChange : null,
    haveData : null,

    didChange : function(value) {
      if (JX.Stratcom.pass()) {
        return;
      }
      this.lastChange = new Date().getTime();
      value = this.normalize(value);

      if (this.haveData[value]) {
        this.matchResults(value);
      } else {
        this.waitForResults();
        JX.defer(
          JX.bind(this, this.sendRequest, this.lastChange, value),
          this.getQueryDelay());
      }

      JX.Stratcom.context().kill();
    },

    sendRequest : function(when, value) {
      if (when != this.lastChange) {
        return;
      }
      var r = new JX.Request(
        this.uri,
        JX.bind(this, this.ondata, this.lastChange, value));
      r.setMethod('GET');
      r.setData(JX.copy(this.getAuxiliaryData(), {q : value}));
      r.send();
    },

    ondata : function(when, value, results) {
      for (var ii = 0; ii < results.length; ii++) {
        this.addResult(results[ii]);
      }
      this.haveData[value] = true;
      if (when != this.lastChange) {
        return;
      }
      this.matchResults(value);
    }
  }
});


