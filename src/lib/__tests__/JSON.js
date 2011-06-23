/**
 * @requires javelin-json
 */

describe('JSON', function() {

  it('should encode and decode an object', function() {
    var object = {
      a: [0, 1, 2],
      s: "Javelin Stuffs",
      u: '\x01',
      n: 1,
      f: 3.14,
      b: false,
      nil: null,
      o: {
        a: 1,
        b: [1, 2],
        c: {
          a: 2,
          b: 3
        }
      }
    };

    expect(JX.JSON.parse(JX.JSON.stringify(object))).toEqual(object);
  });

});
