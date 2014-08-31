var sessUId = 0;
var prototype = (ExHost.Session = function(host, socket) {
  this.uid           = ++sessUId;
  this.host          = host;
  this.socket        = socket;
  this.rndKey        = genToken();
  this.user          = null;
  this.loggedIn      = false;
  this.participation = {};
  
  this.address = { ip   : socket.request.connection.remoteAddress,
                   port : socket.request.connection.remotePort };
  this.debug('Connection from ' + this.address.ip + ':' + this.address.port);
  
  this.profile = {}; // TODO: Beta
  
  var session = this;
  socket.on('prelogin', function(username) {
    if(session.loggedIn) return; // TODO: Just remove listener!
    session.debug('Prelogin as ' + username);
    host.fetchUser(username, function(u) {
      if(!u) return socket.emit('session-error', 'username');
      session.user = u;
      socket.emit('prelogin', session.rndKey);
    });
  });
  
  socket.on('login', function(hash, salt) {
    if(!session.user) return; // Nope.
    if(session.loggedIn) return;
    
    var matcher = genHash(salt + session.user.password + session.rndKey);
    
    if(hash == matcher) session.host.loadProfile(session, function() {
      // We need the profile data so we can send it to the user
      session.handleLogin();
    }); else {
      session.debug('Failed to authenticate as ' + session.user.username);
      socket.emit('session-error', 'password');
    }
  });
  
  socket.on('register', function(username, password) {
    if(session.loggedIn) return;
    
    host.fetchUser(username, function(u) {
      if(u) return socket.emit('register-error', 'username');
      
      session.user = host.registerUser(username, password);
      session.handleLogin(); // No need to load profile data here, because it would be an empty hash anyway.
    });
  });
  
  socket.on('disconnect', function() {
    session.debug('Closing session');
    Object.forEach(session.participation, function(participation) { participation.leave() });
    delete host.sessions[session.uid];
  });
}).prototype;

prototype.handleLogin = function() {
  this.socket.emit('login', this.profile);
  this.debug('Logged in as ' + this.user.username);
  
  var session = this;
  this.socket.on('p2p-req', function(obj, callback) {
    session.debug('Inside p2p-req');
    
    var peer = session.host.findSessionByUsername(obj.username);
    if(peer) peer.socket.emit('p2p-contact', { ip:session.address.ip, port:obj.port }, function(obj) {
      session.debug('Callback for p2p-contact firing.');
      callback({ success:obj.success, ip:peer.address.ip, port:obj.port });
    }); else callback({ success:false, error:'The peer is offline.' });
  });
  
  this.socket.on('probe', function(name, callback) {
    var chan = session.host.findChannel('name', name);
    callback(
      chan ?
      { success:true, summary:chan.getSummary() } :
      { success:false, error:'Channel does not exist' }
    );
  });
  
  this.socket.on('create', function(name, plugin, callback) {
    var chan = session.host.findChannel('name', name);
    if(chan) callback({ success:false, error:'Channel exists already' });
    else {
      chan = new ExHost.Channel(session.host, name, plugin);
      chan.handleJoin(session, callback);
    }
  });
  
  this.socket.on('join-uid', function(uid, callback) {
    var chan = session.host.findChannel('uid', uid);
    if(chan) chan.handleJoin(session, callback);
    else callback({ success:false, error:'Channel does not exist' });
  });
  
  this.socket.on('list', function() {
    var list = [];
    Object.forEach(session.host.channels, function(chan) {
      if(!chan.options.public) return;
      
      var host = chan.getHost();
      if(host) host = host.session.user.username;
      else console.log("Ouch, did not find host for " + chan.uid);
      
      list.push({
        uid    : chan.uid,
        name   : chan.name,
        plugin : chan.plugin,
        host   : host,
        icon   : chan.data.tryRead(session, 'icon', {}).value,
        motd   : chan.data.tryRead(session, 'motd', {}).value,
        count  : [ chan.countUsers(), chan.options.maxUsers ]
      });
    });
    
    session.socket.emit('list', list);
  });
  
  this.socket.on('channel', function(uid, obj) {
    var chan = session.host.findChannel('uid', uid);
    if(chan) chan.handlePacket(session, obj, function(error) {
      session.debug('Cannot send a command to ' + uid + ', not recognized: ' + error);
      session.socket.emit('channel', uid, { cmd:'error', error:error });
    }); else {
      session.debug('Cannot send a command to ' + uid + ', does not exist.');
      session.socket.emit('delete-channel', uid); // Ssh, this never happened.
    }
  });
  
  this.socket.on('profile', function(key, value) {
    session.host.updateProfile(session, key, value);
  });
};

prototype.debug = function(msg) {
  debugLog('[host.sess:' + this.uid + ']: ' + msg);
};