jQuery.fn.center = function () {
  this.css("position", "absolute");
  this.css("top", Math.max(0, (($(window).height() - $(this).outerHeight()) / 2) +
                           $(window).scrollTop()) + "px");
  this.css("left", Math.max(0, (($(window).width() - $(this).outerWidth()) / 2) +
                            $(window).scrollLeft()) + "px");
  return this;
}; // Required because of issues with newer versions of jQuery UI

/* Deals with the UI for when you join a channel which already exists
 * and you need to specify whether you trust the plugin used by the channel or not.
 * PluginTrust loads the package.json from the plugin and displays properties like
 * the description and summary.
 */
var PluginTrust = new function() {
  var pendingUId, self = this;
  
  window.addEventListener('load', function() {
    $('#distrust_btn').click(function() { self.close(); });
    $('#trust_btn').click(function() {
      self.close();
      debugClient.joinUId(pendingUId);
    });
    
    // We want the icon to be hidden until it has finished loading.
    $('#plugin_alert img.icon').load(function() { $(this).show(); });
  });
  
  this.open = function(uid, plugin) {
    pendingUId = uid;
    
    $('#plugin_alert span.url').text(plugin);
    $('#plugin_alert').addClass('loading');
    $('#plugin_alert').dialog({ title:'Plugin trust', width:400, modal:true });
    
    $.getJSON(plugin + '/package/package.json', function(d) {
      $('#plugin_alert img.icon')[0].src = plugin + '/' + d.icon;
      $('#plugin_alert img.icon').hide();
      
      $('#plugin_alert span.title').text(d.name);
      $('#plugin_alert span.author').text('by ' + d.author);
      $('#plugin_alert span.description').text(d.description);
      
      setTimeout(function() {
        $('#plugin_alert').parent().center();
      }, 0); // Sometimes the DOM is weird. TODO: Required?
      $('#plugin_alert').removeClass('loading');
    }); // TODO:2014-08-26:alex:We need an error-callback here.
  };
  
  this.close = function() {
    $('#plugin_alert').dialog('close');
  };
}();