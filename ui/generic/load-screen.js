var LoadScreen = new function() {
  var self = this;
  var loaderShown = false;

  window.addEventListener('load', function() {
    $('#loading').hide().css('opacity', 0.0);
  });

  this.configureAndShow = function(sender, message, emoticon, fps) {
    self.setMessage(message);
    self.setEmoticon(emoticon, fps);
    self.show(sender);
  };

  this.hide = function(sender) {
    if(!loaderShown) return;

    if(sender) $(sender).stop().show().animate({ opacity: 1.0 });
    $('#loading').stop().animate({ opacity: 0.0 }, { complete: function() { $('#loading').hide(); }});

    loaderShown = false;
  };

  this.show = function(sender) {
    if(loaderShown) return;

    if(sender) $(sender).stop().animate({ opacity: 0.0 }, { complete: function() { $(sender).hide(); }});
    $('#loading').stop().show().animate({ opacity: 1.0 });

    loaderShown = true;
  };

  this.setMessage = function(message) { $('#loading .status').text(message); };

  var loadingEmote;
  this.setEmoticon = function(name, fps) {
    if(loadingEmote) loadingEmote.stop();
    if(fps === undefined) fps = 15;

    loadingEmote = new Sprite('anim/' + name + '_anim@2x.png').setFPS(fps);
    $('#loading div').replaceWith(loadingEmote.element);
  }
};