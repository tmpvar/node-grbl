#!/usr/bin/env node

var grbl = require('../'),
    pkg = require('../package.json'),
    argv = require('optimist').argv,
    colors = require('colors'),
    repl = require('repl'),
    r;

console.log([
'                        _/        _/   ',
'     _/_/_/  _/  _/_/  _/_/_/    _/    ',
'  _/    _/  _/_/      _/    _/  _/     ',
' _/    _/  _/        _/    _/  _/      ',
'  _/_/_/  _/        _/_/_/    _/       ',
'     _/                                ',
'_/_/                 repl v' + pkg.version].join('\n').grey)


console.log('\nWaiting for serial connection..'.yellow);

grbl(function(machine) {
  console.log(('connected! (v' + machine.info.version + ')').green);

  if (!r) {
    r = repl.start({
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

      r.displayPrompt = function(change) {

        if (typeof change !== 'undefined') {
          r.disablePrompt = !change;
        }

        if (r.disablePrompt) {
          return;
        }
        displayPrompt.call(r);
      };

    })(r.displayPrompt);

    r.disablePrompt = true;
  }

  r.displayPrompt(true);

  machine.on('end', function() {
    r.removeAllListeners('command');
  });

  r.on('command', function(line) {
    machine.write(line.trim() + '\n');
  });

  var count = 0;
  machine.on('line', function(data) {
    var matches = data.match(/(error|ok|\$|<)/i), color;
    if (matches) {
      var color, prompt = true;
      switch (matches[0]) {
        case 'ok':
          color = 'green';
        break;

        case 'error':
          color = 'red';
        break;

        case '$':
          color = 'yellow';
          prompt = false;
        break;

        case '<':
          color = "cyan";
          prompt = false;
        break;
      }
    }

    if (color) {
      console.log(data[color]);
    } else {
      console.log(data);
    }
    r.displayPrompt(prompt);
  });

  machine.on('end', function() {
    console.log('\ndisconnected..'.red);
    r.displayPrompt(false);
  });
});
