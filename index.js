var
  Hook        = require('hook.io').Hook,
  SerialPort  = require('serialport').SerialPort,
  parsers     = require('serialport').parsers,
  glob        = require('glob'),
  hook        = null, //new Hook({ name : 'grbl', debug : true });
  repl        = require('repl'),
  argv        = require('optimist').argv,
  colors      = require('colors');

require('cdir');

module.exports = function() {
  findSerialPort({}, function(err, sp) {
    if (err) {
      console.log('ERROR:', err);
      return;
    }

    repl.start('grbl> ', null, function evil(cmd, r, name, fn) {
      cmd = cmd.replace(/^\(|\)$/g, '');

      repl.repl.outputStream.write('\n');
      sp.write(cmd);

      // TODO: transmit to hookio
      //fn(null)
    }, true, true);

    sp.on('data', function(data) {
      if (!data) { return; }
      var matches = data.match(/(error|ok|\$)/i);
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
        repl.repl.outputStream.write((data[color] || data) + '\n');

        if (matches[0] === 'ok' || matches[0] === 'error' || data.substring(0,3) === "'$'") {
          repl.repl.outputStream.write('\n');
          repl.repl.displayPrompt();
        }

      } else {
        repl.repl.outputStream.write( data + '\n');
      }
    });

  });
};

var findSerialPort = module.exports.findSerialPort = function(options, fn) {
  var found = false;
  // Find serialport
  glob('/dev/tty.usb*', function(e, matches) {
    matches.forEach(function(v) {
      if (!found) {
        // TODO: actually query the port for 'grbl' string
        // TODO: consider the problems this may cause if connecting to a running
        //       machine.
        fn(null, new SerialPort(v, {
          parser: parsers.readline("\n")
        }));
        found = true;
      }
    });
  });
};

module.exports();