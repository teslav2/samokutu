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
    // 1-15: Ağır Cezalar (Heavy Dares)
    "Welcome to the Game 3 Başla",
    "chat'ten rastgele birinin geçmişine atla",
    "ekipten 3 kişiyi arayıp 'acil bir durum var kardeşim, PC gitti' diyerek tepkilerini ölç",
    "ekipte en çok vakit geçirdiğin kişiyi ara, 'Tarık bey Panama'da tatile gidiyor, bir süre ortalıkta olmayacak' de",
    "ekipten en son kime yazdıysan Discord'da ismini 'KUTUSUNDA BÜYÜK HİSSEDEN ADAM' olarak değiştir, öyle kalsın",
    "instagram'a 'hamdi bey çay içmeye bekliyorum' olarak story at",
    "yapay zekaya 'IOWF yaşlı mı?' diye sor, yaşlı derse yapay zekanın geçmişine atlayamazsın",
    "20 dakika popüler kültür kölesi ol: herkesin sevdiği şeyleri öv, niş şeyleri yerin dibine sok",
    "20 dakika boyunca futbol konusu açıldığında 'Ben futbolun ta kendisiyim' diyerek konuyu kapat",
    "bağış atan herkesi öptüğünü söyle ve öp",
    "galerideki en son fotoğrafı göster",
    "çocukluk fotoğrafı varsa göster",
    "Bandananı aç",
    "SAMO'nun bir şarkısını kötüle",
    "Futbolda herkesin hemfikir olduğu bir konuda ters bir şey söyle",
    // 16-30: Hafif Cezalar (Light Dares)
    "10 dakika kekeme taklidi yap",
    "5 dakika kadın taklidi yap",
    "3 dakika sessiz kal, sadece beden diliyle konuş",
    "albion günlerini özlediğini söyle ve öv",
    "15 dakika İstanbul beyefendisi gibi konuş",
    "3 dakika aralıksız nah çek",
    "10 dakika boyunca haber spikeri gibi konuş",
    "5 dakika boyunca Karadeniz şivesiyle konuş",
    "chatin seçtiği şarkıyı mırıldan",
    "3 dakika boyunca her gelen mesaja 'haklısın' de",
    "5 dakika NPC ol, sadece 'Evet, Hayır, Belki, Devlet sırrı' diyebilirsin",
    "son yaptığın en saçma şeyi anlat",
    "Hiç bilmediğin bir şarkıyı sözlerine bakarak nakarata kadar söyle",
    "Hiç sevmediğin bir şarkı türünden bir şarkı aç",
    "Chatten sana gelen tüm övgülere karşı çık"
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

    playCinematicWhoosh() {
        return; // Boink/whoosh sesi kullanici istegiyle kapatildi
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
                this.phoneRingTimeout = setTimeout(playRingBurst, fast ? 600 : 900);
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
            `assets/audio/phone_call_${randomIndex}.mp3`,
            `/assets/audio/phone_call_${randomIndex}.mp3`,
            `audio/phone_call_${randomIndex}.mp3`,
            `assets/audio/phone_call_${randomIndex}.wav`,
            `audio/phone_call_${randomIndex}.wav`
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
let rawDaresList = [...DEFAULT_DARES];
let daresList = [...DEFAULT_DARES];
let gameBoxes = [];
let playerBox = null;
let currentRound = 0;
let boxesToOpenInRound = 0;
let roundConfig = [7, 6, 5, 4, 3, 2, 1]; // 29 total opens for 30 boxes, leaves 1 box
let openedBoxesCount = 0;
let acceptedOffer = null;
let boxVoiceMapping = {};
let eliminatedRanks = new Set();
let gameLog = [];
let isRandomSelecting = false;
let isFinalChoice = false;
let hasSwappedAtFinal = false;

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
    for (let i = 1; i <= 30; i++) {
        boxVoiceMapping[i] = i;
    }
}

function shuffleBoxVoiceMapping() {
    initBoxVoiceMapping();
}

