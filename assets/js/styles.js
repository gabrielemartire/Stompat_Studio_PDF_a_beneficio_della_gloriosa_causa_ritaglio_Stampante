/* Stompat — selettore di stile
   Prova grafica: i tasti 1-2 cambiano al volo il vestito della pagina.
   1 è la veste di base (stompat.css); le altre vivono in <html data-style="N">
   e hanno le regole in assets/css/themes.css. Qui: barra in alto e tastiera. */
(function (global) {
  'use strict';

  // 1 è la veste di base (stompat.css): non mette nessun attributo
  var STYLES = [
    null,
    'Swiss poster',
    'Biglietto e tabellone'
  ];
  var STORE_KEY = 'stompat.style.v2';
  var root = document.documentElement;
  var current = 1;
  var bar = null;

  function valid(n) { return n >= 1 && n < STYLES.length; }

  // ?style=N nell'indirizzo vince su quello ricordato dal browser
  function initial() {
    var fromUrl = /[?&]style=(\d+)/.exec(global.location.search);
    if (fromUrl && valid(+fromUrl[1])) return +fromUrl[1];
    try {
      var saved = parseInt(global.localStorage.getItem(STORE_KEY), 10);
      if (valid(saved)) return saved;
    } catch (e) { /* storage non disponibile: si parte dalla veste di base */ }
    return 1;
  }

  function apply(n) {
    current = n;
    if (n === 1) root.removeAttribute('data-style');
    else root.setAttribute('data-style', String(n));
    try { global.localStorage.setItem(STORE_KEY, String(n)); } catch (e) { /* pazienza */ }
    paint();
  }

  function paint() {
    if (!bar) return;
    bar.querySelector('.num').textContent = current + ' / ' + (STYLES.length - 1);
    bar.querySelector('.name').textContent = STYLES[current];
    var keys = bar.querySelectorAll('button');
    for (var i = 0; i < keys.length; i++) {
      keys[i].setAttribute('aria-pressed', (i + 1) === current ? 'true' : 'false');
    }
  }

  function build() {
    bar = document.createElement('nav');
    bar.className = 'stylebar';
    bar.setAttribute('aria-label', 'Stile grafico');

    var now = document.createElement('span');
    now.className = 'now';
    now.setAttribute('aria-live', 'polite');
    now.innerHTML = '<span class="tag">Stile</span><b class="num"></b><span class="name"></span>';
    bar.appendChild(now);

    var keys = document.createElement('span');
    keys.className = 'keys';
    STYLES.forEach(function (name, i) {
      if (!name) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = i;
      b.title = name + ' (tasto ' + i + ')';
      b.addEventListener('click', function () { apply(i); b.blur(); });
      keys.appendChild(b);
    });
    bar.appendChild(keys);

    document.body.insertBefore(bar, document.body.firstChild);
    paint();
  }

  // subito, prima che la pagina venga disegnata
  apply(initial());

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;   // Cmd+1 resta al browser
    var t = e.target;
    var tag = t && t.tagName;
    if (tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
    if (tag === 'INPUT' && /^(text|number|search|email|url|tel|password)$/.test(t.type)) return;
    if (!/^[0-9]$/.test(e.key)) return;
    var n = +e.key;
    if (!valid(n)) return;
    apply(n);
    e.preventDefault();
  });
})(window);
