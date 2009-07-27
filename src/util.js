/**
 *  Javelin utility functions.
 *
 *  @provides javelin-util
 */


/**
 *  Convert an array-like object (e.g., arguments) into an array.
 *
 *  @param  obj     Array or array-like object.
 *  @return array   Actual array.
 *
 *  @heavy  $A
 *  @author epriestley
 */
JX.$A = function(mysterious_object) {
  return Array.prototype.slice.apply(mysterious_object, []);
};


/**
 *  Cast a value into an array, by wrapping scalars into singletons.
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
 *  toString property.
 *
 *  @param  obj     Destination object, which properties should be copied to.
 *  @param  obj     Source object, which properties should be copied from.
 *  @return obj     Destination object.
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
 *  ten pages of documentation.
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
 *  "bag of holding").
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
  return setTimeout(fn, timeout || 0);
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

  if (__DEV__) {
    if (JX.Stratcom) {
      clearTimeout(JX._redirectTimeout);
      JX._redirectTimeout = null;
      if (!JX._redirectInitialized) {
        JX.Stratcom.listen('keypress', null, function(e) {
          if (e.getSpecialKey() == 'esc' && !e.getPrevented()) {
            if (JX._redirectTimeout) {
              clearTimeout(JX._redirectTimeout);
              JX._redirectTimeout = null;
              JX.log('Redirect cancelled.');
            }
          }
        });
      }
      if (!arguments[1]) {
        var sec = 3;
        JX.log('Redirecting to "'+uri+'" in '+sec+' seconds, press escape to '+
                'cancel.');
        JX._redirectTimeout = setTimeout(
          JX.bind(JX, JX.go, uri, true),
          sec * 1000);
        return;
      }
    }
  }

  (uri && (window.location = uri)) || window.location.reload(true);
};


//  TODO: This is only used in JX.Flash and we should probably inline it.
JX.ua = {isTrident : !!(document.attachEvent)};

if (__DEV__) {
  if (!window.console || !window.console.log) {
    window.console = {log: function() {}};
  }
  JX.log = function(message) {
    window.console.log(message);
  }
}
