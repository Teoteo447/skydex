const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const cors = require('cors');

const app = express();
app.use(cors());

const MODELLI = {
  'B738': 'Boeing 737-800', 'B737': 'Boeing 737-700', 'B739': 'Boeing 737-900',
  'B744': 'Boeing 747-400', 'B748': 'Boeing 747-800', 'B752': 'Boeing 757-200',
  'B762': 'Boeing 767-200', 'B763': 'Boeing 767-300', 'B772': 'Boeing 777-200',
  'B773': 'Boeing 777-300', 'B77W': 'Boeing 777-300ER', 'B788': 'Boeing 787-8',
  'B789': 'Boeing 787-9', 'B78X': 'Boeing 787-10', 'B736': 'Boeing 737-600',
  'B38M': 'Boeing 737 MAX 8', 'B39M': 'Boeing 737 MAX 9',
  'A19N': 'Airbus A320neo', 'A20N': 'Airbus A320neo', 'A21N': 'Airbus A321neo',
  'A318': 'Airbus A318', 'A319': 'Airbus A319', 'A320': 'Airbus A320',
  'A321': 'Airbus A321', 'A332': 'Airbus A330-200', 'A333': 'Airbus A330-300',
  'A343': 'Airbus A340-300', 'A346': 'Airbus A340-600', 'A359': 'Airbus A350-900',
  'A35K': 'Airbus A350-1000', 'A388': 'Airbus A380-800', 'A124': 'Antonov An-124',
  'C172': 'Cessna 172', 'C208': 'Cessna 208', 'C25A': 'Cessna CJ2',
  'C25B': 'Cessna CJ3', 'C68A': 'Cessna 680A', 'C750': 'Cessna Citation X',
  'E170': 'Embraer 170', 'E175': 'Embraer 175', 'E190': 'Embraer 190',
  'E195': 'Embraer 195', 'E290': 'Embraer E190-E2', 'E295': 'Embraer E195-E2',
  'AT43': 'ATR 42-300', 'AT45': 'ATR 42-500', 'AT72': 'ATR 72-200',
  'AT75': 'ATR 72-500', 'AT76': 'ATR 72-600',
  'DH8A': 'Dash 8-100', 'DH8B': 'Dash 8-200', 'DH8C': 'Dash 8-300', 'DH8D': 'Dash 8-400',
  'CRJ2': 'Bombardier CRJ-200', 'CRJ7': 'Bombardier CRJ-700', 'CRJ9': 'Bombardier CRJ-900',
  'GL5T': 'Bombardier Global 5000', 'GLEX': 'Bombardier Global Express',
  'F100': 'Fokker 100', 'F70': 'Fokker 70',
  'MD11': 'McDonnell Douglas MD-11', 'MD82': 'McDonnell Douglas MD-82',
  'DC10': 'Douglas DC-10',
  'P28A': 'Piper PA-28', 'PA44': 'Piper PA-44',
  'SR22': 'Cirrus SR22', 'SR20': 'Cirrus SR20',
  'H25B': 'Hawker 800', 'GALX': 'IAI Galaxy',
  'F15': 'F-15 Eagle', 'F16': 'F-16 Falcon', 'F18': 'F/A-18 Hornet',
  'C130': 'Lockheed C-130', 'C17': 'Boeing C-17', 'P8': 'Boeing P-8',
  'E3TF': 'Boeing E-3 Sentry', 'RC135': 'Boeing RC-135',
  'R44': 'Robinson R44', 'R22': 'Robinson R22',
  'EC35': 'Airbus H135', 'EC45': 'Airbus H145', 'EC55': 'Airbus H155',
  'AS32': 'Airbus AS332', 'AS35': 'Airbus AS350', 'AS65': 'Airbus AS365',
  'B06': 'Bell 206', 'B212': 'Bell 212', 'B412': 'Bell 412', 'B429': 'Bell 429',
  'S61': 'Sikorsky S-61', 'S76': 'Sikorsky S-76', 'S92': 'Sikorsky S-92',
  'AW13': 'AgustaWestland AW139', 'AW16': 'AgustaWestland AW169',
  'MI8': 'Mil Mi-8', 'MI17': 'Mil Mi-17',
};

const getCategoria = (cat) => {
  if (!cat) return 0;
  if (cat === 'A7') return 7;
  if (cat === 'B1' || cat === 'B2') return 10;
  return 0;
};

const PORT = process.env.PORT || 3001;

app.get('/api/aerei', async (req, res) => {
  try {
    const risposta = await fetch(
      'https://api.adsb.lol/v2/lat/41.9/lon/12.5/dist/500',
      { headers: { 'User-Agent': 'SkyDex/1.0' } }
    );

    const testo = await risposta.text();
    const dati = JSON.parse(testo);

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
        getCategoria(a.category),
        MODELLI[a.t] || a.t || 'N/D',
      ]);

    console.log('Aerei:', states.length);
    res.json({ states });
  } catch (err) {
    console.log('Errore:', err.message);
    res.status(500).json({ errore: err.message });
  }
});

app.listen(PORT, () => {
  console.log('✅ Server avviato su porta ' + PORT);
});