var prototype = (Logic.User = function(username) {
  this.wealth = 5000;
  this.bet = 100;
  
  this.username = username;
  this.hand = new Hand(username, this);
  
  var user = this;
  
  this.controls = document.createElement('div'); this.controls.className = 'controls';
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
}).prototype;

prototype._enableControls = function(enabled) {
  this.controls.style.display = enabled ? '' : 'none';
  this.hand.element.classList[enabled ? 'add' : 'remove']('active');
  
  var user = this;
  Object.forEach(this.buttons, function(button, action) {
    button.disabled = !(enabled && user.hand.can(action));
  });
};

prototype.ask = function(id, cb) {
  if(id == 'bet') return this._askBet(cb);
  else if(id == 'action') return this._askAction(cb);
};

prototype._askBet = function(cb) {
  cb(100);
};

prototype._askAction = function(cb) {
  this._actionCallback = cb;
  this._enableControls(true);
};

prototype.sendAction = function(action) {
  this._enableControls(false);
  this._actionCallback(action);
};

prototype.join = function(host) {
  host._onJoin(this);
};