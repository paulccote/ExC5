Object.find = function(object, condition, context) {
  var keys = Object.keys(object);
  for(var i = 0; i < keys.length; ++i) if(condition.call(context, object[keys[i]], keys[i]))
    return object[keys[i]];
  return null;
};

Object.findAll = function(object, condition, context) {
  var keys = Object.keys(object), values = [];
  for(var i = 0; i < keys.length; ++i) if(condition.call(context, object[keys[i]], keys[i]))
    values.push(object[keys[i]]);
  return values;
};

Object.findAllKeys = function(object, condition, context) {
  var keys = Object.keys(object), values = [];
  for(var i = 0; i < keys.length; ++i) if(condition.call(context, object[keys[i]], keys[i]))
    values.push(keys[i]);
  return values;
};

Object.forEach = function(object, callback, context) {
  var keys = Object.keys(object);
  for(var i = 0; i < keys.length; ++i) callback.call(context, object[keys[i]], keys[i]);
};

Object.count = function(object, condition, context) {
  if(condition !== undefined) {
    var keys = Object.keys(object), count = 0;
    for(var i = 0; i < keys.length; ++i) if(condition.call(context, object[keys[i]], keys[i])) ++count;
    return count;
  } else return Object.keys(object).length;
};

Object.filter = function(object, condition, context) {
  var r = {}, keys = Object.keys(object);
  for(var i = 0; i < keys.length; ++i) if(condition.call(context, object[keys[i]], keys[i]))
    r[keys[i]] = object[keys[i]];
  return r;
};

Object.map = function(object, callback, context) {
  var r = {}, keys = Object.keys(object);
  for(var i = 0; i < keys.length; ++i) r[keys[i]] = callback.call(context, object[keys[i]], keys[i]);
  return r;
};

Object.merge = function() {
  var r = {};
  for(var i = 0; i < arguments.length; ++i)
    Object.reduce(arguments[i], function(obj, v, k) { obj[k] = v; return obj; }, r);
  return r;
};

Object.reduce = function(object, callback, initial) {
  Object.forEach(object, function(v, k) {
    initial = callback(initial, v, k);
  }, null);
  return initial;
};

Object.values = function(object) {
  var keys = Object.keys(object), values = [];
  for(var i = 0; i < keys.length; ++i) values.push(object[keys[i]]);
  return values;
};

Array.toArray = function(a) { // For DOMElement.childNodes, etc.
  return Array.prototype.slice.apply(a);
};

// based on http://stackoverflow.com/questions/7837456/comparing-two-arrays-in-javascript, Tomáš Zato
Array.prototype.equals = function (array) {
  if(!array) return false;  // if the other array is a falsy value, return
  if(this.length != array.length) return false; // compare lengths - can save a lot of time
  
  for(var i = 0, l=this.length; i < l; i++)
    if(this[i] instanceof Array && array[i] instanceof Array)
      if(!this[i].equals(array[i])) return false; else; // Nested array recursion.
    else if(this[i] != array[i]) return false; // Does not work for objects in arrays.
  return true;
}

Array.prototype.last = function() {
  return this.length == 0 ? undefined : this[this.length - 1];
};

Array.prototype.uniq = function() {
  var u = {}, a = [];
  for(var i = 0, l = this.length; i < l; ++i) {
    if(u.hasOwnProperty(this[i])) continue;
    a.push(this[i]);
    u[this[i]] = 1;
  } return a;
};

Array.prototype.remove = function() {
  var what, a = arguments, L = a.length, ax;
  while(L && this.length) {
    what = a[--L];
    while((ax = this.indexOf(what)) !== -1) this.splice(ax, 1);
  } return this;
};

Array.prototype.sample = function() {
  return this[Math.floor(Math.random() * this.length)]; // TODO: Correct?
};

//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [v1.0]
Array.prototype.shuffle = function() {
  for(var j, x, i = this.length; i; j = Math.floor(Math.random() * i), x = this[--i], this[i] = this[j], this[j] = x);
};

function genHash(str) {
  str = str.replace(/[aeiou]/g, '');
  str = str.match(/./g).reverse().join('?');
  return str;
}

function genToken(length) {
  if(length === undefined) length = 16;

  var result = '';
  for(var i = 0; i < length; ++i) result += String.fromCharCode(Math.floor(Math.random() * 256));
  return result;
}

const EXROLE_HOST      = 0x00ff;
const EXROLE_SELF      = 0x00fe;
const EXROLE_USER      = 0x0080;
const EXROLE_ANYBODY   = 0x0000;