//-------------------------------------------------------------------------------
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

//-------------------------------------------------------------------------------
// login stuff
var gPlayers = [];

function hasUser( username )
{
  return getUser( username ) != null;
}

function getUser( username ) {
  for( i = 0; i < gPlayers.length; ++i ) {
    if( gPlayers[i].name === username ) 
      return gPlayers[i];
  }

  return null;
}

function addUser( username, pw ) {
  var newUser = { name: username, password: pw, sockets: [], games: [] };
  gPlayers.push( newUser );
  return newUser;
}

function authenticateUser( username, pw ){
  for( i = 0; i < gPlayers.length; ++i ) {
    if( gPlayers[i].name === username && 
        gPlayers[i].password === pw ) 
      return true;
  }  

  return false;
}

function setUserSocket( usr, socketId )
{
    // sanity check: this socket should not already be associated
    // with this user.
    var exists = false;
    for( i = 0; i < usr.sockets.length && !exists; ++i )
      exists = usr.sockets[i] === socketId;
    
    if( !exists )
      usr.sockets.push( socketId );
}

function removeUserSocket( usr, socketId )
{
  if( usr.sockets.length === 0 )
    return;

  for( i = (usr.sockets.length - 1); i >= 0; --i )
    if( usr.sockets[i] === socketId )
      usr.sockets.splice(i,1);
}

function getUserSocket( usr )
{
  if( usr != null && usr.sockets.length > 0 )
    return usr.sockets[0];

  return 0;
}
//-------------------------------------------------------------------------------
// game lists
var gGameList = [];

function getGameList()
{
  var gameList = [];

  var nbGames = gGameList.length;
  for( i = 0; i < nbGames; ++i ) {
    if( gGameList[i].gameState < 2 ) { 
        gameList.push( gGameList[i] );
      }
  }

  return gameList;
}

function addGame( user )
{
  // state 0: not started
  //      1: in progress
  //      2: complete
  var newGame = { user0: user, 
                  user1: null, 
                  board: new GameBoard(), 
                  gameState: 0, 
                  gameId: gGameList.length, 
                  turn: 0 };
  gGameList.push( newGame );
}

function joinGame( gameIndex, userOne )
{
  if( gGameList.length <= gameIndex )
    return false;

  var game = gGameList[gameIndex]; 

  if( game.user1 == null ) {
    game.user1 = userOne;
    game.gameState = 1;
    return true;
  }

  if( (game.user0 == userOne ||
       game.user1 == userOne ) &&
       game.gameState == 1 ) {
    return true;
  }

  return false;
}

function getGameOtherUser( gameIndex, origUser ) {
  var game = getGame( gameIndex );
  return getGameOtherUser2( game, origUser );
}

function getGameOtherUser2( game, origUser )
{
  if( game == null )
    return null;
  
  if( game.user0 === origUser )
    return game.user1;

  return game.user0; 
}

function getGame( gameIndex )
{
  if( gGameList.length <= gameIndex )
    return null;

  return gGameList[gameIndex];
}

//-------------------------------------------------------------------------------

var gGameBoard = new GameBoard();
var socketToUser = {};
var socketToGame = {};

const express = require('express');
const socketIO = require('socket.io');
const path = require('path');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');

const app = express()
  .use((req, res) => res.sendFile(INDEX) )
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));

const io = socketIO(app);

io.on('connection', (socket) => {
  console.log('Client connected');
  socket.on('disconnect', () => console.log('Client disconnected'));
});


io.on('connection', function(socket){
  console.log('user connected: ' + socket.id );

  socketToUser[socket.id] = null;
  socketToGame[socket.id] = null;

  socket.on('resetBoard', function(msg){
    console.log('reset message: ');
    gGameBoard.reset();
    io.emit('serverUpdateBoard', gGameBoard);
  });

  socket.on('clickedSquare', function(msg) {
    console.log('clickedSquare ' + msg.row + ' ' + msg.col);

    var gameId = socketToGame[socket.id];
    var game = getGame( gameId );
    if( game != null )
    { 
      var user = socketToUser[socket.id];
      if( (user == game.user0 && game.turn == 0) ||
          (user == game.user1 && game.turn == 1) ) {

        var otherUser = getUser( getGameOtherUser2( game, user ) );
        var otherSocketId = getUserSocket( otherUser );

        game.board.click(msg.row, msg.col);
        game.turn = (game.turn + 1) % 2
        if( game.board.gameOver ) {

          // TODO: Push this logic into the game class
          game.gameState = 2;
          socketToGame[ socket.id ] = null;  

          // once the game is over, clear the socket to game mappings
          // to allow the user to play more games
          if( otherSocketId != 0 )
            socketToGame[ otherSocketId ] = null;

          // tell everyone to update their game list
          var gameList = getGameList();
          io.emit('updateGameList', gameList);
        }

        // Emit to just the two players playing the game.
        socket.emit('serverUpdateBoard', game );
        
        if( otherSocketId != 0 )
          io.to( otherSocketId ).emit('serverUpdateBoard', game );
      }
    }
  });

  socket.on('login', function(msg) {
    console.log( "login: " + msg.user + " " + msg.password );
    var usr = getUser( msg.user );
    if( usr == null ) {
      usr = addUser( msg.user, msg.password );
    }

    var loggedIn = false;
    if( authenticateUser( msg.user, msg.password ) ){
      loggedIn = true;
      socketToUser[ socket.id ] = msg.user;
      setUserSocket( usr, socket.id );
    }

    // send a response back to the client
    var msg = { success: loggedIn, username: msg.user };
    socket.emit('loginResponse', msg);
  });

  socket.on('requestGameList', function() {
    console.log('request games list');

    var gameList = getGameList();
    socket.emit( 'updateGameList', gameList );
  });

  socket.on('startNewGame', function() {
    console.log('start game');

    var sockUser = socketToUser[socket.id];
    if( sockUser != null && socketToGame[socket.id] == null) {
      addGame( sockUser );

      var gameList = getGameList();
      io.emit( 'updateGameList', gameList );
    }
  });

  socket.on('joinGame', function(msg) {
    console.log('join game');
    var gameId = msg;
    var sockUser = socketToUser[ socket.id ];
    
    if( sockUser == null ) // shouldn't happen 
      return;

    if( socketToGame[socket.id] == null ) {
      if( !joinGame( gameId, sockUser ) ) {

        // user's game list might be stale, send them a new one.
        var gameList = getGameList();
        socket.emit('updateGameList', gameList);
        return;
      }
      socketToGame[socket.id] = gameId;

      // grab the socket(s) of the other user
      // and add them to this game.
      var otherUserName = getGameOtherUser( gameId, sockUser );
      var otherUser = getUser( otherUserName );

      if( otherUser == null ) // shouldn't happen
        return;

      // This user enters play mode
      socket.emit('startGame', getGame(gameId) );

      // Notify other users. This will tell the other player he can now play
      // this game, and it will tell the other users this game is now unavailable
      // to them.
      var gameList = getGameList();
      io.emit('updateGameList', gameList );
    }
  });

  socket.on('disconnect', function(){
    console.log('user disconnected: ' + socket.id);
    var usr = getUser( socketToUser[socket.id] );
    if( usr != null )
      removeUserSocket( usr, socket.id );

    socketToUser[socket.id] = null;
    socketToGame[socket.id] = null;
  });
});

// app.set('port', (process.env.PORT || 3000));

// app.listen(app.get('port'), function() {
//   console.log('Node app is running on port', app.get('port'));
// });

// http.listen( process.env.PORT || 3000, function(){
//   console.log('listening on *: some port tbd');
// });




