Array.prototype.remove = function() {
  var what, a = arguments, L = a.length, ax;
  while (L && this.length) {
    what = a[--L];
    while ((ax = this.indexOf(what)) !== -1) {
      this.splice(ax, 1);
    }
  }
  return this;
};

var chanUId = 0;
var prototype = (ExHost.Channel = function(host, name, plugin) {
  this.uid = ++chanUId;
  this.host = host;
  this.name = name;
  this.data = new ExHost.Channel.Storage(this, 'channelGrid');
  this.plugin = plugin;
  
  this.userGrid = {};
  this.channelGrid = {};
  this.options = {
    configured : false, // Set to true on options command
    commands   : {},    // Containts the role a push.cmd requires you to have
    maxUsers   : 1,     // Until configured, only allow the host
    public     : false  // Will this show up in public channel listings?
  };
  
  this.participants = {};
  this.host.channels[this.uid] = this;
  
  this.debug('Created ' + name + ' with ' + plugin);
}).prototype;

// tbh, I like Ruby a lot more than JavaScript when it comes to functional programming.
prototype.getHost = function() {
  return Object.find(this.participants, function(participant) { return participant.role == EXROLE_HOST; });
};

prototype.roleForSession = function(session) {
  var participant = this.participants[session.uid];
  return participant ? participant.role : EXROLE_ANYBODY;
};

prototype.countUsers = function() { // TODO: Do we need this?
  return Object.count(this.participants);
};

prototype.handleJoin = function(session, respond) {
// if(this.participants[session.user.username]) TODO?
  
  var isHost = this.countUsers() == 0;
  
  this.debug(session.user.username + ' joined');
  
  // Instantiate our new participant
  var participant = new ExHost.Participant(this, session);
  if(isHost) participant.role = EXROLE_HOST;
  
  // Tell the crowd about our new participant
  this.send('join', participant.getSummary());
  
  // Do book-keeping
  this.participants[session.uid] = participant;
  session.participation[this.uid] = participant;
  
  // Respond that we were successful
  respond({ success:true, summary:this.getSummary() });
  
  // If this is our host, ask for options and grids
  if(isHost) session.socket.emit('channel', this.uid, { cmd:'configure' });
};

prototype.handleLeave = function(session) {
  this.debug(session.user.username + ' left');
  
  delete session.participation[this.uid];
  delete this.participants[session.uid];
  
  this.send('leave', { username:session.user.username });
  
  if(this.countUsers() == 0) { // self-destruct!
    this.debug('Bye, bye.');
    delete this.host.channels[this.uid];
  }
};

prototype.send = function(cmd, obj, to) {
  var receiver;
  if(to === undefined)
    receiver = Object.values(this.participants);
  else // to: numeric limits roles >= 'to', array limits usernams in 'to'
    if(typeof to === 'number') receiver = Object.findAll(this.participants, function(p) {
      return p.role >= to;
    }); // TODO:2014-08-24:alex:Vulnerability below. Check for array.
    else if(typeof to === 'object' && to.indexOf) receiver = Object.findAll(this.participants, function(p) {
      return to.indexOf(p.session.user.username) !== -1;
    });
  
  obj.cmd = cmd;
  
  var channel = this;
  receiver.forEach(function(participant) {
    participant.session.socket.emit('channel', channel.uid, obj);
  });
};

prototype.handlePacket = function(session, obj, errorCb) {
  var role = this.roleForSession(session);
  
  switch(obj.cmd) {
    
  }
  
  if(role == EXROLE_ANYBODY) return errorCb('Command not recognized for anybody.');
  
  switch(obj.cmd) {
    case 'leave' : return this.handleLeave(session);
    case 'push'  : return this.push(session, obj.data, errorCb);
    case 'data'  : return this.pushData(session, obj.key, obj.value, errorCb);
    case 'udata' : return this.pushUserData(session, obj.username, obj.key, obj.value, errorCb);
  }
  
  if(role == EXROLE_USER) return errorCb('Command not recognized for users.');
  
  switch(obj.cmd) {
    case 'options': return this.setOptions(session, obj.options, errorCb);
    case 'grid': return this.setGrid(session, obj.gridKey, obj.grid, errorCb);
  }
  
  return errorCb('Command not recognized');
};

prototype.push = function(session, obj, errorCb) {
  this.debug(session.user.username + ' pushed ' + obj);
  if(!this.options.commands.hasOwnProperty(obj.cmd))
    return errorCb("This command does not exist.");
  if(this.options.commands[obj.cmd] > this.roleForSession(session))
    return errorCb("Have you checked your privilege today?");
  this.send('push', { username:session.user.username, data:obj }, obj.to);
};

prototype.pushData = function(session, key, value, errorCb) {
  this.debug(session.user.username + ' sets ' + key + ' to ' + value);
  
  if(!this.data.hasKey(key)) return errorCb('This key does not exist.');
  if(!this.data.canWrite(key, this.roleForSession(session))) return errorCb('You are not permitted to write to this key.');
  this.data.write(session, key, value);
};

prototype.pushUserData = function(session, username, key, value, errorCb) {
  this.debug(session.user.username + ' sets ' + key + ' to ' + value + ' for ' + username);
  
  var role = this.roleForSession(session);
  if(EXROLE_SELF > role && username == session.user.username) role = EXROLE_SELF;
  
  var participant = Object.find(this.participants, function(p) { return p.session.user.username == username; });
  if(!participant) return errorCb('This user does not exist.');
  if(!participant.data.hasKey(key)) return errorCb('This key does not exist.');
  if(!participant.data.canWrite(key, role)) return errorCb('You are not permitted to write to this key.');
  participant.data.write(session, key, value, username);
};

prototype.setOptions = function(session, options, errorCb) {
  options.configured = true;
  
  var required = [ 'commands', 'maxUsers', 'public' ];
  for(var i = 0; i < required.length; ++i)
    if(!options.hasOwnProperty(required[i])) return errorCb("Options needs ." + required[i]);
  this.options = options;
  this.send('options', { username:session.user.username, options:options });
};

prototype.setGrid = function(session, gridKey, grid, errorCb) {
  if(gridKey != 'userGrid' && gridKey != 'channelGrid') return errorCb('Grid does not exist.');
  this[gridKey] = grid;
  
  this.send('grid', { username:session.user.username, gridKey:gridKey, grid:grid });
};

prototype.getSummary = function() {
  var userlist = {};
  Object.forEach(this.participants, function(participant) {
    userlist[participant.session.user.username] = participant.getSummary();
  });
  
  return {
    uid          : this.uid,
    name         : this.name,
    data         : this.data.getSummary(), // TODO: Ignores role!
    userGrid     : this.userGrid,
    channelGrid  : this.channelGrid,
    options      : this.options,
    plugin       : this.plugin,
    participants : userlist
  };
};
prototype.debug = function(msg) {
  debugLog('[host.chan:' + this.uid + ']: ' + msg);
};