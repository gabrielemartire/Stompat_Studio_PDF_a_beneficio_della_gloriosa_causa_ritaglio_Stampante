/* Stompat — view
 * Carica il PDF con PDF.js, renderizza la pagina corrente su un canvas sorgente
 * (mai ruotato) e la ricompone su un canvas visibile applicando la rotazione fine.
 * Tutto ciò che viene selezionato e stampato legge SEMPRE dal canvas visibile.
 */
(function (global) {
  'use strict';

  var Stompat = global.Stompat;

  var RENDER_SCALE = 2.2;   // px per punto PDF: nitidezza da stampa
  var MAX_PIXELS = 24e6;    // tetto per non far esplodere la memoria su pagine enormi

  Stompat.view = (function () {
    var bus = Stompat.emitter();

    var source = document.createElement('canvas'); // pagina renderizzata, senza rotazione
    var target = null;                             // canvas a schermo, ruotato

    var doc = null;
    var docName = 'documento';
    var pageNumber = 1;
    var angle = 0;          // gradi, -10..+10
    var pxPerPoint = 0;     // scala effettiva usata nel render
    var task = null;
    var token = 0;

    function mount(canvas) {
      target = canvas;
    }

    /* ---------- caricamento ---------- */

    function openFile(file) {
      if (!global.pdfjsLib) {
        bus.emit('error', { message: 'PDF.js non è stato caricato: serve una connessione alla prima apertura.' });
        return;
      }
      if (file.type && file.type.indexOf('pdf') === -1 && !/\.pdf$/i.test(file.name)) {
        bus.emit('error', { message: 'Il file selezionato non è un PDF.' });
        return;
      }

      docName = Stompat.util.safeName(file.name);
      bus.emit('loading', { name: file.name });

      var reader = new FileReader();
      reader.onerror = function () {
        bus.emit('error', { message: 'Impossibile leggere il file.' });
      };
      reader.onload = function () {
        global.pdfjsLib.getDocument({ data: new Uint8Array(reader.result) }).promise
          .then(function (loaded) {
            if (doc) { try { doc.destroy(); } catch (e) { /* nulla da fare */ } }
            doc = loaded;
            pageNumber = 1;
            angle = 0;
            bus.emit('loaded', { name: file.name, numPages: doc.numPages });
            render();
          })
          .catch(function (err) {
            console.error('[stompat]', err);
            bus.emit('error', {
              message: 'Impossibile aprire il PDF: ' +
                ((err && err.message) || 'formato non leggibile')
            });
          });
      };
      reader.readAsArrayBuffer(file);
    }

    /* ---------- render ---------- */

    function render() {
      if (!doc || !target) return;
      var mine = ++token;
      if (task) { try { task.cancel(); } catch (e) { /* già annullato */ } }

      bus.emit('page', { pageNumber: pageNumber, numPages: doc.numPages });

      doc.getPage(pageNumber).then(function (page) {
        if (mine !== token) return;

        var scale = RENDER_SCALE;
        var viewport = page.getViewport({ scale: scale });
        if (viewport.width * viewport.height > MAX_PIXELS) {
          scale *= Math.sqrt(MAX_PIXELS / (viewport.width * viewport.height));
          viewport = page.getViewport({ scale: scale });
        }
        pxPerPoint = scale;

        source.width = Math.floor(viewport.width);
        source.height = Math.floor(viewport.height);
        var ctx = source.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, source.width, source.height);

        task = page.render({ canvasContext: ctx, viewport: viewport });
        return task.promise.then(function () {
          if (mine !== token) return;
          task = null;
          compose();
          bus.emit('rendered', {
            pageNumber: pageNumber,
            numPages: doc.numPages,
            width: target.width,
            height: target.height
          });
        });
      }).catch(function (err) {
        if (err && err.name === 'RenderingCancelledException') return;
        console.error('[stompat]', err);
        bus.emit('error', { message: 'Render della pagina fallito.' });
      });
    }

    /* Ridisegna il canvas sorgente dentro quello visibile, ruotato.
       Il canvas visibile cresce quel tanto che basta a non tagliare gli angoli. */
    function compose() {
      if (!target || !source.width) return;

      var rad = angle * Math.PI / 180;
      var cos = Math.abs(Math.cos(rad));
      var sin = Math.abs(Math.sin(rad));
      var w = source.width;
      var h = source.height;

      target.width = Math.round(w * cos + h * sin);
      target.height = Math.round(w * sin + h * cos);

      var ctx = target.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, target.width, target.height);
      ctx.save();
      ctx.translate(target.width / 2, target.height / 2);
      ctx.rotate(rad);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, -w / 2, -h / 2);
      ctx.restore();

      bus.emit('composed', { angle: angle, width: target.width, height: target.height });
    }

    /* ---------- navigazione e rotazione ---------- */

    function goTo(n) {
      if (!doc) return false;
      n = Stompat.util.clamp(Math.round(n), 1, doc.numPages);
      if (n === pageNumber) return false;
      pageNumber = n;
      render();
      return true;
    }

    function setAngle(deg) {
      var next = Stompat.util.clamp(parseFloat(deg) || 0, -10, 10);
      if (next === angle) return false;
      angle = next;
      compose();
      return true;
    }

    return {
      on: bus.on,
      mount: mount,
      openFile: openFile,
      render: render,
      compose: compose,
      goTo: goTo,
      next: function () { return goTo(pageNumber + 1); },
      prev: function () { return goTo(pageNumber - 1); },
      setAngle: setAngle,
      getAngle: function () { return angle; },
      getPageNumber: function () { return pageNumber; },
      getNumPages: function () { return doc ? doc.numPages : 0; },
      getPxPerPoint: function () { return pxPerPoint; },
      getDocName: function () { return docName; },
      hasDocument: function () { return !!doc; },
      getCanvas: function () { return target; }
    };
  })();
})(window);
