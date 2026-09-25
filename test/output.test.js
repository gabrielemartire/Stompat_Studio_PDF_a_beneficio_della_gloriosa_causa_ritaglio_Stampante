/* Test del documento di stampa: `node test/output.test.js`. Nessuna dipendenza. */
const fs = require('fs');
const path = require('path').join(__dirname, '..', 'assets', 'js') + require('path').sep;

const win = { document: { createElement: () => ({ getContext: () => ({}) }) }, setTimeout };
win.window = win;
global.window = win; global.document = win.document;
new Function('window', 'document', 'global',
  fs.readFileSync(path + 'core.js', 'utf8') + fs.readFileSync(path + 'output.js', 'utf8')
)(win, win.document, win);

const out = win.Stompat.output;
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
