//global.$ = $;
$(document).ready(function() {
  var gui = require('nw.gui');
  var win = gui.Window.get();
  
  var nativeMenuBar = new gui.Menu({ type: "menubar" });
  if(nativeMenuBar.createMacBuiltin) {
    nativeMenuBar.createMacBuiltin("My App");
    win.menu = nativeMenuBar;
  }
  
  win.setBadgeLabel(""); // In case of refresh.
});