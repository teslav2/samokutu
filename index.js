// DevTools / F12 Security & Right-Click Disabling
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
    if (e.key === 'F12') {
        e.preventDefault();
        return false;
    }
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        return false;
    }
    if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        return false;
    }
    if (e.ctrlKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        return false;
    }
});

/**
 * Var mısın Yok musun? - Ceza Sürümü
 * Oyun Mantığı ve Ses Efektleri
 */

// FALLBACK DARES (CORS hatası veya dosya eksikliği durumunda yüklenecek varsayılan cezalar)
const DEFAULT_DARES = [
    "10 saniye tek ayak üstünde dur",
    "Arkadaşına güzel bir mesaj at",
    "5 şınav çek",
    "Hızlıca 3 kere tekerleme söyle",
    "En sevdiğin şarkıdan bir mısra söyle",
    "Kendi etrafında 5 kere dön",
    "Komik bir yüz ifadesi yap",
    "30 saniye boyunca hiç göz kırpma",
    "Odadaki bir eşyayı taklit et",
    "Bir dakika boyunca robot gibi konuş",
    "10 saniye boyunca kahkaha at",
    "Kediler gibi miyavla",
    "Bir bardak dolusu soğuk su iç",
    "Çoraplarını ellerine giy",
    "Bir dakika boyunca squat yap",
    "Alnına komik bir kelime yazdır",
    "En son attığın mesajı yüksek sesle oku",
    "Gözleri kapalı bir nesneyi tahmin et",
    "Gözlerini bağlayıp odada tur at",
    "Limon dilimi ye (yüzünü ekşitmeden)",
    "Rehberinden rastgele birini ara ve şarkı söyle",
    "20 şınav çek ve 20 squat yap",
    "Bir dakika boyunca kaşıkla yumurta taşı",
    "Bir bardak tuzlu su iç (küçük bir yudum)"
];

// SOUND MANAGER (Web Audio API)
class SoundManager {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.phoneRingInterval = null;
        this.phoneRingTimeout = null;
        this.ringOscillators = [];
        this.musicInterval = null;
        this.currentVoiceover = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        const btn = document.getElementById('gta-sound-btn');
        if (btn) {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = this.isMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
            }
            if (this.isMuted) {
                btn.classList.remove('active');
            } else {
                btn.classList.add('active');
            }
        }
        if (this.isMuted) {
            this.stopPhoneRing();
            this.stopAllMusic();
        } else {
            this.toggleMusic(true);
        }
        return this.isMuted;
    }

    playTone(freq, type, duration, delay = 0, volume = 0.1, isMusic = false) {
        if (this.isMuted) return;
        if (!isMusic && localStorage.getItem('gta_sfx') === 'false') return;
        if (isMusic && localStorage.getItem('gta_music') === 'false') return;
        
        this.init();
        
        const sfxVol = parseInt(localStorage.getItem('gta_sfx_volume') || '10') / 100;
        const finalVol = volume * sfxVol;
        
        setTimeout(() => {
            try {
                const osc = this.ctx.createOscillator();
                const gainNode = this.ctx.createGain();
                
                osc.type = type;
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                
                gainNode.gain.setValueAtTime(finalVol, this.ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
                
                osc.connect(gainNode);
                gainNode.connect(this.ctx.destination);
                
                osc.start();
                osc.stop(this.ctx.currentTime + duration);
            } catch (e) {
                console.error("Ses oynatılamadı:", e);
            }
        }, delay * 1000);
    }

    getMusicVolume() {
        if (this.isMuted || localStorage.getItem('gta_music') === 'false') return 0;
        return parseInt(localStorage.getItem('gta_music_volume') || '5') / 100;
    }

    fadeIn(audio, targetVolume, duration = 1000) {
        if (!audio) return;
        audio.volume = 0;
        if (audio.paused) {
            audio.play().catch(() => {});
        }
        
        let start = null;
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = (timestamp - start) / duration;
            if (progress < 1) {
                audio.volume = targetVolume * progress;
                requestAnimationFrame(animate);
            } else {
                audio.volume = targetVolume;
            }
        };
        requestAnimationFrame(animate);
    }

    fadeOut(audio, duration = 1000, callback = null) {
        if (!audio || audio.paused) {
            if (callback) callback();
            return;
        }
        const startVol = audio.volume;
        let start = null;
        
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = (timestamp - start) / duration;
            if (progress < 1) {
                audio.volume = startVol * (1 - progress);
                requestAnimationFrame(animate);
            } else {
                audio.volume = 0;
                audio.pause();
                if (callback) callback();
            }
        };
        requestAnimationFrame(animate);
    }

    startBackgroundMusic(fade = false) {
        const vol = this.getMusicVolume();
        if (vol === 0) return;
        this.init();
        const audio = document.getElementById('menu-music-audio');
        const gameAudio = document.getElementById('game-music-audio');
        const callAudio = document.getElementById('call-music-audio');
        
        if (gameAudio) { gameAudio.pause(); gameAudio.volume = 0; }
        if (callAudio) { callAudio.pause(); callAudio.volume = 0; }
        
        if (audio) {
            audio.currentTime = 0;
            if (fade) {
                this.fadeIn(audio, vol, 1000);
            } else {
                audio.volume = vol;
                audio.play().catch(() => {});
            }
        }
    }

    stopBackgroundMusic(fade = false) {
        const audio = document.getElementById('menu-music-audio');
        if (audio) {
            if (fade) {
                this.fadeOut(audio, 1000);
            } else {
                audio.pause();
                audio.volume = 0;
            }
        }
    }

    startGameMusic(fade = false) {
        const vol = this.getMusicVolume();
        if (vol === 0) return;
        this.init();
        const audio = document.getElementById('game-music-audio');
        const menuAudio = document.getElementById('menu-music-audio');
        const callAudio = document.getElementById('call-music-audio');
        
        if (menuAudio) { menuAudio.pause(); menuAudio.volume = 0; }
        if (callAudio) { callAudio.pause(); callAudio.volume = 0; }
        
        if (audio) {
            audio.currentTime = 0;
            if (fade) {
                this.fadeIn(audio, vol, 1000);
            } else {
                audio.volume = vol;
                audio.play().catch(() => {});
            }
        }
    }

    stopGameMusic(fade = false) {
        const audio = document.getElementById('game-music-audio');
        if (audio) {
            if (fade) {
                this.fadeOut(audio, 1000);
            } else {
                audio.pause();
                audio.volume = 0;
            }
        }
    }

    startCallMusic(fade = true) {
        const vol = this.getMusicVolume();
        if (vol === 0) return;
        this.init();

        const audio = document.getElementById('call-music-audio');
        if (!audio) return;

        const gameAudio = document.getElementById('game-music-audio');
        const menuAudio = document.getElementById('menu-music-audio');

        if (menuAudio && !menuAudio.paused) {
            menuAudio.pause();
            menuAudio.volume = 0;
        }
        if (gameAudio && !gameAudio.paused) {
            this.fadeOut(gameAudio, 600);
        }

        audio.loop = true;
        audio.currentTime = 0;

        const tryPlay = () => {
            if (fade) {
                this.fadeIn(audio, vol, 1000);
            } else {
                audio.volume = vol;
                audio.play().catch(() => {
                    this.init();
                    if (this.ctx && this.ctx.state === 'suspended') {
                        this.ctx.resume().then(() => audio.play().catch(() => {}));
                    } else {
                        audio.play().catch(() => {});
                    }
                });
            }
        };

        tryPlay();
    }

    stopCallMusic() {
        const audio = document.getElementById('call-music-audio');
        if (audio) {
            audio.pause();
            audio.volume = 0;
        }
        this.startGameMusic(false); // Resume game music instantly without fade
    }

    stopAllMusic() {
        const menu = document.getElementById('menu-music-audio');
        const game = document.getElementById('game-music-audio');
        const call = document.getElementById('call-music-audio');
        if (menu) { menu.pause(); menu.volume = 0; }
        if (game) { game.pause(); game.volume = 0; }
        if (call) { call.pause(); call.volume = 0; }
    }

    duckMusic() {
        const gameAudio = document.getElementById('game-music-audio');
        const callAudio = document.getElementById('call-music-audio');
        const menuAudio = document.getElementById('menu-music-audio');
        const targetVol = this.getMusicVolume() * 0.15;
        if (gameAudio && !gameAudio.paused) gameAudio.volume = targetVol;
        if (callAudio && !callAudio.paused) callAudio.volume = targetVol;
        if (menuAudio && !menuAudio.paused) menuAudio.volume = targetVol;
    }

    unduckMusic() {
        const gameAudio = document.getElementById('game-music-audio');
        const callAudio = document.getElementById('call-music-audio');
        const menuAudio = document.getElementById('menu-music-audio');
        const vol = this.getMusicVolume();
        if (gameAudio && !gameAudio.paused) gameAudio.volume = vol;
        if (callAudio && !callAudio.paused) callAudio.volume = vol;
        if (menuAudio && !menuAudio.paused) menuAudio.volume = vol;
    }

    toggleMusic(enabled) {
        if (!enabled) {
            this.stopAllMusic();
        } else {
            const gameScreen = document.getElementById('game-screen');
            if (gameScreen && !gameScreen.classList.contains('hidden')) {
                const bankerModal = document.getElementById('banker-modal');
                if (bankerModal && bankerModal.classList.contains('active')) {
                    this.startCallMusic();
                } else {
                    this.startGameMusic(false);
                }
            } else {
                this.startBackgroundMusic(false);
            }
        }
    }

    updateMusicVolume(volumePercent) {
        const vol = volumePercent / 100;
        const menu = document.getElementById('menu-music-audio');
        const game = document.getElementById('game-music-audio');
        const call = document.getElementById('call-music-audio');
        if (menu && !menu.paused) menu.volume = vol;
        if (game && !game.paused) game.volume = vol;
        if (call && !call.paused) call.volume = vol;
    }

    playClick() {
        this.playTone(800, 'sine', 0.08, 0, 0.05);
    }

    playOpenBox(isHeavy) {
        if (isHeavy) {
            this.playTone(180, 'sawtooth', 1.0, 0, 0.15);
            this.playTone(120, 'sawtooth', 1.2, 0.1, 0.15);
        } else {
            this.playTone(440, 'sine', 0.2, 0, 0.1);
            this.playTone(554, 'sine', 0.25, 0.1, 0.1);
            this.playTone(659, 'sine', 0.3, 0.2, 0.15);
            this.playTone(880, 'sine', 0.4, 0.3, 0.2);
        }
    }

    playPhoneRing(onComplete) {
        if (this.isMuted) {
            if (onComplete) setTimeout(onComplete, 50);
            return;
        }
        if (localStorage.getItem('gta_sfx') === 'false') {
            if (onComplete) setTimeout(onComplete, 50);
            return;
        }
        this.init();
        this.stopPhoneRing();

        const sfxVol = parseInt(localStorage.getItem('gta_sfx_volume') || '10') / 100;
        const fast = localStorage.getItem('gta_fast_animations') === 'true';
        const totalBursts = fast ? 2 : 4;
        let burstCount = 0;

        const playRingBurst = () => {
            try {
                const t = this.ctx.currentTime;
                const osc1 = this.ctx.createOscillator();
                const osc2 = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc1.type = 'sine';
                osc2.type = 'sine';
                osc1.frequency.setValueAtTime(425, t);
                osc2.frequency.setValueAtTime(475, t);

                // Klasik "dılı dılı" — iki kısa çift zil
                gain.gain.setValueAtTime(0, t);
                const pulses = [
                    [0,    0.20],
                    [0.28, 0.20],
                    [0.62, 0.20],
                    [0.90, 0.20]
                ];
                pulses.forEach(([start, dur]) => {
                    gain.gain.linearRampToValueAtTime(0.16 * sfxVol, t + start + 0.02);
                    gain.gain.linearRampToValueAtTime(0, t + start + dur);
                });

                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(this.ctx.destination);

                osc1.start(t);
                osc2.start(t);
                osc1.stop(t + 1.25);
                osc2.stop(t + 1.25);

                this.ringOscillators.push(osc1, osc2);
            } catch (e) {
                console.error("Telefon sesi çalınamadı:", e);
            }

            burstCount++;
            if (burstCount < totalBursts) {
                this.phoneRingTimeout = setTimeout(playRingBurst, fast ? 950 : 1500);
            } else {
                this.phoneRingTimeout = setTimeout(() => {
                    this.stopPhoneRing();
                    if (onComplete) onComplete();
                }, fast ? 700 : 1200);
            }
        };

        playRingBurst();
    }

    stopPhoneRing() {
        if (this.phoneRingTimeout) {
            clearTimeout(this.phoneRingTimeout);
            this.phoneRingTimeout = null;
        }
        if (this.phoneRingInterval) {
            clearInterval(this.phoneRingInterval);
            this.phoneRingInterval = null;
        }
        this.ringOscillators.forEach(osc => {
            try { osc.stop(); } catch(e){}
        });
        this.ringOscillators = [];
    }

    playWinFanfare() {
        const notes = [261, 329, 392, 523, 659, 783, 1046];
        notes.forEach((freq, idx) => {
            this.playTone(freq, 'triangle', 0.4, idx * 0.1, 0.12);
        });
    }

    playLoseFanfare() {
        const notes = [311, 293, 277, 233];
        notes.forEach((freq, idx) => {
            this.playTone(freq, 'sawtooth', 0.6, idx * 0.25, 0.1);
        });
    }

    playVoiceover(boxId, dialogueIndex, text) {
        if (this.isMuted) return;
        this.init();
        
        try {
            this.stopVoiceover();
            
            const voiceVol = parseInt(localStorage.getItem('gta_sfx_volume') || '10') / 100;
            if (voiceVol <= 0) return;

            const paths = [
                `voice/box_${boxId}_${dialogueIndex + 1}.mp3`,
                `voice/box_${boxId}_${dialogueIndex + 1}.MP3`,
                `voice/box_${boxId}_${dialogueIndex + 1}.m4a`,
                `voice/box_${boxId}_${dialogueIndex + 1}.M4A`,
                `audio/box_${boxId}_${dialogueIndex + 1}.mp3`,
                `audio/box_${boxId}_${dialogueIndex + 1}.MP3`,
                `audio/box_${boxId}_${dialogueIndex + 1}.m4a`,
                `audio/box_${boxId}_${dialogueIndex + 1}.M4A`
            ];

            const tryPlay = (index) => {
                if (index >= paths.length) {
                    console.log(`No audio file found for Box ${boxId} Dialogue ${dialogueIndex + 1}`);
                    return;
                }
                const path = paths[index];
                const audio = new Audio(path);
                audio.volume = voiceVol;
                audio.play().then(() => {
                    this.currentVoiceover = audio;
                }).catch(e => {
                    tryPlay(index + 1);
                });
            };
            
            tryPlay(0);
        } catch (e) {
            console.error("Failed to play voiceover:", e);
        }
    }

    getVoiceVolume() {
        if (this.isMuted || localStorage.getItem('gta_voiceover_enabled') === 'false') return 0;
        const vol = parseInt(localStorage.getItem('gta_voiceover_volume') || '80', 10) / 100;
        return Math.min(1.0, vol);
    }

    getBankerCallVolume() {
        if (this.isMuted || localStorage.getItem('gta_sfx') === 'false') return 0;
        const sfx = parseInt(localStorage.getItem('gta_sfx_volume') || '80', 10) / 100;
        return Math.min(1, sfx * 1.45);
    }

    playBankerCallingSound(onComplete) {
        if (this.isMuted) {
            if (onComplete) onComplete();
            return;
        }
        if (localStorage.getItem('gta_sfx') === 'false') {
            if (onComplete) onComplete();
            return;
        }

        this.init();
        this.stopVoiceover();

        this._bankerVoiceGen = (this._bankerVoiceGen || 0) + 1;
        const gen = this._bankerVoiceGen;

        const finish = () => {
            if (gen !== this._bankerVoiceGen) return;
            if (onComplete) onComplete();
        };

        const randomIndex = Math.floor(Math.random() * 6) + 1;
        const paths = [
            `audio/phone_call_${randomIndex}.mp3`,
            `audio/phone_call_${randomIndex}.wav`,
            `audio/phone_call_${randomIndex}.m4a`,
            `audio/phone_call_${randomIndex}.ogg`,
            `audio/banker_call_${randomIndex}.mp3`,
            `audio/banker_call_${randomIndex}.wav`,
            `audio/banker_call_${randomIndex}.m4a`,
            `voice/phone_call_${randomIndex}.mp3`,
            `voice/banker_call_${randomIndex}.mp3`,
            `voice/banker_call_${randomIndex}.m4a`
        ];

        const phrasesTr = [
            `Merhaba, ben ${bankerName}. Kalan cezalara baktım ve sana bir teklifim var.`,
            `${bankerName} hattında. Teklifimi dinlemeye hazır mısın?`,
            `Evet, ${bankerName} konuşuyor. Sana cömert bir teklif sunacağım.`,
            `Burada ${bankerName}. Masadaki cezalara göre sana bir teklif hazırladım.`,
            `${bankerName} arıyor. Bu teklifi kaçırma, iyi düşün.`,
            `Ben ${bankerName}. Kalan kutulara göre sana şöyle bir teklifim var.`
        ];

        const phrasesEn = [
            `Hello, this is ${bankerName}. I've looked at the remaining dares and I have an offer for you.`,
            `${bankerName} here. Are you ready to hear my offer?`,
            `Yes, ${bankerName} speaking. I have a generous offer for you.`,
            `This is ${bankerName}. Based on the dares left, I've prepared an offer.`,
            `${bankerName} calling. Don't miss this offer, think carefully.`,
            `It's ${bankerName}. Given the boxes left, here's my offer for you.`
        ];

        const isTr = (localStorage.getItem('gta_lang') || 'tr') === 'tr';
        const phraseText = isTr ? phrasesTr[randomIndex - 1] : phrasesEn[randomIndex - 1];
        const vol = this.getBankerCallVolume();
        if (vol <= 0) {
            finish();
            return;
        }

        const playTTS = () => {
            if (gen !== this._bankerVoiceGen) return;
            if (typeof speechSynthesis === 'undefined') {
                finish();
                return;
            }
            try {
                speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(phraseText);
                utterance.lang = isTr ? 'tr-TR' : 'en-US';
                utterance.volume = vol;
                utterance.rate = isTr ? 0.95 : 1.0;
                utterance.onend = () => {
                    this._ttsActive = false;
                    finish();
                };
                utterance.onerror = () => {
                    this._ttsActive = false;
                    finish();
                };
                this._ttsActive = true;
                setTimeout(() => {
                    if (gen !== this._bankerVoiceGen) return;
                    speechSynthesis.speak(utterance);
                }, 80);
            } catch (e) {
                console.error("TTS play failed:", e);
                finish();
            }
        };

        const tryNextPath = (index) => {
            if (gen !== this._bankerVoiceGen) return;
            if (index >= paths.length) {
                playTTS();
                return;
            }

            const audio = new Audio();
            let settled = false;

            const fail = () => {
                if (settled) return;
                settled = true;
                audio.pause();
                audio.src = '';
                tryNextPath(index + 1);
            };

            audio.volume = vol;
            audio.onended = () => {
                if (gen !== this._bankerVoiceGen) return;
                settled = true;
                this.currentVoiceover = null;
                finish();
            };
            audio.onerror = fail;
            audio.src = paths[index];
            audio.play().then(() => {
                if (gen !== this._bankerVoiceGen) {
                    audio.pause();
                    return;
                }
                settled = true;
                this.currentVoiceover = audio;
            }).catch(fail);
        };

        tryNextPath(0);
    }

    playAhmetDayiJokerSound(onComplete) {
        if (this.isMuted || localStorage.getItem('gta_sfx') === 'false') {
            if (onComplete) setTimeout(onComplete, 600);
            return;
        }

        this.init();
        this.stopVoiceover();
        this.duckMusic(); // Duck background music

        this._ahmetVoiceGen = (this._ahmetVoiceGen || 0) + 1;
        const gen = this._ahmetVoiceGen;

        const finish = () => {
            if (gen !== this._ahmetVoiceGen) return;
            this.unduckMusic(); // Restore music volume
            if (onComplete) onComplete();
        };

        const randomIndex = Math.floor(Math.random() * 5) + 1;
        const paths = [
            `audio/ahmet_dayi_${randomIndex}.mp3`,
            `audio/ahmet_dayi_${randomIndex}.wav`,
            `audio/ahmet_dayi_${randomIndex}.m4a`,
            `audio/ahmet_dayi_${randomIndex}.ogg`,
            `voice/ahmet_dayi_${randomIndex}.mp3`,
            `voice/ahmet_dayi_${randomIndex}.wav`,
            `voice/ahmet_dayi_${randomIndex}.m4a`
        ];

        const vol = this.getBankerCallVolume();
        if (vol <= 0) {
            finish();
            return;
        }

        const tryNextPath = (index) => {
            if (gen !== this._ahmetVoiceGen) return;
            if (index >= paths.length) {
                console.warn(`Ahmet Dayı ses dosyası bulunamadı: ahmet_dayi_${randomIndex}`);
                finish();
                return;
            }

            const audio = new Audio();
            let settled = false;

            const fail = () => {
                if (settled) return;
                settled = true;
                audio.pause();
                audio.src = '';
                tryNextPath(index + 1);
            };

            // Set volume directly to a boosted level to prevent Web Audio CORS silence
            audio.volume = Math.min(1.0, vol * 2.0);
            audio.onended = () => {
                if (gen !== this._ahmetVoiceGen) return;
                settled = true;
                this.currentVoiceover = null;
                finish();
            };
            audio.onerror = fail;
            audio.src = paths[index];
            audio.play().then(() => {
                if (gen !== this._ahmetVoiceGen) {
                    audio.pause();
                    return;
                }
                settled = true;
                this.currentVoiceover = audio;
            }).catch(fail);
        };

        tryNextPath(0);
    }

    stopVoiceover() {
        this._bankerVoiceGen = (this._bankerVoiceGen || 0) + 1;
        this._ahmetVoiceGen = (this._ahmetVoiceGen || 0) + 1;
        this.unduckMusic(); // Restore music volume if ducked
        if (this.currentVoiceover) {
            try {
                this.currentVoiceover.pause();
                this.currentVoiceover.src = '';
            } catch(e){}
            this.currentVoiceover = null;
        }
        if (typeof speechSynthesis !== 'undefined') {
            try { speechSynthesis.cancel(); } catch(e){}
        }
        this._ttsActive = false;
    }
}

const soundManager = new SoundManager();

