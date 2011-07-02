#!/usr/bin/env php
<?php

require_once dirname(__FILE__).'/__init_script__.php';
require_once 'sync-spec.php';

$local = dirname(dirname(__FILE__));
JavelinSyncSpec::rebuildPackages($local);
