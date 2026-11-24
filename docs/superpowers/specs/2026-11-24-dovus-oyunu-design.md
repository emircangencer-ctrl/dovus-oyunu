> **Kanonik kaynak:** [Dövüş Oyunu — Tasarım Dokümanı](https://claude.ai/artifact/YZySHevHDL6XFd8txZquhE). Bu dosya 2026-11-24 tarihli (rev 56) depo kopyasıdır; çelişkide kanonik kaynak geçerlidir. Mimari şeması ve yol haritası grafikleri kanonik dokümandadır.

# Dövüş Oyunu — Tasarım Dokümanı

Nov 24, 2026 · @Emir

## 1. Özet

Tarayıcıda çalışan, MUGEN ruhunda, HD pixel art karakterli bir 2D dövüş oyunu yapıyoruz. Oyunu Emir ve yakın çevresinden en fazla 50–60 kişi oynayacak.

Ailenin bir kısmı uzakta yaşadığı için oyun hem aynı bilgisayarda hem online oynanacak. Hesaplar, sıralama ve tek/çift eleme turnuvalarla küçük bir rekabet ortamı kurulacak. Oyun hem tarayıcıda hem Windows masaüstü uygulaması olarak çalışacak; motorun genel katmanı sonraki projelerde de kullanılabilecek. Karakterler en sona kalıyor: önce motor ve sistemler, sonra Emir'in kod yazmadan karakter ekleyebileceği bir **Karakter Stüdyosu**.

Proje ileride Emir'in çocuklarına hediye olarak kalacak. Bu yüzden iki ölçüt her kararın üstünde durur: oyun gerçek bir stüdyodan çıkmış gibi hissettirmeli ve yıllarca çalışmaya devam etmeli.

Roller: Emir ürün direktörü ve karar verici, Claude teknik lider ve uygulayıcı. Oyunun adı henüz yok; logo tasarımından önce Emir belirleyecek.

## 2. Hedefler, hedef dışı olanlar, başarısızlık ölçütleri

Başarı: ailen oyunu açıp gerçekten keyifle oynuyor, tuşa basınca gecikme hissetmiyor ve online maçlar yerel kadar akıcı.

**Hedefler**

- Sabit 60 kare/sn simülasyon; motorun yerel oyunda eklediği gecikme en fazla 1 kare.
- Her durumda oynanabilirlik: aynı bilgisayarda yan yana, online, bilgisayara karşı, antrenman.
- Online'da rollback: 8 kareye kadar geri sarma, ping'e göre 1–3 kare otomatik girdi gecikmesi.
- İki kontrol tipi: Klasik (komutlu) ve Modern (tek tuşlu özel hareketler).
- Davetle açılan hesaplar, sıralama puanı, tek ve çift eleme turnuvalar.
- Emir'in kod yazmadan karakter ekleyebildiği Karakter Stüdyosu.
- Stüdyo kalitesinde arayüz: menüler, ayarlar, ekran yerleşimi, geçişler, sesler.
- İki hedef, tek kod: tarayıcı ve Windows masaüstü sürümü; web ve masaüstü oyuncuları aynı maçta oynar.
- Yeniden kullanılabilir motor: genel katman, sonraki projelerde kullanılabilecek şekilde dövüş katmanından ayrı.
- Uzun ömür: çevrimdışı modlar sunucusuz çalışır, tüm veri yedeklenebilir.

**Hedef dışı (ilk sürümde yok)**

- MUGEN dosya uyumluluğu (SFF, AIR, CNS). Oyun MUGEN ruhunu taşır, formatını değil.
- Herkese açık yayın, mağazaya koyma, para kazanma.
- Takım (2'ye 2, tag) modları. Mimari kapıyı açık bırakır.
- Telefon dokunmatik kontrolleri. Mimari kapıyı açık bırakır.
- Mac masaüstü sürümü. Mac'te web sürümü çalışır.
- Unity gibi her tür oyunu yapabilen genel amaçlı bir motor. Yalnızca doğası gereği genel olan parçalar ayrılır.
- Hile koruması. Aile içi güven esas.

**Başarısızlık sayılacaklar (teknik olarak çalışsa bile)**

- Online maçta iki ekranın farklı sonuç göstermesi (senkron kayması).
- Pikselleri bulanıklaştıran ölçekleme, titreyen sprite'lar, bozuk Türkçe harfler (ğ, ş, ı, İ).
- Yeni başlayanların ilk hafta oyunu bırakması.
- Emir'in karakter eklemek için kod yazmak zorunda kalması.
- Birkaç yıl sonra açılmayan oyun.

## 3. Kısıtlar ve çalışma ilkeleri

Oyun önce PC tarayıcısı için yapılır ve kurulum gerektirmez; tüm geliştirme bulutta yürür.

- **Platform:** Güncel Chrome, Edge ve Firefox; ayrıca Windows masaüstü sürümü (Electron). Klavye ve oyun kolu (Xbox, PlayStation).
- **Kitle:** En fazla 50–60 davetli kişi. Açık kayıt yok.
- **Emir'in makinesi:** Windows, git kurulu değil. Emir yazılım kurmaz; her teslimde bir önizleme adresi açıp test eder.
- **Bütçe:** Sunucu tarafı ücretsiz katmanlarda kalır. Ücretli araçlar yalnızca 5. aşamada ve Emir'in onayıyla.
- **Telif:** Son oyunda yalnızca bizim ürettiğimiz veya serbest lisanslı (CC0) varlıklar bulunur. Başka oyunlardan alınmış karakterler yalnızca geçici testte bile kullanılmaz.
- **Dil:** Arayüz Türkçe; çeviri altyapısı ileride İngilizce eklemeye hazır.

**Çalışma ilkeleri (her aşama için)**

1. Tasarım: ekran mockup'ları ve teknik notlar.
2. Plan: adım adım uygulama planı, Emir onaylar. Onaysız kod yazılmaz.
3. Kod: kestirme yok, sorunlar kökünden çözülür.
4. Derin debug: Playwright ile uçtan uca testler, determinizm ve ağ testleri (Bölüm 11).
5. Teslim: önizleme adresi ve sohbette adım adım test talimatı.

## 4. Yaklaşımlar ve seçim

Seçim: kendi motorumuz (TypeScript + PixiJS) ve Cloudflare sunucusu. Emir "nasıl" kararını Claude'a bıraktı; gerekçe aşağıda.

**Oyun motoru**

| Yaklaşım | Artıları | Eksileri | Sonuç |
| --- | --- | --- | --- |
| Kendi motorumuz: TypeScript + PixiJS v8 | Rollback için gereken geri sarılabilir yapı ilk satırdan var. Karakter Stüdyosu oyunla aynı motoru kullanır. Menüler HTML olduğu için Playwright ile test edilir. Hafif indirme. | Her sistemi biz yazıyoruz; iş yükü Claude'da. | **Seçildi** |
| [Ikemen GO](https://github.com/ikemen-engine/Ikemen-GO) tarayıcı sürümü | MUGEN uyumlu, olgun dövüş sistemi. | Tarayıcı sürümünde online yok ([kaynak](https://github.com/ikemen-engine/Ikemen-GO/discussions/879)). Tek iş parçacıklı tarayıcı sürümünde takılmalar tamamen giderilemiyor ([kaynak](https://itch.io/profile/energyjp)). Eski karakter formatı editörü zorlaştırır. | Elendi |
| Godot 4 + rollback eklentisi | Olgun 2D motor, görsel editör. | Eklenti 1.0.0-alpha, Godot 4.2 için ([kaynak](https://www.godotengine.org/asset-library/asset/2450)). Oyun ekranı tek çizim alanı, menüleri Playwright ile test etmek zor. Tarayıcıda ağır indirme. | Elendi |

Enine boyuna düşülüp elenenler: Rust + Bevy + GGRS (arayüz kütüphaneleri zayıf, derleme yavaş), Unity WebGL (tarayıcıda ağır).

**Masaüstü kabuğu (Windows sürümü)**

| Seçenek | Artıları | Eksileri | Sonuç |
| --- | --- | --- | --- |
| Electron | Chromium'un tam kopyasını taşır; oyun her makinede birebir aynı çalışır ve tarayıcılar değişse de yıllar sonra aynı kalır. Arka plan yavaşlatması kapatılabilir. Playwright ile test edilir. | Kurulum dosyası 80–150 MB ([kaynak](https://blog.openreplay.com/comparing-electron-tauri-desktop-applications/)). | **Seçildi** |
| Tauri | Kurulum dosyası 2–10 MB. | İşletim sisteminin tarayıcı motorunu kullanır; bu motor kendi kendine güncellenir, Mac'te tamamen farklıdır ([kaynak](https://www.digitalapplied.com/blog/desktop-apps-web-stack-tauri-electron-deno-wails-2026)). | Elendi |

**Sunucu**

| Seçenek | Artıları | Eksileri | Sonuç |
| --- | --- | --- | --- |
| Cloudflare (Workers, D1, Durable Objects, KV, TURN) | Uyku modu yok. Gerçek zamanlı lobi için Durable Objects ücretsiz planda var ([kaynak](https://developers.cloudflare.com/changelog/2025-04-07-durable-objects-free-tier)). TURN aylık 1.000 GB ücretsiz, STUN sınırsız ([kaynak](https://developers.cloudflare.com/realtime/turn/faq/)). | Ücretsiz plan istek başına 10 ms işlemci veriyor; güçlü şifre özetlemeye yetmiyor ([kaynak](https://developers.cloudflare.com/workers/platform/limits/)). Çözüm: şifresiz davet bağlantısı (Bölüm 9). | **Seçildi** |
| Supabase | Hazır giriş sistemi, veritabanı. | Ücretsiz proje 7 gün az kullanılınca uyku moduna alınıyor ([kaynak](https://supabase.com/docs/guides/platform/pausing)). Önlemek için Pro plan 25 $/ay ([kaynak](https://supabase.com/pricing)). | Elendi |

## 5. Teknik mimari

Oyunun kalbi, aynı girdilerle her tarayıcıda birebir aynı sonucu üreten bir simülasyon çekirdeğidir; çizim, ses, ağ ve menüler onun etrafına takılır.

&#91;embedded content: mimari · tarayıcı ve sunucu\]

Oyun, Karakter Stüdyosu ve rakibin tarayıcısı aynı çekirdeği çalıştırır; sunucu yalnızca hesapları, puanları, karakter paketlerini ve bağlantı kurulumunu tutar.

### 5.1 Parçalar (tek depo, TypeScript)

- `sim`: saf oyun çekirdeği. Tarayıcı nesnesi, ondalıklı sayı, saat ve dış rastgelelik yok. Girdi: o karede iki oyuncunun tuşları. Çıktı: yeni durum.
- `render`: PixiJS v8 (WebGL2 varsayılan, WebGPU isteğe bağlı). Durumu okur, asla değiştirmez.
- `input`: klavye ve Gamepad API, tuş atama, girdi tamponu, komut ayırıcı.
- `net`: rollback ve WebRTC bağlantısı.
- `ui`: menüler HTML/CSS (Playwright ile test edilir); dövüş içi gösterge (HUD) Pixi ile, ekranın gerçek çözünürlüğünde.
- `audio`: Web Audio API.
- `content`: karakter ve sahne paketleri, şema doğrulaması.
- Uygulamalar: `game` (oyun), `studio` (Karakter Stüdyosu), `server` (Cloudflare Worker ve Durable Objects).

**Katmanlar ve hedefler.** Genel katman (oyun döngüsü, rollback, giriş, çizim, ses, platform, sunucu hizmetleri, Sprite Stüdyosu) dövüşe özgü kod içermez ve sonraki projelerde yeniden kullanılır. Dövüş katmanı (vuruş kutuları, kombolar, karakter durumları) yalnızca bu oyuna aittir; bağımlılık hep dövüş katmanından genel katmana doğrudur, tersi asla. `platform` paketi kayıt, pencere, dosya erişimi ve güncellemeyi soyutlar; oyun hem tarayıcıda hem `desktop` uygulamasında (Electron) aynı kodla çalışır. Masaüstünde arka plan yavaşlatması kapatılır ve tarayıcı eklentileri yoktur.

### 5.2 Deterministik simülasyon

- Sabit 60 Hz adım. Ekran 144 Hz olsa da simülasyon 60 Hz çalışır.
- Konum ve hızlar tam sayı alt-piksel cinsinden: 1 piksel = 256 birim. Ondalıklı sayı yok.
- Trigonometri yok; gerekirse sabit tablo. Tarayıcıların `Math.sin` gibi fonksiyonları farklı sonuç verebilir.
- Rastgelelik yalnızca durumun içindeki tohumlu üreteçten gelir.
- Durum tek, düz bir veri yapısıdır; her karenin kopyası 16 karelik halkada tutulur.
- Her karenin özet (hash) değeri hesaplanır; online'da karşılaştırılır.
- Tekrar kaydı = başlangıç tohumu + girdi listesi. Bir maç birkaç KB tutar.

### 5.3 Çizim

- Oyun dünyası 960×540 temel çözünürlükte bir ara görüntüye çizilir. 1080p ekranda tam 2 kat, 4K'da tam 4 kat büyütülür; pikseller keskin kalır.
- Tam katla büyümeyen ekranlar için Ayarlar'da iki seçenek: "Piksel mükemmel" (kenarlarda çerçeve) ve "Ekranı doldur" (keskin yumuşatma).
- Kamera yalnızca kayar, yakınlaştırmaz. Yakınlaştırma piksel boyutlarını bozar.
- Arayüz yazıları ekranın gerçek çözünürlüğünde çizilir; bulanık yazı olmaz.
- Renk varyantları palet değişimiyle yapılır: karakter başına 8 renk seçeneği, ek çizim olmadan.

### 5.4 Giriş

- Klavye ve oyun kolu. Her oyuncunun tuş ataması profilinde saklanır.
- Girdi her simülasyon karesinin başında okunur ve aynı karede işlenir.
- Komut ayırıcı: ↓↘→, →↓↘, ↓↙←, şarjlı hareketler ve çift dokunuşlar (koşma, geri sıçrama). Tampon süresi Aşama 1'de oyun hissine göre ayarlanır.
- Klavyede aynı anda sol ve sağ basılırsa nötr sayılır.

### 5.5 Online

- Tarayıcılar arası doğrudan bağlantı: WebRTC veri kanalı, sırasız ve yeniden göndermesiz modda.
- Her paket son birkaç karenin girdilerini taşır; kaybolan paket bir sonrakiyle telafi edilir.
- Rollback: en fazla 8 kare geri sarma, 1–3 kare otomatik girdi gecikmesi, öndeki tarafı hafifçe yavaşlatan zaman eşitleme.
- Bağlantı kurulumu, lobi ve eşleştirme: Cloudflare Durable Object üzerinden WebSocket.
- Ağ engelleri için Cloudflare STUN ve TURN. Girdiler çok küçük olduğu için TURN kullanımı ücretsiz kotanın çok altında kalır.
- Senkron kontrolü: düzenli aralıklarla durum özeti değiş tokuş edilir. Uyuşmazlıkta maç işaretlenir ve iki tarafın durum dökümü teşhis için kaydedilir.
- İzleyici modu: turnuva maçlarını aile canlı izleyebilir; girdiler sunucu üzerinden kısa gecikmeyle aktarılır.

### 5.6 Sunucu (Cloudflare)

- Oyun dosyaları: Workers statik dosya sunumu.
- API: Worker (Hono çatısı).
- D1 (SQLite): kullanıcılar, oturumlar, puanlar, maçlar, turnuvalar, tekrar kayıtları.
- KV: karakter paketleri (sürüm başına değişmez kayıt). R2 yerine KV, çünkü R2'yi açmak hesapta ödeme yöntemi gerektirebiliyor.
- Durable Objects: Lobi (çevrimiçi liste, davet, sıralı kuyruk), Maç odası (bağlantı kurulumu, sonuç), Turnuva (canlı durum).
- Dağıtım: GitHub'a gönderilen her değişiklik Cloudflare tarafından otomatik kurulur; her geliştirme dalının kendi önizleme adresi olur.

## 6. Oyun tasarımı

Emir'in seçimiyle oyunun görünüşü ve hissi KOF XIII'e yakındır: 1'e 1, hızlı, akıcı, büyük HD sprite'lar. Aşağıdaki sayılar başlangıç değerleridir; Aşama 1 testlerinde ayarlanır.

### 6.1 Sistemler

- Maç: 3 rauntta 2 galibiyet (1/3/5 ayarlanabilir), raunt süresi 99 saniye.
- Hareket: yürüme, koşma (→→), geri adım (←←), kısa ve normal zıplama (dik/ileri/geri), çömelme, yuvarlanma (iki hafif tuş).
- Savunma: geri tutarak blok; ayakta yüksek, çömelikken alçak saldırıları keser. Fırlatma ve fırlatmadan kurtulma.
- Saldırılar: ayakta, çömelik ve havada normal vuruşlar, yönlü özel vuruşlar, geri itme vuruşu (iki ağır tuş), özel hareketler, mermiler.
- Güç göstergesi: 3 bar. Güçlendirilmiş özel hareket 1 bar, süper hareket 1 bar, büyük süper 3 bar. Blok iptali (blok sırasında yuvarlanma veya geri itme) 1 bar.
- Kombo: vuruş sersemletmesi, kombo sayacı, uzun kombolarda azalan hasar, havada vurulma sınırı.
- Vuruş hissi: vuruş anında kısa donma, tam piksel ekran sarsıntısı, kıvılcım efekti, ses.

### 6.2 Kontroller

Oyuncu kontrol tipini karakter seçerken belirler. Sıralı maçlarda iki tip de serbesttir.

|  | Klasik | Modern |
| --- | --- | --- |
| Saldırı tuşları | Hafif Yumruk, Hafif Tekme, Ağır Yumruk, Ağır Tekme | Hafif, Orta, Ağır, Özel |
| Özel hareket | Komut + tuş (örn. ↓↘→ + Yumruk) | Yön + Özel tuşu |
| Otomatik kombo | Yok | Yardım tuşu basılıyken saldırı tuşuna basmak |
| Hasar | Tam | Özel hareketler %20 daha az |

Modern'deki hasar farkı Street Fighter 6'daki dengeye dayanıyor ([kaynak](https://esports.gg/guides/street-fighter-6/do-modern-controls-do-less-damage-in-sf6)). Klasik'te 4 tuş seçildi: oyun kolunun 4 üst tuşuna ve klavyeye rahat sığar, KOF geleneğini izler.

### 6.3 Modlar

- **Arcade:** kadrodaki her rakiple birer maç ve bir ayna maçı (v1.0'da 6 maç), sonunda bitiş ekranı.
- **Versus:** aynı bilgisayarda iki kişi.
- **Antrenman:** vuruş kutularını göster, kare verisi, tuş geçmişi, kukla ayarları (blok, zıplama, kayıt-oynat).
- **Online:** Gündelik (puansız) ve Sıralı (puanlı).
- **Turnuva:** tek ve çift eleme (Bölüm 9).
- **Tekrarlar:** kayıtlı maçları izleme.
- **Profil ve Sıralama**, **Ayarlar**, **Emeği Geçenler**.

### 6.4 Bilgisayar rakip (yapay zekâ)

Yapay zekâ karakterin hareket verisini okuyarak oynar; Emir'in sonradan ekleyeceği her karaktere ek iş olmadan uyar. 8 zorluk seviyesi vardır. Simülasyonun parçası olduğu için tekrarlarda aynı davranır.

### 6.5 Ekranlar

Açılış logosu → Başlık ("Bir tuşa bas") → Ana menü → Karakter seçimi (portre, renk, kontrol tipi; v1.0'da 6 karakter, düzen 16'ya kadar büyür) → Sahne seçimi → VS ekranı → Dövüş → Raunt/maç sonu → Sonuç (puan değişimi). Ayrıca: duraklatma menüsü, online lobi, turnuva ağacı, profil, ayarlar, Stüdyo.

Dövüş ekranı yerleşimi (taslak, nihai hali Claude Design mockup'ında onaylanır):

```
[P1 portre][==== CAN ====]   99   [==== CAN ====][P2 portre]
 EMİR  1543                ( ● ○ )               1498  RAKİP

                 (dövüş alanı, 960×540)

 12 VÜRUŞ!
[GÜÇ ■■□]                                        [GÜÇ ■□□]
```

Ayarlar: Kontroller (tuş atama, oyun kolu testi), Görüntü (ölçekleme, tam ekran, ekran sarsıntısı), Ses (müzik, efekt, spiker), Ağ (girdi gecikmesi, bağlantı testi), Erişilebilirlik (renk körü dostu renkler).

Tüm yazı tipleri Türkçe harfleri (ğ, ü, ş, ı, İ, ö, ç) tam desteklemelidir; birçok piksel yazı tipi bunları içermez. Menüler oyun koluyla tamamen gezilebilir.

## 7. Karakter paketi ve kare bütçesi

Her karakter tek bir paket: bir tanım dosyası, bir sprite atlası ve sesler. Motor ile çizim arasındaki sözleşme bu pakettir; karakter başına yaklaşık 335 kare hedeflenir.

### 7.1 Paket içeriği

- **Kimlik:** ad, kısa tanıtım, seçim/VS/HUD portreleri.
- **Fiziksel değerler:** can, yürüme ve koşma hızı, zıplama, ağırlık.
- **Animasyonlar:** her kare için süre, sprite, konum kayması ve kutular: itme kutusu, hasar alma kutuları, vuruş kutuları, fırlatma kutusu.
- **Hareketler:** Klasik komutu ve Modern komutu; hasar, blok hasarı, sersemletme ve blok sersemletmesi süreleri, donma, itme, yüksek/alçak/havai türü, iptal pencereleri, güç kazancı.
- **Mermiler ve efektler**, **8 renk paleti**, **sesler**, isteğe bağlı **yapay zekâ ipuçları**.
- Ortak durumlar (bekleme, yürüme, blok, hasar alma, düşme, kalkma) motorda hazırdır; paket yalnızca animasyonlarını verir.
- Paket sürümlüdür ve doğrulanır. İçerik özeti online maçta iki tarafın aynı sürümü kullandığını kontrol eder.

### 7.2 Karakter başına kare bütçesi

Karşılaştırma: KOF XII'de karakter başına 400–600 sprite vardı ve deneyimli bir sanatçının tek başına bir karakteri bitirmesi 16 ay sürebiliyordu ([kaynak](https://www.gamespot.com/articles/king-of-fighters-xii-knuckles-up-next-year/1100-6197909/)). Bizim bütçemiz bilerek daha düşük ve hareket listesi buna göre sade.

| Grup | İçerik | Kare (yaklaşık) |
| --- | --- | --- |
| Normal saldırılar | 4 tuş × ayakta/çömelik/havada = 12 vuruş + 2 yönlü vuruş | 95 |
| Hareket | bekleme, ileri/geri yürüme, çömelme, kısa ve normal zıplama, koşma, geri adım, yuvarlanma, dönme | 60 |
| Özel hareketler | 3–4 özel hareket ve mermi efektleri | 50 |
| Savunma ve hasar | ayakta/çömelik blok, hafif/ağır darbe, havada darbe, yere düşme, kalkma | 45 |
| Sunum | giriş, zafer, süre bitti, nakavt | 30 |
| Süper | süper ve büyük süper, kesme portresi | 25 |
| Fırlatma | fırlatma ve fırlatılma pozları | 16 |
| KOF mekanikleri | geri itme vuruşu, blok iptali | 15 |
| **Toplam** |  | **\~335** |

Emir KOF XIII tarzını seçti: karakter boyu 960×540 sahnede yaklaşık 190–210 pikseldir; bu oran KOF XIII'ün 720p'deki görünümüne yakındır. Görünüm Aşama 1 sonunda prototip savaşçılarla Emir'in onayına sunulur.

## 8. Sanat, arayüz ve ses üretim hattı

Arayüz Claude Design'da tasarlanıp onaylanır. Karakterler için önerilen yol 3D destekli piksel üretimidir; bu yol Aşama 1'de prototip savaşçılarla erkenden kanıtlanır.

### 8.1 Arayüz tasarım süreci

1. **Tasarım sistemi** (Claude Design System): renkler, yazı tipleri, butonlar, paneller, can barı. Her ekran buna uyar.
2. **Ekran mockup'ları** (Claude Design): başlık, menüler, karakter seçimi, VS, HUD, sonuç, lobi, turnuva ağacı, ayarlar. Emir onaylar.
3. **Logo ve kapak görseli:** Claude Design ve Canva. Canva ayrıca baskı malzemeleri için kullanılır (davet kartı, ileride oyun kitapçığı).
4. **Kodlama:** geçiş animasyonları, menü sesleri, oyun koluyla tam gezinme.

### 8.2 Karakter üretim yolları

**Yol A, önerilen: 3D destekli piksel.** Dead Cells karakter animasyonlarını 3D modellerden 2D sprite olarak üretti ([kaynak](https://80.lv/articles/interview-with-the-developers-of-dead-cells)). KOF XIII de karakterleri önce 3D model olarak pozlayıp 2D karelere çevirdi ([kaynak](https://www.siliconera.com/?p=168125)).

1. Konsept: Emir'in çizimi veya yapay zekâ görseli.
2. 3D model ve iskelet: Meshy veya Tripo ile görselden model ve otomatik iskelet.
3. Animasyon: Quaternius Universal Animation Library 1 ve 2 (CC0; 120+ ve 130+ hareketlik iki kütüphane, 3–4 vuruşluk dövüş komboları dahil; ücretsiz sürümler büyük kısmını içerir) ([kaynak](https://quaternius.com/packs/universalanimationlibrary2.html)), Meshy/Mixamo hazır hareketleri, gerekirse Emir'in kendi videosundan hareket yakalama.
4. **Sprite Stüdyosu** (bizim aracımız, tarayıcıda): 3D animasyonu piksel karelere çevirir (çizgi film gölgelendirme, dış hat, palete indirme). Vuruş ve hasar kutularını iskeletin uzuvlarından otomatik önerir.
5. İsteğe bağlı elle rötuş: Aseprite veya PixelLab.
6. Karakter Stüdyosu'nda zamanlama, kare verisi, test ve yayınlama.

**Yol B: saf 2D piksel.** Aseprite ve PixelLab'in yapay zekâ animasyon araçları. En "el yapımı" görünüm ama en yavaş yol. PixelLab'in metinden animasyon aracı en fazla 256×256 piksel tuvalle çalışıyor ([kaynak](https://www.pixellab.ai/docs/tools/text2animation)); 200 piksellik karakterin geniş vuruş pozları bu sınıra dayanır. Efekt, portre ve rötuş için her durumda faydalı.

**Yol C: piksel sanatçısına sipariş.** En pahalı yol, ancak özel bir karakter için düşünülebilir.

Sanat yolu Aşama 1 sonunda kilitlenir: Emir prototip savaşçıları görür ve 3D destekli görünümü onaylar ya da diğer yollardan birine geçilir. Karakter Stüdyosu'nun çekirdeği her yola açıktır: sprite sayfası (Aseprite) içe aktarma ve elle kare/kutu düzenleme her zaman vardır; 3D'den piksele dönüştürme bunlardan biri olan bir içe aktarma yoludur. Aile üyelerinden esinlenen karakterler istenirse çizim ya da tarif üzerinden yapılır; çocukların fotoğrafları üçüncü taraf yapay zekâ servislerine yüklenmez.

### 8.3 Sahneler ve ses

- 2–3 sahne: katmanlı kayan arka planlar (yatayda yaklaşık 1,5 ekran), hareketli öğeler.
- Ses efektleri: vuruş, blok, özel hareket, menü. Spiker sesi ("Raunt 1… Dövüş!"): öneri, Emir'in kendi sesiyle kaydedilebilir.
- Müzik: sahne başına giriş + döngü. Kaynak Aşama 5'te seçilir (yapay zekâ müzik araçları veya serbest lisanslı kütüphaneler). Aşama 1'de geçici sesler.

### 8.4 Araçlar

| Araç | Ne için | Maliyet | Kim kullanır |
| --- | --- | --- | --- |
| Claude Design | Ekran mockup'ları, tasarım sistemi | Dahil | Claude |
| Canva (bağlı) | Logo varyasyonları, kapak, baskı | Emir'in hesabı | Claude hazırlar, Emir onaylar |
| Quaternius UAL 1 + 2 | CC0 animasyon kütüphanesi | Ücretsiz | Claude |
| Meshy veya Tripo | Görselden 3D model ve iskelet | Ücretsiz katman / abonelik | Emir'in hesabıyla, Claude yönlendirir |
| [Aseprite](https://store.steampowered.com/app/431730/Aseprite/) | Piksel rötuş | Tek seferlik 19,99 $ | Emir (isteğe bağlı) |
| PixelLab | Yapay zekâ destekli piksel animasyon ve rötuş | Abonelik | Emir (isteğe bağlı) |

## 9. Hesaplar, sıralama, turnuvalar

Hesaplar yalnızca davetle açılır ve şifre istemez. Sıralama Glicko-2 ile tutulur, turnuvalar tek ve çift eleme olarak çalışır.

### 9.1 Hesaplar: şifresiz davet bağlantısı

1. Emir yönetim panelinden kişi için profil açar; sistem kişiye özel bir bağlantı ve QR kod üretir.
2. Kişi bağlantıyı açar, takma adını ve avatarını seçer. Cihazı kalıcı bir giriş anahtarı alır.
3. İlk girişte 12 karakterlik bir kurtarma kodu gösterilir.
4. Yeni cihaz eklemek için kişi kendi profilinden kısa ömürlü bir kod üretir ya da Emir yeni bağlantı verir.

Neden şifresiz: Hatırlanacak şifre yok; çocuklar ve büyükler için en kolayı bu. Ayrıca güvenli şifre saklamak yavaş özetleme ister ve bu Cloudflare'in ücretsiz planındaki 10 ms işlemci sınırına sığmaz ([kaynak](https://flaviocopes.com/native-email-password-authentication-cloudflare-workers/)). Uzun rastgele anahtarlar bu yükü gerektirmez.

- Aynı bilgisayarı paylaşan aile: bir cihazda birden çok profil. İsteğe bağlı 4 haneli PIN, sunucuda deneme sınırıyla korunur.
- Profil: takma ad, avatar, ana karakter, kontrol tipi, tuş atamaları (buluta kaydedilir).
- Yönetim paneli (Emir): davet, profil kapatma, maç itirazları, turnuva açma, yedek indirme.

### 9.2 Sıralama

- Glicko-2: puan ve belirsizlik birlikte tutulur. Yeni oyuncu 1500 puanla başlar. Seyrek oynayanın puanı daha temkinli hesaplanır.
- Puan yalnızca Sıralı modda değişir; maç 3 oyunda 2 galibiyet.
- Küme rozetleri (Bronz, Gümüş, Altın, Elmas, Usta): puan aralığına göre, tamamen görsel motivasyon.
- Sezonlar: öneri 3 ayda bir. Puanlar yumuşak sıfırlanır, sezon şampiyonu profilinde rozet taşır.
- Sonucu iki taraf da bildirir; uyuşmazsa puan işlenmez ve maç Emir'in onayına düşer.
- İstatistikler: galibiyet oranı, karakter kullanımı, karşılaşma geçmişi, en uzun kombo.

### 9.3 Turnuvalar

- Türler: tek eleme, çift eleme, isteğe bağlı grup aşaması.
- Eşleştirme mantığı: [brackets-manager.js](https://github.com/Drarig29/brackets-manager.js) (MIT lisanslı TypeScript kütüphanesi; tek eleme, çift eleme ve grup destekler). Ağaç görünümü bizim tasarım sistemimizle çizilir.
- Akış: turnuva açılır → kayıt → puana göre seri başı → maçlar → canlı ağaç ve izleyici modu → şampiyon ekranı ve profil rozeti.
- Maçlar online oynanır. Aynı bilgisayarda oynanan maçın sonucunu yönetici girer.
- Zamanlama: tek akşamda canlı ya da günlere yayılan (her maç için son tarih).
- Maç formatı: ön turlar 3'te 2, final 5'te 3 (ayarlanabilir).

## 10. Yol haritası

Altı aşama v1.0'a götürür, her biri bir onay kapısıyla biter; Aşama 4 sonunda oyun karakterler hariç eksiksizdir. v1.0'dan sonra Kolay mod gelir. Süreler takvim tahminidir ve Emir'in test ve onay hızına bağlıdır.

&#91;embedded content: yol haritası · 6 aşama, 6 kapı\]

Her kapı Emir'in onayıyla açılır; bir sonraki aşama ancak o zaman başlar.

**Aşama 0: Temel ve tasarım dili (\~1 hafta)**

- GitHub deposu, Cloudflare kurulumu, otomatik dağıtım ve önizleme adresleri, test altyapısı.
- Tasarım sistemi ve tüm ekranların mockup'ları (Claude Design).
- Oyunun adı ve logo yönü.
- Kapı: Emir mockup'ları onaylar.

**Aşama 1: Motor ve yerel oyun (\~4–6 hafta)**

- İlk hafta, teknik kanıt: iki kutu karakter, vuruş kutuları, ölçüm paneli; Emir kendi bilgisayarında ölçer (şartlar Bölüm 11'de). Geçmezse motor büyümeden yol değiştirilir. Ardından deterministik çekirdek, çizim, giriş (Klasik ve Modern), dövüş sistemleri, bilgisayar rakip.
- Arcade, Versus, Antrenman; menüler, ayarlar, ses altyapısı.
- Sprite hattının ilk sürümü ve onunla 2 prototip savaşçı + 1 sahne (CC0 3D varlıklardan).
- Kapı: Emir aynı bilgisayarda biriyle oynar; 60 FPS sabit; 10.000 rastgele maçta sıfır determinizm hatası; tüm menüler Playwright'tan geçer; Emir prototip savaşçıların görünüşünü onaylar ve sanat yolu kilitlenir.

**Aşama 2: Online (\~2–4 hafta)**

- WebRTC ve rollback, lobi, davet, bağlantı kalitesi göstergesi, ağ ayarları, tekrar kaydı.
- Kapı: yapay 150 ms gecikme ve %5 paket kaybında senkron kayması yok; Emir uzaktaki bir akrabayla test maçı yapar.

**Aşama 3: Hesaplar, sıralama, turnuva, Windows sürümü (\~3–4 hafta)**

- Davet sistemi, profiller, Glicko-2, sıralama tablosu, sezonlar, tek/çift eleme, izleyici modu, yönetim paneli, yedekleme; Windows masaüstü sürümü (kurulum dosyası, otomatik güncelleme, maç başında sürüm kontrolü).
- Kapı: 8 kişilik deneme turnuvası baştan sona sorunsuz biter; web ve masaüstü oyuncuları aynı maçta sorunsuz oynar.

**Aşama 4: Karakter Stüdyosu (\~3–5 hafta)**

- Sprite Stüdyosu (3D'den piksele) ve sprite sayfası içe aktarma, kare ve kutu editörü, hareket editörü (iki kontrol tipi), aynı sekmede antrenman testi, doğrulama, yayınlama ve sürümleme.
- Kapı: Emir tek satır kod yazmadan bir test karakterini ekler ve online maçta kullanır.

**Aşama 5: Karakterler ve son dokunuşlar (6 karakter, her biri \~1–3 hafta)**

- Emir'in tasarladığı 6 karakter: tasarım, hareket listesi ve onay Emir'de; üretim Claude'da.
- Sahneler, müzik ve sesler, açılış animasyonu, emeği geçenler, çevrimdışı arşiv.
- Kapı: ilk aile sürümü (v1.0).

**v1.0 sonrası: Kolay mod**

- Adım adım yol gösteren karakter sihirbazı, hazır hareket şablonları, otomatik doldurulan kare verisi, denge uyarıları; tüm metinler Türkçe.
- Amaç: Emir ve ileride çocukları kendi karakterlerini kendi başlarına yapar.

## 11. Test ve kalite

Hiçbir teslim derin debug olmadan yapılmaz. En kritik güvence, aynı girdilerin her tarayıcıda aynı sonucu verdiğinin otomatik kanıtıdır.

- **Birim testleri (Vitest):** hasar, blok, kombo azalması, komut ayırıcı, Glicko-2, turnuva ilerlemesi.
- **Determinizm:** 10.000 rastgele girdili maç; her birinin son durum özeti Chrome, Firefox ve Edge'de aynı olmalı.
- **Rollback:** "rastgele geri sarma" modu her karede rastgele sayıda kare geri sarıp yeniden oynatır. Sonuç geri sarmasız oyunla birebir aynı olmalı.
- **Ağ:** Playwright iki tarayıcı açıp maç yapar; ağ katmanımız yapay gecikme, dalgalanma ve paket kaybı ekler.
- **Arayüz:** Playwright her ekranı klavye ve oyun koluyla gezer; ekran görüntüsü karşılaştırması görsel bozulmaları yakalar.
- **Altın tekrarlar:** önemli maçların tekrar dosyaları saklanır. Motor değişince aynı sonucu vermeleri kontrol edilir; bilerek yapılan değişiklikte güncellenir.
- **Performans bütçesi:** 60 FPS; bir simülasyon adımı 1 ms'nin altında; 8 karelik geri sarma 4 ms'nin altında.
- **Oyun içi hata bildirimi:** "Hata bildir" son 10 saniyenin tekrarını ve günlüğü sunucuya gönderir; Claude bunu birebir yeniden üretebilir.

**Teknik kanıt şartları (Aşama 1'in ilk haftası, Emir'in bilgisayarında):** 10 dakika boyunca saniyede 60 kare ve tek kare düşmemesi; bir simülasyon adımının 1 ms'nin altında kalması; 8 karelik geri sarmanın 4 ms'nin altında kalması; yapay 150 ms gecikmede iki tarayıcının hep aynı durum özetini vermesi. Masaüstü sürümü de Playwright'ın Electron desteğiyle test edilir.

## 12. Roller

Karakter tasarımına kadar işin neredeyse tamamı Claude'dadır. Emir karar verir, onaylar ve test eder; zorunlu işlerde önce Claude dener.

| Konu | Claude | Emir |
| --- | --- | --- |
| Mimari ve kod | Tümü | — |
| Arayüz tasarımı | Mockup'lar, tasarım sistemi, logo taslakları | Onay, oyun adı |
| Test | Otomatik testler, derin debug | Oyun hissi, aile testleri |
| Dağıtım | Otomatik kurulum, önizleme adresleri | Tek seferlik hesap bağlama |
| Prototip karakterler | CC0 varlıklardan üretim | Görünüşü onaylamak (sanat yolu kilitlenir) |
| Karakterler (Aşama 5) | Üretim: model, animasyon, kutular, kare verisi | Tasarım, hareket listesi, onay |
| Aile | Davet bağlantıları hazır, rehber metinler | Davetleri iletmek |

**Emir'in zorunlu işleri** (her biri için Claude sohbette adım adım rehber verir):

- [ ] Cloudflare hesabı açmak (ücretsiz). Hesap ve şifre yalnızca Emir'de kalır.
- [ ] GitHub deposunu Cloudflare'e bağlamak (tek seferlik, yaklaşık 5 dakika).
- [ ] Gerekirse yeni GitHub deposu oluşturmak; önce Claude dener.
- [ ] Ortam engellerse CC0 varlık arşivlerini indirip eklemek; önce Claude dener.
- [ ] Aşama 2'de uzaktaki bir akrabayla test maçı.
- [ ] Aşama 5'te ücretli araç kararları (isteğe bağlı).

## 13. Maliyet ve uzun ömür

Sunucu tarafı aylık 0 $ ile çalışır; tek zorunlu olmayan harcamalar Aşama 5'teki sanat araçlarıdır.

| Kalem | Maliyet | Not |
| --- | --- | --- |
| Cloudflare Workers, D1, Durable Objects, KV, TURN | 0 $/ay | 50–60 kişi için ücretsiz kotalar yeterli |
| Yedek plan: Cloudflare Workers Paid | 5 $/ay | Yalnızca kotalar aşılırsa ([kaynak](https://developers.cloudflare.com/workers/platform/pricing/)) |
| GitHub özel depo | 0 $ |  |
| Windows kod imzası | 0 $ | Aile içinde imzasız dağıtılır. İstenirse sertifika yılda 150–300 $; imzalı dosya da indirme geçmişi birikene kadar uyarı alır ([kaynak](https://learn.microsoft.com/windows/apps/package-and-deploy/code-signing-options)) |
| Alan adı | Yıllık yaklaşık 10 $ | İsteğe bağlı |
| Aseprite | Tek seferlik 19,99 $ | İsteğe bağlı, Aşama 5 |
| PixelLab, Meshy veya Tripo | Abonelik | İsteğe bağlı, Aşama 5, Emir kararı |

Ücretsiz kotalar: Workers günde 100.000 istek; D1 günde 5 milyon satır okuma ve 100.000 yazma, toplam 5 GB ([kaynak](https://developers.cloudflare.com/d1/platform/pricing/)); KV 1 GB; TURN ayda 1.000 GB. Aşımı bu kitle için gerçekçi değil; yine de kullanım yönetim panelinde izlenir. Sunucu tasarımı ödeme kartı gerektirmez; 5 $/ay plana geçiş gerekirse önce Emir'e sorulur.

**Uzun ömür (çocuklara miras)**

- Arcade, Versus ve Antrenman sunucu olmadan çalışır. Oyun bilgisayara uygulama gibi yüklenebilir (PWA).
- Yönetim panelinden tek tıkla tam yedek: oyuncular, puanlar, maçlar, karakterler.
- "Zaman kapsülü": oyunun tam çevrimdışı kopyası tek bir arşiv dosyası olarak saklanır. İnternet servisleri değişse bile yıllar sonra açılabilir.
- Kaynak kod ve tüm belgeler GitHub'da. Bağımlılıklar sabit sürümlü.
- Sunucu kodu standart web arayüzleriyle yazılır; gerekirse başka bir sağlayıcıya taşınabilir.

## 14. Riskler ve önlemler

En büyük risk sanat üretiminin yavaşlığıdır; bu yüzden üretim hattı Aşama 1'de, karakterlerden çok önce kanıtlanır.

| Risk | Etkisi | Önlem |
| --- | --- | --- |
| Karakter çizimi beklenenden yavaş | Aşama 5 uzar | Kare bütçesi, 3D destekli hat, Aşama 1'de prototip ve sanat yolu onayı |
| Online senkron kayması | Rekabet çöker | Ondalıksız çekirdek, rastgele geri sarma testleri, tarayıcılar arası özet testleri, uyuşmazlık dökümü |
| Kıtalar arası yüksek ping | Online his bozulur | Ayarlanabilir girdi gecikmesi, bağlantı göstergesi; akrabaların bulunduğu ülkelerle Aşama 2'de test |
| Ücretsiz kota kuralları değişir | Servis durur | Kullanım izleme, 5 $/ay plana geçiş hazır, taşınabilir sunucu kodu |
| Tarayıcı güncellemeleri | Grafik veya bağlantı bozulur | WebGL2 varsayılan, üç tarayıcıda otomatik testler |
| Tek klavyede iki kişi tuş kilitlenmesi | Yan yana oyunda tuş kaçar | Oyun kolu önerisi, Ayarlar'da klavye testi |
| Kapsamın büyümesi | Takvim kayar | Her kapıda Emir onayı; yeni fikirler "sonra" listesine |
| Varlık lisansları | Telif sorunu | Yalnızca CC0 veya kendi üretimimiz; araç lisansları Aşama 5'te kontrol |

Masaüstü sürümüne özgü iki risk var. Birincisi Windows'un imzasız uygulama uyarısı: aileye tek ekranlık "Ek bilgi → Yine de çalıştır" talimatı verilir. İkincisi web ve masaüstü sürümlerinin farklı sürümde kalması: otomatik güncelleme ve maç başında sürüm kontrolü bunu önler.

## 15. Claude'un kararları ve açık sorular

Emir sekiz karar verdi; geri kalan teknik kararları Claude verdi ve Emir herhangi birini değiştirebilir. Açık soruların hiçbiri şu an işi durdurmuyor.

**Emir'in kararları**

1. Süreç sırası: motor → online → hesap/sıralama/turnuva → Karakter Stüdyosu → karakterler.
2. Kontroller: Klasik ve Modern birlikte.
3. Görünüş ve his: KOF XIII tarzı (büyük HD sprite'lar, koşma, kısa zıplama, yuvarlanma).
4. Karakterler: önce birlikte (tasarım ve onay Emir'de, üretim Claude'da), v1.0'dan sonra Kolay mod ile Emir ve çocukları kendi başlarına.
5. v1.0'da 6 karakter.
6. Aşama 1'in ilk haftasında teknik kanıt kapısı: performans Emir'in bilgisayarında ölçülür.
7. Yeniden kullanılabilir motor: genel katman dövüş katmanından ayrı.
8. Windows masaüstü sürümü, Aşama 3 sonunda; web ve masaüstü oyuncuları birlikte oynar.

**Claude'un kararları**

1. Kendi motorumuz (TypeScript + PixiJS v8) ve Cloudflare sunucusu.
2. Temel çözünürlük 960×540, karakter boyu yaklaşık 200 piksel (KOF XIII oranı).
3. Klasik 4 tuş, Modern 3 + Özel; Modern'de özel hareketler %20 daha az hasar.
4. Şifresiz davet bağlantısıyla giriş, kurtarma kodu ve isteğe bağlı PIN.
5. Glicko-2 sıralama, 3 aylık sezonlar, küme rozetleri.
6. Kamera yakınlaştırması yok; pikseller her zaman keskin.
7. Prototip savaşçılar CC0 3D varlıklardan, Aşama 1'de; kadroya girmez, antrenman kuklası olarak kalır.
8. Sanat yolu Aşama 1 sonunda kilitlenir; Stüdyo'nun çekirdeği her yola açık (sprite sayfası ve elle düzenleme), 3D'den piksel bir içe aktarma yolu.
9. Sunucu ödeme kartı gerektirmez; karakter paketleri R2 yerine KV'de.
10. Türkçe arayüz, çeviri altyapısı hazır. Masaüstü kabuğu Electron; Windows sürümü imzasız dağıtılır, Mac masaüstü sürümü şimdilik yok.

**Açık sorular (zamanı gelince sorulacak)**

- Oyunun adı: Aşama 0'da, logo tasarımından önce.
- Evlerdeki oyun kolları (hangi marka, var mı): Aşama 1 başında; test planını etkiler.
- Ücretli sanat araçları: Aşama 1 sonunda, sanat yolu kilitlenirken.
- Alan adı mı, ücretsiz Cloudflare adresi mi: ilk davetlerden önce, Aşama 3 başında. Adres sonradan değişirse herkesin oturumu düşer ve davet kartları geçersizleşir.
- Uzaktaki akrabaların bulunduğu ülkeler: Aşama 2 ağ testleri için (erken söylenirse daha iyi).

## Kaynaklar

- [KOF XII: karakter başına sprite sayısı ve üretim süresi (GameSpot)](https://www.gamespot.com/articles/king-of-fighters-xii-knuckles-up-next-year/1100-6197909/)
- [KOF XIII'te 3D modelden 2D kare üretimi (Siliconera)](https://www.siliconera.com/?p=168125)
- [Dead Cells geliştiricileriyle röportaj (80.lv)](https://80.lv/articles/interview-with-the-developers-of-dead-cells)
- [Ikemen GO WebAssembly tartışması (GitHub)](https://github.com/ikemen-engine/Ikemen-GO/discussions/879)
- [Godot Rollback Netcode eklentisi](https://www.godotengine.org/asset-library/asset/2450)
- [PixiJS](https://pixijs.com/blog)
- [Supabase proje uyku modu](https://supabase.com/docs/guides/platform/pausing) ve [fiyatlar](https://supabase.com/pricing)
- [Cloudflare Workers sınırları](https://developers.cloudflare.com/workers/platform/limits/) ve [fiyatlar](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare D1 fiyatları](https://developers.cloudflare.com/d1/platform/pricing/)
- [Durable Objects ücretsiz planda](https://developers.cloudflare.com/changelog/2025-04-07-durable-objects-free-tier)
- [Cloudflare TURN SSS](https://developers.cloudflare.com/realtime/turn/faq/)
- [Workers'ta şifreli giriş ve işlemci sınırı (Flavio Copes)](https://flaviocopes.com/native-email-password-authentication-cloudflare-workers/)
- [Street Fighter 6 Modern kontrol hasar farkı (esports.gg)](https://esports.gg/guides/street-fighter-6/do-modern-controls-do-less-damage-in-sf6)
- [brackets-manager.js](https://github.com/Drarig29/brackets-manager.js)
- [Quaternius Universal Animation Library 2](https://quaternius.com/packs/universalanimationlibrary2.html)
- [PixelLab metinden animasyon aracı](https://www.pixellab.ai/docs/tools/text2animation)
- [Aseprite (Steam)](https://store.steampowered.com/app/431730/Aseprite/)

* [Electron ve Tauri karşılaştırması (OpenReplay)](https://blog.openreplay.com/comparing-electron-tauri-desktop-applications/)
* [Web teknolojisiyle masaüstü uygulama seçenekleri (Digital Applied)](https://www.digitalapplied.com/blog/desktop-apps-web-stack-tauri-electron-deno-wails-2026)
* [Windows kod imzalama seçenekleri (Microsoft)](https://learn.microsoft.com/windows/apps/package-and-deploy/code-signing-options)
