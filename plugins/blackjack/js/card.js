const TYPE_CLUBS    = 0;
const TYPE_HEARTS   = 1;
const TYPE_SPADES   = 2;
const TYPE_DIAMONDS = 3;

const TYPE_FLIPPED  = 4;

var cards = {};
function Card(id, type, offset) {
  this.isOnline = id === undefined;
  
  if(id === undefined) // No id supplied, create an id for this card.
    id = Math.random().toString(36).substring(2);
  
  if(!this.isOnline) cards[id] = this;
  
  this._events = {};
  
  this.id     = id;
  this.type   = type;
  this.offset = offset;
  this.isAce  = false;
  this.values = [];
  
  this.isFlipped = type == TYPE_FLIPPED;
  
  var e = this.element = document.createElement('div');
  e.className = 'card';
  
  var f = this.bgElement = document.createElement('div');
  f.className = 'card-bg';
  e.appendChild(f);
  
  if(type !== TYPE_FLIPPED) this.flip();
}

Card.prototype.equals = function(other) {
  return this.type == other.type && this.offset == other.offset;
};

Card.prototype.flip = function(animate) {
  this.isAce  = this.offset == 0;
  this.values = this.isAce ? [ 1, 11 ] : [ Math.min(this.offset + 1, 10) ];
  if(this.isFlipped) this.values = [];
  
  var bpos =
    Math.floor(-2 + -111.6 * this.offset) / 2 + 'px ' +
    Math.floor(-2 + -156.2 * this.type  ) / 2 + 'px';
  
  if(animate) {
    var card = this;
    this.element.style.webkitTransform = 'scale(0,1)';
    setTimeout(function() {
      card.element.style.webkitTransform = 'scale(1,1)';
      card.bgElement.style.backgroundPosition = bpos;
    }, 200);
  } else this.bgElement.style.backgroundPosition = bpos;
  
  if(this.isFlipped) this.bgElement.style.backgroundPosition = '';
  
  this._emit('flipped');
};

Card.prototype.addEventListener = function(key, cb) {
  if(!this._events.hasOwnProperty(key)) this._events[key] = new Array();
  this._events[key].push(cb);
};

Card.prototype._emit = function(key) {
  if(!this._events.hasOwnProperty(key)) return;
  this._events[key].forEach(function(cb) {
    cb();
  });
};

Card.prototype.serialize = function() {
  return this.isFlipped ? [ this.id, TYPE_FLIPPED, 0 ] : [ this.id, this.type, this.offset ];
};

Card.deserialize = function(serialized) {
  return new Card(serialized[0], serialized[1], serialized[2]);
};