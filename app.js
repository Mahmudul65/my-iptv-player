/* LIVE BROADCAST CONFIGURATION */
const playlist = 'https://raw.githubusercontent.com/Rakib49/Rakibiptv/refs/heads/main/aynaott.m3u';

/* CORE SYSTEM STATE ENGINE */
let channels = [];
let currentIndex = 0;
let hlsInstance = null;

/* BOOT ENGINE & STREAM PARSER */
fetch(playlist)
    .then(response => {
        if (!response.ok) throw new Error("Broadcast stream structural error");
        return response.text();
    })
    .then(data => {
        const lines = data.split(/\r?\n/);
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('#EXTINF')) {
                const info = line;
                const url = lines[i + 1] ? lines[i + 1].trim() : '';
                
                if (url.startsWith('http')) {
                    let name = info.split(',')[1] ? info.split(',')[1].trim() : 'Live Stream';
                    
                    let logo = '';
                    const logoMatch = info.match(/tvg-logo="(.*?)"/);
                    if (logoMatch && logoMatch[1]) {
                        logo = logoMatch[1];
                    }

                    channels.push({ name, url, logo });
                }
            }
        }

        document.getElementById('stationCount').innerText = `${channels.length} ONLINE`;
        
        renderChannels();
        if (channels.length > 0) {
            playChannel(0);
        }
    })
    .catch(err => console.error("IPTV Infrastructure Initialization Failed:", err));

/* RENDERING GENERATOR ENGINE */
function renderChannels() {
    const grid = document.getElementById('channelGrid');
    grid.innerHTML = '';

    channels.forEach((ch, index) => {
        const div = document.createElement('div');
        div.className = 'channel';
        div.title = ch.name;
        
        if (ch.logo) {
            const img = document.createElement('img');
            img.src = ch.logo;
            img.alt = ch.name;
            img.onerror = function() {
                this.parentNode.innerHTML = `<span class="channel-text">${ch.name}</span>`;
            };
            div.appendChild(img);
        } else {
            div.innerHTML = `<span class="channel-text">${ch.name}</span>`;
        }

        div.onclick = () => playChannel(index);
        grid.appendChild(div);
    });
}

