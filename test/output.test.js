/* Test del documento di stampa: `node test/output.test.js`. Nessuna dipendenza. */
const fs = require('fs');
const path = require('path').join(__dirname, '..', 'assets', 'js') + require('path').sep;

const win = { document: { createElement: () => ({ getContext: () => ({}) }) }, setTimeout };
win.window = win;
global.window = win; global.document = win.document;
new Function('window', 'document', 'global',
  fs.readFileSync(path + 'core.js', 'utf8') + fs.readFileSync(path + 'output.js', 'utf8')
)(win, win.document, win);

const out = win.SitoGalattico.output;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label,
    ok ? '' : '\n  got  ' + JSON.stringify(got) + '\n  want ' + JSON.stringify(want));
  if (!ok) process.exitCode = 1;
};

const doc1 = out.printDocument(['data:image/png;base64,AAA'], 'uno');
eq('un ritaglio -> un foglio', (doc1.match(/class="sheet"/g) || []).length, 1);

const doc3 = out.printDocument(['a', 'b', 'c'], 'tre');
eq('tre ritagli -> tre fogli', (doc3.match(/class="sheet"/g) || []).length, 3);
eq('interruzione di pagina fra i fogli', doc3.includes('page-break-after:always'), true);
eq('ultimo foglio senza interruzione', doc3.includes('.sheet:last-child{page-break-after:auto'), true);
eq('titolo con caratteri speciali', out.printDocument(['a'], 'a<b&c').includes('a&lt;b&amp;c'), true);
eq('immagini nell ordine ricevuto',
  (doc3.match(/src="([abc])"/g) || []), ['src="a"', 'src="b"', 'src="c"']);

// --- scala di stampa ---
const real = out.printDocument(['a', 'b'], 'reale', {
  mode: 'real', sizes: [{ w: 68, h: 29 }, { w: 100, h: 50 }]
});
eq('dimensione reale sul primo foglio', real.includes('width:68mm;height:29mm'), true);
eq('dimensione reale sul secondo foglio', real.includes('width:100mm;height:50mm'), true);
eq('in scala reale le immagini non vengono rimpicciolite', real.includes('img{max-width:none}'), true);

const fit = out.printDocument(['a'], 'adatta', { mode: 'fit', sizes: [{ w: 68, h: 29 }] });
eq('adatta al foglio ignora i mm', fit.includes('mm"'), false);
eq('adatta al foglio limita la larghezza', fit.includes('img{max-width:100%;height:auto}'), true);
eq('margine di pagina da PAPER', real.includes('@page{margin:10mm}'), true);

// --- area stampabile ---
const P = win.SitoGalattico.PAPER;
eq('A4 verticale stampabile', P.printable(false), { w: 190, h: 277 });
eq('A4 orizzontale stampabile', P.printable(true), { w: 277, h: 190 });