// GAME VARIABLES
let musicStarted = false;
let daresList = [];
let gameBoxes = [];
let playerBox = null;
let currentRound = 0;
let boxesToOpenInRound = 0;
let roundConfig = [4, 4, 3, 3, 3, 2, 2, 1, 1]; // 23 total opens, leaves 1 box
let openedBoxesCount = 0;
let acceptedOffer = null;
let boxVoiceMapping = {};
let eliminatedRanks = new Set();
let gameLog = [];
let isRandomSelecting = false;
let isFinalChoice = false;

let jokerState = {
    ahmetUsed: false,
    bonkorUsed: false,
    bonkorActive: false,
    halkUsed: false,
    sigortaUsed: false,
    insuranceActive: false
};

let bankerOfferHistory = [];
let currentPoll = null;
let halkJokerActive = false;

function initBoxVoiceMapping() {
    boxVoiceMapping = {};
    for (let i = 1; i <= 24; i++) {
        boxVoiceMapping[i] = i;
    }
}

function shuffleBoxVoiceMapping() {
    initBoxVoiceMapping();
}

// ===== BOX OWNER NAMES =====
const DEFAULT_BOX_NAMES = [
    "aycinkavak", "Lloyd",
    "DepresifTosbaa", "llleandreas", "dream_33", "PANDA_ADAM",
    "Klaxxoun", "Beru", "Mordex", "SAMO", "Lunyxia", "Sweet0",
    "Gavatnur", "Akon", "Septy", "Akansa", "Cemoshx", "Slaptula",
    "TeslaV2", "Melibon", "SamDadlisi", "KRWest", "Archie_Wan", "MotherOfPrincess",
    "UcanTurk", "Nisnur", "KucukCemo", "JohnBishop", "Emeriks", "Balkabagi"
];

let loadedRawBoxOwners = [...DEFAULT_BOX_NAMES];
let boxOwnersList = [...DEFAULT_BOX_NAMES];

async function loadBoxOwners() {
    try {
        const response = await fetch('kutu_sahipleri.txt');
        if (!response.ok) throw new Error("Dosya yüklenemedi");
        const text = await response.text();
        const names = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
            
        if (names.length >= 24) {
            loadedRawBoxOwners = names;
        } else {
            loadedRawBoxOwners = [...names];
            let idx = 0;
            while (loadedRawBoxOwners.length < 24) {
                const fallback = DEFAULT_BOX_NAMES[idx % DEFAULT_BOX_NAMES.length];
                if (!loadedRawBoxOwners.includes(fallback)) {
                    loadedRawBoxOwners.push(fallback);
                }
                idx++;
            }
        }
        boxOwnersList = [...loadedRawBoxOwners].slice(0, 24);
    } catch (e) {
        console.warn("CORS kısıtlaması veya dosya eksikliği nedeniyle kutu_sahipleri.txt yüklenemedi. Varsayılan liste yükleniyor.", e);
        loadedRawBoxOwners = [...DEFAULT_BOX_NAMES];
        boxOwnersList = [...DEFAULT_BOX_NAMES];
    }
}

function getBoxNames() {
    return boxOwnersList;
}

function getPossessiveName(name) {
    if (!name) return '';
    const lastChar = name.slice(-1).toLowerCase();
    const vowels = ['a', 'e', 'ı', 'i', 'o', 'ö', 'u', 'ü'];
    const suffix = vowels.includes(lastChar) ? "'nın" : "'ın";
    return name + suffix;
}

// DOM ELEMENTS
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const startBtn = document.getElementById('start-btn');
const settingsBtn = document.getElementById('settings-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const statusMessage = document.getElementById('status-message');
const roundIndicator = document.getElementById('round-indicator');
const leftRewardsList = document.getElementById('left-rewards-list');
const rightRewardsList = document.getElementById('right-rewards-list');
const boxesGrid = document.getElementById('boxes-grid');
const playerBoxContainer = document.getElementById('player-box-container');
const playerBoxEl = document.getElementById('player-box');

// Modal Elements
const settingsModal = document.getElementById('settings-modal');
const bankerModal = document.getElementById('banker-modal');
const resultModal = document.getElementById('result-modal');
const daresListContainer = document.getElementById('dares-list-container');
const bankerOfferText = document.getElementById('banker-offer-text');
const dealBtn = document.getElementById('deal-btn');
const noDealBtn = document.getElementById('no-deal-btn');
const resultTitle = document.getElementById('result-title');
const resultSourceText = document.getElementById('result-source-text');
const finalDareText = document.getElementById('final-dare-text');
const restartBtn = document.getElementById('restart-btn');
const resultMenuBtn = document.getElementById('result-menu-btn');

// CONFIGURATION & TRANSLATIONS
const TRANSLATIONS = {
    tr: {
        play: "Oyna",
        settings: "Ayarlar",
        backToMenu: "Menüye Dön",
        chooseYourBox: "Kendi kutunu seç!",
        chooseYourBoxDesc: "Kendi kutunu seç! Bu kutu senin final kutun olacak.",
        roundIndicator: "Hazırlık",
        leftTitle: "Hafif Cezalar",
        rightTitle: "Ağır Cezalar",
        playerBoxLabel: "SENİN KUTUN",
        bankerTitle: "Hamdi Bey Telefonda!",
        bankerIntro: "Kalan cezaları analiz etti ve sana bir teklifi var...",
        offerLabel: "TEKLİF EDİLEN CEZA:",
        dealBtn: "VARIM (Kabul Et)",
        noDealBtn: "YOKUM (Reddet)",
        resultTitle: "Oyun Bitti!",
        resultSourceText: "Sonucunda kazandığın ceza:",
        restartBtn: "Tekrar Dene",
        resultMenuBtn: "Ana Menü",
        confirmMenu: "Oyunu sonlandırıp menüye dönmek istediğinizden emin misiniz? İlerlemeniz silinecek.",
        boxSelection: "KUTU SEÇİMİ",
        roundTitle: "{n}. TUR",
        boxSelectedMsg: "Kutunu seçtin! Şimdi kalan kutulardan {count} tane açmalısın.",
        boxesLeftMsg: "Bu turda açman gereken {count} kutu kaldı.",
        boxOpenedMsg: "Kutu {id} Açıldı: \"{dare}\" elendi!",
        bankerCallingMsg: "Hamdi Bey aranıyor... Telefon çalıyor!",
        bankerOfferIndicator: "TEKLİF",
        declineOfferMsg: "Teklifi reddettin! Bu turda {count} kutu açmalısın.",
        finalIndicator: "FİNAL",
        lastTwoBoxesMsg: "Son iki kutu kaldı â kaderini kabul et!",
        swapConfirm: "Son iki kutuya ulaştın! Kutun: {playerBoxId} â Masadaki son kutu: {lastBoxId}. Değiştirmek ister misin?",
        swapSuccess: "Kutunu Kutu {lastBoxId} ile değiştirdin!",
        dealAcceptedTitle: "Teklifi Kabul Ettin!",
        dealAcceptedDesc: "Hamdi Bey'in teklifini kabul ederek şu cezayı üstlendin:",
        boxOpenedTitle: "Kutunu Açtın!",
        boxOpenedDesc: "Kutun olan Kutu {playerBoxId} açıldı ve içinden çıkan ceza:",
        
        // Streamer
        streamerChooseBox: "{name} kendi kutusunu seçiyor...",
        streamerOpenBox: "{name} kutu açıyor (Kalan: {count})...",

        bankerNameTitle: "Bankacı İsmini Gir",
        bankerNamePlaceholder: "Bankacı Adı...",
        nameStartBtn: "Oyuna Başla",
        nameBackBtn: "Geri Dön",
        gameLogBtn: "Log",
        gameLogTitle: "Oyun Günlüğü",
        gameLogEmpty: "Henüz kayıt yok.",
        gameJokerBtn: "Joker",
        jokerSelectTitle: "Joker Seç",
        jokerSelectDesc: "Her joker oyunda bir kez kullanılabilir.",
        jokerAhmetName: "Ahmet Dayı'ya Danış",
        jokerAhmetDesc: "Ahmet Dayı rastgele bir kutu seçer ve senin yerine açar.",
        jokerBonkorName: "Bonkör Bankacı",
        jokerBonkorDesc: "Bir sonraki bankacı teklifini güzelleştirir.",
        jokerHalkName: "Halkın Sesi",
        jokerHalkDesc: "Seyircilerin en çok tavsiye ettiği kutuları gösterir.",
        jokerSigortaName: "Kutu Sigortası",
        jokerSigortaDesc: "Bir sonraki açacağın kutudan çıkacak Ağır Cezayı iptal eder.",
        jokerAvailable: "Kullanılabilir",
        jokerUsed: "Kullanıldı",
        jokerActiveBonkor: "Teklif bekliyor",
        jokerActiveSigorta: "Sigorta devrede",
        jokerAhmetConsulting: "Ahmet Dayı'ya danışılıyor...",
        jokerAhmetPicked: "Ahmet Dayı Kutu {id}'ü seçti!",
        jokerBonkorActivated: "Bonkör Bankacı devrede! Bir sonraki teklif güzelleştirilecek.",
        jokerHalkVoting: "Seyircilere danışılıyor...",
        jokerHalkNoBoxes: "Tavsiye alacak kutu kalmadı.",
        jokerSigortaActivated: "Kutu Sigortası aktif! Bir sonraki kutudaki Ağır Ceza engellenecek.",
        jokerSigortaAlreadyActive: "Sigorta zaten aktif!",
        jokerAhmetNoBoxes: "Ahmet Dayı şu an yardım edemez — önce bu turda kutu açmalısın.",
        jokerAllUsed: "Tüm jokerler kullanıldı."
    },
    en: {
        play: "Play",
        settings: "Settings",
        backToMenu: "Back to Menu",
        chooseYourBox: "Choose your box!",
        chooseYourBoxDesc: "Choose your box! This will be your final box.",
        roundIndicator: "Prep",
        leftTitle: "Light Dares",
        rightTitle: "Heavy Dares",
        playerBoxLabel: "YOUR BOX",
        bankerTitle: "Banker is Calling!",
        bankerIntro: "He analyzed the remaining dares and has an offer...",
        offerLabel: "OFFERED DARE:",
        dealBtn: "DEAL (Accept)",
        noDealBtn: "NO DEAL (Reject)",
        resultTitle: "Game Over!",
        resultSourceText: "The dare you won:",
        restartBtn: "Try Again",
        resultMenuBtn: "Main Menu",
        confirmMenu: "Are you sure you want to end the game and return to menu? Your progress will be lost.",
        boxSelection: "BOX SELECTION",
        roundTitle: "ROUND {n}",
        boxSelectedMsg: "You selected your box! Now you must open {count} of the remaining boxes.",
        boxesLeftMsg: "You have {count} boxes left to open in this round.",
        boxOpenedMsg: "Box {id} Opened: \"{dare}\" eliminated!",
        bankerCallingMsg: "Calling the Banker... Phone is ringing!",
        bankerOfferIndicator: "OFFER",
        declineOfferMsg: "You rejected the offer! Open {count} boxes in this round.",
        finalIndicator: "FINAL",
        lastTwoBoxesMsg: "Only two boxes left â face your fate!",
        swapConfirm: "Last two boxes! Your box: {playerBoxId} â Last box: {lastBoxId}. Swap?",
        swapSuccess: "Swapped your box with Box {lastBoxId}!",
        dealAcceptedTitle: "You Accepted the Offer!",
        dealAcceptedDesc: "You accepted the Banker's offer and took this dare:",
        boxOpenedTitle: "You Opened Your Box!",
        boxOpenedDesc: "Your Box {playerBoxId} is opened and its dare is:",
        
        // Streamer
        streamerChooseBox: "{name} is choosing their box...",
        streamerOpenBox: "{name} is opening a box ({count} left)...",

        bankerNameTitle: "Enter Banker Name",
        bankerNamePlaceholder: "Banker Name...",
        nameStartBtn: "Start Game",
        nameBackBtn: "Go Back",
        gameLogBtn: "Log",
        gameLogTitle: "Game Log",
        gameLogEmpty: "No entries yet.",
        gameJokerBtn: "Joker",
        jokerSelectTitle: "Choose a Joker",
        jokerSelectDesc: "Each joker can be used once per game.",
        jokerAhmetName: "Consult Ahmet Dayı",
        jokerAhmetDesc: "Ahmet Dayı picks a random box and opens it for you.",
        jokerBonkorName: "Generous Banker",
        jokerBonkorDesc: "Beautifies the next banker offer.",
        jokerHalkName: "Voice of the People",
        jokerHalkDesc: "Shows which boxes are most recommended by the audience.",
        jokerSigortaName: "Box Insurance",
        jokerSigortaDesc: "Cancels a Heavy Punishment if it comes out of the next box you open.",
        jokerAvailable: "Available",
        jokerUsed: "Used",
        jokerActiveBonkor: "Offer pending",
        jokerActiveSigorta: "Insurance active",
        jokerAhmetConsulting: "Consulting Ahmet Dayı...",
        jokerAhmetPicked: "Ahmet Dayı picked Box {id}!",
        jokerBonkorActivated: "Generous Banker is active! The next offer will be improved.",
        jokerHalkVoting: "Asking the audience...",
        jokerHalkNoBoxes: "No boxes left for recommendation.",
        jokerSigortaActivated: "Box Insurance active! Heavy Punishment in the next box will be blocked.",
        jokerSigortaAlreadyActive: "Insurance is already active!",
        jokerAhmetNoBoxes: "Ahmet Dayı can't help now — open boxes in this round first.",
        jokerAllUsed: "All jokers have been used."
    }
};

let currentLang = 'tr';

function t(key, params = {}) {
    const l = TRANSLATIONS[currentLang] || TRANSLATIONS['tr'];
    let text = l[key] || key;
    for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, v);
    }
    if (typeof bankerName !== 'undefined' && bankerName) {
        text = text.replace(/Hamdi Bey/g, bankerName);
    }
    return text;
}

function applyConfig() {
    currentLang = localStorage.getItem('gta_lang') || 'tr';
    const l = TRANSLATIONS[currentLang];
    
    if (startBtn) startBtn.innerText = t('play');
    if (settingsBtn) settingsBtn.innerText = t('settings');
    const gameSettingsBtnTxt = document.getElementById('game-settings-btn-txt');
    if (gameSettingsBtnTxt) gameSettingsBtnTxt.innerText = t('settings');
    const gameLogBtnTxt = document.getElementById('game-log-btn-txt');
    if (gameLogBtnTxt) gameLogBtnTxt.innerText = t('gameLogBtn');
    const gameLogTitle = document.getElementById('game-log-title');
    if (gameLogTitle) gameLogTitle.innerHTML = `<i class="fas fa-list-alt"></i> ${t('gameLogTitle')}`;
    const gameLogEmpty = document.getElementById('game-log-empty');
    if (gameLogEmpty) gameLogEmpty.innerText = t('gameLogEmpty');
    const gameJokerBtnTxt = document.getElementById('game-joker-btn-txt');
    if (gameJokerBtnTxt) gameJokerBtnTxt.innerText = t('gameJokerBtn');
    syncJokerModalTranslations();
    if (backToMenuBtn) backToMenuBtn.innerHTML = `<i class="fas fa-arrow-left"></i> ${t('backToMenu')}`;
    if (statusMessage) statusMessage.innerText = t('chooseYourBox');
    if (roundIndicator) roundIndicator.innerText = t('roundIndicator');
    
    const leftTitleEl = document.querySelector('.left-sidebar .sidebar-title');
    const rightTitleEl = document.querySelector('.right-sidebar .sidebar-title');
    if (leftTitleEl) leftTitleEl.innerText = t('leftTitle');
    if (rightTitleEl) rightTitleEl.innerText = t('rightTitle');
    
    const playerLabelEl = document.querySelector('#player-box-container .label');
    if (playerLabelEl) playerLabelEl.innerText = t('playerBoxLabel');
    
    const bankerModalEl = document.getElementById('banker-modal');
    if (bankerModalEl) {
        bankerModalEl.querySelector('h2').innerText = t('bankerTitle');
        bankerModalEl.querySelector('.banker-intro').innerText = t('bankerIntro');
        bankerModalEl.querySelector('.offer-label').innerText = t('offerLabel');
        document.getElementById('deal-btn').innerHTML = `<i class="fas fa-check"></i> ${t('dealBtn')}`;
        document.getElementById('no-deal-btn').innerHTML = `<i class="fas fa-times"></i> ${t('noDealBtn')}`;
    }
    
    const resultModalEl = document.getElementById('result-modal');
    if (resultModalEl) {
        document.getElementById('result-title').innerText = t('resultTitle');
        document.getElementById('result-source-text').innerText = t('resultSourceText');
        document.getElementById('restart-btn').innerHTML = `<i class="fas fa-redo"></i> ${l.restartBtn}`;
        if (resultMenuBtn) {
            resultMenuBtn.innerHTML = `<i class="fas fa-home"></i> ${l.resultMenuBtn}`;
        }
    }
    
    // Font Size
    const fontSize = localStorage.getItem('gta_font_size') || 'normal';
    document.documentElement.className = '';
    document.documentElement.classList.add(`font-size-${fontSize}`);

    // Theme Accent Color
    const color = settingsConfig.accentColor;
    document.documentElement.style.setProperty('--primary', color);
    let r = 255, g = 215, b = 0;
    if (/^#[0-9A-F]{6}$/i.test(color)) {
        r = parseInt(color.slice(1, 3), 16);
        g = parseInt(color.slice(3, 5), 16);
        b = parseInt(color.slice(5, 7), 16);
    }
    document.documentElement.style.setProperty('--primary-glow', `rgba(${r}, ${g}, ${b}, 0.35)`);

    applyDareSpeedCSSVars();

    const nameTitle = document.getElementById('name-entry-title');
    const bankerInput = document.getElementById('banker-name-input');
    const nameSubmit = document.getElementById('name-submit-btn');
    const nameBack = document.getElementById('name-back-btn');
    if (nameTitle) nameTitle.innerText = t('bankerNameTitle');
    if (bankerInput) bankerInput.placeholder = t('bankerNamePlaceholder');
    if (nameSubmit) nameSubmit.innerText = t('nameStartBtn');
    if (nameBack) nameBack.innerText = t('nameBackBtn');
}

let activeViewer = null;
let manualPlayerName = "IOWF";
let bankerName = localStorage.getItem('gta_banker_name') || "Hamdi Bey";
let pendingBoxCallback = null;
let BOX_QUOTES = {
    1: ["Bu kutunun içinden çorba kokusu geliyor.", "Hissediyorum, bu kutu 500k ceza!", "Aç abi acıma, zaten hayallerim de yıkıldı.", "İçinden Xbox çıkarsa benimdir."],
    2: ["Kutuyu açma, içine çorba döktüm.", "Bunu açarsan rüyana girerim bak.", "İçinde kesin bulaşık yıkama cezası var.", "Bu kutunun aurası çok düşük."],
    3: ["Açarsan ayıp edersin.", "Bunu bana Ahmet abi verdi, dokunma.", "İçindeki ceza asgari ücretten fazla hissediyorum.", "Kutunun içi bomboş, tıpkı cüzdanım gibi."],
    4: ["Açan pişman, açmayan pişman.", "Burada ceza yok, sadece hüzün var.", "Aç da kurtulalım, tansiyonum düştü.", "Büyük hissediyorum derken şaka yapıyordum."],
    5: ["İçinde ne varsa yarı yarıya kırışalım?", "Kutudan sesler geliyor, tıkır tıkır.", "Bu kutunun şarjı bitmiş sanki.", "Bunu açarsan akşam bulaşıkları sen yıkarsın."],
    6: ["Ben aslında yokum, bu kutu da yok.", "Açarsan bankeri arayıp şikayet ederim.", "Bu kutuyu açan son kişi hala şınav çekiyor.", "İçinde kesin patates var."],
    7: ["Şanslı 7 diyorlar ama bence bu 70 şınav.", "Açma kanka, henüz çok gencim.", "Bu kutuyu açarsak yayını kapatırım.", "İçinden çiğ köfte çıkma ihtimali var mı?"],
    8: ["Kutu bana 'açma beni' diye fısıldadı.", "Bence bu kutu Elon Musk'ın gizli projesi.", "İçinde ceza yerine sevgi var.", "Bunu açarsan banker çok fena gülecek."],
    9: ["Bu kutunun içi dert dolu.", "Açma, içinde vergi borcu var!", "İçinde kesinlikle ceza yok, inananlara selam olsun.", "Bunu açarsan çaylar senden."],
    10: ["On numara beş yıldız kutu, dokunma.", "İçinde 10 saat kesintisiz ders çalışma cezası var.", "Bu kutuyu açan cennete gidiyormuş.", "Aç kanka aç, ne olacaksa olsun."],
    11: ["Bu kutunun içi sıcacık, bence çorba var.", "Açarsan 11. Cumhurbaşkanı arar bak.", "İçinde ceza yoksa bana ne vereceksin?", "Bu kutu bana bir yerden tanıdık geliyor."],
    12: ["On iki dev adam gibi kutu.", "Açarsan banker sana fena takacak.", "İçinde 12 dakikalık plank cezası olabilir.", "Bu kutuyu açan son kişi kayboldu."],
    13: ["Uğursuz 13 diyorlar, bence çok haklılar.", "Açma, yoksa bilgisayarına virüs girer.", "Bu kutu adeta bir mayın tarlası.", "İçinde kesinlikle iyi bir şey yok, kaç!"],
    14: ["Bu kutunun aurası 999.", "Açarsan akşama ne yiyoruz?", "İçinde ceza yerine boş laf var.", "Bunu açarsan banker sana çay ısmarlayacak."],
    15: ["On beş şınav çekmek istemiyorsan uzak dur.", "Bu kutunun içi buz gibi, kar yağıyor.", "İçinden lahmacun çıksa ne güzel olurdu.", "Kutuyu açan bankerle akraba çıkıyormuş."],
    16: ["Açarsan 16 megapiksel ceza yersin.", "Bu kutu adeta bir şaheser, bozma.", "İçinde sadece toz var kanka.", "Bunu açarsan banker seni tebrik edecek."],
    17: ["Açma, banker kızar!", "İçinde ne varsa çekiyorum bunu.", "Bu kutuyla barışığım, dokunmayın.", "Kutudan garip kokular geliyor."],
    18: ["Reşit oldu bu kutu, açabilirsin.", "İçinde 18 saatlik uyku cezası olsa keşke.", "Bu kutuyu açan dünyayı kurtarıyor.", "Bence bu kutu boş, kesin bilgi."],
    19: ["Açma, içinde sınav soruları var.", "Bu kutu beni benden alıyor.", "İçinde ceza yerine hüzün var kanka.", "Bunu açarsan banker sana şarkı söyleyecek."],
    20: ["Yirmi yirmi yirmi, bence bu ceza yeridir.", "Açma kanka, içinde borç senedi var.", "Bu kutuyu açan zengin oluyormuş (şaka).", "İçinde sadece umut var."],
    21: ["Bu kutu çok gizemli, bence açma.", "İçinde 21 şınav cezası kokusu alıyorum.", "Açarsan akşama bulaşıklar sende.", "Kutunun içi bomboş, tıpkı geleceğim gibi."],
    22: ["Çift yirmi iki, bence bu kutu temiz.", "Açma kanka, içinde eski sevgilinin mesajı var.", "Bu kutu adeta bir bomba gibi saat gibi tıkır tıkır.", "İçinde sadece sevgi ve barış var."],
    23: ["Uğurlu sayım 23, kesin temiz çıkacak!", "Açarsan banker seni Kick kanalına mod yapar.", "İçinde ceza yoksa çaylar benden.", "Bu kutudan garip sesler geliyor, tırstım."],
    24: ["Son kutu, aç da bitirelim şu işi.", "İçinde 24 saat kesintisiz oyun oynama cezası var.", "Bu kutu adeta bir efsane.", "Bunu açarsan banker sana hediye verecek."]
};

