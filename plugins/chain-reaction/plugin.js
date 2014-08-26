var satisfyPaul = [];
satisfyPaul["paul"] = "Paul";
satisfyPaul["alex"] = "Alex | The original";
satisfyPaul["lorenzo.rota"] = "Lorenzo";
satisfyPaul["irath96"] = "iRath96";

// TODO:2014-08-17:alex:.whitelist and .blacklist for pushs.
// TODO:2014-08-17:alex:Make predictions ("It's looking good for alex!") as motd!
// TODO:2014-08-17:alex:Rematch
// TODO:2014-08-17:alex:Spectators view game-state?
// TODO:2014-08-17:alex:Game over?
// TODO:2014-08-17:alex:Percentage of the bombs
// TODO:2014-08-17:alex:Write a Statistics-Engine.
// TODO:2014-08-17:alex:Make this OOP, logic.host and logic.user.

/*
var counts = {}, area = {}, sum = 0, partial = {}, average = {};
for(var i=0; i<=ExAPI.channel.data.count;++i) counts[i] = area[i] = 0;
for(var x=0; x<fields.length;++x) for(var y=0; y<fields[0].length;++y) { var f = fields[x][y]; counts[f[1]] += f[0]; area[f[1]] += 1; }
for(var i=1; i<=ExAPI.channel.data.count;++i) sum += counts[i];
for(var i=1; i<=ExAPI.channel.data.count;++i) partial[i] = counts[i] / sum;
for(var i=1; i<=ExAPI.channel.data.count;++i) average[i] = counts[i] / area[i];
 */

var statusDiv;
var pid = 0;
var turn = 1;
var started = false;
var active = false;
var oActive = false;

var fields = [];

var WIDTH = 10;
var HEIGHT = 10;

