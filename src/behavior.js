/**
 *  @requires javelin-util
 *  @provides javelin-behavior
 *   @javelin
 */

(function(JX) {

  var behaviors = {};
  var initialized = {};

  JX.behavior = function(name, control_function) {
    if (__DEV__) {
      if (name in behaviors) {
        throw new Error(
          'JX.behavior("'+name+'", ...): '+
          'behavior is already registered.');
      }
      if (!control_function) {
        throw new Error(
          'JX.behavior("'+name+'", <nothing>): '+
          'initialization function is required.');
      }
      if (typeof control_function != 'function') {
        throw new Error(
          'JX.behavior("'+name+'", <garbage>): '+
          'initialization function is not a function.');
      }
    }
    behaviors[name] = control_function;
  };

  JX.initBehaviors = function(map) {
    for (var name in map) {
      if (__DEV__) {
        if (!(name in behaviors)) {
          throw new Error(
            'JX.initBehavior("'+name+'", ...): '+
            'behavior is not registered.');
        }
      }
      var configs = map[name];
      if (!configs.length) {
        if (name in initialized) {
          continue;
        } else {
          configs = [null];
        }
      }
      for (var ii = 0; ii < configs.length; ii++) {
        behaviors[name](configs[ii]);
      }
      initialized[name] = true;
    }
  };

})(JX);
