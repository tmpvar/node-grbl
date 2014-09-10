#!/usr/bin/env node

var grbl = require('../'),
    pkg = require('../package.json'),
    argv = require('optimist').argv,
    colors = require('colors'),
    repl = require('repl'),
    split = require('split'),
    skateboard = require('skateboard'),
    r;

if (!argv.i) {
  console.log([
  '                        _/        _/   ',
  '     _/_/_/  _/  _/_/  _/_/_/    _/    ',
  '  _/    _/  _/_/      _/    _/  _/     ',
  ' _/    _/  _/        _/    _/  _/      ',
  '  _/_/_/  _/        _/_/_/    _/       ',
  '     _/                                ',
  '_/_/                 repl v' + pkg.version].join('\n').grey)
} else {
  process.stdin.pause();
}

console.log('\nWaiting for serial connection..'.yellow);

process.stdin.pause();

grbl(argv, function(machine) {

  var skateLines = [], pending = false;
  skateboard({ port: 7007 }, function(stream) {

    stream.pipe(split()).on('data', function(d) {
      var d = d.trim();
      if (d.length) {
        d = d + '\n';

        if (!pending) {
          machine.write(d);
          pending = true;
        } else {
          skateLines.push(d);
        }
      }
    });

    machine.on('data', function(data) {
      if (data.trim() === 'ok') {
        if (skateLines.length) {
          machine.write(skateLines.shift());
        } else {
          pending = false;
        }
      }

      stream.write(data.toString());
    });
  });

  var status = {};
  console.log(('connected! (v' + machine.info.version + ')').green);

  // Stream to the machine from stdin
  if (argv.i) {

    var lines = [], start = Date.now(), started = false, end = false, currentCommand = null;

    var doneTimer = null;
    var writeLine = function() {

      if (doneTimer) {
        clearTimeout(doneTimer);
      }

      if (lines.length) {

        var line;
        while (lines.length && (!line || !line.trim().length)) {
          line = lines.shift();
        }

        currentCommand = line;
        machine.write(line + '\n');
      }

      if (!lines.length && started && end) {

        doneTimer = setTimeout(function tick() {

          console.log('done in', (Date.now()-start)/1000, 'seconds');
          machine.destroy();
          process.exit();
        }, 5000);
      }
    }

    machine.on('data', function(d) {
      d = d.trim();
      if (d.indexOf('ok') > -1 && currentCommand) {
        console.log(currentCommand.grey + '->'.grey + ' ' + d.yellow)
        currentCommand = null;
        writeLine();
      } else {
        console.log(d.green);
      }
    });

    process.stdin.pipe(split()).on('data', function(line) {
      // TODO: discard invalid gcode
      lines.push(line);
      if (!started) {
        started = true;
        writeLine();
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
        var clean = line.replace('/[\r\n]+/g', '').replace(/^\(|\)$/g,'').trim();

        r.disablePrompt = true
        r.emit('command', clean);
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
    console.log('command', line)
    if (!line.length) {
      return;
    }

    if (line === 'reset') {
      machine.write(new Buffer([24]));
    } else {
      machine.write(line.trim() + '\n');
    }
  });

  r.on('exit', function() {
    process.exit();
  });

  var count = 0;
  machine.on('data', function(data) {
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
          var parts = data.replace(/\<|\>/g, '').split(',');
          status = {
            raw : data,
            status : parts.shift().toLowerCase(),
            position: {
              machine : {
                x : parseFloat(parts.shift().replace(/^[a-z:]+/gi,'')).toFixed(3),
                y : parseFloat(parts.shift()).toFixed(3),
                z : parseFloat(parts.shift()).toFixed(3),
              },
              work : {
                x : parseFloat(parts.shift().replace(/^[a-z:]+/gi,'')).toFixed(3),
                y : parseFloat(parts.shift()).toFixed(3),
                z : parseFloat(parts.shift()).toFixed(3),
              }
            }
          };

          console.log(status.status.toUpperCase().grey, 'Machine'.white + '('.grey + [
              status.position.machine.x,
              status.position.machine.y,
              status.position.machine.z
            ].join(', ').yellow + ')'.grey,
             'Work'.white + '('.grey + [
              status.position.work.x,
              status.position.work.y,
              status.position.work.z
            ].join(', ').yellow + ')'.grey
          );

          prompt = false;
          return;
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
