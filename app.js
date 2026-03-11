
let tracks = [];
let currentTrackIndex = 0;
let isPlaying = false;
let ytPlayers = [null, null];
let activePlayerIndex = 0;
let isPlayerReady = [false, false];

document.addEventListener('DOMContentLoaded', () => {
    const btnMinimize = document.getElementById('btn-minimize');
    const btnMaximize = document.getElementById('btn-maximize');
    const btnClose = document.getElementById('btn-close');

    if (btnMinimize) btnMinimize.addEventListener('click', () => window.electronAPI.windowControl('minimize'));
    if (btnMaximize) btnMaximize.addEventListener('click', () => window.electronAPI.windowControl('maximize'));
    if (btnClose) btnClose.addEventListener('click', () => window.electronAPI.windowControl('close'));

    if (window.electronAPI.onDeepLink) {
        window.electronAPI.onDeepLink((event, url) => {
            if (url && url.includes('importPlaylist=')) {
                const payload = url.split('importPlaylist=')[1];
                if (payload) {
                    processImportPlaylist(payload);
                }
            }
        });
    }

    const langSelect = document.getElementById('setting-language');
    if (langSelect) {
        langSelect.value = currentLang;
        langSelect.addEventListener('change', (e) => {
            setLanguage(e.target.value);
            renderView();
        });
    }
});

let isShuffle = false;
let isRepeat = false;
let userSettings = JSON.parse(localStorage.getItem('auraplayer_settings')) || {
    videoBackground: true,
    crossfade: true
};
let customPlaylists = JSON.parse(localStorage.getItem('auraplayer_playlists')) || [];
let likedSongs = JSON.parse(localStorage.getItem('auraplayer_liked')) || [];
let currentView = 'home';
let activePlaylistId = null;

let homeShuffledTracks = [];
let homeRenderCount = 0;
window.shouldReshuffleHome = true;

const trackGrid = document.getElementById('track-grid');
const mainContentScroll = document.querySelector('.main-view-scroll');
const topHeader = document.getElementById('top-header');
const greeting = document.getElementById('greeting');
const sectionTitle = document.getElementById('section-title');
const sectionShowAll = document.getElementById('section-show-all');

const navHome = document.getElementById('nav-home');
const navSearch = document.getElementById('nav-search');
const navLibrary = document.getElementById('nav-library');
const navLikedSongs = document.getElementById('nav-liked-songs');
const navDiscover = document.getElementById('nav-discover');
const searchContainer = document.getElementById('search-container');
const searchInput = document.getElementById('search-input');

const bpCover = document.getElementById('bp-cover');
const bpTitle = document.getElementById('bp-title');
const bpArtist = document.getElementById('bp-artist');
const bpPlayPause = document.getElementById('bp-play-pause');
const bpPrev = document.getElementById('bp-prev');
const bpNext = document.getElementById('bp-next');
const bpShuffle = document.getElementById('bp-shuffle');
const bpRepeat = document.getElementById('bp-repeat');
const bpLikeBtn = document.getElementById('bp-like-btn');
const bpCurrentTime = document.getElementById('bp-current-time');
const bpTotalTime = document.getElementById('bp-total-time');
const bpProgress = document.getElementById('bp-progress');
const bpProgressBar = document.getElementById('bp-progress-bar');
const bpVolumeBar = document.getElementById('bp-volume-bar');
const bpVolumeLevel = document.getElementById('bp-volume-level');
const bpVolumeIcon = document.getElementById('bp-volume-icon');
const bpExpandVideo = document.getElementById('bp-expand-video');
const bpEqualizer = document.getElementById('bp-equalizer');
const bpShareBtn = document.getElementById('bp-share-btn');
const bpSleepTimer = document.getElementById('bp-sleep-timer');
const sleepTimerMenu = document.getElementById('sleep-timer-menu');
const toastMsg = document.getElementById('toast-msg');

const settingsTrigger = document.getElementById('settings-trigger');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');
const settingVideo = document.getElementById('setting-video');
const settingCrossfade = document.getElementById('setting-crossfade');
const btnExportData = document.getElementById('btn-export-data');
const btnImportData = document.getElementById('btn-import-data');

const navCreatePlaylist = document.getElementById('nav-create-playlist');
const customPlaylistsList = document.getElementById('custom-playlists-list');
const contextMenu = document.getElementById('context-menu');
const ctxPlaylistOpts = document.getElementById('ctx-playlist-opts');

const playlistModal = document.getElementById('playlist-modal');
const closePlaylistModal = document.getElementById('close-playlist-modal');
const playlistNameInput = document.getElementById('playlist-name-input');
const playlistDescInput = document.getElementById('playlist-desc-input');
const btnSavePlaylist = document.getElementById('btn-save-playlist');
const playlistModalTitle = document.getElementById('playlist-modal-title');
let editingPlaylistId = null;

let sleepTimerId = null;

settingVideo.checked = userSettings.videoBackground;
settingCrossfade.checked = userSettings.crossfade;
if (!userSettings.videoBackground) {
    document.querySelector('.video-background-wrapper').style.opacity = '0';
    document.querySelector('.video-background-wrapper').style.pointerEvents = 'none';
    if (bpExpandVideo) bpExpandVideo.style.display = 'none';
}

mainContentScroll.addEventListener('scroll', () => {
    if (mainContentScroll.scrollTop > 50) {
        topHeader.classList.add('scrolled');
    } else {
        topHeader.classList.remove('scrolled');
    }
});

const sidebar = document.querySelector('.sidebar');
const mobileMenuBtn = document.createElement('button');
mobileMenuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
mobileMenuBtn.className = 'nav-btn mobile-menu-btn';
mobileMenuBtn.style.display = 'none'; 

const headerNav = document.querySelector('.header-nav');
if (headerNav) {
    headerNav.insertBefore(mobileMenuBtn, headerNav.firstChild);
}

mobileMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('mobile-open');
});

document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && sidebar.classList.contains('mobile-open')) {
        if (!sidebar.contains(e.target) && e.target !== mobileMenuBtn) {
            sidebar.classList.remove('mobile-open');
        }
    }
});

const hour = new Date().getHours();
let timeGreeting = "İyi akşamlar";
if (hour < 12) timeGreeting = "Günaydın";
else if (hour < 18) timeGreeting = "İyi günler";

greeting.textContent = timeGreeting;

function onYouTubeIframeAPIReady() {
    const commonOpts = {
        height: '100%',
        width: '100%',
        videoId: '',
        playerVars: {
            'playsinline': 1, 'controls': 0, 'disablekb': 1,
            'fs': 0, 'rel': 0, 'modestbranding': 1,
            'autoplay': 1, 'iv_load_policy': 3,
            'origin': window.location.origin
        }
    };

    ytPlayers[0] = new YT.Player('youtube-player-1', {
        ...commonOpts,
        events: {
            'onReady': (e) => onPlayerReady(e, 0),
            'onStateChange': (e) => onPlayerStateChange(e, 0),
            'onError': onPlayerError
        }
    });

    ytPlayers[1] = new YT.Player('youtube-player-2', {
        ...commonOpts,
        events: {
            'onReady': (e) => onPlayerReady(e, 1),
            'onStateChange': (e) => onPlayerStateChange(e, 1),
            'onError': onPlayerError
        }
    });
}

