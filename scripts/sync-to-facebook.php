#!/usr/bin/env php
<?php

require_once dirname(__FILE__).'/__init_script__.php';
require_once 'sync-spec.php';

if ($argc != 2) {
  echo "usage: sync-to-facebook.php <php_root>\n";
  exit(1);
}

$files = JavelinSyncSpec::getFilesToSync();
$root = Filesystem::resolvePath($argv[1]).'/html/js/javelin/';

$local = dirname(dirname(__FILE__)).'/src/';
$data = array();
foreach ($files as $file) {
  echo "Reading {$file}...\n";
  $data[$file] = Filesystem::readFile($local.$file);
}

foreach ($data as $file => $content) {
  echo "Writing {$file}...\n";
  execx('mkdir -p %s', $root.dirname($file));
  Filesystem::writeFile($root.$file, $content);
}

echo "Done.\n";
