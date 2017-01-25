var split = require('split');
var SerialPort = require('serialport');
var duplex = require('duplexer');
var through = require('through');

function open(options, fn) {
  var sp = new SerialPort(options.p, {
    baudrate: 9600,
    parser: SerialPort.parsers.readline("\n")
  });

  sp.end = function() {};

  sp.once('open', function() {
    console.log('open')
    sp.once('data', function header(line) {
      console.log('data', line)
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
    SerialPort.list(function(e, ports) {
      if (e) {
        throw e;
      }

      var arduinos = ports.filter(function(port) {

        return String(port.manufacturer).toLowerCase().indexOf('arduino') > -1;
      });

      if (arduinos.length > 1) {
        arduinos.forEach(function(arduino) {
          console.log('grbl -p', arduino.comName);
        });
        process.exit();
      } else {
        options.p = arduinos[0].comName;
        open(options, fn);
      }
    });
  }
};
