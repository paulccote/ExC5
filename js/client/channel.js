'use strict';

var prototype = (ExClient.Channel = function(client, summary, nativeWindow) {
  this.client = client;
  this.uid = summary.uid;
  this.name = summary.name;
  this.plugin = summary.plugin;
  this.window = null;
  this.isDirty = false;
  
  this.options = summary.options;
  this.dataGrid = summary.dataGrid;
  this.channelGrid = summary.channelGrid;
  
  this.data = new ExClient.Channel.Storage(this, 'channelGrid', summary.data);
  this.participants = {};
  
  Object.forEach(summary.participants, function(u) {
    var participant = this.participants[u.username] = new ExClient.Participant(this, u);
    if(u.username == client.username) client.participation[this.uid] = participant;
  }, this);
  
  var channel = this;
  this.nativeWindow = nativeWindow;
  nativeWindow.on('focus' , function() { channel.postObject({ cmd:'focus', focus:true  }); });
  nativeWindow.on('blur'  , function() { channel.postObject({ cmd:'focus', focus:false }); });
  nativeWindow.on('closed', function() { channel.leave(); });
  nativeWindow.on('document-end', function() {
    nativeWindow.title = '#' + summary.name; // TODO:2014-08-24:alex:The title is still editable, it shouldn't be.
    nativeWindow.focus();
  });
  
  this.buffer = [];
  this.postObject({ cmd:'init', channel:summary, client:client.getSummary() });
}).prototype;

prototype.flushBuffer = function() {
  for(var i = 0; i < this.buffer.length; ++i) this.postObject(this.buffer[i]);
  this.buffer = [];
};

prototype.postObject = function(obj) {
  console.log('postObject:' + JSON.stringify(obj));
  if(!this.window) {
    this.buffer.push(obj);
    return;
  }
  
  try {
    this.window.postMessage(JSON.stringify(obj), '*');
  } catch(e) {
    alert("Ouch! Couldn't postObject: " + e);
    alert(this.window);
    alert(this.window.postMessage);
  }
};

prototype.send = function(obj) {
  if(this.client.socket.connected) // It might be disconnected, when the DOM is unloaded.
    this.client.socket.emit('channel', this.uid, obj);
};

prototype.leave = function() {
  delete this.client.participation[this.uid];
  this.send({ cmd:'leave' });
};

prototype.handlePacket = function(packet) {
  switch(packet.cmd) {
    case 'push': this.handlePush(packet.username, packet.data); break;
    case 'join': this.handleJoin(packet.username); break;
    case 'leave': this.handleLeave(packet.username); break;
    default: // What?
  }
  
  // Forward to window.
  
  this.postObject(packet);
};

prototype.handlePush = function() {};
prototype.handleJoin = function(participant) {
  this.participants[participant.username] = new ExClient.Participant(this, participant);
};

prototype.handleLeave = function(username) {
  // TODO: Implement this.
};

prototype.processMessage = function(event) {
  var o = JSON.parse(event.data);
  switch(o.cmd) {
    case 'channel': this.send(o.data); break; // Just forward. Who cares?
    case 'dirty': this.isDirty = o.dirty; this.client.updateDirtyBadge(); break;
    case 'notify': this.client.notify(this.name, o.options); break;
    case 'flush': { // Because nothing ever works.
      this.window = event.source;
      this.flushBuffer();
    }; break;
  }
};