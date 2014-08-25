var prototype = (Logic.Host = function() {
  this.deck = new Deck(6);
  
  this.userHash = new Object(); // For id lookups.
  
  this.users = new Array();
  this.dealer = new Logic.Dealer(this);
  this.state = { id: HSTATE_PAUSED };
  
  ExAPI.data('state', this.state); // TODO:2014-08-25:alex:Shouldn't we clone data inside ExAPI.data and ExAPI.udata? Data mismatch.
  
  this.isStarted = false;
}).prototype;

prototype._onJoin = function(user) {
  this.userHash[user.id] = user;
  this.users.push(user);
  
  if(this.state.id == HSTATE_IDLE) this._askBets(); // Stop idling, we got a user!
};

prototype.start = function() {
  this._askBets();
};

prototype._askBets = function() {
  if(this.users.length == 0) { // No users yet? No need to do any logic.
    this.state = { id: HSTATE_IDLE };
    ExAPI.data('state', this.state);
    return;
  }
  
  this.state = {
    id: HSTATE_TAKING_BETS,
    users: [].concat(this.users), // We want to clone this so we can use .remove()
    players: [].concat(this.users) // Only the current users.
  };
  
  ExAPI.data('state', { id:this.state.id });
  
  var host = this;
  var tout = setTimeout(function() {
    host._dealCards();
  }, 4000);
  
  this.users.forEach(function(user) {
    user.ask('bet', function(bet) { // TODO: On pass, remove player from host.state.players
      if(host.state.id != HSTATE_TAKING_BETS)
        return; // TODO:2014-08-23:alex:Let the user know we're not taking bets anymore.
      
      user.bet = bet; // TODO:2014-08-23:alex:Verify the bet?
      user.wealth -= bet;
      host.state.users.remove(user);
      
      if(host.state.users.length == 0) { // Everybody has given his bet.
        clearTimeout(tout); // Cancel the bet timeout.
        host._dealCards();
      }
    });
  });
};

prototype._dealCards = function() {
  var hands = this.state.players.map(function(user) { return user.hand; }).concat([ this.dealer.hand ]);
  hands = hands.concat(hands); // Deal everybody two cards.
  
  this.state = {
    id : HSTATE_DEALING,
    hands : hands,
    players : this.state.players
  };
  
  ExAPI.data('state', { id:this.state.id });
  
  var host = this;
  var interval = setInterval(function() {
    hand = host.state.hands.shift();
    if(hand !== undefined) {
      var card = host.deck.shift();
      var isBurnCard = hand == host.dealer.hand && host.dealer.hand.cards.length == 1;
      
      if(isBurnCard) card.isFlipped = true;
      hand.addCard(card);
    } else {
      clearInterval(interval);
      host._askActions();
    }
  }, 200);
};

prototype._askActions = function() {
  var turns = this.state.players.concat([ this.dealer ]);
  
  this.state.id = HSTATE_WAITING;
  this.state.turns = turns;
  delete this.state.hands;
  
  ExAPI.data('state', { id:this.state.id });
  this._askNextAction();
};

prototype._askNextAction = function() {
  var player = this.state.turns[0];
  if(player === undefined) return this._solve(); // All turns are over.
  
  if(player.hand.isBlackjack || player.hand.isOver) {
    this.state.turns.remove(player);
    return this._askNextAction();
  }
  
  if(player == this.dealer) { // Dealers turn, flip the burn-card.
    var b = this.dealer.hand.cards[1];
    if(b.isFlipped) {
      b.isFlipped = false;
      b.flip(true);
      
      ExAPI.push({ cmd:'flip', data: { id:b.id, type:b.type, offset:b.offset } });
    }
  }
  
  ExAPI.data('state.player', player.id);
  
  var host = this;
  player.ask('action', function(action) {
    if(!player.hand.can(action)) action = ACTION_TIMEOUT; // Invalid action, treat it as timeout.
    switch(action) {
      case ACTION_TIMEOUT : // stand when a user idles.
      case ACTION_STAND   : host.state.turns.remove(player); break;
      case ACTION_HIT     : player.hand.addCard(host.deck.shift()); break;
      case ACTION_DOUBLE  :
        player.wealth -= player.bet;
        player.bet *= 2;
        
        player.hand.addCard(host.deck.shift());
        host.state.turns.remove(player);
        break;
      case ACTION_SURRENDER:
        player.wealth += player.bet / 2;
        host.state.turns.remove(player);
        break;
      case ACTION_SPLIT: // This one is funky.
        var playerProxy = new PlayerProxy(player);
        playerProxy.hand = player.hand.cards.slice(1);
        player.hand.cards = player.hand.cards(0, 1);
        
        // TODO:2014-08-13:alex:Do something useful.
        
        // Insert playerProxy at index 1
        this.state.turns = this.state.turns.slice(0, 1).concat([ playerProxy ], this.state.turns.slice(1));
    }
    
    host._askNextAction();
  });
};

prototype._solve = function() {
  var host = this;
  setTimeout(function() {
    host.state.players.forEach(function(player) {
      if(player.hand.isOver) return; // Over!
      if(player.hand.isBlackjack && !host.dealer.hand.isBlackjack) return player.wealth += player.bet * 2.5; // Blackjack pays 3:2
      if(player.hand.total == host.dealer.hand.total) player.wealth += player.bet;
      else if(host.dealer.hand.isOver || player.hand.total > host.dealer.hand.total) player.wealth += player.bet * 2;
      else; // Lose.
    });
    
    setTimeout(function() { host._clear(); }, 2500);
  }, 0);
};

prototype._clear = function() {
  ExAPI.push({ cmd:'clear' });
  
  var host = this;
  this.state.players.concat([ this.dealer ]).forEach(function(player) { player.hand.clear(); });
  
  this._askBets();
};

prototype.getSummary = function() { // Summarize all hands in a hash.
  return this.state.players.map(function(user) { return user.hand; }).concat([ this.dealer.hand ]).reduce(function(h, hand) {
    h[hand.id] = hand.serialize();
    return h;
  }, {});
};

//

var prototype = (Logic.Host.NetworkUser = function(id, host) {
  ExAPI.push({ cmd:'joined', data:id });
  
  this.id = 'user:' + id;
  this.host = host;
  this.hand = new Hand(this.id, host);
  this.username = id;
  
  var user = this;
  var keys = [ 'wealth', 'bet' ];
  keys.forEach(function(key) {
    user.__defineGetter__(key, function()  { return ExAPI.udata(user.username, 'state.' + key   ); });
    user.__defineSetter__(key, function(v) {        ExAPI.udata(user.username, 'state.' + key, v); });
  });
  
  this.callbacks = {}; // TODO:2014-08-23:alex:Timeouts. Implement them here.
}).prototype;

prototype.ask = function(id, cb) {
  ExAPI.push({ cmd:'ask', data:id, to:[ this.username ] });
  this.callbacks[id] = cb;
};

prototype.answer = function(id, value) {
  if(!this.callbacks.hasOwnProperty(id)) return;
  var cb = this.callbacks[id];
  delete this.callbacks[id];
  
  cb(value);
};