function onPlayerReady(event, pIndex) {
    isPlayerReady[pIndex] = true;
    event.target.setVolume(pIndex === activePlayerIndex ? document.getElementById('bp-volume-level').style.width.replace('%', '') : 0);
    event.target.setPlaybackQuality('tiny');
}

function onPlayerError(event) {
    console.error("YouTube Player Error:", event.data);

    const errContainer1 = document.getElementById('youtube-player-1');
    const errContainer2 = document.getElementById('youtube-player-2');
    if (errContainer1) errContainer1.style.opacity = "0";
    if (errContainer2) errContainer2.style.opacity = "0";

}

function onPlayerStateChange(event, pIndex) {
    if (pIndex !== activePlayerIndex) return;

    if (event.data == YT.PlayerState.PLAYING) {
        isPlaying = true;
        updatePlayPauseIcons();
        if (bpEqualizer) bpEqualizer.classList.add('active');

        if (event.target.isMuted()) {
            event.target.unMute();
        }

        let targetVolumeStr = document.getElementById('bp-volume-level').style.width.replace('%', '');
        event.target.setVolume(targetVolumeStr ? parseFloat(targetVolumeStr) : 70);

        const activeIframe = event.target.getIframe();
        const pastIframe = ytPlayers[pIndex === 0 ? 1 : 0].getIframe();
        activeIframe.style.opacity = '1';
        activeIframe.style.zIndex = '1';
        pastIframe.style.opacity = '0';
        pastIframe.style.zIndex = '0';

        event.target.setPlaybackQuality('tiny');
        requestAnimationFrame(updateProgressBar);
    } else if (event.data == YT.PlayerState.PAUSED) {
        isPlaying = false;
        updatePlayPauseIcons();
        if (bpEqualizer) bpEqualizer.classList.remove('active');
    } else if (event.data == YT.PlayerState.ENDED) {
        isPlaying = false;
        updatePlayPauseIcons();
        if (bpEqualizer) bpEqualizer.classList.remove('active');
        if (isRepeat) {
            ytPlayers[activePlayerIndex].seekTo(0);
            ytPlayers[activePlayerIndex].playVideo();
        } else {
            playNextTrack();
        }
    } else if (event.data == YT.PlayerState.CUED) {

        if (window.hasStartedPlaying && ytPlayers[activePlayerIndex] === event.target) {
            event.target.playVideo();
        }
    }
}

async function fetchTracks() {
    try {
        const response = await fetch("https://bayrdy.github.io/auraplayer/db.json");
        if (!response.ok) throw new Error("Veritabanı çekilemedi");
        const data = await response.json();

        tracks = data.tracks.filter(t =>
            t.title !== '[Deleted video]' &&
            t.title !== '[Private video]' &&
            t.duration !== '00:00'
        );

        handleUrlRouting();

        renderView();
        renderPlaylistsSidebar();

        const lastTrack = localStorage.getItem('auraplayer_last_track');
        if (lastTrack !== null && tracks[lastTrack]) {
            currentTrackIndex = parseInt(lastTrack);
            const t = tracks[currentTrackIndex];
            bpCover.src = t.coverUrl;
            bpTitle.textContent = t.title;
            bpArtist.textContent = t.artist;
            bpTotalTime.textContent = t.duration;
            updateLikeHeartUI();
        }
    } catch (error) {
        console.error("Error fetching db.json:", error);
    }
}

function processImportPlaylist(importPlaylistPayload) {
    try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(importPlaylistPayload))));
        if (decoded && decoded.name && decoded.trackIds) {
            if (confirm(`Paylaşılan çalma listesini içe aktarmak istiyor musunuz: "${decoded.name}"?`)) {
                decoded.id = 'pl_' + Date.now();
                if (!decoded.description) decoded.description = "";
                customPlaylists.push(decoded);
                savePlaylists();
                showToast("Çalma Listesi Başarıyla İçe Aktarıldı!");
                renderPlaylistsSidebar();
            }
        }
    } catch (e) {
        console.error("Failed to parse shared playlist URL", e);
        showToast("Geçersiz Paylaşılan Çalma Listesi Bağlantısı.");
    }
}

