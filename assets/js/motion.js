/* Stompat — motion
 * Fa entrare le cose man mano che arrivano a schermo: ogni blocco riceve la
 * classe "in" quando entra nella finestra, e il CSS fa il resto (riga che si
 * disegna, numero che sale, contenuto che arriva dal basso).
 * In più il contapagine gira come un rullo quando si cambia pagina.
 * Senza IntersectionObserver, o con "riduci movimento" attivo, non succede nulla
 * e la pagina resta tutta visibile.
 */
(function (global) {
  'use strict';

  var STAGGER_MS = 70;      // scarto fra blocchi che entrano insieme
  var SETTLE_MS = 1400;     // dopo l'ingresso il ritardo va tolto, o resta sui cambi di stato

  var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in global) || reduce) return;

  var root = document.documentElement;
  root.classList.add('js-motion');

  function start() {
    var io = new global.IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);
        el.style.transitionDelay = (n++ * STAGGER_MS) + 'ms';
        el.classList.add('in');
        global.setTimeout(function () { el.style.transitionDelay = ''; }, SETTLE_MS);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });

    var targets = document.querySelectorAll('.panel, .panel-body > *:not(.label):not(.status), .wrap > footer');
    for (var i = 0; i < targets.length; i++) io.observe(targets[i]);
  }

  function $(id) { return document.getElementById(id); }

  /* ---------- contapagine a rullo ---------- */
  function rollCounter() {
    var count = $('pageCount');
    if (!count || !global.MutationObserver) return;
    var last = null;
    new global.MutationObserver(function () {
      var m = /(\d+)\s*\/\s*\d+/.exec(count.textContent);
      var n = m ? +m[1] : null;
      var prev = last;
      last = n;
      if (n === null || prev === null || n === prev) return;
      count.classList.remove('roll-up', 'roll-down');
      void count.offsetWidth;                        // fa ripartire l'animazione
      count.classList.add(n > prev ? 'roll-up' : 'roll-down');
    }).observe(count, { childList: true, characterData: true, subtree: true });
  }

  function init() {
    start();
    rollCounter();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
