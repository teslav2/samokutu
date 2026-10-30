/**
 * Streamer Mode - YouTube & Kick Chat Integration
 * Yayıncı Modu: Chat'ten gelen komutları algılayıp oyuncuları sıraya alır
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

        this.viewerQueue = []; // [{name, platform, timestamp, loyaltyPoints}]
        this.chatMessages = []; // [{name, message, platform, timestamp}]
        this.maxChatMessages = 50;
        this.pollingInterval = null;
        this.demoInterval = null;
        this.isConnected = false;

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
        localStorage.setItem('streamer_kick_id', this.kickChannelId);
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
            // Step 1: Get liveChatId from video
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

            // Step 2: Start polling live chat messages
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

    // ========== KICK CHAT ==========

    async connectKick() {
        if (!this.kickChannelName) {
            this.addSystemMessage('⚠️ Kick kanal adı gerekli!');
            return;
        }

        try {
            this.addSystemMessage('⚡ Kick chatroom ID aranıyor...');
            
            const targetUrl = `https://kick.com/api/v2/channels/${encodeURIComponent(this.kickChannelName.trim())}`;
            const proxies = [
                `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
                `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
                `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`
            ];

            const fetchFromProxy = async (url) => {
                const response = await fetch(url);
                if (!response.ok) throw new Error('Proxy failed');
                const data = await response.json();
                const cid = data.chatroom?.id || data.id;
                if (!cid) throw new Error('No chatroom ID found');
                return cid;
            };

            let chatroomId = null;
            try {
                // Try all proxies in parallel, take the fastest success
                chatroomId = await Promise.any(proxies.map(url => fetchFromProxy(url)));
            } catch (err) {
                console.warn("All proxies failed, attempting direct fetch fallback...", err);
                try {
                    const response = await fetch(targetUrl);
                    if (response.ok) {
                        const data = await response.json();
                        chatroomId = data.chatroom?.id || data.id;
                    }
                } catch (directErr) {
                    console.error("Direct fetch failed too:", directErr);
                }
            }

            if (chatroomId) {
                this.connectKickWebSocket(chatroomId);
            } else {
                this.addSystemMessage('❌ Kick kanal bilgisi alınamadı! Lütfen kanal adınızı kontrol edin.');
            }

        } catch (e) {
            this.addSystemMessage(`❌ Kick bağlantı hatası: ${e.message}`);
            console.error('Kick connection error:', e);
        }
    }

    connectKickWebSocket(channelId) {
        // Connect to Pusher WebSocket
        this.kickWs = new WebSocket('wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=7.4.0&flash=false');

        this.kickWs.onopen = () => {
            // Subscribe to chatroom channel
            const subscribeMsg = JSON.stringify({
                event: 'pusher:subscribe',
                data: { channel: `chatrooms.${channelId}.v2` }
            });
            this.kickWs.send(subscribeMsg);
            
            this.isConnected = true;
            this.addSystemMessage('✅ Kick Chat bağlandı!');

            if (this.onConnectionChange) {
                this.onConnectionChange(true, 'kick');
            }
        };

        this.kickWs.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.event === 'App\\Events\\ChatMessageEvent') {
                    const msgData = JSON.parse(data.data);
                    const msg = {
                        name: msgData.sender?.username || 'Anonim',
                        message: msgData.content || '',
                        platform: 'kick',
                        timestamp: Date.now(),
                        isModerator: msgData.sender?.is_moderator || false,
                        isOwner: msgData.sender?.is_broadcaster || false
                    };
                    this.processMessage(msg);
                }
            } catch (e) {
                // Ignore non-chat messages
            }
        };

        this.kickWs.onclose = () => {
            if (this.isConnected) {
                this.isConnected = false;
                this.addSystemMessage('⚠️ Kick bağlantısı kesildi. 3 saniye içinde yeniden bağlanılıyor...');
                if (this.onConnectionChange) {
                    this.onConnectionChange(false, 'kick');
                }
                setTimeout(() => {
                    if (this.enabled && this.platform === 'kick') {
                        this.connectKick();
                    }
                }, 3000);
            } else {
                if (this.onConnectionChange) {
                    this.onConnectionChange(false, 'kick');
                }
            }
        };

        this.kickWs.onerror = (err) => {
            console.error('Kick WebSocket error:', err);
        };
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

        // Check if message contains trigger command
        const normalizedMsg = msg.message.toLowerCase().trim();
        const normalizedTrigger = this.triggerCommand.toLowerCase().trim();

        // Check for exact command or "var mısın yok musun oyna" pattern
        const triggerPatterns = [
            normalizedTrigger,
            'var mısın yok musun oyna',
            'varmısın yokmusun oyna',
            'oyna',
            '!play'
        ];

        const isTriggered = triggerPatterns.some(pattern => normalizedMsg.includes(pattern));

        if (isTriggered) {
            this.addToQueue(msg);
        }
    }

    addToQueue(msg) {
        // Check if viewer is already in queue
        const alreadyInQueue = this.viewerQueue.some(v => v.name === msg.name);
        if (alreadyInQueue) return;

        const viewer = {
            name: msg.name,
            platform: msg.platform,
            timestamp: msg.timestamp,
            loyaltyPoints: Math.floor(Math.random() * 1000), // Demo: random points
            isModerator: msg.isModerator
        };

        // Check loyalty points requirement
        if (this.minLoyaltyPoints > 0 && viewer.loyaltyPoints < this.minLoyaltyPoints) {
            // Not enough points, skip silently
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
