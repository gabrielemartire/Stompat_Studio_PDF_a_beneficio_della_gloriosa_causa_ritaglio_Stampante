/* Stompat — selettore di stile
   Prova grafica: i tasti 0-7 cambiano al volo il vestito della pagina
   (0 = originale). Lo stile vive in <html data-style="N"> e le regole in
   assets/css/themes.css; qui ci sono solo la barra in alto e la tastiera. */
(function (global) {
  'use strict';

  var STYLES = [
    'Originale',
    'Swiss poster design',
    'Vintage software manual',
    'Brutalist web design',
    'Risograph print',
    'Japanese packaging design',
    '1970s technical catalog',
    'Museum signage typography'
  ];
  var STORE_KEY = 'stompat.style';
  var root = document.documentElement;
  var current = 0;
  var bar = null;

  function valid(n) { return n >= 0 && n < STYLES.length; }

  // ?style=N nell'indirizzo vince su quello ricordato dal browser
  function initial() {
    var fromUrl = /[?&]style=(\d+)/.exec(global.location.search);
    if (fromUrl && valid(+fromUrl[1])) return +fromUrl[1];
    try {
      var saved = parseInt(global.localStorage.getItem(STORE_KEY), 10);
      if (valid(saved)) return saved;
    } catch (e) { /* storage non disponibile: si parte dall'originale */ }
    return 0;
  }

  function apply(n) {
    current = n;
    if (n === 0) root.removeAttribute('data-style');
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
      keys[i].setAttribute('aria-pressed', i === current ? 'true' : 'false');
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