function handleUrlRouting() {
    const params = new URLSearchParams(window.location.search);
    const trackId = params.get('track');

    const importPlaylist = params.get('importPlaylist');

    if (trackId) {
        const index = tracks.findIndex(t => t.id === trackId);
        if (index !== -1) {

            const checkReady = setInterval(() => {
                if (isPlayerReady[0] && isPlayerReady[1]) {
                    clearInterval(checkReady);
                    playTrack(index);
                }
            }, 500);
        }

        window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (importPlaylist) {
        processImportPlaylist(importPlaylist);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

function renderView(isHistoryNav = false) {
    trackGrid.innerHTML = '';
    let displayTracks = [];

    const hour = new Date().getHours();
    let timeGreeting = t('greeting-evening');
    if (hour >= 6 && hour < 12) timeGreeting = t('greeting-morning');
    else if (hour >= 12 && hour < 18) timeGreeting = t('greeting-afternoon');
    else if (hour >= 18 && hour < 24) timeGreeting = t('greeting-evening');

    if (currentView === 'home') {
        greeting.style.display = 'block';
        greeting.textContent = timeGreeting;
        sectionTitle.textContent = t('section-home-title');
        sectionShowAll.style.display = 'block';
        searchContainer.style.display = 'none';

        if (homeShuffledTracks.length === 0 || window.shouldReshuffleHome) {
            let validHomeTracks = tracks.filter(t => t.coverUrl && !t.coverUrl.includes('/default.jpg') && !t.coverUrl.includes('/mqdefault.jpg') && !t.coverUrl.includes('/hqdefault.jpg'));
            homeShuffledTracks = validHomeTracks.sort(() => Math.random() - 0.5);
            window.shouldReshuffleHome = false;
        }
        homeRenderCount = 20;
        displayTracks = homeShuffledTracks.slice(0, homeRenderCount);
    } else if (currentView === 'discover') {
        greeting.style.display = 'none';
        sectionTitle.textContent = t('section-discover');
        sectionShowAll.style.display = 'none';
        searchContainer.style.display = 'none';
        let validDiscoverTracks = tracks.filter(t => t.coverUrl && !t.coverUrl.includes('/default.jpg') && !t.coverUrl.includes('/mqdefault.jpg') && !t.coverUrl.includes('/hqdefault.jpg'));
        displayTracks = [...validDiscoverTracks].reverse().slice(0, 50);
    } else if (currentView === 'search') {
        greeting.style.display = 'none';
        sectionTitle.textContent = t('section-search');
        sectionShowAll.style.display = 'none';
        searchContainer.style.display = 'flex';

        const query = searchInput.value.toLowerCase().trim();
        if (query) {
            let exactMatches = [];
            let startsWithMatches = [];
            let fuzzyMatches = [];

            tracks.forEach(t => {
                const title = t.title.toLowerCase();
                const artist = (t.artist || "").toLowerCase();
                if (title === query || artist === query) {
                    exactMatches.push(t);
                } else if (title.startsWith(query) || title.includes(` ${query}`) || artist.startsWith(query)) {
                    startsWithMatches.push(t);
                } else if (title.includes(query) || (artist && artist.includes(query))) {
                    fuzzyMatches.push(t);
                }
            });
            displayTracks = [...exactMatches, ...startsWithMatches, ...fuzzyMatches];
            sectionTitle.textContent = `"${searchInput.value}" - ${t('section-search')}`;
        } else {
            displayTracks = tracks;
        }
    } else if (currentView === 'liked') {
        greeting.style.display = 'block';
        greeting.textContent = t('section-liked');
        sectionTitle.textContent = `${likedSongs.length} şarkı`;
        sectionShowAll.style.display = 'none';
        searchContainer.style.display = 'none';
        displayTracks = tracks.filter(t => likedSongs.includes(t.id));
    } else if (currentView === 'playlist' && activePlaylistId) {
        const pl = customPlaylists.find(p => p.id === activePlaylistId);
        greeting.style.display = 'none';

        const coverSrc = (pl && pl.coverBase64) ? pl.coverBase64 : 'https://placehold.co/150x150/2b2b2b/ffffff?text=AuraPlayer';

        let headerHTML = `
            <div style="display: flex; align-items: flex-end; gap: 24px; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 24px;">
                <div style="width: 192px; height: 192px; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 60px rgba(0,0,0,0.5); cursor: pointer; position: relative;" onclick="uploadPlaylistCover('${pl.id}')" title="Kapak Fotoğrafını Değiştir">
                    <img src="${coverSrc}" style="width: 100%; height: 100%; object-fit: cover;">
                    <div style="position: absolute; inset:0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'">
                        <i class="fa-solid fa-pen" style="font-size: 32px; color: #fff;"></i>
                    </div>
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 14px; font-weight: 500; margin-bottom: 8px;">Çalma Listesi</div>
                    <h1 style="font-size: 72px; font-weight: 900; margin: 0 0 16px 0; line-height: 1.1; letter-spacing: -2px;">${pl ? pl.name : 'Bilinmeyen'}</h1>
                    <p style="font-size: 14px; font-weight: normal; color: var(--text-secondary); margin-bottom: 16px;">${(pl && pl.description) ? pl.description : ''}</p>
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <button onclick="if(displayTracks.length > 0) { let tId = isShuffle ? displayTracks[Math.floor(Math.random() * displayTracks.length)].id : displayTracks[0].id; playTrack(tracks.findIndex(t => t.id === tId)); }" style="width: 56px; height: 56px; border-radius: 50%; background: #1ed760; color: #000; display: flex; align-items: center; justify-content: center; font-size: 24px; border: none; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                            <i class="fa-solid fa-play" style="margin-left: 4px;"></i>
                        </button>

                        <i class="fa-regular fa-pen-to-square" style="font-size: 32px; color: var(--text-secondary); cursor: pointer; transition: color 0.2s;" onclick="editPlaylistConfig('${pl.id}')" title="Düzenle" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='var(--text-secondary)'"></i>
                        <i class="fa-solid fa-share-nodes" style="font-size: 32px; color: var(--text-secondary); cursor: pointer; transition: color 0.2s;" onclick="sharePlaylist('${pl.id}')" title="Paylaş" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='var(--text-secondary)'"></i>
                        <i class="fa-regular fa-trash-can" style="font-size: 32px; color: var(--text-secondary); cursor: pointer; transition: color 0.2s;" onclick="deletePlaylistConfig('${pl.id}')" title="Sil" onmouseover="this.style.color='#ff4757'" onmouseout="this.style.color='var(--text-secondary)'"></i>
                    </div>
                </div>
            </div>

            <div style="position: relative; max-width: 400px; margin-bottom: 24px;">
                <input type="text" id="pl-inline-search" placeholder="Listeye eklemek için müzik ara..." style="width: 100%; padding: 10px 14px; padding-left: 36px; border-radius: 4px; border:none; background: rgba(255,255,255,0.1); color:#fff; outline:none; font-family:'Inter', sans-serif;">
                <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 12px; color: var(--text-secondary); pointer-events: none; height: 16px; display: flex; align-items: center;"></i>
                <div id="pl-inline-results" style="position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #282828; z-index: 10; border-radius: 4px; max-height: 400px; overflow-y: auto; display:none; box-shadow: 0 4px 12px rgba(0,0,0,0.5);"></div>
            </div>
        `;

        sectionTitle.innerHTML = headerHTML;
        sectionTitle.style.marginBottom = '0';
        sectionShowAll.style.display = 'none';
        searchContainer.style.display = 'none';

        displayTracks = pl ? pl.trackIds.map(id => tracks.find(t => t.id === id)).filter(Boolean) : [];

        setTimeout(() => {
            const input = document.getElementById('pl-inline-search');
            const resBox = document.getElementById('pl-inline-results');
            if (input && resBox) {
                input.addEventListener('input', (e) => {
                    const q = e.target.value.toLowerCase().trim();
                    if (!q) { resBox.style.display = 'none'; return; }
                    let exact = [], starts = [], loose = [];
                    tracks.forEach(t => {
                        const tL = t.title.toLowerCase(), aL = (t.artist || '').toLowerCase();
                        if (tL === q || aL === q) exact.push(t);
                        else if (tL.startsWith(q) || aL.startsWith(q)) starts.push(t);
                        else if (tL.includes(q) || aL.includes(q)) loose.push(t);
                    });
                    const matches = [...exact, ...starts, ...loose].slice(0, 50);
                    if (matches.length === 0) {
                        resBox.innerHTML = '<div style="padding: 10px; color:var(--text-secondary); font-size:12px;">Sonuç bulunamadı</div>';
                    } else {
                        resBox.innerHTML = matches.map(m => `

                            <div class="pl-search-item" style="padding: 10px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; border-bottom: 1px solid rgba(255,255,255,0.05);" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">
                                <div style="display:flex; align-items:center; gap: 10px; pointer-events:none;">
                                    <img src="${m.coverUrl}" style="width: 32px; height: 32px; border-radius: 4px;">
                                    <div>
                                        <div style="font-size: 14px; font-weight: 500;">${m.title}</div>
                                        <div style="font-size: 12px; color:var(--text-secondary);">${m.artist || ''}</div>
                                    </div>
                                </div>
                                <button onclick="addTrackToCurrentPl('${m.id}')" style="background:transparent; border:1px solid #fff; color:#fff; border-radius: 500px; padding: 4px 12px; cursor:pointer;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">Ekle</button>
                            </div>
                        `).join('');
                    }
                    resBox.style.display = 'block';
                });
                document.addEventListener('click', (ev) => {
                    if (!ev.target.closest('#pl-inline-search') && !ev.target.closest('#pl-inline-results')) {
                        resBox.style.display = 'none';
                    }
                }, { once: true });
            }
        }, 0);
    }
    const existingSentinel = document.getElementById('lazy-loader-sentinel');
    if (existingSentinel) existingSentinel.remove();

    window.appDisplayTracks = currentView === 'home' ? homeShuffledTracks : displayTracks;
    window.appRenderCount = 0;

    const RENDER_CHUNK_SIZE = 50;
    const initialTracks = window.appDisplayTracks.slice(0, RENDER_CHUNK_SIZE);
    window.appRenderCount = initialTracks.length;

    if (currentView === 'playlist') {
        trackGrid.style.display = 'block';

        const listContainer = document.createElement('div');
        listContainer.className = 'playlist-track-list';
        listContainer.style.width = '100%';
        listContainer.id = 'active-list-container';
        const listHeader = document.createElement('div');
        listHeader.style.display = 'grid';
        listHeader.style.gridTemplateColumns = '40px 1fr 100px';
        listHeader.style.gap = '16px';
        listHeader.style.padding = '0 16px 8px 16px';
        listHeader.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        listHeader.style.marginBottom = '16px';
        listHeader.style.color = 'var(--text-secondary)';
        listHeader.style.fontSize = '14px';
        listHeader.innerHTML = `
            <div style="text-align: center;">#</div>
            <div>Şarkı</div>
            <div style="text-align: right;"><i class="fa-regular fa-clock"></i></div>
        `;
        listContainer.appendChild(listHeader);

        initialTracks.forEach((track, index) => {
            const originalIndex = tracks.findIndex(t => t.id === track.id);
            const row = createTrackRowElement(track, originalIndex, index);
            listContainer.appendChild(row);
        });
        trackGrid.appendChild(listContainer);

    } else {
        trackGrid.style.display = 'grid';
        initialTracks.forEach((track, index) => {
            const originalIndex = tracks.findIndex(t => t.id === track.id);
            const card = createTrackCardElement(track, originalIndex);
            trackGrid.appendChild(card);
        });
    }

    if (window.appRenderCount < window.appDisplayTracks.length) {
        attachLazyLoader();
    }
}

function createTrackRowElement(track, originalIndex, displayIndex) {
    const row = document.createElement('div');
    row.className = 'track-list-row';
    row.dataset.id = track.id;

    row.style.display = 'grid';
    row.style.gridTemplateColumns = '40px 1fr 100px';
    row.style.gap = '16px';
    row.style.padding = '8px 16px';
    row.style.alignItems = 'center';
    row.style.borderRadius = '4px';
    row.style.cursor = 'pointer';
    row.style.transition = 'background 0.2s';

    row.addEventListener('mouseenter', () => row.style.background = 'rgba(255,255,255,0.1)');
    row.addEventListener('mouseleave', () => row.style.background = 'transparent');

    row.innerHTML = `
        <div style="color: var(--text-secondary); text-align: center; font-size: 14px;">${displayIndex + 1}</div>
        <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${track.coverUrl}" style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover;">
            <div style="display: flex; flex-direction: column; justify-content: center;">
                <span style="font-size: 16px; font-weight: normal; color: #fff;">${track.title}</span>
                <span style="font-size: 14px; color: var(--text-secondary);">${track.artist}</span>
            </div>
        </div>
        <div style="color: var(--text-secondary); text-align: right; font-size: 14px; display: flex; align-items: center; justify-content: flex-end; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-fire" style="font-size: 10px; color: #ff4757;"></i> ${track.views || 0}
            </div>
            ${currentView === 'playlist' ? `<i class="fa-solid fa-xmark remove-from-pl-btn" style="cursor: pointer; color: var(--text-secondary); font-size: 16px; padding: 4px; border-radius: 50%;" data-idx="${originalIndex}" onmouseover="this.style.color='#ff4757'; this.style.background='rgba(255, 71, 87, 0.1)';" onmouseout="this.style.color='var(--text-secondary)'; this.style.background='transparent';"></i>` : ''}
        </div>
    `;

    if (currentView === 'playlist') {
        const removeBtn = row.querySelector('.remove-from-pl-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (activePlaylistId) {
                    const pl = customPlaylists.find(p => p.id === activePlaylistId);
                    if (pl && confirm("Bu şarkıyı listeden çıkarmak istediğinize emin misiniz?")) {
                        const trackIndexToRemove = Array.from(row.parentNode.children).indexOf(row) - 1;
                        if (trackIndexToRemove > -1) {
                            pl.trackIds.splice(trackIndexToRemove, 1);
                            savePlaylists();
                            row.remove();
                            showToast("Şarkı listeden çıkarıldı.");
                        }
                    }
                }
            });
        }
    }

    row.draggable = true;
    row.addEventListener('dragstart', handleDragStart);
    row.addEventListener('dragover', handleDragOver);
    row.addEventListener('drop', handleDrop);
    row.addEventListener('dragenter', handleDragEnter);
    row.addEventListener('dragleave', handleDragLeave);
    row.addEventListener('dragend', handleDragEnd);

    row.addEventListener('click', () => {
        playTrack(originalIndex);
    });

    row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e.pageX, e.pageY, track.id);
    });

    return row;
}

