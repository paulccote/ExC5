function Hand(id, host) {
  this.id = id;
  this.host = host;
  this.online = host !== undefined;

  this.element = document.createElement('div');
  this.element.className = id == 'Dealer' ? 'hand' : 'user hand';

  var u = this.userElement = document.createElement('span'); u.className = 'username';
  this.element.appendChild(u);
  this._updateUsername();

  var t = this.totalElement = document.createElement('span'); t.className = 'total';
  this.element.appendChild(t);

  var c = this.cardsElement = document.createElement('div'); c.className = 'cards';
  this.element.appendChild(c);
  
  this.cards = new Array();

  this.totals      = [];
  this.validTotals = [];

  this.canSplit    = false;
  this.isBlackjack = false;
  this.isUnknown   = false;
  this.isOver      = false;

  if(!this.online) document.body.appendChild(this.element);
}

Hand.prototype._updateUsername = function() {
  var e = this.userElement;
  e.textContent = this.id;
};

Hand.prototype.clear = function() {
  if(this.online) {
    var hand = this;
    this.cards.forEach(function(card) { hand.host.deck.return(card); });
  }
  
  this.totalElement.textContent = '0';
  
  var hand = this;
  this.cards = new Array();
  Array.toArray(this.cardsElement.childNodes).forEach(function(child) {
    hand.cardsElement.removeChild(child);
  });
};

Hand.prototype.addCard = function(card) {
  if(this.online) // Publish that we dealt this card.
    ExAPI.push({
      cmd  : 'deal',
      data : { id:this.id, card:card.serialize() }
    });
  
  card.flip();

  this.cards.push(card);
  this.cardsElement.appendChild(card.element);

  var hand = this;
  if(card.isFlipped)
    card.addEventListener('flipped', function() {
      hand._revalidate();
    });
  this._revalidate();
};

Hand.prototype._revalidate = function() {
  this._updateUsername();
  
  // I love functioncal programming. The code does this:
  // It traverses all possibilities for when we take one value out of each card.values-Array.
  // It sums those values and collects them in this.totals if it's a unique total.
  
  this.totals = this.cards.length == 0 ?
    [] : this.cards.map(function(card) { return card.values; }).reduce(function(allTotals, values) {
    return values.reduce(function(partialTotals, value) {
      var newTotals = allTotals.map(function(total) { return total + value; });
      return partialTotals.concat(newTotals).uniq();
    }, []);
  });
  
  this.validTotals = this.totals.filter(function(total) { return total <= 21; });

  // Set some flags.

  this.isBlackjack = this.validTotals.indexOf(21) !== -1;
  this.isUnknown = this.totals.length == 0; // One of the cards had an empty value-array (i.e. it's flipped)
  this.isOver = !this.isUnknown && this.validTotals.length == 0; // Known totals, but all above 21. Sorry.
  this.isSoft = this.validTotals.length > 1; // Hey, the user can choose. Awesome.
  this.total  =
    (this.isOver ? this.totals : this.validTotals).sort(
    this.isOver ?
    function(a, b) { return b - a; } :
    function(a, b) { return a - b; }
  ).last();

  var t = this.totalElement;
  t.textContent = this.isUnknown ? '?' : this.total;
  if(this.isOver) t.textContent += ' (bust)';
  if(this.isBlackjack) t.textContent += ' (blackjack)';

  // if(this.cards.length == 2) alert(this.total);
};

Hand.prototype.can = function(action) {
  if(action == ACTION_TIMEOUT) return true; // Yeah, strange action - Implemented for Logic.Host
  switch(action) {
    case ACTION_HIT       : return !this.isOver;
    case ACTION_SPLIT     : return this.cards.length == 2 && this.cards[0].values.equals(this.cards[1].values);
    case ACTION_DOUBLE    : return this.cards.length == 2;
    case ACTION_STAND     : return true;
    case ACTION_SURRENDER : return this.cards.length == 2;
    default: return false; // You want me to... what?
  }
};

Hand.prototype.serialize = function() {
  return this.cards.map(function(card) { return card.serialize(); });
};

Hand.deserialize = function(id, cards) {
  var hand = new Hand(id);
  hand.cards = cards.map(function(card) { return Card.deserialize(card); });
  hand._revalidate();
  return hand;
};