// Load box dialogue lines from external txt file (box_dialogues_extended.txt)
// Overrides the inline defaults above if the file loads successfully
async function loadBoxDialogues() {
  try {
    const response = await fetch('box_dialogues_extended.txt');
    if (!response.ok) {
        console.warn('box_dialogues_extended.txt not found, using inline defaults.');
        return;
    }
    const text = await response.text();
    const lines = text.split(/\r?\n/);
    let currentBox = null;
    const parsed = {};
    lines.forEach(line => {
      const boxMatch = line.match(/^Box\s+(\d+):/i);
      if (boxMatch) {
        currentBox = parseInt(boxMatch[1]);
        parsed[currentBox] = [];
      } else if (currentBox !== null) {
        const trimmed = line.trim();
        if (trimmed.startsWith('-')) {
          let content = trimmed.substring(1).trim();
          if (content.startsWith('"') && content.endsWith('"')) {
            content = content.substring(1, content.length - 1);
          }
          parsed[currentBox].push(content);
        }
      }
    });
    // Only override if we actually parsed something
    if (Object.keys(parsed).length > 0) {
        BOX_QUOTES = parsed;
    }
    console.log('Box dialogues loaded from file:', Object.keys(BOX_QUOTES).length, 'boxes');
  } catch (e) {
    console.warn('Could not fetch box_dialogues_extended.txt, using inline defaults:', e.message);
  }
}

// Load dialogues when the page loads
window.addEventListener('load', loadBoxDialogues);

function setupStreamerCallbacks() {
    const streamerPanel = document.getElementById('streamer-panel');
    const chatMessagesContainer = document.getElementById('chat-messages');
    const chatStatus = document.getElementById('chat-status');
    const chatPlatformLabel = document.getElementById('chat-platform-label');
    const chatPlatformIcon = document.getElementById('chat-platform-icon');

    // Load streamer settings
    streamerMode.loadConfig();

    if (streamerMode.enabled) {
        if (streamerPanel) streamerPanel.classList.remove('hidden');
        const gameLayout = document.querySelector('.game-layout');
        const gameHeader = document.querySelector('.game-header');
        if (gameLayout) gameLayout.classList.add('streamer-active');
        if (gameHeader) gameHeader.classList.add('streamer-active');
        
        // Connect to platform if not already connected
        if (!streamerMode.isConnected) {
            streamerMode.connect();
        } else {
            if (chatStatus) {
                chatStatus.className = 'chat-status online';
                chatStatus.innerHTML = '<span style="color:#53fc18;">● Bağlandı</span>';
            }
            if (chatPlatformLabel) chatPlatformLabel.innerText = streamerMode.platform === 'kick' ? 'KİCK CHAT' : (streamerMode.platform.toUpperCase() + ' CHAT');
            if (chatPlatformIcon) {
                chatPlatformIcon.className = streamerMode.getPlatformIcon(streamerMode.platform);
                chatPlatformIcon.style.color = '#53fc18';
            }
        }
        updateQueueUI();
    } else {
        if (streamerPanel) streamerPanel.classList.add('hidden');
        const gameLayout = document.querySelector('.game-layout');
        const gameHeader = document.querySelector('.game-header');
        if (gameLayout) gameLayout.classList.remove('streamer-active');
        if (gameHeader) gameHeader.classList.remove('streamer-active');
        
        streamerMode.disconnect();
    }

        // Chat Message Callback (Yalnızca oyun komutları, kutu seçimleri ve sistem mesajları işlenir)
    streamerMode.onChatMessage = (msg) => {
        if (!chatMessagesContainer) return;

        const isSystem = !!msg.isSystem;
        const cleanMsg = (msg.message || '').trim().toLowerCase();

        // 1. !oyna veya !play komutu
        const isTrigger = !isSystem && (
            cleanMsg.includes(streamerMode.triggerCommand.toLowerCase().trim()) ||
            /^!(?:oyna|play)/i.test(cleanMsg)
        );

        // 2. !varım (veya !varim) komutu
        const isVarim = !isSystem && (cleanMsg === '!varım' || cleanMsg === '!varim');

        // 3. !yokum komutu
        const isYokum = !isSystem && cleanMsg === '!yokum';

        // 4. Sırası gelen aktif yarışmacının kutu seçimi kontrolü
        const isActiveViewer = !isSystem && streamerMode.enabled && activeViewer && (msg.name.toLowerCase() === activeViewer.name.toLowerCase());
        let activeBoxId = null;

        if (isActiveViewer) {
            const justNumMatch = cleanMsg.match(/^[\D]*([1-9]|1[0-9]|2[0-4])[\D]*$/);
            if (justNumMatch) {
                activeBoxId = parseInt(justNumMatch[1], 10);
            } else {
                const keywordMatch = cleanMsg.match(/(?:kutu|box|no|seç|sec|#)\s*([1-9]|1[0-9]|2[0-4])\b/);
                if (keywordMatch) {
                    activeBoxId = parseInt(keywordMatch[1], 10);
                } else {
                    const standaloneMatch = cleanMsg.match(/\b([1-9]|1[0-9]|2[0-4])\b/);
                    if (standaloneMatch) {
                        activeBoxId = parseInt(standaloneMatch[1], 10);
                    }
                }
            }
        }

        // FİLTRE: Sistem mesajı değilse, komut (!oyna, !varım, !yokum) değilse ve aktif kutu seçimi değilse YOL VERME (sohbeti kirletme)
        const isAction = isSystem || isTrigger || isVarim || isYokum || (activeBoxId !== null);
        if (!isAction) {
            return; // Normal sohbet yazılarını (sa, selam, s, a, naber vb.) tamamen yok say
        }

        // DOM Elemanı Oluşturma
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${isSystem ? 'system-msg' : ''} ${isTrigger ? 'trigger-msg' : ''}`;

        if (isSystem) {
            msgDiv.innerHTML = `<span class="chat-text">${msg.message}</span>`;
        } else {
            const userColor = msg.color ? `style="color: ${msg.color}; font-weight: 600;"` : '';
            let formattedText = msg.message;

            if (isVarim) {
                formattedText = '<strong style="color: #00ff88;">!varım</strong>';
            } else if (isYokum) {
                formattedText = '<strong style="color: #ff3344;">!yokum</strong>';
            } else if (activeBoxId !== null) {
                formattedText = `<strong style="color: #ffd700; background: rgba(255,215,0,0.15); padding: 2px 6px; border-radius: 4px;">Kutu ${activeBoxId}</strong>`;
            }

            msgDiv.innerHTML = `
                <span class="chat-name ${msg.platform}" ${userColor}>${msg.name}</span>: 
                <span class="chat-text">${formattedText}</span>
            `;
        }

        // Ses Efekti
        if (isTrigger && typeof soundManager !== 'undefined' && soundManager.playTone) {
            soundManager.playTone(880, 'sine', 0.15);
        } else if (activeBoxId !== null && typeof soundManager !== 'undefined' && soundManager.playTone) {
            soundManager.playTone(660, 'triangle', 0.2);
        }

        chatMessagesContainer.appendChild(msgDiv);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

        // Eğer aktif yarışmacı !varım veya !yokum dediyse ve banker teklif modalı açıksa teklifi yanıtla
        if (isActiveViewer && bankerModal && !bankerModal.classList.contains('hidden')) {
            if (isVarim && dealBtn) {
                dealBtn.click();
            } else if (isYokum && noDealBtn) {
                noDealBtn.click();
            }
        }

        // Banker Oylaması (!varım / !yokum)
        if (currentPoll && !isSystem) {
            if (isVarim) {
                if (!currentPoll.votedUsers.has(msg.name)) {
                    currentPoll.votedUsers.add(msg.name);
                    currentPoll.varim++;
                    updatePollUI();
                }
            } else if (isYokum) {
                if (!currentPoll.votedUsers.has(msg.name)) {
                    currentPoll.votedUsers.add(msg.name);
                    currentPoll.yokum++;
                    updatePollUI();
                }
            }
        }

        // Aktif yarışmacının kutusunu açma mantığı
        if (activeBoxId !== null) {
            const targetBox = gameBoxes.find(b => b.id === activeBoxId);
            if (targetBox && !targetBox.isOpened) {
                if (playerBox === null) {
                    handleBoxClick(targetBox);
                } else if (boxesToOpenInRound > 0) {
                    doOpenBox(targetBox);
                }
            }
        }
    };

    // Viewer Join Queue Callback
    streamerMode.onViewerJoinQueue = () => {
        updateQueueUI();
        // If the game is waiting for a viewer, try taking the next one immediately
        if (!activeViewer && gameScreen.classList.contains('active')) {
            tryNextViewer();
        }
    };

    // Connection Change Callback
    streamerMode.onConnectionChange = (connected, platform) => {
        if (!chatStatus || !chatPlatformLabel || !chatPlatformIcon) return;
        if (connected) {
            chatStatus.className = 'chat-status online';
            chatStatus.innerHTML = '<span style="color:#53fc18;">● Bağlandı</span>';
            chatPlatformLabel.innerText = platform === 'kick' ? 'KİCK CHAT' : (platform.toUpperCase() + ' CHAT');
            chatPlatformIcon.className = streamerMode.getPlatformIcon(platform);
            chatPlatformIcon.style.color = '#53fc18';
        } else {
            chatStatus.className = 'chat-status offline';
            chatStatus.innerHTML = '<span style="color:#ff3344;">● Çevrimdışı</span>';
            chatPlatformLabel.innerText = 'SOHBET';
            chatPlatformIcon.className = 'fas fa-comments';
            chatPlatformIcon.style.color = '';
        }
    };
}

function updateQueueUI() {
    const queueList = document.getElementById('queue-list');
    const queueCount = document.getElementById('queue-count');
    const queue = streamerMode.peekQueue();
    
    if (queueCount) queueCount.innerText = queue.length;
    if (queueList) {
        queueList.innerHTML = '';
        queue.forEach((viewer, idx) => {
            const item = document.createElement('div');
            item.className = 'queue-item';
            item.innerHTML = `
                <span class="queue-position">#${idx + 1}</span>
                <span class="queue-viewer-name">${viewer.name}</span>
                <span class="queue-platform-badge ${viewer.platform}">${viewer.platform.toUpperCase()}</span>
            `;
            queueList.appendChild(item);
        });
    }
}

function tryNextViewer() {
    if (!streamerMode.enabled) return true;

    const activeViewerBanner = document.getElementById('active-viewer-banner');
    const activeViewerName = document.getElementById('active-viewer-name');
    const activeInst = document.getElementById('viewer-instruction-label');

    if (!activeViewer) {
        activeViewer = streamerMode.getNextViewer();
        if (activeViewer) {
            if (activeViewerBanner) activeViewerBanner.classList.remove('hidden');
            if (activeViewerName) activeViewerName.innerText = activeViewer.name;
            if (activeInst) {
                activeInst.innerText = currentLang === 'tr'
                    ? "Sohbete kutu numarası yaz (örn: 12)"
                    : "Type box number in chat (e.g. 12)";
            }
            updateQueueUI();
            
            if (playerBox === null) {
                updateStatusMessage(t('streamerChooseBox', {name: activeViewer.name}));
            } else {
                updateStatusMessage(t('streamerOpenBox', {name: activeViewer.name, count: boxesToOpenInRound}));
            }
            return true;
        } else {
            if (activeViewerBanner) activeViewerBanner.classList.add('hidden');
            updateStatusMessage(currentLang === 'tr' 
                ? `İzleyici bekleniyor! Chat'e ${streamerMode.triggerCommand} yazın.`
                : `Waiting for viewer! Type ${streamerMode.triggerCommand} in chat.`
            );
            return false;
        }
    }
    return true;
}



// SPA Screen helper
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// SETTINGS SCREEN (SPA - tek sayfa, müzik kesilmez)
const SETTINGS_TRANSLATIONS = {
    tr: {
        settings: "Ayarlar",
        back: "Geri",
        tabGameplay: "Oynanış",
        tabAudioVideo: "Ekran & Ses",
        tabCredits: "Yapanlar",
        howToPlay: "Nasıl Oynanır?",
        rule1: "Oyun başında 24 kutudan birini <strong>kendi kutun</strong> olarak seç. Bu kutu oyun sonuna kadar açılmaz.",
        rule2: "Her turda belirtilen sayıda kutu aç ve içindeki cezaları ele.",
        rule3: "Ağır cezaları elemek seni rahatlatır, hafif cezaları elemek riskini artırır.",
        rule4: "Her tur sonunda <strong>Hamdi Bey (Banker)</strong> arayarak kalan cezalara göre tek bir ceza teklif eder.",
        rule5: "<strong>Varım:</strong> Teklifi kabul edip o cezayı çekersin ve oyun biter.",
        rule6: "<strong>Yokum:</strong> Teklifi reddedip kutu açmaya devam edersin.",
        rule7: "Son 2 kutu kalırsa kendi kutunu açabilir veya diğeriyle değiştirebilirsin!",
        loadedDares: "Yüklü Cezalar (cezalar.txt)",
        daresHelp: "Cezaları değiştirmek için klasördeki cezalar.txt dosyasını düzenleyebilirsiniz. Her satıra bir ceza yazın (toplam 24 adet).",
        displaySettings: "Görüntü Ayarları",
        fullscreenMode: "Tam Ekran Modu",
        fullscreenDesc: "Oyunu daha gerçekçi bir modda oynamak için tam ekrana geçin.",
        fullscreenBtn: "Tam Ekran Yap",
        fullscreenExitBtn: "Tam Ekrandan Çık",
        fontSize: "Yazı Boyutu",
        fontSizeDesc: "Oyun arayüzündeki metinlerin boyutunu değiştirin.",
        fontSmall: "Küçük",
        fontNormal: "Normal",
        fontLarge: "Büyük",
        language: "Dil / Language",
        languageDesc: "Oyunun dilini değiştirin.",
        audioSettings: "Ses Ayarları",
        generalVolume: "Ses Düzeyi",
        generalVolumeDesc: "Oyun içi genel ses seviyesini ayarlar.",
        sfx: "Ses Efektleri",
        sfxDesc: "Kutu açma, telefon zili ve tıklama seslerini ayarlar.",
        music: "Arka Plan Müziği",
        musicDesc: "Menü ve oyun içi arka plan müziğini ayarlar.",
        dialogueToggleLabel: "Kutu Diyalogları",
        dialogueToggleDesc: "Kutu açılırken sahiplerinin konuşma balonlarını gösterir veya gizler.",
        voiceoverVolLabel: "Seslendirme Sesi",
        voiceoverVolDesc: "Bankacı konuşmaları ve Ahmet Dayı replikleri ses düzeyini ayarlar.",
        voiceoverToggleLabel: "Bankacı & Ahmet Dayı Seslendirmeleri",
        voiceoverToggleDesc: "Bankacı ve Ahmet Dayı seslendirmelerini tamamen açar veya kapatır.",
        soundTest: "Ses Testi",
        soundTestDesc: "Sentezleyici ses tonlarının düzgün çalışıp çalışmadığını test edin.",
        testToneBtn: "Tonu Test Et",
        soundOn: "Açık",
        soundOff: "Kapalı",
        devTeam: "Geliştirici Ekibi",
        projectDesign: "Proje Tasarımı",
        devAssistant: "Geliştirici Asistanı",
        synthDesign: "Ses Sentezleyici Tasarımı",
        uiTheme: "Yazı Tipi & Arayüz Teması",
        tabStreamer: "Yayıncı Modu",
        streamerTitle: "Canlı Yayın Entegrasyonu (YouTube / Kick)",
        streamerEnableLabel: "Yayıncı Modunu Aktifleştir",
        streamerEnableDesc: "İzleyicilerinizin chat'ten komut yazarak sıraya girmesini ve kendi isimleriyle kutu açmasını sağlar.",
        streamerPlatformLabel: "Platform Seçimi",
        streamerPlatformDesc: "Canlı yayını yaptığınız platformu seçin. (Demo modu test amaçlıdır)",
        streamerTriggerLabel: "Sıraya Girme Komutu",
        streamerTriggerDesc: "İzleyicilerin sıraya girmesi için yazması gereken chat komutu.",
        streamerPointsLabel: "Minimum Sadakat Puanı / Seviye",
        streamerPointsDesc: "Sıraya girebilmek için gerekli minimum sadakat puanı/seviyesi (0 = Herkes katılabilir).",
        kickChannelLabel: "Kick Kanal Adı",
        kickChannelDesc: "Chat'e bağlanmak için Kick kullanıcı adınızı yazın.",
        kickIdLabel: "Kick Kanal ID (Opsiyonel)",
        kickIdDesc: "Kanal adı ile otomatik bağlanamazsa buraya kanal numarasını girin.",
        ytKeyLabel: "YouTube API Anahtarı",
        ytKeyDesc: "YouTube Canlı Yayın chat'ini okuyabilmek için Google Developer API Key.",
        ytVideoLabel: "YouTube Video / Canlı Yayın ID",
        ytVideoDesc: "Yayınınızın URL'sindeki v= parametresi (örn: youtube.com/watch?v=XXXXXX).",
        xrayLabel: "Röntgen Modu",
        xrayDesc: "Kutuların içindeki cezaları hafif bir şekilde üzerlerinde gösterir (X-Ray Vision).",
        bankerPersonalityLabel: "Banker Kişiliği",
        bankerPersonalityDesc: "Hamdi Bey'in teklif verirken ne kadar cömert veya cimri olacağını belirler.",
        bankerOptGenerous: "Cömert",
        bankerOptBalanced: "Dengeli",
        bankerOptStingy: "Cimri",
        themeColorLabel: "Tema Renk Vurgusu",
        themeColorDesc: "Arayüzün vurgu rengini kişiselleştirin.",
        dareRevealSpeedLabel: "Elenen Ceza Animasyon Hızı",
        dareRevealSpeedDesc: "Kutu açılınca sidebar'daki ceza kutucuğunun kaybolma ve ekrandaki ceza kartının gösterim süresini ayarlar. 1 = yavaş, 10 = hızlı."
    },
    en: {
        settings: "Settings",
        back: "Back",
        tabGameplay: "Gameplay",
        tabAudioVideo: "Screen & Audio",
        tabCredits: "Credits",
        howToPlay: "How to Play?",
        rule1: "Choose one of 24 boxes as <strong>your own box</strong> at the start. It remains closed until the end.",
        rule2: "Open the specified number of boxes each round and eliminate their dares.",
        rule3: "Eliminating heavy dares relieves you; eliminating light dares increases your risk.",
        rule4: "At the end of each round, the <strong>Banker</strong> calls and offers a single dare based on remaining dares.",
        rule5: "<strong>Deal:</strong> Accept the offer, take that dare, and end the game.",
        rule6: "<strong>No Deal:</strong> Reject the offer and continue opening boxes.",
        rule7: "If only 2 boxes remain, you can open your own box or swap it with the other one!",
        loadedDares: "Loaded Dares (cezalar.txt)",
        daresHelp: "You can edit the cezalar.txt file in the folder to change dares. Write one dare per line (24 total).",
        displaySettings: "Display Settings",
        fullscreenMode: "Fullscreen Mode",
        fullscreenDesc: "Switch to fullscreen for a more immersive experience.",
        fullscreenBtn: "Go Fullscreen",
        fullscreenExitBtn: "Exit Fullscreen",
        fontSize: "Font Size",
        fontSizeDesc: "Change the size of text in the game interface.",
        fontSmall: "Small",
        fontNormal: "Normal",
        fontLarge: "Large",
        language: "Language / Dil",
        languageDesc: "Change the language of the game.",
        audioSettings: "Audio Settings",
        generalVolume: "Volume Level",
        generalVolumeDesc: "Adjusts the general volume level of the game.",
        sfx: "Sound Effects",
        sfxDesc: "Controls box opening, telephone ring, and click sounds.",
        music: "Background Music",
        musicDesc: "Controls menu and game background music tracks.",
        dialogueToggleLabel: "Box Dialogues",
        dialogueToggleDesc: "Show or hide speech bubbles of box owners when opening a box.",
        voiceoverVolLabel: "Voiceover Volume",
        voiceoverVolDesc: "Controls the volume level of Banker offers and Ahmet Dayı clips.",
        voiceoverToggleLabel: "Banker & Ahmet Dayı Voiceovers",
        voiceoverToggleDesc: "Turns Banker voiceovers and Ahmet Dayı clips completely on or off.",
        soundTest: "Audio Test",
        soundTestDesc: "Test if the synthesizer audio tones are working correctly.",
        testToneBtn: "Test Tone",
        soundOn: "On",
        soundOff: "Off",
        devTeam: "Development Team",
        projectDesign: "Project Design",
        devAssistant: "Dev Assistant",
        synthDesign: "Synth Design",
        uiTheme: "Font & UI Theme",
        tabStreamer: "Streamer Mode",
        streamerTitle: "Live Stream Integration (YouTube / Kick)",
        streamerEnableLabel: "Enable Streamer Mode",
        streamerEnableDesc: "Allows your viewers to join the queue and open boxes with their names by typing a command in chat.",
        streamerPlatformLabel: "Platform Selection",
        streamerPlatformDesc: "Select the platform you stream on. (Demo mode is for testing)",
        streamerTriggerLabel: "Queue Join Command",
        streamerTriggerDesc: "The chat command viewers must type to join the queue.",
        streamerPointsLabel: "Minimum Loyalty Points / Level",
        streamerPointsDesc: "Minimum loyalty points/level required to join queue (0 = Anyone can join).",
        kickChannelLabel: "Kick Channel Name",
        kickChannelDesc: "Enter your Kick channel username to connect to chat.",
        kickIdLabel: "Kick Channel ID (Optional)",
        kickIdDesc: "If connection fails via channel name, enter your channel ID here.",
        ytKeyLabel: "YouTube API Key",
        ytKeyDesc: "Google Developer API Key required to read YouTube Live chat.",
        ytVideoLabel: "YouTube Video / Live stream ID",
        ytVideoDesc: "The v= parameter in your stream URL (e.g. youtube.com/watch?v=XXXXXX).",
        xrayLabel: "X-Ray Mode",
        xrayDesc: "Faintly shows the dares inside the unopened boxes (X-Ray Vision).",
        bankerPersonalityLabel: "Banker Personality",
        bankerPersonalityDesc: "Determines how generous or stingy the Banker will be when making offers.",
        bankerOptGenerous: "Generous",
        bankerOptBalanced: "Balanced",
        bankerOptStingy: "Stingy",
        themeColorLabel: "UI Theme Accent",
        themeColorDesc: "Customize the primary accent color of the interface.",
        dareRevealSpeedLabel: "Eliminated Dare Animation Speed",
        dareRevealSpeedDesc: "Controls how long the sidebar dare box fade-out and on-screen dare card last. 1 = slow, 10 = fast."
    }
};

