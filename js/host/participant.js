var prototype = (ExHost.Participant = function(channel, session) {
  this.channel = channel;
  this.session = session;
  this.role = EXROLE_USER;
  this.data = new ExHost.Channel.Storage(channel, 'userGrid');
}).prototype;

prototype.leave = function() {
  this.channel.handleLeave(this.session);
};

prototype.getSummary = function() {
  return {
    username : this.session.user.username,
    nickname : this.session.profile.nickname,
    picture  : this.session.profile.picture,
    data     : this.data.getSummary(),
    role     : this.role
  };
};