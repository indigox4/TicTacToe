function GameBoard()
{
  this.turn = 0;
  this.gameOver = false;
  this.winner = -1;
  this.data = [-1,-1,-1,-1,-1,-1,-1,-1,-1];
}
  
GameBoard.prototype.click = function(rowNum, colNum) { 
  if( this.gameOver ) // If the game's over we won't let the user make any more moves.
    return;

  if( this.data[rowNum * 3 + colNum] != -1 )
    return;

  this.data[rowNum * 3 + colNum] = this.turn % 2;
  this.turn++;

  //this.updateBoard();
  this.checkWinner();
};

GameBoard.prototype.reset = function() {
  this.turn = 0;
  this.gameOver = false;
  this.winner = -1;
  this.data = [-1,-1,-1,-1,-1,-1,-1,-1,-1];
};

GameBoard.prototype.checkWinner = function() {

  for(p = 0; p < 2 && !this.gameOver; p++) {

    // check rows and colums. s == 0 check rows, s == 1 check columns
    for(s = 0; s < 2 && !this.gameOver; s++) {
      for(r = 0; r < 3 && !this.gameOver; r++) {
        var all = true;
        for(c = 0; c < 3 && all; c++) {
          if( s == 0)
            all &= (this.data[r*3+c] == p );
          else
            all &= (this.data[c*3+r] == p );
        }

        if( all ) {
          this.gameOver = true;
          this.winner = p;
        }  
      }
    } // end for s

    // check diagonals
    if( !this.gameOver ) {
      if( (this.data[0] == p && this.data[4] == p && this.data[8] == p) ||
          (this.data[2] == p && this.data[4] == p && this.data[6] == p) ) {
        this.gameOver = true;
        this.winner = p;
      }
    }

    if( this.gameOver ) {
      //document.getElementById("winner").innerHTML = 
      //  "Game over. The winner is " + (p == 0 ? "X" : "0");
    }      
  } // end for p

  var hasEmpty = false;
  for( i = 0; i < 9 && !this.gameOver && !hasEmpty; ++i ){
    hasEmpty |= (this.data[i] == -1);
  }

  if( !hasEmpty && !this.gameOver ) {
    this.gameOver = true;
    //document.getElementById("winner").innerHTML = "Game over. Tie game!";
  }
}

var gGameBoard = new GameBoard();
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){

  socket.on('resetBoard', function(msg){
    console.log('reset message: ');
    gGameBoard.reset();
    io.emit('serverUpdateBoard', gGameBoard);
  });

  socket.on('clickedSquare', function(msg) {
    console.log('clickedSquare ' + msg.row + ' ' + msg.col);
    gGameBoard.click(msg.row, msg.col);
    io.emit('serverUpdateBoard', gGameBoard);
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});




