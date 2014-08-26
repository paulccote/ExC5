var UI = new function() {
  var cache = {};
  this.load = function(id, callback) {
    if(cache.hasOwnProperty(id))
      if(cache[id].ready) return callback(cache[id].content);
      else return cache[id].callbacks.push(callback);
    
    var entry = cache[id] = {
      ready     : false,
      callbacks : callback === undefined ? [] : [ callback ]
    };
    
    var filename = 'app://root/ui/' + id + '.html';
    entry.request = $.get(filename, function(d) {
      entry.ready = true;
      entry.content = d;
      entry.callbacks.forEach(function(callback) { callback(d); });
    }).error(function(req, error) {
      throw "UI.load could not load " + filename + " because " + error;
    });
  };
}();