/* ═══════════════════════════════════════════════
   UrbanMap — app.js
   - Tema automático por horário (6h–18h = claro)
   - Toggle manual persistido em sessionStorage
   - Foto obrigatória (câmera separada de galeria)
   - 6 categorias incluindo Inundação
   - Modal de ajuda com missão + email de suporte
   - Lightbox para visualização em tela cheia
═══════════════════════════════════════════════ */

const APP = (() => {

  /* ─────────────────────────────────────────────
     CONSTANTES
  ───────────────────────────────────────────── */

  const CAT = {
    buraco:   { color: '#ff6b35', emoji: '🕳️', label: 'Buraco'             },
    desnivel: { color: '#ffd23f', emoji: '⚠️',  label: 'Desnível'           },
    ilum:     { color: '#9b5de5', emoji: '💡',  label: 'Falta de Iluminação' },
    rampa:    { color: '#00bbf9', emoji: '♿',  label: 'Rampa de Acesso'     },
    obs:      { color: '#f15bb5', emoji: '🚧',  label: 'Obstrução'          },
    inund:    { color: '#1e90ff', emoji: '🌊',  label: 'Inundação'          },
  };

  const TILE = {
    dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  };

  /* ─────────────────────────────────────────────
     STATE
  ───────────────────────────────────────────── */

  let userLat      = null;
  let userLng      = null;
  let selectedCat  = null;
  let selectedImg  = null;
  let markerStore  = {};
  let markerCount  = 0;
  let userMarker   = null;
  let accCircle    = null;
  let sheetOpen    = false;
  let tileLayer    = null;
  let currentTheme = 'dark';
  let manualTheme  = null;

  /* ─────────────────────────────────────────────
     THEME
  ───────────────────────────────────────────── */

  function autoTheme() {
    const h = new Date().getHours();
    return (h >= 6 && h < 18) ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('meta-theme').content = theme === 'light' ? '#f0f4f8' : '#0b1520';
    document.getElementById('theme-btn').textContent = theme === 'light' ? '🌙' : '☀️';
    if (tileLayer) tileLayer.setUrl(TILE[theme]);
  }

  function initTheme() {
    const saved = sessionStorage.getItem('um_theme');
    manualTheme = saved || null;
    applyTheme(manualTheme || autoTheme());
  }

  setInterval(() => { if (!manualTheme) applyTheme(autoTheme()); }, 60_000);

  document.getElementById('theme-btn').addEventListener('click', () => {
    const next = currentTheme === 'dark' ? 'light' : 'dark';
    manualTheme = next;
    sessionStorage.setItem('um_theme', next);
    applyTheme(next);
  });

  /* ─────────────────────────────────────────────
     MAP
  ───────────────────────────────────────────── */

  const map = L.map('map', {
    zoomControl: false, attributionControl: false,
    center: [-22.9, -43.17], zoom: 16,
  });
  tileLayer = L.tileLayer(TILE.dark, { maxZoom: 19 }).addTo(map);
  L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

  initTheme();

  /* ─────────────────────────────────────────────
     GEOLOCATION
  ───────────────────────────────────────────── */

  function setStatus(ok, text) {
    document.getElementById('status-dot').className = ok ? 'located' : '';
    document.getElementById('status-text').textContent = text;
  }

  function onPosition(pos) {
    userLat = pos.coords.latitude;
    userLng = pos.coords.longitude;
    const acc = pos.coords.accuracy;
    setStatus(true, 'Localizado');
    document.getElementById('locate-btn').classList.add('active');
    const ll = [userLat, userLng];
    if (!userMarker) {
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:18px;height:18px;border-radius:50%;background:#00e5ff;border:3px solid #fff;animation:_up 1.8s ease-out infinite"></div>
               <style>@keyframes _up{0%{box-shadow:0 0 0 0 rgba(0,229,255,.55)}70%{box-shadow:0 0 0 14px rgba(0,229,255,0)}100%{box-shadow:0 0 0 0 rgba(0,229,255,0)}}</style>`,
        iconSize: [18, 18], iconAnchor: [9, 9],
      });
      userMarker = L.marker(ll, { icon, zIndexOffset: 1000 }).addTo(map);
      accCircle  = L.circle(ll, { radius: acc, color: '#00e5ff', fillColor: '#00e5ff', fillOpacity: .05, weight: 1 }).addTo(map);
      map.setView(ll, 17, { animate: true });
    } else {
      userMarker.setLatLng(ll);
      accCircle.setLatLng(ll).setRadius(acc);
    }
  }

  function onError(err) {
    const m = { 1: 'Permissão negada', 2: 'Posição indisponível', 3: 'Tempo esgotado' };
    setStatus(false, m[err.code] || 'Erro de GPS');
  }

  if ('geolocation' in navigator) {
    navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000,
    });
  } else { setStatus(false, 'GPS indisponível'); }

  document.getElementById('locate-btn').addEventListener('click', () => {
    if (userLat !== null) map.setView([userLat, userLng], 17, { animate: true });
  });

  /* ─────────────────────────────────────────────
     HELP MODAL
  ───────────────────────────────────────────── */

  const helpOverlay = document.getElementById('help-overlay');
  const helpModal   = document.getElementById('help-modal');

  function openHelp() {
    helpOverlay.classList.add('visible');
    helpModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeHelp() {
    helpOverlay.classList.remove('visible');
    helpModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.getElementById('help-btn').addEventListener('click', openHelp);
  document.getElementById('help-close').addEventListener('click', closeHelp);
  helpOverlay.addEventListener('click', closeHelp);

  /* ─────────────────────────────────────────────
     BOTTOM SHEET
  ───────────────────────────────────────────── */

  const fab     = document.getElementById('fab');
  const sheet   = document.getElementById('sheet');
  const overlay = document.getElementById('overlay');

  function openSheet() {
    sheetOpen = true;
    fab.classList.add('open');
    sheet.classList.add('visible');
    overlay.classList.add('visible');
    sheet.setAttribute('aria-hidden', 'false');
  }

  function closeSheet() {
    sheetOpen = false;
    fab.classList.remove('open');
    sheet.classList.remove('visible');
    overlay.classList.remove('visible');
    sheet.setAttribute('aria-hidden', 'true');
    selectedCat = null;
    selectedImg = null;
    document.querySelectorAll('.cat-btn').forEach(b => {
      b.classList.remove('selected');
      b.setAttribute('aria-checked', 'false');
    });
    document.getElementById('confirm-btn').disabled = true;
    document.getElementById('img-required-hint').classList.remove('show');
    resetImgUI();
  }

  fab.addEventListener('click', () => sheetOpen ? closeSheet() : openSheet());
  overlay.addEventListener('click', closeSheet);

  /* ─────────────────────────────────────────────
     CATEGORIES
  ───────────────────────────────────────────── */

  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => {
        b.classList.remove('selected');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('selected');
      btn.setAttribute('aria-checked', 'true');
      selectedCat = btn.dataset.cat;
      updateConfirmBtn();
    });
  });

  /* ─────────────────────────────────────────────
     IMAGE UPLOAD
  ───────────────────────────────────────────── */

  const inputCamera  = document.getElementById('img-input-camera');
  const inputGallery = document.getElementById('img-input-gallery');
  const previewWrap  = document.getElementById('img-preview-wrap');
  const previewImg   = document.getElementById('img-preview');
  const sourceRow    = document.getElementById('img-source-row');

  document.getElementById('btn-camera').addEventListener('click', () => inputCamera.click());
  document.getElementById('btn-gallery').addEventListener('click', () => inputGallery.click());

  function handleFileInput(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      selectedImg = ev.target.result;
      previewImg.src = selectedImg;
      sourceRow.style.display = 'none';
      previewWrap.classList.add('show');
      document.getElementById('img-required-hint').classList.remove('show');
      updateConfirmBtn();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  inputCamera.addEventListener('change', handleFileInput);
  inputGallery.addEventListener('change', handleFileInput);

  document.getElementById('img-remove').addEventListener('click', () => {
    resetImgUI();
    updateConfirmBtn();
  });

  function resetImgUI() {
    selectedImg = null;
    previewImg.src = '';
    previewWrap.classList.remove('show');
    sourceRow.style.display = '';
  }

  function updateConfirmBtn() {
    document.getElementById('confirm-btn').disabled = !(selectedCat && selectedImg);
  }

  /* ─────────────────────────────────────────────
     CONFIRM / ADD MARKER
  ───────────────────────────────────────────── */

  document.getElementById('confirm-btn').addEventListener('click', () => {
    if (!selectedCat || !selectedImg) return;
    if (userLat === null) { showToast('⚠ Aguarde a localização ser obtida'); return; }

    const cat  = CAT[selectedCat];
    const ll   = [userLat, userLng];
    const img  = selectedImg;
    const id   = Date.now();
    const now  = new Date();
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('pt-BR');

    markerStore[id] = { img, cat: selectedCat, date, time, lat: userLat, lng: userLng };

    const icon = L.divIcon({
      className: '',
      html: `<div class="urban-marker" style="background:${cat.color}22;border-color:${cat.color};">
               <span class="emoji">${cat.emoji}</span>
               <div class="cam-badge">📷</div>
             </div>`,
      iconSize: [38, 38], iconAnchor: [19, 38], popupAnchor: [0, -44],
    });

    const popupHtml = `
      <div style="position:relative;cursor:pointer;overflow:hidden;"
           onclick="APP.openLightbox(${id})">
        <img src="${img}" style="width:100%;height:140px;object-fit:cover;display:block;" />
        <div style="
          position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
          background:rgba(0,0,0,0);transition:background .2s;"
          onmouseenter="this.style.background='rgba(0,0,0,.3)'"
          onmouseleave="this.style.background='rgba(0,0,0,0)'">
          <div style="background:rgba(0,0,0,.6);border-radius:99px;padding:5px 14px;font-size:.73rem;color:#fff;font-family:'DM Sans',sans-serif;white-space:nowrap;">
            🔍 Ampliar foto
          </div>
        </div>
      </div>
      <div style="padding:12px 14px 0;font-family:'DM Sans',sans-serif;">
        <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:.9rem;color:${cat.color};margin-bottom:4px;">
          ${cat.emoji} ${cat.label}
        </div>
        <div class="pop-info-date"  style="font-size:.73rem;color:#6a8aaa;">${date} às ${time}</div>
        <div class="pop-info-coord" style="font-size:.68rem;color:#3a5a7a;margin-top:2px;font-family:monospace;">
          ${userLat.toFixed(5)}, ${userLng.toFixed(5)}
        </div>
      </div>
      <button class="pop-photo-btn" style="color:${cat.color};" onclick="APP.openLightbox(${id})">
        📷 Ver foto em tela cheia
      </button>`;

    const popup = L.popup({ className: 'upop', maxWidth: 240, minWidth: 210, autoPanPadding: [20, 80] })
      .setContent(popupHtml);

    L.marker(ll, { icon }).addTo(map).bindPopup(popup).openPopup();
    markerCount++;
    document.getElementById('marker-count').textContent = markerCount;

    closeSheet();
    showToast('✓ Ocorrência registrada com foto!');
  });

  /* ─────────────────────────────────────────────
     TOAST
  ───────────────────────────────────────────── */

  function showToast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2800);
  }

  /* ─────────────────────────────────────────────
     LIGHTBOX
  ───────────────────────────────────────────── */

  function openLightbox(id) {
    const d = markerStore[id];
    if (!d || !d.img) return;
    const cat = CAT[d.cat];
    document.getElementById('lb-img').src           = d.img;
    document.getElementById('lb-title').textContent = `${cat.emoji} ${cat.label}`;
    document.getElementById('lb-meta').textContent  = `${d.date} às ${d.time}`;
    document.getElementById('lb-coords').textContent = `📍 ${d.lat.toFixed(5)}, ${d.lng.toFixed(5)}`;
    const img = document.getElementById('lb-img');
    img.style.animation = 'none';
    requestAnimationFrame(() => { img.style.animation = ''; });
    document.getElementById('lightbox').classList.add('open');
    map.closePopup();
  }

  function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
    setTimeout(() => { document.getElementById('lb-img').src = ''; }, 300);
  }

  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeLightbox(); closeHelp(); } });

  /* ─────────────────────────────────────────────
     PWA
  ───────────────────────────────────────────── */

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', { scope: '/urban-map/' }).catch(() => {});
  }
  window.addEventListener('beforeinstallprompt', e => e.preventDefault());

  /* ─────────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────────── */

  return { openLightbox, closeLightbox };

})();
