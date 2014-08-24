var prototype = (Logic.Dealer = function() {
  this.hand = new Hand('dealer', true);
}).prototype;

prototype.ask = function(id, cb) {
  if(id != 'action') throw new Exception('Logic.Dealer only responds to ask("action"), not to ask("' + id + '")');
  
  var dealer = this;
  setTimeout(function() {
    if(dealer.hand.total <= 16) return cb(ACTION_HIT); // Draw to 16.
    return cb(ACTION_STAND); // Above that, stand. Also: Dealer stands on soft 17.
  }, 500);
};