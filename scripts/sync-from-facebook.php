#!/usr/bin/env php
<?php

require_once dirname(__FILE__).'/__init_script__.php';

if ($argc != 2) {
  echo "usage: sync-from-facebook <php_root>\n";
  exit(1);
}

phutil_require_module('phutil', 'filesystem');
phutil_require_module('phutil', 'future/exec');

$files = array(
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
);

$packages = array(
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

$root = Filesystem::resolvePath($argv[1]).'/html/js/javelin/';

$data = array();
foreach ($files as $file) {
  echo "Reading {$file}...\n";
  $content = Filesystem::readFile($root.$file);
  
  // Strip out Facebook-specific bookkeeping code.
  $content = preg_replace(
    "@/\*\+([a-z]+)\*/.*?/\*-\\1\*/([ ]*\n)*@s",
    "\n",
    $content);
    
  $data[$file] = $content;
}

$local = dirname(dirname(__FILE__));
foreach ($data as $file => $content) {
  echo "Writing {$file}...\n";
  execx('mkdir -p %s', $local.'/src/'.dirname($file));
  Filesystem::writeFile($local.'/src/'.$file, $content);
}

foreach ($packages as $package => $items) {
  $content = array();
  foreach ($items as $item) {
    $content[] = $data[$item];
  }
  $content = implode("\n\n", $content);
  
  echo "Writing {$package}.dev.js...\n";
  Filesystem::writeFile($local.'/pkg/'.$package.'.dev.js', $content);
    
  echo "Writing {$package}.min.js...\n";
  $exec = new ExecFuture($local.'/support/jsxmin/jsxmin __DEV__:0');
  $exec->write($content);
  list($stdout) = $exec->resolvex();
  
  Filesystem::writeFile($local.'/pkg/'.$package.'.min.js', $stdout);
}

