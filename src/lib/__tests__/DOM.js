/**
 * @requires javelin-uri javelin-php-serializer
 */
describe('JX.DOM', function() {

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

