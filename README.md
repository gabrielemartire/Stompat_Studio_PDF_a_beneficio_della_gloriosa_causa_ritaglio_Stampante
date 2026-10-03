# Stompat - Studio PDF a beneficio della gloriosa causa ritaglio Stampante.

Carichi un PDF, selezioni con il mouse (o con il dito) la porzione esatta di una pagina,
la raddrizzi se la scansione è storta, e stampi solo quella. Niente backend, niente build,
niente upload: il file non lascia mai il browser.

👉 **[Apri l'applicazione](https://gabrielemartire.github.io/Stompat_Studio_PDF_a_beneficio_della_gloriosa_causa_ritaglio_Stampante/)**

## Cosa fa

- carica un PDF da file o trascinandolo nella pagina
- renderizza la pagina corrente a 2.2× per una stampa nitida (con tetto di sicurezza sulle pagine enormi)
- naviga tra le pagine (anche con ← e →)
- **rotazione a 90°** a sinistra o a destra, per i PDF salvati girati
- **inclinazione fine da −10° a +10°**, passo 0.1°, per le scansioni storte; si combina
  con i 90°. La selezione lavora sull'immagine già ruotata, quindi si stampa
  esattamente ciò che si vede
- riquadro di selezione con Pointer Events: trascina per disegnarlo, trascina dentro per
  spostarlo, trascina un angolo per ridimensionarlo, `Esc` per azzerarlo
- anteprima del ritaglio, con dimensioni in pixel e misura approssimativa in millimetri sulla carta
- **più ritagli in coda**: aggiungi quanti ritagli vuoi, anche da pagine diverse, e li stampi
  tutti insieme — un ritaglio per foglio, nell'ordine in cui li hai aggiunti
- **stampa a dimensione reale (1:1)** oppure adattata al foglio, con un'anteprima che mostra
  dove finisce il ritaglio su un A4 e avverte se non ci sta
- **scorciatoie**: frecce per spostare la selezione di 1 px (`Shift` 10 px), `Invio` per
  aggiungerla alla lista, `PagSu`/`PagGiù` per cambiare pagina, `Esc` per annullare
- **Stampa** in una finestra separata, con doppio fallback se il popup viene bloccato
- **Scarica PNG**, del singolo ritaglio o di tutta la lista

## Come si usa

Doppio click su `index.html`. Oppure, se preferisci un server locale:

```sh
python3 -m http.server 8000   # poi apri http://localhost:8000
```

Serve una connessione alla prima apertura, perché PDF.js e il font arrivano da CDN.

## Struttura

```
index.html                 markup e testi
assets/css/stompat.css     palette, tipografia, layout
assets/js/core.js          namespace, event bus, utilità
assets/js/view.js          PDF.js, render della pagina, rotazione fine
assets/js/ruler.js         righelli in millimetri attorno alla pagina
assets/js/selection.js     riquadro di selezione (mouse + touch)
assets/js/output.js        ritaglio, stampa con fallback, download
assets/js/app.js           collegamento DOM e stato dell'interfaccia
test/selection.test.js     test della geometria di selezione (node, zero dipendenze)
test/output.test.js        test del documento di stampa multi-foglio
```

Script classici, nessun modulo ES: così il doppio click su `index.html` funziona
senza server (i moduli verrebbero bloccati dalle regole CORS su `file://`).

### Come funziona la rotazione

Il canvas sorgente è la pagina renderizzata da PDF.js e non viene mai ruotato.
La rotazione viene applicata ridisegnandolo su un secondo canvas, dimensionato per
contenere gli angoli senza tagliarli (`w·|cos| + h·|sin|` per il lato, e simmetrico per l'altro).
Selezione, anteprima, stampa e download leggono tutti da **quel** canvas.
Cambiare l'angolo annulla la selezione corrente, perché le coordinate non sarebbero più valide.

### Come funziona la scala di stampa

In modalità **reale** ogni immagine riceve una larghezza e un'altezza esplicite in millimetri,
calcolate dai punti PDF (`px / pxPerPoint · 25.4 / 72`): il ritaglio esce sulla carta
nella stessa misura che aveva nel documento. In modalità **adatta al foglio** l'immagine viene
ingrandita fino al limite dell'area stampabile. L'anteprima accanto ai pulsanti disegna il
ritaglio dentro un A4 (con i margini di `@page`), ruota il foglio in orizzontale quando serve
e segnala in rosso i ritagli troppo grandi. Il formato di riferimento sta in un posto solo,
`Stompat.PAPER` in `assets/js/core.js`.

### Come funziona la stampa

Tre vie, in ordine:

1. finestra separata con dentro solo l'immagine ritagliata — evita i blocchi di
   `window.print()` quando la pagina gira dentro un iframe;
2. se il popup viene bloccato: iframe nascosto con lo stesso documento;
3. se anche quello fallisce: finestra di dialogo con l'anteprima, le istruzioni per
   consentire i popup e il download diretto del PNG.

## Test

Due test senza dipendenze: la geometria della selezione (disegno, spostamento,
ridimensionamento dagli angoli, clamp ai bordi, scarto delle aree troppo piccole)
e la composizione del documento di stampa:

```sh
node test/selection.test.js
node test/output.test.js
```

## Stile

Poster svizzero: pagina bianca, righe nere, numeri di sezione grandi, titolo in
verticale e un motivo di righe parallele che piegano di 90°.
Il rosso acceso (`#e2001a`) compare solo dove si agisce: il pulsante da premere,
il numero del passo in corso, la selezione. Titolo e righe di fondo usano un rosso
più scuro (`#8f1220`).
Attorno alla pagina ci sono righelli in millimetri in scala reale, e la selezione
ha i crocini di taglio agli angoli.
Il carattere è [Archivo](https://fonts.google.com/specimen/Archivo). Solo tema chiaro.

## Dipendenze

- [PDF.js](https://mozilla.github.io/pdf.js/) 3.11.174 da cdnjs
- [Archivo](https://fonts.google.com/specimen/Archivo) da Google Fonts

## Licenza

MIT — vedi [LICENSE](LICENSE).
