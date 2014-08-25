var prototype = (Logic.User = function(username) {
  this.__defineGetter__('wealth', function() { return ExAPI.udata(username, 'state.wealth'); });
  this.__defineGetter__('bet'   , function() { return ExAPI.udata(username, 'state.bet'   ); });
  
  this.lastBet = 100;
  
  this.username = username;
//this.hand = new Hand(username);
  
  var user = this;
  
  //
  // Bet-Chooser
  //
  
  this.betChooser = document.createElement('div'); this.betChooser.className = 'bet controls';
  
  var input = document.createElement('input');
  input.placeholder = "Your bet";
  input.value = this.lastBet;
  input.onkeydown = function(e) {
    if(e.keyCode != 13) return;
    var bet = Number(this.value);
    if(Number.isNaN(bet)) bet = 0;
    user.sendBet(user.lastBet = bet);
  };
  
  this.betChooser.appendChild(input);
  document.body.appendChild(this.betChooser);
  
  ExAPI.onData('state', function(value) {
    // Not taking bets anymore, so hide our betChooser
    // (if it isn't already hidden because of sendBet)
    if(value.id != HSTATE_TAKING_BETS) user.betChooser.style.display = 'none';
  });
  
  //
  // Action controls
  //
  
  this.controls = document.createElement('div'); this.controls.className = 'action controls';
  
  this.buttons = new Object();
  
  function __(value, action) {
    var b = document.createElement('input');
    b.type = 'button';
    b.value = value;
    b.disabled = true;
    b.onclick = function() { user.sendAction(action); };
    
    user.buttons[action] = b;
    user.controls.appendChild(b);
    
    return b;
  }
  
  __('Hit'         , ACTION_HIT       );
  __('Stand'       , ACTION_STAND     );
  __('Double Down' , ACTION_DOUBLE    );
  __('Split'       , ACTION_SPLIT     );
  __('Surrender'   , ACTION_SURRENDER );
  
  document.body.appendChild(this.controls);
  
  this._enableControls(false);
  this._actionCallback = false;
  this._betCallback = false;
}).prototype;

prototype._enableControls = function(enabled) {
  this.controls.style.display = enabled ? '' : 'none';
  if(this.hand) this.hand.element.classList[enabled ? 'add' : 'remove']('active');
  if(!enabled) return; // No need to check if the buttons could be enabled.
  
  var user = this;
  Object.forEach(this.buttons, function(button, action) {
    button.disabled = !user.hand.can(action);
  });
};

prototype.ask = function(id, cb) {
  if(id == 'bet') return this._askBet(cb);
  else if(id == 'action') return this._askAction(cb);
};

prototype._askBet = function(cb) {
  this._betCallback = cb;
  this.betChooser.style.display = '';
};

prototype._askAction = function(cb) {
  this._actionCallback = cb;
  this._enableControls(true);
};

prototype.sendAction = function(action) {
  this._enableControls(false);
  this._actionCallback(action);
};

prototype.sendBet = function(bet) {
  this._betCallback(bet);
  this.betChooser.style.display = 'none';
};

prototype.join = function(host) {
  host._onJoin(this);
};