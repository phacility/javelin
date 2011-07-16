/**
 * @requires javelin-install
 * @provides javelin-typeahead-normalizer
 * @javelin
 */


/**
 * @group control
 */
JX.install('TypeaheadNormalizer', {
  statics : {
    normalize : function(str) {
      return ('' + str)
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/ +/g, ' ')
        .replace(/^\s*|\s*$/g, '');
    }
  }
});
