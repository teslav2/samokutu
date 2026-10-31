/**
 * Streamer Mode - YouTube & Kick Chat Integration
 * Yayıncı Modu: Chat'ten gelen komutları algılayıp oyuncuları sıraya alır
 * Güncel Kick Centrifugo WebSocket + Yüksek Hızlı REST Mimarisini Destekler
 */

class StreamerMode {
    constructor() {
        this.enabled = false;
        this.platform = 'kick'; // 'kick', 'youtube' (demo kaldırıldı)
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
        this.isConnected = false;

        // Kick specific tracking
        this.joinedUsers = new Set();
        this.processedKickMessageIds = new Set();
        this.kickPingInterval = null;
        this.kickPollInterval = null;
        this.connectionStartTime = 0;
        this.isInitialKickPoll = true;

        // Callbacks
        this.onChatMessage = null;
        this.onViewerJoinQueue = null;
        this.onConnectionChange = null;

        // Load config from localStorage
        this.loadConfig();
    }

    loadConfig() {
        let savedPlatform = localStorage.getItem('streamer_platform') || 'kick';
        if (savedPlatform === 'demo') savedPlatform = 'kick';
        this.platform = savedPlatform;

        this.triggerCommand = localStorage.getItem('streamer_trigger') || '!oyna';
        this.minLoyaltyPoints = parseInt(localStorage.getItem('streamer_min_loyalty') || '0');
        this.youtubeApiKey = localStorage.getItem('streamer_yt_api_key') || '';
        this.youtubeVideoId = localStorage.getItem('streamer_yt_video_id') || '';
        this.kickChannelName = localStorage.getItem('streamer_kick_channel') || '';
        this.kickChannelId = localStorage.getItem('streamer_kick_id') || '';
        this.enabled = localStorage.getItem('streamer_enabled') === 'true';
    }

