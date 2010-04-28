<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
   "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
  <head>
    <title>Javelin Example: Tic Tac Toe</title>
    <script type="text/javascript">var __DEV__ = true;</script>
    <script src="../../pkg/init.dev.js" type="text/javascript"></script>
    <style type="text/css">
      .tictac {
        border: 2px solid black;
        cursor: pointer;
        text-align: center;
        font-size: 36px;
        width: 100px;
        height: 100px;
        font-weight: bold;
      }
      .status {
        text-align: center;
        color: #666666;
      }
    </style>
  </head>
  <body>

    <p>This is a simple Tic-Tac-Toe game using Javelin and PHP.</p>
    <p>Click a square to make the first move.</p>
<?php

  require_once '../../support/php/Javelin.php';

  $table = array();
  $table[] = '<tr>';
  $table[] = Javelin::renderTag(
    'td',
    'Your move.',
    array(
      'sigil' => 'tic-tac-status',
      'class' => 'status',
      'colspan' => '3',
    ));
  for ($y = 0; $y < 3; $y++) {
    $table[] = '<tr>';
    for ($x = 0; $x < 3; $x++) {
      $table[] = Javelin::renderTag(
        'td',
        '',
        array(
          'class' => 'tictac',
          'meta'  => array(
            'pos' => $y * 3 + $x
          ),
          'sigil' => 'tic-tac-cell',
          'mustcapture' => true,
        ));
    }
    $table[] = '</tr>';
  }

  echo Javelin::renderTag(
    'table',
    implode("\n", $table),
    array(
      'sigil' => 'tic-tac-board',
    ));

  Javelin::initBehavior('tic-tac-toe');

?>
  </body>
  <script src="../../pkg/javelin.dev.js" type="text/javascript"></script>
  <script src="tic-tac-toe.js" type="text/javascript"></script>
<?php

  echo Javelin::renderHTMLFooter();

?>
</html>