function createTrackCardElement(track, originalIndex) {
    const card = document.createElement('div');
    card.className = 'track-card';
    card.dataset.id = track.id;
    card.innerHTML = `
        <div class="cover-wrapper">
            <img src="${track.coverUrl}" alt="${track.title}" loading="lazy" onload="if(this.naturalWidth === 120) { if(currentView === 'home' || currentView === 'discover') this.closest('.track-card').style.display='none'; else this.src='https://i.ytimg.com/vi/${track.youtubeVideoId}/hqdefault.jpg'; }">
            <div class="play-btn-overlay">
                <i class="fa-solid fa-play" style="margin-left:4px;"></i>

            </div>
        </div>
        <h3>${track.title}</h3>
        <p>${track.artist}</p>
        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px; display: flex; align-items: center; gap: 4px;">
            <i class="fa-solid fa-fire" style="color: #ff4757;"></i> ${track.views || 0}
        </div>
    `;

    if (currentView === 'playlist') {
        card.draggable = true;
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('drop', handleDrop);
        card.addEventListener('dragenter', handleDragEnter);
        card.addEventListener('dragleave', handleDragLeave);
        card.addEventListener('dragend', handleDragEnd);
    }

    card.addEventListener('click', () => {
        playTrack(originalIndex);
    });

    card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e.pageX, e.pageY, track.id);
    });

    return card;
}

function attachLazyLoader() {
    const sentinel = document.createElement('div');
    sentinel.id = 'lazy-loader-sentinel';
    sentinel.style.height = '20px';
    sentinel.style.width = '100%';
    sentinel.style.marginTop = '20px';
    trackGrid.parentElement.appendChild(sentinel);

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            observer.unobserve(sentinel);
            sentinel.remove();
            loadMoreTracks();
        }
    });
    observer.observe(sentinel);
}

