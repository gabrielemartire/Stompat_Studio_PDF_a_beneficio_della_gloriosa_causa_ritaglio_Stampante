/* Stompat — app
 * Collega DOM, view, selection e output, e tiene aggiornato lo stato a schermo.
 */
(function (global) {
  'use strict';

  var Stompat = global.Stompat;
  var $ = Stompat.util.$;
  var view = Stompat.view;
  var selection = Stompat.selection;
  var output = Stompat.output;

  var el = {};
  var lastCrop = null;
  var queue = [];          // ritagli in attesa di stampa
  var blockedUrls = [];    // usati dalla finestra di dialogo di emergenza
  var pendingNames = [];   // nomi file dei ritagli mandati in stampa

  document.addEventListener('DOMContentLoaded', function () {
    cacheDom();
    configurePdfJs();

    view.mount(el.viewCanvas);
    selection.mount({ overlay: el.overlay, rectEl: el.selRect, canvas: el.viewCanvas });

    wireFile();
    wirePager();
    wireRotation();
    wireSelection();
    wireActions();
    wireQueue();
    wireScale();
    wireModal();
    wireKeyboard();

    updatePager();
    updateMeta();
    updatePaper();
    renderQueue();
  });

  function cacheDom() {
    ['fileInput', 'fileName', 'status', 'prevBtn', 'nextBtn', 'pageCount',
      'rotRange', 'degOut', 'rotReset', 'rotLeft', 'rotRight',
      'stage', 'holder', 'empty', 'viewCanvas',
      'overlay', 'selRect', 'preview', 'mPage', 'mRot', 'mSize', 'mMm',
      'addBtn', 'printBtn', 'downloadBtn', 'clearBtn',
      'scaleReal', 'scaleFit', 'paper', 'paperCrop', 'paperNote',
      'queuePanel', 'queueList', 'queueCount',
      'printAllBtn', 'downloadAllBtn', 'clearQueueBtn',
      'modal', 'modalShots', 'modalDownload', 'modalClose'
    ].forEach(function (id) { el[id] = $(id); });
  }

  function configurePdfJs() {
    if (!global.pdfjsLib) {
      setStatus('PDF.js non è stato caricato: serve una connessione alla prima apertura della pagina.', 'err');
      return;
    }
    global.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  /* ---------------- stato a schermo ---------------- */

  function setStatus(message, kind) {
    el.status.textContent = message;
    el.status.className = 'status' + (kind ? ' ' + kind : '');
  }

  function updatePager() {
    var n = view.getNumPages();
    if (!n) {
      el.pageCount.textContent = '— / —';
      el.prevBtn.disabled = el.nextBtn.disabled = true;
      return;
    }
    el.pageCount.textContent = 'pag. ' + view.getPageNumber() + ' / ' + n;
    el.prevBtn.disabled = view.getPageNumber() <= 1;
    el.nextBtn.disabled = view.getPageNumber() >= n;
  }

  function updateMeta() {
    var n = view.getNumPages();
    el.mPage.textContent = n ? (view.getPageNumber() + ' / ' + n) : '—';
    el.mRot.textContent = view.getAngle().toFixed(1) + '°';

    var s = selection.get();
    if (!s || !s.px) {
      el.mSize.textContent = '—';
      el.mMm.textContent = '—';
      return;
    }
    el.mSize.textContent = s.px.w + ' × ' + s.px.h + ' px';
    var mm = millimetres(s.px);
    el.mMm.textContent = mm ? ('≈ ' + mm.w + ' × ' + mm.h + ' mm') : '—';
  }

  function millimetres(px) {
    var ppp = view.getPxPerPoint();
    if (!ppp) return null;
    return {
      w: Math.round(Stompat.util.pxToMm(px.w, ppp)),
      h: Math.round(Stompat.util.pxToMm(px.h, ppp))
    };
  }

  function setActionsEnabled(on) {
    el.addBtn.disabled = el.printBtn.disabled =
      el.downloadBtn.disabled = el.clearBtn.disabled = !on;
  }

  function resetPreview() {
    lastCrop = null;
    el.preview.innerHTML = '<span class="none">Nessuna selezione.</span>';
    setActionsEnabled(false);
    updateMeta();
    updatePaper();
  }

  /* ---------------- scala di stampa ---------------- */

  function printMode() {
    return el.scaleFit.checked ? 'fit' : 'real';
  }

  function wireScale() {
    [el.scaleReal, el.scaleFit].forEach(function (radio) {
      radio.addEventListener('change', function () {
        updatePaper();
        setStatus(printMode() === 'real'
          ? 'Stampa a dimensione reale: il ritaglio esce nella misura indicata.'
          : 'Stampa adattata: il ritaglio viene ingrandito fino a riempire il foglio.');
      });
    });
  }

  /* Anteprima: dove finisce il ritaglio su un foglio A4, alla scala scelta. */
  function updatePaper() {
    var paper = Stompat.PAPER;
    var s = selection.get();
    var mm = s && s.px ? millimetres(s.px) : null;

    if (!mm || !mm.w || !mm.h) {
      el.paperCrop.hidden = true;
      el.paper.classList.remove('landscape');
      el.paperNote.className = 'paper-note';
      el.paperNote.textContent = "Seleziona un'area per vedere come esce sul foglio.";
      return;
    }

    var real = printMode() === 'real';
    var fitsPortrait = mm.w <= paper.printable(false).w && mm.h <= paper.printable(false).h;
    var fitsLandscape = mm.w <= paper.printable(true).w && mm.h <= paper.printable(true).h;
    var landscape = !fitsPortrait && fitsLandscape;

    var sheet = paper.size(landscape);
    var printable = paper.printable(landscape);
    var shown = { w: mm.w, h: mm.h };

    if (!real) {
      // adattato: si ingrandisce (o riduce) fino al limite dell'area stampabile
      var k = Math.min(printable.w / mm.w, printable.h / mm.h);
      shown = { w: Math.round(mm.w * k), h: Math.round(mm.h * k) };
    }

    var over = real && !fitsPortrait && !fitsLandscape;
    var wPct = Math.min(100, shown.w / sheet.w * 100);
    var hPct = Math.min(100, shown.h / sheet.h * 100);

    el.paper.classList.toggle('landscape', landscape);
    el.paperCrop.hidden = false;
    el.paperCrop.classList.toggle('over', over);
    el.paperCrop.style.width = wPct + '%';
    el.paperCrop.style.height = hPct + '%';
    el.paperCrop.style.left = ((100 - wPct) / 2) + '%';
    el.paperCrop.style.top = ((100 - hPct) / 2) + '%';

    var note;
    if (over) {
      note = shown.w + ' × ' + shown.h + ' mm: più grande di un ' + paper.name +
        ' (' + printable.w + ' × ' + printable.h + ' mm stampabili), i bordi verranno tagliati. ' +
        'Usa «Adatta al foglio» o riduci la selezione.';
    } else if (real) {
      note = 'Esce ' + shown.w + ' × ' + shown.h + ' mm su ' + paper.name +
        (landscape ? ', in orizzontale.' : '.');
    } else {
      note = 'Ingrandito a ' + shown.w + ' × ' + shown.h + ' mm su ' + paper.name +
        (landscape ? ', in orizzontale.' : '.') +
        ' Reale: ' + mm.w + ' × ' + mm.h + ' mm.';
    }
    el.paperNote.className = 'paper-note' + (over ? ' warn' : '');
    el.paperNote.textContent = note;
  }

  /* ---------------- documento ---------------- */

  function wireFile() {
    el.fileInput.addEventListener('change', function () {
      var file = el.fileInput.files && el.fileInput.files[0];
      if (file) view.openFile(file);
      el.fileInput.value = '';   // stesso file due volte di fila: deve ricaricare
    });

    ['dragenter', 'dragover'].forEach(function (evt) {
      el.stage.addEventListener(evt, function (e) {
        e.preventDefault();
        el.stage.classList.add('drop');
      });
    });
    ['dragleave', 'drop'].forEach(function (evt) {
      el.stage.addEventListener(evt, function (e) {
        e.preventDefault();
        el.stage.classList.remove('drop');
      });
    });
    el.stage.addEventListener('drop', function (e) {
      var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) view.openFile(file);
    });

    view.on('loading', function (info) {
      el.fileName.textContent = info.name;
      setStatus('Caricamento del PDF…');
    });

    view.on('loaded', function (info) {
      el.rotRange.value = '0';
      el.rotRange.disabled = false;
      el.rotReset.disabled = false;
      el.rotLeft.disabled = false;
      el.rotRight.disabled = false;
      el.degOut.textContent = '0.0°';
      selection.clear();
      resetPreview();
      queue = [];
      renderQueue();
      setStatus('PDF caricato: ' + info.numPages +
        (info.numPages === 1 ? ' pagina.' : ' pagine.'), 'ok');
    });

    view.on('rendered', function () {
      el.holder.hidden = false;
      el.empty.style.display = 'none';
      selection.setEnabled(true);
      updatePager();
      updateMeta();
    });

    view.on('page', updatePager);

    view.on('error', function (info) {
      setStatus(info.message, 'err');
    });
  }

  /* ---------------- pagine ---------------- */

  function wirePager() {
    el.prevBtn.addEventListener('click', function () {
      if (view.prev()) afterPageChange();
    });
    el.nextBtn.addEventListener('click', function () {
      if (view.next()) afterPageChange();
    });
  }

  function afterPageChange() {
    selection.clear();
    resetPreview();
    setStatus('Pagina ' + view.getPageNumber() + ' di ' + view.getNumPages() + '.');
  }

  /* ---------------- rotazione ---------------- */

  function wireRotation() {
    el.rotRange.addEventListener('input', function () {
      var changed = view.setFine(el.rotRange.value);
      el.degOut.textContent = view.getFine().toFixed(1) + '°';
      if (changed) invalidateForRotation();
    });

    el.rotLeft.addEventListener('click', function () { turn(-1); });
    el.rotRight.addEventListener('click', function () { turn(1); });

    el.rotReset.addEventListener('click', function () {
      el.rotRange.value = '0';
      var changed = view.resetRotation();
      el.degOut.textContent = '0.0°';
      if (changed) invalidateForRotation();
      setStatus('Rotazione azzerata.');
    });
  }

  function turn(dir) {
    view.rotate90(dir);
    invalidateForRotation();
    setStatus('Pagina ruotata: ' + view.getAngle().toFixed(1) + '°.');
  }

  /* Dopo una rotazione le vecchie coordinate non valgono più: si ricomincia. */
  function invalidateForRotation() {
    if (!selection.isEmpty()) {
      selection.clear();
      resetPreview();
      setStatus('Rotazione cambiata: la selezione è stata annullata.');
    } else {
      updateMeta();
    }
  }

  /* ---------------- selezione ---------------- */

  function wireSelection() {
    selection.on('change', function () {
      updateMeta();
      updatePaper();
    });

    selection.on('commit', function (s) {
      buildPreview(s);
      var mm = millimetres(s.px);
      setStatus('Selezione: ' + s.px.w + ' × ' + s.px.h + ' px' +
        (mm ? ' (≈ ' + mm.w + ' × ' + mm.h + ' mm su carta)' : '') + '.', 'ok');
    });

    selection.on('toosmall', function () {
      resetPreview();
      setStatus("Selezione troppo piccola: riprova trascinando un'area più grande.");
    });

    selection.on('clear', function () {
      updateMeta();
      updatePaper();
    });
  }

  function buildPreview(s) {
    lastCrop = output.crop(el.viewCanvas, s.px);
    if (!lastCrop) { resetPreview(); return; }

    var img = new Image();
    img.alt = 'Anteprima del ritaglio selezionato';
    img.src = lastCrop.toDataURL('image/png');
    el.preview.innerHTML = '';
    el.preview.appendChild(img);

    setActionsEnabled(true);
    updateMeta();
    updatePaper();
  }

  function currentCrop() {
    var s = selection.get();
    if (!s || !s.px) return null;
    // si ritaglia sempre dal canvas ruotato: si stampa quello che si vede
    lastCrop = output.crop(el.viewCanvas, s.px);
    return lastCrop;
  }

  function cropFileName() {
    var s = selection.get();
    var px = s && s.px ? s.px : { w: 0, h: 0 };
    var angle = view.getAngle();
    return view.getDocName() +
      '_p' + view.getPageNumber() +
      (angle ? '_rot' + angle.toFixed(1) : '') +
      '_' + px.w + 'x' + px.h + '.png';
  }

  /* ---------------- azioni ---------------- */

  function wireActions() {
    el.addBtn.addEventListener('click', function () {
      var canvas = currentCrop();
      if (!canvas) return;
      var s = selection.get();

      queue.push({
        canvas: canvas,
        dataUrl: canvas.toDataURL('image/png'),
        name: cropFileName(),
        page: view.getPageNumber(),
        w: s.px.w,
        h: s.px.h,
        mm: millimetres(s.px)
      });

      selection.clear();
      resetPreview();
      renderQueue();
      setStatus('Aggiunto alla lista: ' + queue.length +
        (queue.length === 1 ? ' ritaglio in attesa di stampa.' : ' ritagli in attesa di stampa.'), 'ok');
    });

    el.printBtn.addEventListener('click', function () {
      var canvas = currentCrop();
      if (!canvas) return;
      pendingNames = [cropFileName()];
      var mm = millimetres(selection.get().px);

      output.print(canvas, {
        title: view.getDocName() + ' — ritaglio p.' + view.getPageNumber(),
        mode: printMode(),
        sizes: [mm],
        onRoute: function (route) {
          setStatus(route === 'window'
            ? 'Finestra di stampa aperta.'
            : 'Popup bloccato: stampa avviata direttamente da questa pagina.', 'ok');
        },
        onBlocked: openModal
      });
    });

    el.downloadBtn.addEventListener('click', function () {
      var canvas = currentCrop();
      if (!canvas) return;
      var name = cropFileName();
      output.download(canvas, name);
      setStatus('Immagine salvata: ' + name, 'ok');
    });

    el.clearBtn.addEventListener('click', function () {
      selection.clear();
      resetPreview();
      setStatus('Selezione annullata.');
    });
  }

  /* ---------------- lista dei ritagli ---------------- */

  function wireQueue() {
    el.printAllBtn.addEventListener('click', function () {
      if (!queue.length) return;
      pendingNames = queue.map(function (item) { return item.name; });

      output.print(queue.map(function (item) { return item.canvas; }), {
        title: view.getDocName() + ' — ' + queue.length + ' ritagli',
        mode: printMode(),
        sizes: queue.map(function (item) { return item.mm; }),
        onRoute: function (route) {
          setStatus((route === 'window'
            ? 'Finestra di stampa aperta: '
            : 'Popup bloccato, stampa avviata da questa pagina: ') +
            queue.length + (queue.length === 1 ? ' foglio.' : ' fogli.'), 'ok');
        },
        onBlocked: openModal
      });
    });

    el.downloadAllBtn.addEventListener('click', function () {
      if (!queue.length) return;
      queue.forEach(function (item, i) {
        global.setTimeout(function () { output.download(item.canvas, item.name); }, i * 350);
      });
      setStatus('Salvataggio di ' + queue.length +
        (queue.length === 1 ? ' immagine…' : ' immagini…'), 'ok');
    });

    el.clearQueueBtn.addEventListener('click', function () {
      queue = [];
      renderQueue();
      setStatus('Lista svuotata.');
    });

    el.queueList.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.remove') : null;
      if (!btn) return;
      var i = parseInt(btn.getAttribute('data-index'), 10);
      if (isNaN(i)) return;
      queue.splice(i, 1);
      renderQueue();
      setStatus(queue.length ? 'Ritaglio rimosso dalla lista.' : 'Lista svuotata.');
    });
  }

  function renderQueue() {
    el.queuePanel.hidden = queue.length === 0;
    el.queueCount.textContent = queue.length;
    el.queueList.innerHTML = '';

    queue.forEach(function (item, i) {
      var fig = document.createElement('figure');

      var img = new Image();
      img.src = item.dataUrl;
      img.alt = 'Ritaglio ' + (i + 1) + ', pagina ' + item.page;

      var cap = document.createElement('figcaption');
      cap.textContent = 'pag. ' + item.page +
        (item.mm ? ' · ' + item.mm.w + '×' + item.mm.h + ' mm' : ' · ' + item.w + '×' + item.h + ' px');

      var rm = document.createElement('button');
      rm.className = 'remove';
      rm.type = 'button';
      rm.setAttribute('data-index', i);
      rm.setAttribute('aria-label', 'Rimuovi il ritaglio ' + (i + 1));
      rm.textContent = '×';

      fig.appendChild(img);
      fig.appendChild(cap);
      fig.appendChild(rm);
      el.queueList.appendChild(fig);
    });
  }

  /* ---------------- modale di emergenza ---------------- */

  function openModal(dataUrls) {
    blockedUrls = [].concat(dataUrls);
    el.modalShots.innerHTML = '';
    blockedUrls.forEach(function (url, i) {
      var img = new Image();
      img.src = url;
      img.alt = 'Anteprima del ritaglio ' + (i + 1);
      el.modalShots.appendChild(img);
    });
    el.modalDownload.textContent = blockedUrls.length > 1
      ? 'Scarica i ' + blockedUrls.length + ' PNG'
      : 'Scarica il PNG';
    el.modal.hidden = false;
    el.modalClose.focus();
    setStatus('Stampa bloccata dal browser: vedi le istruzioni a schermo.', 'err');
  }

  function closeModal() {
    el.modal.hidden = true;
    el.modalShots.innerHTML = '';
    blockedUrls = [];
  }

  function wireModal() {
    el.modalClose.addEventListener('click', closeModal);
    el.modal.addEventListener('click', function (e) {
      if (e.target === el.modal) closeModal();
    });
    el.modalDownload.addEventListener('click', function () {
      blockedUrls.forEach(function (url, i) {
        var name = pendingNames[i] || ('stompat-ritaglio-' + (i + 1) + '.png');
        global.setTimeout(function () { output.downloadUrl(url, name); }, i * 350);
      });
    });
  }

  /* ---------------- tastiera ---------------- */

  var ARROWS = {
    ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]
  };

  function wireKeyboard() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (!el.modal.hidden) { closeModal(); return; }
        if (!selection.isEmpty()) {
          selection.clear();
          resetPreview();
          setStatus('Selezione annullata.');
        }
        return;
      }

      var tag = document.activeElement && document.activeElement.tagName;
      var typing = tag === 'INPUT' || tag === 'TEXTAREA';
      if (!view.hasDocument()) return;

      // PagSu / PagGiù: cambio pagina, sempre
      if (e.key === 'PageUp' && view.prev()) { afterPageChange(); e.preventDefault(); return; }
      if (e.key === 'PageDown' && view.next()) { afterPageChange(); e.preventDefault(); return; }

      if (typing) return;   // lo slider usa le sue frecce

      // Invio: aggiunge il ritaglio alla lista
      if (e.key === 'Enter' && !el.addBtn.disabled) {
        el.addBtn.click();
        e.preventDefault();
        return;
      }

      var step = ARROWS[e.key];
      if (!step) return;

      if (!selection.isEmpty()) {
        // frecce: spostano la selezione di 1 px, con Shift di 10
        var d = e.shiftKey ? 10 : 1;
        selection.nudge(step[0] * d, step[1] * d);
        e.preventDefault();
      } else if (step[1] === 0) {
        // senza selezione, sinistra/destra cambiano pagina
        if (step[0] < 0 ? view.prev() : view.next()) { afterPageChange(); e.preventDefault(); }
      }
    });
  }
})(window);
