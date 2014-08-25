var prototype = (Logic.Dealer = function(host) {
  this.id = 'bj:dealer';
  this.host = host;
  this.hand = new Hand(this.id, host);
}).prototype;

prototype.ask = function(id, cb) {
  if(id != 'action') throw new Exception('Logic.Dealer only responds to ask("action"), not to ask("' + id + '")');
  
  var dealer = this;
  setTimeout(function() {
    if(dealer.hand.total <= 16) return cb(ACTION_HIT); // Draw to 16.
    return cb(ACTION_STAND); // Above that, stand. Also: Dealer stands on soft 17.
  }, 500);
};