function loadMoreTracks() {
    const nextLimit = Math.min(window.appRenderCount + 50, window.appDisplayTracks.length);
    const newTracks = window.appDisplayTracks.slice(window.appRenderCount, nextLimit);
    const renderOffset = window.appRenderCount;
    window.appRenderCount = nextLimit;

    if (currentView === 'playlist') {
        const container = document.getElementById('active-list-container') || trackGrid;
        newTracks.forEach((track, index) => {
            const originalIndex = tracks.findIndex(t => t.id === track.id);
            const row = createTrackRowElement(track, originalIndex, renderOffset + index);
            container.appendChild(row);
        });
    } else {
        newTracks.forEach(track => {
            const originalIndex = tracks.findIndex(t => t.id === track.id);
            const card = createTrackCardElement(track, originalIndex);
            trackGrid.appendChild(card);
        });
    }

    if (window.appRenderCount < window.appDisplayTracks.length) {
        attachLazyLoader();
    }
}

let dragSrcEl = null;

function handleDragStart(e) {
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    this.style.opacity = '0.4';
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    this.style.border = '2px dashed #1ed760';
}

function handleDragLeave(e) {
    this.style.border = 'none';
}

function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();

    if (dragSrcEl !== this && currentView === 'playlist' && activePlaylistId) {
        const pl = customPlaylists.find(p => p.id === activePlaylistId);
        if (pl) {

            const allCards = Array.from(document.querySelectorAll('.track-list-row, .track-card'));
            const oldIndex = allCards.indexOf(dragSrcEl);
            const newIndex = allCards.indexOf(this);

            const movedId = pl.trackIds.splice(oldIndex, 1)[0];
            pl.trackIds.splice(newIndex, 0, movedId);

            savePlaylists();
            renderView();
        }
    }
    return false;
}

function handleDragEnd(e) {
    this.style.opacity = '1';
    document.querySelectorAll('.track-list-row, .track-card').forEach(c => c.style.border = 'none');
}

window.addTrackToCurrentPl = function (trackId) {
    if (!activePlaylistId) return;
    const pl = customPlaylists.find(p => p.id === activePlaylistId);
    if (pl) {
        if (!pl.trackIds.includes(trackId)) {
            pl.trackIds.push(trackId);
            savePlaylists();
            showToast(t('toast-added'));

            const container = document.getElementById('active-list-container');
            if (container) {
                const trackIndex = pl.trackIds.length - 1;
                const track = tracks.find(t => t.id === trackId);
                const originalIndex = tracks.findIndex(t => t.id === trackId);
                if (track) {
                    const row = createTrackRowElement(track, originalIndex, trackIndex);
                    container.appendChild(row);
                }
            }
        } else {
            showToast(t('toast-exists'));
        }
    }
};

function playTrack(index, savedTime = 0) {
    if (!isPlayerReady[0] || !isPlayerReady[1] || tracks.length === 0) return;

    window.hasStartedPlaying = true;
    currentTrackIndex = index;
    const track = tracks[currentTrackIndex];

    bpCover.src = track.coverUrl;
    bpTitle.textContent = track.title;
    bpArtist.textContent = track.artist;
    bpTotalTime.textContent = track.duration;

    document.title = `${track.title} - ${track.artist} | AuraPlayer`;

    updateLikeHeartUI();

    const oldPlayerIndex = activePlayerIndex;
    const newPlayerIndex = activePlayerIndex === 0 ? 1 : 0;

    activePlayerIndex = newPlayerIndex;

    window.isAutoFading = false;

    const oldPlayer = ytPlayers[oldPlayerIndex];
    const newPlayer = ytPlayers[newPlayerIndex];

    const oldContainer = document.getElementById(`youtube-player-${oldPlayerIndex + 1}`);
    const newContainer = document.getElementById(`youtube-player-${newPlayerIndex + 1}`);

    let targetVolumeStr = document.getElementById('bp-volume-level').style.width.replace('%', '');
    let targetVolume = targetVolumeStr ? parseFloat(targetVolumeStr) : 70;

    newPlayer.setVolume(0);
    if (newPlayer.mute) newPlayer.mute();

    const loadOpts = { videoId: track.youtubeVideoId };
    if (savedTime > 0) loadOpts.startSeconds = savedTime;

    newPlayer.cueVideoById(loadOpts);

    if (window.hasStartedPlaying) {
        newPlayer.playVideo();
    }

    if (!userSettings.crossfade) {
        if (oldPlayer.pauseVideo) oldPlayer.pauseVideo();
        oldContainer.style.opacity = "0";
        newContainer.style.opacity = "1";
        if (newPlayer.setVolume) newPlayer.setVolume(targetVolume);
        isPlaying = true;
        updatePlayPauseIcons();
        return;
    }

    let fadeSteps = 30;
    let fadeTime = 3000;
    let currentStep = 0;

    newContainer.style.transition = `opacity ${fadeTime}ms ease-in-out`;
    oldContainer.style.transition = `opacity ${fadeTime}ms ease-in-out`;

    newContainer.style.opacity = "1";
    oldContainer.style.opacity = "0";

    clearInterval(window.crossfadeInterval);
    window.crossfadeInterval = setInterval(() => {
        currentStep++;
        let progress = currentStep / fadeSteps;

        let newVol = targetVolume * progress;
        let oldVol = targetVolume * (1 - progress);

        if (newPlayer.setVolume) newPlayer.setVolume(newVol);
        if (oldPlayer.setVolume && oldPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
            oldPlayer.setVolume(oldVol);
        }

        if (currentStep >= fadeSteps) {
            clearInterval(window.crossfadeInterval);
            if (oldPlayer.pauseVideo) oldPlayer.pauseVideo();
            if (newPlayer.setVolume) newPlayer.setVolume(targetVolume);
        }
    }, fadeTime / fadeSteps);

    isPlaying = true;
    updatePlayPauseIcons();
}

function togglePlay() {
    if (!ytPlayers[activePlayerIndex] || !tracks[currentTrackIndex] || !isPlayerReady[activePlayerIndex]) return;

    if (!window.hasStartedPlaying) {

        const savedTime = localStorage.getItem('auraplayer_last_time');
        playTrack(currentTrackIndex, savedTime ? parseFloat(savedTime) : 0);
        return;
    }

    if (isPlaying) {
        ytPlayers[activePlayerIndex].pauseVideo();
    } else {
        ytPlayers[activePlayerIndex].playVideo();
    }
}

function playNextTrack() {
    if (tracks.length === 0) return;
    if (isShuffle) {
        let randomIndex = currentTrackIndex;
        while (randomIndex === currentTrackIndex && tracks.length > 1) {
            randomIndex = Math.floor(Math.random() * tracks.length);
        }
        playTrack(randomIndex);
    } else {
        let nextIndex = currentTrackIndex + 1;
        if (nextIndex >= tracks.length) nextIndex = 0;
        playTrack(nextIndex);
    }
}

