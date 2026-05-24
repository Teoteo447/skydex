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

// Comprime immagine a thumbnail base64
const comprImmagine = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 400;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = h * MAX / w; w = MAX; } }
      else { if (h > MAX) { w = w * MAX / h; h = MAX; } }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = reject;
    img.src = e.target.result;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

// Verifica furba — controlla luminosità e contrasto
const verificaFoto = (base64) => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const dati = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let luminosita = 0;
    let min = 255, max = 0;

    for (let i = 0; i < dati.length; i += 4) {
      const l = (dati[i] + dati[i+1] + dati[i+2]) / 3;
      luminosita += l;
      if (l < min) min = l;
      if (l > max) max = l;
    }

    luminosita = luminosita / (dati.length / 4);
    const contrasto = max - min;

    // Foto troppo scura o senza contrasto = probabilmente non è un aereo
    if (luminosita < 30) { resolve({ ok: false, motivo: 'Foto troppo scura!' }); return; }
    if (contrasto < 40) { resolve({ ok: false, motivo: 'Foto troppo uniforme!' }); return; }

    // Controlla zona superiore — deve essere più chiara (cielo)
    const zonaAlta = ctx.getImageData(0, 0, canvas.width, Math.floor(canvas.height * 0.3)).data;
    let luceAlta = 0;
    for (let i = 0; i < zonaAlta.length; i += 4) {
      luceAlta += (zonaAlta[i] + zonaAlta[i+1] + zonaAlta[i+2]) / 3;
    }
    luceAlta = luceAlta / (zonaAlta.length / 4);

    if (luceAlta < 80) { resolve({ ok: false, motivo: 'Non sembra il cielo in alto!' }); return; }

    resolve({ ok: true });
  };
  img.src = base64;
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
    ? velocitaValide.reduce((max, a) => a.velocita > max.velocita ? a : max) : null;
  const piuAlto = quoteValide.length > 0
    ? quoteValide.reduce((max, a) => a.quota > max.quota ? a : max) : null;
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
  const [fotoUtente, setFotoUtente] = useState(null);
  const [verificando, setVerificando] = useState(false);
  const [errore, setErrore] = useState('');

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

  const gestisciFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVerificando(true);
    setErrore('');
    try {
      const compressa = await comprImmagine(file);
      const verifica = await verificaFoto(compressa);
      if (!verifica.ok) {
        setErrore(verifica.motivo);
        setVerificando(false);
        return;
      }
      setFotoUtente(compressa);
    } catch (err) {
      setErrore('Errore nel caricamento della foto');
    }
    setVerificando(false);
  };

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

      {!collezionato && (
        <div className="foto-upload-area">
          {fotoUtente ? (
            <div className="foto-preview-wrap">
              <img src={fotoUtente} alt="La tua foto" className="foto-preview" />
              <button className="btn-cambia-foto" onClick={() => setFotoUtente(null)}>
                🔄 Cambia foto
              </button>
            </div>
          ) : (
            <label className="btn-scatta">
              📸 Scatta o carica foto
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={gestisciFoto}
                style={{ display: 'none' }}
              />
            </label>
          )}
          {verificando && <p className="foto-verifica">🔍 Verifico foto...</p>}
          {errore && <p className="foto-errore">❌ {errore}</p>}
        </div>
      )}

      <button
        className={collezionato ? 'btn-gia' : (fotoUtente ? 'btn-colleziona' : 'btn-colleziona-disabilitato')}
        onClick={() => fotoUtente && onColleziona({ ...aereo, fotoUtente })}
        disabled={collezionato || !fotoUtente}
      >
        {collezionato ? '⭐ Già collezionato!' : (fotoUtente ? '+ Colleziona' : '📸 Foto richiesta')}
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

  const fotoMie = avvistamenti.filter(a => a.fotoUtente);

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

        {fotoMie.length > 0 && (
          <div className="scheda-galleria">
            <h3 className="scheda-rotte-titolo">📸 LE TUE FOTO</h3>
            <div className="scheda-galleria-griglia">
              {fotoMie.map((a, i) => (
                <div key={i} className="scheda-galleria-item">
                  <img src={a.fotoUtente} alt={`foto ${i+1}`} className="scheda-galleria-foto" />
                  <p className="scheda-galleria-data">{a.orario}</p>
                </div>
              ))}
            </div>
          </div>
        )}

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

  const fotoMostrata = foto ? (foto.thumbnail_large?.src || foto.thumbnail?.src) : null;
  const haFotoUtente = avvistamenti.some(a => a.fotoUtente);

  return (
    <div className="carta-modello" onClick={onClick}>
      <div className="carta-foto-wrap">
        {fotoMostrata
          ? <img src={fotoMostrata} alt={modello} className="carta-foto" />
          : <div className="carta-foto-placeholder">✈️</div>
        }
        <span className="carta-badge">{avvistamenti.length}x</span>
        {haFotoUtente && <span className="carta-badge-foto">📸</span>}
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
    if (!navigator.geolocation) { setGpsStatus('GPS non supportato'); return; }
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
          <button className={`btn-gps ${gpsAttivo ? 'attivo' : ''}`} onClick={attivaGps}>
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