let settingsControlsReady = false;

const settingsConfig = {
    get lang() { return localStorage.getItem('gta_lang') || 'tr'; },
    set lang(v) { localStorage.setItem('gta_lang', v); },
    get fontSize() { return localStorage.getItem('gta_font_size') || 'normal'; },
    set fontSize(v) { localStorage.setItem('gta_font_size', v); },
    get volume() { return parseInt(localStorage.getItem('gta_volume') || '80'); },
    set volume(v) { localStorage.setItem('gta_volume', v.toString()); },
    get musicVolume() { return parseInt(localStorage.getItem('gta_music_volume') || '5'); },
    set musicVolume(v) { localStorage.setItem('gta_music_volume', v.toString()); },
    get sfxVolume() { return parseInt(localStorage.getItem('gta_sfx_volume') || '10'); },
    set sfxVolume(v) { localStorage.setItem('gta_sfx_volume', v.toString()); },
    get voiceoverVolume() { return parseInt(localStorage.getItem('gta_voiceover_volume') || '80'); },
    set voiceoverVolume(v) { localStorage.setItem('gta_voiceover_volume', v.toString()); },

    get sfxEnabled() { return localStorage.getItem('gta_sfx') !== 'false'; },
    set sfxEnabled(v) { localStorage.setItem('gta_sfx', v.toString()); },
    get musicEnabled() { return localStorage.getItem('gta_music') !== 'false'; },
    set musicEnabled(v) { localStorage.setItem('gta_music', v.toString()); },
    get voiceoverEnabled() { return localStorage.getItem('gta_voiceover_enabled') !== 'false'; },
    set voiceoverEnabled(v) { localStorage.setItem('gta_voiceover_enabled', v.toString()); },
    get showDialogueText() { return localStorage.getItem('gta_show_dialogue_text') !== 'false'; },
    set showDialogueText(v) { localStorage.setItem('gta_show_dialogue_text', v.toString()); },
    get fastAnimations() { return localStorage.getItem('gta_fast_animations') === 'true'; },
    set fastAnimations(v) { localStorage.setItem('gta_fast_animations', v.toString()); },
    get allowBoxSwap() { return localStorage.getItem('gta_allow_box_swap') !== 'false'; },
    set allowBoxSwap(v) { localStorage.setItem('gta_allow_box_swap', v.toString()); },
    get streamerEnabled() { return localStorage.getItem('streamer_enabled') === 'true'; },
    set streamerEnabled(v) { localStorage.setItem('streamer_enabled', v.toString()); },
    get streamerPlatform() {
        const p = localStorage.getItem('streamer_platform') || 'kick';
        return p === 'demo' ? 'kick' : p;
    },
    set streamerPlatform(v) { localStorage.setItem('streamer_platform', v); },
    get streamerTrigger() { return localStorage.getItem('streamer_trigger') || '!oyna'; },
    set streamerTrigger(v) { localStorage.setItem('streamer_trigger', v); },
    get streamerMinLoyalty() { return parseInt(localStorage.getItem('streamer_min_loyalty') || '0'); },
    set streamerMinLoyalty(v) { localStorage.setItem('streamer_min_loyalty', v.toString()); },
    get kickChannel() { return localStorage.getItem('streamer_kick_channel') || ''; },
    set kickChannel(v) { localStorage.setItem('streamer_kick_channel', v); },
    get kickChannelId() { return localStorage.getItem('streamer_kick_id') || ''; },
    set kickChannelId(v) { localStorage.setItem('streamer_kick_id', v); },
    get ytApiKey() { return localStorage.getItem('streamer_yt_api_key') || ''; },
    set ytApiKey(v) { localStorage.setItem('streamer_yt_api_key', v); },
    get ytVideoId() { return localStorage.getItem('streamer_yt_video_id') || ''; },
    set ytVideoId(v) { localStorage.setItem('streamer_yt_video_id', v); },
    get accentColor() { return localStorage.getItem('gta_accent_color') || '#ffd700'; },
    set accentColor(v) { localStorage.setItem('gta_accent_color', v); },
    get xrayVision() { return localStorage.getItem('gta_xray_vision') === 'true'; },
    set xrayVision(v) { localStorage.setItem('gta_xray_vision', v.toString()); },
    get bankerPersonality() { return localStorage.getItem('gta_banker_personality') || 'balanced'; },
    set bankerPersonality(v) { localStorage.setItem('gta_banker_personality', v); },
    get dareRevealSpeed() { return parseInt(localStorage.getItem('gta_dare_reveal_speed') || '5', 10); },
    set dareRevealSpeed(v) { localStorage.setItem('gta_dare_reveal_speed', v.toString()); }
};

function st(key) {
    const lang = settingsConfig.lang;
    const l = SETTINGS_TRANSLATIONS[lang] || SETTINGS_TRANSLATIONS.tr;
    return l[key] || key;
}

function updateMusicVolume() {
    const audio = document.getElementById('menu-music-audio');
    if (audio) {
        audio.volume = settingsConfig.volume / 100 * 0.6;
    }
}

function updateSettingsPlatformGroups() {
    const kickGroup = document.getElementById('kick-settings-group');
    const ytGroup = document.getElementById('youtube-settings-group');
    if (!kickGroup || !ytGroup) return;

    kickGroup.classList.add('hidden');
    ytGroup.classList.add('hidden');

    if (settingsConfig.streamerPlatform === 'kick') {
        kickGroup.classList.remove('hidden');
    } else if (settingsConfig.streamerPlatform === 'youtube') {
        ytGroup.classList.remove('hidden');
    }
}

function updateSettingsToggleButtons() {
    const l = SETTINGS_TRANSLATIONS[settingsConfig.lang] || SETTINGS_TRANSLATIONS.tr;

    const sfxBtn = document.getElementById('sfx-toggle');
    const sfxTxt = document.getElementById('sfx-toggle-txt');
    if (sfxBtn && sfxTxt) {
        if (settingsConfig.sfxEnabled) {
            sfxBtn.className = 'action-btn active';
            sfxBtn.querySelector('i').className = 'fas fa-check';
            sfxTxt.innerText = l.soundOn;
        } else {
            sfxBtn.className = 'action-btn';
            sfxBtn.querySelector('i').className = 'fas fa-times';
            sfxTxt.innerText = l.soundOff;
        }
    }

    const musicBtn = document.getElementById('music-toggle');
    const musicTxt = document.getElementById('music-toggle-txt');
    if (musicBtn && musicTxt) {
        if (settingsConfig.musicEnabled) {
            musicBtn.className = 'action-btn active';
            musicBtn.querySelector('i').className = 'fas fa-check';
            musicTxt.innerText = l.soundOn;
        } else {
            musicBtn.className = 'action-btn';
            musicBtn.querySelector('i').className = 'fas fa-times';
            musicTxt.innerText = l.soundOff;
        }
    }

    const voBtn = document.getElementById('voiceover-toggle');
    const voTxt = document.getElementById('voiceover-toggle-txt');
    if (voBtn && voTxt) {
        if (settingsConfig.voiceoverEnabled) {
            voBtn.className = 'action-btn active';
            voBtn.querySelector('i').className = 'fas fa-check';
            voTxt.innerText = l.soundOn;
        } else {
            voBtn.className = 'action-btn';
            voBtn.querySelector('i').className = 'fas fa-times';
            voTxt.innerText = l.soundOff;
        }
    }

    const stBtn = document.getElementById('streamer-toggle');
    const stTxt = document.getElementById('streamer-toggle-txt');
    if (stBtn && stTxt) {
        if (settingsConfig.streamerEnabled) {
            stBtn.className = 'action-btn active';
            stBtn.querySelector('i').className = 'fas fa-check';
            stTxt.innerText = l.soundOn;
        } else {
            stBtn.className = 'action-btn';
            stBtn.querySelector('i').className = 'fas fa-times';
            stTxt.innerText = l.soundOff;
        }
    }
}

function updateSettingsFullscreenButton() {
    const fsBtn = document.getElementById('fullscreen-toggle');
    if (!fsBtn) return;
    if (document.fullscreenElement) {
        fsBtn.innerHTML = `<i class="fas fa-compress"></i> ${st('fullscreenExitBtn')}`;
        fsBtn.classList.add('active');
    } else {
        fsBtn.innerHTML = `<i class="fas fa-expand"></i> ${st('fullscreenBtn')}`;
        fsBtn.classList.remove('active');
    }
}

function applySettingsTranslations() {
    const l = SETTINGS_TRANSLATIONS[settingsConfig.lang] || SETTINGS_TRANSLATIONS.tr;

    const backBtn = document.getElementById('settings-back-btn');
    if (backBtn) backBtn.innerHTML = `<i class="fas fa-arrow-left"></i> ${l.back}`;

    const pageTitle = document.getElementById('page-title-text');
    if (pageTitle) pageTitle.innerText = l.settings;

    const tabGameplay = document.getElementById('btn-tab-gameplay');
    const tabStreamer = document.getElementById('btn-tab-streamer');
    const tabAudioVideo = document.getElementById('btn-tab-audio-video');
    const tabCredits = document.getElementById('btn-tab-credits');
    if (tabGameplay) tabGameplay.innerHTML = `<i class="fas fa-gamepad"></i> ${l.tabGameplay}`;
    if (tabStreamer) tabStreamer.innerHTML = `<i class="fas fa-broadcast-tower"></i> ${l.tabStreamer}`;
    if (tabAudioVideo) tabAudioVideo.innerHTML = `<i class="fas fa-sliders-h"></i> ${l.tabAudioVideo}`;
    if (tabCredits) tabCredits.innerHTML = `<i class="fas fa-user-friends"></i> ${l.tabCredits}`;

    const setText = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };
    setText('rules-title', l.howToPlay);
    setText('dares-title-text', l.loadedDares);
    setText('dares-help-text', l.daresHelp);
    setText('display-title', l.displaySettings);
    setText('fs-label', l.fullscreenMode);
    setText('fs-desc', l.fullscreenDesc);
    setText('font-label', l.fontSize);
    setText('font-desc', l.fontSizeDesc);
    setText('font-opt-small', l.fontSmall);
    setText('font-opt-normal', l.fontNormal);
    setText('font-opt-large', l.fontLarge);
    setText('lang-label', l.language);
    setText('lang-desc', l.languageDesc);
    setText('audio-title', l.audioSettings);
    setText('vol-label', l.generalVolume);
    setText('vol-desc', l.generalVolumeDesc);
    setText('sfx-label', l.sfx);
    setText('sfx-desc', l.sfxDesc);
    setText('music-label', l.music);
    setText('music-desc', l.musicDesc);
    setText('dialogue-toggle-label', l.dialogueToggleLabel);
    setText('dialogue-toggle-desc', l.dialogueToggleDesc);
    setText('voiceover-vol-label', l.voiceoverVolLabel);
    setText('voiceover-vol-desc', l.voiceoverVolDesc);
    setText('voiceover-toggle-label', l.voiceoverToggleLabel);
    setText('voiceover-toggle-desc', l.voiceoverToggleDesc);
    setText('test-label', l.soundTest);
    setText('test-desc', l.soundTestDesc);
    setText('test-btn-txt', l.testToneBtn);
    setText('streamer-title', l.streamerTitle);
    setText('streamer-enable-label', l.streamerEnableLabel);
    setText('streamer-enable-desc', l.streamerEnableDesc);
    setText('streamer-platform-label', l.streamerPlatformLabel);
    setText('streamer-platform-desc', l.streamerPlatformDesc);
    setText('streamer-trigger-label', l.streamerTriggerLabel);
    setText('streamer-trigger-desc', l.streamerTriggerDesc);
    setText('streamer-points-label', l.streamerPointsLabel);
    setText('streamer-points-desc', l.streamerPointsDesc);
    setText('kick-channel-label', l.kickChannelLabel);
    setText('kick-channel-desc', l.kickChannelDesc);
    setText('yt-key-label', l.ytKeyLabel);
    setText('yt-key-desc', l.ytKeyDesc);
    setText('yt-video-label', l.ytVideoLabel);
    setText('yt-video-desc', l.ytVideoDesc);
    setText('credits-main-title', l.devTeam);
    setText('role-design', l.projectDesign);
    setText('role-assistant', l.devAssistant);
    setText('role-synth', l.synthDesign);
    setText('role-ui', l.uiTheme);

    // New translation bindings
    setText('xray-label', l.xrayLabel);
    setText('xray-desc', l.xrayDesc);
    setText('banker-personality-label', l.bankerPersonalityLabel);
    setText('banker-personality-desc', l.bankerPersonalityDesc);
    setText('banker-opt-generous', l.bankerOptGenerous);
    setText('banker-opt-balanced', l.bankerOptBalanced);
    setText('banker-opt-stingy', l.bankerOptStingy);
    setText('theme-color-label', l.themeColorLabel);
    setText('theme-color-desc', l.themeColorDesc);
    setText('dare-speed-label', l.dareRevealSpeedLabel);
    setText('dare-speed-desc', l.dareRevealSpeedDesc);

    const rulesList = document.getElementById('rules-list-items');
    if (rulesList) {
        let htmlContent = `
            <li><i class="fas fa-box"></i> ${l.rule1}</li>
            <li><i class="fas fa-hand-pointer"></i> ${l.rule2}</li>
            <li><i class="fas fa-balance-scale"></i> ${l.rule3}</li>
            <li><i class="fas fa-phone-alt"></i> ${l.rule4}</li>
            <li><i class="fas fa-check-circle"></i> ${l.rule5}</li>
            <li><i class="fas fa-times-circle"></i> ${l.rule6}</li>
            <li><i class="fas fa-exchange-alt"></i> ${l.rule7}</li>
        `;
        if (typeof bankerName !== 'undefined' && bankerName) {
            htmlContent = htmlContent.replace(/Hamdi Bey/g, bankerName);
        }
        rulesList.innerHTML = htmlContent;
    }

    updateSettingsToggleButtons();
    updateSettingsFullscreenButton();
}

// Volume mute tracking variables
let lastMusicVolume = parseInt(localStorage.getItem('gta_music_volume') || '5') || 5;
let lastSfxVolume = parseInt(localStorage.getItem('gta_sfx_volume') || '80', 10) || 80;
let lastVoiceoverVolume = parseInt(localStorage.getItem('gta_voiceover_volume') || '80', 10) || 80;


function updateMinimalistToggle() {
    const minimalistToggle = document.getElementById('minimalist-toggle');
    const minimalistTxt = document.getElementById('minimalist-toggle-txt');
    if (!minimalistToggle) return;
    const isShowing = settingsConfig.showDialogueText;
    if (minimalistTxt) minimalistTxt.innerText = isShowing ? 'Metinleri Gizle' : 'Metinleri Göster';
    minimalistToggle.querySelector('i').className = isShowing ? 'fas fa-eye-slash' : 'fas fa-eye';
    if (isShowing) {
        minimalistToggle.classList.remove('active');
    } else {
        minimalistToggle.classList.add('active');
    }
}

function updateFastAnimToggle() {
    const fastAnimToggle = document.getElementById('fast-anim-toggle');
    const fastAnimTxt = document.getElementById('fast-anim-toggle-txt');
    if (!fastAnimToggle) return;
    const isActive = settingsConfig.fastAnimations;
    if (fastAnimTxt) fastAnimTxt.innerText = isActive ? 'Hızlandırılmış' : 'Normal Hız';
    fastAnimToggle.querySelector('i').className = isActive ? 'fas fa-bolt' : 'fas fa-stopwatch';
    if (isActive) {
        fastAnimToggle.classList.add('active');
    } else {
        fastAnimToggle.classList.remove('active');
    }
}

function updateBoxSwapToggle() {
    const boxSwapToggle = document.getElementById('box-swap-toggle');
    const boxSwapTxt = document.getElementById('box-swap-toggle-txt');
    if (!boxSwapToggle) return;
    const isActive = settingsConfig.allowBoxSwap;
    if (boxSwapTxt) boxSwapTxt.innerText = isActive ? 'Aktif' : 'Pasif';
    boxSwapToggle.querySelector('i').className = isActive ? 'fas fa-exchange-alt' : 'fas fa-ban';
    if (isActive) {
        boxSwapToggle.classList.add('active');
    } else {
        boxSwapToggle.classList.remove('active');
    }
}

function updateXrayToggle() {
    const xrayToggle = document.getElementById('xray-toggle');
    const xrayTxt = document.getElementById('xray-toggle-txt');
    if (!xrayToggle) return;
    const isActive = settingsConfig.xrayVision;
    const activeText = currentLang === 'tr' ? 'Aktif' : 'Active';
    const inactiveText = currentLang === 'tr' ? 'Pasif' : 'Inactive';
    if (xrayTxt) xrayTxt.innerText = isActive ? activeText : inactiveText;
    xrayToggle.querySelector('i').className = isActive ? 'fas fa-eye' : 'fas fa-eye-slash';
    if (isActive) {
        xrayToggle.classList.add('active');
    } else {
        xrayToggle.classList.remove('active');
    }
}

function updateVolumeIconsState() {
    // Music
    const musicIcon = document.getElementById('music-volume-icon');
    if (musicIcon) {
        if (settingsConfig.musicVolume === 0) {
            musicIcon.className = 'fas fa-volume-mute clickable-volume-icon muted';
        } else {
            musicIcon.className = 'fas fa-music clickable-volume-icon';
        }
    }
    // SFX
    const sfxIcon = document.getElementById('sfx-volume-icon');
    if (sfxIcon) {
        if (settingsConfig.sfxVolume === 0) {
            sfxIcon.className = 'fas fa-volume-mute clickable-volume-icon muted';
        } else {
            sfxIcon.className = 'fas fa-volume-down clickable-volume-icon';
        }
    }
    // Voiceover
    const voiceoverIcon = document.getElementById('voiceover-volume-icon');
    if (voiceoverIcon) {
        if (settingsConfig.voiceoverVolume === 0) {
            voiceoverIcon.className = 'fas fa-comment-slash clickable-volume-icon muted';
        } else {
            voiceoverIcon.className = 'fas fa-comment clickable-volume-icon';
        }
    }
}

function syncSettingsFormValues() {
    const l = SETTINGS_TRANSLATIONS[settingsConfig.lang] || SETTINGS_TRANSLATIONS.tr;

    // New separate volume sliders
    const musicSlider = document.getElementById('music-volume-slider');
    const musicLabel = document.getElementById('music-volume-val-label');
    if (musicSlider) musicSlider.value = settingsConfig.musicVolume;
    if (musicLabel) musicLabel.innerText = `${settingsConfig.musicVolume}%`;

    const sfxSlider = document.getElementById('sfx-volume-slider');
    const sfxLabel = document.getElementById('sfx-volume-val-label');
    if (sfxSlider) sfxSlider.value = settingsConfig.sfxVolume;
    if (sfxLabel) sfxLabel.innerText = `${settingsConfig.sfxVolume}%`;

    const voSlider = document.getElementById('voiceover-volume-slider');
    const voLabel = document.getElementById('voiceover-volume-val-label');
    if (voSlider) voSlider.value = settingsConfig.voiceoverVolume;
    if (voLabel) voLabel.innerText = `${settingsConfig.voiceoverVolume}%`;

    const dareSpeedSlider = document.getElementById('dare-reveal-speed-slider');
    const dareSpeedVal = document.getElementById('dare-reveal-speed-val');
    if (dareSpeedSlider) dareSpeedSlider.value = settingsConfig.dareRevealSpeed;
    if (dareSpeedVal) dareSpeedVal.innerText = settingsConfig.dareRevealSpeed;

    // Sync dialogue toggle state
    const dialogueToggle = document.getElementById('dialogue-toggle');
    if (dialogueToggle) {
        const txt = document.getElementById('dialogue-toggle-txt');
        if (settingsConfig.showDialogueText) {
            dialogueToggle.classList.add('active');
            if (txt) txt.innerText = l.soundOn;
        } else {
            dialogueToggle.classList.remove('active');
            if (txt) txt.innerText = l.soundOff;
        }
    }

    const platformSelect = document.getElementById('streamer-platform-select');
    const triggerInput = document.getElementById('streamer-trigger-input');
    const pointsInput = document.getElementById('streamer-points-input');
    const kickChannelInput = document.getElementById('kick-channel-input');
    const ytKeyInput = document.getElementById('yt-key-input');
    const ytVideoInput = document.getElementById('yt-video-input');

    if (platformSelect) platformSelect.value = settingsConfig.streamerPlatform;
    if (triggerInput) triggerInput.value = settingsConfig.streamerTrigger;
    if (pointsInput) pointsInput.value = settingsConfig.streamerMinLoyalty;
    if (kickChannelInput) kickChannelInput.value = settingsConfig.kickChannel;
    const kickConnectBtn = document.getElementById('kick-connect-btn');
    const kickStatusFeedback = document.getElementById('kick-status-feedback');
    if (streamerMode.isConnected && streamerMode.platform === 'kick') {
        if (kickConnectBtn) {
            kickConnectBtn.innerHTML = '<i class="fas fa-check"></i> Bağlandı';
            kickConnectBtn.style.backgroundColor = '#53fc18';
            kickConnectBtn.style.color = '#000';
        }
        if (kickStatusFeedback) {
            kickStatusFeedback.innerHTML = `<span style="color:#53fc18;"><i class="fas fa-check-circle"></i> "${settingsConfig.kickChannel}" kanalına bağlı</span>`;
        }
    } else {
        if (kickConnectBtn) {
            kickConnectBtn.innerHTML = '<i class="fas fa-check"></i> Onayla';
            kickConnectBtn.style.backgroundColor = '';
            kickConnectBtn.style.color = '';
        }
        if (kickStatusFeedback && settingsConfig.kickChannel) {
            kickStatusFeedback.innerHTML = `<span style="color:#888;">Kanal: ${settingsConfig.kickChannel}</span>`;
        }
    }
    if (ytKeyInput) ytKeyInput.value = settingsConfig.ytApiKey;
    if (ytVideoInput) ytVideoInput.value = settingsConfig.ytVideoId;

    updateSettingsPlatformGroups();
    
    // Sync new controls
    const xraySelect = document.getElementById('banker-personality-select');
    if (xraySelect) xraySelect.value = settingsConfig.bankerPersonality;

    const accentPicker = document.getElementById('accent-color-picker');
    const colorVal = settingsConfig.accentColor;
    if (accentPicker) accentPicker.value = colorVal;

    document.querySelectorAll('.preset-color').forEach(p => {
        if (p.getAttribute('data-color').toLowerCase() === colorVal.toLowerCase()) {
            p.classList.add('active');
        } else {
            p.classList.remove('active');
        }
    });

    // Sync gameplay toggles and volume icon styles
    updateMinimalistToggle();
    updateFastAnimToggle();
    updateBoxSwapToggle();
    updateXrayToggle();
    updateVolumeIconsState();
}