function playPrevTrack() {
    if (tracks.length === 0) return;

    let prevIndex = currentTrackIndex - 1;
    if (prevIndex < 0) prevIndex = tracks.length - 1;
    playTrack(prevIndex);
}

function toggleLike() {
    if (tracks.length === 0) return;
    const currentTrackId = tracks[currentTrackIndex].id;

    if (likedSongs.includes(currentTrackId)) {
        likedSongs = likedSongs.filter(id => id !== currentTrackId);
    } else {
        likedSongs.push(currentTrackId);
    }

    localStorage.setItem('auraplayer_liked', JSON.stringify(likedSongs));
    updateLikeHeartUI();

    if (currentView === 'liked') {
        renderView();
    }
}

function updateLikeHeartUI() {
    if (tracks.length === 0) return;
    const currentTrackId = tracks[currentTrackIndex].id;
    if (likedSongs.includes(currentTrackId)) {
        bpLikeBtn.classList.remove('fa-regular');
        bpLikeBtn.classList.add('fa-solid', 'heart-active');
    } else {
        bpLikeBtn.classList.add('fa-regular');
        bpLikeBtn.classList.remove('fa-solid', 'heart-active');
    }
}

function toggleShuffle() {
    isShuffle = !isShuffle;
    bpShuffle.classList.toggle('icon-active', isShuffle);
}

function toggleRepeat() {
    isRepeat = !isRepeat;
    bpRepeat.classList.toggle('icon-active', isRepeat);
}

function updatePlayPauseIcons() {
    const iconClass = isPlaying ? 'fa-pause' : 'fa-play';
    bpPlayPause.innerHTML = `<i class="fa-solid ${iconClass}" style="${isPlaying ? '' : 'margin-left:3px;'}"></i>`;
}

function updateProgressBar() {
    const p = ytPlayers[activePlayerIndex];
    if (isPlaying && p && p.getCurrentTime) {
        const currentTime = p.getCurrentTime();
        const duration = p.getDuration();

        if (duration > 0) {
            const percent = (currentTime / duration) * 100;
            bpProgress.style.width = `${percent}%`;

            const formatTime = (timeInSeconds) => {
                const minutes = Math.floor(timeInSeconds / 60);
                const seconds = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
                return `${minutes}:${seconds}`;
            };

            const formattedTime = formatTime(currentTime);
            if (bpCurrentTime.textContent !== formattedTime) {
                bpCurrentTime.textContent = formattedTime;
            }

            const now = Date.now();
            if (!window.lastSaveTime || now - window.lastSaveTime > 2000) {
                localStorage.setItem('auraplayer_last_track', currentTrackIndex);
                localStorage.setItem('auraplayer_last_time', currentTime);
                window.lastSaveTime = now;
            }

            if (duration - currentTime <= 5.0 && !window.isAutoFading) {
                window.isAutoFading = true;
                if (!isRepeat) {
                    playNextTrack();
                } else {
                    playTrack(currentTrackIndex);
                }
            }
        }

        requestAnimationFrame(updateProgressBar);
    }
}

function seekTo(event, progressBar) {
    const p = ytPlayers[activePlayerIndex];
    if (!p || !p.getDuration) return;
    const rect = progressBar.getBoundingClientRect();
    const pos = (event.clientX - rect.left) / rect.width;
    const seekTime = pos * p.getDuration();
    p.seekTo(seekTime, true);
    bpProgress.style.width = `${pos * 100}%`;
}

function changeVolume(event) {
    const p = ytPlayers[activePlayerIndex];
    if (!p) return;
    const rect = bpVolumeBar.getBoundingClientRect();
    let pos = (event.clientX - rect.left) / rect.width;
    pos = Math.max(0, Math.min(1, pos));
    const newVolume = pos * 100;

    p.setVolume(newVolume);

    const inactive = activePlayerIndex === 0 ? 1 : 0;
    if (ytPlayers[inactive] && ytPlayers[inactive].setVolume) ytPlayers[inactive].setVolume(0);

    bpVolumeLevel.style.width = `${newVolume}%`;

    if (newVolume === 0) {
        bpVolumeIcon.className = 'fa-solid fa-volume-xmark';
    } else if (newVolume < 50) {
        bpVolumeIcon.className = 'fa-solid fa-volume-low';
    } else {
        bpVolumeIcon.className = 'fa-solid fa-volume-high';
    }

    if (p.isMuted()) p.unMute();
}

function setNavActive(elem) {
    [navHome, navSearch, navLibrary, navLikedSongs, navDiscover].forEach(el => {
        if (el) el.classList.remove('active');
    });
    if (elem) elem.classList.add('active');
}

navHome.addEventListener('click', () => {

    if (currentView === 'home') {
        window.shouldReshuffleHome = true;
    }
    currentView = 'home';
    setNavActive(navHome);
    renderView();
});

if (navDiscover) {
    navDiscover.addEventListener('click', () => {
        currentView = 'discover';
        setNavActive(navDiscover);
        renderView();
    });
}

navSearch.addEventListener('click', () => {
    currentView = 'search';
    setNavActive(navSearch);
    renderView();
    searchInput.focus();
});

navLibrary.addEventListener('click', () => {

    currentView = 'liked';
    setNavActive(navLibrary);
    renderView();
});

navLikedSongs.addEventListener('click', () => {
    currentView = 'liked';
    setNavActive(navLikedSongs);
    renderView();
});

searchInput.addEventListener('input', () => {
    if (currentView === 'search') renderView();
});

bpPlayPause.addEventListener('click', togglePlay);
bpNext.addEventListener('click', playNextTrack);
bpPrev.addEventListener('click', playPrevTrack);
bpShuffle.addEventListener('click', toggleShuffle);
bpRepeat.addEventListener('click', toggleRepeat);
bpLikeBtn.addEventListener('click', toggleLike);
bpProgressBar.addEventListener('click', (e) => seekTo(e, bpProgressBar));

bpVolumeIcon.addEventListener('click', () => {
    const p = ytPlayers[activePlayerIndex];
    if (!p) return;
    if (p.isMuted()) {
        p.unMute();
        bpVolumeIcon.classList.remove('fa-volume-xmark');
        bpVolumeIcon.classList.add('fa-volume-high');
        let currentVol = document.getElementById('bp-volume-level').style.width.replace('%', '');
        p.setVolume(currentVol ? parseFloat(currentVol) : 70);
    } else {
        p.mute();
        bpVolumeIcon.classList.remove('fa-volume-high');
        bpVolumeIcon.classList.remove('fa-volume-low');
        bpVolumeIcon.classList.add('fa-volume-xmark');
    }
});

function showToast(msg) {
    if (!toastMsg) return;
    toastMsg.textContent = msg;
    toastMsg.classList.add('show');
    setTimeout(() => { toastMsg.classList.remove('show'); }, 3000);
}

if (bpShareBtn) {
    bpShareBtn.addEventListener('click', () => {
        if (!tracks[currentTrackIndex]) return;

        const url = `${window.location.origin}${window.location.pathname}?track=${tracks[currentTrackIndex].id}`;
        navigator.clipboard.writeText(url).then(() => {
            showToast("AuraPlayer Linki Panoya Kopyalandı!");
        });
    });
}