// ===== BOX OWNER NAMES =====
const DEFAULT_BOX_NAMES = [
    "aycinkavak", "Lloyd",
    "DepresifTosbaa", "IIIeandreas", "dream_33", "PANDA_ADAM",
    "Klaxxoun", "Beru", "Mordex", "SAMO", "Lunyxia", "Sweet0",
    "Gavatnur", "Akon", "Septy", "Nahuru", "Cemoshx", "Slaptula",
    "TeslaV2", "Misaki", "SamDadlisi", "KRWest", "Archie_Wan", "MotherOfPrincess",
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
            
        if (names.length >= 30) {
            loadedRawBoxOwners = names;
        } else {
            loadedRawBoxOwners = [...names];
            let idx = 0;
            while (loadedRawBoxOwners.length < 30) {
                const fallback = DEFAULT_BOX_NAMES[idx % DEFAULT_BOX_NAMES.length];
                if (!loadedRawBoxOwners.includes(fallback)) {
                    loadedRawBoxOwners.push(fallback);
                }
                idx++;
            }
        }
        // Kutulardaki isimler her girişte rastgele yer değiştirir (Shuffle)
        boxOwnersList = shuffleArray([...loadedRawBoxOwners]).slice(0, 30);
    } catch (e) {
        console.warn("CORS kısıtlaması veya dosya eksikliği nedeniyle kutu_sahipleri.txt yüklenemedi. Varsayılan liste yükleniyor.", e);
        loadedRawBoxOwners = [...DEFAULT_BOX_NAMES];
        boxOwnersList = shuffleArray([...DEFAULT_BOX_NAMES]).slice(0, 30);
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

function formatBoxOwnerHtml(rawName) {
    if (!rawName) return '';
    const clean = rawName.trim();
    const lower = clean.toLowerCase();

    // 1. MotherOfPrincess -> Mother / Of / Princess (3 satır)
    if (lower === 'motherofprincess' || lower === 'mother_of_princess') {
        return '<span>Mother</span><span>Of</span><span>Princess</span>';
    }
    // 2. aycinkavak -> Aycin / Kavak
    if (lower === 'aycinkavak' || lower === 'aycin_kavak' || lower === 'aycin kavak') {
        return '<span>Aycin</span><span>Kavak</span>';
    }
    // 3. llleandreas / iiieandreas -> Tek satır bitişik IIIeandreas (Kullanıcı isteği)
    if (lower === 'llleandreas' || lower === 'iiieandreas') {
        return '<span>IIIeandreas</span>';
    }
    // 4. PANDA_ADAM -> Panda / Adam
    if (lower === 'panda_adam' || lower === 'pandaadam' || lower === 'panda adam') {
        return '<span>Panda</span><span>Adam</span>';
    }
    // 5. DepresifTosbaa -> Depresif / Tosbaa
    if (lower === 'depresiftosbaa' || lower === 'depresif_tosbaa' || lower === 'depresif tosbaa') {
        return '<span>Depresif</span><span>Tosbaa</span>';
    }
    // 6. JohnBishop -> John / Bishop
    if (lower === 'johnbishop' || lower === 'john_bishop' || lower === 'john bishop') {
        return '<span>John</span><span>Bishop</span>';
    }
    // 7. Archie_Wan -> Archie / Wan
    if (lower === 'archie_wan' || lower === 'archiewan' || lower === 'archie wan') {
        return '<span>Archie</span><span>Wan</span>';
    }

    // SamDadlisi, KucukCemo ve diğerleri bitişik tek satır
    return `<span>${clean.replace(/_/g, ' ')}</span>`;
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
        restartBtn: "TEKRAR OYNA",
        resultMenuBtn: "Ana Menü",
        confirmMenu: "Oyunu sonlandırıp menüye dönmek istediğinizden emin misiniz? İlerlemeniz silinecek.",
        boxSelection: "KUTU SEÇİMİ",
        roundTitle: "{n}. TUR",
        boxSelectedMsg: "Kutunu seçtin! Hamdi Bey'e son {count} kutu.",
        boxesLeftMsg: "Hamdi Bey'e son {count} kutu.",
        boxOpenedMsg: "Kutu {id} Açıldı: \"{dare}\" elendi!",
        bankerCallingMsg: "Hamdi Bey aranıyor... Telefon çalıyor!",
        bankerOfferIndicator: "TEKLİF",
        declineOfferMsg: "Teklif reddedildi! Son {count} kutu.",
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
        streamerOpenBox: "{name} kutu açıyor (Hamdi Bey'e son {count} kutu)...",

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
        restartBtn: "PLAY AGAIN",
        resultMenuBtn: "Main Menu",
        confirmMenu: "Are you sure you want to end the game and return to menu? Your progress will be lost.",
        boxSelection: "BOX SELECTION",
        roundTitle: "ROUND {n}",
        boxSelectedMsg: "Box selected! Only {count} boxes left until the Banker calls.",
        boxesLeftMsg: "Only {count} boxes left until the Banker calls.",
        boxOpenedMsg: "Box {id} Opened: \"{dare}\" eliminated!",
        bankerCallingMsg: "Calling the Banker... Phone is ringing!",
        bankerOfferIndicator: "OFFER",
        declineOfferMsg: "Offer rejected! Only {count} boxes left until the Banker calls.",
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
        streamerOpenBox: "{name} is opening boxes ({count} left until Banker)...",

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
        const rt = document.getElementById('result-title');
        if (rt) rt.innerText = t('resultTitle');
        const rst = document.getElementById('result-source-text');
        if (rst) rst.innerText = t('resultSourceText');
        const rb = document.getElementById('restart-btn');
        if (rb) rb.innerHTML = `<i class="fas fa-redo"></i> ${l.restartBtn}`;
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
            const justNumMatch = cleanMsg.match(/^[\D]*([1-9]|[12][0-9]|30)[\D]*$/);
            if (justNumMatch) {
                activeBoxId = parseInt(justNumMatch[1], 10);
            } else {
                const keywordMatch = cleanMsg.match(/(?:kutu|box|no|seç|sec|#)\s*([1-9]|[12][0-9]|30)\b/);
                if (keywordMatch) {
                    activeBoxId = parseInt(keywordMatch[1], 10);
                } else {
                    const standaloneMatch = cleanMsg.match(/\b([1-9]|[12][0-9]|30)\b/);
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
                const targetBox = (typeof gameBoxes !== 'undefined' && gameBoxes) ? gameBoxes.find(b => b.id === activeBoxId) : null;
                const isHeavy = targetBox ? (targetBox.rank <= 15) : false;
                const color = isHeavy ? '#ff3232' : '#00bfff';
                const bg = isHeavy ? 'rgba(255, 50, 50, 0.15)' : 'rgba(0, 191, 255, 0.15)';
                const border = isHeavy ? 'rgba(255, 50, 50, 0.4)' : 'rgba(0, 191, 255, 0.4)';
                formattedText = `<strong style="color: ${color}; background: ${bg}; border: 1px solid ${border}; padding: 2px 7px; border-radius: 4px;">Kutu ${activeBoxId}</strong>`;
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
                streamerMode.addSystemMessage(`Sıra ${activeViewer.name} adlı yarışmacıda! Kendi kutunu seçmek için sohbete kutu numarası yaz (örn: 11).`);
            } else {
                updateStatusMessage(t('streamerOpenBox', {name: activeViewer.name, count: boxesToOpenInRound}));
                streamerMode.addSystemMessage(`Sıra ${activeViewer.name} adlı yarışmacıda! Kutu açmak için sohbete kutu numarası yaz.`);
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
        voiceoverVolLabel: "Diyalog Sesi",
        voiceoverVolDesc: "Bankacı ve kutu diyalogları ses düzeyini ayarlar.",
        voiceoverToggleLabel: "Bankacı Seslendirmeleri",
        voiceoverToggleDesc: "Bankacı seslendirmelerini tamamen açar veya kapatır.",
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

    // ===== YENI GIRIS EKRANI (SAMO OPENING) =====
    const entranceScreen = document.getElementById('entrance-screen');
    const entranceLoadingBox = document.getElementById('entrance-loading-box');
    const entranceProgressFill = document.getElementById('entrance-progress-bar-fill');
    const entrancePercentText = document.getElementById('entrance-loading-percent');
    const entrancePlayBtn = document.getElementById('entrance-play-btn');

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

    if (entranceScreen) {
        showScreen('entrance-screen');
        
        let progress = 0;
        const loadDuration = 1800; // 1.8 seconds smooth loading
        const startTime = performance.now();

        function updateProgress(currentTime) {
            const elapsed = currentTime - startTime;
            progress = Math.min(100, Math.round((elapsed / loadDuration) * 100));

            if (entranceProgressFill) {
                entranceProgressFill.style.width = `${progress}%`;
            }
            if (entrancePercentText) {
                entrancePercentText.innerText = `${progress}%`;
            }

            if (progress < 100) {
                requestAnimationFrame(updateProgress);
            } else {
                setTimeout(() => {
                    if (entranceLoadingBox) {
                        entranceLoadingBox.style.opacity = '0';
                        entranceLoadingBox.style.transform = 'scale(0.9)';
                        setTimeout(() => {
                            entranceLoadingBox.classList.add('hidden');
                            if (entrancePlayBtn) {
                                entrancePlayBtn.classList.remove('hidden');
                            }
                        }, 300);
                    }
                }, 200);
            }
        }

        requestAnimationFrame(updateProgress);

        if (entrancePlayBtn) {
            entrancePlayBtn.addEventListener('click', () => {
                soundManager.init();
                // soundManager.playCinematicWhoosh();
                
                // Add zoom and blur to entrance screen
                entranceScreen.classList.add('entrance-zooming');

                // Trigger flash overlay
                const transitionOverlay = document.getElementById('transition-overlay');
                if (transitionOverlay) {
                    transitionOverlay.classList.remove('flash-active');
                    void transitionOverlay.offsetWidth; // trigger reflow
                    transitionOverlay.classList.add('flash-active');
                }

                // Halfway through flash, transition to menu screen with staggered animations
                setTimeout(() => {
                    entranceScreen.classList.remove('active');
                    entranceScreen.classList.remove('entrance-zooming');
                    
                    const menuScreen = document.getElementById('menu-screen');
                    if (menuScreen) {
                        menuScreen.classList.add('menu-reveal');
                        showScreen('menu-screen');
                    }
                    startMenuMusic();

                    // Cleanup reveal class after animation completes
                    setTimeout(() => {
                        if (menuScreen) menuScreen.classList.remove('menu-reveal');
                        if (transitionOverlay) transitionOverlay.classList.remove('flash-active');
                    }, 1200);
                }, 280);
            });
        }
    }

    // ===== SETTINGS SCREEN SPA NAVIGATION =====
    let previousScreenBeforeSettings = 'menu-screen';
    // settingsBtn already declared
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

function shuffleDaresByTier() {
    const base = (rawDaresList && rawDaresList.length >= 30) ? rawDaresList : DEFAULT_DARES;
    const heavy = shuffleArray([...base.slice(0, 15)]);
    const light = shuffleArray([...base.slice(15, 30)]);
    daresList = [...heavy, ...light];
}

async function loadDares() {
    try {
        const response = await fetch('cezalar.txt');
        if (!response.ok) throw new Error("Dosya yüklenemedi");
        const text = await response.text();
        // Split by lines, trim, and filter out empty lines
        const parsedDares = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
            
        while (parsedDares.length < 30) {
            parsedDares.push(DEFAULT_DARES[parsedDares.length % DEFAULT_DARES.length]);
        }
        rawDaresList = parsedDares.slice(0, 30);
        shuffleDaresByTier();
    } catch (e) {
        console.warn("CORS kısıtlaması veya dosya eksikliği nedeniyle cezalar.txt yüklenemedi. Varsayılan liste yükleniyor.", e);
        rawDaresList = [...DEFAULT_DARES];
        shuffleDaresByTier();
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
            
            try { applyConfig(); } catch(e) { console.error("applyConfig error:", e); }
            try { applySettingsTranslations(); } catch(e) { console.error("applySettingsTranslations error:", e); }
            
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

    // initJokerControls removed

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
        stopTvVideo();
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

    // Her oyunda cezalar kendi kategorisi (Ağır 1-15, Hafif 16-30) içinde rastgele karıştırılır
    shuffleDaresByTier();
    // Setup reward sidebars
    setupSidebars();

    // Reset header player box badge
    const headerPb = document.getElementById('header-player-box');
    const headerPbNum = document.getElementById('header-player-box-num');
    if (headerPb) headerPb.classList.add('hidden');
    if (headerPbNum) headerPbNum.innerText = '-';

    // Her oyunda kutulardaki isimlerin yerleri rastgele değişsin (kullanıcı isteği)
    if (loadedRawBoxOwners && loadedRawBoxOwners.length > 0) {
        boxOwnersList = shuffleArray([...loadedRawBoxOwners]).slice(0, 30);
    }

    // Shuffle and assign dares to boxes (30 boxes total)
    const shuffledDares = shuffleArray([...daresList]);
    
    gameBoxes = [];
    for (let i = 1; i <= 30; i++) {
        const dareStr = shuffledDares[(i - 1) % shuffledDares.length];
        const rank = (daresList.indexOf(dareStr) >= 0 ? daresList.indexOf(dareStr) + 1 : ((i % 24) + 1));
        gameBoxes.push({
            id: i,
            dare: dareStr,
            rank: rank,
            isOpened: false
        });
    }

    // Render Grid (5x6 = 30 kutu)
    renderBoxesGrid();

    addGameLog('game_start', currentLang === 'tr'
        ? 'Oyun başladı — 30 kutu hazır.'
        : 'Game started — 30 boxes ready.');
}

function setupSidebars() {
    leftRewardsList.innerHTML = '';
    rightRewardsList.innerHTML = '';

    // Sol: Hafif cezalar (16-30) — mavi
    for (let i = 15; i < 30; i++) {
        const item = document.createElement('div');
        item.id = `reward-item-${i + 1}`;
        item.className = 'reward-item';
        item.setAttribute('data-rank', i + 1);
        item.innerHTML = `
            <span class="reward-rank blue-title">😇</span>
            <span class="reward-name">${daresList[i] || ''}</span>
        `;
        leftRewardsList.appendChild(item);
    }

    // Sağ: Ağır cezalar (1-15) — kırmızı
    for (let i = 0; i < 15; i++) {
        const item = document.createElement('div');
        item.id = `reward-item-${i + 1}`;
        item.className = 'reward-item';
        item.setAttribute('data-rank', i + 1);
        item.innerHTML = `
            <span class="reward-rank red-title">😈</span>
            <span class="reward-name">${daresList[i] || ''}</span>
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
        nameEl.innerHTML = formatBoxOwnerHtml(ownerName);

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
                const isHeavy = box.rank <= 15; // rank 1-12 = heavy
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
                const headerPbNum = document.getElementById('header-player-box-num');
                if (headerPbNum) headerPbNum.innerText = playerBox.id;
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
        
        // Show in header badge (SENİN KUTUN : X)
        const headerPb = document.getElementById('header-player-box');
        const headerPbNum = document.getElementById('header-player-box-num');
        if (headerPb && headerPbNum) {
            headerPb.classList.remove('hidden');
            headerPbNum.innerText = box.id;
        }
        if (playerBoxEl) playerBoxEl.innerText = box.id;
        
        soundManager.playTone(523, 'sine', 0.3, 0, 0.1); // Happy select note
        
        // Advance to round 1
        currentRound = 1;
        boxesToOpenInRound = roundConfig[currentRound - 1];
        
        updateRoundIndicator(t('roundTitle', {n: 1}), "aktif");
        if (streamerMode.enabled && activeViewer) {
            updateStatusMessage(t('streamerOpenBox', {name: activeViewer.name, count: boxesToOpenInRound}));
            streamerMode.addSystemMessage(`${activeViewer.name} kendi kutusunu seçti: Kutu ${box.id}!`);
            streamerMode.addSystemMessage(`${activeViewer.name}, ${bankerName}'in aramasına son ${boxesToOpenInRound} kutu kaldı!`);
        } else if (streamerMode.enabled) {
            tryNextViewer();
        } else {
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

// initJokerControls removed

function markRewardEliminated(rank, animate = false) {
    const rewardEl = document.getElementById(`reward-item-${rank}`);
    if (!rewardEl) return;

    const isHeavy = rank <= 15;
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

    const isHeavy = box.rank <= 15;

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

    const isHeavy = box.rank <= 15;
    
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

    if (streamerMode.enabled && activeViewer) {
        streamerMode.addSystemMessage(`${activeViewer.name}, Kutu ${box.id}\'yi açtı!`);
        if (boxesToOpenInRound > 0) {
            streamerMode.addSystemMessage(`${activeViewer.name}, ${bankerName}'in aramasına son ${boxesToOpenInRound} kutu kaldı.`);
        }
    }

    const afterReveal = () => {
        if (streamerMode.enabled && activeViewer) {
            updateStatusMessage(t('streamerOpenBox', {name: activeViewer.name, count: boxesToOpenInRound}));
        } else if (streamerMode.enabled) {
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
            
            if (streamerMode.enabled && activeViewer) {
                streamerMode.addSystemMessage(`${bankerName} aradı! Teklif: "${offer.dare}"`);
                streamerMode.addSystemMessage(`${activeViewer.name}, teklife !varım mı yoksa !yokum mu diyorsun?`);
            }

            // Start oylama (voting) in both modes
            startBankerPoll();
        });
    }, preDelay);
}

function calculateBankerOffer() {
    // Get all remaining unopened dares (including player's own box)
    const remainingBoxes = gameBoxes.filter(b => b.id === playerBox.id || !b.isOpened);
    
    // Count heavy dares (ranks 1-12) and light dares (ranks 13-24)
    const heavyRemaining = remainingBoxes.filter(b => b.rank <= 15).length;
    const lightRemaining = remainingBoxes.filter(b => b.rank > 15).length;
    const totalRemaining = remainingBoxes.length;

    // Calculate average rank of remaining boxes
    const sumRanks = remainingBoxes.reduce((sum, b) => sum + b.rank, 0);
    const averageRank = sumRanks / totalRemaining;

    // Base offer starts near average rank
    let offerRank = Math.round(averageRank);

    // Dynamic Psychological AI:
    // If board is dangerous (heavy dares dominate):
    // Player is anxious. Hamdi Bey smells fear and offers an escape route (mid-tier penalty)
    if (heavyRemaining > lightRemaining) {
        const fearBonus = Math.floor(Math.random() * 3) - 1; // -1 to +1
        offerRank = Math.min(15, Math.max(8, offerRank + fearBonus));
    } else if (lightRemaining > heavyRemaining * 1.5) {
        // Player is cruising safely! Mostly light dares remain!
        // Hamdi Bey tries to lowball or give an annoying punishment to break their confidence.
        offerRank = Math.max(2, offerRank - 3 - Math.floor(Math.random() * 2));
    } else {
        // Balanced board: psychological tension
        const jitter = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 2) + 1);
        offerRank = offerRank + jitter;
    }

    // Personality adjustment from settings
    const personality = settingsConfig.bankerPersonality || 'balanced';
    if (personality === 'generous') {
        offerRank += 3;
    } else if (personality === 'stingy') {
        offerRank -= 3;
    }

    // Bound check (1 to 24)
    offerRank = Math.max(1, Math.min(24, offerRank));

    // Ensure we don't repeat the exact same dare consecutively
    const lastOffer = bankerOfferHistory[bankerOfferHistory.length - 1];
    if (lastOffer && lastOffer.rank === offerRank) {
        offerRank = offerRank < 24 ? offerRank + 1 : offerRank - 1;
    }

    const offerIndex = offerRank - 1;

    return {
        dare: daresList[offerIndex] || DEFAULT_DARES[offerIndex],
        rank: offerRank
    };
}

function acceptBankerOffer() {
    endBankerPoll();
    acceptedOffer = bankerOfferText.innerText;
    addGameLog('deal_accept', currentLang === 'tr'
        ? `Teklif kabul edildi: "${acceptedOffer}"`
        : `Deal accepted: "${acceptedOffer}"`);
    if (streamerMode.enabled && activeViewer) {
        streamerMode.addSystemMessage(`${activeViewer.name} "!varım" dedi ve ${bankerName}'in teklifini KABUL ETTİ!`);
    }
    endGame(true);
}

function declineBankerOffer() {
    endBankerPoll();
    addGameLog('deal_decline', currentLang === 'tr'
        ? 'Teklif reddedildi — kutu açmaya devam.'
        : 'Offer declined — continuing to open boxes.');
    if (streamerMode.enabled && activeViewer) {
        streamerMode.addSystemMessage(`${activeViewer.name} "!yokum" dedi ve teklifi REDDETTİ! Kutusuna güvenmeye devam ediyor.`);
    }
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
            updateRoundIndicator(t('roundTitle', {n: currentRound}), "aktif");
            if (streamerMode.enabled && activeViewer) {
                updateStatusMessage(t('streamerOpenBox', {name: activeViewer.name, count: boxesToOpenInRound}));
                streamerMode.addSystemMessage(`${activeViewer.name}, ${currentRound}. tur başladı! ${bankerName}'in aramasına son ${boxesToOpenInRound} kutu kaldı.`);
            } else if (streamerMode.enabled) {
                tryNextViewer();
            } else {
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
        if (streamerMode.enabled && activeViewer) {
            streamerMode.addSystemMessage(`SON AŞAMA! Sadece kendi kutun (Kutu ${playerBox.id}) ve Kutu ${lastRemainingBox.id} kaldı!`);
            streamerMode.addSystemMessage(`${activeViewer.name}, kendi kutunu açmak için sohbete ${playerBox.id}, diğer kutuyu seçmek için ${lastRemainingBox.id} yaz!`);
        }
    }, delay);
}

// END GAME / RESULT DISPLAY
function endGame(viaDeal) {
    soundManager.stopGameMusic(true);
    let resultDare = "";
    
    if (viaDeal) {
        resultDare = acceptedOffer;
        // Decide fanfare: rank 1-12 = HEAVY (bad = lose), rank 13-24 = LIGHT (good = win)
        const offerRank = daresList.indexOf(resultDare) + 1;
        if (offerRank > 15) {
            soundManager.playWinFanfare();
        } else {
            soundManager.playLoseFanfare();
        }
    } else {
        resultDare = playerBox.dare;
        if (playerBox.rank > 15) {
            soundManager.playWinFanfare();
        } else {
            soundManager.playLoseFanfare();
        }
    }

    const rank = daresList.indexOf(resultDare) + 1;

    addGameLog('game_end', currentLang === 'tr'
        ? `Oyun bitti - ceza: "${resultDare}"`
        : `Game over - dare: "${resultDare}"`,
        rank <= 15 ? 'heavy' : 'light');

    showTvNewsResult(viaDeal, resultDare, rank, hasSwappedAtFinal);
    openModal(resultModal);

    if (streamerMode.enabled && activeViewer) {
        streamerMode.addSystemMessage(`Oyun Bitti! ${activeViewer.name}'in aldığı ceza: "${resultDare}" (${rank <= 15 ? 'Ağır Ceza' : 'Hafif Ceza'})`);
        streamerMode.addSystemMessage(`Sıradaki yarışmacı için sohbete !oyna yazabilirsiniz!`);
        activeViewer = null; // Oyun bittiğinde sıfırla
    }
}

// Live TV clock timer
let tvClockInterval = null;

function updateTvClock() {
    const clockEl = document.getElementById('tv-news-clock');
    if (!clockEl) return;
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    clockEl.innerText = `${h}:${m}:${s}`;
}

async function showTvNewsResult(viaDeal, resultDare, rank, hasSwapped = false) {
    if (tvClockInterval) clearInterval(tvClockInterval);
    updateTvClock();
    tvClockInterval = setInterval(updateTvClock, 1000);

    const isHeavy = rank <= 15;
    const typeTag = document.getElementById('tv-dare-type-tag');
    if (typeTag) {
        typeTag.className = isHeavy ? 'tv-dare-type-tag red-tag' : 'tv-dare-type-tag blue-tag';
        typeTag.innerText = isHeavy ? 'AĞIR CEZA' : 'HAFİF CEZA';
    }

    const dareDisplayBox = document.getElementById('tv-dare-display-box');
    if (dareDisplayBox) {
        dareDisplayBox.style.borderColor = isHeavy ? '#e60000' : '#0077ff';
        dareDisplayBox.style.boxShadow = isHeavy ? '0 0 25px rgba(230,0,0,0.4)' : '0 0 25px rgba(0,119,255,0.4)';
    }

    const finalDareEl = document.getElementById('final-dare-text');
    if (finalDareEl) {
        finalDareEl.innerText = resultDare;
        finalDareEl.style.color = isHeavy ? '#ff4d4d' : '#64b5f6';
    }

    const headlineEl = document.getElementById('tv-news-headline');
    const subheadlineEl = document.getElementById('tv-news-subheadline');
    const storyEl = document.getElementById('tv-news-story');
    const marqueeEl = document.getElementById('tv-news-marquee');

    const defaultEmotion = isHeavy ? 'sinirli' : 'mutlu';
    applyTarikEmotion(defaultEmotion);

    if (headlineEl) {
        headlineEl.innerText = isHeavy 
            ? "IOWF'UN KUTUSUNDAN ÇIKAN AĞIR CEZA KICK YAYININI SALLADI!"
            : "TARIK KADERİN SİLLESİNDEN KIL PAYI KURTULDU!";
    }
    const subheadlinesHeavySwap = [
        "Son dakikada kutusunu değiştirdi, kaderin en acı sillesini yedi!",
        "Masadaki son kutuya aldandı, kendi kutusundaki kurtuluşu kaçırdı!",
        "Değişim kararı felaket getirdi: Son anda yaptığı takas pahalıya patladı!",
        "Kendi kutusunu bıraktı, masadaki tuzak kutuya balıklama atladı!"
    ];
    const subheadlinesLightSwap = [
        "Son dakikada kutusunu değiştirdi, mucizevi bir hamleyle kurtuldu!",
        "Altıncı hissi yanıltmadı: Yaptığı son dakika takası hayatını kurtardı!",
        "Kendi kutusundaki ağır cezayı son anda masaya bırakıp zaferi kaptı!",
        "Büyük kumar oynadı, son andaki takas kararıyla stüdyoyu yıktı!"
    ];
    const subheadlinesHeavyDeal = [
        "Hamdi Bey'in telefon teklifine 'Varım' dedi, stüdyo dondu kaldı!",
        "Bankacının tatlı diline aldandı, faturayı tüm stüdyo kesti!",
        "Masadan kaçmak istedi ama Hamdi Bey'in acımasız tuzağına düştü!",
        "Aceleyle 'Varım' dedi, kutusundaki kurtuluş şansını elinin tersiyle itti!"
    ];
    const subheadlinesHeavyBox = [
        "Kendi kutusuna sonuna kadar güvendi ama kader bu kez affetmedi!",
        "İçindeki sese kulak verdi, açılan kutuyla stüdyo buz kesti!",
        "Chat 'büyük hisset' dedi, gelen ceza canlı yayını sarstı!",
        "Hamdi Bey'in tüm tekliflerini tepti, kutusundaki felaketten kaçamadı!",
        "Büyük cesaret gösterdi ancak kaderle pazarlık yapılmaz!"
    ];
    const subheadlinesLightDeal = [
        "Hamdi Bey'in teklifini kabul etti, büyük felaketten tereyağından kıl çeker gibi sıyrıldı!",
        "Doğru anda 'Varım' dedi, stüdyoyu kahkahalar ve sevinçle inletti!",
        "Risk almadı, akıllıca bir hamleyle hafif cezaya razı olup masayı topladı!",
        "Bankacıya şans tanımadı, teklifi kapıp derin bir 'oh' çekti!"
    ];
    const subheadlinesLightBox = [
        "Kendi kutusuna sonuna kadar güvendi ve gecenin en büyük zaferine imza attı!",
        "Hamdi Bey'in tüm baskılarını elinin tersiyle itti, adeta destan yazdı!",
        "Chat ekran başında nefesini tuttu, kutusundan bayram havası çıktı!",
        "Kaderle girdiği tarihi düelloyu tek bir kutuyla kazandı!",
        "Cesaretinin ödülünü aldı: Kutusundan çıkan hafif ceza stüdyoyu yıktı!"
    ];

    if (subheadlineEl) {
        let pool;
        if (isHeavy) {
            if (viaDeal) pool = subheadlinesHeavyDeal;
            else if (hasSwapped) pool = subheadlinesHeavySwap;
            else pool = subheadlinesHeavyBox;
        } else {
            if (viaDeal) pool = subheadlinesLightDeal;
            else if (hasSwapped) pool = subheadlinesLightSwap;
            else pool = subheadlinesLightBox;
        }
        subheadlineEl.innerText = pool[Math.floor(Math.random() * pool.length)];
    }
    if (storyEl) {
        storyEl.innerText = isHeavy
            ? "Stüdyoda tansiyonun tavan yaptığı dakikalarda Hamdi Bey keyif kahvesini yudumlarken, IOWF stüdyoda buz kesti. Cezanın infazı için geri sayım başladı!"
            : "Yayıncı Tarık, Hamdi Bey'in tüm psikolojik baskılarına rağmen kutusuna güvendi ve cezayı hafif atlattı. Stüdyoda bayram havası esiyor!";
    }
    if (marqueeEl) {
        marqueeEl.innerText = isHeavy
            ? `🔴 FLAŞ GELİŞME: IOWF KUTUSUNDA BÜYÜK HİSSETTİ • CHAT KAHKAHAYA BOĞULDU • CEZA: ${resultDare.toUpperCase()} • ⚡ SAMO TV ÖZEL YAYINI DEVAM EDİYOR...`
            : `🟢 MÜJDE: IOWF HAFİF ATLATTI • CHATTE SEVİNÇ ÇIĞLIKLARI • CEZA: ${resultDare.toUpperCase()} • ⚡ SAMO TV ÖZEL YAYINI DEVAM EDİYOR...`;
    }

    // Hamdi verdict grade
    const gradeEl = document.getElementById('tv-hamdi-grade');
    const evalEl = document.getElementById('analysis-text');
    if (gradeEl) {
        gradeEl.innerText = isHeavy ? (viaDeal ? 'C-' : 'F') : (viaDeal ? 'B+' : 'A+');
        gradeEl.style.color = isHeavy ? '#ff4444' : '#00e676';
    }
    if (evalEl) {
        evalEl.innerText = isHeavy 
            ? '"Kutularına çok güvendi ama kaderle pazarlık yapılmaz. Bu ceza uzun süre unutulmaz!"' 
            : '"Kurnazca oynadı ve en ağır cezalardan sıyrılmayı başardı. Tebrikler!"';
    }

    // Call /api/news for OpenRouter dynamic comedy
    try {
        const resp = await fetch('/api/news', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dare: resultDare,
                isDeal: viaDeal,
                rank: rank,
                streamer: "IOWF"
            })
        });
        if (resp.ok) {
            const data = await resp.json();
            if (data && data.headline) {
                if (headlineEl) headlineEl.innerText = data.headline;
                if (data.subheadline && subheadlineEl) subheadlineEl.innerText = data.subheadline;
                if (data.summary && storyEl) storyEl.innerText = data.summary;
                if (data.emotion) applyTarikEmotion(data.emotion);
            }
        }
    } catch(e) {
        console.log("TV News API fallback active");
    }

    // Share button
    const shareBtn = document.getElementById('tv-share-btn');
    if (shareBtn) {
        shareBtn.onclick = () => {
            const shareText = `📺 SAMO TV FLAŞ HABER!\n\nKutumda Büyük Hissediyorum oyununda IOWF için kader anı belli oldu!\n🔴 Kazanılan Ceza: ${resultDare}\n\nSen de oyna: https://samokutu.vercel.app/`;
            navigator.clipboard.writeText(shareText).then(() => {
                const originalHtml = shareBtn.innerHTML;
                shareBtn.innerHTML = '<i class="fas fa-check"></i> KOPYALANDI!';
                setTimeout(() => { shareBtn.innerHTML = originalHtml; }, 2000);
            }).catch(() => {});
        };
    }
}

function applyTarikEmotion(emotion) {
    const videoEl = document.getElementById('tv-tarik-video');
    const photoEl = document.getElementById('tv-tarik-photo');
    const statusEl = document.getElementById('tv-tarik-status');

    if (statusEl) {
        statusEl.style.display = 'none';
        statusEl.remove();
    }

    initTvAudioControls();

    const isAngry = (emotion === 'sinirli' || emotion === 'uzgun' || emotion === 'saskin');
    const videoSrc = isAngry ? 'assets/video/iowfsinirli.mp4' : 'assets/video/iowfmutlu.mp4';
    const posterSrc = isAngry ? 'assets/images/tarik_sinirli.png' : 'assets/images/tarik_mutlu.png';

    if (videoEl) {
        const container = videoEl.parentElement;
        if (container) {
            container.style.backgroundImage = 'url("' + posterSrc + '")';
            container.style.backgroundSize = 'cover';
            container.style.backgroundPosition = 'center';
        }

        videoEl.loop = true;
        if (!videoEl.src.includes(videoSrc)) {
            videoEl.poster = posterSrc;
            videoEl.src = videoSrc;
            videoEl.load();
        }

        // Kullanıcının ayarladığı veya %100 varsayılan ses
        videoEl.muted = tvVideoMuted;
        videoEl.volume = tvVideoVolume;

        const playPromise = videoEl.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                videoEl.muted = tvVideoMuted;
                videoEl.volume = tvVideoVolume;
            }).catch(() => {
                videoEl.muted = true;
                videoEl.play().catch(() => {});
            });
        }
    }

    if (photoEl) {
        photoEl.src = posterSrc;
    }
}

