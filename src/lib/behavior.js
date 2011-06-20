/**
 * @provides javelin-behavior
 * @requires javelin-magical-init
 *
 * @javelin-installs JX.behavior
 * @javelin-installs JX.initBehaviors
 *
 * @javelin
 */

JX.behavior = function(name, control_function) {
  if (__DEV__) {
    if (JX.behavior._behaviors.hasOwnProperty(name)) {
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
  JX.behavior._behaviors[name] = control_function;
};


JX.initBehaviors = function(map) {
  for (var name in map) {
    if (__DEV__) {
      if (!(name in JX.behavior._behaviors)) {
        throw new Error(
          'JX.initBehavior("'+name+'", ...): '+
          'behavior is not registered.');
      }
    }
    var configs = map[name];
    if (!configs.length) {
      if (JX.behavior._initialized.hasOwnProperty(name)) {
        continue;
      }
      configs = [null];
    }
    for (var ii = 0; ii < configs.length; ii++) {
      JX.behavior._behaviors[name](configs[ii]);
    }
    JX.behavior._initialized[name] = true;
  }
};

JX.behavior._behaviors = {};
JX.behavior._initialized = {};
JX.flushHoldingQueue('behavior', JX.behavior);
