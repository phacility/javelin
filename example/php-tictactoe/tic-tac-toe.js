JX.behavior('tic-tac-toe', function() {

  var game = [0,0,0,0,0,0,0,0,0];
  var state = 'play';

  JX.Stratcom.listen(
    'click',
    'tic-tac-cell',
    function (e) {
      if (state != 'play') {
        return;
      }

      var node = e.getNodes()['tic-tac-cell'];
      var data = e.getNodeData('tic-tac-cell');
      var board = e.getNodes()['tic-tac-board'];

      var move = game[data.pos];

      if (move) {
        alert('That square was already taken by '+move+'.');
        return;
      }

      makeMove(board, 'X', data.pos);

      changeState(board, 'wait');
      new JX.Request('ai.php', function(response) {
          if (response.move) {
            makeMove(board, response.move, response.pos);
          }
          if (response.outcome) {
            changeState(board, 'done', response.outcome);
          } else {
            changeState(board, 'play');
          }
        })
        .setData({game: JX.JSON.serialize(game)})
        .send();
    });

  function makeMove(board, player, pos) {
    game[pos] = player;
    var cells = JX.DOM.scry(board, 'td', 'tic-tac-cell');
    for (var ii = 0; ii < cells.length; ii++) {
      var data = JX.Stratcom.getData(cells[ii]);
      if (data.pos == pos) {
        JX.DOM.setContent(cells[ii], player);
        break;
      }
    }
  }

  function changeState(board, new_state, message) {
    var msg;
    switch (new_state) {
      case 'wait': msg = 'Waiting for AI...'; break;
      case 'done': msg = message; break;
      case 'play': msg = 'Your move.';
    }
    JX.DOM.setContent(JX.DOM.find(board, 'td', 'tic-tac-status'), msg);
    state = new_state;
  }
});
