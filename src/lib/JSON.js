/**
 * Simple JSON serializer.
 *
 * @requires javelin-install javelin-util
 * @provides javelin-json
 * @javelin
 */

JX.install('JSON', {
  statics : {
    serialize : function(obj) {
      if (__DEV__) {
        try {
          return JX.JSON._val(obj);
        } catch (x) {
          JX.log(
            'JX.JSON.serialize(...): '+
            'caught exception while serializing object. ('+x+')');
        }
      } else {
        return JX.JSON._val(obj);
      }
    },
    _val : function(val) {
      var out = [];
      if (val === null) {
        return 'null';
      } else if (val.push && val.pop) {
        for (var ii = 0; ii < val.length; ii++) {
          if (typeof val[ii] != 'undefined') {
            out.push(JX.JSON._val(val[ii]));
          }
        }
        return '['+out.join(',')+']';
      } else if (val === true) {
        return 'true';
      } else if (val === false) {
        return 'false';
      } else if (typeof val == 'string') {
        return JX.JSON._esc(val);
      } else if (typeof val == 'number') {
        return val;
      } else {
        for (var k in val) {
          out.push(JX.JSON._esc(k)+':'+JX.JSON._val(val[k]));
        }
        return '{'+out.join(',')+'}';
      }
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