/* ⚡ INSTANT PLAYBACK ENGINE (AUTO-PLAY & QUALITY SETUP) */
function playChannel(index) {
    if (index < 0 || index >= channels.length) return;
    
    currentIndex = index;
    const video = document.getElementById('video');
    const channel = channels[index];

    document.getElementById('currentChannelName').innerText = channel.name;
    document.getElementById('qualityMenu').classList.add('hidden'); 

    if (hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
    }

    video.muted = false;
    video.volume = 1.0;
    document.getElementById('volumeSlider').value = 1.0;

    if (Hls.isSupported() && channel.url.includes('.m3u8')) {
        hlsInstance = new Hls({
            maxMaxBufferLength: 10,
            enableWorker: true,
            lowLatencyMode: true
        });
        hlsInstance.loadSource(channel.url);
        hlsInstance.attachMedia(video);
        
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            triggerForcePlay(video);
        });
        
        hlsInstance.on(Hls.Events.LEVEL_LOADED, () => {
            buildQualityMenu();
        });
        
    } else {
        video.src = channel.url;
        triggerForcePlay(video);
        buildLegacyQualityMenu(); 
    }

    const cards = document.querySelectorAll('.channel');
    cards.forEach(el => el.classList.remove('active'));
    if (cards[index]) {
        cards[index].classList.add('active');
        cards[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/* 🎯 LIVE STREAM SYNC ENGINE (DELAY FIX) */
function syncToLive(event) {
    if (event) event.stopPropagation(); // ভিডিওর বডি ক্লিক ইভেন্ট পজ হওয়া আটকাবে
    const video = document.getElementById('video');
    
    if (hlsInstance) {
        // HLS.js এর লাইভ এজ পজিশন খুঁজে বের করে সেখানে জাম্প করা
        const livePosition = hlsInstance.liveSyncPosition;
        if (livePosition) {
            video.currentTime = livePosition;
        } else if (video.buffered.length > 0) {
            video.currentTime = video.buffered.end(video.buffered.length - 1);
        }
    } else if (video.buffered.length > 0) {
        // নরমাল ভিডিও ফাইলের জন্য বাফারের শেষ মাথায় নিয়ে যাওয়া
        video.currentTime = video.buffered.end(video.buffered.length - 1);
    }
    
    // যদি ভিডিও পজ করা থাকে, তবে রেজুম (Resume) করা হবে
    if (video.paused) {
        video.play().then(() => updatePlayPauseUI(false));
    }
}

/* 🎯 ডাইনামিক কোয়ালিটি মেনু বিল্ডার */
function buildQualityMenu() {
    const menu = document.getElementById('qualityMenu');
    if (!hlsInstance || hlsInstance.levels.length === 0) {
        buildLegacyQualityMenu();
        return;
    }

    menu.innerHTML = '';
    const levels = hlsInstance.levels;
    const currentLevel = hlsInstance.currentLevel;

    const autoBtn = document.createElement('button');
    autoBtn.className = `q-item ${hlsInstance.loadLevel === -1 ? 'active' : ''}`;
    autoBtn.innerText = '⚡ Auto';
    autoBtn.onclick = () => {
        hlsInstance.loadLevel = -1; 
        updateQualityMenuUI(autoBtn);
    };
    menu.appendChild(autoBtn);

    for (let i = levels.length - 1; i >= 0; i--) {
        const level = levels[i];
        const h = level.height;
        const btn = document.createElement('button');
        btn.className = `q-item ${currentLevel === i ? 'active' : ''}`;
        btn.innerText = `${h}p`;
        
        btn.onclick = () => {
            hlsInstance.loadLevel = i; 
            updateQualityMenuUI(btn);
        };
        menu.appendChild(btn);
    }
}

function buildLegacyQualityMenu() {
    const menu = document.getElementById('qualityMenu');
    menu.innerHTML = `
        <button class="q-item active">⚡ Auto</button>
        <button class="q-item opacity-40 cursor-not-allowed" disabled>1080p</button>
        <button class="q-item opacity-40 cursor-not-allowed" disabled>720p</button>
        <button class="q-item opacity-40 cursor-not-allowed" disabled>480p</button>
    `;
}

function updateQualityMenuUI(selectedBtn) {
    const items = document.querySelectorAll('.q-item');
    items.forEach(item => item.classList.remove('active'));
    selectedBtn.classList.add('active');
    document.getElementById('qualityMenu').classList.add('hidden'); 
}

function toggleQualityMenu(event) {
    event.stopPropagation(); 
    const menu = document.getElementById('qualityMenu');
    menu.classList.toggle('hidden');
    startHideTimer();
}

/* 🎯 FORCE PLAY & AUTO UNMUTE LOGIC */
function triggerForcePlay(video) {
    const playPromise = video.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            updatePlayPauseUI(false);
        }).catch(error => {
            video.muted = true;
            video.play().then(() => {
                setTimeout(() => {
                    video.muted = false;
                    video.volume = 1.0;
                    updatePlayPauseUI(false);
                }, 50);
            });
        });
    }
}

/* ⌨️ KEYBOARD SHORTCUT SYSTEM (SPACEBAR & 'F' FULLSCREEN) */
window.addEventListener('keydown', function(e) {
    if (document.activeElement.tagName === 'INPUT') return;
    
    if (e.code === 'Space' || e.keyCode === 32) {
        e.preventDefault(); 
        togglePlay();
    }
    
    if (e.key === 'f' || e.key === 'F' || e.keyCode === 70) {
        e.preventDefault();
        toggleFullscreen();
    }
});

