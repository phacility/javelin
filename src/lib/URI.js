/**
 * @provides javelin-uri
 * @requires javelin-install
 *           javelin-util
 * @javelin
 */

/**
 * Oh hey, I'm just a handy function that returns a JX.URI so you can
 * concisely write something like
 *
 * JX.$U(http://zombo.com/).getDomain()
 */
JX.$U = function(uri) {
  return new JX.URI(uri);
};

/**
 * Convert a string URI into a maleable object
 *
 *   var uri = JX.URI(http://www.facebook.com/asdf.php?a=b&c=d#anchor123);
 *   uri.getProtocol();  // http
 *   uri.getDomain();    // www.facebook.com
 *   uri.getPath();      // /asdf.php
 *   uri.getQueryData(); // {"a":"b", "c":"d"}
 *   uri.getFragment();  // anchor123
 *
 * And back into a string
 *
 *   uri.setFragment('clowntown');
 *   uri.toString() // http://www.facebook.com/asdf.php?a=b&c=d#clowntown
 *
 */
JX.install('URI', {
  statics : {
    _uriPattern : /(?:([^:\/?#]+):)?(?:\/\/([^:\/?#]*)(?::(\d*))?)?([^?#]*)(?:\?([^#]*))?(?:#(.*))?/,
    _queryPattern : /(?:^|&)([^&=]*)=?([^&]*)/g
  },

  /**
   * Construct a URI
   *
   * Accepts either absolute or relative URIs. Relative URIs may have protocol
   * and domain properties set to undefined
   *
   * @param string    absolute or relative URI
   */
  construct : function(uri) {
    // need to set the default value here rather than in the properties map,
    // or else we get some crazy global state breakage
    this.setQueryData({});

    if (uri) {
      // parse the url
      var result = JX.URI._uriPattern.exec(uri);

      this.setProtocol(result[1]);
      this.setDomain(result[2]);
      this.setPort(result[3]);
      var path = result[4];
      var query = result[5];
      this.setFragment(result[6]);

      // parse the path
      this.setPath(path.charAt(0) == '/' ? path : '/' + path);

      // parse the query data
      if (query) {
        var queryData = {};
        var data;
        while ((data = JX.URI._queryPattern.exec(query)) != null) {
          queryData[decodeURIComponent(data[1])] = decodeURIComponent(data[2]);
        }
        this.setQueryData(queryData);
      }
    }
  },

  properties : {
    protocol: undefined,
    domain: undefined,
    port: undefined,
    path: '/',
    queryData: undefined,
    fragment: undefined
  },

  members : {

    /**
     * Append and override query data values
     * Remove a query key by setting it undefined
     *
     * @param map
     * @return @{JX.URI} self
     */
    addQueryData : function(map) {
      JX.copy(this.getQueryData(), map);
      return this;
    },

    toString : function() {
      if (__DEV__) {
        if (this.getPath() && this.getPath().charAt(0) != '/') {
          throw new Error(
            'JX.URI.toString(): ' +
            'Path does not begin with a "/" which means this URI will likely' +
            'be malformed. Ensure any string passed to .setPath() leads "/"');
        }
      }
      var str = '';
      if (this.getProtocol()) {
        str += this.getProtocol() + '://';
      }
      str += this.getDomain() || '';
      str += this.getPath() || '/';
      str += this._getQueryString();
      if (this.getFragment()) {
        str += '#' + this.getFragment();
      }
      return str;
    },

    _getQueryString : function() {
      var queryData = this.getQueryData();
      var queryString = '';
      for (var key in queryData) {
        if (queryData[key] != null) {
          queryString += queryString ? '&' : '?';
          queryString += encodeURIComponent(key);
          if (queryData[key] !== '') {
            queryString += '=' + encodeURIComponent(queryData[key]);
          }
        }
      }
      return queryString;
    }

  }
});