    saveConfig() {
        localStorage.setItem('streamer_platform', this.platform === 'demo' ? 'kick' : this.platform);
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
                return await this.connectYouTube();
            case 'kick':
            default:
                return await this.connectKick();
        }
    }

    disconnect() {
        this.isConnected = false;

        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
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
            return false;
        }

        try {
            const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${this.youtubeVideoId}&key=${this.youtubeApiKey}`;
            const videoRes = await fetch(videoUrl);
            const videoData = await videoRes.json();

            if (!videoData.items || videoData.items.length === 0) {
                this.addSystemMessage('❌ Video bulunamadı veya canlı yayın değil!');
                return false;
            }

            const liveDetails = videoData.items[0].liveStreamingDetails;
            if (!liveDetails || !liveDetails.activeLiveChatId) {
                this.addSystemMessage('❌ Bu video aktif bir canlı yayın değil!');
                return false;
            }

            this.youtubeLiveChatId = liveDetails.activeLiveChatId;
            this.isConnected = true;
            this.addSystemMessage('✅ YouTube Live Chat bağlandı!');

            if (this.onConnectionChange) {
                this.onConnectionChange(true, 'youtube');
            }

            this.pollYouTubeChat();
            this.pollingInterval = setInterval(() => this.pollYouTubeChat(), 2500);
            return true;

        } catch (e) {
            this.addSystemMessage(`❌ YouTube bağlantı hatası: ${e.message}`);
            console.error('YouTube connection error:', e);
            return false;
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

        if (!inputVal) {
            this.addSystemMessage('⚠️ Kick kanal adı gerekli!');
            if (this.onConnectionChange) this.onConnectionChange(false, 'kick');
            return false;
        }

        try {
            let channelId = null;
            let chatroomId = null;

            // 1. Doğrudan sayısal ID girilmişse kontrol et
            if (/^\d+$/.test(inputVal)) {
                channelId = inputVal;
                chatroomId = inputVal;
            } else {
                // 2. Kullanıcı adından API ile channel_id ve chatroom_id al
                const slug = inputVal.toLowerCase();
                const targetUrl = `https://kick.com/api/v2/channels/${encodeURIComponent(slug)}`;
                
                // Öncelik Vercel Serverless API (/api/kick), ardından CORS proxy alternatifleri
                const sources = [
                    `/api/kick?action=channel&slug=${encodeURIComponent(slug)}`,
                    targetUrl,
                    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
                    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
                ];

                for (const url of sources) {
                    try {
                        const res = await fetch(url, {
                            headers: { 'Accept': 'application/json' }
                        });
                        if (res.ok) {
                            const data = await res.json();
                            if (data && (data.id || data.chatroom?.id)) {
                                channelId = data.id;
                                chatroomId = data.chatroom?.id || data.id;
                                break;
                            }
                        }
                    } catch (fetchErr) {}
                }
            }

            if (!channelId || !chatroomId) {
                this.addSystemMessage('❌ Kick kanalı bulunamadı! Lütfen kanal adınızı kontrol edin.');
                if (this.onConnectionChange) this.onConnectionChange(false, 'kick');
                return false;
            }

            this.kickChannelId = chatroomId;
            this.kickChannelName = inputVal;
            this.saveConfig();

            // 3. WebSocket ve REST Polling Başlat
            await this.startKickConnection(channelId, chatroomId);
            return true;

        } catch (e) {
            this.addSystemMessage(`❌ Kick bağlantı hatası: ${e.message}`);
            console.error('Kick connection error:', e);
            if (this.onConnectionChange) this.onConnectionChange(false, 'kick');
            return false;
        }
    }

    async startKickConnection(channelId, chatroomId) {
        this.isConnected = true;
        this.connectionStartTime = Date.now();
        this.isInitialKickPoll = true;
        this.processedKickMessageIds = new Set();

        // 1. Centrifugo Viewer WebSocket
        await this.connectKickViewerWebSocket(chatroomId);

        // 2. Anlık REST Poller (Her 800ms)
        this.startKickPolling(channelId);

        if (this.onConnectionChange) {
            this.onConnectionChange(true, 'kick');
        }

        this.addSystemMessage(`✅ Kick Chat bağlandı! (Kanal: ${this.kickChannelName})`);
    }

    async connectKickViewerWebSocket(chatroomId) {
        try {
            // Önce Vercel Serverless proxy'yi dene, ardından doğrudan endpoint'i dene
            let token = null;
            const tokenEndpoints = [
                '/api/kick?action=token',
                'https://websockets.kick.com/viewer/v1/token'
            ];

            for (const ep of tokenEndpoints) {
                try {
                    const tokenRes = await fetch(ep, {
                        headers: {
                            'Accept': 'application/json',
                            'X-CLIENT-TOKEN': 'e1393935a959b4020a4491574f6490129f678acdaa92760471263db43487f823'
                        }
                    });
                    if (tokenRes.ok) {
                        const tokenData = await tokenRes.json();
                        token = tokenData?.data?.token;
                        if (token) break;
                    }
                } catch (e) {}
            }

            if (token) {
                this.kickWs = new WebSocket(`wss://websockets.kick.com/viewer/v1/connect?token=${token}`);

                this.kickWs.onopen = () => {
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
        } catch (wsErr) {
            console.warn('Kick WebSocket atlandı, REST polling aktif:', wsErr);
        }
    }

    startKickPolling(channelId) {
        if (this.kickPollInterval) {
            clearInterval(this.kickPollInterval);
        }

        let useApiProxy = true;

        const pollMessages = async () => {
            if (!this.isConnected || this.platform !== 'kick') return;

            try {
                let url;
                if (useApiProxy) {
                    url = `/api/kick?action=messages&channelId=${encodeURIComponent(channelId)}`;
                } else {
                    url = `https://kick.com/api/v2/channels/${channelId}/messages?_t=${Date.now()}`;
                }

                const res = await fetch(url, {
                    headers: {
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache, no-store'
                    }
                });

                if (res.ok) {
                    const json = await res.json();
                    const messages = json?.data?.messages || [];
                    
                    // İlk çalıştırmada var olan eski geçmiş mesajları yalnızca ID olarak kaydet,
                    // ekrana basma ve !oyna / kutu komutu olarak işletme!
                    if (this.isInitialKickPoll) {
                        this.isInitialKickPoll = false;
                        for (const m of messages) {
                            const msgId = m.id || `${m.created_at}_${m.sender?.username || m.sender?.slug}_${m.content}`;
                            this.processedKickMessageIds.add(msgId);
                        }
                        return;
                    }

                    for (let i = messages.length - 1; i >= 0; i--) {
                        this.handleIncomingKickMessage(messages[i]);
                    }
                } else if (useApiProxy && res.status === 404) {
                    // Eğer /api/kick endpoint'i bulunamazsa (statik hosting vb.) doğrudan adrese geç
                    useApiProxy = false;
                }
            } catch (pollErr) {
                if (useApiProxy) {
                    useApiProxy = false;
                }
            }
        };

        pollMessages();
        this.kickPollInterval = setInterval(pollMessages, 750);
    }

    handleIncomingKickMessage(raw) {
        if (!raw) return;

        // Bağlantı kurulmadan önce gönderilmiş eski mesajları yoksay
        if (raw.created_at && this.connectionStartTime > 0) {
            const msgTime = new Date(raw.created_at).getTime();
            if (msgTime < this.connectionStartTime - 3000) {
                return;
            }
        }

        const msgId = raw.id || `${raw.created_at}_${raw.sender?.username || raw.sender?.slug}_${raw.content}`;
        if (this.processedKickMessageIds.has(msgId)) {
            return;
        }
        this.processedKickMessageIds.add(msgId);

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

    // ========== MESSAGE PROCESSING ==========

    processMessage(msg) {
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

        // 1. Zaten sırada bekleyen kullanıcı tekrar sıraya giremez (spam engeli)
        const isAlreadyInQueue = this.viewerQueue.some(v => (v.name || '').toLowerCase() === userKey);
        if (isAlreadyInQueue) {
            return;
        }

        // 2. Aktif olarak oynayan yarışmacı, kutusunu seçip sırası bitene kadar tekrar sıraya giremez
        if (typeof activeViewer !== 'undefined' && activeViewer && (activeViewer.name || '').toLowerCase() === userKey) {
            return;
        }

        const viewer = {
            id: msg.id || `${Date.now()}_${username}`,
            name: msg.name,
            color: msg.color || '#00fdfe',
            platform: msg.platform,
            timestamp: msg.timestamp || Date.now(),
            loyaltyPoints: Math.floor(Math.random() * 1000),
            isModerator: msg.isModerator
        };

        if (this.minLoyaltyPoints > 0 && viewer.loyaltyPoints < this.minLoyaltyPoints) {
            return;
        }

        this.viewerQueue.push(viewer);

        if (this.onViewerJoinQueue) {
            this.onViewerJoinQueue(viewer);
        }

        this.addSystemMessage(`🎯 ${viewer.name} sıraya girdi! (Sıra: ${this.viewerQueue.length})`);
    }

    getNextViewer() {
        if (this.viewerQueue.length === 0) return null;
        return this.viewerQueue.shift();
    }

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
            case 'system': return 'fas fa-robot';
            default: return 'fas fa-comment';
        }
    }

    getPlatformColor(platform) {
        switch (platform) {
            case 'youtube': return '#ff0000';
            case 'kick': return '#53fc18';
            case 'system': return '#00bfff';
            default: return '#888';
        }
    }
}

// Global instance
const streamerMode = new StreamerMode();
