const ACTION_TIMEOUT   = 'timeout';
const ACTION_STAND     = 'stand';
const ACTION_HIT       = 'hit';
const ACTION_DOUBLE    = 'double';
const ACTION_SPLIT     = 'split';
const ACTION_SURRENDER = 'surrender';

var hostLogic, userLogic;
window.addEventListener('load', function() {
  ExAPI.init();
  
  ExAPI.on('configure', function(evt) { // We're host.
    hostLogic = new Logic.Host();
    hostLogic.start();
    
    ExAPI.onPush('join', function(data, username) {
      // Do something useful for humanity.
      // TODO:2014-08-23:alex:Implement and check ExAPI.user(username).data.state
      // TODO:2014-08-23:alex:Create a player proxy here. Obviously. We have to.
      
      var netUser = new Logic.Host.NetworkUser(username);
      hostLogic._onJoin(netUser);
      
      ExAPI.udata(username, 'state', { wealth : 5000, playing : true });
    });
    
    ExAPI.onPush('answer', function(data, username) {
      var netUser = hostLogic.userHash[username];
      if(netUser === undefined); // TODO:2014-08-23:alex:Respond to the user here. How?
      else netUser.answer(data.id, data.answer);
    });
    
    ExAPI.grid('channelGrid', {
      topic : { important:true  , write:EXROLE_USER, read:EXROLE_ANYBODY },
      motd  : { important:false , write:EXROLE_HOST, read:EXROLE_ANYBODY }
    });

    ExAPI.grid('userGrid', {
      state : { important:true, write:EXROLE_HOST, read:EXROLE_ANYBODY }
    });

    ExAPI.data('motd', 'Play BlackJack with us!');

    ExAPI.options({
      public   : true,
      maxUsers : 150,
      commands : {
        join   : EXROLE_USER,
        
        ask    : EXROLE_HOST,
        answer : EXROLE_USER,
        
        flip   : EXROLE_HOST,
        deal   : EXROLE_HOST,
        clear  : EXROLE_HOST,
        
        joined : EXROLE_HOST, // Used to inform users that we have a new player.
      }
    });
  });
  
  ExAPI.on('ready', function() {
    ExAPI.push({ // Tell the host we want to join
      cmd : 'join',
      to  : EXROLE_HOST
    });
    
    Object.forEach(ExAPI.channel.participants, function(p, name) {
      if(!ExAPI.udata(name, 'state.playing')) return;
      hands['user:' + name] = new Hand(name);
    });
  });
  
  ExAPI.onPush('ask', function(id) {
    userLogic.ask(id, function(value) {
      ExAPI.push({
        cmd  : 'answer',
        data : { id:id, answer:value },
        to   : EXROLE_HOST
      });
    });
  });
  
  userLogic = new Logic.User();
  
  hands = {};
  hands['dealer'] = new Hand('Dealer');
  
  var scoreboard = document.createElement('div');
  scoreboard.classList.add('scoreboard');
  document.body.appendChild(scoreboard);
  
  ExAPI.on('udata', function() {
    var players = Object.filter(ExAPI.channel.participants, function(p, name) {
      return ExAPI.udata(name, 'state.playing');
    });
    
    scoreboard.textContent = '';
    Object.forEach(players, function(p, name) {
      scoreboard.appendChild(document.createTextNode(name + ': ' + ExAPI.udata(name, 'state.wealth')));
      scoreboard.appendChild(document.createElement('br'));
    });
  });
  
  ExAPI.onPush('joined', function(username) { // TODO:2014-08-24:alex:Get rid of this and use a userStore hook instead.
    var hand = hands['user:' + username] = new Hand(username);
    if(username == ExAPI.client.username) userLogic.hand = hand;
  });
  
  ExAPI.onPush('deal', function(data) {
    hands[data.id].addCard(Card.deserialize(data.card));
  });
  
  ExAPI.onPush('clear', function() {
    Object.forEach(hands, function(hand) { hand.clear(); });
  });
  
  ExAPI.onPush('flip', function(data) {
    var card = cards[data.id];
    if(!card) return; // We don't know about this card yet.
    
    card.type = data.type;
    card.offset = data.offset;
    card.isFlipped = false;
    card.flip(true);
  });
});