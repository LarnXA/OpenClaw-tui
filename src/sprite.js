'use strict';
// Pixel lobster (OpenClaw mascot) as a 26x18 grid. Values:
// 0 empty, 1 outline, 2 red, 4 cyan eye, 5 dark socket
var LW = 26, LH = 18;
function buildMap(f) {
  f = f || {};
  var m = [], x, y, xx, yy;
  for (y = 0; y < LH; y++) { m.push([]); for (x = 0; x < LW; x++) m[y].push(0); }
  function set(a, b, v) { a = Math.round(a); b = Math.round(b); if (a >= 0 && a < LW && b >= 0 && b < LH) m[b][a] = v; }
  function ell(cx, cy, rx, ry, v) { for (yy = 0; yy < LH; yy++) for (xx = 0; xx < LW; xx++) { var dx = (xx - cx) / rx, dy = (yy - cy) / ry; if (dx * dx + dy * dy <= 1) set(xx, yy, v); } }
  function rect(x0, y0, x1, y1, v) { for (yy = y0; yy <= y1; yy++) for (xx = x0; xx <= x1; xx++) set(xx, yy, v); }
  function line(x0, y0, x1, y1, v) { var n = 16, i, t; for (i = 0; i <= n; i++) { t = i / n; set(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, v); } }
  var s = f.snap ? -1 : 0;
  line(11, 5, 8, 1, 2); line(15, 5, 18, 1, 2);
  ell(3.2, 6.4 + s, 2.2, 1.6, 2); ell(3.2, 9.8 + s, 2.2, 1.6, 2);
  ell(22.8, 6.4 + s, 2.2, 1.6, 2); ell(22.8, 9.8 + s, 2.2, 1.6, 2);
  ell(13, 10.5, 5.3, 5.1, 2);
  ell(10.2, 9, 1.15, 1.15, 5); ell(15.8, 9, 1.15, 1.15, 5);
  if (f.blink) { rect(10, 9, 11, 9, 5); rect(15, 9, 16, 9, 5); }
  else { ell(10.2, 9, 0.55, 0.55, 4); ell(15.8, 9, 0.55, 0.55, 4); }
  var o = [];
  for (y = 0; y < LH; y++) { o.push([]); for (x = 0; x < LW; x++) o[y].push(0); }
  for (y = 0; y < LH; y++) for (x = 0; x < LW; x++) {
    if (m[y][x] !== 0) continue;
    var n = false;
    if (x > 0 && m[y][x - 1] !== 0) n = true;
    if (x < LW - 1 && m[y][x + 1] !== 0) n = true;
    if (y > 0 && m[y - 1][x] !== 0) n = true;
    if (y < LH - 1 && m[y + 1][x] !== 0) n = true;
    if (n) o[y][x] = 1;
  }
  for (y = 0; y < LH; y++) for (x = 0; x < LW; x++) if (o[y][x]) m[y][x] = 1;
  return m;
}
var COL = {
  1: [58, 13, 13], 2: [255, 77, 77], 2.5: [217, 47, 47], 4: [0, 229, 204], 5: [22, 6, 10]
};
function colorOf(v, y) {
  if (v === 0) return null;
  if (v === 1) return COL[1];
  if (v === 4) return COL[4];
  if (v === 5) return COL[5];
  return y < 9 ? [255, 90, 90] : [217, 47, 47];
}
// Render into a Screen using half-block characters (2 vertical px per cell).
// top-left at (x,y), each sprite row pairs -> screen row.
function draw(sc, x, y, f) {
  var m = buildMap(f), row, col;
  for (row = 0; row < LH; row += 2) {
    for (col = 0; col < LW; col++) {
      var t = colorOf(m[row][col], row);
      var b = (row + 1 < LH) ? colorOf(m[row + 1][col], row + 1) : null;
      if (!t && !b) continue;
      if (t && b) sc.put(x + col, y + (row >> 1), '\u2580', t, b, false);
      else if (t) sc.put(x + col, y + (row >> 1), '\u2580', t, null, false);
      else sc.put(x + col, y + (row >> 1), '\u2584', b, null, false);
    }
  }
}
function sampleColor(m, x0, x1, y0, y1) {
  var counts = {}, best = 0, bestc = 0, y, x;
  for (y = y0; y < y1; y++) for (x = x0; x < x1; x++) {
    var v = m[y][x]; if (v === 0) continue;
    counts[v] = (counts[v] || 0) + 1;
    if (counts[v] > bestc) { bestc = counts[v]; best = v; }
  }
  return best ? colorOf(best, Math.floor((y0 + y1) / 2)) : null;
}
function drawScaled(sc, x, y, cols, pxRows, f) {
  var m = buildMap(f), cx, py;
  for (py = 0; py < pxRows; py += 2) {
    for (cx = 0; cx < cols; cx++) {
      var sx0 = Math.floor(cx * LW / cols), sx1 = Math.max(sx0 + 1, Math.floor((cx + 1) * LW / cols));
      var ty0 = Math.floor(py * LH / pxRows), ty1 = Math.max(ty0 + 1, Math.floor((py + 1) * LH / pxRows));
      var t = sampleColor(m, sx0, sx1, ty0, ty1), b = null;
      if (py + 1 < pxRows) {
        var by0 = Math.floor((py + 1) * LH / pxRows), by1 = Math.max(by0 + 1, Math.floor((py + 2) * LH / pxRows));
        b = sampleColor(m, sx0, sx1, by0, by1);
      }
      if (!t && !b) continue;
      var sy = y + (py >> 1), sx = x + cx;
      if (t && b) sc.put(sx, sy, '\u2580', t, b, false);
      else if (t) sc.put(sx, sy, '\u2580', t, null, false);
      else sc.put(sx, sy, '\u2584', b, null, false);
    }
  }
}
module.exports = { draw: draw, drawScaled: drawScaled, buildMap: buildMap, LW: LW, LH: LH, rows: Math.ceil(LH / 2) };
