// api/news.js - Vercel Serverless Function for TV Breaking News generation
const https = require('https');

// Hilarious fallback news generation engine (in case OpenRouter key is offline or not provided)
function generateComedicNews(dare, isDeal, rank, streamer = "IOWF") {
    const isHeavy = rank <= 12;
    
    const headlinesHeavy = [
        `${streamer.toUpperCase()}'UN KUTUSUNDAN ÇIKAN AĞIR CEZA KICK YAYININI SALLADI!`,
        `FLAŞ GELİŞME: ${streamer.toUpperCase()} CANLI YAYINDA KADERİNE BOYUN EĞDİ!`,
        `HAMDİ BEY YİNE YAPTI YAPACAĞINI: ${streamer.toUpperCase()} STÜDYOYU TERK ETME NOKTASINDA!`,
        `TARİHİ ANLAR: ${streamer.toUpperCase()} BÜYÜK HİSSETTİ AMA SONUÇ FELAKET ÇIKTI!`
    ];
    
    const headlinesLight = [
        `${streamer.toUpperCase()} KADERİN SİLLESİNDEN KIL PAYI KURTULDU!`,
        `HAMDİ BEY ŞOKTA: ${streamer.toUpperCase()} CEZAYI HAFİF SIYIRDI!`,
        `STÜDYODA BAYRAM HAVASI: ${streamer.toUpperCase()} BU KEZ UCUZ ATLATTI!`,
        `FLAŞ: ${streamer.toUpperCase()} KUTUSUNA GÜVENDİ VE YÜZÜ GÜLDÜ!`
    ];

    const summaries = [
        `Gözyaşlarının ve kahkahaların havada uçuştuğu tarihi gecede, Hamdi Bey'in telefon teklifleri stüdyodaki tansiyonu tavan yaptırdı. Chat ekran başında nefesini tutarken, kader kutusu nihayet açıldı!`,
        `Yayıncı ${streamer}, 'Kutumda büyük hissediyorum' diyerek girdiği mücadelede son ana kadar direndi. Ancak stüdyodaki izleyiciler ve chat ekibi acil durum ilan etmek zorunda kaldı!`,
        `Hamdi Bey telefonun diğer ucunda keyif kahvesini yudumlarken, ${streamer} stüdyoda buz kesti. Cezanın infazı için geri sayım başladı!`
    ];

    const headline = isHeavy 
        ? headlinesHeavy[Math.floor(Math.random() * headlinesHeavy.length)]
        : headlinesLight[Math.floor(Math.random() * headlinesLight.length)];

    const summary = summaries[Math.floor(Math.random() * summaries.length)];
    const emotion = isHeavy ? (Math.random() > 0.5 ? 'saskin' : 'uzgun') : 'mutlu';

    return { headline, summary, emotion };
}

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch(e){}
        }
        body = body || {};

        const dare = body.dare || "10 saniye tek ayak üstünde dur";
        const isDeal = !!body.isDeal;
        const rank = parseInt(body.rank) || 10;
        const streamer = body.streamer || "IOWF";

        const apiKey = process.env.OPENROUTER_API_KEY;

        // If no API key configured in Vercel environment, return high-speed comedic response
        if (!apiKey) {
            const fallback = generateComedicNews(dare, isDeal, rank, streamer);
            res.status(200).json({ ok: true, ...fallback });
            return;
        }

        const systemPrompt = `Sen IOWF (Tarık) için yayın yapan sansasyonel bir Türk TV haber spikerisin. Oyuncu 'Kutumda Büyük Hissediyorum' yarışmasını bitirdi.
Kazandığı Ceza: "${dare}"
Ceza Türü: ${rank <= 12 ? 'AĞIR CEZA' : 'HAFİF CEZA'}
Teklif kabul edildi mi: ${isDeal ? 'Hamdi Beyin teklifine VARIM dedi' : 'Kendi kutusunu açtı'}

Lütfen 1 adet vurucu komik, sansasyonel, büyük harflerle TV manşeti ('headline', max 8-10 kelime), 2 cümlelik absürt mizahi haber özeti ('summary') ve Tarık'ın yüz ifadesi için 'emotion' ('mutlu', 'uzgun', 'saskin', 'sinirli') üret.
SADECE JSON döndür: {"headline": "...", "summary": "...", "emotion": "saskin"}`;

        const payload = JSON.stringify({
            model: "google/gemini-2.0-flash-exp:free",
            messages: [
                { role: "system", content: "You are a comedic Turkish TV breaking news anchor. Output JSON only." },
                { role: "user", content: systemPrompt }
            ]
        });

        const callOpenRouter = () => new Promise((resolve, reject) => {
            const options = {
                hostname: 'openrouter.ai',
                path: '/api/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://samokutu.vercel.app/',
                    'X-Title': 'Samo Kutu Oyunu',
                    'Content-Length': Buffer.byteLength(payload)
                },
                timeout: 2500
            };

            const request = https.request(options, (response) => {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                    if (response.statusCode >= 200 && response.statusCode < 300) {
                        try {
                            const parsed = JSON.parse(data);
                            let content = parsed.choices[0].message.content.trim();
                            if (content.startsWith('```json')) content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                            else if (content.startsWith('```')) content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
                            const json = JSON.parse(content);
                            resolve(json);
                        } catch(err) {
                            reject(err);
                        }
                    } else {
                        reject(new Error(`Status ${response.statusCode}: ${data}`));
                    }
                });
            });

            request.on('error', reject);
            request.on('timeout', () => {
                request.destroy();
                reject(new Error('Timeout'));
            });
            request.write(payload);
            request.end();
        });

        let result;
        try {
            result = await callOpenRouter();
        } catch(apiErr) {
            result = generateComedicNews(dare, isDeal, rank, streamer);
        }

        res.status(200).json({
            ok: true,
            headline: result.headline,
            summary: result.summary,
            emotion: result.emotion || (rank <= 12 ? 'saskin' : 'mutlu')
        });
    } catch(e) {
        const fallback = generateComedicNews("10 saniye tek ayak üstünde dur", false, 10, "IOWF");
        res.status(200).json({ ok: true, ...fallback });
    }
};
