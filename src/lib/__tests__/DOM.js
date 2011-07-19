/**
 * @requires javelin-uri javelin-php-serializer
 */
describe('JX.DOM', function() {

  describe('uniqID', function() {
    it('must expect the unexpected', function() {
      // Form with an in <input /> named "id", which collides with the "id"
      // attribute.
      var form_id = JX.$N('form', {}, JX.$N('input', {name : 'id'}));
      var form_ok = JX.$N('form', {}, JX.$N('input', {name : 'ok'}));

      // Test that we avoid issues when "form.id" is actually the node named
      // "id".
      var id = JX.DOM.uniqID(form_id);
      expect(typeof id).toBe('string');
      expect(!!id).toBe(true);

      var ok = JX.DOM.uniqID(form_ok);
      expect(typeof ok).toBe('string');
      expect(!!ok).toBe(true);

      expect(id).toNotEqual(ok);
    });
  });

  describe('setContent', function() {
    var node;

    beforeEach(function() {
      node = JX.$N('div');
    });

    it('should insert a node', function() {
      var content = JX.$N('p');

      JX.DOM.setContent(node, content);
      expect(node.childNodes[0]).toEqual(content);
      expect(node.childNodes.length).toEqual(1);
    });

    it('should insert two nodes', function() {
      var content = [JX.$N('p'), JX.$N('div')];

      JX.DOM.setContent(node, content);
      expect(node.childNodes[0]).toEqual(content[0]);
      expect(node.childNodes[1]).toEqual(content[1]);
      expect(node.childNodes.length).toEqual(2);
    });

    it('should accept a text node', function() {
      var content = 'This is not the text you are looking for';

      JX.DOM.setContent(node, content);
      expect(node.innerText || node.textContent).toEqual(content);
      expect(node.childNodes.length).toEqual(1);
    });

    it('should accept nodes and strings in an array', function() {
      var content = [
        'This is not the text you are looking for',
        JX.$N('div')
      ];

      JX.DOM.setContent(node, content);
      expect(node.childNodes[0].nodeValue).toEqual(content[0]);
      expect(node.childNodes[1]).toEqual(content[1]);
      expect(node.childNodes.length).toEqual(2);
    });

    it('should accept a JX.HTML instance', function() {
      var content = JX.$H('<div />');

      JX.DOM.setContent(node, content);
      // Can not rely on an equals match because JX.HTML creates nodes on
      // the fly
      expect(node.childNodes[0].tagName).toEqual('DIV');
      expect(node.childNodes.length).toEqual(1);
    });

    it('should accept multiple JX.HTML instances', function() {
      var content = [JX.$H('<div />'), JX.$H('<a href="#"></a>')];

      JX.DOM.setContent(node, content);
      expect(node.childNodes[0].tagName).toEqual('DIV');
      expect(node.childNodes[1].tagName).toEqual('A');
      expect(node.childNodes.length).toEqual(2);
    });
  });

});
