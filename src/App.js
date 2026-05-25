import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import logo from './skydex_logo.png';

const CATEGORIE = {
  tutti: { label: '🌍 Tutti' },
  aereo: { label: '✈️ Aerei' },
  elicottero: { label: '🚁 Elicotteri' },
};

const getTipo = (categoria) => {
  if (categoria === 7) return 'elicottero';
  return 'aereo';
};

const PUNTI_MODELLO = {
  'Airbus A380-800': 15, 'Boeing 747-400': 15, 'Boeing 747-800': 15,
  'Antonov An-124': 15,
  'Boeing 787-8': 8, 'Boeing 787-9': 8, 'Boeing 787-10': 8,
  'Airbus A350-900': 8, 'Airbus A350-1000': 8,
  'Airbus A340-300': 8, 'Airbus A340-600': 8,
  'Boeing 777-200': 6, 'Boeing 777-300': 6, 'Boeing 777-300ER': 6,
  'Airbus A330-200': 6, 'Airbus A330-300': 6,
  'Boeing 767-200': 6, 'Boeing 767-300': 6,
  'Lockheed C-130': 10, 'Boeing C-17': 10, 'Boeing P-8': 10,
  'F-15 Eagle': 10, 'F-16 Falcon': 10, 'F/A-18 Hornet': 10,
  'Boeing E-3 Sentry': 10, 'Boeing RC-135': 10,
  'ATR 42-300': 4, 'ATR 42-500': 4, 'ATR 72-200': 4,
  'ATR 72-500': 4, 'ATR 72-600': 4,
  'Bombardier CRJ-200': 4, 'Bombardier CRJ-700': 4, 'Bombardier CRJ-900': 4,
  'Dash 8-100': 4, 'Dash 8-200': 4, 'Dash 8-300': 4, 'Dash 8-400': 4,
  'Fokker 100': 4, 'Fokker 70': 4,
  'Cessna 172': 3, 'Cessna 208': 3, 'Cirrus SR22': 3, 'Cirrus SR20': 3,
  'Piper PA-28': 3, 'Piper PA-44': 3,
};

const LIVELLI = [
  { min: 0,    max: 20,    livello: 1, titolo: 'Apprendista Spotter' },
  { min: 21,   max: 50,    livello: 2, titolo: 'Spotter Junior' },
  { min: 51,   max: 100,   livello: 3, titolo: 'Spotter' },
  { min: 101,  max: 200,   livello: 4, titolo: 'Spotter Esperto' },
  { min: 201,  max: 500,   livello: 5, titolo: 'Cacciatore di Cieli' },
  { min: 501,  max: 1000,  livello: 6, titolo: 'Maestro dei Cieli' },
  { min: 1001, max: 99999, livello: 7, titolo: 'Leggenda SkyDex' },
];

const calcolaPunti = (aereo) => {
  if (aereo.tipo === 'elicottero') return 5;
  if (PUNTI_MODELLO[aereo.modello]) return PUNTI_MODELLO[aereo.modello];
  if (aereo.modello && (aereo.modello.includes('Boeing 737') || aereo.modello.includes('Airbus A320') ||
    aereo.modello.includes('Airbus A319') || aereo.modello.includes('Airbus A321') ||
    aereo.modello.includes('Boeing 757'))) return 2;
  return 2;
};

const calcolaLivello = (puntiTotali) => {
  return LIVELLI.find(l => puntiTotali >= l.min && puntiTotali <= l.max) || LIVELLI[0];
};

const BADGES = [
  { id: 'primo_volo', emoji: '🛩️', nome: 'Primo Volo', descrizione: 'Primo aereo collezionato', check: (lb) => lb.length >= 1 },
  { id: 'cacciatore', emoji: '🚁', nome: 'Cacciatore', descrizione: 'Primo elicottero avvistato', check: (lb) => lb.some(a => a.tipo === 'elicottero') },
  { id: 'cacciatore_reale', emoji: '👑', nome: 'Cacciatore Reale', descrizione: 'Avvista un A380', check: (lb) => lb.some(a => a.modello === 'Airbus A380-800') },
  { id: 'globetrotter', emoji: '🌍', nome: 'Globetrotter', descrizione: '10 paesi diversi', check: (lb) => new Set(lb.map(a => a.paese)).size >= 10 },
  { id: 'fotografo', emoji: '📸', nome: 'Fotografo', descrizione: '10 foto scattate', check: (lb) => lb.filter(a => a.fotoUtente).length >= 10 },
  { id: 'collezionista', emoji: '⭐', nome: 'Collezionista', descrizione: '50 aerei collezionati', check: (lb) => lb.length >= 50 },
  { id: 'leggenda', emoji: '🏆', nome: 'Leggenda', descrizione: 'Raggiungi livello 7', check: (lb, punti) => punti >= 1001 },
];

