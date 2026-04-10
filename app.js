/* ═══════════════════════════════════════════════
   UrbanMap — app.js
═══════════════════════════════════════════════ */

const APP = (() => {

  const API_URL             = 'https://urban-map-api-production.up.railway.app';
  const REFRESH_INTERVAL_MS = 60_000;

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

  /* ── STATE ── */
  let userLat        = null;
  let userLng        = null;
  let selectedCat    = null;
  let selectedFile   = null;
  let selectedImg    = null;
  let markerStore    = {};
  let leafletMarkers = {};
  let markerCount    = 0;
  let userMarker     = null;
  let accCircle      = null;
  let sheetOpen      = false;
  let tileLayer      = null;
  let currentTheme   = 'dark';
  let manualTheme    = null;
  // firstLoad: controla se o mapa deve fazer fitBounds ao carregar ocorrências
  // Só faz fitBounds se o GPS ainda não localizou o usuário
  let gpsLocated     = false;
  let initialFitDone = false;

  /* ── THEME ── */
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

  /* ── MAP ── */
  const map = L.map('map', {
    zoomControl: false, attributionControl: false,
    center: [-22.9, -43.17], zoom: 15,
  });
  tileLayer = L.tileLayer(TILE.dark, { maxZoom: 19 }).addTo(map);
  L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

  // Força o Leaflet a recalcular o tamanho do container após o DOM estabilizar.
  // Resolve mapa preto causado por container sem dimensões definidas no momento do init.
  setTimeout(() => map.invalidateSize(), 100);
  window.addEventListener('resize', () => map.invalidateSize());

  initTheme();

  /* ── GEOLOCATION ── */
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

      // GPS localizou — centraliza no usuário com prioridade
      gpsLocated = true;
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
  } else {
    setStatus(false, 'GPS indisponível');
  }

  document.getElementById('locate-btn').addEventListener('click', () => {
    if (userLat !== null) map.setView([userLat, userLng], 17, { animate: true });
  });

  /* ── RENDER MARKER ── */
  function renderMarker(ocorrencia) {
    const { id, categoria, latitude, longitude, foto_url, criado_em, descricao } = ocorrencia;

    if (leafletMarkers[id]) return; // já existe, não duplica

    const cat = CAT[categoria];
    if (!cat) return;

    const ll   = [parseFloat(latitude), parseFloat(longitude)];
    const date = new Date(criado_em).toLocaleDateString('pt-BR');
    const time = new Date(criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    markerStore[id] = {
      img: foto_url, cat: categoria, date, time,
      lat: parseFloat(latitude), lng: parseFloat(longitude),
    };

    const icon = L.divIcon({
      className: '',
      html: `<div class="urban-marker" style="background:${cat.color}22;border-color:${cat.color};">
               <span class="emoji">${cat.emoji}</span>
               <div class="cam-badge">📷</div>
             </div>`,
      iconSize: [38, 38], iconAnchor: [19, 38], popupAnchor: [0, -44],
    });

    const descBlock = descricao
      ? `<div style="font-size:.78rem;color:#8aaccc;line-height:1.45;padding:8px 14px 0;border-top:1px solid #1e3048;font-style:italic;">"${descricao}"</div>`
      : '';

    const popupHtml = `
      <div style="position:relative;cursor:pointer;overflow:hidden;" onclick="APP.openLightbox(${id})">
        <img src="${foto_url}" style="width:100%;height:140px;object-fit:cover;display:block;" />
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0);transition:background .2s;"
             onmouseenter="this.style.background='rgba(0,0,0,.3)'" onmouseleave="this.style.background='rgba(0,0,0,0)'">
          <div style="background:rgba(0,0,0,.6);border-radius:99px;padding:5px 14px;font-size:.73rem;color:#fff;font-family:'DM Sans',sans-serif;white-space:nowrap;">🔍 Ampliar foto</div>
        </div>
      </div>
      <div style="padding:12px 14px 0;font-family:'DM Sans',sans-serif;">
        <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:.9rem;color:${cat.color};margin-bottom:4px;">${cat.emoji} ${cat.label}</div>
        <div class="pop-info-date"  style="font-size:.73rem;color:#6a8aaa;">${date} às ${time}</div>
        <div class="pop-info-coord" style="font-size:.68rem;color:#3a5a7a;margin-top:2px;font-family:monospace;">${parseFloat(latitude).toFixed(5)}, ${parseFloat(longitude).toFixed(5)}</div>
      </div>
      ${descBlock}
      <button class="pop-photo-btn" style="color:${cat.color};" onclick="APP.openLightbox(${id})">📷 Ver foto em tela cheia</button>`;

    const popup = L.popup({ className: 'upop', maxWidth: 240, minWidth: 210, autoPanPadding: [20, 80] })
      .setContent(popupHtml);

    const marker = L.marker(ll, { icon }).addTo(map).bindPopup(popup);
    leafletMarkers[id] = marker;
  }

  /* ── REFRESH BUTTON ── */
  function setRefreshLoading(loading) {
    const btn = document.getElementById('refresh-btn');
    if (!btn) return;
    btn.style.animation = loading ? 'spin-once .7s linear infinite' : '';
    btn.title = loading ? 'Atualizando…' : 'Atualizar mapa';
  }

  /* ── CARREGAR OCORRÊNCIAS ── */
  async function carregarOcorrencias(isManual = false) {
    try {
      if (isManual) setRefreshLoading(true);

      const res  = await fetch(`${API_URL}/ocorrencias?limite=500`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const antes = Object.keys(leafletMarkers).length;
      data.ocorrencias.forEach(o => renderMarker(o));
      const novos = Object.keys(leafletMarkers).length - antes;

      markerCount = data.total;
      document.getElementById('marker-count').textContent = markerCount;

      // fitBounds apenas na primeira carga E somente se o GPS ainda não localizou
      // (se o GPS já centralizou, não deslocamos o mapa)
      if (!initialFitDone && data.ocorrencias.length > 0 && !gpsLocated) {
        const bounds = L.latLngBounds(
          data.ocorrencias.map(o => [parseFloat(o.latitude), parseFloat(o.longitude)])
        );
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
      }
      initialFitDone = true;

      if (isManual) {
        showToast(novos > 0
          ? `🗺 ${novos} nova${novos > 1 ? 's ocorrências' : ' ocorrência'}`
          : '✓ Mapa atualizado');
      } else if (novos > 0 && initialFitDone) {
        showToast(`🗺 ${novos} nova${novos > 1 ? 's ocorrências' : ' ocorrência'} no mapa`);
      }

    } catch (err) {
      console.error('Erro ao carregar ocorrências:', err.message);
      if (isManual) showToast('❌ Erro ao atualizar');
    } finally {
      if (isManual) setRefreshLoading(false);
      // Garante que o status seja atualizado independente do resultado
      if (!gpsLocated) setStatus(false, 'Sem GPS');
    }
  }

  // Primeira carga
  carregarOcorrencias();

  // Auto-refresh silencioso
  setInterval(() => carregarOcorrencias(false), REFRESH_INTERVAL_MS);

  // Refresh manual
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', () => carregarOcorrencias(true));

  /* ── HELP MODAL ── */
  const helpOverlay = document.getElementById('help-overlay');
  const helpModal   = document.getElementById('help-modal');
  function openHelp()  { helpOverlay.classList.add('visible');    helpModal.classList.add('open');    }
  function closeHelp() { helpOverlay.classList.remove('visible'); helpModal.classList.remove('open'); }
  document.getElementById('help-btn').addEventListener('click', openHelp);
  document.getElementById('help-close').addEventListener('click', closeHelp);
  helpOverlay.addEventListener('click', closeHelp);

  /* ── SHEET ── */
  const fab     = document.getElementById('fab');
  const sheet   = document.getElementById('sheet');
  const overlay = document.getElementById('overlay');

  function openSheet() {
    sheetOpen = true;
    fab.classList.add('open');
    sheet.classList.add('visible');
    overlay.classList.add('visible');
  }

  function closeSheet() {
    sheetOpen = false;
    fab.classList.remove('open');
    sheet.classList.remove('visible');
    overlay.classList.remove('visible');
    selectedCat = null; selectedFile = null; selectedImg = null;
    document.querySelectorAll('.cat-btn').forEach(b => {
      b.classList.remove('selected');
      b.setAttribute('aria-checked', 'false');
    });
    document.getElementById('confirm-btn').disabled = true;
    document.getElementById('confirm-btn').textContent = 'Enviar para análise';
    document.getElementById('img-required-hint').classList.remove('show');
    document.getElementById('descricao-input').value = '';
    document.getElementById('char-count').textContent = '0/200';
    document.getElementById('char-count').className = '';
    resetImgUI();
  }

  fab.addEventListener('click', () => sheetOpen ? closeSheet() : openSheet());
  overlay.addEventListener('click', closeSheet);

  /* ── CHAR COUNTER ── */
  const descricaoInput = document.getElementById('descricao-input');
  const charCount      = document.getElementById('char-count');
  descricaoInput.addEventListener('input', () => {
    const len = descricaoInput.value.length;
    charCount.textContent = `${len}/200`;
    charCount.className = len >= 200 ? 'at-limit' : len >= 160 ? 'near-limit' : '';
  });

  /* ── CATEGORIES ── */
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

  /* ── IMAGE UPLOAD ── */
  const inputCamera  = document.getElementById('img-input-camera');
  const inputGallery = document.getElementById('img-input-gallery');
  const previewWrap  = document.getElementById('img-preview-wrap');
  const previewImg   = document.getElementById('img-preview');
  const sourceRow    = document.getElementById('img-source-row');

  document.getElementById('btn-camera').addEventListener('click',  () => inputCamera.click());
  document.getElementById('btn-gallery').addEventListener('click', () => inputGallery.click());

  function handleFileInput(e) {
    const file = e.target.files[0];
    if (!file) return;
    selectedFile = file;
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

  inputCamera.addEventListener('change',  handleFileInput);
  inputGallery.addEventListener('change', handleFileInput);

  document.getElementById('img-remove').addEventListener('click', () => {
    resetImgUI(); updateConfirmBtn();
  });

  function resetImgUI() {
    selectedImg = null; selectedFile = null;
    previewImg.src = '';
    previewWrap.classList.remove('show');
    sourceRow.style.display = '';
  }

  function updateConfirmBtn() {
    document.getElementById('confirm-btn').disabled = !(selectedCat && selectedFile);
  }

  /* ── PENDING NOTICE ── */
  const pendingNotice = document.getElementById('pending-notice');
  let pendingTimer = null;
  function showPendingNotice() {
    pendingNotice.classList.add('show');
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => pendingNotice.classList.remove('show'), 8000);
  }
  document.getElementById('pending-close').addEventListener('click', () => {
    clearTimeout(pendingTimer);
    pendingNotice.classList.remove('show');
  });

  /* ── CONFIRM / SUBMIT ── */
  document.getElementById('confirm-btn').addEventListener('click', async () => {
    if (!selectedCat || !selectedFile) return;
    if (userLat === null) { showToast('⚠ Aguarde a localização ser obtida'); return; }

    const confirmBtn = document.getElementById('confirm-btn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Enviando…';

    try {
      const formData = new FormData();
      formData.append('categoria',  selectedCat);
      formData.append('latitude',   userLat.toString());
      formData.append('longitude',  userLng.toString());
      formData.append('foto',       selectedFile);
      const descricao = descricaoInput.value.trim();
      if (descricao) formData.append('descricao', descricao);

      const res = await fetch(`${API_URL}/ocorrencias`, { method: 'POST', body: formData });
      if (!res.ok) {
        const erro = await res.json().catch(() => ({ erro: 'Erro desconhecido' }));
        throw new Error(erro.erro || `Erro ${res.status}`);
      }

      closeSheet();
      showPendingNotice();

    } catch (err) {
      console.error('Erro ao registrar:', err.message);
      showToast(`❌ ${err.message}`);
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Enviar para análise';
    }
  });

  /* ── TOAST ── */
  function showToast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 3000);
  }

  /* ── LIGHTBOX ── */
  function openLightbox(id) {
    const d = markerStore[id];
    if (!d || !d.img) return;
    const cat = CAT[d.cat];
    document.getElementById('lb-img').src            = d.img;
    document.getElementById('lb-title').textContent  = `${cat.emoji} ${cat.label}`;
    document.getElementById('lb-meta').textContent   = `${d.date} às ${d.time}`;
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

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeLightbox(); closeHelp(); }
  });

  /* ── PWA ── */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', { scope: '/urban-map/' }).catch(() => {});
  }
  window.addEventListener('beforeinstallprompt', e => e.preventDefault());

  return { openLightbox, closeLightbox };

})();
