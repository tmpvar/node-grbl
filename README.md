# node-grbl

Communicate with grbl running on an arduino

## Use

### Global

    npm install -g grbl
    grbl

now you have a repl to your machine!

### Library

`npm install grbl`

#### Basic example
```javascript

var grbl = require('grbl');

grbl(function(machine) {
  process.stdin.pipe(machine);
  process.stdin.resume();
  machine.on('line', function(line) {
    process.stdout.write('line:' + line + '\n');
  });
});

```

## License

MIT