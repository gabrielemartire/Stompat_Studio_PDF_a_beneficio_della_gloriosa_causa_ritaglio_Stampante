/* Sito galattico — ruler
 * Righelli in millimetri lungo il bordo alto e sinistro della pagina, in scala
 * reale: qui si calcola quanti px a schermo vale un millimetro di carta e si
 * scrivono i numeri; le tacche le disegna il CSS a partire da --mm.
 * Il mirino segue il puntatore sopra la pagina e ne riporta i millimetri sui righelli.
 */
(function (global) {
  'use strict';

  var SitoGalattico = global.SitoGalattico;
  var view = SitoGalattico.view;

  var MIN_LABEL_GAP_PX = 34;          // sotto questa distanza i numeri si toccano
  var STEPS = [10, 20, 50, 100];      // passi possibili fra un numero e l'altro, in mm

  var holder = SitoGalattico.util.$('holder');
  var canvas = SitoGalattico.util.$('viewCanvas');
  if (!holder || !canvas) return;

  var rulerX = make('ruler ruler-x');
  var rulerY = make('ruler ruler-y');
  var crossV = make('xhair xhair-v');
  var crossH = make('xhair xhair-h');
  var pending = false;
  var scale = 0;                      // px a schermo per millimetro

  function make(cls) {
    var d = document.createElement('div');
    d.className = cls;
    d.setAttribute('aria-hidden', 'true');
    holder.appendChild(d);
    return d;
  }

  function labels(el, lengthPx, pxPerMm, step, side) {
    var html = '';
    for (var mm = 0; mm * pxPerMm < lengthPx - 12; mm += step) {
      html += '<span style="' + side + ':' + (mm * pxPerMm).toFixed(1) + 'px">' + mm + '</span>';
    }
    el.innerHTML = html;
  }

  function update() {
    pending = false;
    var ppp = view.getPxPerPoint();
    var rect = canvas.getBoundingClientRect();
    if (!ppp || !canvas.width || !rect.width) return;

    // px del canvas -> punti PDF -> mm, poi riportato alla dimensione a schermo
    var pxPerMm = (rect.width / canvas.width) * ppp * 72 / 25.4;
    holder.style.setProperty('--mm', pxPerMm.toFixed(4) + 'px');
    scale = pxPerMm;

    var step = STEPS[STEPS.length - 1];
    for (var i = 0; i < STEPS.length; i++) {
      if (STEPS[i] * pxPerMm >= MIN_LABEL_GAP_PX) { step = STEPS[i]; break; }
    }
    labels(rulerX, rect.width, pxPerMm, step, 'left');
    labels(rulerY, rect.height, pxPerMm, step, 'top');
  }

  function schedule() {
    if (pending) return;
    pending = true;
    global.requestAnimationFrame(update);
  }

  /* ---------- mirino ---------- */
  crossV.appendChild(document.createElement('b'));
  crossH.appendChild(document.createElement('b'));
  var overlay = SitoGalattico.util.$('overlay');
  if (overlay) {
    overlay.addEventListener('pointermove', function (e) {
      var rect = canvas.getBoundingClientRect();
      var x = SitoGalattico.util.clamp(e.clientX - rect.left, 0, rect.width);
      var y = SitoGalattico.util.clamp(e.clientY - rect.top, 0, rect.height);
      crossV.style.left = x + 'px';
      crossH.style.top = y + 'px';
      if (scale) {
        crossV.firstChild.textContent = Math.round(x / scale);
        crossH.firstChild.textContent = Math.round(y / scale);
      }
      holder.classList.add('xhair-on');
    });
    overlay.addEventListener('pointerleave', function () {
      holder.classList.remove('xhair-on');
    });
  }

  view.on('composed', schedule);
  view.on('rendered', schedule);
  global.addEventListener('resize', schedule);
  // cambia anche quando la colonna si stringe
  if (global.ResizeObserver) new global.ResizeObserver(schedule).observe(canvas);
})(window);