function initSettingsScreen() {
    syncSettingsFormValues();
    applySettingsTranslations();
}

function initSettingsControls() {
    if (settingsControlsReady) return;
    settingsControlsReady = true;

    document.getElementById('lang-select')?.addEventListener('change', (e) => {
        settingsConfig.lang = e.target.value;
        currentLang = settingsConfig.lang;
        applyConfig();
        applySettingsTranslations();
        soundManager.playClick();
    });

    document.getElementById('font-size-select')?.addEventListener('change', (e) => {
        settingsConfig.fontSize = e.target.value;
        applyConfig();
        soundManager.playClick();
    });

    // Music volume slider
    const musicVolSlider = document.getElementById('music-volume-slider');
    musicVolSlider?.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        settingsConfig.musicVolume = val;
        if (val > 0) lastMusicVolume = val;
        const label = document.getElementById('music-volume-val-label');
        if (label) label.innerText = `${settingsConfig.musicVolume}%`;
        soundManager.updateMusicVolume(val);
        updateVolumeIconsState();
    });

    // SFX volume slider
    const sfxVolSlider = document.getElementById('sfx-volume-slider');
    sfxVolSlider?.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        settingsConfig.sfxVolume = val;
        if (val > 0) lastSfxVolume = val;
        const label = document.getElementById('sfx-volume-val-label');
        if (label) label.innerText = `${settingsConfig.sfxVolume}%`;
        updateVolumeIconsState();
    });
    sfxVolSlider?.addEventListener('change', () => {
        soundManager.playTone(440, 'sine', 0.15);
    });

    // Voiceover volume slider
    const voVolSlider = document.getElementById('voiceover-volume-slider');
    voVolSlider?.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        settingsConfig.voiceoverVolume = val;
        if (val > 0) lastVoiceoverVolume = val;
        const label = document.getElementById('voiceover-volume-val-label');
        if (label) label.innerText = `${settingsConfig.voiceoverVolume}%`;
        if (val === 0) {
            soundManager.stopVoiceover();
        }
        updateVolumeIconsState();
    });
    voVolSlider?.addEventListener('change', () => {
        soundManager.playTone(600, 'triangle', 0.15);
    });

    // Mute/Unmute toggle on clicking volume icons
    document.getElementById('music-volume-icon')?.addEventListener('click', () => {
        if (settingsConfig.musicVolume > 0) {
            lastMusicVolume = settingsConfig.musicVolume;
            settingsConfig.musicVolume = 0;
        } else {
            settingsConfig.musicVolume = lastMusicVolume > 0 ? lastMusicVolume : 5;
        }
        syncSettingsFormValues();
        soundManager.updateMusicVolume(settingsConfig.musicVolume);
        soundManager.playClick();
    });

    document.getElementById('sfx-volume-icon')?.addEventListener('click', () => {
        if (settingsConfig.sfxVolume > 0) {
            lastSfxVolume = settingsConfig.sfxVolume;
            settingsConfig.sfxVolume = 0;
        } else {
            settingsConfig.sfxVolume = lastSfxVolume > 0 ? lastSfxVolume : 10;
        }
        syncSettingsFormValues();
        soundManager.playTone(440, 'sine', 0.15);
    });

    document.getElementById('voiceover-volume-icon')?.addEventListener('click', () => {
        if (settingsConfig.voiceoverVolume > 0) {
            lastVoiceoverVolume = settingsConfig.voiceoverVolume;
            settingsConfig.voiceoverVolume = 0;
            soundManager.stopVoiceover();
        } else {
            settingsConfig.voiceoverVolume = lastVoiceoverVolume > 0 ? lastVoiceoverVolume : 80;
        }
        syncSettingsFormValues();
        soundManager.playTone(600, 'triangle', 0.15);
    });

    // Dialogue toggle (show/hide speech bubbles)
    document.getElementById('dialogue-toggle')?.addEventListener('click', () => {
        settingsConfig.showDialogueText = !settingsConfig.showDialogueText;
        syncSettingsFormValues();
        soundManager.playClick();
    });

    // Fast animations toggle
    document.getElementById('fast-anim-toggle')?.addEventListener('click', () => {
        settingsConfig.fastAnimations = !settingsConfig.fastAnimations;
        updateFastAnimToggle();
        soundManager.playClick();
    });

    const dareSpeedSlider = document.getElementById('dare-reveal-speed-slider');
    dareSpeedSlider?.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        settingsConfig.dareRevealSpeed = val;
        const label = document.getElementById('dare-reveal-speed-val');
        if (label) label.innerText = val;
        applyDareSpeedCSSVars();
    });
    dareSpeedSlider?.addEventListener('change', () => soundManager.playClick());

    // Allow Box Swap toggle
    document.getElementById('box-swap-toggle')?.addEventListener('click', () => {
        settingsConfig.allowBoxSwap = !settingsConfig.allowBoxSwap;
        updateBoxSwapToggle();
        soundManager.playClick();
    });

    // X-Ray Vision toggle
    document.getElementById('xray-toggle')?.addEventListener('click', () => {
        settingsConfig.xrayVision = !settingsConfig.xrayVision;
        updateXrayToggle();
        if (gameBoxes && gameBoxes.length > 0) {
            renderBoxesGrid();
        }
        soundManager.playClick();
    });

    // Banker personality select
    document.getElementById('banker-personality-select')?.addEventListener('change', (e) => {
        settingsConfig.bankerPersonality = e.target.value;
        soundManager.playClick();
    });

    // Presets
    document.querySelectorAll('.preset-color').forEach(preset => {
        preset.addEventListener('click', (e) => {
            const color = e.target.getAttribute('data-color');
            settingsConfig.accentColor = color;
            
            document.querySelectorAll('.preset-color').forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            
            const picker = document.getElementById('accent-color-picker');
            if (picker) picker.value = color;
            
            applyConfig();
            soundManager.playClick();
        });
    });

    // Custom color picker input
    document.getElementById('accent-color-picker')?.addEventListener('input', (e) => {
        const color = e.target.value;
        settingsConfig.accentColor = color;
        
        document.querySelectorAll('.preset-color').forEach(p => {
            if (p.getAttribute('data-color').toLowerCase() === color.toLowerCase()) {
                p.classList.add('active');
            } else {
                p.classList.remove('active');
            }
        });
        
        applyConfig();
    });

    // Reset All Data (Custom in-game confirm modal)
    document.getElementById('reset-data-btn')?.addEventListener('click', () => {
        const msg = currentLang === 'tr'
            ? 'Tüm ayarları ve verileri sıfırlamak istediğinize emin misiniz? Bu işlem geri alınamaz.'
            : 'Are you sure you want to reset all settings and data? This action cannot be undone.';
        
        const btnText = currentLang === 'tr' ? 'Evet, Sıfırla' : 'Yes, Reset';
        
        showConfirmModal(msg, () => {
            const keysToRemove = [
                'gta_lang', 'gta_font_size', 'gta_volume', 'gta_music_volume',
                'gta_sfx_volume', 'gta_voiceover_volume', 'gta_sfx', 'gta_music',
                'gta_show_dialogue_text', 'gta_fast_animations', 'gta_allow_box_swap',
                'streamer_enabled', 'streamer_platform',
                'streamer_trigger', 'streamer_min_loyalty', 'streamer_kick_channel',
                'streamer_kick_id', 'streamer_yt_api_key', 'streamer_yt_video_id',
                'music_time', 'gta_accent_color', 'gta_xray_vision', 'gta_banker_personality'
            ];
            keysToRemove.forEach(k => localStorage.removeItem(k));
            sessionStorage.clear();
            
            // Reload page
            window.location.reload();
        }, btnText, 'fa-trash-alt');
    });

    // SFX toggle
    document.getElementById('sfx-toggle')?.addEventListener('click', () => {
        settingsConfig.sfxEnabled = !settingsConfig.sfxEnabled;
        updateSettingsToggleButtons();
        if (settingsConfig.sfxEnabled) {
            soundManager.playTone(659.25, 'triangle', 0.1);
        } else {
            soundManager.playClick();
        }
    });

    // Music toggle
    document.getElementById('music-toggle')?.addEventListener('click', () => {
        settingsConfig.musicEnabled = !settingsConfig.musicEnabled;
        updateSettingsToggleButtons();
        soundManager.toggleMusic(settingsConfig.musicEnabled);
        soundManager.playClick();
    });

    // Voiceover toggle
    document.getElementById('voiceover-toggle')?.addEventListener('click', () => {
        settingsConfig.voiceoverEnabled = !settingsConfig.voiceoverEnabled;
        updateSettingsToggleButtons();
        soundManager.playClick();
    });

    // Streamer controls
    document.getElementById('streamer-toggle')?.addEventListener('click', () => {
        settingsConfig.streamerEnabled = !settingsConfig.streamerEnabled;
        updateSettingsToggleButtons();
        soundManager.playClick();
    });

    document.getElementById('streamer-platform-select')?.addEventListener('change', (e) => {
        settingsConfig.streamerPlatform = e.target.value;
        updateSettingsPlatformGroups();
        soundManager.playClick();
    });

    document.getElementById('streamer-trigger-input')?.addEventListener('input', (e) => {
        settingsConfig.streamerTrigger = e.target.value;
    });

    document.getElementById('streamer-points-input')?.addEventListener('input', (e) => {
        settingsConfig.streamerMinLoyalty = parseInt(e.target.value) || 0;
    });

    
    // Kick Onayla / Bağlan Butonu Mantığı
    const kickConnectBtn = document.getElementById('kick-connect-btn');
    const kickStatusFeedback = document.getElementById('kick-status-feedback');

    async function handleKickConnect() {
        const kickInput = document.getElementById('kick-channel-input');
        const channelName = (kickInput?.value || '').trim();
        if (!channelName) {
            if (kickStatusFeedback) {
                kickStatusFeedback.innerHTML = '<span style="color:#ff3344;"><i class="fas fa-exclamation-circle"></i> Lütfen Kick kanal adınızı yazın!</span>';
            }
            return;
        }

        settingsConfig.kickChannel = channelName;
        settingsConfig.streamerPlatform = 'kick';
        streamerMode.kickChannelName = channelName;
        streamerMode.platform = 'kick';
        streamerMode.enabled = true;
        settingsConfig.streamerEnabled = true;
        updateSettingsToggleButtons();

        if (kickConnectBtn) {
            kickConnectBtn.disabled = true;
            kickConnectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bağlanıyor...';
        }
        if (kickStatusFeedback) {
            kickStatusFeedback.innerHTML = '<span style="color:#ffd700;"><i class="fas fa-spinner fa-spin"></i> Chatroom aranıyor ve bağlanılıyor...</span>';
        }

        try {
            const connected = await streamerMode.connectKick();
            if (connected) {
                if (kickConnectBtn) {
                    kickConnectBtn.innerHTML = '<i class="fas fa-check"></i> Bağlandı!';
                    kickConnectBtn.style.backgroundColor = '#53fc18';
                    kickConnectBtn.style.color = '#000';
                }
                if (kickStatusFeedback) {
                    kickStatusFeedback.innerHTML = `<span style="color:#53fc18;"><i class="fas fa-check-circle"></i> "${channelName}" kanalına bağlandı!</span>`;
                }
                setupStreamerCallbacks();
            } else {
                if (kickConnectBtn) {
                    kickConnectBtn.innerHTML = '<i class="fas fa-redo"></i> Tekrar Dene';
                    kickConnectBtn.style.backgroundColor = '';
                    kickConnectBtn.style.color = '';
                }
                if (kickStatusFeedback) {
                    kickStatusFeedback.innerHTML = '<span style="color:#ff3344;"><i class="fas fa-times-circle"></i> Kanal bulunamadı! Kullanıcı adını kontrol edin.</span>';
                }
            }
        } catch (err) {
            if (kickConnectBtn) {
                kickConnectBtn.innerHTML = '<i class="fas fa-redo"></i> Tekrar Dene';
                kickConnectBtn.style.backgroundColor = '';
                kickConnectBtn.style.color = '';
            }
            if (kickStatusFeedback) {
                kickStatusFeedback.innerHTML = `<span style="color:#ff3344;"><i class="fas fa-times-circle"></i> Bağlantı hatası: ${err.message}</span>`;
            }
        } finally {
            if (kickConnectBtn) kickConnectBtn.disabled = false;
        }
    }

    kickConnectBtn?.addEventListener('click', handleKickConnect);
    document.getElementById('kick-channel-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleKickConnect();
        }
    });

    document.getElementById('kick-channel-input')?.addEventListener('input', (e) => {
        settingsConfig.kickChannel = e.target.value.trim();
        if (typeof streamerMode !== 'undefined') {
            streamerMode.kickChannelName = settingsConfig.kickChannel;
            streamerMode.saveConfig();
        }
    });

    document.getElementById('kick-id-input')?.addEventListener('input', (e) => {
        settingsConfig.kickChannelId = e.target.value.trim();
        if (typeof streamerMode !== 'undefined') {
            streamerMode.kickChannelId = settingsConfig.kickChannelId;
            streamerMode.saveConfig();
        }
    });


    document.getElementById('yt-key-input')?.addEventListener('input', (e) => {
        settingsConfig.ytApiKey = e.target.value.trim();
    });

    document.getElementById('yt-video-input')?.addEventListener('input', (e) => {
        settingsConfig.ytVideoId = e.target.value.trim();
    });

    // Fullscreen
    document.getElementById('fullscreen-toggle')?.addEventListener('click', () => {
        soundManager.playClick();
        toggleFullscreen();
    });

    // Sound test
    document.getElementById('test-sound-btn')?.addEventListener('click', () => {
        soundManager.playTone(261.63, 'sine', 0.25);
        setTimeout(() => soundManager.playTone(329.63, 'sine', 0.25), 100);
        setTimeout(() => soundManager.playTone(392.00, 'sine', 0.25), 200);
        setTimeout(() => soundManager.playTone(523.25, 'sine', 0.35), 300);
    });

    document.addEventListener('fullscreenchange', updateSettingsFullscreenButton);
}

// INITIALIZATION
window.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('contextmenu', e => e.preventDefault());

    try { applyConfig(); } catch(e) { console.error("applyConfig:", e); }
    try { checkMenuBackground(); } catch(e) { console.error("checkMenuBackground:", e); }
    try { loadDares(); } catch(e) { console.error("loadDares:", e); }
    try { loadBoxOwners(); } catch(e) { console.error("loadBoxOwners:", e); }
    try { setupEventListeners(); } catch(e) { console.error("setupEventListeners:", e); }

    const skipIntro = window.location.hash === '#settings';

    // ===== INTRO SCREEN LOGIC =====
    const introScreen = document.getElementById('intro-screen');
    const introVideo = document.getElementById('intro-video-element');

    function startMenuMusic() {
        soundManager.init();
        soundManager.startBackgroundMusic(true);
        musicStarted = true;

        const audio = document.getElementById('menu-music-audio');
        if (audio && audio.paused && localStorage.getItem('gta_music') !== 'false') {
            const events = ['click', 'keydown', 'mousedown', 'touchstart', 'pointerdown'];
            const retryOnGesture = () => {
                soundManager.startBackgroundMusic(true);
                events.forEach(evt => document.removeEventListener(evt, retryOnGesture));
            };
            events.forEach(evt => document.addEventListener(evt, retryOnGesture));
        }
    }

    let introSafetyTimeout = null;
    const preIntroScreen = document.getElementById('pre-intro-screen');
    const preIntroPlayBtn = document.getElementById('pre-intro-play-btn');

    function dismissIntro() {
        if (introSafetyTimeout) {
            clearTimeout(introSafetyTimeout);
            introSafetyTimeout = null;
        }
        if (preIntroScreen) {
            preIntroScreen.classList.remove('active');
        }
        if (introScreen) {
            introScreen.classList.remove('active');
        }
        if (introVideo) {
            try {
                introVideo.pause();
            } catch(e){}
        }
        showScreen('menu-screen');
        startMenuMusic();
    }

    function beginIntro() {
        if (!introVideo) {
            dismissIntro();
            return;
        }

        let isPlaying = false;
        // Video 2 saniyeden uzun süre tamponlanamazsa veya takılırsa siyah ekranda bekletme, doğrudan menüye geç!
        const bufferTimeout = setTimeout(() => {
            if (!isPlaying) {
                console.log("Intro videosu yavaş yüklendi, menüye geçiliyor...");
                dismissIntro();
            }
        }, 2000);

        introVideo.onplaying = () => {
            isPlaying = true;
            clearTimeout(bufferTimeout);
        };

        introVideo.play().then(() => {
            if (introSafetyTimeout) clearTimeout(introSafetyTimeout);
            introSafetyTimeout = setTimeout(() => {
                dismissIntro();
            }, 15000);
        }).catch(() => {
            clearTimeout(bufferTimeout);
            dismissIntro();
        });
    }

    const introSkipBtn = document.getElementById('intro-skip-btn');

    if (skipIntro) {
        if (preIntroScreen) preIntroScreen.classList.remove('active');
        showScreen('settings-screen');
        startMenuMusic();
        initSettingsScreen();
        history.replaceState(null, '', 'index.html');
    } else if (preIntroScreen && preIntroPlayBtn) {
        preIntroPlayBtn.addEventListener('click', () => {
            // Unlock/Initialize AudioContext on user gesture
            soundManager.init();
            
            // Preload namebg.jpg programmatically when intro starts
            const img = new Image();
            img.src = 'assets/images/namebg.jpg';
            
            // Hide pre-intro, show intro screen
            preIntroScreen.classList.remove('active');
            if (introScreen) introScreen.classList.add('active');
            
            // Play video
            beginIntro();
        });

        // Setup skip button
        if (introSkipBtn) {
            introSkipBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dismissIntro();
            });
        }
        
        if (introScreen) {
            introScreen.addEventListener('click', () => {
                dismissIntro();
            });
        }
        
        if (introVideo) {
            introVideo.addEventListener('ended', () => {
                dismissIntro();
            });
            introVideo.addEventListener('error', dismissIntro);
        }
    } else {
        if (preIntroScreen) preIntroScreen.classList.remove('active');
        showScreen('menu-screen');
        startMenuMusic();
    }

    // ===== SETTINGS SCREEN SPA NAVIGATION =====
    let previousScreenBeforeSettings = 'menu-screen';
    const settingsBtn = document.getElementById('settings-btn');
    const gameSettingsBtn = document.getElementById('game-settings-btn');
    const settingsBackBtn = document.getElementById('settings-back-btn');

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            soundManager.playClick();
            previousScreenBeforeSettings = 'menu-screen';
            showScreen('settings-screen');
            try { initSettingsScreen(); } catch(e) { console.error("initSettings:", e); }
        });
    }
    if (gameSettingsBtn) {
        gameSettingsBtn.addEventListener('click', () => {
            soundManager.playClick();
            previousScreenBeforeSettings = 'game-screen';
            // Overlay settings on top of game screen so chat connection is not interrupted!
            document.getElementById('settings-screen').classList.add('active');
            try { initSettingsScreen(); } catch(e) { console.error("initSettings:", e); }
        });
    }
    if (settingsBackBtn) {
        settingsBackBtn.addEventListener('click', () => {
            soundManager.playClick();
            if (streamerMode.enabled) {
                setupStreamerCallbacks();
            }
            if (previousScreenBeforeSettings === 'game-screen') {
                document.getElementById('settings-screen').classList.remove('active');
                restoreEliminatedRewards();
            } else {
                showScreen(previousScreenBeforeSettings);
            }
        });
    }

    // ===== SETTINGS TABS =====
    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            soundManager.playClick();
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = document.getElementById(btn.dataset.tab);
            if (tab) tab.classList.add('active');
        });
    });

    // ===== SETTINGS CONTROLS =====
    initSettingsControls();
});

// Check if menu.png and logo.png exist
function checkMenuBackground() {
    const img = new Image();
    img.src = 'assets/images/menu.png';
    img.onload = () => {
        document.body.classList.add('has-menu-bg');
    };
    img.onerror = () => {
        console.log("menu.png yüklenemedi, varsayılan gradyan arka plan kullanılıyor.");
    };

    const logoImg = document.getElementById('gta-logo');
    if (logoImg) {
        logoImg.onerror = () => {
            logoImg.style.display = 'none';
            console.log("logo.png bulunamadı, logo alanı gizlendi.");
        };
    }
}

