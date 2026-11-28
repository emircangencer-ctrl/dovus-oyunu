# SysKO kombo sistemi — tasarım

Tarih: 2026-11-28 · Durum: Emir yaklaşımı seçti ("Dediğin gibi yapalım"); bu doküman onaya sunuluyor.
Üst doküman: `2026-11-24-dovus-oyunu-design.md` Bölüm 6.1 (dövüş sistemi), 6.2 (Klasik ve Modern kontroller), Aşama 4–5 (Karakter Stüdyosu, karakterler).

## 1. Amaç ve neden

Emir'in tarifi: art arda vurulan 3–4 saldırının "uyumlu" olması. İlk iki vuruş isabet ederse üçüncüye karşı blok ya da kaçış zorlaşmalı ya da imkânsız olmalı. Shoryuken gibi bir özel hareket 3. ya da 4. sıradaysa vuruşu yiyen kaçamamalı. KOF, Street Fighter ve BlazBlue'daki sıralı, isabetli kombo sistemine benzer bir şey isteniyor. İleride her karakterin kombosu, özel hareketleri ve vuruş kutuları farklı olacak.

Neden: oyunun keyfi kombo kurmaktan gelsin; aile içinde hem yeni başlayan (Modern) hem ustalaşan (Klasik) aynı komboların tadını çıkarsın; karakterler birbirinden gerçekten farklı hissettirsin.

## 2. Hedefler, hedef olmayanlar, ters hedefler

Hedefler:
- İlk vuruş isabet edince devamı **gerçek kombo** olsun: savunan sersemkenken gelen vuruşa blok da kaçış da yok.
- Kombolar tuş sırasıyla kurulsun (zamanlama ustalığı şart değil); özel hareket ve süper komboya bağlanabilsin.
- Her karakterin kendi bağlanma kuralları ve 2–3 **imza kombosu** olsun; hepsi veriyle tanımlansın, kod yazmadan değişsin.
- Modern'de aynı imza kombolar tek tuşla çıksın.
- Kombolar adil kalsın: hasar azalır, kombo sonsuza uzamaz, havada sınır var.
- Karakter tasarlanırken komboların gerçekten kaçılamaz olduğu bilgisayarca kanıtlansın.

Hedef olmayanlar (şimdilik):
- KOF XIII'teki özel → özel iptali (sürücü iptali), Hyperdrive modu, MAX iptali.
- Karşı vuruş / cezalandırma bonusu (SF6 Punish Counter). İstenirse sonra eklenir.
- Kombo kırıcı (Killer Instinct, Guilty Gear patlaması).