function stopTvVideo() {
    const videoEl = document.getElementById('tv-tarik-video');
    if (videoEl) {
        videoEl.pause();
        videoEl.currentTime = 0;
        try { videoEl.src = ''; } catch(e){}
    }
}

function resetToMenu() {
    stopTvVideo();
    const tvVid = document.getElementById('tv-tarik-video');
    if (tvVid) { tvVid.pause(); tvVid.currentTime = 0; }
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
    if (!currentPoll || !streamerMode.enabled) return;
    
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

// ==========================================================================
// TEST KISAYOLU: Klavyeden 'T' tusuna basarak TV ekranini ve fotolari test et
// ==========================================================================
let testEmotionIndex = 0;
const testEmotions = [
    { emotion: 'mutlu', dare: 'chatin seçtiği şarkıyı mırıldan', rank: 21, isDeal: true },
    { emotion: 'uzgun', dare: 'Welcome to the Game 3 Başla', rank: 1, isDeal: false },
    { emotion: 'saskin', dare: '20 dakika boyunca futbol konusu açıldığında "Ben futbolun ta kendisiyim" de', rank: 9, isDeal: false },
    { emotion: 'sinirli', dare: 'instagrama "hamdi bey çay içmeye bekliyorum" olarak story at', rank: 6, isDeal: true }
];

function testTvNewsScreen() {
    const cur = testEmotions[testEmotionIndex % testEmotions.length];
    testEmotionIndex++;
    const resModal = document.getElementById('result-modal');
    if (resModal) {
        showTvNewsResult(cur.isDeal, cur.dare, cur.rank);
        setTimeout(() => { applyTarikEmotion(cur.emotion); }, 50);
        openModal(resModal);
    }
}

window.testTvNews = testTvNewsScreen;

document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if (e.key === 't' || e.key === 'T') {
        // Sadece oyun ekranı aktifken çalışsın (Menüde engellendi)
        const gameSc = document.getElementById('game-screen');
        if (gameSc && gameSc.classList.contains('active')) {
            testTvNewsScreen();
        }
    }
});