if (bpSleepTimer && sleepTimerMenu) {
    bpSleepTimer.addEventListener('click', () => {
        sleepTimerMenu.classList.toggle('show');
    });

    sleepTimerMenu.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            const minutes = parseInt(btn.getAttribute('data-time'));
            sleepTimerMenu.classList.remove('show');
            if (sleepTimerId) clearTimeout(sleepTimerId);

            if (minutes === 0) {
                showToast("Uyku Zamanlayıcısı İptal Edildi");
            } else {
                showToast(`Uyku Zamanlayıcısı ${minutes} dakika sonrasına ayarlandı`);
                sleepTimerId = setTimeout(() => {
                    if (isPlaying) togglePlay();
                    showToast("Uyku Zamanlayıcısı Sona Erdi. İyi geceler!");
                }, minutes * 60 * 1000);
            }
        });
    });
}

if (bpExpandVideo) {
    bpExpandVideo.addEventListener('click', () => {
        document.body.classList.toggle('cinema-mode');

        const icon = bpExpandVideo.querySelector('i');
        if (document.body.classList.contains('cinema-mode')) {
            icon.classList.remove('fa-expand');
            icon.classList.add('fa-compress');
        } else {
            icon.classList.remove('fa-compress');
            icon.classList.add('fa-expand');
        }
    });
}

let isDraggingVolume = false;
bpVolumeBar.addEventListener('mousedown', (e) => {
    isDraggingVolume = true;
    changeVolume(e);
});
document.addEventListener('mousemove', (e) => {
    if (isDraggingVolume) changeVolume(e);
});
document.addEventListener('mouseup', () => {
    isDraggingVolume = false;
});

document.addEventListener('keydown', (e) => {

    const activeEq = document.activeElement;
    if (activeEq === searchInput || activeEq.tagName === 'INPUT' || activeEq.tagName === 'TEXTAREA') return;

    if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
    } else if (e.code === 'ArrowRight') {
        playNextTrack();
    } else if (e.code === 'ArrowLeft') {
        playPrevTrack();
    } else if (e.code === 'KeyF' || e.key === 'f') {
        if (bpExpandVideo) bpExpandVideo.click();
    } else if (e.code === 'KeyM' || e.key === 'm') {
        if (bpVolumeIcon) bpVolumeIcon.click();
    }
});

window.addEventListener('DOMContentLoaded', () => {
    fetchTracks();
});

function savePlaylists() {
    localStorage.setItem('auraplayer_playlists', JSON.stringify(customPlaylists));
}

function saveSettings() {
    localStorage.setItem('auraplayer_settings', JSON.stringify(userSettings));
}

function renderPlaylistsSidebar() {
    if (!customPlaylistsList) return;
    customPlaylistsList.innerHTML = '';
    customPlaylists.forEach(pl => {
        const li = document.createElement('li');
        li.draggable = true;
        li.dataset.id = pl.id;
        li.innerHTML = `
            <i class="fa-solid fa-layer-group" style="color:var(--text-secondary); margin-right: 12px; pointer-events: none;"></i>
            <span style="flex:1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none;">${pl.name}</span>
        `;

        if (currentView === 'playlist' && activePlaylistId === pl.id) {
            li.classList.add('active');
        }

        li.addEventListener('click', (e) => {
            currentView = 'playlist';
            activePlaylistId = pl.id;
            document.querySelectorAll('.sidebar-nav li, .playlists li').forEach(l => l.classList.remove('active'));
            li.classList.add('active');
            renderView();
        });

        li.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', pl.id);
            li.style.opacity = '0.4';
        });

        li.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            li.style.borderTop = '2px solid var(--accent-color)';
            li.style.paddingTop = '4px';
        });

        li.addEventListener('dragleave', (e) => {
            li.style.borderTop = 'none';
            li.style.paddingTop = '6px';
        });

        li.addEventListener('drop', (e) => {
            e.stopPropagation();
            li.style.borderTop = 'none';
            li.style.paddingTop = '6px';
            const draggedId = e.dataTransfer.getData('text/plain');
            if (draggedId !== pl.id) {
                const draggedIndex = customPlaylists.findIndex(p => p.id === draggedId);
                const targetIndex = customPlaylists.findIndex(p => p.id === pl.id);

                if (draggedIndex > -1 && targetIndex > -1) {
                    const draggedItem = customPlaylists.splice(draggedIndex, 1)[0];
                    customPlaylists.splice(targetIndex, 0, draggedItem);
                    savePlaylists();
                    renderPlaylistsSidebar();
                }
            }
            return false;
        });

        li.addEventListener('dragend', (e) => {
            li.style.opacity = '1';
            const items = customPlaylistsList.querySelectorAll('li');
            items.forEach(item => {
                item.style.borderTop = 'none';
                item.style.paddingTop = '6px';
            });
        });

        customPlaylistsList.appendChild(li);
    });
}

if (navCreatePlaylist) {
    navCreatePlaylist.addEventListener('click', () => {
        editingPlaylistId = null;
        playlistModalTitle.textContent = "Çalma Listesi Oluştur";
        playlistNameInput.value = "";
        playlistDescInput.value = "";
        playlistModal.style.display = "flex";
    });
}

if (closePlaylistModal) {
    closePlaylistModal.addEventListener('click', () => {
        playlistModal.style.display = "none";
    });
}

playlistModal.addEventListener('click', (e) => {
    if (e.target === playlistModal) {
        playlistModal.style.display = "none";
    }
});

btnSavePlaylist.addEventListener('click', () => {
    const plName = playlistNameInput.value.trim();
    const plDesc = playlistDescInput.value.trim();

    if (!plName) {
        showToast("Lütfen bir isim girin");
        return;
    }

    if (editingPlaylistId) {

        const pl = customPlaylists.find(p => p.id === editingPlaylistId);
        if (pl) {
            pl.name = plName;
            pl.description = plDesc;
            showToast("Çalma Listesi Güncellendi!");
        }
    } else {

        const newList = { id: 'pl_' + Date.now(), name: plName, description: plDesc, trackIds: [], coverBase64: null };
        customPlaylists.push(newList);
        showToast("Çalma Listesi Oluşturuldu!");
    }

    savePlaylists();
    renderPlaylistsSidebar();
    if (currentView === 'playlist' && (activePlaylistId === editingPlaylistId || !editingPlaylistId)) {
        renderView();
    }
    playlistModal.style.display = "none";
});

window.editPlaylistConfig = function (plId) {
    const pl = customPlaylists.find(p => p.id === plId);
    if (pl) {
        editingPlaylistId = pl.id;
        playlistModalTitle.textContent = "Çalma Listesini Düzenle";
        playlistNameInput.value = pl.name || "";
        playlistDescInput.value = pl.description || "";
        playlistModal.style.display = "flex";
    }
};

