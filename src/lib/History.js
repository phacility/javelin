/**
 * @requires javelin-stratcom
 *           javelin-install
 *           javelin-uri
 * @provides javelin-history
 * @javelin
 */

/**
 * JX.History provides a stable interface for managing the browser's history
 * stack. Whenever the history stack mutates, the "history:change" event is
 * invoked via JX.Stratcom.
 *
 * Inspired by History Manager implemented by Christoph Pojer (@cpojer)
 * @see https://github.com/cpojer/mootools-history
 */
JX.install('History', {

  statics : {
    // Some browsers fire an extra "popstate" on initial page load, so we keep
    // track of the initial path to normalize behavior (and not fire the extra
    // event).
    _initialPath : null,
    _hash : null,

    /**
     * Test if the HTML5 History API is available.
     *
     * @return bool True if history.pushState() exists.
     */
    hasPushState : function() {
      return 'pushState' in history;
    },

    /**
     * Returns the path on top of the history stack.
     *
     * If the HTML5 History API is unavailable and an eligible path exists in
     * the current URL fragment, the fragment is parsed for a path. Otherwise,
     * the current URL path is returned.
     *
     * @return string Path on top of the history stack.
     */
    getPath : function() {
      if (JX.History.hasPushState()) {
        return JX.History._getBasePath(location.href);
      } else {
        var parsed = JX.History._parseFragment(location.hash);
        return parsed || JX.History._getBasePath(location.href);
      }
    },

    /**
     * Pushes a path onto the history stack.
     *
     * @param string Path.
     * @return void
     */
    push : function(path) {
      if (JX.History.hasPushState()) {
        if (JX.History._initialPath && JX.History._initialPath !== path) {
          JX.History._initialPath = null;
        }
        history.pushState(null, null, path);
        JX.History._fire(path);
      } else {
        location.hash = JX.History._composeFragment(path);
      }
    },

    /**
     * Modifies the path on top of the history stack.
     *
     * @param string Path.
     * @return void
     */
    replace : function(path) {
      if (JX.History.hasPushState()) {
        history.replaceState(null, null, path);
      } else {
        var uri = JX.$U(location.href);
        uri.setFragment(JX.History._composeFragment(path));
        location.replace(uri.toString());
      }
    },

    _handleChange : function(e) {
      if (JX.History.hasPushState()) {
        var path = JX.History._getBasePath(location.href);
        if (path === JX.History._initialPath) {
          JX.History._initialPath = null;
        } else {
          JX.History._fire(path);
        }
      } else {
        var hash = location.hash;
        if (hash !== JX.History._hash) {
          JX.History._hash = hash;
          JX.History._fire(hash.substr(1));
        }
      }
    },

    _fire : function(path) {
      JX.Stratcom.invoke('history:change', null, { path: path });
    },

    _getBasePath : function(href) {
      return JX.$U(href).setProtocol(null).setDomain(null).toString();
    },

    _composeFragment : function(path) {
      // If the URL fragment does not change, the new path will not get pushed
      // onto the stack. So we alternate the hash prefix to force a new state.
      if (JX.History.getPath() === path) {
        var hash = location.hash;
        if (hash && hash.charAt(1) === '!') {
          return '~!' + path;
        }
      }
      return '!' + path;
    },

    _parseFragment : function(fragment) {
      if (fragment) {
        if (fragment.charAt(1) === '!') {
          return fragment.substr(2);
        } else if (fragment.substr(1, 2) === '~!') {
          return fragment.substr(3);
        }
      }
      return null;
    }

  },

  initialize : function() {
    if (JX.History.hasPushState()) {
      JX.History._initialPath = JX.History._getBasePath(location.href);
      JX.Stratcom.listen('popstate', null, JX.History._handleChange);
    } else if ('onhashchange' in window) {
      JX.Stratcom.listen('hashchange', null, JX.History._handleChange);
    } else {
      setInterval(function() {
        JX.History._hash !== location.hash && JX.History._handleChange();
      }, 200);
    }
  }

});
