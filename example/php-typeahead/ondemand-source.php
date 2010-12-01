<?php

require_once '../../support/php/Javelin.php';

$query = $_SERVER['q'];

$list = file_get_contents('animals.txt');
$list = explode("\n", trim($list));

$response = array();
foreach ($list as $animal) {
  if (strncasecmp($query, $animal, strlen($query)) == 0) {
    $response[] = array(
      ucfirst($animal),
      'http://www.google.com/search?q='.$animal,
      $animal);
  }
}

echo Javelin::renderAjaxResponse($response);