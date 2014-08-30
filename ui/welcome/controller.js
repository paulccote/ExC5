var debugClient;
$(window).unload(function() {
  if(debugClient) debugClient.logout();
});

var scope = Controller.scope('welcome');

function addBackButton(e) {
  var backBtn = document.createElement('span');
  backBtn.style.marginTop = '20px';
  backBtn.className = 'button';
  backBtn.innerHTML = '&laquo; back';
  backBtn.onclick = function() { MainContext.back(); };
  e.appendChild(backBtn);
}

scope.view('main', function(element) {
  $(element).find('.nav-btn').click(function() {
    MainContext.navigate(Controller.view('welcome/' + this.getAttribute('data-view')));
  });
});

scope.view('about', function(element) {
  addBackButton(element);
  return; // ...
  
  var dancer = new Sprite('anim/dancing_anim@2x.png').setFPS(15);
  $('#about_page').append('<br />').append(dancer.element).append('<br />');
});

scope.view('host', function(element) {
//addBackButton(element);
  this._show = function(cb) {
    debugHost = new ExHost(8042);
    cb();
  };
});

scope.view('auth', function(viewElement) {
  addBackButton(viewElement);
  
  var viewModel = {
    username : ko.observable('alex').extend({ minLength:3, required:true }),
    password : ko.observable('test').extend({ minLength:4, required:true }),
    host     : ko.observable('http://cappucci.noip.me:8042/').extend({ required:true })
  };
  
  ko.validation.configure({
    decorateElement: true,
    errorElementClass: 'error',
  });

  viewModel.errors = ko.validation.group(viewModel);
  ko.applyBindings(viewModel);
  
  function createClient(action) {
    var register = action == 'register';
    var connecting = new Job(),
        authAction;
    
    LoadScreen.addJob(connecting, 'Connecting to server', 'tumbleweed');
    
    var c = debugClient = new ExClient(viewModel.host());
    c.socket.on('connect', function() {
      authAction = new Job();
      LoadScreen.addJob(authAction, register ? 'Registering' : 'Logging in');
      
      c[register ? 'register' : 'authenticate'](viewModel.username(), viewModel.password());
      
      connecting.finish();
    });

    c.socket.on('connect_error', function(e) {
      viewModel.host.error('Coult not connect: ' + e);
      viewModel.host.__valid__(false);
      viewModel.errors.showAllMessages(true);
      
      connecting.finish();
    });

    function joinError(register) {
      var errorset = register ? {
        username: 'This username exists already.',
        password: 'This password is horrible.'
      } : {
        username: 'This username does not exist.',
        password: 'This password is wrong.'
      };
      
      return function(field) {
        $(viewElement).effect('shake');

        viewModel[field].error(errorset[field]);
        viewModel[field].__valid__(false);

        authAction.finish();
      };
    }
    
    c.socket.on('session-error', joinError(false));
    c.socket.on('register-error', joinError(true));
    
    c.socket.on('login', function() {
      // LoadScreen.configureAndShow('#join_page', 'Congratulations', 'nod', 10);
      authAction.finish();
      
      MainContext.navigate(Controller.view('loggedin/main'));
    });
  }
  
  $('#settings_panel').tabs().hide();
  
  $('#gear').hide().click(function() {
    $('#settings_panel').show();
  });
  
  $(viewElement).find('.action-btn').click(function(e) {
    for(var k in viewModel) // revalidate everything
      if(viewModel[k].__valid__ !== undefined)
        ko.validation.validateObservable(viewModel[k]);
    
    if(viewModel.errors().length > 0) {
      $(viewElement).effect('shake');
      viewModel.errors.showAllMessages(true);
      
      return;
    }
    
    $('#join_page input.error').removeClass('error');
    $('.error').hide();
    
    // Connect...
    
    createClient(this.getAttribute('data-action'));
  });
});