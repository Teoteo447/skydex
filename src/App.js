import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import logo from './skydex_logo.png';

const CATEGORIE = {
  tutti: { label: '🌍 Tutti' },
  aereo: { label: '✈️ Aerei' },
  elicottero: { label: '🚁 Elicotteri' },
  drone: { label: '🛸 Droni' },
};

const getIcona = (categoria, collezionato) => {
  if (collezionato) return '⭐';
  if (categoria === 7) return '🚁';
  if (categoria === 10) return '🛸';
  return '✈️';
};

const getTipo = (categoria) => {
  if (categoria === 7) return 'elicottero';
  if (categoria === 10) return 'drone';
  return 'aereo';
};

const creaIcona = (emoji) => new L.DivIcon({
  html: emoji,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const iconaGps = new L.DivIcon({
  html: '📍',
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function StatBox({ emoji, valore, label }) {
  return (
    <div className="stat-box">
      <span className="stat-emoji">{emoji}</span>
      <span className="stat-valore">{valore}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function Statistiche({ logbook }) {
  if (logbook.length === 0) return null;

  const paesi = new Set(logbook.map(a => a.paese).filter(Boolean));
  const modelli = new Set(logbook.map(a => a.modello).filter(m => m && m !== 'N/D'));
  const quoteValide = logbook.filter(a => typeof a.quota === 'number');
  const quotaMedia = quoteValide.length > 0
    ? Math.round(quoteValide.reduce((s, a) => s + a.quota, 0) / quoteValide.length)
    : 'N/D';
  const velocitaValide = logbook.filter(a => typeof a.velocita === 'number');
  const piuVeloce = velocitaValide.length > 0
    ? velocitaValide.reduce((max, a) => a.velocita > max.velocita ? a : max)
    : null;
  const piuAlto = quoteValide.length > 0
    ? quoteValide.reduce((max, a) => a.quota > max.quota ? a : max)
    : null;
  const primo = logbook[logbook.length - 1];

  return (
    <div className="stats-sezione">
      <h2 className="stats-titolo">STATISTICHE</h2>
      <div className="stats-griglia">
        <StatBox emoji="✈️" valore={logbook.length} label="Aerei collezionati" />
        <StatBox emoji="🌍" valore={paesi.size} label="Paesi diversi" />
        <StatBox emoji="🛩️" valore={modelli.size} label="Modelli diversi" />
        <StatBox emoji="📏" valore={quotaMedia !== 'N/D' ? `${quotaMedia} m` : 'N/D'} label="Quota media" />
        {piuVeloce && <StatBox emoji="💨" valore={`${piuVeloce.velocita} km/h`} label={`Più veloce: ${piuVeloce.callsign}`} />}
        {piuAlto && <StatBox emoji="🏔️" valore={`${piuAlto.quota} m`} label={`Più alto: ${piuAlto.callsign}`} />}
        {primo && <StatBox emoji="🏆" valore={primo.modello !== 'N/D' ? primo.modello : primo.callsign} label={`Primo — ${primo.orario}`} />}
      </div>
    </div>
  );
}

function PopupAereo({ aereo, collezionato, onColleziona }) {
  const [foto, setFoto] = useState(null);
  const [loadingFoto, setLoadingFoto] = useState(true);

  useEffect(() => {
    const fetchFoto = async () => {
      try {
        const res = await fetch(`https://api.planespotters.net/pub/photos/hex/${aereo.id}`);
        const data = await res.json();
        if (data.photos && data.photos.length > 0) setFoto(data.photos[0]);
      } catch (err) {}
      finally { setLoadingFoto(false); }
    };
    fetchFoto();
  }, [aereo.id]);

  return (
    <div className="popup">
      <h3>{getIcona(aereo.categoria, false)} {aereo.callsign}</h3>
      <div className="popup-foto">
        {loadingFoto && <div className="foto-loading">📸 Cerco foto...</div>}
        {!loadingFoto && foto && (
          <div>
            <img src={foto.thumbnail_large?.src || foto.thumbnail?.src} alt={aereo.callsign} className="foto-aereo" />
            <p className="foto-credits">📷 {foto.photographer}</p>
          </div>
        )}
        {!loadingFoto && !foto && <div className="foto-nessuna">📷 Nessuna foto</div>}
      </div>
      {aereo.modello && aereo.modello !== 'N/D' && <p>🛩️ <strong>{aereo.modello}</strong></p>}
      <p>🏷️ Tipo: {aereo.tipo}</p>
      <p>🌍 Paese: {aereo.paese}</p>
      <p>📡 ICAO: {aereo.id}</p>
      <p>📏 Quota: {aereo.quota} m</p>
      <p>💨 Velocità: {aereo.velocita} km/h</p>
      <p>🧭 Rotta: {aereo.rotta}°</p>
      <button
        className={collezionato ? 'btn-gia' : 'btn-colleziona'}
        onClick={() => onColleziona(aereo)}
        disabled={collezionato}
      >
        {collezionato ? '⭐ Già collezionato!' : '+ Colleziona'}
      </button>
    </div>
  );
}

function SchedaModello({ modello, avvistamenti, onChiudi }) {
  const [foto, setFoto] = useState(null);

  useEffect(() => {
    const fetchFoto = async () => {
      try {
        const res = await fetch(`https://api.planespotters.net/pub/photos/hex/${avvistamenti[0].id}`);
        const data = await res.json();
        if (data.photos && data.photos.length > 0) setFoto(data.photos[0]);
      } catch (err) {}
    };
    fetchFoto();
  }, [avvistamenti]);

  return (
    <div className="scheda-overlay">
      <div className="scheda-contenuto">
        <button className="scheda-chiudi" onClick={onChiudi}>✕</button>
        <div className="scheda-header">
          {foto
            ? <img src={foto.thumbnail_large?.src || foto.thumbnail?.src} alt={modello} className="scheda-foto" />
            : <div className="scheda-foto-placeholder">✈️</div>
          }
          <div>
            <h2 className="scheda-titolo">{modello}</h2>
            <p className="scheda-count">{avvistamenti.length} avvistament{avvistamenti.length === 1 ? 'o' : 'i'}</p>
          </div>
        </div>
        <h3 className="scheda-rotte-titolo">AVVISTAMENTI</h3>
        <div className="scheda-rotte">
          {avvistamenti.map((a, i) => (
            <div key={i} className="scheda-rotta-card">
              <div className="scheda-rotta-top">
                <span className="scheda-callsign">✈️ {a.callsign}</span>
                <span className="scheda-orario">🕐 {a.orario}</span>
              </div>
              <div className="scheda-rotta-dati">
                <span>📡 {a.id}</span>
                <span>🌍 {a.paese}</span>
                <span>📏 {a.quota} m</span>
                <span>💨 {a.velocita} km/h</span>
                <span>🧭 {a.rotta}°</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CartaModello({ modello, avvistamenti, onClick, onRimuovi }) {
  const [foto, setFoto] = useState(null);

  useEffect(() => {
    const fetchFoto = async () => {
      try {
        const res = await fetch(`https://api.planespotters.net/pub/photos/hex/${avvistamenti[0].id}`);
        const data = await res.json();
        if (data.photos && data.photos.length > 0) setFoto(data.photos[0]);
      } catch (err) {}
    };
    fetchFoto();
  }, [avvistamenti]);

  return (
    <div className="carta-modello" onClick={onClick}>
      <div className="carta-foto-wrap">
        {foto
          ? <img src={foto.thumbnail_large?.src || foto.thumbnail?.src} alt={modello} className="carta-foto" />
          : <div className="carta-foto-placeholder">✈️</div>
        }
        <span className="carta-badge">{avvistamenti.length}x</span>
      </div>
      <div className="carta-info">
        <p className="carta-nome">{modello}</p>
        <p className="carta-paese">{avvistamenti[0].paese}</p>
        <p className="carta-data">{avvistamenti[avvistamenti.length - 1].orario}</p>
      </div>
      <button
        className="carta-rimuovi"
        onClick={(e) => { e.stopPropagation(); onRimuovi(avvistamenti[0].id); }}
      >✕</button>
    </div>
  );
}

function PaginaLogbook({ logbook, onChiudi, onRimuovi }) {
  const [modelloSelezionato, setModelloSelezionato] = useState(null);
  const [filtroLogbook, setFiltroLogbook] = useState('tutti');

  const logbookFiltrato = logbook.filter(a => {
    if (filtroLogbook === 'tutti') return true;
    return a.tipo === filtroLogbook;
  });

  const modelli = logbookFiltrato.reduce((acc, aereo) => {
    const chiave = (aereo.modello && aereo.modello !== 'N/D') ? aereo.modello : (aereo.callsign !== 'N/D' ? aereo.callsign : aereo.id);
    if (!acc[chiave]) acc[chiave] = [];
    acc[chiave].push(aereo);
    return acc;
  }, {});

  const avvistamentiSelezionati = modelloSelezionato ? modelli[modelloSelezionato] : null;

  return (
    <div className="logbook-pagina">
      <div className="logbook-pagina-header">
        <img src={logo} alt="SkyDex" className="logo" />
        <span className="contatore">{logbook.length} aerei collezionati</span>
        <button className="logbook-chiudi" onClick={onChiudi}>✕ Chiudi</button>
      </div>

      <div className="logbook-filtro-bar">
        <select
          className="logbook-filtro-select"
          value={filtroLogbook}
          onChange={(e) => setFiltroLogbook(e.target.value)}
        >
          <option value="tutti">🌍 Tutti</option>
          <option value="aereo">✈️ Aerei</option>
          <option value="elicottero">🚁 Elicotteri</option>
          <option value="drone">🛸 Droni</option>
        </select>
        <span className="logbook-filtro-count">
          {Object.keys(modelli).length} modelli · {logbookFiltrato.length} avvistamenti
        </span>
      </div>

      <div className="logbook-scroll">
        <Statistiche logbook={logbook} />
        {logbookFiltrato.length === 0 ? (
          <div className="logbook-vuoto-grande">
            <p>✈️</p>
            <p>Nessun aereo in questa categoria.</p>
          </div>
        ) : (
          <>
            <h2 className="collezione-titolo">LA TUA COLLEZIONE</h2>
            <div className="logbook-griglia">
              {Object.entries(modelli).map(([modello, avvistamenti]) => (
                <CartaModello
                  key={modello}
                  modello={modello}
                  avvistamenti={avvistamenti}
                  onClick={() => setModelloSelezionato(modello)}
                  onRimuovi={onRimuovi}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {modelloSelezionato && avvistamentiSelezionati && (
        <SchedaModello
          modello={modelloSelezionato}
          avvistamenti={avvistamentiSelezionati}
          onChiudi={() => setModelloSelezionato(null)}
        />
      )}
    </div>
  );
}

function CentraGps({ posizione }) {
  const map = useMap();
  useEffect(() => {
    if (posizione) {
      map.flyTo([posizione.lat, posizione.lng], 12, { duration: 1.5 });
    }
  }, [posizione, map]);
  return null;
}

function App() {
  const [aerei, setAerei] = useState([]);
  const [status, setStatus] = useState('Caricamento...');
  const [filtro, setFiltro] = useState('tutti');
  const [logbook, setLogbook] = useState(() => {
    const salvato = localStorage.getItem('skycar-logbook');
    return salvato ? JSON.parse(salvato) : [];
  });
  const [mostraLogbook, setMostraLogbook] = useState(false);
  const [posizione, setPosizione] = useState(null);
  const [gpsAttivo, setGpsAttivo] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('');

  const fetchAerei = async () => {
    try {
      setStatus('Connessione...');
      const res = await fetch('https://skydex.onrender.com/api/aerei');
      const data = await res.json();
      if (!data.states) { setStatus('Nessun aereo ricevuto'); return; }
      const voli = data.states
        .filter(s => s[5] != null && s[6] != null)
        .map(s => ({
          id: s[0],
          callsign: s[1]?.trim() || 'N/D',
          paese: s[2],
          longitudine: parseFloat(s[5]),
          latitudine: parseFloat(s[6]),
          quota: s[7] ? Math.round(s[7]) : 'N/D',
          velocita: s[9] ? Math.round(s[9] * 3.6) : 'N/D',
          rotta: s[10] ? Math.round(s[10]) : 0,
          categoria: s[17] || 0,
          tipo: getTipo(s[17] || 0),
          modello: s[18] || 'N/D',
        }));
      setStatus(`${voli.length} AEREI IN VOLO`);
      setAerei(voli);
    } catch (err) { setStatus(`ERRORE: ${err.message}`); }
  };

  useEffect(() => {
    fetchAerei();
    const intervallo = setInterval(fetchAerei, 60000);
    return () => clearInterval(intervallo);
  }, []);

  const attivaGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('GPS non supportato');
      return;
    }
    setGpsStatus('Cerco posizione...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosizione({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsAttivo(true);
        setGpsStatus('');
      },
      () => setGpsStatus('GPS non disponibile')
    );
  };

  const colleziona = (aereo) => {
    if (logbook.find(a => a.id === aereo.id)) return;
    const nuovoLogbook = [{ ...aereo, orario: new Date().toLocaleString('it-IT') }, ...logbook];
    setLogbook(nuovoLogbook);
    localStorage.setItem('skycar-logbook', JSON.stringify(nuovoLogbook));
  };

  const rimuovi = (id) => {
    const nuovoLogbook = logbook.filter(a => a.id !== id);
    setLogbook(nuovoLogbook);
    localStorage.setItem('skycar-logbook', JSON.stringify(nuovoLogbook));
  };

  const isCollezionato = (id) => logbook.some(a => a.id === id);
  const aereiFiltrati = aerei.filter(a => filtro === 'tutti' || a.tipo === filtro);

  if (mostraLogbook) {
    return <PaginaLogbook logbook={logbook} onChiudi={() => setMostraLogbook(false)} onRimuovi={rimuovi} />;
  }

  return (
    <div className="app">
      <div className="header">
        <img src={logo} alt="SkyDex" className="logo" />
        <div className="filtri">
          {Object.entries(CATEGORIE).map(([chiave, val]) => (
            <button key={chiave} className={`btn-filtro ${filtro === chiave ? 'attivo' : ''}`} onClick={() => setFiltro(chiave)}>
              {val.label}
            </button>
          ))}
        </div>
        <div className="header-destra">
          <span className="contatore">{gpsStatus || status}</span>
          <button
            className={`btn-gps ${gpsAttivo ? 'attivo' : ''}`}
            onClick={attivaGps}
            title="Trova la mia posizione"
          >
            📍 {gpsAttivo ? 'GPS ON' : 'GPS'}
          </button>
          <button className="btn-logbook" onClick={() => setMostraLogbook(true)}>
            📒 LOGBOOK ({logbook.length})
          </button>
        </div>
      </div>

      <div className="contenuto">
        <MapContainer center={[45.4642, 9.1900]} zoom={7} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
          {posizione && <CentraGps posizione={posizione} />}
          {posizione && (
            <Marker position={[posizione.lat, posizione.lng]} icon={iconaGps}>
              <Popup><strong>📍 Sei qui</strong></Popup>
            </Marker>
          )}
          {aereiFiltrati.map(aereo => (
            <Marker
              key={aereo.id}
              position={[aereo.latitudine, aereo.longitudine]}
              icon={creaIcona(getIcona(aereo.categoria, isCollezionato(aereo.id)))}
            >
              <Popup minWidth={220}>
                <PopupAereo aereo={aereo} collezionato={isCollezionato(aereo.id)} onColleziona={colleziona} />
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

export default App;