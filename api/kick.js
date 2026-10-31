const https = require('https');

function httpsGet(url, customHeaders = {}) {
    return new Promise((resolve, reject) => {
        const headers = {
            'User-Agent': 'curl/8.21.0',
            'Accept': 'application/json',
            ...customHeaders
        };

        const req = https.get(url, { headers }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                resolve({
                    status: res.statusCode || 200,
                    data: data
                });
            });
        });

        req.on('error', err => reject(err));
        req.setTimeout(8000, () => {
            req.destroy(new Error('Kick API timeout'));
        });
    });
}

module.exports = async function handler(req, res) {
    // Enable CORS for all incoming requests (Vercel deployment & previews)
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { action, slug, channelId } = req.query || {};

    try {
        if (action === 'channel') {
            if (!slug) {
                return res.status(400).json({ error: 'slug parameter required' });
            }
            const cleanSlug = encodeURIComponent(String(slug).trim().toLowerCase());
            const targetUrl = `https://kick.com/api/v2/channels/${cleanSlug}`;
            const result = await httpsGet(targetUrl);

            res.status(result.status);
            res.setHeader('Content-Type', 'application/json');
            return res.send(result.data);
        }

        if (action === 'messages') {
            if (!channelId) {
                return res.status(400).json({ error: 'channelId parameter required' });
            }
            const cleanId = encodeURIComponent(String(channelId).trim());
            const targetUrl = `https://kick.com/api/v2/channels/${cleanId}/messages?_t=${Date.now()}`;
            const result = await httpsGet(targetUrl);

            res.status(result.status);
            res.setHeader('Content-Type', 'application/json');
            return res.send(result.data);
        }

        if (action === 'token') {
            const targetUrl = 'https://websockets.kick.com/viewer/v1/token';
            const result = await httpsGet(targetUrl, {
                'X-CLIENT-TOKEN': 'e1393935a959b4020a4491574f6490129f678acdaa92760471263db43487f823'
            });

            res.status(result.status);
            res.setHeader('Content-Type', 'application/json');
            return res.send(result.data);
        }

        return res.status(400).json({
            error: 'Invalid or missing action parameter. Available: channel, messages, token'
        });

    } catch (err) {
        console.error('Kick proxy error:', err);
        return res.status(500).json({ error: err.message || 'Internal proxy error' });
    }
};
