#!/usr/bin/env php
<?php

require_once dirname(__FILE__).'/__init_script__.php';
require_once 'sync-spec.php';

if ($argc != 2) {
  echo "usage: sync-from-facebook.php <php_root>\n";
  exit(1);
}

phutil_require_module('phutil', 'filesystem');
phutil_require_module('phutil', 'future/exec');

$files = JavelinSyncSpec::getFilesToSync();
$packages = JavelinSyncSpec::getPackageMap();

$root = Filesystem::resolvePath($argv[1]).'/html/js/javelin/';

$data = array();
foreach ($files as $file) {
  echo "Reading {$file}...\n";
  $data[$file] = Filesystem::readFile($root.$file);
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

