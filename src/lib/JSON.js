/**
 * Simple JSON serializer.
 *
 * @requires javelin-install javelin-util
 * @provides javelin-json
 * @javelin
 */

JX.install('JSON', {
  statics : {
    parse : function(data) {
      if (typeof data != 'string'){
        return null;
      }

      if (JSON && JSON.parse) {
        var obj;
        try {
          obj = JSON.parse(data);
        } catch (e) {}
        return obj || null;
      }

      return eval('(' + data + ')');
    },
    stringify : function(val) {
      if (JSON && JSON.stringify) {
        return JSON.stringify(val);
      }

      var out = [];
      if (
        val === null || val === true || val === false || typeof val == 'number'
      ) {
        return '' + val;
      }

      if (val.push && val.pop) {
        for (var ii = 0; ii < val.length; ii++) {
          if (typeof val[ii] != 'undefined') {
            out.push(JX.JSON.stringify(val[ii]));
          }
        }
        return '[' + out.join(',') + ']';
      }

      if (typeof val == 'string') {
        return JX.JSON._esc(val);
      }

      for (var k in val) {
        out.push(JX.JSON._esc(k) + ':' + JX.JSON.stringify(val[k]));
      }
      return '{' + out.join(',') + '}';
    },

    // Lifted more or less directly from Crockford's JSON2.
    _escexp : /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,

    _meta : {
      '\b' : '\\b',
      '\t' : '\\t',
      '\n' : '\\n',
      '\f' : '\\f',
      '\r' : '\\r',
      '"'  : '\\"',
      '\\' : '\\\\'
    },

    _esc : function(str) {
      JX.JSON._escexp.lastIndex = 0;
      return JX.JSON._escexp.test(str) ?
        '"' + str.replace(JX.JSON._escexp, JX.JSON._replace) + '"' :
        '"' + str + '"';
    },

    _replace : function(m) {
      if (m in JX.JSON._meta) {
        return JX.JSON._meta[m];
      }
      return '\\u' + (('0000' + m.charCodeAt(0).toString(16)).slice(-4));
    }

  }
});
