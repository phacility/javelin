/**
 * Javelin utility functions.
 *
 * @provides javelin-util
 *
 * @javelin-installs JX.$A
 * @javelin-installs JX.$AX
 * @javelin-installs JX.copy
 * @javelin-installs JX.bind
 * @javelin-installs JX.bag
 * @javelin-installs JX.keys
 * @javelin-installs JX.defer
 * @javelin-installs JX.occur
 * @javelin-installs JX.go
 * @javelin-installs JX.log
 *
 * @javelin
 */


/**
 *  Convert an array-like object (e.g., arguments) into an array. This avoids
 *  the Array.slice() trick because some bizarre COM object I dug up somewhere
 *  was freaking out when I tried to do it and it made me sad.
 *
 *  @param  obj     Array or array-like object.
 *  @return array   Actual array.
 *
 *  @heavy  $A
 *  @author epriestley
 */
JX.$A = function(mysterious_object) {
  var r = [];
  for (var ii = 0; ii < mysterious_object.length; ii++) {
    r.push(mysterious_object[ii]);
  }
  return r;
};


/**
 *  Cast a value into an array, by wrapping scalars into singletons. The "X"
 *  might stand for anything!
 *
 *  @param  obj     Scalar or array.
 *  @return array   If the argument was a scalar, an array with the argument as
 *                  its only element. Otherwise, the original array.
 *
 *  @heavy  arrayize()
 *  @author epriestley
 */
JX.$AX = function(maybe_scalar) {
  return (maybe_scalar instanceof Array) ? maybe_scalar : [maybe_scalar];
};


/**
 *  Copy properties from one object to another. Note: does not copy the
 *  toString property or anything else which isn't enumerable or is somehow
 *  magic or just doesn't work. But it's usually what you want.
 *
 *  @param  obj Destination object, which properties should be copied to.
 *  @param  obj Source object, which properties should be copied from.
 *  @return obj Destination object.
 *
 *  @heavy  copy_properties()
 *  @author epriestley
 */
JX.copy = function(copy_dst, copy_src) {
  for (var k in copy_src) {
    copy_dst[k] = copy_src[k];
  }
  return copy_dst;
};


/**
 *  Bind is the king of all functions. Go look at the heavy one, it has like
 *  ten pages of documentation. Of course, If you're looking at the open source
 *  version of Javelin, this is small comfort.
 *
 *  @param  obj|null  Context object to bind as `this'.
 *  @param  function  Function to bind context and arguments to.
 *  @param  ...       Zero or more arguments to bind.
 *  @return function  Function with context and arguments bound.
 *
 *  @heavy  bind()
 *  @author epriestley
 */
JX.bind = function(context, func/*, arg, arg, ...*/) {

  if (__DEV__) {
    if (typeof func != 'function') {
      throw new Error('Attempting to bind something that is not a function.');
    }
  }

  var bound = JX.$A(arguments).slice(2);
  return function() {
    return func.apply(context || window, bound.concat(JX.$A(arguments)));
  }
};


/**
 *  This function is guaranteed not to do anything (the name is derived from
 *  "bag of holding"). Primarily, it's used as a placeholder when you want
 *  something to be callable but don't want it to actually do anything.
 *
 *  @return void
 *
 *  @heavy  bagofholding()
 *  @author epriestley
 */
JX.bag = function() {
  // \o\ \o/ /o/ woo dance party
};


/**
 *  Convert an object's keys into an list.
 *
 *  @param  obj     Object to retrieve keys from.
 *  @return list    List of keys.
 *
 *  @heavy  keys()
 *  @author epriestley
 */
JX.keys = function(obj) {
  var r = [];
  for (var k in obj) {
    r.push(k);
  }
  return r;
};


/**
 *  Defer a function for later execution.
 *
 *  @heavy  Function.defer()
 *  @author epriestley
 */
JX.defer = function(fn, timeout) {
  var t = setTimeout(fn, timeout || 0);
  return {stop : function() { clearTimeout(t); }}
};


/**
 *  Cause execution of a function to occur.
 *
 *  @heavy  Function.occur()
 *  @author epriestley
 */
JX.occur = function(fn) {
  return fn.apply(window);
};

/**
 *  Redirect the browser to another page by changing the window location.
 *
 *  @param  string    Optional URI to redirect the browser to. If no URI is
 *                    provided, the current page will be reloaded.
 *  @return void
 *
 *  @author epriestley
 */
JX.go = function(uri) {
  (uri && (window.location = uri)) || window.location.reload(true);
};


if (__DEV__) {
  if (!window.console || !window.console.log) {
    if (window.opera && window.opera.postError) {
      window.console = {log: function(m) { window.opera.postError(m); }};
    } else {
      window.console = {log: function(m) { }};
    }
  }
  JX.log = function(message) {
    window.console.log(message);
  }

  window.alert = (function(native_alert) {
    var recent_alerts = [];
    var in_alert = false;
    return function(msg) {
      if (in_alert) {
        JX.log(
          'alert(...): '+
          'discarded reentrant alert.');
        return;
      }
      in_alert = true;
      recent_alerts.push(new Date().getTime());

      if (recent_alerts.length > 3) {
        recent_alerts.splice(0, recent_alerts.length - 3);
      }

      if (recent_alerts.length >= 3 &&
          (recent_alerts[recent_alerts.length - 1] - recent_alerts[0]) < 5000) {
        if (confirm(msg + "\n\nLots of alert()s recently. Kill them?")) {
          window.alert = JX.bag;
        }
      } else {
        //  Note that we can't .apply() the IE6 version of this "function"
        native_alert(msg);
      }
      in_alert = false;
    }
  })(window.alert);

}
