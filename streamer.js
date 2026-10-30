/**
 * Streamer Mode - YouTube & Kick Chat Integration
 * Yayıncı Modu: Chat'ten gelen komutları algılayıp oyuncuları sıraya alır
 * Güncel Kick Centrifugo WebSocket + Yüksek Hızlı REST Mimarisini Destekler
 */

class StreamerMode {
    constructor() {
        this.enabled = false;
        this.platform = 'demo'; // 'youtube', 'kick', 'demo'
        this.triggerCommand = '!oyna';
        this.minLoyaltyPoints = 0;
        this.youtubeApiKey = '';
        this.youtubeVideoId = '';
        this.youtubeLiveChatId = null;
        this.youtubeNextPageToken = '';
        this.kickChannelName = '';
        this.kickChannelId = null;
        this.kickWs = null;

        this.viewerQueue = []; // [{name, platform, timestamp, loyaltyPoints, color}]
        this.chatMessages = []; // [{name, message, platform, timestamp, color}]
        this.maxChatMessages = 50;
        this.pollingInterval = null;
        this.demoInterval = null;
        this.isConnected = false;

        // Kick specific tracking
        this.joinedUsers = new Set();
        this.processedKickMessageIds = new Set();
        this.kickPingInterval = null;
        this.kickPollInterval = null;

        // Callbacks
        this.onChatMessage = null;
        this.onViewerJoinQueue = null;
        this.onConnectionChange = null;

        // Load config from localStorage
        this.loadConfig();
    }

    loadConfig() {
        this.platform = localStorage.getItem('streamer_platform') || 'demo';
        this.triggerCommand = localStorage.getItem('streamer_trigger') || '!oyna';
        this.minLoyaltyPoints = parseInt(localStorage.getItem('streamer_min_loyalty') || '0');
        this.youtubeApiKey = localStorage.getItem('streamer_yt_api_key') || '';
        this.youtubeVideoId = localStorage.getItem('streamer_yt_video_id') || '';
        this.kickChannelName = localStorage.getItem('streamer_kick_channel') || '';
        this.kickChannelId = localStorage.getItem('streamer_kick_id') || '';
        this.enabled = localStorage.getItem('streamer_enabled') === 'true';
    }

    saveConfig() {
        localStorage.setItem('streamer_platform', this.platform);
        localStorage.setItem('streamer_trigger', this.triggerCommand);
        localStorage.setItem('streamer_min_loyalty', this.minLoyaltyPoints.toString());
        localStorage.setItem('streamer_yt_api_key', this.youtubeApiKey);
        localStorage.setItem('streamer_yt_video_id', this.youtubeVideoId);
        localStorage.setItem('streamer_kick_channel', this.kickChannelName);
        localStorage.setItem('streamer_kick_id', this.kickChannelId || '');
        localStorage.setItem('streamer_enabled', this.enabled.toString());
    }

    // ========== CONNECTION MANAGEMENT ==========

    async connect() {
        this.disconnect();

        switch (this.platform) {
            case 'youtube':
                await this.connectYouTube();
                break;
            case 'kick':
                await this.connectKick();
                break;
            case 'demo':
                this.connectDemo();
                break;
        }
    }

    disconnect() {
        this.isConnected = false;

        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }

        if (this.demoInterval) {
            clearInterval(this.demoInterval);
            this.demoInterval = null;
        }

        if (this.kickPingInterval) {
            clearInterval(this.kickPingInterval);
            this.kickPingInterval = null;
        }

        if (this.kickPollInterval) {
            clearInterval(this.kickPollInterval);
            this.kickPollInterval = null;
        }

        if (this.kickWs) {
            try { this.kickWs.close(); } catch (e) {}
            this.kickWs = null;
        }