Ters hedefler (teknik olarak çalışsa bile başarısızlık sayılır):
- Tek isabetle raundu bitiren kombolar (SF2'deki "tek dokunuşta ölüm").
- Bütün karakterlerin aynı komboyu yapması.
- Savunanın ilk vuruştan sonra uzun süre hiçbir şey yapamadan izlemesi (kombo ~6 saniyeyi geçmez).
- Otomatik kombonun elle yapılandan güçlü olması.

## 3. Araştırma özeti

Kaynaklar Bölüm 10'da. Özet:

1. **Kaçılamazlık sersemletmeden gelir.** Vurulan bir süre sersemler; sonraki vuruş bu süre bitmeden başlarsa savunan blok yapamaz. İlk vuruş bloklanırsa aynı ilke blokta işler ("blok dizisi").
2. **Sonraki vuruşu yetiştirmenin dört yolu:**
   - *Bağlama* (Street Fighter): ilk vuruş tamamen biter, rakip hâlâ sersemken sonraki başlar; doğru anda basmak gerekir. SF6 büyük ölçüde buna dayanır.
   - *İptal* (SF, KOF): normal vuruş isabet anında özel harekete; KOF'ta özel hareket de süper harekete iptal edilir (blokta da). KOF XIII'te özel → özel yalnız isabette.
   - *Sıralı zincir* (BlazBlue "Revolver Action", Guilty Gear "Gatling"): tuşlar A→B→C→D artan sırayla birbirini iptal eder; ilk vuruş oturursa seri oturur; her karakterin tablosu farklı, bazı vuruşlar hiç iptal edilemez.
   - *Hedef kombo* (SF, KOF): karaktere gömülü, hareket listesinde görünen tuş dizileri.
3. **Karakter farkı** her vuruşun "neye bağlanabilir" bilgisinden gelir (Guilty Gear'da karakter başına zincir tablosu; KOF'ta hangi özel hareketin iptal edilebildiği hareket başına).
4. **Adalet kuralları:** SF hasar azalması 100, 100, 80, 70…; BlazBlue'da kombo uzadıkça sersemletme kısalır ve ~14 sn'de 1 kareye iner, ayrıca karakter başına kombo oranı; SF'de havada vurma gücü (juggle) sınırı; KOF XIII'te blokta 1 bar harcayarak yuvarlanma ya da geri itme (blok iptali).
5. **Yeni başlayanlar:** KOF XV'te hafif yumruğa art arda basınca özel hareketle biten kombo, son tuş bitişi seçer; SF6 Modern'de yardım tuşuyla otomatik kombo (küçük hasar bedeli); BlazBlue'da "Smart Combo". Bazı oyuncular otomatik komboyu başarı hissini alan bir şey olarak görür.
6. **Öğretici gösterge:** BlazBlue geçerli kombo sayacını kırmızı, kaçılabilir olanı mavi gösterir.

## 4. Yaklaşımlar

| Yol | Nasıl hissettirir | Bedeli | Karar |
| --- | --- | --- | --- |
| 1. Zamanlama (SF bağlama) | Doğru anda basınca oturur | En zoru; çocuklar zorlanır | Seçilmedi |
| 2. Sıralı zincir (BlazBlue) | A→B→C→D basınca akar | Karakterler birbirine benzer | Seçilmedi |
| 3. KOF karışımı + imza kombolar | Zincir + özel/süper iptali + karaktere özgü diziler | Karakter başına veri tasarımı | **Seçildi (Emir, 2026-11-28)** |

Neden 3: Emir'in iki örneğini doğrudan karşılar (hafif yumruk → ağır yumruk → hafif tekme bir imza kombo; sona Shoryuken eklemek özel harekete iptal). Modern'de aynı kombolar tek tuşla çıkar.

## 5. Tasarım

### 5.1 Temel kural

Bir vuruş isabet edince savunan `hitstun` kadar sersemler. Kombo sayacı yalnız sersemken gelen vuruşları sayar (çekirdekte bugün de böyle). Bir kombo listesindeki her vuruş, önceki vuruşun sersemletmesi bitmeden başlamalı; bu, karakter verisi için bir **doğrulama kuralıdır** (5.7).

### 5.2 İptal merdiveni (her karakterde varsayılan, istisnalar veride)

Bir vuruş **temas ettikten sonra** (isabet ya da blok) iptal penceresi açılır: temas karesinden aktif karelerin bitişine kadar, artı 2 kare (vuruş donmasında basılan tuşlar saklanır; bugün var).

| Şundan | Şuna | İsabette | Blokta | Bedel |
| --- | --- | --- | --- | --- |
| Hafif normal (A, B) | hafif normal (zincir), ağır normal | evet | evet | — |
| Hafif ve ağır normal (süpürme ve hava vuruşları hariç) | özel hareket | evet | evet | — |
| Özel hareket (verisinde izin varsa) | süper hareket | evet | evet | 1 bar (süperin kendi bedeli) |
| Ağır normal | ağır normal | hayır (yalnız imza kombo adımıyla) | — | — |

Her vuruşun verisi bu varsayılanı değiştirebilir: "bu vuruş hiç iptal edilemez", "bu vuruş özel harekete iptal edilemez", "bu hafif vuruş ağıra bağlanamaz" gibi. Karakterlerin farkı buradan doğar.

### 5.3 İmza kombolar (hedef kombo)

Her karakterin 2–3 imza kombosu olur. Örnek (Emir'in): **Hafif Yumruk → Ağır Yumruk → Hafif Tekme**. Ağır → hafif normalde bağlanmaz; imza kombonun adımı olduğu için bağlanır. Bir adım, yalnız o dizide çıkan özel bir vuruş da olabilir (karaktere kimlik verir). Son adımdan sonra 5.2 kuralları geçerlidir: dizinin sonu özel harekete (ör. Shoryuken benzeri), o da güç varsa süpere iptal edilebilir.

İmza kombolar isabette ve blokta çalışır (KOF'taki gibi). Basılan tuş hem varsayılan merdivene hem bir imza kombo adımına uyuyorsa imza kombo adımı önceliklidir. İmza kombolar hareket listesinde (duraklatma menüsü, Antrenman) görünür.

### 5.4 Adalet kuralları

- **Hasar azalması:** bugünkü kural kalır: 1. ve 2. vuruş %100, sonra her vuruşta %10 az, en az %30. Süperlerin en az hasarı kendi verisinde (ör. %50).
- **Kombo süresi:** komboya ilk isabetten itibaren sayılır. 3 saniyeye kadar sersemletme tam; 3–6 saniye arasında her yeni vuruşun sersemletmesi kademeli kısalır (BlazBlue gibi); 6 saniyeden sonra 1 kareye iner ve kombo kendiliğinden biter. Böylece köşede sonsuz döngü olmaz. Ara eşikler ayarlanabilir.
- **Havada:** normal vuruşla havada vurulan bugünkü gibi ayakları üstüne iner ve düşerken vurulamaz. Yalnız "havaya kaldırır" özelliği olan vuruşlar (bazı özel hareketler, süperler) rakibi vurulabilir havada bırakır; her hava vuruşu 1 puan harcar, sınır 3 puan.
- **Blokta:** ilk vuruş bloklanırsa zincir blok dizisi olarak sürer (hasar yok, özel hareketlerde küçük blok hasarı 1c'de). Savunanın çıkışı üst dokümandaki blok iptalidir: blok sırasında 1 barla yuvarlanma ya da geri itme vuruşu.
- **Kombo kırıcı yok:** Emir'in "3. vuruştan kaçılamasın" isteğine ters (ters hedef).

### 5.5 Modern kontroller

Üst dokümandaki gibi: Modern'de Yardım tuşu basılıyken Hafif / Orta / Ağır'a basmak karakterin 3 otomatik rotasını çıkarır; rotalar o karakterin imza kombolarıdır (yoksa varsayılan zincir). Tuşa basmaya devam edildikçe rota ilerler; son adım özel harekete, güç varsa süpere bağlanır. Modern'de özel hareketler %20 daha az vurur (üst doküman); otomatik rota ayrıca elle yapılandan güçlü olamaz.

### 5.6 Antrenman göstergesi

Kombo sayacı yalnız gerçek komboları sayar. Antrenman'da iki vuruş arasında savunan sersemletmeden çıkıp yeniden vurulduysa sayacın yanında mavi **"ARA: n kare"** yazar (kaçılabilir boşluk); gerçek komboda sayaç kırmızı/altın kalır. Ayrıca son vuruşun avantajı (+/− kare) gösterilir. Bu, Emir'in ve çocukların kombo öğrenmesini kolaylaştırır.

### 5.7 Kombo doğrulayıcı

Her karakterin verisinde bir **kombo listesi** olur (imza kombolar ve önerilen rotalar, tuş dizisi olarak). Otomatik bir test her kombo için:
1. Kombuyu kuklaya karşı oynatır, tüm vuruşların isabet ettiğini ve kombo sayacının listedeki sayıya ulaştığını kontrol eder.
2. Aynı komboyu, ilk isabetten sonraki **her karede** savunanın blok, zıplama, geri sıçrama, vuruş denediği sürümlerle tekrar oynatır; hiçbiri sonraki vuruşu engelleyemezse kombo "gerçek"tir.

Bir karakterin listesindeki herhangi bir kombo kaçılabilirse test kırılır. Emir kombo tasarlar, bilgisayar kanıtlar.

### 5.8 Karakter başına ne tasarlanır

Kurallar (5.1–5.7) bir kez yazılır, bütün karakterlerde ortaktır. Her karakter için yalnız onu o karakter yapan kısım tasarlanır; Emir için sade bir **karakter kartı**:

- Kimlik: ad, his (hızlı / güçlü / uzun menzil / tuzakçı).
- Normal vuruşların karakteri (ör. "ağır tekmesi yavaş ama çok uzun").
- 3–4 özel hareket: ad, komut, ne yaptığı (ör. "Ejder Yumruğu: →↓↘ + Yumruk, havaya kalkan aparkat, yere düşürür").
- 1 süper, 1 büyük süper.
- 2–3 imza kombo (tuş sırası).
- İstisnalar (ör. "hafif tekmesi zincirlenmez").

Emir kartı doldurur; Claude sayılara ve kutulara çevirir, doğrulayıcıyla kanıtlar, Antrenman'da denenecek hâle getirir. Vuruş kutuları çizimlerden çıkar ve Karakter Stüdyosu'nda (Aşama 4) görülerek düzenlenir. Kukla, sistemin örneği olarak 2 imza kombo ve özel hareketle biten bir rota alır.

### 5.9 Veri yapısı (yapıcı için)

`FighterDef` ve `AttackDef` genişler (alan adları yapıcının; anlamları bağlayıcı):
- Vuruş başına: sınıf (hafif / ağır / özel / süper), iptal izinleri (varsayılandan sapmalar), iptal penceresi, havaya kaldırma ve hava puanı bedeli, süperde en az hasar oranı.
- Karakter başına: imza kombolar (adım dizisi: önceki vuruş + tuş [+ yön] → sonraki vuruş), Modern rotaları (Hafif / Orta / Ağır → imza kombo), kombo listesi (doğrulayıcı ve hareket listesi için tuş dizisi + beklenen vuruş sayısı).
- Simülasyon durumuna: kombo süresi (sayacı), hava puanı, imza kombo içindeki adım. Hepsi tam sayı, özete dahil (rollback ve determinizm).

## 6. Sıra

Kombo sistemi özel hareketlere bağlı olduğu için Aşama 1c'de onlarla birlikte yapılır: komut ayırıcı ve özel hareketler + 5.2–5.4 + imza kombolar + doğrulayıcı + Antrenman göstergesi + kuklanın örnek komboları. Güç göstergesi, süper, blok iptali, yuvarlanma, geri itme vuruşu, fırlatma ve Modern kontroller (5.5) bir sonraki alt planda (1d). Kol testleri Aşama 1'in en sonunda (Emir'in isteği).

## 7. Testler

- Birim: iptal merdiveni (her satır, isabet ve blok), imza kombo adımları ve yanlış sırada basınca bağlanmama, kombo süresiyle sersemletmenin kısalması, hava puanı sınırı, hasar azalması.
- Doğrulayıcı (5.7): her karakterin kombo listesi.
- Determinizm ve rastgele geri sarma: yeni durum alanlarıyla altın özetler.
- Uçtan uca: Antrenman'da imza kombo, sayaç ve "ARA" göstergesi.

## 8. Yapıcıya kalanlar

Kare sayıları, iptal penceresi uzunluğu, kombo süresi eşikleri, hava puanı değerleri, kuklanın örnek kombolarının tam tuş dizisi, Antrenman göstergesinin yerleşimi (onaylı HUD kombo alanının altında).

## 9. Kararlar

| Karar | Kim |
| --- | --- |
| Yaklaşım 3 (KOF karışımı + imza kombolar) | Emir |
| Varsayılan iptal merdiveni, zincir ve özel iptal blokta da | Claude |
| Kombo süresi sınırı 3–6 sn, hava puanı 3 | Claude |
| Kombo kırıcı yok; savunma blok iptaliyle | Claude (Emir'in isteğinden) |
| Karşı vuruş bonusu şimdilik yok | Claude |
| Kombo doğrulayıcı ve Antrenman "ARA" göstergesi | Claude |

## 10. Kaynaklar

- Street Fighter Wiki — Link Combo: https://streetfighter.fandom.com/wiki/Link
- Capcom SF Seminar — cancels, chain (renda) cancel: https://game.capcom.com/cfn/sfv/column/132455?lang=en
- SF6 combo ve hedef kombo: https://gamingbolt.com/street-fighter-6-guide-how-to-do-continuous-special-moves ; https://www.wepc.com/gaming/street-fighter-6-how-to-combo/
- Street Fighter Wiki — Damage Scaling tablosu: https://streetfighter.fandom.com/wiki/File:Ibuki_SJC_Ultra_Scaling.gif
- SF6 ölçekleme türleri: https://srk.shib.live/w/Street_Fighter_6/Glossary
- SF6 karşı vuruş ve cezalandırma: https://srk.shib.live/w/Street_Fighter_6/Offense
- Street Fighter Wiki — Juggling: https://streetfighter.fandom.com/wiki/Juggling
- KOF XIII Comboing (hedef kombo, sürücü ve süper iptali): https://srk.shib.live/w/The_King_of_Fighters_XIII/Comboing ; https://srk.shib.live/w/The_King_of_Fighters_XIII/Systems/Meter_Attacks:_Super_Cancels ; https://wiki.supercombo.gg/w/The_King_of_Fighters_XIII/Systems/Meter_Attacks:_Drive_Cancels
- KOF XIII blok iptali: https://srk.shib.live/w/The_King_of_Fighters_XIII/Systems/Defensive_Actions:_Guard_Cancel_Blowback
- KOF XV Rush (otomatik kombo): https://www.snk-corp.co.jp/webmanual/kofxv/en/howtoplay2.php ; https://www.thegamer.com/the-king-of-fighters-15-kofxv-start-tricks-tips/
- BlazBlue Revolver Action: https://dustloop.com/w/BBCP/Movement ; https://dustloop.com/w/BBCS2/Movement ; https://giantbomb.com/universal-chain-combo/3015-7542/
- BlazBlue hasar, sersemletme azalması, geçerli/geçersiz kombo: https://www.dustloop.com/w/BBCPE/Damage
- BlazBlue Smart Combo: https://www.blazblue.jp/tag/manual-ps4/en/action
- Guilty Gear Gatling tabloları: https://dustloop.com/w/GGReload/Movement ; https://www.dustloop.com/w/GGXRD-R2/Offense
- SF6 Modern kontroller ve otomatik kombo: https://destructoid.com/?p=386476 ; https://www.pcgamer.com/street-fighter-6s-modern-controls-are-the-accessibility-breakthrough-that-finally-let-me-compete-in-fighting-games
- Killer Instinct kombo kırıcı: https://ki.infil.net/combo.html ; Guilty Gear patlaması: https://www.gfinityesports.com/guilty-gear-strive/how-to-burst-in-guilty-gear-strive
- Hasar azalmasının önemi: https://superjumpmagazine.com/how-damage-scaling-holds-fighting-games-together
