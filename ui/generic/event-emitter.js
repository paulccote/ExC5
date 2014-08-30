var EventEmitter = new function() {
  this.unhook = {};

  this.on = function(cat, callback) {
    var events = this._events || (this._events = {});
    var category = events[cat] || (events[cat] = []);
    category.push(callback);
  };

  this.emit = function(cat) {
    var args = Array.prototype.splice.call(arguments, 1);
    var events = this._events || (this._events = {});
    var category = events[cat] || (events[cat] = []);
    var context = this;

    this._events[cat] = category.filter(function(cb) {
      return cb.apply(context, args) != EventEmitter.unhook;
    });
  };
}();