// Load Dares from cezalar.txt (with CORS error handling and fallback)
async function loadDares() {
    try {
        const response = await fetch('cezalar.txt');
        if (!response.ok) throw new Error("Dosya yüklenemedi");
        const text = await response.text();
        // Split by lines, trim, and filter out empty lines
        daresList = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
            
        // Ensure we have exactly 24 dares
        if (daresList.length < 24) {
            console.warn(`Cezalar dosyasında ${daresList.length} adet ceza bulundu. 24'e tamamlamak için varsayılanlar ekleniyor.`);
            while (daresList.length < 24) {
                daresList.push(DEFAULT_DARES[daresList.length]);
            }
        } else if (daresList.length > 24) {
            console.warn(`Cezalar dosyasında ${daresList.length} adet ceza bulundu. İlk 24 ceza kullanılacak.`);
            daresList = daresList.slice(0, 24);
        }
    } catch (e) {
        console.warn("CORS kısıtlaması veya dosya eksikliği nedeniyle cezalar.txt yüklenemedi. Varsayılan liste yükleniyor.", e);
        daresList = [...DEFAULT_DARES];
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Menu Buttons
    startBtn.addEventListener('click', () => {
        soundManager.playClick();
        soundManager.init(); // Init audio context on user gesture
        const bankerInput = document.getElementById('banker-name-input');
        if (bankerInput) bankerInput.value = bankerName || 'Hamdi Bey';
        showScreen('name-screen');
        setTimeout(() => {
            if (bankerInput) bankerInput.focus();
        }, 100);
    });

    const nameSubmitBtn = document.getElementById('name-submit-btn');
    if (nameSubmitBtn) {
        nameSubmitBtn.addEventListener('click', () => {
            soundManager.playClick();
            const nameVal = document.getElementById('banker-name-input')?.value.trim();
            bankerName = nameVal || "Hamdi Bey";
            localStorage.setItem('gta_banker_name', bankerName);
            
            applyConfig();
            applySettingsTranslations();
            
            startGame();
        });
    }

    const nameBackBtn = document.getElementById('name-back-btn');
    if (nameBackBtn) {
        nameBackBtn.addEventListener('click', () => {
            soundManager.playClick();
            showScreen('menu-screen');
        });
    }

    const nameInput = document.getElementById('banker-name-input');
    if (nameInput) {
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (nameSubmitBtn) nameSubmitBtn.click();
            }
        });
    }
    
    backToMenuBtn.addEventListener('click', () => {
        soundManager.playClick();
        showConfirmModal(t('confirmMenu'), () => resetToMenu());
    });

    const gameLogBtn = document.getElementById('game-log-btn');
    if (gameLogBtn) {
        gameLogBtn.addEventListener('click', () => {
            soundManager.playClick();
            openGameLogModal();
        });
    }

    initJokerControls();

    // Fullscreen Toggle
    const fullscreenBtn = document.getElementById('gta-fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            soundManager.playClick();
            toggleFullscreen();
        });
    }

    // Modal Close Buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            soundManager.playClick();
            const modalId = btn.getAttribute('data-target');
            if (modalId) closeModal(document.getElementById(modalId));
        });
    });

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });

    // Banker Actions
    dealBtn.addEventListener('click', () => {
        soundManager.playClick();
        soundManager.stopPhoneRing();
        soundManager.stopCallMusic();
        soundManager.stopVoiceover();
        hideGameDim();
        closeModal(bankerModal);
        acceptBankerOffer();
    });

    noDealBtn.addEventListener('click', () => {
        soundManager.playClick();
        soundManager.stopPhoneRing();
        soundManager.stopCallMusic();
        soundManager.stopVoiceover();
        hideGameDim();
        closeModal(bankerModal);
        declineBankerOffer();
    });

    // Restart Button
    restartBtn.addEventListener('click', () => {
        soundManager.playClick();
        closeModal(resultModal);
        startGame(false);
    });

    // Main Menu Button (Using event delegation to be bulletproof)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('#result-menu-btn');
        if (btn) {
            soundManager.playClick();
            closeModal(resultModal);
            resetToMenu();
        }
    });
}

// Populate the dares preview modal
function populateDaresModalList() {
    daresListContainer.innerHTML = '';
    daresList.forEach((dare, index) => {
        const item = document.createElement('div');
        const isHeavy = index < 12;
        item.className = `dare-list-item ${isHeavy ? 'heavy-dare' : 'light-dare'}`;
        item.innerHTML = `
            <span class="rank-badge">${index + 1}</span>
            <span class="dare-text">${dare}</span>
        `;
        daresListContainer.appendChild(item);
    });
}

function openModal(modal) {
    modal.classList.add('active');
}

function closeModal(modal) {
    modal.classList.remove('active');
}

// === CUSTOM MODAL HELPERS ===

function showBoxOpenModal(box, onConfirm) {
    const modal = document.getElementById('box-open-modal');
    const numberEl = document.getElementById('box-open-number');
    const quoteEl = document.getElementById('box-owner-quote');
    const confirmBtn = document.getElementById('box-open-confirm-btn');
    const cancelBtn = document.getElementById('box-open-cancel-btn');

    numberEl.innerText = box.id;

    // Show owner name in modal
    const ownerNameEl = document.getElementById('box-open-owner-name');
    if (ownerNameEl) {
        const names = getBoxNames();
        const rawName = names[box.id - 1] || '';
        ownerNameEl.innerText = rawName ? getPossessiveName(rawName) + ' Kutusu' : '';
        ownerNameEl.style.display = rawName ? 'block' : 'none';
    }
    
    const voiceBoxId = boxVoiceMapping[box.id] || box.id;
    const boxQuotes = BOX_QUOTES[voiceBoxId] || [];
    let quote = "Büyük hissediyorum bu gece!";
    let dialogueIndex = 0;
    
    if (boxQuotes.length > 0) {
        dialogueIndex = Math.floor(Math.random() * boxQuotes.length);
        quote = boxQuotes[dialogueIndex];
    }
    
    let processedQuote = quote;
    if (typeof bankerName !== 'undefined' && bankerName) {
        processedQuote = processedQuote.replace(/Hamdi Bey/g, bankerName);
    }
    quoteEl.innerText = `"${processedQuote}"`;

    const bubbleEl = modal.querySelector('.box-owner-speech-bubble');
    if (bubbleEl) {
        bubbleEl.style.display = settingsConfig.showDialogueText ? 'block' : 'none';
    }

    // Play voiceover for this dialogue
    soundManager.playVoiceover(voiceBoxId, dialogueIndex, quote);

    // Clone buttons to wipe old listeners
    const newConfirm = confirmBtn.cloneNode(true);
    const newCancel = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    newConfirm.addEventListener('click', () => {
        soundManager.stopVoiceover();
        soundManager.playClick();
        closeModal(modal);
        onConfirm();
    });

    newCancel.addEventListener('click', () => {
        soundManager.stopVoiceover();
        soundManager.playClick();
        closeModal(modal);
        // Re-mark box as not opened so player can try again
        box.isOpened = false;
    });

    openModal(modal);
}

function showSwapModal(desc, onSwap, onNoSwap) {
    const modal = document.getElementById('swap-modal');
    const descEl = document.getElementById('swap-modal-desc');
    const yesBtn = document.getElementById('swap-yes-btn');
    const noBtn = document.getElementById('swap-no-btn');

    descEl.innerText = desc;

    const newYes = yesBtn.cloneNode(true);
    const newNo = noBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYes, yesBtn);
    noBtn.parentNode.replaceChild(newNo, noBtn);

    newYes.addEventListener('click', () => {
        soundManager.playClick();
        closeModal(modal);
        onSwap();
    });

    newNo.addEventListener('click', () => {
        soundManager.playClick();
        closeModal(modal);
        onNoSwap();
    });

    openModal(modal);
}

function showConfirmModal(message, onConfirm, yesText = '', yesIcon = '') {
    const modal = document.getElementById('confirm-modal');
    const textEl = document.getElementById('confirm-modal-text');
    const yesBtn = document.getElementById('confirm-yes-btn');
    const noBtn = document.getElementById('confirm-no-btn');

    textEl.innerText = message;
    
    // Set custom text and icon if provided, otherwise preserve defaults
    if (yesText) {
        const iconHtml = yesIcon ? `<i class="fas ${yesIcon}"></i> ` : '<i class="fas fa-sign-out-alt"></i> ';
        yesBtn.innerHTML = `${iconHtml}${yesText}`;
    } else {
        yesBtn.innerHTML = currentLang === 'tr' 
            ? '<i class="fas fa-sign-out-alt"></i> Evet, Dön' 
            : '<i class="fas fa-sign-out-alt"></i> Yes, Return';
    }

    const newYes = yesBtn.cloneNode(true);
    const newNo = noBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYes, yesBtn);
    noBtn.parentNode.replaceChild(newNo, noBtn);

    newYes.addEventListener('click', () => {
        soundManager.playClick();
        closeModal(modal);
        onConfirm();
    });

    newNo.addEventListener('click', () => {
        soundManager.playClick();
        closeModal(modal);
    });

    openModal(modal);
}


// GAME FLOW ACTIONS

function requestFullscreen() {
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(err => console.log("Tam ekran basarisiz: ", err));
    } else if (docEl.mozRequestFullScreen) {
        docEl.mozRequestFullScreen();
    } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
    } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
    }
}

function toggleFullscreen() {
    const btn = document.getElementById('gta-fullscreen-btn');
    const icon = btn ? btn.querySelector('i') : null;

    if (!document.fullscreenElement) {
        requestFullscreen();
        if (icon) icon.className = 'fas fa-compress';
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
        if (icon) icon.className = 'fas fa-expand';
    }
}

// Listen for fullscreen changes to update icon
document.addEventListener('fullscreenchange', () => {
    const btn = document.getElementById('gta-fullscreen-btn');
    const icon = btn ? btn.querySelector('i') : null;
    if (!icon) return;
    icon.className = document.fullscreenElement ? 'fas fa-compress' : 'fas fa-expand';
});

function startGame(fade = true) {
    showScreen('game-screen');

    const dareOverlay = document.getElementById('dare-reveal-overlay');
    if (dareOverlay) {
        dareOverlay.classList.add('hidden');
        dareOverlay.classList.remove('revealing', 'fading', 'light', 'heavy');
    }
    hideGameDim();
    if (dareRevealTimer) clearTimeout(dareRevealTimer);
    if (dareRevealFadeTimer) clearTimeout(dareRevealFadeTimer);

    if (fade) {
        soundManager.stopBackgroundMusic(true);
        soundManager.startGameMusic(true);
    } else {
        soundManager.stopBackgroundMusic(false);
        soundManager.startGameMusic(false);
    }
    
    // Reset state
    currentRound = 0;
    openedBoxesCount = 0;
    playerBox = null;
    acceptedOffer = null;
    eliminatedRanks = new Set();
    gameLog = [];
    isFinalChoice = false;
    resetJokerState();
    playerBoxContainer.classList.add('hidden');
    
    bankerOfferHistory = [];
    currentPoll = null;
    halkJokerActive = false;
    
    const gs = document.getElementById('game-screen');
    if (gs) {
        gs.className = 'screen active mood-balanced';
    }
    
    initBoxVoiceMapping();
    shuffleBoxVoiceMapping();
    
    // Shuffle loaded raw box owners and slice to 24 for this game session
    boxOwnersList = shuffleArray([...loadedRawBoxOwners]).slice(0, 24);
    
    setupStreamerCallbacks();
    activeViewer = null;
    
    // Show/hide manual player badge
    const badge = document.getElementById('player-badge');
    if (badge) {
        if (!streamerMode.enabled && manualPlayerName) {
            document.getElementById('player-badge-name').innerText = manualPlayerName;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
    
    updateRoundIndicator(t('boxSelection'), "hazirlik");
    
    if (streamerMode.enabled) {
        updateQueueUI();
        tryNextViewer();
    } else {
        updateStatusMessage(t('chooseYourBoxDesc'));
    }

    // Setup reward sidebars
    setupSidebars();

    // Shuffle and assign dares to boxes
    const shuffledDares = shuffleArray([...daresList]);
    
    gameBoxes = [];
    for (let i = 1; i <= 24; i++) {
        const dareStr = shuffledDares[i - 1];
        // Rank is determined by the index in the original loaded daresList (1-24)
        const rank = daresList.indexOf(dareStr) + 1;
        gameBoxes.push({
            id: i,
            dare: dareStr,
            rank: rank,
            isOpened: false
        });
    }

    // Render Grid
    renderBoxesGrid();

    addGameLog('game_start', currentLang === 'tr'
        ? 'Oyun başladı — 24 kutu hazır.'
        : 'Game started — 24 boxes ready.');
}

function setupSidebars() {
    leftRewardsList.innerHTML = '';
    rightRewardsList.innerHTML = '';

    // Sol: Hafif cezalar (13-24) — mavi
    for (let i = 12; i < 24; i++) {
        const item = document.createElement('div');
        item.id = `reward-item-${i + 1}`;
        item.className = 'reward-item';
        item.setAttribute('data-rank', i + 1);
        item.innerHTML = `
            <span class="reward-rank blue-title">${i + 1}</span>
            <span class="reward-name">${daresList[i]}</span>
        `;
        leftRewardsList.appendChild(item);
    }

    // Sağ: Ağır cezalar (1-12) — kırmızı
    for (let i = 0; i < 12; i++) {
        const item = document.createElement('div');
        item.id = `reward-item-${i + 1}`;
        item.className = 'reward-item';
        item.setAttribute('data-rank', i + 1);
        item.innerHTML = `
            <span class="reward-name">${daresList[i]}</span>
            <span class="reward-rank red-title">${i + 1}</span>
        `;
        rightRewardsList.appendChild(item);
    }
}

function renderBoxesGrid() {
    boxesGrid.innerHTML = '';
    const boxNames = getBoxNames();
    gameBoxes.forEach(box => {
        const boxDiv = document.createElement('div');
        boxDiv.id = `box-${box.id}`;
        const ownerName = boxNames[box.id - 1] || '';

        const numEl = document.createElement('div');
        numEl.className = 'box-number-label';
        numEl.innerText = box.id;

        const nameEl = document.createElement('div');
        nameEl.className = 'box-owner-label';
        nameEl.innerText = ownerName;

        if (playerBox && playerBox.id === box.id) {
            boxDiv.className = 'box player-selected';
            boxDiv.appendChild(numEl);
            if (ownerName) boxDiv.appendChild(nameEl);
        } else if (box.isOpened) {
            boxDiv.className = 'box opened';
        } else {
            boxDiv.className = 'box';
            boxDiv.appendChild(numEl);
            if (ownerName) boxDiv.appendChild(nameEl);

            // X-Ray Vision overlay
            if (settingsConfig.xrayVision) {
                const xrayEl = document.createElement('span');
                const isHeavy = box.rank <= 12; // rank 1-12 = heavy
                xrayEl.className = `xray-text ${isHeavy ? 'xray-red' : 'xray-blue'}`;
                xrayEl.innerText = box.dare;
                boxDiv.appendChild(xrayEl);
            }
        }

        boxDiv.addEventListener('click', () => handleBoxClick(box));
        boxesGrid.appendChild(boxDiv);
    });
}

function handleBoxClick(box) {
    if (isRandomSelecting) return;

    if (isFinalChoice) {
        const lastRemainingBox = gameBoxes.find(b => b.id !== playerBox.id && !b.isOpened);
        if (box.id === playerBox.id || (lastRemainingBox && box.id === lastRemainingBox.id)) {
            isFinalChoice = false;

            const playerBoxDiv = document.getElementById(`box-${playerBox.id}`);
            const lastBoxDiv = lastRemainingBox ? document.getElementById(`box-${lastRemainingBox.id}`) : null;
            if (playerBoxDiv) playerBoxDiv.classList.remove('final-choice');
            if (lastBoxDiv) lastBoxDiv.classList.remove('final-choice');

            if (lastRemainingBox && box.id === lastRemainingBox.id) {
                const oldId = playerBox.id;
                playerBox = lastRemainingBox;
                addGameLog('swap', currentLang === 'tr'
                    ? `Kutu değiştirildi: Kutu ${oldId} yerine Kutu ${playerBox.id} seçildi ve açıldı`
                    : `Box swapped: Selected Box ${playerBox.id} instead of Box ${oldId} and opened it`);
                soundManager.playTone(587, 'sine', 0.2, 0, 0.1);
            } else {
                addGameLog('swap', currentLang === 'tr'
                    ? `Kendi kutusu (Kutu ${playerBox.id}) seçildi ve açıldı`
                    : `Own box (Box ${playerBox.id}) selected and opened`);
            }

            playerBox.isOpened = true;
            endGame(false);
        }
        return;
    }

    if (box.isOpened) return;

    // Phase 1: Player selects their own box
    if (playerBox === null) {
        playerBox = box;
        box.isOpened = true; // Mark as selected/opened so they can't open it during game
        
        const boxDiv = document.getElementById(`box-${box.id}`);
        boxDiv.className = 'box player-selected';
        
        // Show in bottom container
        playerBoxContainer.classList.remove('hidden');
        playerBoxEl.innerText = box.id;
        
        soundManager.playTone(523, 'sine', 0.3, 0, 0.1); // Happy select note
        
        // Advance to round 1
        currentRound = 1;
        boxesToOpenInRound = roundConfig[currentRound - 1];
        
        if (streamerMode.enabled) {
            activeViewer = null; // Clear so next viewer gets selected
            updateRoundIndicator(t('roundTitle', {n: 1}), "aktif");
            tryNextViewer();
        } else {
            updateRoundIndicator(t('roundTitle', {n: 1}), "aktif");
            updateStatusMessage(t('boxSelectedMsg', {count: boxesToOpenInRound}));
        }

        addGameLog('player_box', currentLang === 'tr'
            ? `Oyuncu kutusu seçildi: Kutu ${box.id} — "${box.dare}" (sıra ${box.rank})`
            : `Player box selected: Box ${box.id} — "${box.dare}" (rank ${box.rank})`);
        updateJokerButtonUI();
        return;
    }

    // Phase 2: Opening boxes during a round
    if (boxesToOpenInRound > 0) {
        if (streamerMode.enabled && !activeViewer) {
            if (!tryNextViewer()) {
                return;
            }
        }

        // Show box-open confirmation modal
        showBoxOpenModal(box, () => {
            doOpenBox(box);
        });
    }
}

function getDareSpeedBaseMs() {
    const speed = Math.max(1, Math.min(10, settingsConfig.dareRevealSpeed || 5));
    return Math.round(5500 - ((speed - 1) * 5000) / 9);
}

function applyDareSpeedCSSVars() {
    const totalMs = getDareSpeedBaseMs();
    const flashMs = Math.round(totalMs * 0.42);
    const fadeMs = Math.round(totalMs * 0.58);
    document.documentElement.style.setProperty('--dare-flash-duration', `${flashMs}ms`);
    document.documentElement.style.setProperty('--dare-fade-duration', `${fadeMs}ms`);
    document.documentElement.style.setProperty('--dare-fade-delay', `${flashMs}ms`);
}

function getDareRevealDuration() {
    let ms = getDareSpeedBaseMs();
    if (settingsConfig.fastAnimations) ms = Math.round(ms * 0.45);
    return ms;
}

function getDareSidebarAnimDuration() {
    return getDareSpeedBaseMs();
}

function formatGameLogTime(date = new Date()) {
    const locale = currentLang === 'tr' ? 'tr-TR' : 'en-US';
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function addGameLog(type, message, variant) {
    gameLog.push({ time: formatGameLogTime(), type, message, variant: variant || null });
    updateGameLogUI();
}

function getGameLogEntryClass(entry) {
    if (entry.type === 'box_open') {
        return entry.variant === 'heavy' ? 'game-log-box_open_heavy' : 'game-log-box_open_light';
    }
    if (entry.type === 'game_end') {
        return entry.variant === 'heavy' ? 'game-log-game_end_heavy' : 'game-log-game_end_light';
    }
    if (entry.type === 'joker_ahmet' || entry.type === 'joker_bonkor') {
        return `game-log-${entry.type}`;
    }
    return `game-log-${entry.type}`;
}

function updateGameLogUI() {
    const list = document.getElementById('game-log-list');
    if (!list) return;

    if (gameLog.length === 0) {
        list.innerHTML = `<p class="game-log-empty">${t('gameLogEmpty')}</p>`;
        return;
    }

    list.innerHTML = gameLog.map(entry => `
        <div class="game-log-entry ${getGameLogEntryClass(entry)}">
            <span class="game-log-time">${entry.time}</span>
            <span class="game-log-msg">${entry.message}</span>
        </div>
    `).join('');
}

function openGameLogModal() {
    updateGameLogUI();
    const modal = document.getElementById('game-log-modal');
    if (modal) openModal(modal);
}

function resetJokerState() {
    jokerState = {
        ahmetUsed: false,
        bonkorUsed: false,
        bonkorActive: false,
        halkUsed: false,
        sigortaUsed: false,
        insuranceActive: false
    };
    updateJokerButtonUI();
    try {
        updateInsuranceUI();
    } catch(e) {}
}

function getJokersRemaining() {
    let count = 0;
    if (!jokerState.ahmetUsed) count++;
    if (!jokerState.bonkorUsed) count++;
    if (!jokerState.halkUsed) count++;
    if (!jokerState.sigortaUsed) count++;
    return count;
}

function canUseAhmetJoker() {
    if (jokerState.ahmetUsed || !playerBox) return false;
    if (boxesToOpenInRound <= 0) return false;
    const unopened = gameBoxes.filter(b => b.id !== playerBox.id && !b.isOpened);
    return unopened.length > 0;
}

function canUseBonkorJoker() {
    if (jokerState.bonkorUsed || !playerBox) return false;
    return !jokerState.bonkorActive;
}

function canUseHalkJoker() {
    if (jokerState.halkUsed || !playerBox || halkJokerActive) return false;
    if (boxesToOpenInRound <= 0) return false;
    const unopened = gameBoxes.filter(b => b.id !== playerBox.id && !b.isOpened);
    return unopened.length > 0;
}

function canUseSigortaJoker() {
    if (jokerState.sigortaUsed || !playerBox || jokerState.insuranceActive) return false;
    if (boxesToOpenInRound <= 0) return false;
    const unopened = gameBoxes.filter(b => b.id !== playerBox.id && !b.isOpened);
    return unopened.length > 0;
}

function updateJokerButtonUI() {
    const btn = document.getElementById('game-joker-btn');
    const badge = document.getElementById('game-joker-count');
    if (!btn) return;

    if (!playerBox) {
        btn.classList.add('hidden');
        return;
    }

    btn.classList.remove('hidden');
    const remaining = getJokersRemaining();
    if (badge) badge.innerText = remaining;

    btn.disabled = remaining === 0;
}

function syncJokerModalTranslations() {
    const setText = (id, key) => {
        const el = document.getElementById(id);
        if (el) el.innerText = t(key);
    };
    const setHtml = (id, html) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    };

    setHtml('joker-select-title', `<i class="fas fa-star"></i> ${t('jokerSelectTitle')}`);
    setText('joker-select-desc', 'jokerSelectDesc');
    setText('joker-ahmet-name', 'jokerAhmetName');
    setText('joker-ahmet-desc', 'jokerAhmetDesc');
    setText('joker-bonkor-name', 'jokerBonkorName');
    setText('joker-bonkor-desc', 'jokerBonkorDesc');
    setText('joker-halk-name', 'jokerHalkName');
    setText('joker-halk-desc', 'jokerHalkDesc');
    setText('joker-sigorta-name', 'jokerSigortaName');
    setText('joker-sigorta-desc', 'jokerSigortaDesc');
    syncJokerCardStates();
}

function syncJokerCardStates() {
    const ahmetBtn = document.getElementById('joker-ahmet-btn');
    const bonkorBtn = document.getElementById('joker-bonkor-btn');
    const halkBtn = document.getElementById('joker-halk-btn');
    const sigortaBtn = document.getElementById('joker-sigorta-btn');

    const ahmetTag = document.getElementById('joker-ahmet-tag');
    const bonkorTag = document.getElementById('joker-bonkor-tag');
    const halkTag = document.getElementById('joker-halk-tag');
    const sigortaTag = document.getElementById('joker-sigorta-tag');

    if (ahmetBtn) {
        ahmetBtn.disabled = !canUseAhmetJoker();
        if (ahmetTag) {
            ahmetTag.innerText = jokerState.ahmetUsed ? t('jokerUsed') : t('jokerAvailable');
        }
    }
    if (bonkorBtn) {
        bonkorBtn.disabled = !canUseBonkorJoker();
        if (bonkorTag) {
            if (jokerState.bonkorUsed && jokerState.bonkorActive) {
                bonkorTag.innerText = t('jokerActiveBonkor');
            } else if (jokerState.bonkorUsed) {
                bonkorTag.innerText = t('jokerUsed');
            } else {
                bonkorTag.innerText = t('jokerAvailable');
            }
        }
    }
    if (halkBtn) {
        halkBtn.disabled = !canUseHalkJoker();
        if (halkTag) {
            halkTag.innerText = jokerState.halkUsed ? t('jokerUsed') : t('jokerAvailable');
        }
    }
    if (sigortaBtn) {
        sigortaBtn.disabled = !canUseSigortaJoker();
        if (sigortaTag) {
            if (jokerState.sigortaUsed && jokerState.insuranceActive) {
                sigortaTag.innerText = t('jokerActiveSigorta');
            } else if (jokerState.sigortaUsed) {
                sigortaTag.innerText = t('jokerUsed');
            } else {
                sigortaTag.innerText = t('jokerAvailable');
            }
        }
    }
}

function openJokerSelectModal() {
    if (getJokersRemaining() === 0) {
        updateStatusMessage(t('jokerAllUsed'), { highlight: true });
        return;
    }
    syncJokerModalTranslations();
    openModal(document.getElementById('joker-select-modal'));
}

function pickRandomUnopenedBox() {
    const unopened = gameBoxes.filter(b => b.id !== playerBox.id && !b.isOpened);
    if (unopened.length === 0) return null;
    return unopened[Math.floor(Math.random() * unopened.length)];
}

function executeAhmetJoker() {
    if (!canUseAhmetJoker()) {
        updateStatusMessage(t('jokerAhmetNoBoxes'), { highlight: true });
        return;
    }

    const box = pickRandomUnopenedBox();
    if (!box) return;

    jokerState.ahmetUsed = true;
    closeModal(document.getElementById('joker-select-modal'));

    updateStatusMessage(t('jokerAhmetConsulting'), { highlight: true });
    updateJokerButtonUI();
    syncJokerCardStates();
    showGameDim(false);

    // Disable interactions during selection
    isRandomSelecting = true;

    let audioFinished = false;
    let rouletteFinished = false;

    function attemptOpen() {
        if (audioFinished && rouletteFinished) {
            isRandomSelecting = false;
            const msg = t('jokerAhmetPicked', { id: box.id });
            updateStatusMessage(msg, { highlight: true });
            addGameLog('joker_ahmet', currentLang === 'tr'
                ? `Ahmet Dayı'ya danışıldı — rastgele Kutu ${box.id} seçildi`
                : `Consulted Ahmet Dayı — randomly picked Box ${box.id}`);
            doOpenBox(box);
        }
    }

    // Start playing Ahmet Dayi's sound
    soundManager.playAhmetDayiJokerSound(() => {
        audioFinished = true;
        attemptOpen();
    });

    // Run the beautiful roulette animation
    animateRandomSelection(box, () => {
        rouletteFinished = true;
        attemptOpen();
    });
}

function animateRandomSelection(targetBox, onComplete) {
    const availableBoxes = gameBoxes.filter(b => b.id !== playerBox.id && !b.isOpened);
    if (availableBoxes.length === 0) {
        onComplete();
        return;
    }

    const targetIndex = availableBoxes.findIndex(b => b.id === targetBox.id);
    if (targetIndex === -1) {
        onComplete();
        return;
    }

    const startDelay = 40;
    const endDelay = 350;
    const totalSteps = 16 + Math.floor(Math.random() * 4); // 16 to 19 steps
    const len = availableBoxes.length;

    let step = 0;

    function runStep() {
        // Clear previous highlight classes
        availableBoxes.forEach(b => {
            const el = document.getElementById(`box-${b.id}`);
            if (el) {
                el.classList.remove('shuffling-highlight');
            }
        });

        // Calculate current box index so we end exactly at targetIndex
        const currIdx = ((targetIndex - (totalSteps - 1 - step)) % len + len) % len;
        const currentBox = availableBoxes[currIdx];

        const el = document.getElementById(`box-${currentBox.id}`);
        if (el) {
            el.classList.add('shuffling-highlight');
            // Play a soft mechanical click sound
            soundManager.playTone(1000 + step * 20, 'triangle', 0.03, 0, 0.04);
        }

        step++;
        if (step < totalSteps) {
            const t = step / (totalSteps - 1);
            const nextDelay = startDelay + (endDelay - startDelay) * (t * t);
            setTimeout(runStep, nextDelay);
        } else {
            flashLandedBox(targetBox, onComplete);
        }
    }

    runStep();
}

function flashLandedBox(targetBox, onComplete) {
    const el = document.getElementById(`box-${targetBox.id}`);
    if (!el) {
        onComplete();
        return;
    }

    el.classList.remove('shuffling-highlight');
    el.classList.add('selected-landing');

    // Play a final success bell/sound!
    soundManager.playTone(523.25, 'sine', 0.15, 0, 0.12);
    setTimeout(() => soundManager.playTone(659.25, 'sine', 0.2, 0, 0.12), 80);

    setTimeout(() => {
        el.classList.remove('selected-landing');
        onComplete();
    }, 250); // Fast landing flash transition (250ms)
}

function activateBonkorJoker() {
    if (!canUseBonkorJoker()) return;

    jokerState.bonkorUsed = true;
    jokerState.bonkorActive = true;

    closeModal(document.getElementById('joker-select-modal'));
    updateStatusMessage(t('jokerBonkorActivated'), { highlight: true, heavy: false, light: true });
    addGameLog('joker_bonkor', currentLang === 'tr'
        ? 'Bonkör Bankacı jokeri kullanıldı — sonraki teklif güzelleştirilecek'
        : 'Generous Banker joker used — next offer will be improved');

    updateJokerButtonUI();
    syncJokerCardStates();
    soundManager.playTone(659, 'sine', 0.25, 0, 0.12);
}

function initJokerControls() {
    document.getElementById('game-joker-btn')?.addEventListener('click', () => {
        if (isRandomSelecting) return;
        soundManager.playClick();
        openJokerSelectModal();
    });

    document.getElementById('joker-ahmet-btn')?.addEventListener('click', () => {
        if (!canUseAhmetJoker()) return;
        soundManager.playClick();
        executeAhmetJoker();
    });

    document.getElementById('joker-bonkor-btn')?.addEventListener('click', () => {
        if (!canUseBonkorJoker()) return;
        soundManager.playClick();
        activateBonkorJoker();
    });

    document.getElementById('joker-halk-btn')?.addEventListener('click', () => {
        if (!canUseHalkJoker()) return;
        soundManager.playClick();
        executeHalkJoker();
    });

    document.getElementById('joker-sigorta-btn')?.addEventListener('click', () => {
        if (!canUseSigortaJoker()) return;
        soundManager.playClick();
        executeSigortaJoker();
    });
}

function markRewardEliminated(rank, animate = false) {
    const rewardEl = document.getElementById(`reward-item-${rank}`);
    if (!rewardEl) return;

    const isHeavy = rank <= 12;
    rewardEl.classList.remove('eliminating', 'eliminated', 'light-dare', 'heavy-dare');

    if (animate) {
        void rewardEl.offsetWidth;
        rewardEl.classList.add('eliminating', isHeavy ? 'heavy-dare' : 'light-dare');

        const finish = () => {
            rewardEl.classList.remove('eliminating');
            rewardEl.classList.add('eliminated', isHeavy ? 'heavy-dare' : 'light-dare');
        };

        const onEnd = (e) => {
            if (e.animationName !== 'dare-fadeout') return;
            rewardEl.removeEventListener('animationend', onEnd);
            finish();
        };
        rewardEl.addEventListener('animationend', onEnd);
        setTimeout(() => {
            if (rewardEl.classList.contains('eliminating')) finish();
        }, getDareSidebarAnimDuration() + 100);
    } else {
        rewardEl.classList.add('eliminated', isHeavy ? 'heavy-dare' : 'light-dare');
    }
}

function restoreEliminatedRewards() {
    eliminatedRanks.forEach(rank => markRewardEliminated(rank, false));
}

let dareRevealTimer = null;
let dareRevealFadeTimer = null;

function showGameDim(strong = false) {
    const dim = document.getElementById('game-dim-overlay');
    if (!dim) return;
    dim.classList.remove('hidden');
    dim.classList.remove('active', 'strong');
    void dim.offsetWidth;
    requestAnimationFrame(() => {
        dim.classList.add('active');
        if (strong) dim.classList.add('strong');
    });
}

function hideGameDim() {
    const dim = document.getElementById('game-dim-overlay');
    if (!dim) return;
    dim.classList.remove('active', 'strong');
    setTimeout(() => {
        if (!dim.classList.contains('active')) {
            dim.classList.add('hidden');
        }
    }, 900);
}

function showDareReveal(box, isInsured = false) {
    const overlay = document.getElementById('dare-reveal-overlay');
    const kicker = document.getElementById('dare-reveal-kicker');
    const text = document.getElementById('dare-reveal-text');
    if (!overlay || !text) return;

    const isHeavy = box.rank <= 12;

    showGameDim(false);

    if (dareRevealTimer) clearTimeout(dareRevealTimer);
    if (dareRevealFadeTimer) clearTimeout(dareRevealFadeTimer);

    overlay.classList.remove('hidden', 'revealing', 'fading', 'light', 'heavy', 'insured-card');
    void overlay.offsetWidth;
    
    const duration = getDareRevealDuration();
    const fadeDuration = settingsConfig.fastAnimations ? 300 : 900;
    const displayTime = Math.max(800, duration - fadeDuration);

    if (isInsured) {
        overlay.classList.add('revealing', 'insured-card');
    } else {
        overlay.classList.add('revealing', isHeavy ? 'heavy' : 'light');
    }
    overlay.style.animationDuration = ''; // reset

    if (kicker) {
        if (isInsured) {
            kicker.innerText = currentLang === 'tr'
                ? `Kutu ${box.id} — SİGORTALANDI 🛡️`
                : `Box ${box.id} — INSURED 🛡️`;
        } else {
            kicker.innerText = currentLang === 'tr'
                ? `Kutu ${box.id} — Elenen Ceza`
                : `Box ${box.id} — Eliminated Dare`;
        }
    }
    
    if (isInsured) {
        text.innerText = currentLang === 'tr'
            ? `"${box.dare}" Cezası İptal Edildi!`
            : `"${box.dare}" Dare Cancelled!`;
    } else {
        text.innerText = box.dare;
    }

    dareRevealTimer = setTimeout(() => {
        overlay.classList.remove('revealing');
        overlay.classList.add('fading');
        overlay.style.animationDuration = `${fadeDuration}ms`;
        
        dareRevealFadeTimer = setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.classList.remove('fading', 'light', 'heavy', 'insured-card');
            overlay.style.animationDuration = '';
            if (!bankerModal.classList.contains('active')) {
                hideGameDim();
            }
        }, fadeDuration);
    }, displayTime);
}

