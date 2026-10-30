# 🎁 Kutumda Büyük Hissediyorum (Cezalı Var mısın Yok musun?)

> **"Bu kez sıradan bir 'Var mısın Yok musun?' değil. Her kutunun içinde sürprizler, cezalar ve beklenmedik anlar seni bekliyor!"**

Bu proje, klasik televizyon yarışması formatını interaktif oyun mekanikleri, ceza/meydan okuma sistemi, zengin ses efektleri ve canlı yayıncı (Streamer) entegrasyonuyla tarayıcı ortamına taşıyan kapsamlı bir HTML5 web oyunudur.

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

### 📡 3. Yayıncı (Streamer) Modu
- **YouTube Live & Kick Entegrasyonu:** Gerçek zamanlı sohbeti dinleyerek `!oyna` komutu veren izleyicileri sıraya alır.
- **Viewer Queue & Sadakat Puanı:** Katılım şartları ve izleyici sırası takibi.
- **Chat Anketleri:** Bankacı tekliflerinde izleyicilerin "Var" / "Yok" oylaması yapabilmesi.
- **Demo Modu:** Canlı yayında olunmasa bile simüle edilmiş izleyici akışı.

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
KutumdaBuyukHissediyorum/
├── index.html           # Ana oyun arayüzü ve modalları
├── index.css            # Responsive stil, animasyonlar ve neon temalar
├── index.js             # Oyun döngüsü, Bankacı mantığı, jokerler, ses motoru
├── streamer.js          # YouTube Live & Kick WebSocket/Polling chat entegrasyonu
├── musicmenu.mp3        # Menü fon müziği
├── gamebm.mp3           # Oyun içi fon müziği
├── callbm.mp3           # Hamdi Bey arama melodisi
├── intro.mp4            # Giriş introları ve sinematik
├── logo.png             # Logo görseli
├── menu.png             # Menü arkaplan / banner görseli
├── namebg.jpg           # İsim kartı arkaplanı
├── openbg.png           # Kutu açılış sahnesi arkaplanı
└── README.md            # Proje dokümantasyonu
```

---

## 🚀 Yerel Olarak Çalıştırma

Projeyi çalıştırmak için herhangi bir derleme adımına gerek yoktur. Modern bir tarayıcıda doğrudan `index.html` dosyasını açabilir veya yerel bir HTTP sunucusu başlatabilirsiniz:

```bash
# Python ile yerel sunucu başlatmak için:
python -m http.server 8000
```

Ardından tarayıcınızdan `http://localhost:8000` adresine gidin.

---

## 📤 Yeni Bir GitHub Deposuna Yükleme

GitHub reposunu yeniden oluşturmak için şu adımları izleyebilirsiniz:

1. [GitHub](https://github.com/new) üzerinde yeni bir boş repository oluşturun (örneğin: `varimyokum` veya `kutumda-buyuk-hissediyorum`).
2. Terminalinizde proje dizinine girin ve aşağıdaki komutları çalıştırın:

```bash
git remote add origin https://github.com/<KULLANICI_ADINIZ>/<REPO_ADINIZ>.git
git branch -M main
git push -u origin main
```