const SFIDE = [
  { id: 's1', emoji: '🚁', testo: 'Avvista un elicottero', punti: 5, check: (lb, oggi) => lb.some(a => a.tipo === 'elicottero' && a.orario.startsWith(oggi)) },
  { id: 's2', emoji: '✈️', testo: 'Colleziona 3 aerei in un giorno', punti: 10, check: (lb, oggi) => lb.filter(a => a.orario.startsWith(oggi)).length >= 3 },
  { id: 's3', emoji: '📏', testo: 'Avvista un aereo sopra 10.000m', punti: 8, check: (lb, oggi) => lb.some(a => a.orario.startsWith(oggi) && a.quota >= 10000) },
  { id: 's4', emoji: '🌍', testo: 'Avvista aerei di 3 paesi diversi', punti: 8, check: (lb, oggi) => new Set(lb.filter(a => a.orario.startsWith(oggi)).map(a => a.paese)).size >= 3 },
  { id: 's5', emoji: '💨', testo: 'Avvista un aereo sopra 800 km/h', punti: 6, check: (lb, oggi) => lb.some(a => a.orario.startsWith(oggi) && a.velocita >= 800) },
  { id: 's6', emoji: '🛩️', testo: 'Colleziona un aereo da 8+ punti', punti: 12, check: (lb, oggi) => lb.some(a => a.orario.startsWith(oggi) && calcolaPunti(a) >= 8) },
  { id: 's7', emoji: '📸', testo: 'Scatta 2 foto in un giorno', punti: 7, check: (lb, oggi) => lb.filter(a => a.orario.startsWith(oggi) && a.fotoUtente).length >= 2 },
  { id: 's8', emoji: '👑', testo: 'Colleziona un aereo da 15 punti', punti: 20, check: (lb, oggi) => lb.some(a => a.orario.startsWith(oggi) && calcolaPunti(a) >= 15) },
  { id: 's9', emoji: '🏔️', testo: 'Avvista un aereo sopra 12.000m', punti: 10, check: (lb, oggi) => lb.some(a => a.orario.startsWith(oggi) && a.quota >= 12000) },
  { id: 's10', emoji: '🐢', testo: 'Avvista un aereo sotto 300 km/h', punti: 5, check: (lb, oggi) => lb.some(a => a.orario.startsWith(oggi) && a.velocita > 0 && a.velocita < 300) },
  { id: 's11', emoji: '🚀', testo: 'Avvista un aereo sopra 900 km/h', punti: 10, check: (lb, oggi) => lb.some(a => a.orario.startsWith(oggi) && a.velocita >= 900) },
  { id: 's12', emoji: '📡', testo: 'Avvista un aereo sotto 1.000m', punti: 8, check: (lb, oggi) => lb.some(a => a.orario.startsWith(oggi) && a.quota > 0 && a.quota < 1000) },
  { id: 's13', emoji: '🇩🇪', testo: 'Avvista un aereo tedesco', punti: 6, check: (lb, oggi) => lb.some(a => a.orario.startsWith(oggi) && a.paese === 'Germany') },
  { id: 's14', emoji: '🇬🇧', testo: 'Avvista un aereo britannico', punti: 6, check: (lb, oggi) => lb.some(a => a.orario.startsWith(oggi) && a.paese === 'United Kingdom') },
  { id: 's15', emoji: '🇺🇸', testo: 'Avvista un aereo americano', punti: 8, check: (lb, oggi) => lb.some(a => a.orario.startsWith(oggi) && a.paese === 'United States') },
  { id: 's16', emoji: '🌐', testo: 'Avvista 5 paesi diversi in un giorno', punti: 15, check: (lb, oggi) => new Set(lb.filter(a => a.orario.startsWith(oggi)).map(a => a.paese)).size >= 5 },
  { id: 's17', emoji: '🛸', testo: 'Colleziona un Boeing 787', punti: 10, check: (lb, oggi) => lb.some(a => a.orario.startsWith(oggi) && a.modello && a.modello.includes('Boeing 787')) },
  { id: 's18', emoji: '🌅', testo: 'Colleziona un aereo prima delle 9:00', punti: 8, check: (lb, oggi) => lb.some(a => a.orario.startsWith(oggi) && parseInt(a.orario.split(' ')[1]) < 9) },
  { id: 's19', emoji: '🌙', testo: 'Colleziona un aereo dopo le 22:00', punti: 10, check: (lb, oggi) => lb.some(a => a.orario.startsWith(oggi) && parseInt(a.orario.split(' ')[1]) >= 22) },
  { id: 's20', emoji: '📸', testo: 'Scatta 3 foto in un giorno', punti: 10, check: (lb, oggi) => lb.filter(a => a.orario.startsWith(oggi) && a.fotoUtente).length >= 3 },
  { id: 's21', emoji: '🔥', testo: 'Colleziona 5 aerei in un giorno', punti: 15, check: (lb, oggi) => lb.filter(a => a.orario.startsWith(oggi)).length >= 5 },
  { id: 's22', emoji: '⭐', testo: 'Colleziona 2 aerei da 6+ punti', punti: 12, check: (lb, oggi) => lb.filter(a => a.orario.startsWith(oggi) && calcolaPunti(a) >= 6).length >= 2 },
  { id: 's23', emoji: '🏔️', testo: 'Avvista un aereo in crociera (10-11km)', punti: 6, check: (lb, oggi) => lb.some(a => a.orario.startsWith(oggi) && a.quota >= 10000 && a.quota <= 11000) },
  { id: 's24', emoji: '🚁', testo: 'Colleziona un elicottero con foto', punti: 12, check: (lb, oggi) => lb.some(a => a.orario.startsWith(oggi) && a.tipo === 'elicottero' && a.fotoUtente) },
  { id: 's25', emoji: '🛩️', testo: 'Colleziona un jet privato', punti: 7, check: (lb, oggi) => lb.some(a => a.orario.startsWith(oggi) && a.modello && (a.modello.includes('Cessna') || a.modello.includes('Cirrus') || a.modello.includes('Bombardier Global'))) },
  { id: 's26', emoji: '🌍', testo: 'Colleziona aerei di 3 continenti', punti: 15, check: (lb, oggi) => {
    const paesiOggi = lb.filter(a => a.orario.startsWith(oggi)).map(a => a.paese);
    const europa = ['Italy','Germany','France','Spain','United Kingdom','Netherlands','Switzerland'];
    const americas = ['United States','Canada','Brazil','Mexico'];
    const asia = ['China','Japan','India','Singapore','UAE'];
    let cont = 0;
    if (paesiOggi.some(p => europa.includes(p))) cont++;
    if (paesiOggi.some(p => americas.includes(p))) cont++;
    if (paesiOggi.some(p => asia.includes(p))) cont++;
    return cont >= 3;
  }},
  { id: 's27', emoji: '📦', testo: 'Colleziona un aereo cargo', punti: 8, check: (lb, oggi) => lb.some(a => a.orario.startsWith(oggi) && a.callsign && (a.callsign.startsWith('UPS') || a.callsign.startsWith('FDX') || a.callsign.startsWith('DHL') || a.callsign.startsWith('TNT'))) },
  { id: 's28', emoji: '🎯', testo: 'Colleziona un aereo militare', punti: 12, check: (lb, oggi) => lb.some(a => a.orario.startsWith(oggi) && calcolaPunti(a) === 10) },
];

