# Stompat № 001

**Studio PDF a beneficio della gloriosa causa ritaglio Stampante.**

Carichi un PDF, selezioni con il mouse (o con il dito) la porzione esatta di una pagina,
la raddrizzi se la scansione è storta, e stampi solo quella. Niente backend, niente build,
niente upload: il file non lascia mai il browser.

👉 **[Apri Stompat](https://gabrielemartire.github.io/Stompat_Studio_PDF_a_beneficio_della_gloriosa_causa_ritaglio_Stampante/)**

## Cosa fa

- carica un PDF da file o trascinandolo nella pagina
- renderizza la pagina corrente a 2.2× per una stampa nitida (con tetto di sicurezza sulle pagine enormi)
- naviga tra le pagine (anche con ← e →)
- **rotazione fine da −10° a +10°**, passo 0.1°, per raddrizzare le scansioni storte:
  la selezione lavora sull'immagine già ruotata, quindi si stampa esattamente ciò che si vede
- riquadro di selezione con Pointer Events: trascina per disegnarlo, trascina dentro per
  spostarlo, trascina un angolo per ridimensionarlo, `Esc` per azzerarlo
- anteprima del ritaglio, con dimensioni in pixel e misura approssimativa in millimetri sulla carta
- **Stampa** in una finestra separata, con doppio fallback se il popup viene bloccato
- **Scarica PNG** del solo ritaglio

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
assets/js/selection.js     riquadro di selezione (mouse + touch)
assets/js/output.js        ritaglio, stampa con fallback, download
assets/js/app.js           collegamento DOM e stato dell'interfaccia
test/selection.test.js     test della geometria di selezione (node, zero dipendenze)
```

Script classici, nessun modulo ES: così il doppio click su `index.html` funziona
senza server (i moduli verrebbero bloccati dalle regole CORS su `file://`).

### Come funziona la rotazione

Il canvas sorgente è la pagina renderizzata da PDF.js e non viene mai ruotato.
La rotazione viene applicata ridisegnandolo su un secondo canvas, dimensionato per
contenere gli angoli senza tagliarli (`w·|cos| + h·|sin|` per il lato, e simmetrico per l'altro).
Selezione, anteprima, stampa e download leggono tutti da **quel** canvas.
Cambiare l'angolo invalida la selezione corrente, perché le coordinate non sarebbero più valide.

### Come funziona la stampa

Tre vie, in ordine:

1. finestra separata con dentro solo l'immagine ritagliata — evita i blocchi di
   `window.print()` quando la pagina gira dentro un iframe;
2. se il popup viene bloccato: iframe nascosto con lo stesso documento;
3. se anche quello fallisce: modale con l'anteprima, le istruzioni per sbloccare i popup
   e il download diretto del PNG.

## Test

La geometria della selezione (disegno, spostamento, ridimensionamento dagli angoli, clamp
ai bordi, scarto delle aree microscopiche) ha un test senza dipendenze:

```sh
node test/selection.test.js
```

## Stile

Interfaccia neutra al 95%. Il resto è citazione: [Russo One](https://fonts.google.com/specimen/Russo+One)
solo per il titolo e le etichette di sezione, un unico accento rosso mattone (`#9E2A2B`),
un filetto doppio da intestazione burocratica sui pannelli e un numero di protocollo finto
accanto al titolo. Tema chiaro e scuro automatici.

## Dipendenze

- [PDF.js](https://mozilla.github.io/pdf.js/) 3.11.174 da cdnjs
- [Russo One](https://fonts.google.com/specimen/Russo+One) da Google Fonts

## Licenza

MIT — vedi [LICENSE](LICENSE).
