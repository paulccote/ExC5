String.prototype.toWordCase = function() {
  if(this.length === 0) return this;
  return this.substring(0, 1).toUpperCase() + this.substring(1);
};

String.prototype.toL33t = function() {
  return (this
    .replace(/e/ig, '3')
    .replace(/i/ig, '1')
    .replace(/l/ig, '7')
    .replace(/o/ig, '0')
    .replace(/a/ig, '4')
    .replace(/s/ig, '5')
  );
};

var generateName = (function() {
  var nouns = ["people", "history", "way", "art", "money", "world", "information", "map", "two", "family", "government", "health", "system", "computer", "meat", "year", "thanks", "music", "person", "reading", "method", "data", "food", "understanding", "theory", "law", "bird", "literature", "problem", "software", "control", "knowledge", "power", "ability", "economics", "love", "internet", "television", "science", "library", "nature", "fact", "product", "idea", "temperature", "investment", "area", "society", "activity", "story", "industry", "media", "thing", "oven", "community", "definition", "safety", "quality", "development", "language", "management", "player", "variety", "video", "week", "security", "country", "exam", "movie", "organization", "equipment", "physics", "analysis", "policy", "series", "thought", "basis", "boyfriend", "direction", "strategy", "technology", "army", "camera", "freedom", "paper", "environment", "child", "instance", "month", "truth", "marketing", "university", "writing", "article", "department", "difference", "goal", "news", "audience", "fishing"];

  var adjectives = ["different", "used", "important", "every", "large", "available", "popular", "able", "basic", "known", "various", "difficult", "several", "united", "historical", "hot", "useful", "mental", "scared", "additional", "emotional", "old", "political", "similar", "healthy", "financial", "medical", "traditional", "federal", "entire", "strong", "actual", "significant", "successful", "electrical", "expensive", "pregnant", "intelligent", "interesting", "poor", "happy", "responsible", "cute", "helpful", "recent", "willing", "nice", "wonderful", "impossible", "serious", "huge", "rare", "technical", "typical", "competitive", "critical", "electronic", "immediate", "aware", "educational", "environmental", "global", "legal", "relevant", "accurate", "capable", "dangerous", "dramatic", "efficient", "powerful", "foreign", "hungry", "practical", "psychological", "severe", "suitable", "numerous", "sufficient", "unusual", "consistent", "cultural", "existing", "famous", "pure", "afraid", "obvious", "careful", "latter", "obviously", "unhappy", "acceptable", "aggressive", "distinct", "eastern", "logical", "reasonable", "strict", "successfully", "administrative", "automatic"];
  
  return function() {
    var name = adjectives.sample().toWordCase() + nouns.sample().toWordCase();
    name = name.toL33t();
    //name = 'xx' + name + 'xx';
    return name;
  };
})();

var scope = Controller.scope('settings');

scope.view('profile', function(element) {
  var dragElement = $(element).find('.picture')[0];
  function __(opacity) {
    $(dragElement).find('.drag-overlay').show().stop().animate({ opacity:opacity }, 100, function() {
      if(opacity == 0.0) $(this).hide();
    });
  }

  function func(op) {
    return function(e) {
      if(e.dataTransfer.files[0] == undefined) return;
      __(op);
      e.preventDefault();
      return false;
    };
  }

  dragElement.addEventListener('dragover'  , func(1.0));
  dragElement.addEventListener('dragenter' , func(1.0));
  dragElement.addEventListener('dragleave' , func(0.0));
  dragElement.addEventListener('drop', function(e) {
    __(0.0);
    
    var dt = e.dataTransfer;
    var file = dt.files[0];
    
    if(file === undefined) return; // Not a file that was dropped.
    
    var reader = new FileReader();
    reader.addEventListener('loadend', function(e) {
      var img = new Image();
      img.onload = function() { canvasMagic(img); };
      img.src = reader.result;
    });
    reader.readAsDataURL(file);
    
    e.preventDefault();
    return false;
  });
  
  var newPicture = '';
  function canvasMagic(img) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    
    var vertical = img.height > img.width;
    var cut = -Math.abs(img.width - img.height) / 2;
    var ratio = vertical ? img.height / img.width : img.width / img.height;
    
    var size = 256;
    canvas.width = canvas.height = size;
    
    cut *= size / (vertical ? img.width : img.height);
    if(vertical) ctx.drawImage(img, 0, cut, size, size * ratio);
    else ctx.drawImage(img, cut, 0, size * ratio, size);
    
    newPicture = canvas.toDataURL('image/jpeg', 0.85);
    $(element).find('.picture img').attr('src', newPicture);
  }
  
  var count = 15;
  var color = $(element).find('.color');
  var circles = [];
  for(var i = 0; i < count; ++i) {
    var circle = document.createElement('div');
    circle.classList.add('circle');
    color[0].appendChild(circle);

    var central = i == (count-1) / 2;
    var light = (i+1) / (count+1);
    var norm = Math.pow(Math.E, -16 * Math.pow(Math.abs(light - 0.5), 2));
    circles.push([ circle, 0.5 - Math.abs(light - 0.5) / 2, (light-0.5) * 0.25 ]);
    circle.style.width = Math.round(norm * 64) + 'px';

    if(central)
      circle.classList.add('central');
    //else
    //circle.style.height = Math.round(norm * 6) * 2 + 4 + 'px';
  }

  var colorInput = color.find('input');
  colorInput.on('input', function() {
    var val = this.value;
    circles.forEach(function(c) {
      var color = Color.from('fsl', val / 100 + c[2], c[1] * 2, c[1]);
      c[0].style.backgroundColor = color.css;
    });
  }).trigger('input');
  
  $(element).find('.save-btn').click(function() {
    ExClient.instance.updateProfile('picture', newPicture);
    ExClient.instance.updateProfile('nickname', $(element).find('.nickname').val());
    ExClient.instance.updateProfile('color', colorInput.val());
  });
  
  this._show = function() {
    $(element).find('.nickname').val(ExClient.instance.profile.nickname);
    $(element).find('.picture img').attr('src', newPicture = ExClient.instance.profile.picture);
    $(element).find('.color input').val(ExClient.instance.profile.color);
  };
});

scope.view('notifications', function() {
});