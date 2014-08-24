/* * * * * * * * * * * * * * * *
 * This is the Sprite-engine.
 * It provides a class to deal with animations.
 * * * * * * * * * * * * * * * */

// // // // // // // //
//
//   Image Loader
//
// // // // // // // //

var imageBuffer = {};
function loadImage(url, callback) {
  if(imageBuffer[url]) return callback(imageBuffer[url]);
  
  var image = imageBuffer[url] = new Image();
  image.onload = function() { callback(image); };
  image.src = url;
  
  return false;
}


// // // // // // // // //
//
//   Sprite constructor
//
// // // // // // // // //

var Sprite = function(img, frames, w, h, callback) {
  this.interval = 1000 / 8; // 8 FPS
  this.timer = false;
  // // //
  this.image = false;
  this.imageURL = img;
  // // //
  this.frames = frames;
  this.frame = 0;
  // // //
  this.loops = true;
  this.container = false;
  this.scaleX = 1;
  
  this.x = 0;
  this.y = 0;
  
  this.ready = false;
  // // //
  this.element = document.createElement('div');
  this.callback = callback;
  
  this.shouldPlay = true;
  
  this.config = {
    w: w,
    h: h
  };
  
  var self = this;
  loadImage(img, function(image) {
    self.image = image;
    
    if(self.frames === undefined) { // Skype auto-adjust
      self.config.fW = image.width;
      self.config.fH = image.width;
      
      self.config.w = 1;
      self.config.h = image.height / image.width;
      
      var a = []; for(var i = 0; i < image.height / image.width; ++i) a[i] = i;
      self.frames = a;
    } else {
      self.config.fW = Math.round(image.width / self.config.w);
      self.config.fH = Math.round(image.height / self.config.h);
    }
    
    self.init();
  });
};

Sprite.prototype.init = function() {
  var e = this.element;
  e.style.display = 'inline-block';
  e.style.backgroundImage = 'url(' + this.imageURL + ')';
  e.style.backgroundSize = Math.round(this.image.width / 2) + 'px ' + Math.round(this.image.height / 2) + 'px';
  e.style.width = this.config.fW / 2 + 'px';
  e.style.height = this.config.fH / 2 + 'px';
  
  this.updateFrame();
  if(this.shouldPlay) this.play();
  
  if(this.container) this.container.appendChild(this.element);
  this.mirror(this.scaleX);
  
  this.ready = true;
  if(this.callback) this.callback(e);
};

Sprite.prototype.display = function(e) {
  if(this.container && this.ready) this.container.removeChild(this.element);
  this.container = e;
  if(this.ready) e.appendChild(this.element);
  return this;
};


// // // // // // // //
//
//   Update Methods
//
// // // // // // // //

Sprite.prototype.updateFrame = function() {
  var x = this.frames[this.frame] % this.config.w;
  var y = ~~(this.frames[this.frame] / this.config.w);
  this.element.style.backgroundPosition = (-x * this.config.fW) + 'px ' + (-y * this.config.fH) + 'px';
  
  return this;
};

Sprite.prototype.updatePosition = function() {
  this.element.style.left = this.x + 'px';
  this.element.style.top = this.y + 'px';
  
  return this;
};


// // // // // // // // // //
//
//   Modification Methods
//
// // // // // // // // // //

/* Position */
Sprite.prototype.moveTo = function(x, y) {
  this.x = x; this.y = y;
  this.updatePosition();
  return this;
};

Sprite.prototype.moveBy = function(x, y) {
  this.x += x; this.y += y;
  this.updatePosition();
  return this;
};

/* Frame */
Sprite.prototype.gotoFrame = function(frame) {
  this.frame = frame;
  this.updateFrame();
  return this;
}

Sprite.prototype.nextFrame = function(count) {
  if(count === undefined) count = 1;
  this.frame = (this.frame + count) % this.frames.length;
  this.updateFrame();
  
  return this;
};

Sprite.prototype.previousFrame = function(count) {
  if(count === undefined) count = 1;
  this.frame = (this.frame - count) % this.frames.length;
  while(this.frame < 0) this.frame += this.frames.length;
  this.updateFrame();
  
  return this;
};

/* FPS */
Sprite.prototype.setFPS = function(fps) {
  this.interval = 1000 / fps;
  return this;
};

/* Frames */
Sprite.prototype.setFrames = function(frames) {
  this.frames = frames;
  this.frame = 0;
  return this;
};

Sprite.prototype.reverse = function() {
  this.frames.reverse();
  return this;
};

Sprite.prototype.mirror = function(xScale) {
  this.scaleX = xScale;
  if(this.element) {
    this.element.style.transform = 'scaleX(' + xScale + ')';
    this.element.style.webkitTransform = 'scaleX(' + xScale + ')';
  }
  return this;
};

// // // // // // //
//
//   Play Methods
//
// // // // // // //

Sprite.prototype.isPlaying = function() {
  return !!this.timer;
};

/* Starting */
Sprite.prototype.playLoop = function(fps) {
  this.loops = true;
  return this.play(fps);
};

Sprite.prototype.playOnce = function(fps) {
  this.loops = false;
  return this.play(fps);
};

Sprite.prototype.play = function(fps) {
  this.shouldPlay = true;
  
  if(fps !== undefined) this.setFPS(fps);
  if(this.timer) this.pause();
  
  var self = this;
  this.timer = setInterval(function() { self.nextFrame(); }, this.interval);
  
  return this;
};

/* Stopping / Pausing */
Sprite.prototype.pause = function() {
  this.shouldPlay = false;
  
  if(this.timer) { clearInterval(this.timer); this.timer = false; }
  return this;
};

Sprite.prototype.stop = function() {
  this.pause();
  this.frame = 0;
  return this;
};