/**
 * @requires javelin-install
 *           javelin-stratcom
 *           javelin-util
 *           javelin-behavior
 *           javelin-json
 * @provides javelin-request
 * @javelin
 */

/**
 * Make basic AJAX XMLHTTPRequests.
 *
 * @group workflow
 */
JX.install('Request', {
  construct : function(uri, handler) {
    this.setURI(uri);
    if (handler) {
      this.listen('done', handler);
    }
  },

  events : ['start', 'open', 'send', 'done', 'error', 'finally'],

  members : {

    _xhrkey : null,
    _transport : null,
    _sent : false,
    _finished : false,
    _block : null,
    _data : null,

    getTransport : function() {
      var xport = this._transport;
      if (!xport) {
        try {
          try {
            xport = new XMLHttpRequest();
          } catch (x) {
            xport = new ActiveXObject("Msxml2.XMLHTTP");
          }
        } catch (x) {
          xport = new ActiveXObject("Microsoft.XMLHTTP");
        }
        this._transport = xport;
      }
      return xport;
    },

    send : function() {
      if (this._sent || this._finished) {
        if (__DEV__) {
          if (this._sent) {
            JX.$E(
              'JX.Request.send(): ' +
              'attempting to send a Request that has already been sent.');
          }
          if (this._finished) {
            JX.$E(
              'JX.Request.send(): ' +
              'attempting to send a Request that has finished or aborted.');
          }
        }
        return;
      }

      // Fire the "start" event before doing anything. A listener may
      // perform pre-processing or validation on this request
      this.invoke('start', this);
      if (this._finished) {
        return;
      }

      var xport = this.getTransport();
      xport.onreadystatechange = JX.bind(this, this._onreadystatechange);

      var list_of_pairs = this._data || [];
      list_of_pairs.push(['__ajax__', true]);

      this._block = JX.Stratcom.allocateMetadataBlock();
      list_of_pairs.push(['__metablock__', this._block]);

      var q = (this.getDataSerializer() ||
               JX.Request.defaultDataSerializer)(list_of_pairs);
      var uri = this.getURI();
      var method = this.getMethod().toUpperCase();

      if (method == 'GET') {
        uri += ((uri.indexOf('?') === -1) ? '?' : '&') + q;
      }

      if (this.getTimeout()) {
        this._timer = setTimeout(
          JX.bind(
            this,
            this._fail,
            JX.Request.ERROR_TIMEOUT),
          this.getTimeout());
      }

      xport.open(method, uri, true);

      // Must happen after xport.open so that listeners can modify the transport
      // Some transport properties can only be set after the transport is open
      this.invoke('open', this);
      if (this._finished) {
        return;
      }

      if (__DEV__) {
        if (this.getFile()) {
          if (method != 'POST') {
            JX.$E(
              'JX.Request.send(): ' +
              'attempting to send a file over GET. You must use POST.');
          }
          if (this._data) {
            JX.$E(
              'JX.Request.send(): ' +
              'attempting to send data and a file. You can not send both ' +
              'at once.');
          }
        }
      }

      this.invoke('send', this);
      if (this._finished) {
        return;
      }

      if (method == 'POST') {
        if (this.getFile()) {
          xport.send(this.getFile());
        } else {
          xport.setRequestHeader(
            'Content-Type',
            'application/x-www-form-urlencoded');
          xport.send(q);
        }
      } else {
        xport.send(null);
      }

      this._sent = true;
    },

    abort : function() {
      this._cleanup();
    },

    _onreadystatechange : function() {
      var xport = this.getTransport();
      var response;
      try {
        if (this._finished) {
          return;
        }
        if (xport.readyState != 4) {
          return;
        }
        // XHR requests to 'file:///' domains return 0 for success, which is why
        // we treat it as a good result in addition to HTTP 2XX responses.
        if (xport.status !== 0 && (xport.status < 200 || xport.status >= 300)) {
          this._fail();
          return;
        }

        if (__DEV__) {
          if (!xport.responseText.length) {
            JX.$E(
              'JX.Request("'+this.getURI()+'", ...): '+
              'server returned an empty response.');
          }
          if (xport.responseText.indexOf('for (;;);') != 0) {
            JX.$E(
              'JX.Request("'+this.getURI()+'", ...): '+
              'server returned an invalid response.');
          }
          if (xport.responseText == 'for (;;);') {
            JX.$E(
              'JX.Request("'+this.getURI()+'", ...): '+
              'server returned an empty response.');
          }
        }

        var text = xport.responseText.substring('for (;;);'.length);
        response = JX.JSON.parse(text);
        if (!response) {
          JX.$E(
            'JX.Request("'+this.getURI()+'", ...): '+
            'server returned an invalid response.');
        }
      } catch (exception) {

        if (__DEV__) {
          JX.log(
            'JX.Request("'+this.getURI()+'", ...): '+
            'caught exception processing response: '+exception);
        }
        this._fail();
        return;
      }

      try {
        if (response.error) {
          this._fail(response.error);
        } else {
          JX.Stratcom.mergeData(
            this._block,
            response.javelin_metadata || {});
          this._done(response);
          JX.initBehaviors(response.javelin_behaviors || {});
        }
      } catch (exception) {
        //  In Firefox+Firebug, at least, something eats these. :/
        setTimeout(function() {
          throw exception;
        }, 0);
      }
    },

    _fail : function(error) {
      this._cleanup();

      this.invoke('error', error, this);
      this.invoke('finally');
    },

    _done : function(response) {
      this._cleanup();

      if (response.onload) {
        for (var ii = 0; ii < response.onload.length; ii++) {
          (new Function(response.onload[ii]))();
        }
      }

      this.invoke('done', this.getRaw() ? response : response.payload, this);
      this.invoke('finally');
    },

    _cleanup : function() {
      this._finished = true;
      clearTimeout(this._timer);
      this._timer = null;

      // Should not abort the transport request if it has already completed
      // Otherwise, we may see an "HTTP request aborted" error in the console
      // despite it possibly having succeeded.
      if (this._transport && this._transport.readyState != 4) {
        this._transport.abort();
      }
    },

    setData : function(dictionary) {
      this._data = null;
      this.addData(dictionary);
      return this;
    },

    addData : function(dictionary) {
      if (!this._data) {
        this._data = [];
      }
      for (var k in dictionary) {
        this._data.push([k, dictionary[k]]);
      }
      return this;
    },

    setDataWithListOfPairs : function(list_of_pairs) {
      this._data = list_of_pairs;
      return this;
    }

  },

  statics : {
    ERROR_TIMEOUT : -9000,
    defaultDataSerializer : function(list_of_pairs) {
      var uri = [];
      for (var ii = 0; ii < list_of_pairs.length; ii++) {
        var pair = list_of_pairs[ii];
        var name = encodeURIComponent(pair[0]);
        var value = encodeURIComponent(pair[1]);
        uri.push(name + '=' + value);
      }
      return uri.join('&');
    }
  },

  properties : {
    URI : null,
    dataSerializer : null,
    /**
     * Configure which HTTP method to use for the request. Permissible values
     * are "POST" (default) or "GET".
     *
     * @param string HTTP method, one of "POST" or "GET".
     */
    method : 'POST',
    file : null,
    raw : false,

    /**
     * Configure a timeout, in milliseconds. If the request has not resolved
     * (either with success or with an error) within the provided timeframe,
     * it will automatically fail with error JX.Request.ERROR_TIMEOUT.
     *
     * @param int Timeout, in milliseconds (e.g. 3000 = 3 seconds).
     */
    timeout : null
  }

});
