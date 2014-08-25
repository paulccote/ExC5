var ExAPI = new (function() {
  this.client   = {};
  this.channel  = {};
  this.isDirty  = false;
  this.hasFocus = true; // The channel just got opened, should have focus.
  
  //
  // EventEmitter
  //
  
  this._events  = {};
  
  this._on = function(type, subType, callback, context) {
    var e = this._events[type] || (this._events[type] = {});
    e = e[subType] || (e[subType] = []);
    e.push([ callback, context ]);
  };
  
  this._emit = function(type, subType, args) {
    var e = this._events[type] || (this._events[type] = {});
    (e[subType] || (e[subType] = [])).forEach(function(cb) {
      cb[0].apply(cb[1], args);
    });
  };
  
  var api = this;
  [ 'on', 'onPush', 'onData', 'onUData' ].forEach(function(type) {
    api[type] = function(subType, callback, context) { return api._on(type, subType, callback, context); };
  })
  
  // Used to fire the listeners for onData, for example when a room was joined and the data was set in 'init',
  // but the callbacks need to update.
  this.emitData = function(key) {
    var rootKey = key.split('.')[0];
    var record = ExAPI.channel.data[rootKey] || { value:null };
    
    // If the key is a path, we need to traverse the other part keys using ExAPI.data(key)
    if(key != rootKey) record = Object.merge(record, { value:ExAPI.data(key) });
    
    this._emit('onData', key, [ record.value, record, { record:record, key:key, automated:true } ]);
  };
  
  //
  // Communication with the client
  //
  
  this.send = function(obj) {
    var out = JSON.stringify(obj);
    console.log('out: ' + out); // For debug.
    window.opener.postMessage(out, '*');
  };
  
  this.sendChannel = function(obj) {
    this.send({ cmd:'channel', data:obj });
  };
  
  //
  // Methods to configure a channel as host
  //
  
  this.options = function(o)   { this.sendChannel({ cmd:'options', options:o }); };
  this.grid    = function(k,g) { this.sendChannel({ cmd:'grid', gridKey:k, grid:g }); };
  
  //
  // API methods
  //
  
  this.blink = function() { return 182; }; // TODO:2014-08-25:alex:Why is this here?
  this.push  = function(obj) { this.sendChannel({ cmd:'push', data:obj }); };
  
  //
  // DataStore API methods
  //
  
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
  
  //
  // Client API methods
  //
  
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
  
  //
  // Listening for client messages
  //
  
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
    console.log('in: ' + e.data); // For debug.
    
    switch(obj.cmd) {
      case 'init':
        // Sent by the host, contains information like ExAPI.client.username, ExAPI.channel.participants, ExAPI.channel.data, etc.
        // We clone everything that's inside the 'obj'-hash to ExAPI (except for obj.cmd)
        
        for(var k in obj) if(obj.hasOwnProperty(k) && k != 'cmd') ExAPI[k] = obj[k];
        if(ExAPI.channel.options.configured) ExAPI._emit('on', 'ready', []); // Emit on('ready') if this channel is already configured
        break;
      case 'push':
        // A message was pushed to this channel.
        ExAPI._emit('onPush', obj.data.cmd, [ obj.data.data, obj.username, obj.data ]);
        break;
      case 'data':
        // A data-element in ExAPI.channel.data has changed.
        _writeDataPath(ExAPI.channel.data, obj.key, obj.record);
        ExAPI._emit('onData', obj.key, [ obj.record.value, obj.record, obj ]);
        break;
      case 'udata':
        // A data-element of one of our participants has changed.
        _writeDataPath(ExAPI.channel.participants[obj.owner].data, obj.key, obj.record);
        ExAPI._emit('onUData', obj.key, [ obj.record.value, obj.owner, obj.record, obj ]);
        break;
      case 'grid':
        // The layout for either channelGrid or userGrid has changed.
        ExAPI.channel[obj.gridKey] = obj.grid;
        break;
      case 'options':
        // This channel has been (re-)configured.
        // Emit on('ready') if this channel is configured the first time.
        
        var configuredBefore = ExAPI.channel.options.configured;
        ExAPI.channel.options = obj.options;
        if(!configuredBefore) ExAPI._emit('on', 'ready', []);
        break;
      case 'join'  : ExAPI.channel.participants[obj.username] = obj; break; // A user joined the channel.
      case 'leave' : delete ExAPI.channel.participants[obj.username]; break; // A user left the channel.
      case 'focus' : ExAPI.hasFocus = obj.focus; break; // The plugin window received or lost focus.
    }
    
    // Forward this to our 'on'-subscribers.
    ExAPI._emit('on', obj.cmd, [ obj ]);
  });
})();