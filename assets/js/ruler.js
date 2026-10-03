/* Stompat — ruler
 * Righelli in millimetri lungo il bordo alto e sinistro della pagina, in scala
 * reale: qui si calcola quanti px a schermo vale un millimetro di carta e si
 * scrivono i numeri; le tacche le disegna il CSS a partire da --mm.
 */
(function (global) {
  'use strict';

  var Stompat = global.Stompat;
  var view = Stompat.view;

  var MIN_LABEL_GAP_PX = 34;          // sotto questa distanza i numeri si toccano
  var STEPS = [10, 20, 50, 100];      // passi possibili fra un numero e l'altro, in mm

  var holder = Stompat.util.$('holder');
  var canvas = Stompat.util.$('viewCanvas');
  if (!holder || !canvas) return;

  var rulerX = make('ruler ruler-x');
  var rulerY = make('ruler ruler-y');
  var pending = false;

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

  view.on('composed', schedule);
  view.on('rendered', schedule);
  global.addEventListener('resize', schedule);
  // cambia anche quando la colonna si stringe
  if (global.ResizeObserver) new global.ResizeObserver(schedule).observe(canvas);
})(window);
