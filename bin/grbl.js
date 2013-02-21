#!/usr/bin/env node

var grbl = require('../'),
    pkg = require('../package.json'),
    argv = require('optimist').argv,
    colors = require('colors'),
    repl = require('repl'),
    split = require('split'),
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

  // Stream to the machine from stdin
  if (argv.i) {
    var lines = [], start = Date.now(), started = false, end = false, currentCommand = null;

    var nextLine = function() {
      if (lines.length === 0) {
        if (end) {
          var timer = null;
          machine.pipe(split()).on('data', function(status) {
            if (status[0] === '<') {
              clearTimeout(timer);
              if (status.toLowerCase().indexOf('idle') > -1) {
                console.log('done in', (Date.now()-start)/1000, 'seconds');
                machine.destroy();
                process.exit();
              } else {
                setTimeout(function statusTick() {
                  machine.write('?')
                }, 100);
              }
            }
          });

          machine.write('?')
        } else {
          setTimeout(nextLine, 10);
        }


        return;
      }

      var line = lines.shift();
      currentCommand = line;
      machine.write(line + '\n');

    };

    machine.pipe(split()).on('data', function(d) {

      if (d.indexOf('ok') > -1) {
        console.log(currentCommand.grey,'->'.grey, d.yellow)
        nextLine();
      }
    });

    process.stdin.pipe(split()).on('data', function(line) {
      // TODO: discard invalid gcode
      lines.push(line);
      if (!started) {
        started = true;
        nextLine();
      }
    });

    process.stdin.on('end', function() {
      end = true;
    });

    process.stdin.resume();

    return;
  }



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
