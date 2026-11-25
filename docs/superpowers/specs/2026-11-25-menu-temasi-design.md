# SysKO — menü teması ve canlı başlık/ana menü (tasarım)

Tarih: 2026-11-25 · Onay: Emir ("tamam devam et", 2026-11-25 00:45)

## Neden

Emir, Canva AI'nın çizdiği turnuva görselini (Canva medya `MAHb3UFPgNE`) çok beğendi.
Önceki düz piksel ekranları beğenmedi. Bütün oyun menüsü ve sistem ekranları bu görselin
temasında olacak. Oyunu açınca da bu temada bir şeyler görmek istiyor. Oyun çocukları için
yapılan bir aile oyunu.

## Hedefler

1. 16 ekran tasarımının hepsi (Claude Design tuvali) bu temayla yeniden çizilir.
2. Canlı sitede oyun açılınca önce başlık ekranı, bir tuşa basınca ana menü gelir. Menüde
   klavye, oyun kolu ve fareyle gezilir. Hazır olmayan bölümlerde "Yakında" uyarısı çıkar.
3. Logo: 3 numaralı Canva adayı (`MAHb3TnunGI`) temel alınır. Altındaki "SYSTEM KNOCKOUT"
   kurdelesi kaldırılır.
4. Tasarım sistemi (Design System) yeni temaya güncellenir.

## Hedef dışı

- Dövüş motoru ve alt ekranların gerçekten çalışması (Aşama 1 ve sonrası).
- Karakter çizimleri. Siluetler yer tutucu olarak kalır.

## Asla olmayacaklar

- Bulanık veya yumuşatılmış yazı. Yazılar tam piksele oturur (mevcut ızgara testi).
- İngilizce arayüz yazısı. Her şey Türkçe.
- Başka bir oyunun logosu, karakteri veya ayırt edici işareti.

## Kısıtlar

- Oyun dünyası 960×540, ekrana tam sayı katla büyütülür. Tasarım çerçevesi 1920×1080 (2 kat).
- Sanatsal görseller (arka plan, logo) Canva AI ile yapılır (Emir'in kuralı).
- Canva'nın büyük boy görselleri bu ortama doğrudan inmez. Emir'in Chrome'u ile indirilir
  (her indirme için Emir'den izin), sonra bilgisayar köprüsüyle alınır.
- Yazı tipi: Jersey 10 kalır (aşağıda Kararlar).

## Yaklaşımlar

- **A. Her ekranı Canva'ya resim olarak çizdirmek.** Reddedildi: yazılar resmin içinde ve
  İngilizce, butonlar çalışmaz, ekranlar birbirini tutmaz.
- **B. Arka plan dahil her şeyi kodla çizmek.** Reddedildi: sanat işi Canva AI'nın.
- **C. Büyük sanat (arka plan, logo) Canva AI'dan, arayüz parçaları (çerçeve, buton,
  kurdele, tablo, turnuva ağacı, yazı) aynı tarzda kodla piksel piksel çizilir.** Seçildi;
  Emir planı onayladı.

## Tema (referans görselden)

- **Arka plan:** gece, koyu mor gökyüzü, Türk kalesi (Rumeli Hisarı esinli), taş zemin,
  meşaleler. Canva `MAHb3WLMCug`. Bütün menü ekranları aynı arka planı kullanır. Dövüş
  ekranları kendi arenalarını kullanır.
- **Başlık plakası:** çelik/gümüş çerçeve, içi lacivert, kenarı camgöbeği parıltı. Dört
  yanında kırmızı elmas taşlı süs.
- **Paneller:** perçinli bronz metal çerçeve, içi koyu lacivert. Üst kenarda ince uyarı
  şeridi süsü.
- **Kurdele başlık:** koyu zemin, altın kenar, uçları çentikli. Altın yazı, iki yanında
  elmas nokta.
- **Butonlar:** kalın çelik çerçeve, içi renkli cam ve basamaklı piksel parıltı.
  - Yeşil: ana eylem (Başla, Oyna).
  - Çelik mavi: diğer eylemler; ikon camgöbeği.
  - Kırmızı: çıkış ve vazgeç.
  - Odakta parıltı ve çerçeve parlar.
- **Turnuva ağacı:** lacivert kutular, çelik mavi kenar. Seçili kutu camgöbeği parlar.
  Bağlantı çizgileri camgöbeği, birleşme noktaları altın.
- **Tablo:** başlık satırı altın yazı, satırlar sırayla iki lacivert tonda, çelik ayraçlar.
- **Alt ipucu şeridi:** koyu çelik şerit, camgöbeği tuş ikonları.
- **Parıltı:** bulanıklık yok; 2–3 basamaklı, gittikçe saydamlaşan piksel halkalar.
- **Yazı:** başlık ve buton yazılarında 1 taban piksellik koyu dış çizgi.

## Canlı başlık ve ana menü

- **Başlık ekranı:**
  - Arka plan, logo, yanıp sönen "BİR TUŞA BAS".
  - Altta sürüm satırı `data-testid="surum"`; duman testi buna bakıyor.
- **Ana menü:** 8 seçenek.
  - ARCADE, VERSUS, ÇEVRİMİÇİ, TURNUVA, ANTRENMAN, PROFİL VE SIRALAMA, AYARLAR.
  - KARAKTER STÜDYOSU: "YAKINDA" etiketiyle.
  - Hepsi şimdilik "Yakında" bildirimi gösterir.
- **Girdi:**
  - Oklar ve WASD ile gezilir.
  - Enter, Space ve oyun kolunun A tuşu seçer.
  - Esc ve B geri gider (ana menüden başlık ekranına).
  - Fare imleci ve dokunma da çalışır.
- **Ölçek:** arayüz 1920 çerçevede çizilir, ekrana oyun dünyasıyla aynı tam sayı katla
  sığdırılır.

## Kararlar (Claude'un)

- Yazı tipi Jersey 10 kalır. Daha kalın adaylar denendi:
  - Pixelify Sans piksel ızgarasına oturmuyor.
  - Press Start 2P Türkçe menüler için fazla geniş.
- Referansın kalın görünümü koyu dış çizgi ve renkle verilir.
- Arayüz çizim üreticisi (çerçeve ve ikon SVG'leri) depoya taşınır: `tools/ui-kit`.
  Ürettiği CSS de depoya girer.
- Canva görselleri 1920×1080 olarak `apps/game/public/art/` altına konur.

## Kurucuya kalanlar

- Her ekranın yerleşim ayrıntısı, çerçeve piksel desenleri, buton ikonları.
