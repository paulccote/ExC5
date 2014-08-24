function Deck(sledCount) {
  if(sledCount === undefined) sledCount = 1;

  this.returns = new Array();
  this.cards = new Array();
  for(var sled = 0; sled < sledCount; ++sled)
    for(var type = 0; type < 4; ++type)
      for(var offset = 0; offset < 13; ++offset)
        this.cards.push(new Card(undefined, type, offset));
  this.cards.shuffle();
}

Deck.prototype._reshuffle = function() {
  this.cards = this.returns;
  this.returns = new Array();
  this.cards.shuffle();

  if(this.cards.length == 0) throw '_reshuffle has no cards to reshuffle. Sorry.';
};

Deck.prototype.shift = function() {
  if(this.cards.length == 0) this._reshuffle();
  return this.cards.shift();
};

Deck.prototype.return = function(card) {
  this.returns.push(card);
};