let tvVideoVolume = 1.0;
let tvVideoMuted = false;

function initTvAudioControls() {
    const slider = document.getElementById('tv-video-vol-slider');
    const label = document.getElementById('tv-video-vol-label');
    const muteBtn = document.getElementById('tv-audio-mute-btn');
    const icon = document.getElementById('tv-audio-icon');
    const videoEl = document.getElementById('tv-tarik-video');

    if (slider) {
        slider.oninput = () => {
            const val = parseInt(slider.value, 10);
            tvVideoVolume = val / 100;
            if (label) label.innerText = val + '%';
            if (videoEl) {
                videoEl.volume = tvVideoVolume;
                videoEl.muted = (val === 0);
            }
            tvVideoMuted = (val === 0);
            if (icon) {
                icon.className = tvVideoMuted ? 'fas fa-volume-mute' : (val < 50 ? 'fas fa-volume-down' : 'fas fa-volume-up');
            }
        };
    }

    if (muteBtn) {
        muteBtn.onclick = () => {
            tvVideoMuted = !tvVideoMuted;
            if (videoEl) videoEl.muted = tvVideoMuted;
            if (icon) {
                icon.className = tvVideoMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
            }
            if (tvVideoMuted) {
                if (slider) slider.value = 0;
                if (label) label.innerText = '0%';
            } else {
                const restoreVal = tvVideoVolume > 0 ? Math.round(tvVideoVolume * 100) : 100;
                tvVideoVolume = restoreVal / 100;
                if (videoEl) videoEl.volume = tvVideoVolume;
                if (slider) slider.value = restoreVal;
                if (label) label.innerText = restoreVal + '%';
            }
        };
    }
}

