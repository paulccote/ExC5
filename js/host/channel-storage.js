var prototype = (ExHost.Channel.Storage = function(channel, gridKey) {
  this.channel = channel;
  this.gridKey = gridKey;
  
  this.records = {};
}).prototype;

prototype.hasKey = function(key) {
  return this.channel[this.gridKey].hasOwnProperty(key.split('.')[0]);
};

prototype.canRead  = function(key, role) { return this.channel[this.gridKey][key.split('.')[0]].read  <= role; };
prototype.canWrite = function(key, role) { return this.channel[this.gridKey][key.split('.')[0]].write <= role; };

prototype.read = function(session, key) {
  var path = key.split('.');
  var rootKey = path.shift();
  
  // TODO:2014-08-17:alex:Get role, role for server reads?
  
  if(!this.channel[this.gridKey].hasOwnProperty(rootKey)) throw 'The grid does not contain this key.';
  
  var record = this.records[rootKey] || { value:null };
  var obj = record.value;
  while(path.length > 0)
    if(!obj.hasOwnProperty(path[0])) throw 'Traversel failed with ' + path.join('.') + ' remaining.';
    else obj = obj[path.shift()];
  return Object.merge(record, { value: obj });
};

// Used for reading a property without error-reporting.
prototype.tryRead = function(session, key, fallback) {
  console.log(this.read(session, key));
  try {
    return this.read(session, key);
  } catch(e) {
    return fallback;
  }
};

prototype.write = function(session, key, value, owner) {
  // TODO:2014-08-17:alex:Perform control-logic here?
  // TODO:2014-08-17:alex:Deactivate changelogs?
  // TODO:2014-08-17:alex:Remove the owner parameter, really.
  
  var path = key.split('.');
  var rootKey = path.shift();
  
  path = [ 'value' ].concat(path); // We need one item, at least.
  var root = this.records[rootKey] || (this.records[rootKey] = {});
  while(path.length > 1) root = (root.hasOwnProperty(path[0]) ? root[path.shift()] : root[path.shift()] = {});
  root[path.shift()] = value;
  
  var record = this.records[rootKey] = {
    value     : this.records[rootKey].value,
    username  : session.user.username,
    timestamp : new Date().getTime()
  };
  
  var pushRecord = Object.merge(record, { value:value }); // We want to push the changed value, not the whole record.
  if(this.gridKey == 'channelGrid')
    this.channel.send('data', { key:key, record:pushRecord });
  else
    this.channel.send('udata', { owner:owner, key:key, record:pushRecord });
};

prototype.getSummary = function() {
  var storage = this;
  var r = Object.filter(this.channel[this.gridKey], function(entry) { return entry.important; });
  return Object.map(r, function(e, key) { return storage.records[key]; });
};