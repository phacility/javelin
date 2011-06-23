/**
 * @requires javelin-stratcom
 *           javelin-dom
 */
describe('Stratcom Tests', function() {
  node1 = document.createElement('div');
  JX.Stratcom.addSigil(node1, 'what');
  node2 = document;
  node3 = document.createElement('div');
  node3.className = 'what';

  it('should disallow document', function() {
    ensure__DEV__(true, function() {
      expect(function() {
        JX.Stratcom.listen('click', 'tag:#document', function() {});
      }).toThrow();
    });
  });

  it('should disallow window', function() {
    ensure__DEV__(true, function() {
      expect(function() {
        JX.Stratcom.listen('click', 'tag:window', function() {});
      }).toThrow();
    });
  });

  it('should test nodes for hasSigil', function() {
    expect(JX.Stratcom.hasSigil(node1, 'what')).toBe(true);
    expect(JX.Stratcom.hasSigil(node3, 'what')).toBe(false);

    ensure__DEV__(true, function() {
      expect(function() {
        JX.Stratcom.hasSigil(node2, 'what');
      }).toThrow();
    });
  });

  it('should test dataPersistence', function() {
    var n, d;

    n = JX.$N('div');
    d = JX.Stratcom.getData(n);
    expect(d).toEqual({});
    d.noise = 'quack';
    expect(JX.Stratcom.getData(n).noise).toEqual('quack');

    n = JX.$N('div');
    JX.Stratcom.addSigil(n, 'oink');
    d = JX.Stratcom.getData(n);
    expect(JX.Stratcom.getData(n)).toEqual({});
    d.noise = 'quack';
    expect(JX.Stratcom.getData(n).noise).toEqual('quack');

    ensure__DEV__(true, function(){
      var bad_values = [false, null, undefined, 'quack'];
      for (var ii = 0; ii < bad_values.length; ii++) {
        n = JX.$N('div');
        expect(function() {
          JX.Stratcom.addSigil(n, 'oink');
          JX.Stratcom.addData(n, bad_values[ii]);
        }).toThrow();
      }
    });

  });

  // it('can set data serializer', function() {
  //   var uri = new JX.URI('http://www.facebook.com/home.php?key=value');
  //   uri.setQuerySerializer(JX.PHPQuerySerializer.serialize);
  //   uri.setQueryParam('obj', {
  //     num : 1,
  //     obj : {
  //       str : 'abc',
  //       i   : 123
  //     }
  //   });
  //   expect(decodeURIComponent(uri.toString())).toEqual(
  //     'http://www.facebook.com/home.php?key=value&' +
  //     'obj[num]=1&obj[obj][str]=abc&obj[obj][i]=123');
  // });

});
