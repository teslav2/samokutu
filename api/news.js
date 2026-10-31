// api/news.js - Vercel Serverless Function for TV Breaking News generation
const https = require('https');
const fs = require('fs');
const path = require('path');

// Hilarious fallback news generation engine tailored to Tarık (IOWF), Samo & Hamdi Bey
function generateComedicNews(dare, isDeal, rank, streamer = "Tarık") {
    const isHeavy = rank <= 15;
    const streamerUpper = (streamer || "TARIK").toUpperCase();
    
    const headlinesHeavy = [
        `FLAŞ GELİŞME: ${streamerUpper}'UN KUTUSUNDAN ÇIKAN AĞIR CEZA KICK'İ SALLADI!`,
        `HAMDİ BEY YİNE YAPTI YAPACAĞINI: ${streamerUpper} CANLI YAYINDA ÇARESİZ KALDI!`,
        `TARİHİ ANLAR: ${streamerUpper} 'BÜYÜK HİSSEDİYORUM' DEDİ, SONUÇ FELAKET ÇIKTI!`,
        `STÜDYO KARIŞTI: SAMO MÜDAHALE ETTİ, ${streamerUpper} KADERİNE BOYUN EĞDİ!`,
        `CANLI YAYINDA ŞOK: HAMDİ BEY GÜLDÜ, ${streamerUpper} KUTUSUNDA BOĞULDU!`
    ];
    
    const headlinesLight = [
        `MUCİZE KURTULUŞ: ${streamerUpper} KADERİN SİLLESİNDEN KIL PAYI KURTULDU!`,
        `HAMDİ BEY ŞOKTA: ${streamerUpper} CEZAYI HAFİF SIYIRDI, KICK YAYINI YIKILDI!`,
        `STÜDYODA BAYRAM HAVASI: ${streamerUpper} SAMO'YLA BİRLİKTE ZAFER DANSI YAPIYOR!`,
        `FLAŞ: ${streamerUpper} KUTUSUNA SONUNA KADAR GÜVENDİ VE KAZANDI!`
    ];

    const summariesHeavy = [
        `Kick yayınında tansiyon tavan yaptı! Tarık 'Kutumda büyük hissediyorum' diyerek girdiği tarihi düelloda Hamdi Bey'in acımasız teklifleri karşısında ter döktü. Açılan kutudan çıkan "${dare}" cezası stüdyoyu kahkahalara ve şoka boğdu!`,
        `Samo'nun organize ettiği dev yarışmada nefesler tutuldu. Hamdi Bey telefonun ucunda keyif kahvesini yudumlarken, ${streamer} stüdyoda buz kesti. Cezanın infazı için geri sayım resmen başladı!`,
        `Chat'in tezahüratları ve duaları bu kez ${streamer}'ı kurtarmaya yetmedi! Açılan kader kutusuyla birlikte stüdyoda kırmızı alarm verildi, ceza kararı kesinleşti!`
    ];

    const summariesLight = [
        `Tarihi gecede Hamdi Bey ters köşe oldu! ${streamer}, açtığı kutuyla birlikte stüdyoda bayram havası estirdi. Hafif sıyrılan yayıncı zafer kutlamalarına başladı!`,
        `Gözyaşları yerini coşkuya bıraktı! 'Kutumda büyük hissediyorum' diyen ${streamer}, Samo ve tüm Kick chat'inin desteğiyle en hafif cezayla stüdyodan alnının akıyla çıktı!`
    ];

    const headline = isHeavy 
        ? headlinesHeavy[Math.floor(Math.random() * headlinesHeavy.length)]
        : headlinesLight[Math.floor(Math.random() * headlinesLight.length)];

    const summary = isHeavy
        ? summariesHeavy[Math.floor(Math.random() * summariesHeavy.length)]
        : summariesLight[Math.floor(Math.random() * summariesLight.length)];

    const emotion = isHeavy 
        ? (Math.random() > 0.6 ? 'sinirli' : (Math.random() > 0.5 ? 'saskin' : 'uzgun'))
        : 'mutlu';

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
        const streamer = body.streamer || "Tarık";

        const apiKey = process.env.OPENROUTER_API_KEY;

        // If no API key configured, use rich thematic fallback engine
        if (!apiKey) {
            const fallback = generateComedicNews(dare, isDeal, rank, streamer);
            res.status(200).json({ ok: true, ...fallback });
            return;
        }

        // Try reading external guide file if exists
        let contextGuide = "";
        try {
            const guidePath = path.join(__dirname, 'haber_rehberi.txt');
            if (fs.existsSync(guidePath)) {
                contextGuide = fs.readFileSync(guidePath, 'utf8');
            }
        } catch(e){}

        const systemPrompt = `Sen Tarık (IOWF) ve Samo'nun sunduğu Kick yayını için canlı TV Breaking News (Flaş Haber) spikerisin.
Yarışma formatı: 'Kutumda Büyük Hissediyorum' (24 kutu, 12 Ağır Ceza / 12 Hafif Ceza).
Karakterler:
- Tarık (IOWF): Kutusuna aşırı güvenen, iddialı ama ağır cezada çıldıran komik yayıncı.
- Samo: Formatın kurucusu, moderatör ve kilit isim.
- Hamdi Bey: Telefonun diğer ucundaki gizemli, psikolojik baskı yapan zengin banker.

Yarışma Sonucu:
Oyuncu: ${streamer}
Kazandığı Ceza: "${dare}"
Ceza Türü: ${rank <= 15 ? 'AĞIR CEZA (Kötü sonuç)' : 'HAFİF CEZA (İyi sonuç / Kurtuluş)'}
Oyun Sonu Kararı: ${isDeal ? 'Hamdi Beyin teklifine VARIM dedi (Kabul etti)' : 'Kendi kutusunu açtı (Sonuna kadar gitti)'}

${contextGuide ? `Referans Bilgi:\n${contextGuide.slice(0, 800)}\n` : ''}

Lütfen Show TV / Flash TV haber bülteni üslubunda:
1) 'headline': Vurucu, sansasyonel, büyük harflerle, maksimum 7-10 kelimelik TV manşeti.
2) 'summary': Canlı yayındaki tansiyonu, Tarık'ı, Samo'yu ve Hamdi Bey'i anlatan absürt komik 2 cümlelik haber özeti.
3) 'emotion': Tarık'ın ekrandaki yüz ifadesi ('mutlu', 'uzgun', 'saskin', 'sinirli').

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
                timeout: 3000
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
            emotion: result.emotion || (rank <= 15 ? 'saskin' : 'mutlu')
        });
    } catch(e) {
        const fallback = generateComedicNews("10 saniye tek ayak üstünde dur", false, 10, "Tarık");
        res.status(200).json({ ok: true, ...fallback });
    }
};
