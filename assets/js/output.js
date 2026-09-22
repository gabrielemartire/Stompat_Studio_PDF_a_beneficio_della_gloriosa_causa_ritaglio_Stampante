/* Stompat — output
 * Ritaglio del canvas visibile, stampa e salvataggio su disco.
 * La stampa ha tre strade, in ordine di preferenza:
 *   1. finestra separata (evita i blocchi di window.print() dentro un iframe)
 *   2. iframe nascosto, se il popup è stato bloccato
 *   3. modale con l'immagine e il download, se anche l'iframe non collabora
 */
(function (global) {
  'use strict';

  var Stompat = global.Stompat;

  Stompat.output = (function () {

    /* ---------- ritaglio ---------- */

    function crop(sourceCanvas, px) {
      if (!sourceCanvas || !px || px.w < 1 || px.h < 1) return null;
      var out = document.createElement('canvas');
      out.width = px.w;
      out.height = px.h;
      var ctx = out.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, px.w, px.h);
      ctx.drawImage(sourceCanvas, px.x, px.y, px.w, px.h, 0, 0, px.w, px.h);
      return out;
    }

    /* ---------- documento di stampa ---------- */

    function printDocument(dataUrl, title) {
      return '<!DOCTYPE html><html lang="it"><head><meta charset="utf-8">' +
        '<title>' + Stompat.util.escapeHtml(title) + '</title><style>' +
        '@page{margin:10mm}' +
        'html,body{margin:0;padding:0;background:#fff}' +
        'img{display:block;max-width:100%;height:auto;margin:0 auto}' +
        '</style></head><body><img src="' + dataUrl + '" alt=""></body></html>';
    }

    /* ---------- stampa ---------- */

    function print(canvas, opts) {
      opts = opts || {};
      var dataUrl = canvas.toDataURL('image/png');
      var html = printDocument(dataUrl, opts.title || 'Stompat — ritaglio');
      var report = opts.onRoute || function () {};
      var blocked = opts.onBlocked || function () {};

      // 1 — finestra separata
      var win = null;
      try { win = global.open('', '_blank'); } catch (err) { win = null; }
      if (win && win.document) {
        win.document.open();
        win.document.write(html);
        win.document.close();

        var fire = function () {
          try { win.focus(); win.print(); } catch (err) { console.warn('[stompat]', err); }
        };
        var img = win.document.images[0];
        if (img && !img.complete) {
          img.onload = function () { global.setTimeout(fire, 80); };
          img.onerror = function () { global.setTimeout(fire, 80); };
        } else {
          global.setTimeout(fire, 120);
        }
        report('window');
        return;
      }

      // 2 — iframe nascosto
      printViaIframe(html, function (ok) {
        if (ok) report('iframe');
        else blocked(dataUrl);   // 3 — modale con anteprima e download
      });
    }

    function printViaIframe(html, done) {
      var settled = false;
      var frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0';

      var finish = function (ok, keep) {
        if (settled) return;
        settled = true;
        if (!keep && frame.parentNode) frame.remove();
        done(ok);
      };

      frame.onload = function () {
        if (settled) return;
        try {
          frame.contentWindow.focus();
          frame.contentWindow.print();
          // l'iframe resta vivo il tempo del dialogo di stampa, poi sparisce
          global.setTimeout(function () { if (frame.parentNode) frame.remove(); }, 60000);
          finish(true, true);
        } catch (err) {
          console.warn('[stompat]', err);
          finish(false);
        }
      };

      document.body.appendChild(frame);

      if ('srcdoc' in frame) {
        frame.srcdoc = html;
      } else {
        try {
          var d = frame.contentWindow.document;
          d.open(); d.write(html); d.close();
          frame.onload();
        } catch (err) {
          finish(false);
          return;
        }
      }

      // se onload non arriva mai, non restiamo ad aspettare in eterno
      global.setTimeout(function () { finish(false); }, 3000);
    }

    /* ---------- salvataggio ---------- */

    function download(canvas, filename) {
      var save = function (href, revoke) {
        var a = document.createElement('a');
        a.href = href;
        a.download = filename;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        if (revoke) global.setTimeout(function () { URL.revokeObjectURL(href); }, 10000);
      };

      if (canvas.toBlob) {
        canvas.toBlob(function (blob) {
          if (blob && global.URL && URL.createObjectURL) save(URL.createObjectURL(blob), true);
          else save(canvas.toDataURL('image/png'), false);
        }, 'image/png');
      } else {
        save(canvas.toDataURL('image/png'), false);
      }
    }

    return { crop: crop, print: print, download: download, printDocument: printDocument };
  })();
})(window);
