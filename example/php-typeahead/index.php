<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
   "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
  <head>
    <title>Javelin Example: Typeahead</title>
    <script type="text/javascript">var __DEV__ = true;</script>
    <script src="../../pkg/init.dev.js" type="text/javascript"></script>
    <link rel="stylesheet" href="typeahead-examples.css" type="text/css" />
  </head>
  <body style="font-family: verdana">

    <p>This is a simple Typeahead using Javelin and PHP.</p>

    <div>
      <p>A typeahead is a UI component similar to a text input, except that it
      suggests some set of results (like friends' names, common searches, or
      repository paths) as the user types them. Familiar examples of this UI
      include Google Suggest, the Facebook search box, and OS X's Spotlight
      feature.</p>

      <p>This typeahead suggests animal names. Try typing "raccoon" or "zebra",
      for example.</p>
    </div>

    <div>
      <strong>Preloaded Typeahead</strong>
      <div id="preloadedtypeahead" style="position: relative; width: 200px">
        <input type="text" class="jx-typeahead" />
      </div>
    </div>

    <div>
      <p>The typeahead above uses a <tt>TypeaheadPreloadedSource</tt>, which
      preloads every possible value with one request. This usually works best
      if you have no more than around 1,000 results. If you have more, you may
      want to use <tt>TypeaheadOnDemandSource</tt>, which makes multiple
      requests as the user types. This allows the user to efficiently search
      a much larger result space.</p>
      <p>This typeahead loads suggestions on the fly.</p>
    </div>

    <div>
      <strong>On Demand Typeahead</strong>
      <div id="ondemandtypeahead" style="position: relative; width: 200px">
        <input type="text" class="jx-typeahead" />
      </div>
    </div>


<?php

  require_once '../../support/php/JavelinHelper.php';


  JavelinHelper::initBehavior(
    'typeahead-examples',
    array(
      'preloadedURI'        => 'preloaded-source.php',
      'preloadedHardpoint'  => 'preloadedtypeahead',
      'ondemandURI'         => 'ondemand-source.php',
      'ondemandHardpoint'   => 'ondemandtypeahead',
    ));


?>
  </body>
  <script src="../../pkg/javelin.dev.js" type="text/javascript"></script>
  <script src="../../pkg/typeahead.dev.js" type="text/javascript"></script>
  <script src="typeahead-examples.js" type="text/javascript"></script>
<?php

  echo JavelinHelper::renderHTMLFooter();

?>
</html>
