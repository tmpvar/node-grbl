var spm = require('serialport-manager'),
    split = require('split');

module.exports = function(fn) {
  spm(function(err, conn, devices) {
    conn.setMaxListeners(3);
    var device = false;

    for (var i = 0, l = devices.length; i<l; i++) {
      device = devices[i];

      if (device.signature.toLowerCase().indexOf('grbl') > -1) {
        break;
      }

      device = false;
    }

    if (!device) {
      conn.destroy();
    } else {
      conn.write(device.comName + '\n');
      var buf = '';
      conn.on('data', function(d) {

        buf += d.toString();

        var parts = buf.replace(/\r/g, '').split('\n');
        buf = parts.pop();

        parts.forEach(function(part) {
          part = part.trim();
          part && conn.emit('line', part);
        });
      });

      fn(conn);
    }
  });
};
