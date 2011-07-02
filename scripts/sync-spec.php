<?php

/**
 * Defines what to sync to and from Facebook's trunk.
 */
class JavelinSyncSpec {

  public static function getFilesToSync() {
    return array(
      'core/init.js',
      'core/util.js',
      'core/install.js',
      'core/Event.js',
      'core/Stratcom.js',
      'lib/behavior.js',
      'lib/Request.js',
      'lib/Vector.js',
      'lib/DOM.js',
      'lib/JSON.js',
      'lib/Mask.js',
      'lib/Workflow.js',
      'lib/URI.js',
      'lib/control/typeahead/Typeahead.js',
      'lib/control/typeahead/source/TypeaheadSource.js',
      'lib/control/typeahead/source/TypeaheadPreloadedSource.js',
      'lib/control/typeahead/source/TypeaheadOnDemandSource.js',
      'lib/control/typeahead/normalizer/TypeaheadNormalizer.js',
      'lib/control/tokenizer/Tokenizer.js',

      'docs/Base.js',
    );
  }

  public static function getPackageMap() {
    return array(
      'init' => array(
        'core/init.js',
      ),
      'javelin' => array(
        'core/util.js',
        'core/install.js',
        'core/Event.js',
        'core/Stratcom.js',
        'lib/behavior.js',
        'lib/Request.js',
        'lib/Vector.js',
        'lib/DOM.js',
        'lib/JSON.js',
        'lib/URI.js',
      ),
      'typeahead' => array(
        'lib/control/typeahead/Typeahead.js',
        'lib/control/typeahead/normalizer/TypeaheadNormalizer.js',
        'lib/control/typeahead/source/TypeaheadSource.js',
        'lib/control/typeahead/source/TypeaheadPreloadedSource.js',
        'lib/control/typeahead/source/TypeaheadOnDemandSource.js',
        'lib/control/tokenizer/Tokenizer.js',
      ),
      'workflow' => array(
        'lib/Mask.js',
        'lib/Workflow.js',
      ),
    );
  }

  public static function rebuildPackages($root) {
    $packages = JavelinSyncSpec::getPackageMap();
    $data = array();

    foreach ($packages as $package => $items) {
      $content = array();
      foreach ($items as $item) {
        if (empty($data[$item])) {
          $data[$item] = Filesystem::readFile($root.'/src/'.$item);
        }
        $content[] = $data[$item];
      }
      $content = implode("\n\n", $content);

      echo "Writing {$package}.dev.js...\n";
      Filesystem::writeFile($root.'/pkg/'.$package.'.dev.js', $content);

      echo "Writing {$package}.min.js...\n";
      $exec = new ExecFuture($root.'/support/jsxmin/jsxmin __DEV__:0');
      $exec->write($content);
      list($stdout) = $exec->resolvex();

      Filesystem::writeFile($root.'/pkg/'.$package.'.min.js', $stdout);
    }

  }

}
