var prototype = (ExClient.Channel.Storage = function(channel, gridKey, summary) {
  this.channel = channel;
  this.gridKey = gridKey;
  this.values = summary;
}).prototype;

prototype.getValue = function(key, cb) {
  // TODO: Implement this.
};