const getSfidaOggi = () => {
  const oggi = new Date();
  const seed = oggi.getFullYear() * 10000 + (oggi.getMonth() + 1) * 100 + oggi.getDate();
  return SFIDE[seed % SFIDE.length];
};

const getOggiStringa = () => {
  return new Date().toLocaleDateString('it-IT');
};
  

const creaIcona = (tipo, collezionato) => {
  if (collezionato) return new L.DivIcon({ html: '⭐', className: '', iconSize: [24,24], iconAnchor: [12,12] });
  if (tipo === 'elicottero') return new L.DivIcon({ html: '🚁', className: '', iconSize: [24,24], iconAnchor: [12,12] });
  return new L.DivIcon({ html: '✈️', className: '', iconSize: [24,24], iconAnchor: [12,12] });
};

const iconaGps = new L.DivIcon({
  html: '📍',
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

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
      canvas.width = w; canvas.height = h;
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

const verificaFoto = (base64) => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const dati = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let luminosita = 0, min = 255, max = 0;
    for (let i = 0; i < dati.length; i += 4) {
      const l = (dati[i] + dati[i+1] + dati[i+2]) / 3;
      luminosita += l;
      if (l < min) min = l;
      if (l > max) max = l;
    }
    luminosita = luminosita / (dati.length / 4);
    const contrasto = max - min;
    if (luminosita < 30) { resolve({ ok: false, motivo: 'Foto troppo scura!' }); return; }
    if (contrasto < 40) { resolve({ ok: false, motivo: 'Foto troppo uniforme!' }); return; }
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
      <h3>{aereo.tipo === 'elicottero' ? '🚁' : '✈️'} {aereo.callsign}</h3>
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
const AEROPORTI = [
  { nome: 'Roma Fiumicino', iata: 'FCO', lat: 41.8003, lng: 12.2389 },
  { nome: 'Milano Malpensa', iata: 'MXP', lat: 45.6306, lng: 8.7281 },
  { nome: 'Milano Linate', iata: 'LIN', lat: 45.4453, lng: 9.2768 },
  { nome: 'Venezia Marco Polo', iata: 'VCE', lat: 45.5053, lng: 12.3519 },
  { nome: 'Bergamo Orio al Serio', iata: 'BGY', lat: 45.6739, lng: 9.7042 },
  { nome: 'Catania Fontanarossa', iata: 'CTA', lat: 37.4668, lng: 15.0664 },
  { nome: 'Napoli Capodichino', iata: 'NAP', lat: 40.8860, lng: 14.2908 },
  { nome: 'Bologna Borgo Panigale', iata: 'BLQ', lat: 44.5354, lng: 11.2887 },
  { nome: 'Palermo Falcone Borsellino', iata: 'PMO', lat: 38.1759, lng: 13.0910 },
  { nome: 'Bari Karol Wojtyla', iata: 'BRI', lat: 41.1389, lng: 16.7606 },
  { nome: 'Torino Caselle', iata: 'TRN', lat: 45.2008, lng: 7.6497 },
  { nome: 'Firenze Peretola', iata: 'FLR', lat: 43.8100, lng: 11.2051 },
  { nome: 'Genova Cristoforo Colombo', iata: 'GOA', lat: 44.4133, lng: 8.8375 },
  { nome: 'Cagliari Elmas', iata: 'CAG', lat: 39.2515, lng: 9.0543 },
  { nome: 'Pisa Galileo Galilei', iata: 'PSA', lat: 43.6839, lng: 10.3927 },
  { nome: 'Verona Villafranca', iata: 'VRN', lat: 45.3957, lng: 10.8885 },
  { nome: 'Olbia Costa Smeralda', iata: 'OLB', lat: 40.8987, lng: 9.5176 },
  { nome: 'Catanzaro Lamezia Terme', iata: 'SUF', lat: 38.9054, lng: 16.2423 },
  { nome: 'Trieste', iata: 'TRS', lat: 45.8275, lng: 13.4722 },
  { nome: 'Brescia Montichiari', iata: 'VBS', lat: 45.4288, lng: 10.3306 },
  { nome: 'Ancona Falconara', iata: 'AOI', lat: 43.6163, lng: 13.3622 },
  { nome: 'Alghero Fertilia', iata: 'AHO', lat: 40.6321, lng: 8.2908 },
  { nome: 'Brindisi Papola Casale', iata: 'BDS', lat: 40.6576, lng: 17.9470 },
  { nome: 'Reggio Calabria', iata: 'REG', lat: 38.0712, lng: 15.6516 },
  { nome: 'Trapani Birgi', iata: 'TPS', lat: 37.9114, lng: 12.4880 },
  { nome: 'Perugia San Francesco', iata: 'PEG', lat: 43.0959, lng: 12.5132 },
  { nome: 'Pescara', iata: 'PSR', lat: 42.4317, lng: 14.1811 },
  { nome: 'Rimini Federico Fellini', iata: 'RMI', lat: 44.0203, lng: 12.6117 },
  { nome: 'Treviso', iata: 'TSF', lat: 45.6484, lng: 12.1944 },
  { nome: 'Bolzano', iata: 'BZO', lat: 46.4602, lng: 11.3264 },
  { nome: 'Cuneo Levaldigi', iata: 'CUF', lat: 44.5470, lng: 7.6232 },
  { nome: 'Foggia Gino Lisa', iata: 'FOG', lat: 41.4329, lng: 15.5350 },
  { nome: 'Comiso', iata: 'CIY', lat: 36.9946, lng: 14.6072 },
  { nome: 'Crotone', iata: 'CRV', lat: 38.9972, lng: 17.0802 },
  { nome: 'Lampedusa', iata: 'LMP', lat: 35.4979, lng: 12.6181 },
  { nome: 'Pantelleria', iata: 'PNL', lat: 36.8165, lng: 11.9689 },
  { nome: 'Taranto Grottaglie', iata: 'TAR', lat: 40.5175, lng: 17.4032 },
  { nome: 'Parma', iata: 'PMF', lat: 44.8245, lng: 10.2964 },
  { nome: 'Aosta', iata: 'AOT', lat: 45.7384, lng: 7.3603 },
    { nome: 'Salerno Costa d\'Amalfi', iata: 'QSR', lat: 40.6204, lng: 14.9113 },
  { nome: 'Messina', iata: 'MSN', lat: 38.1868, lng: 15.5577 },
  { nome: 'Urbino', iata: 'URB', lat: 43.7285, lng: 12.6298 },
  { nome: 'Venezia Tessera', iata: 'VCE', lat: 45.5053, lng: 12.3519 },
];

const creaIconaAeroporto = (iata) => new L.DivIcon({
  html: `<div style="
    background: #1a4a8a;
    border: 2px solid #4a9fd4;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: Courier New, monospace;
    font-size: 8px;
    font-weight: bold;
    color: #ffffff;
    letter-spacing: 0.5px;
    box-shadow: 0 0 6px #4a9fd444;
  ">${iata}</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});
function CentraGps({ posizione }) {
  const map = useMap();
  useEffect(() => {
    if (posizione) {
      map.flyTo([posizione.lat, posizione.lng], 12, { duration: 1.5 });
    }
  }, [posizione, map]);
  return null;
}

function PaginaProfilo({ logbook, onChiudi }) {
  const [nome, setNome] = useState(() => localStorage.getItem('skydex-nome') || '');
  const [fotoProfilo, setFotoProfilo] = useState(() => localStorage.getItem('skydex-foto') || null);
  const [modificaNome, setModificaNome] = useState(false);
  const [nomeTemp, setNomeTemp] = useState(nome);

const puntiBase = logbook.reduce((tot, a) => tot + calcolaPunti(a), 0);
const sfidaOggi = getSfidaOggi();
const oggiStr = getOggiStringa();
const bonusSfida = sfidaOggi.check(logbook, oggiStr) ? sfidaOggi.punti : 0;
const puntiTotali = puntiBase + bonusSfida;
const livello = calcolaLivello(puntiTotali);
const badgesSbloccati = BADGES.filter(b => b.check(logbook, puntiTotali));
const badgesBloccati = BADGES.filter(b => !b.check(logbook, puntiTotali));
const progressione = ((puntiTotali - livello.min) / (livello.max - livello.min)) * 100;

  const salvaNome = () => {
    setNome(nomeTemp);
    localStorage.setItem('skydex-nome', nomeTemp);
    setModificaNome(false);
  };

  const gestisciFotoProfilo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.onload = () => {
        canvas.width = 200; canvas.height = 200;
        const ctx = canvas.getContext('2d');
        const size = Math.min(img.width, img.height);
        const x = (img.width - size) / 2;
        const y = (img.height - size) / 2;
        ctx.drawImage(img, x, y, size, size, 0, 0, 200, 200);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setFotoProfilo(dataUrl);
        localStorage.setItem('skydex-foto', dataUrl);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="logbook-pagina">
      <div className="logbook-pagina-header">
        <img src={logo} alt="SkyDex" className="logo" />
        <span className="contatore">PROFILO</span>
        <button className="logbook-chiudi" onClick={onChiudi}>✕ Chiudi</button>
      </div>

      <div className="profilo-scroll">
        <div className="profilo-card">
          <div className="profilo-avatar-wrap">
            {fotoProfilo
              ? <img src={fotoProfilo} alt="profilo" className="profilo-avatar" />
              : <div className="profilo-avatar-placeholder">👤</div>
            }
            <label className="profilo-avatar-edit">
              📸
              <input type="file" accept="image/*" onChange={gestisciFotoProfilo} style={{ display: 'none' }} />
            </label>
          </div>

          <div className="profilo-info">
            {modificaNome ? (
              <div className="profilo-nome-edit">
                <input
                  className="profilo-input"
                  value={nomeTemp}
                  onChange={(e) => setNomeTemp(e.target.value)}
                  placeholder="Il tuo nome..."
                  autoFocus
                />
                <button className="btn-colleziona" onClick={salvaNome}>✓ Salva</button>
              </div>
            ) : (
              <div className="profilo-nome-wrap">
                <h2 className="profilo-nome">{nome || 'Spotter Anonimo'}</h2>
                <button className="profilo-edit-btn" onClick={() => setModificaNome(true)}>✏️</button>
              </div>
            )}
            <p className="profilo-titolo">{livello.titolo}</p>
            <p className="profilo-livello">LIVELLO {livello.livello}</p>
          </div>
        </div>

        <div className="profilo-punti-card">
          <div className="profilo-punti-header">
            <span className="profilo-punti-label">PUNTI TOTALI</span>
            <span className="profilo-punti-valore">{puntiTotali} pt</span>
          </div>
          <div className="profilo-barra-wrap">
            <div className="profilo-barra">
              <div className="profilo-barra-fill" style={{ width: `${Math.min(progressione, 100)}%` }} />
            </div>
            <span className="profilo-barra-label">{livello.min} — {livello.max} pt</span>
          </div>
        </div>

        <div className="profilo-stats-row">
          <div className="profilo-stat">
            <span className="profilo-stat-valore">{logbook.length}</span>
            <span className="profilo-stat-label">Aerei</span>
          </div>
          <div className="profilo-stat">
            <span className="profilo-stat-valore">{new Set(logbook.map(a => a.paese)).size}</span>
            <span className="profilo-stat-label">Paesi</span>
          </div>
          <div className="profilo-stat">
            <span className="profilo-stat-valore">{new Set(logbook.map(a => a.modello).filter(m => m && m !== 'N/D')).size}</span>
            <span className="profilo-stat-label">Modelli</span>
          </div>
          <div className="profilo-stat">
            <span className="profilo-stat-valore">{badgesSbloccati.length}</span>
            <span className="profilo-stat-label">Badge</span>
          </div>
        </div>

        <div className="profilo-sezione">
          {(() => {
  const sfida = getSfidaOggi();
  const oggi = getOggiStringa();
  const completata = sfida.check(logbook, oggi);
  return (
    <div className="profilo-sezione">
      <h3 className="profilo-sezione-titolo">🎯 SFIDA DEL GIORNO</h3>
      <div className={`sfida-card ${completata ? 'completata' : ''}`}>
        <div className="sfida-card-top">
          <span className="sfida-emoji-grande">{sfida.emoji}</span>
          <div className="sfida-card-info">
            <p className="sfida-card-testo">{sfida.testo}</p>
            <p className="sfida-card-punti">+{sfida.punti} pt bonus</p>
          </div>
          {completata && <span className="sfida-check-grande">✅</span>}
        </div>
        {completata
          ? <p className="sfida-completata-msg">Sfida completata! Punti bonus aggiunti.</p>
          : <p className="sfida-incompleta-msg">Completa la sfida per guadagnare punti bonus!</p>
        }
      </div>
    </div>
  );
})()}
          <h3 className="profilo-sezione-titolo">🏅 BADGE SBLOCCATI</h3>
          {badgesSbloccati.length === 0 ? (
            <p className="profilo-sezione-vuoto">Colleziona aerei per sbloccare badge!</p>
          ) : (
            <div className="badge-griglia">
              {badgesSbloccati.map(b => (
                <div key={b.id} className="badge-card sbloccato">
                  <span className="badge-emoji">{b.emoji}</span>
                  <span className="badge-nome">{b.nome}</span>
                  <span className="badge-desc">{b.descrizione}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="profilo-sezione">
          <h3 className="profilo-sezione-titolo">🔒 BADGE BLOCCATI</h3>
          <div className="badge-griglia">
            {badgesBloccati.map(b => (
              <div key={b.id} className="badge-card bloccato">
                <span className="badge-emoji">🔒</span>
                <span className="badge-nome">{b.nome}</span>
                <span className="badge-desc">{b.descrizione}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
function ModalitaAR({ aerei, logbook, onColleziona, onChiudi }) {
  const videoRef = React.useRef(null);
  const [bussola, setBussola] = useState(0);
  const [posizione, setPosizione] = useState(null);
  const [errore, setErrore] = useState('');
  const [aereiVisibili, setAereiVisibili] = useState([]);
  const [fotoUtente, setFotoUtente] = useState(null);
  const [aereoSelezionato, setAereoSelezionato] = useState(null);
  const [verificando, setVerificando] = useState(false);
  const [errFoto, setErrFoto] = useState('');

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    if (!isMobile) return;

    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; })
      .catch(() => setErrore('Fotocamera non disponibile'));

    const gpsId = navigator.geolocation?.watchPosition(
      pos => setPosizione({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setErrore('GPS non disponibile'),
      { enableHighAccuracy: true }
    );

    const gestisciBussola = (e) => {
      const gradi = e.webkitCompassHeading ?? e.alpha ?? 0;
      setBussola(gradi);
    };

    if (window.DeviceOrientationEvent) {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
          .then(r => { if (r === 'granted') window.addEventListener('deviceorientation', gestisciBussola); })
          .catch(() => setErrore('Bussola non disponibile'));
      } else {
        window.addEventListener('deviceorientation', gestisciBussola);
      }
    }

    return () => {
// eslint-disable-next-line react-hooks/exhaustive-deps
      const video = videoRef.current;      if (video?.srcObject) {
        video.srcObject.getTracks().forEach(t => t.stop());
      }
      if (gpsId) navigator.geolocation.clearWatch(gpsId);
      window.removeEventListener('deviceorientation', gestisciBussola);
    };
  }, [isMobile]);

  useEffect(() => {
    if (!posizione) return;

    const calcolaAngolo = (lat1, lon1, lat2, lon2) => {
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const lat1R = lat1 * Math.PI / 180;
      const lat2R = lat2 * Math.PI / 180;
      const y = Math.sin(dLon) * Math.cos(lat2R);
      const x = Math.cos(lat1R) * Math.sin(lat2R) - Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLon);
      return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
    };

    const calcolaDistanza = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    const visibili = aerei
      .map(a => {
        const angolo = calcolaAngolo(posizione.lat, posizione.lng, a.latitudine, a.longitudine);
        const distanza = calcolaDistanza(posizione.lat, posizione.lng, a.latitudine, a.longitudine);
        const diff = ((angolo - bussola + 540) % 360) - 180;
        return { ...a, angolo, distanza, diff };
      })
      .filter(a => Math.abs(a.diff) < 30 && a.distanza < 200)
      .sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff))
      .slice(0, 3);

    setAereiVisibili(visibili);
  }, [bussola, posizione, aerei]);

  const gestisciFotoAR = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVerificando(true);
    setErrFoto('');
    try {
      const compressa = await comprImmagine(file);
      const verifica = await verificaFoto(compressa);
      if (!verifica.ok) { setErrFoto(verifica.motivo); setVerificando(false); return; }
      setFotoUtente(compressa);
    } catch { setErrFoto('Errore foto'); }
    setVerificando(false);
  };

  const collezionaAR = () => {
    if (!aereoSelezionato || !fotoUtente) return;
    onColleziona({ ...aereoSelezionato, fotoUtente });
    setAereoSelezionato(null);
    setFotoUtente(null);
  };

  if (!isMobile) return (
    <div className="ar-overlay">
      <div className="ar-errore">
        <p style={{ fontSize: '3rem' }}>📱</p>
        <p style={{ color: '#4a9fd4', fontFamily: 'Courier New', letterSpacing: '2px' }}>
          MODALITÀ AR
        </p>
        <p style={{ color: '#4a6fa5', fontFamily: 'Courier New', fontSize: '0.85rem', textAlign: 'center' }}>
          Disponibile solo dal telefono.<br/>Apri SkyDex dal tuo smartphone!
        </p>
        <button className="logbook-chiudi" onClick={onChiudi}>✕ Chiudi</button>
      </div>
    </div>
  );

  if (errore) return (
    <div className="ar-overlay">
      <div className="ar-errore">
        <p>❌ {errore}</p>
        <button className="logbook-chiudi" onClick={onChiudi}>Chiudi</button>
      </div>
    </div>
  );

  return (
    <div className="ar-overlay">
      <video ref={videoRef} autoPlay playsInline muted className="ar-video" />

      <div className="ar-header">
        <span className="ar-bussola">🧭 {Math.round(bussola)}°</span>
        <button className="ar-chiudi" onClick={onChiudi}>✕</button>
      </div>

      <div className="ar-aerei">
        {aereiVisibili.length === 0 ? (
          <div className="ar-nessuno">Punta verso un aereo ✈️</div>
        ) : (
          aereiVisibili.map(aereo => {
            const collezionato = logbook.some(a => a.id === aereo.id);
            const selezionato = aereoSelezionato?.id === aereo.id;
            const posX = 50 + (aereo.diff / 30) * 40;
            return (
              <div
                key={aereo.id}
                className={`ar-tag ${selezionato ? 'selezionato' : ''}`}
                style={{ left: `${posX}%` }}
                onClick={() => { setAereoSelezionato(aereo); setFotoUtente(null); setErrFoto(''); }}
              >
                <p className="ar-callsign">{aereo.tipo === 'elicottero' ? '🚁' : '✈️'} {aereo.callsign}</p>
                {aereo.modello && aereo.modello !== 'N/D' && <p className="ar-modello">{aereo.modello}</p>}
                <p className="ar-dati">{aereo.quota}m · {aereo.velocita}km/h</p>
                <p className="ar-dist">{Math.round(aereo.distanza)} km</p>
                {collezionato && <p className="ar-gia">⭐ Già collezionato</p>}
              </div>
            );
          })
        )}
      </div>

      {aereoSelezionato && !logbook.some(a => a.id === aereoSelezionato.id) && (
        <div className="ar-colleziona">
          <p className="ar-colleziona-titolo">📸 Scatta foto per collezionare</p>
          <p className="ar-colleziona-nome">{aereoSelezionato.callsign} — {aereoSelezionato.modello}</p>
          {fotoUtente ? (
            <div className="ar-foto-preview-wrap">
              <img src={fotoUtente} alt="foto" className="ar-foto-preview" />
              <div className="ar-foto-bottoni">
                <button className="btn-colleziona" onClick={collezionaAR}>⭐ Colleziona!</button>
                <button className="btn-gia" onClick={() => setFotoUtente(null)}>🔄 Riprova</button>
              </div>
            </div>
          ) : (
            <label className="btn-scatta">
              📸 Scatta foto
              <input type="file" accept="image/*" capture="environment" onChange={gestisciFotoAR} style={{ display: 'none' }} />
            </label>
          )}
          {verificando && <p className="foto-verifica">🔍 Verifico...</p>}
          {errFoto && <p className="foto-errore">❌ {errFoto}</p>}
          <button className="ar-annulla" onClick={() => { setAereoSelezionato(null); setFotoUtente(null); }}>Annulla</button>
        </div>
      )}
    </div>
  );
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
  const [mostraProfilo, setMostraProfilo] = useState(false);
  const [posizione, setPosizione] = useState(null);
  const [gpsAttivo, setGpsAttivo] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('');
  const [mostraImpostazioni, setMostraImpostazioni] = useState(false);
  const [mappaScura, setMappaScura] = useState(false);
 const [mostraClassifica, setMostraClassifica] = useState(false);
const [mostraAR, setMostraAR] = useState(false);
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
if (mostraAR) {
  return <ModalitaAR
    aerei={aerei}
    logbook={logbook}
    onColleziona={colleziona}
    onChiudi={() => setMostraAR(false)}
  />;
}
  if (mostraProfilo) {
    return <PaginaProfilo logbook={logbook} onChiudi={() => setMostraProfilo(false)} />;
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
          <button className="btn-ar" onClick={() => setMostraAR(true)}>
  📷 AR
</button>
          <button className={`btn-gps ${gpsAttivo ? 'attivo' : ''}`} onClick={attivaGps}>
            📍 {gpsAttivo ? 'GPS ON' : 'GPS'}
          </button>
          <button className="btn-impostazioni" onClick={() => setMostraImpostazioni(!mostraImpostazioni)}>
            ⚙️
          </button>
          <button className="btn-logbook" onClick={() => setMostraLogbook(true)}>
            📒 LOGBOOK ({logbook.length})
          </button>
        </div>
      </div>
{(() => {
  const sfida = getSfidaOggi();
  const oggi = getOggiStringa();
  const completata = sfida.check(logbook, oggi);
  return (
    <div className={`sfida-banner ${completata ? 'completata' : ''}`}>
      <span className="sfida-emoji">{sfida.emoji}</span>
      <span className="sfida-testo">
        <strong>SFIDA DEL GIORNO:</strong> {sfida.testo}
      </span>
      <span className="sfida-punti">+{sfida.punti} pt</span>
      {completata && <span className="sfida-check">✅</span>}
    </div>
  );
})()}
{mostraClassifica && (
  <div className="impostazioni-overlay" onClick={() => setMostraClassifica(false)}>
    <div className="classifica-pannello" onClick={(e) => e.stopPropagation()}>
      <div className="impostazioni-header">
        <h2 className="impostazioni-titolo">📊 CLASSIFICA PUNTI</h2>
        <button className="scheda-chiudi" onClick={() => setMostraClassifica(false)}>✕</button>
      </div>
      <div className="classifica-lista">
        {[
          { emoji: '👑', punti: 15, label: 'Leggendario', esempi: 'A380, B747, An-124' },
          { emoji: '⚔️', punti: 10, label: 'Militare', esempi: 'C-130, F-15, F-16, C-17' },
          { emoji: '💎', punti: 8, label: 'Widebody raro', esempi: 'B787, A350, A340' },
          { emoji: '🌟', punti: 6, label: 'Widebody comune', esempi: 'B777, A330, B767' },
          { emoji: '🚁', punti: 5, label: 'Elicottero', esempi: 'Qualsiasi elicottero' },
          { emoji: '🔧', punti: 4, label: 'Regionale/Cargo', esempi: 'ATR, CRJ, Dash 8' },
          { emoji: '🛩️', punti: 3, label: 'Privato/Leggero', esempi: 'Cessna, Cirrus, Piper' },
          { emoji: '✈️', punti: 2, label: 'Narrowbody', esempi: 'B737, A320, A321' },
        ].map((r, i) => (
          <div key={i} className="classifica-riga">
            <span className="classifica-emoji">{r.emoji}</span>
            <div className="classifica-info">
              <span className="classifica-label">{r.label}</span>
              <span className="classifica-esempi">{r.esempi}</span>
            </div>
            <span className="classifica-punti">+{r.punti} pt</span>
          </div>
        ))}
      </div>
    </div>
  </div>
)}{mostraClassifica && (
  <div className="impostazioni-overlay" onClick={() => setMostraClassifica(false)}>
    <div className="classifica-pannello" onClick={(e) => e.stopPropagation()}>
      <div className="impostazioni-header">
        <h2 className="impostazioni-titolo">📊 CLASSIFICA PUNTI</h2>
        <button className="scheda-chiudi" onClick={() => setMostraClassifica(false)}>✕</button>
      </div>
      <div className="classifica-lista">
        {[
          { emoji: '👑', punti: 15, label: 'Leggendario', esempi: 'A380, B747, An-124' },
          { emoji: '⚔️', punti: 10, label: 'Militare', esempi: 'C-130, F-15, F-16, C-17' },
          { emoji: '💎', punti: 8, label: 'Widebody raro', esempi: 'B787, A350, A340' },
          { emoji: '🌟', punti: 6, label: 'Widebody comune', esempi: 'B777, A330, B767' },
          { emoji: '🚁', punti: 5, label: 'Elicottero', esempi: 'Qualsiasi elicottero' },
          { emoji: '🔧', punti: 4, label: 'Regionale/Cargo', esempi: 'ATR, CRJ, Dash 8' },
          { emoji: '🛩️', punti: 3, label: 'Privato/Leggero', esempi: 'Cessna, Cirrus, Piper' },
          { emoji: '✈️', punti: 2, label: 'Narrowbody', esempi: 'B737, A320, A321' },
        ].map((r, i) => (
          <div key={i} className="classifica-riga">
            <span className="classifica-emoji">{r.emoji}</span>
            <div className="classifica-info">
              <span className="classifica-label">{r.label}</span>
              <span className="classifica-esempi">{r.esempi}</span>
            </div>
            <span className="classifica-punti">+{r.punti} pt</span>
          </div>
        ))}
      </div>
    </div>
  </div>
)}
      {mostraImpostazioni && (
        <div className="impostazioni-overlay" onClick={() => setMostraImpostazioni(false)}>
          <div className="impostazioni-pannello" onClick={(e) => e.stopPropagation()}>
            <div className="impostazioni-header">
              <h2 className="impostazioni-titolo">⚙️ IMPOSTAZIONI</h2>
              <button className="scheda-chiudi" onClick={() => setMostraImpostazioni(false)}>✕</button>
            </div>
            <div className="impostazioni-voce">
              <span className="impostazioni-label">👤 Profilo</span>
              <button className="toggle" onClick={() => { setMostraImpostazioni(false); setMostraProfilo(true); }}>
                APRI
              </button>
            </div>
            <div className="impostazioni-voce">
             <div className="impostazioni-voce">
  <span className="impostazioni-label">📊 Classifica punti</span>
  <button className="toggle" onClick={() => { setMostraImpostazioni(false); setMostraClassifica(true); }}>
    APRI
  </button>
</div> 
              <span className="impostazioni-label">🌙 Mappa scura</span>
              <button
                className={`toggle ${mappaScura ? 'attivo' : ''}`}
                onClick={() => setMappaScura(!mappaScura)}
              >
                {mappaScura ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="contenuto">
        <MapContainer center={[45.4642, 9.1900]} zoom={7} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url={mappaScura
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            }
            attribution='© OpenStreetMap © CARTO'
          />
          {AEROPORTI.map(a => (
  <Marker
    key={a.iata}
    position={[a.lat, a.lng]}
    icon={creaIconaAeroporto(a.iata)}
  >
    <Popup>
      <div className="popup">
        <h3>🛬 {a.nome}</h3>
        <p>📡 IATA: {a.iata}</p>
      </div>
    </Popup>
  </Marker>
))}
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
              icon={creaIcona(aereo.tipo, isCollezionato(aereo.id))}
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