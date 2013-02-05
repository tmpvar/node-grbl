var spm = require('serialport-manager'),
    split = require('split');

module.exports = function(fn) {
  spm({ log: function() {} }, function(err, manager) {

    manager.on('device', function(device) {
      var buf = '';

      if (device.info.signature.toLowerCase().indexOf('grbl') > -1) {
        device.connect(function(err, stream) {
          if (err) {
            throw err;
          }

          stream.on('data', function(d) {
            buf += d.toString();

            var parts = buf.replace(/\r/g, '').split('\n');
            buf = parts.pop();

            parts.forEach(function(part) {
              part = part.trim();
              part && stream.emit('line', part);
            });
          });

          device.info.version = device.info.signature.match(/ ([0-9]+\.[0-9\.a-z]+)/)[1];
          stream.info = device.info;

          fn(stream);
        });
      }
    });
  });
};
