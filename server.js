const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/api/aerei', async (req, res) => {
  try {
    const risposta = await fetch(
      'https://api.adsb.lol/v2/lat/41.9/lon/12.5/dist/500',
      { headers: { 'User-Agent': 'SkyDex/1.0' } }
    );

    const testo = await risposta.text();
    console.log('Risposta raw:', testo.substring(0, 200));

    const dati = JSON.parse(testo);
    console.log('Aerei ricevuti:', dati.ac ? dati.ac.length : 'nessuno');

    if (!dati.ac) { res.json({ states: [] }); return; }

    const states = dati.ac
      .filter(a => a.lat && a.lon)
      .map(a => [
        a.hex,
        a.flight ? a.flight.trim() : 'N/D',
        a.r || 'N/D',
        null, null,
        a.lon,
        a.lat,
        a.alt_baro || a.alt_geom || null,
        false,
        a.gs || null,
        a.track || null,
        null, null, null,
        null, null, null,
        a.category || 0,
      ]);

    res.json({ states });
  } catch (err) {
    console.log('Errore:', err.message);
    res.status(500).json({ errore: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('✅ Server avviato su porta ' + PORT);
});