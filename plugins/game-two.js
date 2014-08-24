var game = new function() {
  var self = this;
  
  this.turn = 1;
  this.playerId = 0;
  this.started = false;
  
  this.players = [, "", ""];
  
  this.myTurn = function() {
    return self.turn == self.playerId;
  };
  
  this.init = function() {
    ExAPI.on("ready", function(evt) {
      self.setup();
    });
    
    ExAPI.on("data", function(evt) {
      self.key(evt);
    });
    
    ExAPI.on("leave", function(evt) {
      // Wow, this is not implemented :o
    });
  };
  
  this.setup = function() {
    var userCount = Object.count(ExAPI.channel.participants)
    if(userCount == 1) {
      self.playerId = 1;
      ExAPI.data("player1", ExAPI.client.username);
    } else if(userCount == 2) {
      self.players[1] = ExAPI.channel.data["player1"];
      
      self.playerId = 2;
      
      ExAPI.data("player2", ExAPI.client.username);
      ExAPI.data("started", true);
    }
  };
  
  this.key = function(evt) {
    console.log(evt.key + ' has changed');
    console.log(evt.value);
    switch(evt.key) {
      case "player1": self.players[1] = evt.value; self.onstatus(); break;
      case "player2": self.players[2] = evt.value; self.onstatus(); break;
      case "started": self.started = evt.value; self.onstatus(); break;
    }
  };
  
  this.canTurn = function(handle) {
    if(self.turn == 1 && self.players[1] == handle) return true;
    if(self.turn == 2 && self.players[2] == handle) return true;
    
    return false;
  };
  
  this.turnDone = function() {
    self.turn = self.turn == 1 ? 2 : 1;
    self.onstatus();
  };
  
  this.onstatus = function() {};
}();