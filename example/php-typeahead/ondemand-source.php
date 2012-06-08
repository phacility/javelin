<?php

require_once '../../support/php/JavelinHelper.php';

$query = $_GET['q'];

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

echo JavelinHelper::renderAjaxResponse($response);