function doOpenBox(box) {
    box.isOpened = true;
    openedBoxesCount++;
    boxesToOpenInRound--;

    clearRecommendationHighlights();

    const boxDiv = document.getElementById(`box-${box.id}`);
    boxDiv.className = 'box opened';
    boxDiv.innerText = '';

    const isHeavy = box.rank <= 12;
    
    // Sigorta Kontrolü
    let isInsured = false;
    if (jokerState.insuranceActive) {
        jokerState.insuranceActive = false;
        updateInsuranceUI();
        if (isHeavy) {
            isInsured = true;
        } else {
            addGameLog('insurance_waste', currentLang === 'tr'
                ? `Sigorta boşa gitti — Kutu ${box.id} hafif ceza içeriyordu (sıra ${box.rank})`
                : `Insurance wasted — Box ${box.id} contained a light dare (rank ${box.rank})`);
        }
    }

    if (isInsured) {
        soundManager.playTone(392, 'sine', 0.15); // G4
        setTimeout(() => soundManager.playTone(523.25, 'sine', 0.25), 100); // C5
        setTimeout(() => soundManager.playTone(659.25, 'sine', 0.35), 200); // E5
    } else {
        soundManager.playOpenBox(isHeavy);
    }

    const openedMsg = isInsured
        ? (currentLang === 'tr'
            ? `Kutu ${box.id} Açıldı: "${box.dare}" SİGORTALANDI ve İptal Edildi! 🛡️`
            : `Box ${box.id} Opened: "${box.dare}" INSURED and Cancelled! 🛡️`)
        : ((streamerMode.enabled && activeViewer)
            ? (currentLang === 'tr'
                ? `${activeViewer.name}, Kutu ${box.id}'ü açtı: "${box.dare}" elendi!`
                : `${activeViewer.name} opened Box ${box.id}: "${box.dare}" eliminated!`)
            : t('boxOpenedMsg', {id: box.id, dare: box.dare}));

    showDareReveal(box, isInsured);
    updateStatusMessage(openedMsg, { highlight: true, heavy: isHeavy && !isInsured, light: !isHeavy || isInsured });
    
    if (isInsured) {
        // Mark as insured in the list
        eliminateReward(box.rank);
        const rewardEl = document.getElementById(`reward-item-${box.rank}`);
        if (rewardEl) {
            rewardEl.classList.add('insured');
        }
        addGameLog('box_open', currentLang === 'tr'
            ? `Kutu ${box.id} açıldı: "${box.dare}" SİGORTALANDI (sıra ${box.rank})`
            : `Box ${box.id} opened: "${box.dare}" INSURED (rank ${box.rank})`,
            'light');
    } else {
        eliminateReward(box.rank);
        addGameLog('box_open', currentLang === 'tr'
            ? `Kutu ${box.id} açıldı: "${box.dare}" elendi (sıra ${box.rank})`
            : `Box ${box.id} opened: "${box.dare}" eliminated (rank ${box.rank})`,
            isHeavy ? 'heavy' : 'light');
    }

    // Update background color based on remaining risks

    if (streamerMode.enabled) {
        activeViewer = null;
    }

    const afterReveal = () => {
        if (streamerMode.enabled) {
            tryNextViewer();
        } else {
            updateStatusMessage(t('boxesLeftMsg', {count: boxesToOpenInRound}), { highlight: false });
        }
    };

    if (boxesToOpenInRound === 0) {
        setTimeout(() => triggerBankerCall(), getDareRevealDuration());
    } else {
        setTimeout(afterReveal, getDareRevealDuration());
    }
}


