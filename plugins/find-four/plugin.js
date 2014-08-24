var satisfyPaul = [];
satisfyPaul["paul"] = "Paul";
satisfyPaul["alex"] = "Alex | The original";
satisfyPaul["lorenzo.rota"] = "Lorenzo";
satisfyPaul["irath96"] = "iRath96";

var statusDiv;
var pid = 0;
var turn = 1;
var started = false;

var reset = false;
var oReset = false;

var fields = [];

var WIDTH = 12;
var HEIGHT = 8;

function init() {
  statusDiv = document.getElementById("status");
  document.getElementById("rebox").onchange = rebox;
  
  buildGrid();
  
  game.onstatus = function() {
    statusDiv.innerHTML = game.started ? turnString() : "Not started yet";
  };
  
  ExAPI.init();
  game.init();
  
  var updateUsers = function() {
    var e = document.getElementById('users');
    e.innerHTML = "<b>Users:</b> ";
    
    var spans = [];
    for(var k in ExAPI.channel.participants) if(ExAPI.channel.participants.hasOwnProperty(k)) {
      var u = ExAPI.channel.participants[k].username;
      
      var col = "";
      
      if(game.players[1] == u) col = colors[1];
      else if(game.players[2] == u) col = colors[2];
      
      var span = "<span class=\"" + col + "\">"; // exc.users[u].toLowerCase()
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
      started : { important:true  , write:EXROLE_USER, read:EXROLE_ANYBODY }
    });

    ExAPI.data('motd', 'This is a find-four channel.');
    
    ExAPI.options({
      public   : true,
      maxUsers : 150,
      commands : {
        turn  : EXROLE_USER,
        reset : EXROLE_USER
      }
    });
  });
  
  ExAPI.on("init"   , updateUsers);
  ExAPI.on("join"   , updateUsers);
  ExAPI.on("leave"  , updateUsers);
  ExAPI.on("data"   , updateUsers);
  
  ExAPI.on("push", function(evt) {
    var type = evt.data.cmd;
    if(type == "turn") { // What about "chat" //
      if(!game.canTurn(evt.username)) {
        alert("It seems like somebody is cheating ;)");
        return;
      }
      
      var row = evt.data.row;
      console.log("Turn for " + row);
      
      var found = false;
      for(var y = HEIGHT - 1; y >= 0; --y) if(!fields[row][y]) {
        console.log("Found " + y);
        fields[row][y] = game.turn;
        throwChip(row, y, colors[game.turn]);
        
        if(checkGameEnd(row, y, game.turn)) {
          game.started = false;
          alert("Game over, " + colors[game.turn] + " has won!");
        } else found = true;
        
        break;
      }
      
      console.log("found=" + found);
      
      if(!found) return;
      game.turnDone();
    } else if(type == "reset") {
      if(evt.username != ExAPI.client.username) oReset = data.shift();
      if(reset && oReset) {
        reset = oReset = false;
        document.getElementById("rebox").checked = false;
        buildGrid();
        game.started = true;
      }
    }
  });
}

function buildGrid() {
  var container = document.getElementById("grid");
  container.innerHTML = '<div id="foreground"></div>';
  
  for(var x = 0; x < WIDTH; ++x) {
    fields[x] = [];
    for(var y = 0; y < HEIGHT; ++y) fields[x][y] = 0;
    
    var slot = document.createElement("div");
    
    slot.className = "slot";
    slot.id = "slot_" + x;
    slot.onmouseup = doTurn;
    
    slot.style.left = 24 + x * 40 + "px";
    slot.style.top = "0px"; // CSS could do this, too...
    
    container.appendChild(slot);
  }
}

function checkGameEnd(x, y) {
  var pAt = function(x, y) {
    if(x < 0 || x >= WIDTH) return 0;
    if(y < 0 || y >= HEIGHT) return 0;
    return fields[x][y];
  };
  
  var m = pAt(x, y);
  if(!m) return;
  
  // Check --m--
  
  var cx = x, cy = y;
  
  var right = 1;
  while(pAt(++cx, cy) == m) ++right; cx = x;
  while(pAt(--cx, cy) == m) ++right;
  
  if(right >= 4) return right;
  
  // Check |
  // Check m
  //       |
  
  var cx = x, cy = y;
  
  var right = 1;
  while(pAt(cx, ++cy) == m) ++right; cy = y;
  while(pAt(cx, --cy) == m) ++right;
  
  if(right >= 4) return right;
  
  //        /
  // Check m
  //      /
  
  var cx = x, cy = y;
  
  var right = 1;
  while(pAt(++cx, ++cy) == m) ++right; cx = x; cy = y;
  while(pAt(--cx, --cy) == m) ++right;
  
  if(right >= 4) return right;
  
  //      \
  // Check m
  //        \
  
  var cx = x, cy = y;
  
  var right = 1;
  while(pAt(--cx, ++cy) == m) ++right; cx = x; cy = y;
  while(pAt(++cx, --cy) == m) ++right;
  
  if(right >= 4) return right;
  
  return false;
}

function turnString() {
  if(game.playerId) { // We are a player
    if(game.myTurn()) return "It's your turn!";
    else return "It's your opponents turn!";
  } else { // We are a spectator
    return "It's player " + turn + "'s turn!";
  }
}

function doTurn(e) {
  if(!game.started) return alert("Sorry, the game has not started yet");
  if(!game.myTurn()) return alert("Sorry, it's not your turn!");
  
  var p = e.target.id.split('_');
  p.shift();
  
  var row = parseInt(p[0]);
  ExAPI.push({ cmd:'turn', row:row });
}

function throwChip(x, y, color) {
  x = x * 40 + 24;
  y = y * 40 + 24;
  
  var chip = document.createElement("div");
  chip.className = color + " chip";
  chip.style.left = x + "px";
  chip.style.top = -32 + "px";
  document.getElementById("grid").appendChild(chip);
  
  new Tween(x, -32, x, y, chip);
}

var colors = [, "yellow", "red"];

//

function rebox(e) {
  reset = e.target.checked;
  ExAPI.push({ cmd:'reset', reset:reset });
}

function Tween(sx, sy, ex, ey, div) {
  this.frame = 0;
  this.frames = 20;
  
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
  
  this.int = setInterval(this.update, 1000 / 60);
}