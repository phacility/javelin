/**
 * @requires javelin-util
 */

describe('JX.isArray', function() {

  it('should correctly identify an array', function() {
    expect(JX.isArray([1, 2, 3])).toBe(true);

    expect(JX.isArray([])).toBe(true);
  });

  it('should return false on anything that is not an array', function() {
    expect(JX.isArray(1)).toBe(false);
    expect(JX.isArray('a string')).toBe(false);
    expect(JX.isArray(true)).toBe(false);
    expect(JX.isArray(/regex/)).toBe(false);

    expect(JX.isArray(new String('a super string'))).toBe(false);
    expect(JX.isArray(new Number(42))).toBe(false);
    expect(JX.isArray(new Boolean(false))).toBe(false);

    expect(JX.isArray({})).toBe(false);
    expect(JX.isArray({'0': 1, '1': 2, length: 2})).toBe(false);
    expect(JX.isArray((function(){
      return arguments;
    })('I', 'want', 'to', 'trick', 'you'))).toBe(false);
  });

  it('should identify an array from another context as an array', function() {
    var iframe = document.createElement('iframe');
    var name = iframe.name = 'javelin-iframe-test';
    iframe.style.display = 'none';

    document.body.insertBefore(iframe, document.body.firstChild);

    var MaybeArray = window.frames[name].window.Array;
    var array = MaybeArray(1, 2, 3);
    var array2 = new MaybeArray(1);
    array2[0] = 5;
    // For demonstration purposes
    expect(array instanceof Array).toBe(false);
    expect(array2 instanceof Array).toBe(false);

    expect(JX.isArray(array)).toBe(true);
    expect(JX.isArray(array2)).toBe(true);
  });

});