/* MEDIA SUB-CONTROLS SYSTEM */
function nextChannel() {
    currentIndex = (currentIndex + 1) >= channels.length ? 0 : currentIndex + 1;
    playChannel(currentIndex);
}

function prevChannel() {
    currentIndex = (currentIndex - 1) < 0 ? channels.length - 1 : currentIndex - 1;
    playChannel(currentIndex);
}

function togglePlay() {
    const video = document.getElementById('video');
    if (video.paused) {
        video.muted = false; 
        video.play().then(() => updatePlayPauseUI(false));
    } else {
        video.pause();
        updatePlayPauseUI(true);
    }
}

function updatePlayPauseUI(isPaused) {
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    if (isPaused) {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
    } else {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
    }
}

function setVolume(value) {
    const video = document.getElementById('video');
    video.volume = value;
    if(value > 0) {
        video.muted = false;
    } else {
        video.muted = true;
    }
}

function toggleFullscreen() {
    const container = document.getElementById('videoContainer');
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
        if (container.requestFullscreen) container.requestFullscreen();
        else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
        else if (container.msRequestFullscreen) container.msRequestFullscreen();
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
    }
}

/* LIVE SEARCH ENGINE */
function searchChannels() {
    const input = document.getElementById('search').value.toLowerCase();
    const cards = document.querySelectorAll('.channel');

    channels.forEach((ch, index) => {
        if (cards[index]) {
            if (ch.name.toLowerCase().includes(input)) {
                cards[index].style.display = 'flex';
            } else {
                cards[index].style.display = 'none';
            }
        }
    });
}

/* CONTROLS OVERLAY & GLOBAL CLICK INTERACTION */
const controls = document.querySelector('.custom-controls');
const syncBtn = document.getElementById('syncLiveBtn');
let hideTimeout = null;

function startHideTimer() {
    if (hideTimeout) clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
        if (controls) {
            controls.style.opacity = '0';
            if (syncBtn) syncBtn.style.opacity = '0';
            document.getElementById('qualityMenu').classList.add('hidden'); 
        }
    }, 4000);
}

if (controls) {
    startHideTimer();
    
    document.getElementById('videoContainer').addEventListener('click', (e) => {
        // সিঙ্ক বাটন বা সেটিংস মেনুতে ক্লিক করলে প্লে/পজ ইগনোর করা হবে
        if (e.target.closest('#syncLiveBtn') || e.target.closest('#qualityMenu') || e.target.closest('.select-container')) {
            startHideTimer();
            return;
        }

        if (e.target.closest('.custom-controls') || e.target.closest('.ctrl-btn') || e.target.closest('#volumeSlider')) {
            startHideTimer();
            return;
        }
        
        togglePlay();
        
        if (controls.style.opacity === '0') {
            controls.style.opacity = '1';
            if (syncBtn) syncBtn.style.opacity = '1';
            startHideTimer();
        } else {
            controls.style.opacity = '0';
            if (syncBtn) syncBtn.style.opacity = '0';
            document.getElementById('qualityMenu').classList.add('hidden');
        }
    });
    
    document.getElementById('videoContainer').addEventListener('mousemove', () => {
        controls.style.opacity = '1';
        if (syncBtn) syncBtn.style.opacity = '1';
        startHideTimer();
    });
}

document.addEventListener('click', function() {
    document.getElementById('qualityMenu').classList.add('hidden');
});


/* ==========================================================
   🛡️ CLIENT-SIDE BASIC ANTI-INSPECT PROTECTION SYSTEM 
   ========================================================== */

document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

document.addEventListener('keydown', function(e) {
    if (e.keyCode === 123) {
        e.preventDefault();
        return false;
    }
    if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.key === 'I' || e.key === 'i')) {
        e.preventDefault();
        return false;
    }
    if (e.ctrlKey && e.shiftKey && (e.keyCode === 74 || e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
        return false;
    }
    if (e.ctrlKey && (e.keyCode === 85 || e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        return false;
    }
});