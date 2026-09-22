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
    wireModal();
    wireKeyboard();

    updatePager();
    updateMeta();
  });

  function cacheDom() {
    ['fileInput', 'fileName', 'status', 'prevBtn', 'nextBtn', 'pageCount',
      'rotRange', 'degOut', 'rotReset', 'stage', 'holder', 'empty', 'viewCanvas',
      'overlay', 'selRect', 'preview', 'mPage', 'mRot', 'mSize', 'mMm',
      'printBtn', 'downloadBtn', 'clearBtn',
      'modal', 'modalImg', 'modalDownload', 'modalClose'
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
    el.printBtn.disabled = el.downloadBtn.disabled = el.clearBtn.disabled = !on;
  }

  function resetPreview() {
    lastCrop = null;
    el.preview.innerHTML = '<span class="none">Nessuna selezione.</span>';
    setActionsEnabled(false);
    updateMeta();
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
      el.degOut.textContent = '0.0°';
      selection.clear();
      resetPreview();
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
      var changed = view.setAngle(el.rotRange.value);
      el.degOut.textContent = view.getAngle().toFixed(1) + '°';
      if (changed) invalidateForRotation();
    });

    el.rotReset.addEventListener('click', function () {
      el.rotRange.value = '0';
      var changed = view.setAngle(0);
      el.degOut.textContent = '0.0°';
      if (changed) invalidateForRotation();
      setStatus('Rotazione azzerata.');
    });
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
    selection.on('change', updateMeta);

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

    selection.on('clear', updateMeta);
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
    el.printBtn.addEventListener('click', function () {
      var canvas = currentCrop();
      if (!canvas) return;

      output.print(canvas, {
        title: view.getDocName() + ' — ritaglio p.' + view.getPageNumber(),
        onRoute: function (route) {
          setStatus(route === 'window'
            ? 'Finestra di stampa aperta.'
            : 'Popup bloccato: stampa avviata direttamente da questa pagina.', 'ok');
        },
        onBlocked: function (dataUrl) {
          openModal(dataUrl);
        }
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

  /* ---------------- modale di emergenza ---------------- */

  function openModal(dataUrl) {
    el.modalImg.src = dataUrl;
    el.modalDownload.href = dataUrl;
    el.modalDownload.download = cropFileName();
    el.modal.hidden = false;
    el.modalClose.focus();
    setStatus('Stampa bloccata dal browser: vedi le istruzioni a schermo.', 'err');
  }

  function closeModal() {
    el.modal.hidden = true;
    el.modalImg.removeAttribute('src');
    el.printBtn.focus();
  }

  function wireModal() {
    el.modalClose.addEventListener('click', closeModal);
    el.modal.addEventListener('click', function (e) {
      if (e.target === el.modal) closeModal();
    });
  }

  /* ---------------- tastiera ---------------- */

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
      if (tag === 'INPUT' || tag === 'TEXTAREA' || !view.hasDocument()) return;

      if (e.key === 'ArrowLeft' && view.prev()) { afterPageChange(); e.preventDefault(); }
      if (e.key === 'ArrowRight' && view.next()) { afterPageChange(); e.preventDefault(); }
    });
  }
})(window);