function eliminateReward(rank) {
    if (eliminatedRanks.has(rank)) {
        markRewardEliminated(rank, false);
        return;
    }

    eliminatedRanks.add(rank);
    markRewardEliminated(rank, true);

    const rewardEl = document.getElementById(`reward-item-${rank}`);
    if (rewardEl) {
        rewardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// HAMDI BEY (BANKER) CALL MECHANICS
function triggerBankerCall() {
    updateStatusMessage(t('bankerCallingMsg'));
    updateRoundIndicator(t('bankerOfferIndicator'), "teklif");

    const offer = calculateBankerOffer();
    bankerOfferText.innerText = offer.dare;
    bankerOfferText.setAttribute('data-rank', offer.rank);

    // Record to history
    bankerOfferHistory.push({
        round: currentRound,
        rank: offer.rank,
        dare: offer.dare
    });

    addGameLog('banker_offer', currentLang === 'tr'
        ? `${bankerName} teklifi: "${offer.dare}" (sıra ${offer.rank})`
        : `${bankerName} offer: "${offer.dare}" (rank ${offer.rank})`);

    const preDelay = settingsConfig.fastAnimations ? 200 : 600;

    setTimeout(() => {
        showGameDim(true);
        soundManager.startCallMusic(true);

        soundManager.playPhoneRing(() => {
            soundManager.playBankerCallingSound();
            openModal(bankerModal);
            
            // Start oylama (voting) in both modes
            startBankerPoll();
        });
    }, preDelay);
}

function calculateBankerOffer() {
    // Get all remaining unopened dares (including player's own box)
    const remainingBoxes = gameBoxes.filter(b => b.id === playerBox.id || !b.isOpened);
    
    // Calculate average rank
    const sumRanks = remainingBoxes.reduce((sum, b) => sum + b.rank, 0);
    const averageRank = sumRanks / remainingBoxes.length;
    
    // Rank 1 = HEAVIEST dare, Rank 24 = LIGHTEST dare.
    // Banker always biases heavier: offer is worse than average (lower index = heavier)
    // Bias: banker offers 2 ranks heavier than average (greedier/meaner)
    let offerIndex = Math.round(averageRank) - 1;
    offerIndex = Math.max(0, offerIndex - 2); // bias toward heavier
    
    // Banker personality adjustments:
    // Generous (cömert): shifts toward lighter (higher index = lighter)
    // Stingy (cimri): shifts toward even heavier (lower index = heavier)
    const personality = settingsConfig.bankerPersonality || 'balanced';
    if (personality === 'generous') {
        offerIndex += 4; // lighter dare
    } else if (personality === 'stingy') {
        offerIndex -= 2; // even heavier dare
    }

    if (jokerState.bonkorActive) {
        offerIndex += 6;
        jokerState.bonkorActive = false;
    }
    
    // Bound check
    offerIndex = Math.max(0, Math.min(23, offerIndex));
    
    return {
        dare: daresList[offerIndex],
        rank: offerIndex + 1
    };
}

function acceptBankerOffer() {
    endBankerPoll();
    acceptedOffer = bankerOfferText.innerText;
    addGameLog('deal_accept', currentLang === 'tr'
        ? `Teklif kabul edildi: "${acceptedOffer}"`
        : `Deal accepted: "${acceptedOffer}"`);
    endGame(true);
}

function declineBankerOffer() {
    endBankerPoll();
    addGameLog('deal_decline', currentLang === 'tr'
        ? 'Teklif reddedildi — kutu açmaya devam.'
        : 'Offer declined — continuing to open boxes.');
    // Check if we have more rounds
    if (currentRound < roundConfig.length) {
        currentRound++;
        boxesToOpenInRound = roundConfig[currentRound - 1];
        
        // If we only have 1 unopened box left on the grid (besides the player's box),
        // we've reached the final swap phase instead of opening!
        const unopenedGridBoxes = gameBoxes.filter(b => b.id !== playerBox.id && !b.isOpened);
        
        if (unopenedGridBoxes.length === 1) {
            // Trigger final round (swap choice)
            triggerFinalChoice(unopenedGridBoxes[0]);
        } else {
            if (streamerMode.enabled) {
                updateRoundIndicator(t('roundTitle', {n: currentRound}), "aktif");
                tryNextViewer();
            } else {
                updateRoundIndicator(t('roundTitle', {n: currentRound}), "aktif");
                updateStatusMessage(t('declineOfferMsg', {count: boxesToOpenInRound}));
            }
        }
    } else {
        // Safe check: if somehow out of rounds, end game
        endGame(false);
    }
}

// FINAL CHOICE PHASE (Swap Box or Open Player's Box)
function triggerFinalChoice(lastRemainingBox) {
    updateRoundIndicator(t('finalIndicator'), "final");
    
    const delay = settingsConfig.fastAnimations ? 300 : 1000;
    
    setTimeout(() => {
        isFinalChoice = true;
        
        // Add visual cues to the final two choice boxes
        const playerBoxDiv = document.getElementById(`box-${playerBox.id}`);
        const lastBoxDiv = document.getElementById(`box-${lastRemainingBox.id}`);
        if (playerBoxDiv) playerBoxDiv.classList.add('final-choice');
        if (lastBoxDiv) lastBoxDiv.classList.add('final-choice');

        const msg = currentLang === 'tr'
            ? `Son 2 kutu kaldı! Kendi kutunu (Kutu ${playerBox.id}) açmak için kendi kutuna, diğer kutuyu (Kutu ${lastRemainingBox.id}) açmak için diğer kutuya tıkla!`
            : `Only 2 boxes left! Click your box (Box ${playerBox.id}) to open it, or click the other box (Box ${lastRemainingBox.id}) to swap & open it!`;
        updateStatusMessage(msg, { highlight: true });
    }, delay);
}

// END GAME / RESULT DISPLAY
function endGame(viaDeal) {
    soundManager.stopGameMusic(true);
    let resultDare = "";
    
    if (viaDeal) {
        resultDare = acceptedOffer;
        resultTitle.innerText = t('dealAcceptedTitle');
        resultSourceText.innerText = t('dealAcceptedDesc');
        
        // Decide fanfare: rank 1-12 = HEAVY (bad = lose), rank 13-24 = LIGHT (good = win)
        const offerRank = daresList.indexOf(resultDare) + 1;
        if (offerRank > 12) {
            soundManager.playWinFanfare(); // light dare = good news
        } else {
            soundManager.playLoseFanfare(); // heavy dare = bad news
        }
    } else {
        resultDare = playerBox.dare;
        resultTitle.innerText = t('boxOpenedTitle');
        resultSourceText.innerText = t('boxOpenedDesc', {playerBoxId: playerBox.id});
        
        if (playerBox.rank > 12) {
            soundManager.playWinFanfare(); // light dare = lucky
        } else {
            soundManager.playLoseFanfare(); // heavy dare = unlucky
        }
    }
    
    finalDareText.innerText = resultDare;

    const rank = daresList.indexOf(resultDare) + 1;

    addGameLog('game_end', currentLang === 'tr'
        ? `Oyun bitti — ceza: "${resultDare}"`
        : `Game over — dare: "${resultDare}"`,
        rank <= 12 ? 'heavy' : 'light');
    
    // Apply styling based on severity: rank 1-12 = heavy = red, rank 13-24 = light = blue
    if (rank <= 12) {
        finalDareText.style.color = 'var(--red-color)';
        finalDareText.parentElement.style.borderColor = 'var(--red-color)';
    } else {
        finalDareText.style.color = 'var(--blue-color)';
        finalDareText.parentElement.style.borderColor = 'var(--blue-color)';
    }

    try {
        showEndGameAnalysis(viaDeal, resultDare);
    } catch (e) {
        console.error("showEndGameAnalysis failed:", e);
    }

    openModal(resultModal);
}

function resetToMenu() {
    soundManager.stopPhoneRing();
    soundManager.stopVoiceover();
    hideGameDim();
    closeModal(bankerModal);
    const callAudio = document.getElementById('call-music-audio');
    if (callAudio) { callAudio.pause(); callAudio.volume = 0; }
    soundManager.stopGameMusic(true);
    soundManager.startBackgroundMusic(false);
    streamerMode.disconnect();
    const badge = document.getElementById('player-badge');
    if (badge) badge.classList.add('hidden');
    showScreen('menu-screen');
}

// HELPER FUNCTIONS
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function updateRoundIndicator(text, stateClass) {
    roundIndicator.innerText = text;
    roundIndicator.className = `badge ${stateClass}`;
}

function updateStatusMessage(text, options = {}) {
    statusMessage.innerText = text;
    const highlight = options.highlight === true;
    statusMessage.classList.toggle('status-highlight', highlight);
    statusMessage.classList.toggle('status-heavy', highlight && options.heavy === true);
    statusMessage.classList.toggle('status-light', highlight && options.light === true);
    if (!highlight) {
        statusMessage.classList.remove('status-heavy', 'status-light');
    }
}

/* ==========================================================================
   NEW FEATURES IMPLEMENTATION
   ========================================================================== */

/* 1. DYNAMIC STUDIO LIGHTING (REMOVED) */
function updateStudioLighting() {
}

/* 2. KUTU SİGORTASI BADGE IN STATUS PANEL */
function updateInsuranceUI() {
    const panel = document.querySelector('.status-panel');
    if (!panel) return;

    // Clear old badge
    panel.querySelector('.insurance-active-badge')?.remove();

    if (jokerState.insuranceActive) {
        const badge = document.createElement('div');
        badge.className = 'insurance-active-badge';
        badge.innerHTML = `<i class="fas fa-shield-halved"></i> <span>${currentLang === 'tr' ? 'SİGORTA' : 'SHIELD'}</span>`;
        panel.appendChild(badge);
    }
}

/* 3. HALKIN SESİ JOKER */
function executeHalkJoker() {
    if (!canUseHalkJoker()) return;

    jokerState.halkUsed = true;
    closeModal(document.getElementById('joker-select-modal'));
    updateJokerButtonUI();
    syncJokerCardStates();

    updateStatusMessage(t('jokerHalkVoting'), { highlight: true });
    soundManager.playTone(587.33, 'sine', 0.25); // D5 note

    if (streamerMode.enabled) {
        // Live Streamer Poll: listen to chat for 10 seconds
        halkJokerActive = true;
        const halkVotes = {}; // boxId -> count
        const votedUsers = new Set();
        
        // Temporary chat message handler override
        const originalOnChatMessage = streamerMode.onChatMessage;
        
        let secondsLeft = 10;
        const interval = setInterval(() => {
            secondsLeft--;
            if (secondsLeft <= 0) {
                clearInterval(interval);
                halkJokerActive = false;
                
                // Restore original chat callback
                streamerMode.onChatMessage = originalOnChatMessage;
                
                // Resolve results
                resolveHalkJokerResults(halkVotes);
            } else {
                updateStatusMessage(
                    currentLang === 'tr' 
                    ? `Halkın Sesi: Sohbetten tavsiyeler alınıyor... (${secondsLeft} sn)`
                    : `Voice of the People: Gathering chat recommendations... (${secondsLeft}s)`,
                    { highlight: true }
                );
            }
        }, 1000);
        
        streamerMode.onChatMessage = (msg) => {
            if (originalOnChatMessage) originalOnChatMessage(msg);
            
            if (votedUsers.has(msg.name)) return; // 1 vote per user
            
            let boxId = null;
            const cleanMsg = msg.message.toLowerCase().trim();
            const numMatch = cleanMsg.match(/\b([1-9]|1[0-9]|2[0-4])\b/);
            if (numMatch) {
                boxId = parseInt(numMatch[1], 10);
            }
            
            if (boxId !== null) {
                const targetBox = gameBoxes.find(b => b.id === boxId);
                if (targetBox && !targetBox.isOpened && targetBox.id !== playerBox.id) {
                    halkVotes[boxId] = (halkVotes[boxId] || 0) + 1;
                    votedUsers.add(msg.name);
                    soundManager.playTone(800 + Math.random() * 200, 'sine', 0.02, 0, 0.03);
                }
            }
        };
    } else {
        // Simulated audience poll for Single Player
        updateStatusMessage(
            currentLang === 'tr' ? "Halk oyluyor, tavsiyeler toplanıyor..." : "People are voting, gathering recommendations...",
            { highlight: true }
        );
        
        setTimeout(() => {
            const unopened = gameBoxes.filter(b => b.id !== playerBox.id && !b.isOpened);
            if (unopened.length === 0) return;
            
            const shuffled = shuffleArray([...unopened]);
            const count = Math.min(3, shuffled.length);
            const selected = shuffled.slice(0, count);
            
            const percentages = [55, 30, 15];
            if (count === 2) {
                percentages[0] = 65;
                percentages[1] = 35;
            } else if (count === 1) {
                percentages[0] = 100;
            }
            
            selected.forEach((box, index) => {
                highlightBoxWithRecommendation(box.id, percentages[index]);
            });
            
            soundManager.playTone(523.25, 'sine', 0.15, 0, 0.12);
            setTimeout(() => soundManager.playTone(659.25, 'sine', 0.2, 0, 0.12), 80);
            
            const recMsg = currentLang === 'tr'
                ? "Halkın tavsiyesi: Kutu " + selected.map((b, i) => `${b.id} (%${percentages[i]})`).join(', ')
                : "Audience recommendation: Box " + selected.map((b, i) => `${b.id} (${percentages[i]}%)`).join(', ');
                
            updateStatusMessage(recMsg, { highlight: true });
            addGameLog('joker_halk', recMsg);
        }, 1800);
    }
}

function resolveHalkJokerResults(halkVotes) {
    const unopened = gameBoxes.filter(b => b.id !== playerBox.id && !b.isOpened);
    const totalVotes = Object.values(halkVotes).reduce((sum, v) => sum + v, 0);
    
    if (totalVotes === 0 || unopened.length === 0) {
        // No votes cast, choose 3 random boxes and simulate small votes
        const shuffled = shuffleArray([...unopened]);
        const count = Math.min(3, shuffled.length);
        const selected = shuffled.slice(0, count);
        const percentages = [50, 30, 20];
        
        selected.forEach((box, index) => {
            highlightBoxWithRecommendation(box.id, percentages[index]);
        });
        
        const msg = currentLang === 'tr' ? "Yeterli sohbet oyu gelmedi, halk rastgele tavsiyelerde bulundu." : "Not enough chat votes, audience gave random recommendations.";
        updateStatusMessage(msg, { highlight: true });
        return;
    }
    
    const sortedVotes = Object.entries(halkVotes)
        .map(([id, count]) => ({ id: parseInt(id), count }))
        .sort((a, b) => b.count - a.count);
        
    const topCount = Math.min(3, sortedVotes.length);
    const topVotes = sortedVotes.slice(0, topCount);
    
    topVotes.forEach((vote, index) => {
        const pct = Math.round((vote.count / totalVotes) * 100);
        highlightBoxWithRecommendation(vote.id, pct);
    });
    
    soundManager.playTone(523.25, 'sine', 0.15, 0, 0.12);
    setTimeout(() => soundManager.playTone(659.25, 'sine', 0.2, 0, 0.12), 80);
    
    const recMsg = currentLang === 'tr'
        ? "Halkın tavsiyesi: Kutu " + topVotes.map((v, i) => `${v.id} (%${Math.round((v.count / totalVotes) * 100)})`).join(', ')
        : "Audience recommendation: Box " + topVotes.map((v, i) => `${v.id} (${Math.round((v.count / totalVotes) * 100)}%)`).join(', ');
        
    updateStatusMessage(recMsg, { highlight: true });
    addGameLog('joker_halk', recMsg);
}

function highlightBoxWithRecommendation(boxId, percentage) {
    const el = document.getElementById(`box-${boxId}`);
    if (!el) return;
    
    el.classList.add('recommend-highlight');
    
    // Remove old badge if exists
    const oldBadge = el.querySelector('.recommend-badge');
    if (oldBadge) oldBadge.remove();
    
    const badge = document.createElement('div');
    badge.className = 'recommend-badge';
    badge.innerText = `%${percentage}`;
    el.appendChild(badge);
}

function clearRecommendationHighlights() {
    document.querySelectorAll('.box.recommend-highlight').forEach(el => {
        el.classList.remove('recommend-highlight');
        el.querySelector('.recommend-badge')?.remove();
    });
}

/* 4. KUTU SİGORTASI JOKER */
function executeSigortaJoker() {
    if (!canUseSigortaJoker()) return;

    jokerState.sigortaUsed = true;
    jokerState.insuranceActive = true;

    closeModal(document.getElementById('joker-select-modal'));
    updateInsuranceUI();
    updateJokerButtonUI();
    syncJokerCardStates();

    updateStatusMessage(t('jokerSigortaActivated'), { highlight: true, heavy: false, light: true });
    
    addGameLog('joker_sigorta', currentLang === 'tr'
        ? 'Kutu Sigortası jokeri aktifleştrildi — sonraki Ağır Ceza iptal edilecek'
        : 'Box Insurance joker activated — next Heavy Punishment will be cancelled');

    soundManager.playTone(329.63, 'triangle', 0.2); // E4
    setTimeout(() => soundManager.playTone(493.88, 'triangle', 0.2), 80); // B4
    setTimeout(() => soundManager.playTone(659.25, 'triangle', 0.35), 160); // E5
}

/* 5. END-GAME PERFORMANCE ANALYSIS */
function showEndGameAnalysis(viaDeal, resultDare) {
    const container = document.getElementById('result-analysis-container');
    const gradeBadge = document.getElementById('performance-grade');
    const analysisText = document.getElementById('analysis-text');
    
    if (!container || !gradeBadge || !analysisText) return;
    
    container.classList.remove('hidden');
    
    const finalRank = daresList.indexOf(resultDare) + 1;
    
    // Calculate grade
    let grade = "C";
    if (finalRank >= 21) {
        grade = "S";
    } else if (finalRank >= 17) {
        grade = "A";
    } else if (finalRank >= 13) {
        grade = "B";
    } else if (finalRank >= 9) {
        grade = "C";
    } else if (finalRank >= 5) {
        grade = "D";
    } else {
        grade = "F";
    }
    
    gradeBadge.innerText = grade;
    
    // Set color based on grade
    if (grade === "S" || grade === "A") {
        gradeBadge.style.color = "var(--blue-color)";
        gradeBadge.style.borderColor = "var(--blue-color)";
    } else if (grade === "F" || grade === "D") {
        gradeBadge.style.color = "var(--red-color)";
        gradeBadge.style.borderColor = "var(--red-color)";
    } else {
        gradeBadge.style.color = "var(--primary)";
        gradeBadge.style.borderColor = "var(--primary)";
    }
    
    // Build decision description
    let evalText = "";
    if (viaDeal) {
        const playerBoxRank = playerBox.rank;
        if (finalRank > playerBoxRank) {
            evalText = currentLang === 'tr'
                ? `<strong>MÜKEMMEL ANLAŞMA!</strong> Banker teklifini kabul ederek doğru olanı yaptın. Kendi kutunda çok daha ağır bir ceza vardı (Kutu ${playerBox.id}: "${playerBox.dare}").`
                : `<strong>EXCELLENT DEAL!</strong> You made the right choice by accepting the deal. Your own box contained a much heavier punishment (Box ${playerBox.id}: "${playerBox.dare}").`;
        } else if (finalRank < playerBoxRank) {
            evalText = currentLang === 'tr'
                ? `<strong>KÖTÜ ANLAŞMA!</strong> Aceleci davrandın! Kendi kutunda çok daha hafif bir ceza vardı (Kutu ${playerBox.id}: "${playerBox.dare}"). Hamdi Bey seni kandırdı.`
                : `<strong>BAD DEAL!</strong> You rushed! Your own box contained a much lighter punishment (Box ${playerBox.id}: "${playerBox.dare}"). The Banker fooled you.`;
        } else {
            evalText = currentLang === 'tr'
                ? `<strong>KAFASAYA KAFAYA!</strong> Kabul ettiğin teklif kendi kutundaki ceza ile aynı seviyedeydi.`
                : `<strong>EVEN DEAL!</strong> The accepted offer was at the same level as the dare in your own box.`;
        }
    } else {
        const lastOffer = bankerOfferHistory[bankerOfferHistory.length - 1];
        if (lastOffer) {
            if (finalRank > lastOffer.rank) {
                evalText = currentLang === 'tr'
                    ? `<strong>HARİKA DİRENİŞ!</strong> Banker tekliflerini sonuna kadar reddederek doğru kararı verdin. Hamdi Bey son teklifte daha ağır bir ceza sunmuştu (Teklif: "${lastOffer.dare}").`
                    : `<strong>GREAT RESISTANCE!</strong> You rejected the offers and made the right call. The Banker's last offer was a heavier punishment (Offer: "${lastOffer.dare}").`;
            } else if (finalRank < lastOffer.rank) {
                evalText = currentLang === 'tr'
                    ? `<strong>KEŞKE KABUL ETSEYDİN!</strong> Sonuna kadar gitmek riskliydi ve şansın yaver gitmedi. Hamdi Bey son teklifte daha hafif bir ceza sunmuştu (Teklif: "${lastOffer.dare}").`
                    : `<strong>WISH YOU ACCEPTED!</strong> Going all the way was risky and luck wasn't on your side. The Banker offered a lighter punishment in the last offer (Offer: "${lastOffer.dare}").`;
            } else {
                evalText = currentLang === 'tr'
                    ? `<strong>DEĞİŞMEDİ!</strong> Banker teklifi ile kutunun cezası birebir aynı çıktı.`
                    : `<strong>NO DIFFERENCE!</strong> The final offer and your box's dare were of the exact same rank.`;
            }
        } else {
            evalText = currentLang === 'tr'
                ? `Kendi kutunu açtın ve kaderinle yüzleştin.`
                : `You opened your box and faced your fate.`;
        }
    }
    
    analysisText.innerHTML = evalText;
    
    // Draw SVG Chart
    renderBankerOfferChart(viaDeal, finalRank);
}

function renderBankerOfferChart(viaDeal, acceptedOfferRank) {
    const container = document.getElementById('analysis-chart-container');
    if (!container) return;
    
    if (bankerOfferHistory.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted);font-size:0.8rem;text-align:center;padding:20px;">Grafik veri geçmişi bulunamadı.</p>`;
        return;
    }
    
    const totalRounds = 9; // Max possible rounds
    const chartWidth = 300;
    const chartHeight = 120;
    const paddingLeft = 40;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 20;
    
    const getX = (roundNum) => {
        return paddingLeft + ((roundNum - 1) / (totalRounds - 1)) * (chartWidth - paddingLeft - paddingRight);
    };
    
    const getY = (rank) => {
        // rank 1 (heavy) -> bottom (chartHeight - paddingBottom)
        // rank 24 (light) -> top (paddingTop)
        const range = chartHeight - paddingTop - paddingBottom;
        return chartHeight - paddingBottom - ((rank - 1) / 23) * range;
    };
    
    // Draw grid lines and outline
    let svgContent = `
    <svg viewBox="0 0 ${chartWidth} ${chartHeight}" class="svg-chart">
        <!-- Grid Lines -->
        <line x1="${paddingLeft}" y1="${getY(1)}" x2="${chartWidth - paddingRight}" y2="${getY(1)}" class="chart-grid-line" />
        <line x1="${paddingLeft}" y1="${getY(12)}" x2="${chartWidth - paddingRight}" y2="${getY(12)}" class="chart-grid-line" />
        <line x1="${paddingLeft}" y1="${getY(24)}" x2="${chartWidth - paddingRight}" y2="${getY(24)}" class="chart-grid-line" />
        
        <!-- Y-Axis Labels -->
        <text x="${paddingLeft - 6}" y="${getY(24) + 3}" text-anchor="end" class="chart-axis-label" style="fill: var(--blue-color); font-weight: bold;">Hafif</text>
        <text x="${paddingLeft - 6}" y="${getY(12) + 3}" text-anchor="end" class="chart-axis-label" style="fill: var(--text-muted);">Orta</text>
        <text x="${paddingLeft - 6}" y="${getY(1) + 3}" text-anchor="end" class="chart-axis-label" style="fill: var(--red-color); font-weight: bold;">Ağır</text>
    `;
    
    // X-Axis Labels (Round ticks)
    for (let r = 1; r <= totalRounds; r++) {
        svgContent += `<text x="${getX(r)}" y="${chartHeight - 4}" text-anchor="middle" class="chart-axis-label">T${r}</text>`;
    }
    
    // Build path points
    const points = bankerOfferHistory.map(h => ({
        x: getX(h.round),
        y: getY(h.rank),
        round: h.round,
        rank: h.rank
    }));
    
    if (points.length > 0) {
        let pathD = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            pathD += ` L ${points[i].x} ${points[i].y}`;
        }
        svgContent += `<path d="${pathD}" class="chart-line-path" />`;
        
        // Draw points on top of path
        points.forEach((p, idx) => {
            const isDealPoint = viaDeal && (idx === points.length - 1);
            const ptClass = isDealPoint ? 'chart-point deal-point' : 'chart-point';
            svgContent += `<circle cx="${p.x}" cy="${p.y}" r="${isDealPoint ? 5 : 3}" class="${ptClass}" />`;
        });
    }
    
    svgContent += `
        <!-- X and Y Axes -->
        <line x1="${paddingLeft}" y1="${chartHeight - paddingBottom}" x2="${chartWidth - paddingRight}" y2="${chartHeight - paddingBottom}" class="chart-axis-line" />
        <line x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${chartHeight - paddingBottom}" class="chart-axis-line" />
    </svg>
    `;
    
    container.innerHTML = svgContent;
}

let pollInterval = null;

function startBankerPoll() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }

    const pc = document.getElementById('banker-poll-container');
    if (!streamerMode.enabled) {
        if (pc) pc.classList.add('hidden');
        currentPoll = null;
        return;
    }

    if (!pc) return;
    pc.classList.remove('hidden');

    currentPoll = {
        varim: 0,
        yokum: 0,
        votedUsers: new Set()
    };

    updatePollUI();

    if (streamerMode.enabled) {
        // Streamer Mode: chat votes will update it dynamically
    } else {
        // Single Player Mode: Simulate votes over 1.5 seconds
        const remainingBoxes = gameBoxes.filter(b => b.id === playerBox.id || !b.isOpened);
        const sumRanks = remainingBoxes.reduce((sum, b) => sum + b.rank, 0);
        const averageRank = sumRanks / remainingBoxes.length;

        const offer = calculateBankerOffer();
        
        // Probability of "Varım" based on how good the offer is.
        // Higher rank = lighter/better punishment.
        let varimProb = 0.5;
        const diff = offer.rank - averageRank;
        varimProb += diff * 0.08;
        varimProb = Math.max(0.1, Math.min(0.9, varimProb));

        const totalSimVotes = 40 + Math.floor(Math.random() * 50);
        let votesCast = 0;

        pollInterval = setInterval(() => {
            const batch = 3 + Math.floor(Math.random() * 6);
            for (let i = 0; i < batch; i++) {
                if (votesCast >= totalSimVotes) break;
                if (Math.random() < varimProb) {
                    currentPoll.varim++;
                } else {
                    currentPoll.yokum++;
                }
                votesCast++;
            }
            updatePollUI();

            if (votesCast >= totalSimVotes) {
                clearInterval(pollInterval);
                pollInterval = null;
            }
        }, 100);
    }
}

function updatePollUI() {
    if (!currentPoll) return;
    
    const pc = document.getElementById('banker-poll-container');
    if (!pc) return;
    pc.classList.remove('hidden');

    const totalVotes = currentPoll.varim + currentPoll.yokum;
    const voteCountEl = document.getElementById('poll-vote-count');
    if (voteCountEl) {
        voteCountEl.innerText = `${totalVotes} ${currentLang === 'tr' ? 'oy' : 'votes'}`;
    }

    const varimBar = document.getElementById('poll-bar-varim');
    const yokumBar = document.getElementById('poll-bar-yokum');

    let varimPct = 50;
    let yokumPct = 50;

    if (totalVotes > 0) {
        varimPct = Math.round((currentPoll.varim / totalVotes) * 100);
        yokumPct = 100 - varimPct;
    }

    if (varimBar) {
        varimBar.style.width = `${varimPct}%`;
        const label = varimBar.querySelector('.poll-bar-label');
        if (label) label.innerText = `${currentLang === 'tr' ? 'Varım' : 'Deal'} (%${varimPct})`;
    }
    if (yokumBar) {
        yokumBar.style.width = `${yokumPct}%`;
        const label = yokumBar.querySelector('.poll-bar-label');
        if (label) label.innerText = `${currentLang === 'tr' ? 'Yokum' : 'No Deal'} (%${yokumPct})`;
    }
}

function endBankerPoll() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
    currentPoll = null;
    const pc = document.getElementById('banker-poll-container');
    if (pc) pc.classList.add('hidden');
}
