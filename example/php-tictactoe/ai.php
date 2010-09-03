<?php

require_once '../../support/php/Javelin.php';

$game = json_decode($_REQUEST['game']);

$response = array();
if (check_win($game, 'X')) {
  $response['outcome'] = 'You win! Reload to play again.';
} else if (count(array_filter($game)) == 9) {
  $response['outcome'] = 'Tie game. Reload to play again.';
} else {

  do {
    $pos = mt_rand(0, 8);
    if (empty($game[$pos])) {
      $game[$pos] = 'O';
      $response['pos'] = $pos;
      $response['move'] = 'O';
      break;
    }
  } while (true);

  if (check_win($game, 'O')) {
    $response['outcome'] = 'You lose! Reload to play again.';
  }
}

echo Javelin::renderAjaxResponse($response);

function check_win($game, $player) {
  static $wins = array(
    0, 1, 2, // horizontal
    3, 4, 5,
    6, 7, 8,

    0, 3, 6, // vertical
    1, 4, 7,
    2, 5, 8,

    0, 4, 8, // diagonal
    6, 4, 2,
  );

  foreach (array_chunk($wins, 3) as $win) {
    $is_win = true;
    foreach ($win as $cell) {
      if ($game[$cell] !== $player) {
        $is_win = false;
        break;
      }
    }
    if ($is_win) {
      return true;
    }
  }

  return false;
}


