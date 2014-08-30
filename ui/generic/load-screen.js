var LoadScreen = new function() {
  var _this = this;
  var loaderShown = false;
  var actions = [];

  this._configureAndShow = function(message, emoticon, fps) {
    _this._setMessage(message);
    _this._setEmoticon(emoticon, fps);
    _this._show();
  };

  this._hide = function() {
    if(!loaderShown) return;
    $('#loading').stop().animate({ opacity: 0.0 }, { complete: function() { $('#loading').hide(); }});
    loaderShown = false;
  };

  this._show = function() {
    if(loaderShown) return;
    $('#loading').stop().show().animate({ opacity: 1.0 });
    loaderShown = true;
  };

  this._setMessage = function(message) { $('#loading .status').text(message); };

  var loadingEmote;
  this._setEmoticon = function(name, fps) {
    if(loadingEmote) loadingEmote.stop();
    if(fps === undefined) fps = 15;

    loadingEmote = new Sprite('anim/' + name + '_anim@2x.png').setFPS(fps);
    $('#loading div').replaceWith(loadingEmote.element);
  }
  
  this.addJob = function(job, message, emoticon, delay) {
    if(delay === undefined) delay = 0;
    if(emoticon === undefined) emoticon = 'mooning';

    var action = {
      job      : job,
      message  : message,
      emoticon : emoticon,
      date     : new Date(),
      delay    : delay
    };

    actions.push(action);
    job.ready(function() {
      actions.remove(action);
      _this._revalidateActions();
    });

    setTimeout(_this._revalidateActions, delay);
    return action;
  };
  
  this._revalidateActions = function() {
    var overdue = actions.filter(function(action) {
      return (new Date().getTime() - action.date.getTime()) >= action.delay;
    });
    
    if(overdue.length == 0) _this._hide();
    else {
      var action = overdue.pop();
      _this._configureAndShow(action.message, action.emoticon);
    }
  };
};