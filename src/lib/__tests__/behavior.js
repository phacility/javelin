/**
 * @requires javelin-behavior
 */
describe('Javelin Behaviors', function() {

  beforeEach(function() {
    // Don't try this at home, kids.
    JX.behavior._behaviors = {};
    JX.behavior._initialized = {};
  });

  it('JX.behavior should work with tricky names', function() {
    expect(function() {
      JX.behavior('toString', function() {});
    }).not.toThrow();
  });

  it('JX.initBehavior should work with tricky names', function() {
    var called = false;
    var config;

    JX.behavior('toString', function(cfg) {
      called = true;
      config = cfg;
    });

    JX.initBehaviors({});
    expect(called).toBe(false);
    expect(typeof config).toEqual('undefined');

    JX.initBehaviors({ 'toString': [] });
    expect(called).toBe(true);
    expect(config).toBeNull();

    JX.initBehaviors({ 'toString': ['foo'] });
    expect(called).toBe(true);
    expect(config).toEqual('foo');
  });

  it('JX.initBehavior should init a behavior with no config once', function() {
    var count = 0;
    JX.behavior('foo', function() {
      count++;
    });
    JX.initBehaviors({ 'foo': [] });
    expect(count).toEqual(1);
    JX.initBehaviors({ 'foo': [] });
    expect(count).toEqual(1);
    JX.initBehaviors({ 'foo': ['test'] });
    expect(count).toEqual(2);
  });

});