var game;
window.addEventListener('load', function() {
  statusDiv = document.getElementById("status");
  
  game = document.getElementById("game");
  for(var y = 0; y < HEIGHT; ++y) {
    fields[y] = [];
    
    for(var x = 0; x < WIDTH; ++x) {
      fields[y][x] = [0, 1];
      
      var field = document.createElement("div");
      field.id = "field_" + x + "_" + y;
      field.className = "field";
      field.innerHTML = "&nbsp;";
      field.onmouseup = doTurn;
      
      game.appendChild(field);
    }
  }
  
  ExAPI.init();
  
  var updateUsers = function() {
    var e = document.getElementById('users');
    e.innerHTML = "<b>Users:</b> ";
    
    var spans = [];
    for(var k in ExAPI.channel.participants) if(ExAPI.channel.participants.hasOwnProperty(k)) {
      var u = ExAPI.channel.participants[k].username;
      
      var col = "";
      
      for(var i = 1; i <= (ExAPI.channel.data.count || {}).value; ++i)
        if(ExAPI.channel.data["player"+i] && (ExAPI.channel.data["player"+i] || {}).value == u) col = colors[i];
      
      var span = "<span class=\"" + col + "\">";
      span += satisfyPaul[u] ? satisfyPaul[u] : u;
      span += "</span>";
      
      spans.push(span);
    } e.innerHTML += spans.join(", ");
  };
  
  ExAPI.on('configure', function(evt) {
    ExAPI.grid('channelGrid', {
      motd    : { important:false , write:EXROLE_HOST, read:EXROLE_ANYBODY },
      player1 : { important:true  , write:EXROLE_USER, read:EXROLE_ANYBODY },
      player2 : { important:true  , write:EXROLE_USER, read:EXROLE_ANYBODY },
      player3 : { important:true  , write:EXROLE_USER, read:EXROLE_ANYBODY },
      player4 : { important:true  , write:EXROLE_USER, read:EXROLE_ANYBODY },
      count   : { important:true  , write:EXROLE_HOST, read:EXROLE_ANYBODY },
      started : { important:true  , write:EXROLE_USER, read:EXROLE_ANYBODY }
    });
    
    var numPlayers = Number(prompt('How many players?'));
    ExAPI.data('motd', 'This is a chain-reaction channel for ' + numPlayers + ' players.');
    ExAPI.data('count', numPlayers);
    
    ExAPI.options({
      public   : true,
      maxUsers : numPlayers, // TODO:2014-08-17:alex:Support spectators!
      commands : {
        turn  : EXROLE_USER,
        ready : EXROLE_USER
      }
    });
  });
  
  ExAPI.on('ready', function(evt) {
    var userCount = Object.count(ExAPI.channel.participants);
    
    pid = userCount;
    ExAPI.data('player' + userCount, ExAPI.client.username);
    alert(ExAPI.channel.data.count.value);
    if(userCount == (ExAPI.channel.data.count || {}).value) ExAPI.data('started', true);
    
    updateUsers();
  });
  
  ExAPI.on("leave", function(evt) {
    // check if evt.handle is one of the players
    updateUsers();
  });
  
  ExAPI.on("data", function(evt) {
    switch(evt.key) {
      case "started": started = evt.record.value; statusDiv.innerHTML = turnString(); break;
      default: if(!started) statusDiv.innerHTML = "Waiting for player " + (Object.count(ExAPI.channel.participants) + 1);
    } updateUsers();
  });
  
  ExAPI.on("push", function(evt) {
    var data = evt.data.data;
    var type = evt.data.cmd;
    
    if(type == "turn") {
      var x = data.shift();
      var y = data.shift();
      var o = data.shift();
      
      if(o == pid) return; // We sent this packet!
      if(x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return; // WTF?!
      
      ++fields[y][x][0];
      fields[y][x][1] = o;
      
      updateField(x, y, o);
      
      turn = o == (ExAPI.channel.data.count || {}).value ? 1 : turn + 1;
      statusDiv.innerHTML = turnString();
    } else if(type == "ready") {
      oActive = false;
    }
  });
});

function turnString() {
  if(pid) { // We are a player
    if(turn == pid) return "It's your turn!";
  //else return "It's player " + turn + "'s turn!";
  }
  
  // We are a spectator
  var name = ExAPI.channel.data['player' + turn];
  return "It's " + name + "'s turn!";
}

function doTurn(e) {
  if(!started) return alert("Sorry, the game has not started yet");
  if(active) return alert("A chain reaction is currently occuring, try again l ... x_X");
  if(oActive) return alert("The opponent has not yet finished with the chain reaction (slower computer >.<)");
  if(turn != pid) return alert("Sorry, it's not your turn!");
  
  var p = e.target.id.split('_');
  p.shift();
  
  console.log(p);
  if(p.length == 0) return; // wtf?
  
  var x = parseInt(p[0]);
  var y = parseInt(p[1]);
  
  //
  
  if(fields[y][x][0] && fields[y][x][1] != turn) return;
  ExAPI.push({ cmd:'turn', pass:false, data:[x,y,pid] });
  
  ++fields[y][x][0];
  fields[y][x][1] = turn;
  
  updateField(x, y, turn);
  turn = turn == (ExAPI.channel.data.count || {}).value ? 1 : turn + 1;
  statusDiv.innerHTML = turnString();
}

var colors = [, "blue", "red", "green", "orange" ];
function updateField(x, y, player) {
  var data = fields[y][x];
  
  //
  
  var l = x == 0;
  var r = x == WIDTH - 1;
  
  var u = y == 0;
  var b = y == HEIGHT - 1;
  
  var count = 4;
  if(l || r) --count;
  if(u || b) --count;
  
  //
  
  var field = document.getElementById('field_' + x + '_' + y);
  if(data[0]) field.innerHTML = "<font color=\"" + colors[player] + "\">" + data[0] + "</font>";
  else field.innerHTML = "&nbsp;";
  
  if(data[0] >= count) {
    var w = window.innerWidth;
    var h = window.innerHeight - 40;
    
    var sx = w * (x / 10 + 0.05);
    var sy = h * (y / 10 + 0.05);
    
    sx -= 8;
    sy -= 8;
    
    if(!l) doChain(x - 1, y,  sx, sy, sx - w / 10, sy,  player);
    if(!r) doChain(x + 1, y,  sx, sy, sx + w / 10, sy,  player);
    if(!u) doChain(x, y - 1,  sx, sy, sx, sy - h / 10,  player);
    if(!b) doChain(x, y + 1,  sx, sy, sx, sy + h / 10,  player);
    
    fields[y][x] = [data[0] - count, 1];
    
    updateField(x, y, player);
  }
}

function doChain(x, y,  sx, sy, ex, ey,  player) {
  active = true;
//oActive = true;
//console.log("fields[" + y + "][" + x + "]");
  
  ++fields[y][x][0];
  fields[y][x][1] = player;
  
//console.log(" okay");
  
  var b = document.createElement("div");
  
  b.className = colors[player] + " bomb";
  b.style.left = sx + "px";
  b.style.top = sy + "px";
  
  game.appendChild(b);
  
  new Tween(sx, sy, ex, ey, b).onfinish = function() {
    active = false;
    updateField(x, y, player);
    game.removeChild(b);
    
  //if(!active) ExAPI.push({ cmd:'ready' });
  };
}

//

function Tween(sx, sy, ex, ey, div) {
  this.frame = 0;
  this.frames = 30;
  
  this.onfinish = function() {};
  
  var self = this;
  this.update = function() {
    ++self.frame;
    
    var p = self.frame / self.frames;
    var ip = 1 - p;
    
    div.style.left = sx * ip + ex * p + "px";
    div.style.top = sy * ip + ey * p + "px";
    
    if(self.frame >= self.frames) {
      clearInterval(self.int);
      self.onfinish();
    }
  }
  
  this.int = setInterval(this.update, 1000 / 30);
}