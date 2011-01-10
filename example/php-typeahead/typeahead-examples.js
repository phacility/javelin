JX.behavior('typeahead-examples', function(config) {
  var source = new JX.TypeaheadPreloadedSource(config.preloadedURI);
  var typeahead = new JX.Typeahead(JX.$(config.preloadedHardpoint));
  
  typeahead.setDatasource(source);
  typeahead.listen('choose', function(target) {
    JX.go(target.href);
  });
  typeahead.start();

  
  var ondemandsource = new JX.TypeaheadOnDemandSource(config.ondemandURI);
  var ondemandtypeahead = new JX.Typeahead(JX.$(config.ondemandHardpoint));
  
  ondemandtypeahead.setDatasource(ondemandsource);
  ondemandtypeahead.listen('choose', function(target) {
    JX.go(target.href);
  });
  ondemandtypeahead.start();
  
});
