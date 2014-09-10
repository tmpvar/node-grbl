var split = require('split');
var serialport = require('serialport');
var duplex = require('duplexer');
var through = require('through');

function open(options, fn) {
  var sp = new serialport.SerialPort(options.p, {
    baudrate: 115200,
    parser: serialport.parsers.readline("\n")
  });

  sp.end = function() {};

  sp.once('open', function() {
    sp.once('data', function header(line) {
      line = line.toString().trim();

      if (!line) {
        return sp.once('data', header);
      }

      var match = line.match(/grbl (\d*\.\d[^ ]*)/i);
      if (match) {
        sp.info = {
          version : match[1]
        };

        fn(sp);
      } else {
        console.log("that arduino doesn't have grbl on it!");
        process.exit();
      }
    });
  });
}

module.exports = function(options, fn) {

  if (typeof options === 'function' && !fn) {
    fn = options;
    options = {};
  }

  // connect to a known port
  if (options.p) {
    open(options, fn);
  } else {
    serialport.list(function(e, ports) {
      if (e) {
        throw e;
      }

      var arduinos = ports.filter(function(port) {
        return port.manufacturer.toLowerCase().indexOf('arduino') > -1;
      });

      if (arduinos.length > 1) {
        arduinos.forEach(function(arduino) {
          console.log('grbl -p', arduino.comName);
        });
        process.exit();
      } else {
        options.p = arduinos[0].commName;
        open(options, fn);
      }
    });
  }
};
