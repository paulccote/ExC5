var ExAPI = new (function() {
  var events = {};
  var pushEvents = {};
  
  this.client = {};
  this.channel = {};
  this.isDirty = false;
  this.hasFocus = true; // TODO: Assuming this.
  
  this.on = function(e, cb) {
    if(!events.hasOwnProperty(e)) events[e] = [];
    events[e].push(cb);
  };
  
  this.onPush = function(e, cb) { // TODO:2014-08-23:alex:This is not really DRY.
    if(!pushEvents.hasOwnProperty(e)) pushEvents[e] = [];
    pushEvents[e].push(cb);
  };
  
  this._emit = function(e, arg) {
    if(!events.hasOwnProperty(e)) events[e] = [];
    for(var i = 0; i < events[e].length; ++i) events[e][i](arg);
  };
  
  this._emitPush = function(e, a, b, c) {
    if(!pushEvents.hasOwnProperty(e)) pushEvents[e] = [];
    for(var i = 0; i < pushEvents[e].length; ++i) pushEvents[e][i](a, b, c);
  };
  
  this.blink = function() {
    return 182;
  };
  
  this.send = function(obj) {
    var out = JSON.stringify(obj);
    console.log('out: ' + out);
    window.opener.postMessage(out, '*');
  };
  
  this.sendChannel = function(obj) {
    this.send({ cmd:'channel', data:obj });
  };
  
  // Methods to configure a channel as host
  
  this.options = function(o)   { this.sendChannel({ cmd:'options', options:o }); };
  this.grid    = function(k,g) { this.sendChannel({ cmd:'grid', gridKey:k, grid:g }); };
  
  // Stuff.
  
  this.push = function(obj) { this.sendChannel({ cmd:'push', data:obj }); };
  
  // Accessing DataStores
  
  function _readDataPath(data, key) {
    var path = key.split('.');
    var rootKey = path.shift();
    path = [ 'value' ].concat(path);
    
    var obj = data[rootKey] || { value:null };
    while(path.length > 1) obj = obj[path.shift()] || {};
    return obj[path.shift()];
  }
  
  this.data = function(k, v, clear) {
    if(v === undefined && !clear) return _readDataPath(ExAPI.channel.data, k);
    this.sendChannel({ cmd:'data', key:k, value:v });
  };
  
  this.udata = function(u, k, v, clear) {
    if(v === undefined && !clear) return _readDataPath(ExAPI.channel.participants[u].data, k);
    this.sendChannel({ cmd:'udata', username:u, key:k, value:v });
  };
  
  // API stuff
  
  // TODO:2014-08-24:alex:Invite API. "Do you want to play Chess?" - type of plugin in package.json? Invites without channels?
  
  this.dirty = function(b) {
    if(b === undefined) b = true;
    this.isDirty = b;
    this.send({ cmd:'dirty', dirty:this.isDirty });
  };
  
  this.notify = function(options) {
    this.send({ cmd:'notify', options:options });
  };
  
  this.init = function() {
    if(!window.opener) return console.log('In standalone mode.');
    this.send({ cmd:'flush' }); // TODO: wtf? retarded.
  };
  
  // Core-Listener
  
  function _writeDataPath(data, key, newRecord) { // TODO:2014-08-24:alex:Make this DRY with channel-storage.js for js/host
    var path = key.split('.');
    var rootKey = path.shift();
    
    // Find the member we should update.
    
    path = [ 'value' ].concat(path); // We want one item, at least.
    var root = data.hasOwnProperty(rootKey) ? data[rootKey] : data[rootKey] = { value:null };
    while(path.length > 1) root = (root.hasOwnProperty(path[0]) ? root[path.shift()] : root[path.shift()] = {});
    root[path.shift()] = newRecord.value;
    
    // Update the other members (i.e. timestamp and username) of newRecord to the data-entry, but don't override
    // the value we just updated/generated.
    
    data[rootKey] = Object.merge(newRecord, { value:data[rootKey].value });
  }
  
  window.addEventListener('message', function(e) {
    var obj = JSON.parse(e.data);
    console.log('in: ' + e.data);
    
    switch(obj.cmd) {
      case 'init': {
        for(var k in obj) if(obj.hasOwnProperty(k) && k != 'cmd') ExAPI[k] = obj[k];
        if(ExAPI.channel.options.configured) ExAPI._emit('ready');
      }; break;
      case 'data'    : _writeDataPath(ExAPI.channel.data, obj.key, obj.record); break;
      case 'udata'   : _writeDataPath(ExAPI.channel.participants[obj.owner].data, obj.key, obj.record); break;
      case 'join'    : ExAPI.channel.participants[obj.username] = obj; break;
      case 'options' : ExAPI._emit('ready'); break;
      case 'focus'   : ExAPI.hasFocus = obj.focus; break;
      case 'leave'   : delete ExAPI.channel.participants[obj.username]; break;
      case 'grid'    : ExAPI.channel[obj.gridKey] = obj.grid; break;
      case 'push'    : ExAPI._emitPush(obj.data.cmd, obj.data.data, obj.username, obj.data);
    }
    
    ExAPI._emit(obj.cmd, obj);
  });
})();