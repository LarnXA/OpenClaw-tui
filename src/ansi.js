'use strict';
// ---- ANSI helpers. Colors are [r,g,b] arrays, or a number (256 index). ----
var _tc = null;
function detectTruecolor() {
  if (_tc !== null) return _tc;
  var ct = (process.env.COLORTERM || '').toLowerCase();
  var tp = (process.env.TERM_PROGRAM || '').toLowerCase();
  var term = (process.env.TERM || '').toLowerCase();
  var yes = ct === 'truecolor' || ct === '24bit' || !!process.env.WT_SESSION ||
            tp === 'vscode' || tp === 'windows_terminal' ||
            term.indexOf('256color') >= 0 || term.indexOf('kitty') >= 0 || term.indexOf('ghostty') >= 0;
  _tc = yes;
  return yes;
}
function setTruecolor(v) { _tc = !!v; }
function rgbTo256(r, g, b) {
  if (Math.abs(r - g) < 8 && Math.abs(g - b) < 8) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round(((r - 8) / 247) * 24) + 232;
  }
  return 16 + 36 * Math.round(r / 255 * 5) + 6 * Math.round(g / 255 * 5) + Math.round(b / 255 * 5);
}
function fg(c) {
  if (c === null || c === undefined) return '';
  if (typeof c === 'number') return '\u001b[38;5;' + c + 'm';
  if (detectTruecolor()) return '\u001b[38;2;' + c[0] + ';' + c[1] + ';' + c[2] + 'm';
  return '\u001b[38;5;' + rgbTo256(c[0], c[1], c[2]) + 'm';
}
function bg(c) {
  if (c === null || c === undefined) return '';
  if (typeof c === 'number') return '\u001b[48;5;' + c + 'm';
  if (detectTruecolor()) return '\u001b[48;2;' + c[0] + ';' + c[1] + ';' + c[2] + 'm';
  return '\u001b[48;5;' + rgbTo256(c[0], c[1], c[2]) + 'm';
}
var U = {
  altOn: '\u001b[?1049h', altOff: '\u001b[?1049l',
  curHide: '\u001b[?25l', curShow: '\u001b[?25h',
  clear: '\u001b[2J', home: '\u001b[H',
  reset: '\u001b[0m', bold: '\u001b[1m', dim: '\u001b[2m', rev: '\u001b[7m',
  mouseOn: '\u001b[?1000h\u001b[?1006h', mouseOff: '\u001b[?1000l\u001b[?1006l'
};
module.exports = { fg: fg, bg: bg, rgbTo256: rgbTo256, detectTruecolor: detectTruecolor, setTruecolor: setTruecolor, U: U };
