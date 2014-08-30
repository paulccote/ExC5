const QSTATE_WAITING = 'qs_waiting';
const QSTATE_FINISHED = 'qs_finished';
const QSTATE_FAILED = 'qs_failed';

function Queue() {
  this.entries = [];
  this.state = QSTATE_FINISHED;

  var state = QSTATE_WAITING;

  var _this = this;
  this.__defineGetter__('state', function() { return state; });
  this.__defineSetter__('state', function(newState) {
    var oldState = state;
    state = newState;
    if(oldState != newState) _this.emit('update');
  });
}

jQuery.extend(Queue.prototype, EventEmitter);

Queue.prototype.add = function(job) {
  var _this = this;
  job.on('update', function() { _this._revalidate(); });

  this.entries.push(job);
  this._revalidate();
};

Queue.prototype._revalidate = function() {
  var hasFailed = this.entries.filter(function(entry) { return entry.state == QSTATE_FAILED; }).length > 0;
  if(hasFailed) return this.state = QSTATE_FAILED;

  var hasFinished = this.entries.filter(function(entry) { return entry.state != QSTATE_FINISHED; }).length == 0;
  if(hasFinished) return this.state = QSTATE_FINISHED;

  return this.state = QSTATE_WAITING;
};

function Job(func) {
  var state = QSTATE_WAITING;
  this.error = null; // Set by .error

  var _this = this;
  this.__defineGetter__('state', function() { return state; });
  this.__defineSetter__('state', function(newState) {
    var oldState = state;
    state = newState;
    if(oldState != newState) _this.emit('update');
  });

  if(func !== undefined) func.apply(this);
};

jQuery.extend(Job.prototype, EventEmitter);

Job.prototype.finish = function()  { this.error = null; this.state = QSTATE_FINISHED; };
Job.prototype.fail   = function(e) { this.error = e;    this.state = QSTATE_FAILED;   };

(function() {
  /*
         * Create .ready and .error methods (similiar to jQuery) for
         * both Queue and Job.
         */

  var map = {
    error: QSTATE_FAILED,
    ready: QSTATE_FINISHED
  };

  Object.forEach(map, function(state, method) {
    // Since Job and Queue both provide 'this.state´ and 'this.on("update")´,
    // we can safely use the same function here.

    // TODO:2014-08-30:alex:This could be more efficient if we don't create a callback for every callback.
    Job.prototype[method] = Queue.prototype[method] = function(callback) {
      if(this.state == state) callback.apply(this);
      else this.on('update', function() {
        if(this.state != state) return;
        callback.apply(this);
        return EventEmitter.unhook;
      });
    };
  });
})();

Job.LoadJS = function(url) {
  return new Job(function() {
    var job = this;
    var e = this.element = document.createElement('script');
    e.onload  = function()  { job.finish(); };
    e.onerror = function(e) { job.fail(e);  };
    e.src     = url;
    document.head.appendChild(e);
  });
};

Job.LoadCSS = function(url) {
  return new Job(function() {
    var e  = this.element = document.createElement('link');
    e.rel  = 'stylesheet';
    e.href = url;
    document.head.appendChild(e);

    this.finish(); // TODO:2014-08-30:alex:This is a lie.
  });
};

Job.LoadHTML = function(url, processor) {
  return new Job(function() {
    var job = this;
    this.request = $.get(url, function(d) {
      job.html = d;
      if(processor !== undefined) processor.call(job);
      job.finish();
    }).error(function(req, e) {
      job.fail(e);
    });
  });
};