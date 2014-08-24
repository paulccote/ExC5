var input;

// TODO:2014-08-17:alex:Scroll on resize.
// TODO:2014-08-17:alex:Themes
// TODO:2014-08-17:alex:Better drag and drop support (sources, drag everywhere)
// TODO:2014-08-17:alex:Favorite colors
// TODO:2014-08-17:alex:[img]url[/img], [youtube]link[/youtube], [color=abc]text[/color] - learn BBCode.
// TODO:2014-08-17:alex:Gifs!
// TODO:2014-08-17:alex:A single /me-message with addpad is misaligned
// TODO:2014-08-17:alex:The topic-input should support BB.
// TODO:2014-08-17:alex:multi-lingual package.json
// TODO:2014-08-17:alex:Profile updates aren't pushed to channels yet.
// TODO:2014-08-17:alex:Scroll down when images load. Maybe keep an atBottom flag (update:onscroll), or something.
// TODO:2014-08-17:alex:Fix line-height (for emoticons).

window.addEventListener('load', function() {
  document.querySelector('#topic input').onkeydown = function(e) {
    if(e.keyCode != 13) return;
    
    this.blur();
    ExAPI.data('topic', this.value);
  };
  
  /*
  addMessage('System', getTimeString(), 'Testing something', false);
  addMessage('System', getTimeString(), 'Testing something', false);
  addMessage(null, getTimeString(), 'Testing something', false);
  addMessage('System', getTimeString(), 'Testing something', false);
  addMessage('System', getTimeString(), 'Testing something', false);
  addMessage('System2', getTimeString(), 'Testing something', false);
  addMessage('System', getTimeString(), 'Testing something', false);
  addMessage('System3', getTimeString(), 'Testing something', false);
  addMessage('System', getTimeString(), 'Testing something', false);
  */
  
  ExAPI.init();
  
  input = document.getElementById("msgField");
  input.onkeydown = checkForEnter;
  input.addEventListener('dragover'  , function(e) { e.preventDefault(); return false; });
  input.addEventListener('dragenter' , function(e) { e.preventDefault(); return false; });
  input.addEventListener('drop', function(e) {
    var dt = e.dataTransfer;
    var file = dt.files[0];
    
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
  
  function keyChange(evt) {
    if(evt.record.username === undefined) evt.record.username = '(host)';
    if(evt.key == 'topic')
      document.querySelector('#topic input').value = evt.record.value;
    
    addMessage(
      "System", getTimeString(),
      "<b>" + evt.record.username + "</b> set the " + evt.key + " to \"" + convertMessage(evt.record.value) + "\""
    );
  };
  
  ExAPI.on('configure', function(evt) {
    ExAPI.grid('channelGrid', {
      topic : { important:true  , write:EXROLE_USER, read:EXROLE_ANYBODY },
      king  : { important:true  , write:EXROLE_HOST, read:EXROLE_ANYBODY },
      motd  : { important:false , write:EXROLE_HOST, read:EXROLE_ANYBODY },
      icon  : { important:false , write:EXROLE_HOST, read:EXROLE_ANYBODY }
    });
    
    ExAPI.grid('userGrid', {
      typing : { important:true, write:EXROLE_SELF, read:EXROLE_USER },
      speed  : { important:true, write:EXROLE_SELF, read:EXROLE_USER }
    });
    
    ExAPI.data('motd', 'Corona: This is the message of the day, the day, the day!');
    
    ExAPI.options({
      public   : true,
      maxUsers : 150,
      commands : {
        image  : EXROLE_USER,
        chat   : EXROLE_USER,
        me     : EXROLE_USER
      }
    });
  });
  
  ExAPI.on('error', function(evt) {
    addMessage('Error', getTimeString(), evt.error);
  });
  
  ExAPI.on('focus', function(evt) {
    if(evt.focus) ExAPI.dirty(false);
  });
  
  ExAPI.on('data', function(evt) { keyChange(evt); });
  ExAPI.on('udata', function(e) {
    if(e.key == 'typing') {
      var typing = Object.findAllKeys(ExAPI.channel.participants, function(p) { return (p.data.typing || {}).value; });
      displayTyping(typing);
    }
  });
  
  ExAPI.on("init", function(evt) {
    var m = addMessage("System", getTimeString(), "Welcome to #" + ExAPI.channel.name);
    Object.forEach(ExAPI.channel.data, function(k,r) { keyChange({ key:k, record:r }); });
    updateUserList();
  });
  
  ExAPI.on("join", function(evt) {
    addMessage("System", getTimeString(), "<b>" + evt.username + "</b> has joined the room");
    updateUserList();
  });
  
  ExAPI.on("leave", function(evt) {
    addMessage("System", getTimeString(), "<b>" + evt.username + "</b> has left the room");
    updateUserList();
  });
  
  ExAPI.on("push", function(evt) {
    var data = evt.data.text;
    var type = evt.data.cmd;
    
    var participant = Object.find(ExAPI.channel.participants, function(p) { return p.username == evt.username; });
    if(type == 'image') {
      var img = new Image();
      img.src = evt.data.src;
      addMessage(evt.username, getTimeString(), img, false, participant);
    } else if(type == "chat" || type == "me") {
      var m = convertMessage(data);
      addMessage(evt.username, getTimeString(), m, type == "me", participant);
      
      //<img src="http://4.bp.blogspot.com/_7UHICy8Etfo/S-RBByuucrI/AAAAAAAAJ2Y/FS-HEPCLNVw/s1600/HungryCaterpillar.JPG">
    } else if(type == "file") {
      var subcom = data.shift().toLowerCase();
      switch(subcom) {
        case "init": {
          if(!transfers[evt.handle]) transfers[evt.handle] = [];
          var t = transfers[evt.handle][data[0]] = new Transfer(data, evt.handle);
          t.onfinish = function(ft) {
          //alert(ft.chunks.join(""));
            var id = evt.handle + '@' + ft.id;
            var data = ft.chunks.join("");
            ft.message.innerHTML = '<img id="' + id + '" class=\"unzoom\" onclick=\"zoom(this, event);\" />';
            document.getElementById(id).src = "data:" + "image/jpeg" + ";base64," + btoa(data);
          };
        }; break;
        
        case "chunk": {
          transfers[evt.handle][data[0]].handleChunk(data);
        }; break;
      }
      
      return;
      
      if(!fileTransfers[evt.handle]) {
        fileTransfers[evt.handle] = [];
        fileMessages[evt.handle] = [];
        fileMeta[evt.handle] = [];
      }
      
      if(!fileTransfers[evt.handle][data[0]]) {
        fileTransfers[evt.handle][data[0]] = [];
        fileMessages[evt.handle][data[0]] = addMessage(evt.username + " <i>Sending</i>", getTimeString(), "0%");
        fileMeta[evt.handle][data[0]] = [];
      }
      
      if(data[1] == "init") {
        var id = data[0];
        data.shift();
        data.shift();
        fileMeta[evt.handle][id] = [];
        return;
      }
      
      var ft = fileTransfers[evt.handle][data[0]];
      var fm = fileMessages[evt.handle][data[0]];
      ft[data[1]] = data[3];
      
      fm.innerHTML = Math.round((data[1] + 1) / Math.ceil(data[2] / CHUNK_SIZE) * 1000) / 10 + "% (" + (ft.length * CHUNK_SIZE) + ")";
      
      if(ft.length * CHUNK_SIZE > data[2]) {
        var id = evt.handle + '@' + data[0];
        var data = ft.join("");
        fm.innerHTML = '<img id="' + id + '" class=\"unzoom\" onclick=\"zoom(this, event);\" />';
        document.getElementById(id).src = "data:" + "image/jpeg" + ";base64," + btoa(data);
      }
    }
  });
});

function displayTyping(list) {
  document.querySelector('#typing').textContent = list.length == 0 ? '' : list.join(', ') + '...';
}

var first = true;

function emoticonTitle(smiley) {
  return smiley.split("&gt;").join(">").split("&lt;").join("<").split("&amp;").join("&");
}

function escapeTitle(text) { return text; } // TODO: Vulnerability
function escapeHTML(text) {
  var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;"
  };

  return String(text).replace(/[&<>]/g, function(s) {
    return entityMap[s];
  });
}

function convertMessage(original) {
  var m = ' ' + escapeHTML(original);
  for(var i in emoticons)
    m = m.split(i).join('<img src="emoticons/' + emoticons[i] +
                        '.gif" title=\"' + escapeTitle(emoticonTitle(i)) + '\" />');
  m = m.replace(/\(flag:(\w\w)\)/, function(x, flag) {
    flag = flag.toLowerCase();
    var x = (flag.charCodeAt(0) - 96) * 16;
    var y = (flag.charCodeAt(1) - 96) * 11;
    var style = "background-position:-" + x + "px -" + y + "px";
    return "<div class=\"flag\" title=\"" + escapeTitle("(flag:" + flag + ")") + "\" style=\"" + style + "\"></div>";
  });
  
  m = m.replace(/\[img src="([^"]+)"\]|\[img\]([^\]]+)\[\/img\]/ig, "<img src=\"$1$2\" class=\"unzoom\" onclick=\"zoom(this, event);\" />");
  
  m = m.replace(/\[nbsp\]/ig, "&nbsp;");
  m = m.replace(/\[br\]/ig, "<br />");
  
  m = m.replace(/\[b\](.*?)\[\/b\]/ig, "<b>$1</b>");
  m = m.replace(/\[u\](.*?)\[\/u\]/ig, "<u>$1</u>");
  m = m.replace(/\[i\](.*?)\[\/i\]/ig, "<i>$1</i>");
  
  m = m.replace(/\[ul\](.*?)\[\/ul\]/ig, "<ul>$1</ul>");
  m = m.replace(/\[li\](.*?)\[\/li\]/ig, "<li>$1</li>");
  
  // Yeah, support a lot more here please.
  m = m.replace(/\[font((\s+[^=]+?="[^"]+")*)\](.+?)\[\/font\]/ig, function(all, params, x, content) {
    params = params.replace(/\s+([^=]+)="([^"]+)"/ig, function(all, key, value) {
      if(key == "face" || key == "size" || key == "color") return " " + key + "=\"" + value + "\"";
      return "";
    });
    return "<font" + params + ">" + content + "</font>";
  });
  
  // m = m.replace(/#([^ ']+)/, "<a href=\"#\" onclick=\"ExAPI.join('$1');\" title=\"Join '$1'\">#$1</a>");
  
  m = m.replace(/([^"])http:\/\/([^ ]+)/ig, "$1<a target=\"blank\" href=\"http://$2\">http://$2</a>");
  return m.replace(/([^\/])www.([^ ]+)/ig, "$1<a target=\"blank\" href=\"http://www.$2\">www.$2</a>").substring(1);
}

var lastSender, lastMessage;
function addMessage(sender, dateText, messageText, nobr, participant) {
  if(!ExAPI.hasFocus) {
    ExAPI.dirty(); // Yup.
    var isText = typeof messageText === 'string'
    ExAPI.notify({ body:sender + (isText ? ': ' + messageText : ' posted a picture') });
  }
  
  var same = lastSender == sender;
  lastSender = sender;
  
  var message = document.createElement("div");
  message.className = same ? "message" : "split message";
  if(sender == ExAPI.client.username) message.className += ' local';
  if(nobr) message.className += ' me';
  
  if(!same && lastMessage) lastMessage.className += ' addpad';
  lastMessage = message;
  
  if(!same || nobr) {
    var handle = document.createElement("span");
    handle.className = "handle";
    handle.textContent = sender;
    message.appendChild(handle);
  }
  
  if(!same && participant && participant.picture) {
    var img = new Image();
    img.src = participant.picture;
    img.className = 'profile-picture';
    img.width = 32;
    img.height= 32;
    message.appendChild(img);
  }
  
  var date = document.createElement("span");
  date.className = "date";
  date.innerHTML = '<span class="invisible">[ ' + sender + ' - ' + '</span>' + dateText + '<span class="invisible"> ]:&nbsp;</span>';
  
  message.appendChild(date);
  
  if(!same && !nobr) message.appendChild(document.createElement('br'));
  
  var content = document.createElement("span");
  content.className = "content";
  
  if(typeof messageText === 'string')
    content.innerHTML = messageText;
  else
    content.appendChild(messageText);
  
  if(nobr) {
    content.innerHTML = '<span class="invisible">* ' + sender + '&nbsp;</span>' + content.innerHTML;
    content.className += ' me';
  }
  
  message.appendChild(content);
  message.appendChild(document.createElement('br'));
  
  if(first) {
    message.style.border = "none";
    first = false;
  }
  
  var messages = document.getElementById("messages");
  var atBottom = messages.scrollHeight - messages.scrollTop < 50; // Should we scroll to the bottom?
  messages.insertBefore(message, document.querySelector('#typing'));
  if(atBottom) messages.scrollTop = messages.scrollHeight;
  
  return content;
}

function getTimeString(date) {
  if(!date) date = new Date();
  var t = function(s) { return s < 10 ? "0" + s : s; };
  return t(date.getHours()) + ":" + t(date.getMinutes()) + ":" + t(date.getSeconds());
}

var typingTimeout = false, localTyping = false;
var bold = false, italic = false, underline = false;
var lastKeyPress = 0;
var slidingWindow = [], averageDelta = 0.0;

function checkForEnter(e) {
  var time = new Date().getTime();
  if(lastKeyPress + 500 > time) { // Count this as a subsequent keystroke if less than 500ms
    var delta = time - lastKeyPress;
    slidingWindow.push(delta);
    while(slidingWindow.length > 100) slidingWindow.shift();
  } lastKeyPress = time;
  
  if(!localTyping) { // TODO: Only when a keyCode is supplied?
    localTyping = true;
    ExAPI.udata(ExAPI.client.username, 'typing', true);
  }
  
  if(typingTimeout) clearTimeout(typingTimeout)
  typingTimeout = setTimeout(function() {
    if(!localTyping) return;
    localTyping = false;
    ExAPI.udata(ExAPI.client.username, 'typing', false);
  }, 3000);
  
  if(e.ctrlKey || e.metaKey) {
  //var key = String.fromCharCode(e.charCode);
    var keymap = { 66: 'b', 73: 'i', 85: 'u' };
    var key = keymap[e.keyCode];
    
    if(this.selectionStart < this.selectionEnd) {
      var start = this.selectionStart;
      var end = this.selectionEnd;
      
      switch(key) {
        case "b":
        case "i":
        case "u":
          this.value = this.value.substring(0, start) + "[" + key + "]" +
                       this.value.substring(start, end) + "[/" + key + "]" +
                       this.value.substring(end); break;
          this.selectionStart = start + 3;
          this.selectionEnd = end + 3;
          this.focus();
        default: return true;
      }
    } else {
      switch(key) {
        case "b": this.value += bold ? "[/b]" : "[b]"; bold = !bold; break;
        case "i": this.value += italic ? "[/i]" : "[i]"; italic = !italic; break;
        case "u": this.value += underline ? "[/u]" : "[u]"; underline = !underline; break;
        
        case "n": this.value += "[br]"; break;
        case " ": this.value += "[nbsp]"; break;
        
        default: return true;
      }
    }
    return false;
  } // if(e.ctrlKey || e.metaKey)
  
  if(e.which != 13) return true;
  if(e.altKey) {
    this.setAttribute('rows', 5);
    return true;
  }
  
  if(this.value == '') return e.preventDefault();
  
  if(bold) this.value += "[/b]";
  if(italic) this.value += "[/i]";
  if(underline) this.value += "[/u]";
  
  this.setAttribute('rows', 1);
  e.preventDefault();
  
  localTyping = false;
  ExAPI.udata(ExAPI.client.username, 'typing', false);
  
  if(this.value[0] == '/') { // Seems like we have a command here ;D
    var command = this.value.split(' ')[0].toLowerCase();
    var data = this.value.substring(command.length + 1);
    command = command.substring(1);
    if(handleCommand(command, data)) return;
  } else ExAPI.push({ cmd:'chat', text:this.value });
  
  this.value = "";
  
  if(bold) this.value += "[b]";
  if(italic) this.value += "[i]";
  if(underline) this.value += "[u]";
  
  // TODO:2014-08-17:alex:Privacy settings?
  // Give out our typing info!
  
  averageDelta = 0.0;
  for(var i = 0; i < slidingWindow.length; ++i) averageDelta += slidingWindow[i];
  averageDelta /= slidingWindow.length * 1000; // from milliseconds to seconds
  
  ExAPI.udata(ExAPI.client.username, 'speed', averageDelta);
}

function handleCommand(command, data) {
  switch(command) {
    case 'stats': {
      var list = [];
      Object.forEach(ExAPI.channel.participants, function(p, k) {
        var speed = (p.data.speed || {}).value;
        if(typeof speed !== 'number') return;
        
        list.push([ k + ' types at ' + (1 / speed).toFixed(2) + ' keystrokes per second.']);
      });
      alert(list.length == 0 ? 'No stats available.' : list.join("\n"));
    }; break;
    case 'topic': ExAPI.data('topic', data); break;
    case 'motd': ExAPI.data('motd', data); break;
    case 'dirty': ExAPI.dirty(true); break;
    case 'notify': ExAPI.notify({ body:ExAPI.client.username + ' posted /notify' }); break;
    case 'king': ExAPI.data('king', data); break;
    case 'clear': document.getElementById("messages").innerHTML = ""; first = true; lastSender = ""; break;
    // TODO:2014-08-17:alex:A more versatile /me command.
    case 'me': ExAPI.push({ cmd:'me', text:data }); break;
    default: {
      alert('There is no such command: "/' + command + '"');
    }; return true;
  } return false;
}

function updateUserList() {
  var e = document.getElementById('users');
  e.innerHTML = "";
  
  var spans = [];
  Object.forEach(ExAPI.channel.participants, function(participant) {
    var img = new Image();
    img.src = participant.picture;
    img.width = 32;
    img.height = 32;
    
    var div = document.createElement('div');
    div.appendChild(img);
    div.appendChild(document.createTextNode(participant.username));
    div.className = 'user';
    e.appendChild(div);
  });
}

function canvasMagic(img) {
  var output = document.getElementById('output');
  
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  
  var scale = Math.sqrt(2073600 / (img.width * img.height)); // Limit resolution to FullHD
  if(scale > 1.0) scale = 1.0; // But don't scale up.
  
  canvas.width = Math.floor(img.width * scale);
  canvas.height = Math.floor(img.height * scale);
  
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  ExAPI.push({ cmd:'image', src:canvas.toDataURL('image/jpeg', 0.84) });
}