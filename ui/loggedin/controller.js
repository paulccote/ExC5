function listChannels(list) {
  function __(tag, klass, text) {
    var e = document.createElement(tag);
    e.className = klass;
    e.textContent = text;
    return e;
  }

  var cl = $('.channel-list');
  cl.text(list.length == 0 ? "(no public channels available)" : '');
  
  for(var i = 0; i < list.length; ++i) {
    var chan = list[i];
    var div = __('div', 'channel', '');

    div.appendChild(__('span', 'title', chan.name));
    div.appendChild(__('span', 'host', 'by ' + chan.host));
    div.appendChild(__('span', 'count', chan.count.join(' / ')));
    div.appendChild(__('br', '', ''));
    div.appendChild(__('span', 'motd', chan.motd));
    $(div).dblclick(function(uid) { return function() {
      debugClient.joinUId(uid);
    }; }(chan.uid));

    cl.append(div);
  }
}

var scope = Controller.scope('loggedin');
scope.view('main', function(element) {
  debugClient.socket.on('list', function(list) {
    listChannels(list); // TODO: Integrate the function into this callback.
  });
  
  $('#gear').show();
  
  debugClient.socket.emit('list');
  $(element).find('.list-btn').click(function(e) {
    debugClient.socket.emit('list');
  });
  
  $(element).find('.join-btn').click(function(e) {
    var cname = prompt('Which channel do you want to join?', 'bj');
    if(cname === null) return;

    debugClient.probe(cname, function(o) {
      if(o.success) PluginTrust.show(o.summary.uid, o.summary.plugin);
      else {
        var plugin = prompt('The channel does not exist. Type a plugin-URL to create it.', 'plugins/blackjack');
        if(plugin !== null) debugClient.create(cname, plugin); // Channel does not exist
      }
    });
  });

  $(element).find('.beta-btn').click(function(e) {
    var feature = prompt(
      "This is the beta-feature section for features that have\n" +
      "no GUI yet and are likely to change a lot in upcoming\n" +
      "releases. Please enter the code-phrase below.\n" +
      "* p2p  * nickname  * picture  * preference  * clear-cache"
    );
    if(feature === null) return;

    switch(feature.toLowerCase()) {
      case 'preference': {
        var key = prompt(
          "Preference key?\n" +
          "* notifyVisual - value either false or true\n" +
          "* notifySound - value either an URL in quotation marks or \"\" for no sound"
        );
        if(key === null) return;
        var current = JSON.stringify(debugClient.preferences[key]);
        var value = prompt('New value? Current value is listed as default.', current);
        if(value !== null) debugClient.setPreference(key, JSON.parse(value));
      }; break;
      case 'p2p': {
        var peer = prompt('Username of other peer?');
        if(peer !== null) debugClient.requestP2P(peer);
      }; break;
      case 'nickname': {
        var nickname = prompt('Your new nickname?');
        if(nickname !== null) debugClient.socket.emit('profile', 'nickname', nickname);
      }; break;
      case 'picture': {
        var picture = prompt("Your avatar as 64x64 image/jpeg 0.85 base64-URL?\n" +
                             "If that confuses you, copy the code from\n" +
                             "http://cappucci.noip.me/agen");
        if(picture !== null) debugClient.socket.emit('profile', 'picture', picture);
      }; break;
      case 'clear-cache': {
        require('nw.gui').App.clearCache(); // for node-webkit
        alert("Your cache has been cleared.");
      }; break;
    }
  });
});