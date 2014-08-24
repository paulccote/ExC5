'use strict';

var prototype = (ExClient.Participant = function(channel, summary) {
  this.channel = channel;
  this.username = summary.username;
  this.role = summary.role;
  this.data = new ExClient.Channel.Storage(channel, 'userGrid', summary.data);
}).prototype;