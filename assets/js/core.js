/* Stompat — core
 * Namespace condiviso, mini event bus e utilità.
 * Script classici, niente moduli ES: così il file si apre anche con doppio click (file://).
 */
(function (global) {
  'use strict';

  var Stompat = global.Stompat || (global.Stompat = {});

  Stompat.VERSION = '1.1.0';

  /* Foglio di riferimento per l'anteprima e per la stampa in scala reale.
     I margini corrispondono a @page{margin:10mm} del documento di stampa. */
  Stompat.PAPER = {
    name: 'A4',
    width: 210,
    height: 297,
    margin: 10,
    /* area stampabile, in mm, nei due orientamenti */
    printable: function (landscape) {
      var w = landscape ? this.height : this.width;
      var h = landscape ? this.width : this.height;
      return { w: w - this.margin * 2, h: h - this.margin * 2 };
    },
    size: function (landscape) {
      return landscape
        ? { w: this.height, h: this.width }
        : { w: this.width, h: this.height };
    }
  };

  /* ---- mini event bus ---- */
  Stompat.emitter = function emitter() {
    var handlers = {};
    return {
      on: function (name, fn) {
        (handlers[name] || (handlers[name] = [])).push(fn);
        return this;
      },
      emit: function (name, payload) {
        (handlers[name] || []).forEach(function (fn) {
          try { fn(payload); } catch (err) { console.error('[stompat] handler ' + name, err); }
        });
      }
    };
  };

  /* ---- utilità ---- */
  Stompat.util = {
    $: function (id) { return document.getElementById(id); },

    clamp: function (v, min, max) { return v < min ? min : (v > max ? max : v); },

    /* px del canvas -> millimetri sulla carta, dato il fattore px-per-punto-PDF */
    pxToMm: function (px, pxPerPoint) {
      if (!pxPerPoint) return null;
      return (px / pxPerPoint) * 25.4 / 72;
    },

    /* nome file utilizzabile su qualsiasi filesystem */
    safeName: function (name) {
      return String(name)
        .replace(/\.pdf$/i, '')
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, '_')
        .slice(0, 80) || 'documento';
    },

    escapeHtml: function (s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }
  };
})(window);