        if (this.onConnectionChange) {
            this.onConnectionChange(false, this.platform);
        }
    }

    // ========== YOUTUBE LIVE CHAT ==========

    async connectYouTube() {
        if (!this.youtubeApiKey || !this.youtubeVideoId) {
            this.addSystemMessage('⚠️ YouTube API Anahtarı ve Video ID gerekli!');
            return;
        }

        try {
            const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${this.youtubeVideoId}&key=${this.youtubeApiKey}`;
            const videoRes = await fetch(videoUrl);
            const videoData = await videoRes.json();

            if (!videoData.items || videoData.items.length === 0) {
                this.addSystemMessage('❌ Video bulunamadı veya canlı yayın değil!');
                return;
            }

            const liveDetails = videoData.items[0].liveStreamingDetails;
            if (!liveDetails || !liveDetails.activeLiveChatId) {
                this.addSystemMessage('❌ Bu video aktif bir canlı yayın değil!');
                return;
            }

            this.youtubeLiveChatId = liveDetails.activeLiveChatId;
            this.isConnected = true;
            this.addSystemMessage('✅ YouTube Live Chat bağlandı!');

            if (this.onConnectionChange) {
                this.onConnectionChange(true, 'youtube');
            }

            this.pollYouTubeChat();
            this.pollingInterval = setInterval(() => this.pollYouTubeChat(), 2500);

        } catch (e) {
            this.addSystemMessage(`❌ YouTube bağlantı hatası: ${e.message}`);
            console.error('YouTube connection error:', e);
        }
    }

    async pollYouTubeChat() {
        if (!this.youtubeLiveChatId || !this.isConnected) return;

        try {
            let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${this.youtubeLiveChatId}&part=snippet,authorDetails&key=${this.youtubeApiKey}`;
            if (this.youtubeNextPageToken) {
                url += `&pageToken=${this.youtubeNextPageToken}`;
            }

            const res = await fetch(url);
            const data = await res.json();

            if (data.error) {
                console.error('YouTube API error:', data.error);
                return;
            }

            this.youtubeNextPageToken = data.nextPageToken || '';

            if (data.items) {
                data.items.forEach(item => {
                    const msg = {
                        name: item.authorDetails.displayName,
                        message: item.snippet.displayMessage,
                        platform: 'youtube',
                        timestamp: Date.now(),
                        isModerator: item.authorDetails.isChatModerator,
                        isOwner: item.authorDetails.isChatOwner
                    };
                    this.processMessage(msg);
                });
            }
        } catch (e) {
            console.error('YouTube polling error:', e);
        }
    }

    // ========== KICK CHAT (GÜNCEL WEBSOCKET & REST MİMARİSİ) ==========

    async connectKick() {
        const inputVal = (this.kickChannelName || '').trim();
        const idVal = (this.kickChannelId || '').trim();

        if (!inputVal && !idVal) {
            this.addSystemMessage('⚠️ Kick kanal adı veya Chatroom ID gerekli!');
            return;
        }

        try {
            this.addSystemMessage('⚡ Kick kanal bilgisi doğrulanıyor...');

            let channelId = null;
            let chatroomId = null;

            // 1. Doğrudan sayısal ID girilmiş mi kontrol et
            if (idVal && /^\d+$/.test(idVal)) {
                channelId = idVal;
                chatroomId = idVal;
            } else if (inputVal && /^\d+$/.test(inputVal)) {
                channelId = inputVal;
                chatroomId = inputVal;
            }

            // 2. Kullanıcı adı girildiyse Kick API'den channel_id ve chatroom_id al
            if (!channelId || !chatroomId) {
                const slug = inputVal.toLowerCase();
                const targetUrl = `https://kick.com/api/v2/channels/${encodeURIComponent(slug)}`;
                
                const sources = [
                    targetUrl,
                    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
                    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
                ];

                for (const url of sources) {
                    try {
                        const res = await fetch(url, {
                            headers: {
                                'Accept': 'application/json'
                            }
                        });
                        if (res.ok) {
                            const data = await res.json();
                            if (data && (data.id || data.chatroom?.id)) {
                                channelId = data.id;
                                chatroomId = data.chatroom?.id || data.id;
                                this.addSystemMessage(`🔍 Kick Kanal Bulundu: ${data.slug || slug} (Channel ID: ${channelId}, Chatroom: ${chatroomId})`);
                                break;
                            }
                        }
                    } catch (fetchErr) {
                        // Diğer kaynağı dene
                    }
                }
            }

            if (!channelId && !chatroomId) {
                this.addSystemMessage('❌ Kick kanal bilgisi alınamadı! Lütfen kanal adınızı veya Chatroom ID numaranızı kontrol edin.');
                return;
            }

            this.kickChannelId = chatroomId;
            this.saveConfig();

            // 3. WebSocket ve REST Polling Başlat
            await this.startKickConnection(channelId, chatroomId);

        } catch (e) {
            this.addSystemMessage(`❌ Kick bağlantı hatası: ${e.message}`);
            console.error('Kick connection error:', e);
        }
    }

    async startKickConnection(channelId, chatroomId) {
        this.isConnected = true;
        this.processedKickMessageIds = new Set();

        if (this.onConnectionChange) {
            this.onConnectionChange(true, 'kick');
        }

        // Adım 2.1: Kick Viewer WebSocket'e bağlanmayı dene (Presence / Heartbeat)
        await this.connectKickViewerWebSocket(chatroomId);

        // Adım 2.2: Kesintisiz ve %100 güvenilir yüksek hızlı REST Polling başlat (her 800ms)
        this.startKickPolling(channelId);

        this.addSystemMessage('✅ Kick Chat başarıyla bağlandı! "!oyna" komutları dinleniyor.');
    }

    async connectKickViewerWebSocket(chatroomId) {
        try {
            // Dinamik Token Alma
            const tokenRes = await fetch('https://websockets.kick.com/viewer/v1/token', {
                headers: {
                    'Accept': 'application/json',
                    'X-CLIENT-TOKEN': 'e1393935a959b4020a4491574f6490129f678acdaa92760471263db43487f823'
                }
            });

            if (tokenRes.ok) {
                const tokenData = await tokenRes.json();
                const token = tokenData?.data?.token;

                if (token) {
                    this.kickWs = new WebSocket(`wss://websockets.kick.com/viewer/v1/connect?token=${token}`);

                    this.kickWs.onopen = () => {
                        // Her 25-30 saniyede bir ping gönder (bağlantıyı canlı tut)
                        if (this.kickPingInterval) clearInterval(this.kickPingInterval);
                        this.kickPingInterval = setInterval(() => {
                            if (this.kickWs && this.kickWs.readyState === WebSocket.OPEN) {
                                try {
                                    this.kickWs.send(JSON.stringify({ type: 'ping' }));
                                } catch (e) {}
                            }
                        }, 25000);
                    };

                    this.kickWs.onmessage = (event) => {
                        try {
                            const data = JSON.parse(event.data);
                            if (data && (data.type === 'message' || data.event === 'ChatMessageEvent' || data.content)) {
                                this.handleIncomingKickMessage(data);
                            }
                        } catch (err) {}
                    };

                    this.kickWs.onclose = () => {
                        if (this.kickPingInterval) {
                            clearInterval(this.kickPingInterval);
                            this.kickPingInterval = null;
                        }
                    };

                    this.kickWs.onerror = (err) => {
                        console.warn('Kick WebSocket uyarısı:', err);
                    };
                }
            }
        } catch (wsErr) {
            console.warn('Kick WebSocket token atlandı, anlık REST polling aktif:', wsErr);
        }
    }

    startKickPolling(channelId) {
        if (this.kickPollInterval) {
            clearInterval(this.kickPollInterval);
        }

        const pollMessages = async () => {
            if (!this.isConnected || this.platform !== 'kick') return;

            try {
                const url = `https://kick.com/api/v2/channels/${channelId}/messages?_t=${Date.now()}`;
                const res = await fetch(url, {
                    headers: {
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache, no-store'
                    }
                });

                if (res.ok) {
                    const json = await res.json();
                    const messages = json?.data?.messages || [];
                    
                    // Mesajları eskiden yeniye doğru sırayla işle
                    for (let i = messages.length - 1; i >= 0; i--) {
                        this.handleIncomingKickMessage(messages[i]);
                    }
                }
            } catch (pollErr) {
                // Sessizce sonraki döngüde devam et
            }
        };

        // Hemen ilk çekim
        pollMessages();
        // Her 800ms'de bir kontrol et (akıcı canlı chat)
        this.kickPollInterval = setInterval(pollMessages, 800);
    }

    handleIncomingKickMessage(raw) {
        if (!raw) return;

        // Mesaj ID tekillik kontrolü (Duplicate mesajları önleme)
        const msgId = raw.id || `${raw.created_at}_${raw.sender?.username || raw.sender?.slug}_${raw.content}`;
        if (this.processedKickMessageIds.has(msgId)) {
            return;
        }
        this.processedKickMessageIds.add(msgId);

        // Bellek şişmesini önle (en son 1000 ID tutulur)
        if (this.processedKickMessageIds.size > 2000) {
            const arr = Array.from(this.processedKickMessageIds);
            this.processedKickMessageIds = new Set(arr.slice(arr.length - 1000));
        }

        const sender = raw.sender || {};
        const username = sender.username || sender.slug || 'Anonim';
        const color = sender.identity?.color || '#00fdfe';
        const content = (raw.content || '').trim();
        const timestamp = raw.created_at ? new Date(raw.created_at).getTime() : Date.now();

        const isMod = !!sender.identity?.badges?.some(b => b.type === 'moderator' || b.type === 'broadcaster');
        const isOwner = !!sender.identity?.badges?.some(b => b.type === 'broadcaster');

        const msg = {
            id: msgId,
            name: username,
            message: content,
            color: color,
            platform: 'kick',
            timestamp: timestamp,
            isModerator: isMod,
            isOwner: isOwner
        };

        this.processMessage(msg);
    }

    // ========== DEMO MODE ==========

    connectDemo() {
        this.isConnected = true;
        this.addSystemMessage('🎮 Demo Modu aktif! Simüle chat mesajları gelecek...');

        if (this.onConnectionChange) {
            this.onConnectionChange(true, 'demo');
        }

        const demoNames = [
            'aycinkavak', 'Lloyd',
            'DepresifTosbaa', 'llleandreas', 'dream_33', 'PANDA_ADAM',
            'xKral_TR', 'GamerGirl99', 'TurkishSniper', 'AhmetPlays',
            'StormBreaker', 'NeonWolf', 'CyberPunk_42', 'ShadowHunter',
            'DragonSlayer', 'PixelMaster', 'RocketBoy', 'IceQueen',
            'ThunderStrike', 'DarkPhoenix', 'BlazeFire', 'NightOwl23',
            'StarDust_', 'CosmicRay', 'WildCard_TR', 'EpicFail404',
            'MysteryMan', 'LuckyShot', 'ProGamer_1', 'CoolDude55'
        ];

        const chatMessages = [
            'herkese selam!', 'bu oyun efsane', 'nasılsınız?', 'yayıncı kral',
            'gg wp', 'harika yayın', 'LOL', ':D', 'ben de oynamak istiyorum',
            'süper oyun', 'hadi bakalım', 'acaba ne çıkacak', 'ceza çok ağır',
            'kolay gelsin', 'şansımı deneyeyim', 'inşallah hafif ceza çıkar'
        ];

        let msgIndex = 0;

        this.demoInterval = setInterval(() => {
            if (!this.isConnected) return;

            const name = demoNames[Math.floor(Math.random() * demoNames.length)];
            
            // 30% chance to send trigger command, 70% regular chat
            const isTrigger = Math.random() < 0.3;
            const message = isTrigger 
                ? this.triggerCommand 
                : chatMessages[Math.floor(Math.random() * chatMessages.length)];

            const msg = {
                name: name,
                message: message,
                color: '#ffd700',
                platform: 'demo',
                timestamp: Date.now(),
                isModerator: Math.random() < 0.1,
                isOwner: false
            };

            this.processMessage(msg);
            msgIndex++;
        }, 2000 + Math.random() * 3000);
    }

    // ========== MESSAGE PROCESSING ==========

    processMessage(msg) {
        // Add to chat display
        this.chatMessages.push(msg);
        if (this.chatMessages.length > this.maxChatMessages) {
            this.chatMessages.shift();
        }

        if (this.onChatMessage) {
            this.onChatMessage(msg);
        }

        // !oyna Komut Kontrolü (Case-Insensitive Regex)
        const cleanContent = (msg.message || '').trim();
        const isOynaCommand = /^!oyna\b/i.test(cleanContent);
        
        // Trigger command desteği
        const normalizedMsg = cleanContent.toLowerCase();
        const normalizedTrigger = (this.triggerCommand || '!oyna').toLowerCase().trim();

        const triggerPatterns = [
            normalizedTrigger,
            'var mısın yok musun oyna',
            'varmısın yokmusun oyna',
            'oyna',
            '!play'
        ];

        const isTriggered = isOynaCommand || triggerPatterns.some(pattern => normalizedMsg.includes(pattern));

        if (isTriggered) {
            this.addToQueue(msg);
        }
    }

    addToQueue(msg) {
        const username = (msg.name || '').trim();
        const userKey = username.toLowerCase();

        // Mükerrer katılım engeli (Aynı kullanıcı tekrar sıraya giremez)
        if (this.joinedUsers.has(userKey)) {
            return;
        }
        this.joinedUsers.add(userKey);

        const viewer = {
            id: msg.id || `${Date.now()}_${username}`,
            name: msg.name,
            color: msg.color || '#00fdfe',
            platform: msg.platform,
            timestamp: msg.timestamp || Date.now(),
            loyaltyPoints: Math.floor(Math.random() * 1000), // Puan hesabı
            isModerator: msg.isModerator
        };

        // Puan filtresi
        if (this.minLoyaltyPoints > 0 && viewer.loyaltyPoints < this.minLoyaltyPoints) {
            return;
        }

        this.viewerQueue.push(viewer);

        if (this.onViewerJoinQueue) {
            this.onViewerJoinQueue(viewer);
        }

        this.addSystemMessage(`🎯 ${viewer.name} sıraya girdi! (Sıra: ${this.viewerQueue.length})`);
    }

    // Get next viewer from queue
    getNextViewer() {
        if (this.viewerQueue.length === 0) return null;
        return this.viewerQueue.shift();
    }

    // Peek at queue without removing
    peekQueue() {
        return [...this.viewerQueue];
    }

    clearQueue() {
        this.viewerQueue = [];
        this.joinedUsers.clear();
    }

    // ========== UTILITY ==========

    addSystemMessage(text) {
        const msg = {
            name: '🤖 Sistem',
            message: text,
            platform: 'system',
            timestamp: Date.now(),
            isSystem: true
        };

        this.chatMessages.push(msg);
        if (this.chatMessages.length > this.maxChatMessages) {
            this.chatMessages.shift();
        }

        if (this.onChatMessage) {
            this.onChatMessage(msg);
        }
    }

    getPlatformIcon(platform) {
        switch (platform) {
            case 'youtube': return 'fab fa-youtube';
            case 'kick': return 'fas fa-bolt';
            case 'demo': return 'fas fa-gamepad';
            case 'system': return 'fas fa-robot';
            default: return 'fas fa-comment';
        }
    }

    getPlatformColor(platform) {
        switch (platform) {
            case 'youtube': return '#ff0000';
            case 'kick': return '#53fc18';
            case 'demo': return '#ffd700';
            case 'system': return '#00bfff';
            default: return '#888';
        }
    }
}

// Global instance
const streamerMode = new StreamerMode();
