/* Stompat — selection
 * Riquadro di selezione sopra il canvas visibile, via Pointer Events (mouse + dito).
 * Le coordinate sono normalizzate 0..1 sul canvas ruotato: restano valide anche se
 * la pagina viene ridimensionata, e si convertono in pixel solo al momento del ritaglio.
 */
(function (global) {
  'use strict';

  var Stompat = global.Stompat;
  var clamp = Stompat.util.clamp;

  var HANDLE_HIT_PX = 16;  // tolleranza per afferrare un angolo
  var MIN_SIDE_PX = 8;     // sotto questa soglia la selezione viene scartata

  Stompat.selection = (function () {
    var bus = Stompat.emitter();

    var overlay = null, rectEl = null, canvas = null;
    var sel = null;          // {x,y,w,h} normalizzati
    var enabled = false;

    var mode = null;         // 'new' | 'move' | 'resize'
    var anchor = null;       // angolo fisso durante new/resize
    var grabDx = 0, grabDy = 0;

    function mount(refs) {
      overlay = refs.overlay;
      rectEl = refs.rectEl;
      canvas = refs.canvas;

      overlay.addEventListener('pointerdown', onDown);
      overlay.addEventListener('pointermove', onMove);
      overlay.addEventListener('pointerup', onUp);
      overlay.addEventListener('pointercancel', onUp);
      global.addEventListener('resize', draw);
    }

    function setEnabled(on) {
      enabled = !!on;
      overlay.style.cursor = enabled ? 'crosshair' : 'default';
    }

    /* ---------- coordinate ---------- */

    function pointOf(e) {
      var r = canvas.getBoundingClientRect();
      return {
        x: clamp((e.clientX - r.left) / r.width, 0, 1),
        y: clamp((e.clientY - r.top) / r.height, 0, 1),
        rect: r
      };
    }

    /* Quale angolo è stato afferrato? Ritorna l'angolo OPPOSTO, che resta fermo. */
    function grabbedCorner(p) {
      if (!sel) return null;
      var corners = [
        { x: sel.x, y: sel.y, opp: { x: sel.x + sel.w, y: sel.y + sel.h } },
        { x: sel.x + sel.w, y: sel.y, opp: { x: sel.x, y: sel.y + sel.h } },
        { x: sel.x, y: sel.y + sel.h, opp: { x: sel.x + sel.w, y: sel.y } },
        { x: sel.x + sel.w, y: sel.y + sel.h, opp: { x: sel.x, y: sel.y } }
      ];
      for (var i = 0; i < corners.length; i++) {
        var dx = (corners[i].x - p.x) * p.rect.width;
        var dy = (corners[i].y - p.y) * p.rect.height;
        if (Math.sqrt(dx * dx + dy * dy) <= HANDLE_HIT_PX) return corners[i].opp;
      }
      return null;
    }

    function inside(p) {
      return !!sel &&
        p.x >= sel.x && p.x <= sel.x + sel.w &&
        p.y >= sel.y && p.y <= sel.y + sel.h;
    }

    /* ---------- gesti ---------- */

    function onDown(e) {
      if (!enabled) return;
      e.preventDefault();
      var p = pointOf(e);
      var opposite = grabbedCorner(p);

      if (opposite) {
        mode = 'resize';
        anchor = opposite;
      } else if (inside(p)) {
        mode = 'move';
        grabDx = p.x - sel.x;
        grabDy = p.y - sel.y;
        rectEl.classList.add('move');
      } else {
        mode = 'new';
        anchor = { x: p.x, y: p.y };
        sel = { x: p.x, y: p.y, w: 0, h: 0 };
      }

      try { overlay.setPointerCapture(e.pointerId); } catch (err) { /* browser senza pointer capture */ }
      draw();
    }

    function onMove(e) {
      if (!mode) return;
      var p = pointOf(e);

      if (mode === 'move') {
        sel.x = clamp(p.x - grabDx, 0, 1 - sel.w);
        sel.y = clamp(p.y - grabDy, 0, 1 - sel.h);
      } else {
        sel = {
          x: Math.min(anchor.x, p.x),
          y: Math.min(anchor.y, p.y),
          w: Math.abs(p.x - anchor.x),
          h: Math.abs(p.y - anchor.y)
        };
      }

      draw();
      bus.emit('change', get());
    }

    function onUp(e) {
      if (!mode) return;
      var was = mode;
      mode = null;
      anchor = null;
      rectEl.classList.remove('move');
      try { overlay.releasePointerCapture(e.pointerId); } catch (err) { /* idem */ }

      var px = toPixels();
      if (!px || px.w < MIN_SIDE_PX || px.h < MIN_SIDE_PX) {
        clear();
        if (was === 'new') bus.emit('toosmall');
        return;
      }
      draw();
      bus.emit('commit', get());
    }

    /* ---------- disegno ---------- */

    function draw() {
      if (!rectEl) return;
      if (!sel || sel.w <= 0 || sel.h <= 0) {
        rectEl.style.display = 'none';
        return;
      }
      rectEl.style.display = 'block';
      rectEl.style.left = (sel.x * 100) + '%';
      rectEl.style.top = (sel.y * 100) + '%';
      rectEl.style.width = (sel.w * 100) + '%';
      rectEl.style.height = (sel.h * 100) + '%';
    }

    /* ---------- stato ---------- */

    function toPixels() {
      if (!sel || !canvas || !canvas.width) return null;
      var x = Math.round(sel.x * canvas.width);
      var y = Math.round(sel.y * canvas.height);
      var w = Math.round(sel.w * canvas.width);
      var h = Math.round(sel.h * canvas.height);
      // non uscire mai dal canvas, nemmeno per un pixel di troppo
      w = Math.min(w, canvas.width - x);
      h = Math.min(h, canvas.height - y);
      return { x: x, y: y, w: w, h: h };
    }

    function get() {
      if (!sel) return null;
      return { norm: { x: sel.x, y: sel.y, w: sel.w, h: sel.h }, px: toPixels() };
    }

    function clear() {
      var had = !!sel;
      sel = null;
      mode = null;
      anchor = null;
      draw();
      if (had) bus.emit('clear');
    }

    return {
      on: bus.on,
      mount: mount,
      setEnabled: setEnabled,
      get: get,
      clear: clear,
      redraw: draw,
      isEmpty: function () { return !sel; }
    };
  })();
})(window);
