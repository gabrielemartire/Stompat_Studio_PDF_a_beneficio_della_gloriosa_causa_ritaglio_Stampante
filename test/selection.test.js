/* Test della geometria di selezione: `node test/selection.test.js`. Nessuna dipendenza. */
const fs = require('fs');
const path = require('path').join(__dirname, '..', 'assets', 'js') + require('path').sep;

function makeEl(){ const h={}; return {
  handlers:h, classList:{add(){},remove(){}}, style:{},
  addEventListener(n,f){ (h[n]||(h[n]=[])).push(f); },
  setPointerCapture(){}, releasePointerCapture(){},
}; }

const win = { addEventListener(){}, setTimeout, document:{ createElement:()=>({getContext:()=>({})}) } };
win.window = win;
global.window = win; global.document = win.document;
new Function('window','document','global', fs.readFileSync(path+'core.js','utf8')+fs.readFileSync(path+'selection.js','utf8'))(win, win.document, win);

const S = win.Stompat.selection;
const overlay = makeEl(), rectEl = makeEl();
const canvas = { width:800, height:1132, getBoundingClientRect:()=>({left:0,top:0,width:400,height:566}) };
S.mount({overlay, rectEl, canvas});
S.setEnabled(true);

const events = [];
['change','commit','clear','toosmall'].forEach(n=>S.on(n,p=>events.push(n)));
const fire=(n,x,y)=>overlay.handlers[n].forEach(f=>f({clientX:x,clientY:y,pointerId:1,preventDefault(){}}));
const drag=(x1,y1,x2,y2)=>{ fire('pointerdown',x1,y1); fire('pointermove',x2,y2); fire('pointerup',x2,y2); };

const eq=(label,got,want)=>{
  const ok = JSON.stringify(got)===JSON.stringify(want);
  console.log((ok?'PASS  ':'FAIL  ')+label, ok?'':'\n  got  '+JSON.stringify(got)+'\n  want '+JSON.stringify(want));
  if(!ok) process.exitCode=1;
};

drag(100,100,300,400);
eq('nuova selezione -> px', S.get().px, {x:200,y:200,w:400,h:600});

// trascinamento interno: sposta di +20,+20 client px = +40,+40 px canvas
fire('pointerdown',200,300); fire('pointermove',220,320); fire('pointerup',220,320);
eq('spostamento riquadro', S.get().px, {x:240,y:240,w:400,h:600});

// angolo in basso a destra (320,420 client) afferrato e portato a 360,480
fire('pointerdown',320,420); fire('pointermove',360,480); fire('pointerup',360,480);
eq('ridimensionamento da angolo', S.get().px, {x:240,y:240,w:480,h:720});

// clamp: non deve uscire dal canvas
drag(380,540,10000,10000);
const p=S.get().px;
eq('clamp entro il canvas', [p.x+p.w<=canvas.width, p.y+p.h<=canvas.height], [true,true]);

// selezione microscopica -> scartata
events.length=0;
drag(50,50,52,52);
eq('area troppo piccola -> nessuna selezione', [S.isEmpty(), events.includes('toosmall')], [true,true]);

S.clear();
eq('clear -> vuota', S.isEmpty(), true);
