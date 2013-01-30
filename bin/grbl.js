#!/usr/bin/env node

var grbl = require('../'),
    argv = require('optimist').argv,
    colors = require('colors'),
    repl = require('repl');

var r = repl.start({
  prompt: 'grbl> ',
  eval : function evil(line, ctx, name, fn) {
    r.disablePrompt = true
    r.emit('command', line.replace('/[\r\n]+/g', '').replace(/^\(|\)$/g,''));
    fn(null);
    r.disablePrompt = false
  },
  terminal : true,
  useGlobal : true,
  ignoreUndefined : true
});

(function(displayPrompt) {

  r.displayPrompt = function() {
    if (r.disablePrompt) {
      return;
    }
    displayPrompt.call(r);
  };

})(r.displayPrompt)
grbl(function(machine) {

  console.log('\nconnected!'.green);
  r.displayPrompt();

  r.on('command', function(line) {
    machine.write(line.trim() + '\n');
  });

  var count = 0;
  machine.on('line', function(data) {
    var matches = data.match(/(error|ok|\$)/i), color;
    if (matches) {
      var color;
      switch (matches[0]) {
        case 'ok':
          color = 'green';
        break;

        case 'error':
          color = 'red';
        break;

        case '$':
          color = 'yellow';
        break;
      }
    }

    if (color) {
      console.log(data[color]);
    } else {
      console.log(data);
    }
    r.displayPrompt();
  });

  machine.on('close', function() {
    console.log('disconnected..'.red);
  });

});