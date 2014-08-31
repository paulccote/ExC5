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
      try { require('nw.gui'); } catch(e) {
        var specs = 'menubar=no,width=800,height=600'; // TODO:2014-08-31:alex:Center on screen.
        browserWindows[chan.name] = window.open(chan.plugin + '/plugin.html?' + Math.random(), 'ExChillusion', specs);
      }
      
      ExClient.instance.joinUId(uid);
    }; }(chan.uid));

    cl.append(div);
  }
}

var scope = Controller.scope('loggedin');
scope.view('main', function(element) {
  // ExClient.instance points to the instance we created in welcome/controller.js
  // for the 'auth´-view.
  
  ExClient.instance.socket.on('list', function(list) {
    listChannels(list); // TODO: Integrate the function into this callback.
  });
  
  $('#settings_panel').tabs({
    beforeLoad:function(event, ui) {
      var view = Controller.view(ui.ajaxSettings.url);
      view.show(function() { ui.panel[0].appendChild(view.element); });
      return false;
    }
  }).hide();
    
  $('#gear').show();
  
  ExClient.instance.socket.emit('list');
  $(element).find('.list-btn').click(function(e) {
    ExClient.instance.socket.emit('list');
  });
  
  $(element).find('.join-btn').click(function(e) {
    var cname = prompt('Which channel do you want to join?', 'bj');
    if(cname === null) return;

    ExClient.instance.probe(cname, function(o) {
      if(o.success) PluginTrust.open(o.summary.uid, o.summary.plugin, cname);
      else {
        // TODO:2014-08-31:alex:This needs it's own dialog, because we can't use window.open otherwise.
        var plugin = prompt('The channel does not exist. Type a plugin-URL to create it.', 'plugins/blackjack');
        if(plugin !== null) {
          try { require('nw.gui'); } catch(e) {
            var specs = 'menubar=no,width=800,height=600'; // TODO:2014-08-31:alex:Center on screen.
            browserWindows[cname] = window.open(plugin + '/plugin.html?' + Math.random(), 'ExChillusion', specs);
          }
          
          ExClient.instance.create(cname, plugin);
        }
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
        var current = JSON.stringify(ExClient.instance.preferences[key]);
        var value = prompt('New value? Current value is listed as default.', current);
        if(value !== null) ExClient.instance.setPreference(key, JSON.parse(value));
      }; break;
      case 'p2p': {
        var peer = prompt('Username of other peer?');
        if(peer !== null) ExClient.instance.requestP2P(peer);
      }; break;
      case 'clear-cache': {
        require('nw.gui').App.clearCache(); // for node-webkit
        alert("Your cache has been cleared.");
      }; break;
    }
  });
});