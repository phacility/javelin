#!/usr/bin/env php
<?php

require_once dirname(__FILE__).'/__init_script__.php';
require_once 'sync-spec.php';

if ($argc != 2) {
  echo "usage: sync-from-facebook.php <php_root>\n";
  exit(1);
}

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

JavelinSyncSpec::rebuildPackages($local);