window.deletePlaylistConfig = function (plId) {
    const pl = customPlaylists.find(p => p.id === plId);
    if (pl && confirm(`"${pl.name}" listesini silmek istediğinizden emin misiniz?`)) {
        customPlaylists = customPlaylists.filter(p => p.id !== pl.id);
        savePlaylists();
        if (currentView === 'playlist' && activePlaylistId === pl.id) {
            currentView = 'home';
            activePlaylistId = null;
        }
        renderPlaylistsSidebar();
        renderView();
    }
};

window.uploadPlaylistCover = function (plId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png, image/jpeg, image/webp';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = readerEvent => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 80;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const base64 = canvas.toDataURL('image/webp', 0.4);
                const pl = customPlaylists.find(p => p.id === plId);
                if (pl) {
                    pl.coverBase64 = base64;
                    savePlaylists();
                    renderView();
                }
            };
            img.src = readerEvent.target.result;
        };
        reader.readAsDataURL(file);
    };
    input.click();
};

function showContextMenu(x, y, trackId) {
    if (customPlaylists.length === 0) {
        showToast("Önce bir çalma listesi oluşturun!");
        return;
    }

    contextMenu.style.display = 'block';

    const menuWidth = contextMenu.offsetWidth || 180;
    const menuHeight = contextMenu.offsetHeight || Math.min(customPlaylists.length * 35 + 30, 300);

    let adjustedX = x;
    let adjustedY = y;

    if (x + menuWidth > window.innerWidth) adjustedX = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight) adjustedY = window.innerHeight - menuHeight - 10;

    contextMenu.style.left = `${adjustedX}px`;
    contextMenu.style.top = `${adjustedY}px`;

    ctxPlaylistOpts.innerHTML = '';
    customPlaylists.forEach(pl => {
        const li = document.createElement('li');
        li.textContent = pl.name;
        li.addEventListener('click', () => {
            if (!pl.trackIds.includes(trackId)) {
                pl.trackIds.push(trackId);
                savePlaylists();
                showToast(`${pl.name} listesine eklendi`);
            } else {
                showToast("Zaten çalma listesinde");
            }
            contextMenu.style.display = 'none';
        });
        ctxPlaylistOpts.appendChild(li);
    });
}

document.addEventListener('click', (e) => {
    if (contextMenu && e.target.closest('.track-card') == null) {
        contextMenu.style.display = 'none';
    }
});

window.sharePlaylist = function (plId) {
    const pl = customPlaylists.find(p => p.id === plId);
    if (!pl) return;
    try {
        const payloadObj = { name: pl.name, trackIds: pl.trackIds, description: pl.description || "" };
        if (pl.coverBase64) payloadObj.coverBase64 = pl.coverBase64;

        let payload = btoa(unescape(encodeURIComponent(JSON.stringify(payloadObj))));
        let url = `auraplayer://importPlaylist=${payload}`;

        if (url.length > 6000 && pl.coverBase64) {
            delete payloadObj.coverBase64;
            payload = btoa(unescape(encodeURIComponent(JSON.stringify(payloadObj))));
            url = `auraplayer://importPlaylist=${payload}`;
            showToast("UYARI: Fotoğraf URL sınırını aştığı için çıkartıldı, Çalma Listesi Linki Kopyalandı!");
        } else {
            showToast("Çalma Listesi Linki Kopyalandı!");
        }

        navigator.clipboard.writeText(url);
    } catch (e) {
        console.error("Error creating share link", e);
        showToast("Link oluşturulurken hata meydana geldi.");
    }
};

if (settingsTrigger) {
    settingsTrigger.addEventListener('click', () => {
        settingsModal.style.display = 'flex';
    });

    closeSettings.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) { settingsModal.style.display = 'none'; } });

    settingVideo.addEventListener('change', (e) => {
        userSettings.videoBackground = e.target.checked;
        saveSettings();
        if (e.target.checked) {
            document.querySelector('.video-background-wrapper').style.opacity = '1';
            document.querySelector('.video-background-wrapper').style.pointerEvents = 'auto';
            if (bpExpandVideo) bpExpandVideo.style.display = 'inline-block';
        } else {
            document.querySelector('.video-background-wrapper').style.opacity = '0';
            document.querySelector('.video-background-wrapper').style.pointerEvents = 'none';
            if (bpExpandVideo) bpExpandVideo.style.display = 'none';
            document.body.classList.remove('cinema-mode');
        }
    });

    settingCrossfade.addEventListener('change', (e) => {
        userSettings.crossfade = e.target.checked;
        saveSettings();
    });

    btnExportData.addEventListener('click', () => {
        const exportData = {
            version: "1.0",
            settings: userSettings,
            likedSongs: likedSongs,
            playlists: customPlaylists
        };
        const stData = btoa(unescape(encodeURIComponent(JSON.stringify(exportData))));

        const blob = new Blob([stData], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `AuraPlayer_Yedek_${new Date().getTime()}.aura`;
        a.click();
        URL.revokeObjectURL(a.href);
        showToast("Veriler Başarıyla Dışa Aktarıldı.");
    });

    btnImportData.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (evt) {
            try {
                const parsed = JSON.parse(decodeURIComponent(escape(atob(evt.target.result))));
                if (parsed.version) {
                    if (parsed.settings) localStorage.setItem('auraplayer_settings', JSON.stringify(parsed.settings));
                    if (parsed.likedSongs) localStorage.setItem('auraplayer_liked', JSON.stringify(parsed.likedSongs));
                    if (parsed.playlists) localStorage.setItem('auraplayer_playlists', JSON.stringify(parsed.playlists));
                    alert("İçe Aktarma Başarılı! Uygulama şimdi yeniden yüklenecek.");
                    window.location.reload();
                } else {
                    throw new Error("Geçersiz Aura Dosyası formatı.");
                }
            } catch (err) {
                alert("Veriler içe aktarılamadı. Dosya bozuk veya geçerli bir .aura dosyası olmayabilir.");
                console.error(err);
            }
        };
        reader.readAsText(file);
    });
}

document.addEventListener('visibilitychange', () => {
    const videoWrapper = document.querySelector('.video-background-wrapper');
    if (document.hidden) {
        if (videoWrapper) videoWrapper.style.display = 'none';
    } else {
        if (videoWrapper && userSettings.videoBackground) videoWrapper.style.display = 'block';
    }
});

const CURRENT_VERSION = "1.0.0";
async function checkUpdates() {
    try {
        const res = await fetch("https://api.github.com/repos/bayrdy/auraplayer/releases/latest");
        if(!res.ok) return;
        const data = await res.json();
        if (data && data.version && data.version !== CURRENT_VERSION) {
            const hasConfirmed = confirm(`AuraPlayer'ın yeni bir versiyonu mevcut! (${data.version})\nGüncellemeyi indirmek ister misiniz?`);
            if(hasConfirmed && data.download) {
                if (window.electronAPI && window.electronAPI.openExternal) {
                    window.electronAPI.openExternal(data.download);
                } else {
                    window.open(data.download, "_blank");
                }
            }
        }
    } catch(e) {
        console.error("Update check failed", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkUpdates, 2000);
});