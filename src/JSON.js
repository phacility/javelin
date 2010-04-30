/**
 *  Simple JSON serializer.
 *
 *  @requires javelin-install javelin-util
 *  @provides javelin-json
 *  @javelin
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
            'caught exception while serializing object.');
        }
      } else {
        return JX.JSON._val(obj);
      }
    },
    _val : function(val) {
      var out = [];
      if (val.push && val.pop) {
        for (var ii = 0; ii < val.length; ii++) {
          out.push(JX.JSON._val(val[ii]));
        }
        return '['+out.join(',')+']';
      } else if (val === null) {
        return 'null';
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
    _esc : function(str) {
      return '"'+str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')+'"';
    }
  }
});
