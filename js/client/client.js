'use strict';

function dbResultToArray(r) {
  var a = new Array(r.rows.length);
  for (var i = 0; i < r.rows.length; ++i) a[i] = r.rows.item(i);
  return a;
}

function ExClient(hostname) {
  this.hostname = hostname;
  this.username = '';
  this.password = '';
  this.loggedIn = ko.observable(false);
  
  this.profile       = null;
  this.participation = {};
  this.database      = null;
  this.preferences   = null; // TODO:2014-08-17:alex:Synchronize preferences with the server.
  
  var client = this;
  if(hostname) { // TODO: For debugging purposes.
    this.socket = io(hostname, {
      multiplex: false, // TODO: Reusing should be okay in some cases.
      reconnection: false
    });

    this.socket.on('session-error', function() { client.loggedIn(false); });
    this.socket.on('login', function(profile) {
      client.profile = profile;
      client.loggedIn(true);
      client._initDatabase();
    });
    
    this.socket.on('channel', function(uid, obj) {
      var channel = client.findChannel('uid', uid);
      if(channel) channel.handlePacket(obj);
      else; // TODO: Something else, maybe.
    });
    
    this.socket.on('p2p-contact', function(obj, callback) {
      alert("Should contact " + obj.ip + ':' + obj.port);
      
      var message = new Buffer("Might be a hole-punch.");
      client.udpServer.send(message, 0, message.length, obj.port, obj.ip, function(err, bytes) {
        alert("(hole punch sent)");
        callback({ success:true, port:client.udpPort });
      });
    });
    
    this.socket.on('disconnect', function() {
      // TODO:2014-08-17:alex:Do something useful?
      // - Heal the world.
    });
  }
  
  ExClient.prototype.logout = function() {
    this.socket.disconnect();
    // TODO: Close this.udpServer, remove this.udpServer!
    return; // TODO:2014-08-24:alex:This is for testing. Debugging, ya know?
    Object.forEach(this.participation, function(participation) {
      try { participation.channel.nativeWindow.close(); } catch(e) {}
    });
  };
  
  window.addEventListener('message', function(e) {
    Object.forEach(client.participation, function(participation) {
      var channel = participation.channel;
      if(channel.nothingEverWorks.window == e.source) channel.processMessage(e);
    });
    /*e.source.addEventListener('unload', function(e) {
      alert("Unload");
    });*/
  });
  
  //
  // P2P stuff
  //
  
  var dgram = require('dgram');
  var server = this.udpServer = dgram.createSocket('udp4');
  this.udpPort = 40000 + Math.floor(Math.random() * 10000);
  
  server.on('error', function(err) {
    console.log("server error:\n" + err.stack);
    server.close();
  });
  
  server.on('message', function(msg, rinfo) {
    alert("message.");
    alert("udp-server got: " + msg + " from " + rinfo.address + ":" + rinfo.port);
  });
  
  server.on('listening', function() {
    var address = server.address();
    console.log("server listening " + address.address + ":" + address.port);
  });
  
  server.bind(this.udpPort);
  
  //
  // TODO:2014-08-17:alex:Merge with other settings, new name 'notifyAudio', etc, etc.
  //
  
  this.notifySound = null;
}

ExClient.prototype.updateProfile = function(key, value) {
  this.profile[key] = value;
  this.socket.emit('profile', key, value);
};

ExClient.prototype.notify = function(title, options) {
  if(this.notifySound) this.notifySound.play();
  if(this.preferences.notifyVisual) new Notification(title, options);
};

ExClient.prototype._initDatabase = function() {
  this.database = openDatabase(
    'client:' + this.username, '1.0', 'ExC4 client database', 16 * 1024 * 1024
  );
  
  var client = this;
  this.database.transaction(function(tx) {
    function err(a,b,c) {
      console.log(a,b,c);
    }
    
    tx.executeSql('CREATE TABLE IF NOT EXISTS preferences (key TEXT UNIQUE, value TEXT)', [], undefined, err);
    tx.executeSql('CREATE TABLE IF NOT EXISTS storage (uid INT, key TEXT, value TEXT, ' +
                  'CONSTRAINT uidkey UNIQUE(uid, key));', [], undefined, err);
    
    tx.executeSql('SELECT * FROM preferences', [], function(tx, results) {
      client.preferences = {};
      
      results = dbResultToArray(results);
      results.forEach(function(result) {
        var value = JSON.parse(result.value);
        if(result.key == 'notifySound') client.notifySound = value ? new Audio(value) : null;
        client.preferences[result.key] = value;
      });
    }); // TODO: On error.
  });
};

