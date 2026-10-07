#!/usr/bin/env node
'use strict';
var args = process.argv.slice(2);
if (args.indexOf('--version') >= 0 || args.indexOf('-v') >= 0) { console.log('opc-tui ' + require('../package.json').version); process.exit(0); }
if (!process.stdin.isTTY || !process.stdout.isTTY) { console.log('opc-tui needs an interactive terminal.'); process.exit(0); }
// --full 已弃用：统一走真・流式界面（原全屏 Demo 已移除）
require('../src/simple.js').run(args);
