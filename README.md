# 🎁 Kutumda Büyük Hissediyorum (Cezalı Var mısın Yok musun?)
### 👑 Designed By Samo — [kick.com/iowf](https://kick.com/iowf) Yayıncısına Özel

> **"Bu kez sıradan bir 'Var mısın Yok musun?' değil. Her kutunun içinde sürprizler, cezalar ve beklenmedik anlar seni bekliyor!"**

Bu proje, klasik televizyon yarışması formatını interaktif oyun mekanikleri, ceza/meydan okuma sistemi, zengin ses efektleri ve canlı Kick yayıncı (Streamer) entegrasyonuyla tarayıcı ortamına taşıyan kapsamlı bir HTML5 web oyunudur.

---

## 🌟 Öne Çıkan Özellikler

### 📦 1. Kutu ve Yarışma Dinamikleri
- **24 Kutu Sistemi:** Her kutunun bir sahibi ve içinde farklı ağırlık derecelerine sahip cezalar/ödüller bulunur.
- **Hamdi Bey (Bankacı) Teklifleri:** Kalan kutuların risk analizine göre hesaplanan dinamik teklif algoritması, telefon arama müziği ve gerilim sesleri.
- **Kutu Değiştirme (Swap):** Son iki kutuya gelindiğinde kutunu değiştirme şansı.
- **Kutu Röntgeni (X-Ray) & Minimalist Arayüz:** Ayarlar üzerinden özelleştirilebilir görüntüleme seçenekleri.

### 🃏 2. Joker Sistemi
- **Ahmet Dayı'ya Danış:** Ahmet Dayı senin yerine rastgele bir kutuyu seçer ve açar.
- **Bonkör Bankacı:** Bir sonraki bankacı teklifini oyuncunun lehine artırır.
- **Halkın Sesi:** Seyircilerin en çok önerdiği kutuları yüzde ve vurgu efektleriyle ekrana yansıtır.
- **Kutu Sigortası:** Açacağın bir sonraki kutudan çıkacak olası ağır cezayı iptal eder.

### 📡 3. Canlı Kick Yayıncı (Streamer) Entegrasyonu
- **Kick Chat Entegrasyonu:** Gerçek zamanlı sohbeti dinleyerek `!oyna` komutu veren izleyicileri sıraya alır.
- **Sohbetten Hamle:** Aktif yarışmacı kutu numarasını veya banker tekliflerinde `!varım` / `!yokum` yazarak oyunu doğrudan chat'ten yönetebilir.
- **İzleyici Kuyruğu (Queue):** Kutu seçimi tamamlanan izleyici tekrar `!oyna` yazarak hemen sıraya yeniden girebilir.
- **Vercel Serverless Proxy:** Kick API ve WebSocket isteklerini sıfır CORS engeliyle kesintisiz çalıştırır.

### 🔊 4. Ses ve Efektler
- Web Audio API tabanlı dinamik synth tonları ve ses efektleri.
- Menü müziği, oyun içi fon müziği ve telefon arama sesleri.
- Bağımsız ses seviyesi kontrolleri (BGM, SFX).

### ⚙️ 5. Özel Ceza Editörü & İstatistikler
- Kendi cezalarını ekleme, silme ve düzenleme imkanı (Local Storage saklama).
- Oyun günlüğü (Game Log) ile tüm hamleleri geriye dönük inceleme.
- Oyun sonu analizi ve Hamdi Bey teklif geçmiş grafiği.

---

## 📁 Proje Dizin Yapısı

```
samokutu/
├── api/
│   └── kick.js              # Vercel Serverless CORS & Kick API Proxy
├── assets/
│   ├── audio/               # Oyun müzikleri ve ses efektleri
│   │   ├── callbm.mp3       # Hamdi Bey arama melodisi
│   │   ├── gamebm.mp3       # Oyun içi fon müziği
│   │   └── musicmenu.mp3    # Menü fon müziği
│   ├── images/              # Oyun grafikleri ve arkaplanlar
│   │   ├── logo.png         # Oyun logosu
│   │   ├── menu.png         # Menü arkaplan görseli
│   │   ├── namebg.jpg       # İsim kartı arkaplanı
│   │   └── openbg.png       # Kutu açılış sahnesi arkaplanı
│   └── video/
│       └── intro.mp4        # Giriş introları ve sinematik
├── favicon.ico              # 3D altın gizemli kutu faviconu (çok boyutlu)
├── favicon.png              # Yüksek çözünürlüklü favicon (512x512)
├── apple-touch-icon.png     # Mobil cihazlar için ikon (180x180)
├── og-image.png             # Sosyal medya paylaşım bannerı (1200x630)
├── index.html               # Ana oyun arayüzü ve modalları
├── index.css                # Responsive stiller ve neon temalar
├── index.js                 # Oyun döngüsü, Bankacı mantığı ve jokerler
├── streamer.js              # Kick chat canlı yayıncı entegrasyonu
├── package.json             # Vercel ve proje konfigürasyonu
├── vercel.json              # Vercel yönlendirme ve CORS ayarları
└── README.md                # Proje dokümantasyonu (Designed By Samo)
```

---

## 🚀 Canlı Yayın ve Dağıtım

Oyun Vercel üzerinde canlı yayındadır:
👉 **[https://samokutu.vercel.app/](https://samokutu.vercel.app/)**