ExClient.prototype.setPreference = function(key, value) {
  if(key == 'notifySound') this.notifySound = value ? new Audio(value) : null;
  this.preferences[key] = value;
  this.database.transaction(function(tx) {
    tx.executeSql('INSERT OR IGNORE INTO preferences VALUES (?, "")', [ key ]);
    tx.executeSql('UPDATE preferences SET value = ? WHERE key = ?', [ JSON.stringify(value), key ]);
  });
};

ExClient.prototype.requestP2P = function(username) {
  var client = this;
  this.socket.emit('p2p-req', { username:username, port:this.udpPort }, function(obj) {
    alert("The hole-punch was sent by the other client, to " + obj.ip + ':' + obj.port);
    var message = new Buffer("Some bytes");
    client.udpServer.send(message, 0, message.length, obj.port, obj.ip, function(err, bytes) {
      alert("P2P-Data sent");
    });
  });
};

ExClient.prototype.updateDirtyBadge = function() {
  var count = Object.count(this.participation, function(p) { return p.channel.isDirty; });
  var gui = require('nw.gui');
  var win = gui.Window.get();
  win.setBadgeLabel(count == 0 ? '' : count);
};

ExClient.prototype.findChannel = function(prop, value) {
  var part = Object.find(this.participation, function(participation) { return participation.channel[prop] == value; });
  return part ? part.channel : null;
};

ExClient.prototype.probe = function(name, cb) { this.socket.emit('probe', name, cb); };
ExClient.prototype.create = function(name, plugin, cb) {
  var client = this;
  this.socket.emit('create', name, plugin, function(resp) {
    if(resp.success) {
      resp.channel = client._createChannel(resp.summary);
      if(cb) cb(resp);
    } else if(cb) cb(resp);
  });
};

// joinName isn't safe, the channel could have been recreated and we think it's using the old plugin.
ExClient.prototype.joinUId = function(uid, cb) { // TODO: Not DRY with .create
  if(this.participation.hasOwnProperty(uid)) { // We are in this channel, bring the window to front.
    this.participation[uid].channel.nativeWindow.focus();
    return;
  }
  
  var client = this;
  this.socket.emit('join-uid', uid, function(resp) {
    if(resp.success) {
      resp.channel = client._createChannel(resp.summary);
      if(cb) cb(resp);
    } else if(cb) cb(resp);
  });
};

ExClient.prototype._createChannel = function(summary) {
  // TODO:2014-08-17:alex:Use plugin-information for prefered window-size, etc here.
  
  var gui = require('nw.gui');
  var win = gui.Window.open(summary.plugin + '/plugin.html?' + Math.random(), {
    position : 'center',
    width    : 800,
    height   : 600,
    nodejs   : false
  });
  
  var channel = new ExClient.Channel(this, summary, win);
  
  /*
  win.on('loaded', function() {
    alert("Loaded.");
    channel.window = win.window;
    channel.flushBuffer();
  });*/
  
  channel.nothingEverWorks = win; // TODO:2014-08-17:alex:This is a horrendous name for an attribute.
};

ExClient.prototype.authenticate = function(u, p) {
  this.username = u;
  this.password = genHash(p);
  
  var self = this;
  this.socket.on('prelogin', function(rndKey) {
    var salt = genToken();
    self.socket.emit('login', genHash(salt + self.password + rndKey), salt);
  });
  
  this.socket.emit('prelogin', this.username);
};

ExClient.prototype.register = function(u, p) {
  this.username = u;
  this.password = genHash(p);
  
  var self = this;
  this.socket.emit('register', this.username, this.password);
};

ExClient.prototype.getSummary = function() {
  return {
    username: this.username
  };
};