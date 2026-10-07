#!/usr/bin/env node
'use strict';
var args = process.argv.slice(2);
if (args.indexOf('--version') >= 0 || args.indexOf('-v') >= 0) { console.log('opc-tui ' + require('../package.json').version); process.exit(0); }
if (!process.stdin.isTTY || !process.stdout.isTTY) { console.log('opc-tui needs an interactive terminal.'); process.exit(0); }
if (args.indexOf('--full') >= 0) { require('../src/app.js').main(args); } else { require('../src/simple.js').run(args); }
