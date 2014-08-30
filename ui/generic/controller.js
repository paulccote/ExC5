var Controller = new function() {
  function MVC(controller) {
    var mvc = this;
    this.id = controller;

    this.hasConfigured = false;

    dat = this;

    var jsJob = Job.LoadJS('ui/' + controller + '/controller.js');
    jsJob.ready(function() {
      mvc.hasConfigured = true;
    });

    var queue = this.queue = new Queue();
    this.viewElement = null;
    this.elements = {};

    queue.add(jsJob);
    queue.add(Job.LoadCSS('ui/' + controller + '/style.css'));
    queue.add(Job.LoadHTML('ui/' + controller + '/view.html', function() {
      var e = mvc.viewElement = document.createElement('div');
      e.innerHTML = this.html;
      $(e).find('.view').hide().each(function() {
        mvc.elements[this.id] = this;

        // Mangle the id so we have no colliding ids in our document,
        // because that would be "invalid HTML".

        this.id = 'ui-' + mvc.id + '-' + this.id;
      });

      document.body.appendChild(e);
    }));
  }

  MVC.prototype.ready = function(callback) { this.queue.ready(callback); };

  //

  function View(mvc, key) {
    this.id = mvc.id + '/' + key;
    this.mvc = mvc;
    this._show = this._hide = function(cb) { return cb(); };
    this._setup = function(e) {};
    this.element = null;

    var view = this;
    this.mvc.ready(function() {
      view.element = view.mvc.elements[key];
      view._setup.call(view, view.element);
    });
  }

  View.prototype.show = function(cb) {
    var view = this;
    this.mvc.ready(function() {
      // If/when the MVC-content (style.css, controller.js and view.html) for this view has been loaded,
      // we can pass control to the private _show function, which (if supplied) does preparation
      // before calling our callback 'cb´

      view._show(cb);
    });
  };

  View.prototype.hide = function() {
    if(this.configued) this._hide();
  };

  View.prototype._configure = function(func) {
    this._setup = func;
  };

  var _mvcs = {}, _views = {};

  this.scope = function(path) {
    return { view: function(view, callback) { Controller.view(path + '/' + view, callback); } };
  };

  // read / write a view handler.
  this.view = function(path, callback) {
    var parts = path.split('#');
    var path = parts[0];
    var hash = parts[1] || 'main';
    var id = path + '#' + hash;

    var mvcKey = path.split('/').shift();
    var viewKey = path.split('/').pop();

    if(callback === undefined) {
      // Read access, is this view loaded?
      if(_mvcs.hasOwnProperty(mvcKey) && _mvcs[mvcKey].hasConfigured)
        return _views[id]; // We loaded the MVC for the view, if the view exists it must be in _views.

      // We need to load the MVC if it's not being loaded already and
      // we need to create a placeholder for the view to be returned if it does not exist already

      var mvc = _mvcs[mvcKey] || (_mvcs[mvcKey] = new MVC(mvcKey));
      return _views[id] || (_views[id] = new View(mvc, viewKey));
    }

    if(!_mvcs.hasOwnProperty(mvcKey))
      throw "MVC does not exist for \"" + mvcKey + "\", 'Controller.view' was probably invoked by a file " +
        "which was not loaded by 'Controller' itself."

      var view = _views[id] || (_views[id] = new View(_mvcs[mvcKey], viewKey));
    view._configure(callback);
    return view;
  };
}();