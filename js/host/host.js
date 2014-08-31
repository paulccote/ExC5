var debugCount = 0;
function debugLog(message) {
  $('.debug').append('<br />');
  $('.debug').append(document.createTextNode(message));
  //$('.debug').stop().animate({ scrollTop: $('.debug')[0].scrollHeight });
  $('.debug').scrollTop($('.debug')[0].scrollHeight);
  
  if(++debugCount > 50) { // TODO: More elegant way?
    $('.debug').text('');
    debugCount = 0;
  }
}

function dbResultToArray(r) {
  var a = new Array(r.rows.length);
  for (var i = 0; i < r.rows.length; ++i) a[i] = r.rows.item(i);
  return a;
}

var debugHost;
function ExHost(port) {
  debugHost = this;
  
  var path = require('path');
  var servDDir = path.join(location.pathname, '../db/server.sqlite');
  var serverDb = this.serverDb = openDatabase(servDDir, '1.0', 'ExC4 database', 128 * 1024 * 1024);
  this.prepareServerDb();
  
  this.channels = {};
  this.sessions = {};
  
  var host = this;
  var io = this.io = require('socket.io')(port);
  io.on('connection', function(socket) {
    var session = new ExHost.Session(host, socket);
    host.sessions[session.uid] = session;
  });
}

ExHost.prototype.loadProfile = function(session, callback) {
  debugLog('load profile');
  this.sql('SELECT * FROM profile WHERE username = ?;', [ session.user.username ], function(tx, results) {
    var a = dbResultToArray(results);
    for(var i = 0; i < a.length; ++i) session.profile[a[i].key] = JSON.parse(a[i].value);
    if(callback !== undefined) callback();
  }, this.dbErrorCb);
};

ExHost.prototype.updateProfile = function(session, key, value) {
  session.profile[key] = value; // TODO:2014-08-31:alex:Vulnerability!!
  this.serverDb.transaction(function(tx) {
    tx.executeSql(
      'DELETE FROM profile WHERE username = ? AND key = ?;',
      [ session.user.username, key ]);
    tx.executeSql(
      'INSERT INTO profile (username, key, value) VALUES (?, ?, ?);',
      [ session.user.username, key, JSON.stringify(value) ]);
  });
};

ExHost.prototype.findSessionByUsername = function(username) {
  return Object.find(this.sessions, function(session) { return session.user.username == username; });
};

ExHost.prototype.findChannel = function(prop, value) {
  return Object.find(this.channels, function(channel) { return channel[prop] == value; });
};

ExHost.prototype.sql = function(sql, parameters, cb, err) {
  this.serverDb.transaction(function(tx) {
    debugLog('SQL: ' + sql + ' with ' + parameters.join(', '));
    tx.executeSql(sql, parameters, cb, err);
  });
};

ExHost.prototype.fetchUser = function(username, cb) {
  this.sql('SELECT * FROM users WHERE username = ?;', [username], function(tx, results) {
    cb(dbResultToArray(results)[0]);
  }, this.dbErrorCb);
};

ExHost.prototype.registerUser = function(username, password) {
  this.sql('INSERT INTO users (username, password) VALUES (?, ?);', [ username, password ], function(tx, results) {
    // TODO:2014-08-17:alex:Nothing to do? Make me some coffee instead.
  }, this.dbErrorCb);
  return {
    username: username,
    password: password
  }
};

ExHost.prototype.dbErrorCb = function(a) {
  debugLog('A database error occured.');
};

ExHost.prototype.prepareServerDb = function() {
  var host = this;
  host.sql(
    'CREATE TABLE IF NOT EXISTS users (username TEXT UNIQUE, password TEXT);', [],
    function(tx, results) {
      host.sql(
        'CREATE TABLE IF NOT EXISTS profile (username TEXT, key TEXT, value TEXT);', [],
        function() { debugLog('Database ready!'); }, this.dbErrorCb
      );
    }, this.dbErrorCb
  );
};