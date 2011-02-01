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
      {className: 'jx-typeahead-results'});
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
        this._choose(e.getNode('tag:a'));
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
    normalizer : null
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
     * Override the <input /> selected in the constructor with some other input.
     * This is primarily useful when building a control on top of the typeahead,
     * like @{JX.Tokenizer}.
     *
     * @task config
     * @param node An <input /> node to use as the primary control.
     */
    setInputNode : function(input) {
      this._control = input;
      return this;
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
    },


    /**
     * @task control
     */
    clear : function() {
      this._control.value = '';
      this.hide();
    },


    /**
     * @task control
     */
    disable : function() {
      this._control.blur();
      this._control.disabled = true;
      this._stop = true;
    },


    /**
     * @task control
     */
    submit : function() {
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
            if (this.submit()) {
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
          case 'tab':
            // If the user tabs out of the field, don't refresh.
            return;
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
