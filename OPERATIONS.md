# Honey Collection işletim planı

## Her gün

- Ana sayfa, ürün listesi, randevu ve iletişim formu için çalışma kontrolü yapın.
- Başarısız API istekleri ve e-posta gönderim hataları için sunucu kayıtlarını izleyin.
- Yeni randevu ve iletişim bildirimlerinin admin paneline düştüğünü kontrol edin.

## Otomatik izleme

- Bir uptime hizmetinde ana sayfa ve `/api/site-content` için 5 dakikalık HTTPS kontrolü kurun.
- Hata takibi için istemci ve sunucu hatalarını yakalayan bir servis bağlayın; kişisel verileri hata içeriğine eklemeyin.
- Hatırlatma görevi `/api/cron/reminders` adresine 15 dakikada bir `Authorization: Bearer CRON_SECRET` başlığıyla POST göndermelidir.

## Yedekleme

- Supabase otomatik yedeklemeyi etkinleştirin. Paket desteklemiyorsa her gece şifreli veritabanı yedeği alın.
- `site-media` ve `rental-contracts` depolarını haftalık olarak ayrı, erişimi kısıtlı bir konuma kopyalayın.
- Aylık olarak bir yedeği test ortamına geri yükleyerek kullanılabilirliğini doğrulayın.
- Günlük yedekleri 14 gün, haftalık yedekleri 8 hafta, aylık yedekleri 12 ay saklayın.

## Güvenlik ve bakım

- Ayda bir bağımlılık güvenlik taraması ve güncelleme kontrolü yapın.
- Yönetici hesaplarında güçlü, benzersiz parola kullanın; ayrılan personelin erişimini aynı gün kaldırın.
- Service role, Resend ve cron anahtarlarını yalnızca sunucuda saklayın ve altı ayda bir yenileyin.
- KVKK kapsamındaki silme/düzeltme taleplerini kayıt altına alın ve yasal saklama süresine göre uygulayın.

## Olay durumunda

1. Etkilenen özelliği geçici olarak kapatın ve anahtar sızıntısı varsa anahtarları hemen yenileyin.
2. Sunucu, Supabase ve e-posta sağlayıcısı kayıtlarından zaman aralığını belirleyin.
3. Verinin etkilenip etkilenmediğini değerlendirin; gerekli yasal bildirimleri hukuk danışmanıyla yürütün.
4. Düzeltmeyi test ortamında doğrulayıp yayınlayın ve olay sonrası neden/önlem notu oluşturun.
