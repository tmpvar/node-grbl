var spm = require('serialport-manager'),
    split = require('split');

var serialport = require('serialport');

module.exports = function(options, fn) {

  if (typeof options === 'function' && !fn) {
    fn = options;
    options = {};
  }

  // connect to a known port
  if (options.p) {
    var sp = new serialport.SerialPort(options.p);
    var b = '';
    sp.on('data', function header(d) {

      b += d.toString();
      var match = b.match(/grbl (\d*\.\d[^ ]*)/i);
      if (match) {
        sp.info = {
          version : match[1]
        };

        sp.removeListener('data', header);



        fn(sp);
      }
    });
  } else {

    spm(options, function(err, manager) {

      manager.on('device', function(device) {
        var buf = '';

        if (device.info.signature.toLowerCase().indexOf('grbl') > -1) {
          device.connect(function(err, stream) {
            if (err) {
              throw err;
            }

            var statusTimer = setInterval(function() {
              stream.write('?');
            }, 100);

            stream.on('end', function() {
              clearInterval(statusTimer);
            });

            device.info.version = device.info.signature.match(/ ([0-9]+\.[0-9\.a-z]+)/)[1];
            stream.info = device.info;

            fn(stream);
          });
        }
      });
    });
  }
};
