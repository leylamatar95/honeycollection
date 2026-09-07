# HoneyCollection

Premium abiye kiralama, satış, özel dikim ve randevu vitrini. Arayüz Türkçe, mobil öncelikli ve Supabase bağlantısına hazırdır.

## Kurulum

1. `npm install` ve ardından `npm run dev` çalıştırın.
2. Supabase'de yeni proje oluşturup `.env.example` dosyasını `.env.local` olarak kopyalayın ve anahtarları doldurun. Service role anahtarını yalnızca sunucu ortamında tutun.
3. Supabase SQL Editor içinde `supabase/migrations` klasöründeki SQL dosyalarını dosya adına göre eskiden yeniye sırayla çalıştırın. Mevcut kurulumda altı migration vardır:
   - `202609010001_initial.sql`
   - `202609010002_seed_booking.sql`
   - `202609010003_admin_platform.sql`
   - `202609020001_rental_contracts.sql`
   - `202609020002_product_catalog.sql`
   - `202609070001_security_contact.sql`
4. `stores` tablosuna mağazayı, `services` tablosuna hizmetleri ekleyin. Hizmet adları arayüzdeki adlarla eşleşmelidir.
5. Storage'da `product-media` adında public bucket oluşturun; yüklemeyi yalnızca yetkili yönetici rollerine açın. Görsel MIME tiplerini JPEG/PNG/WebP/AVIF, dosya boyutunu en fazla 12 MB ile sınırlandırın.

## Yönetici oluşturma

Supabase Authentication panelinden kullanıcı oluşturun; oluşan kimlikle `profiles` satırı ekleyin ve `user_roles` tablosunda `super_admin` rolü atayın. Kaynak koda şifre yazmayın. Üretimde RLS politikalarını yeni yönetim ekranlarına göre genişletmeden doğrudan tablo erişimi vermeyin.

## Güvenlik ve randevu

Randevu API'si Zod ile sunucuda doğrulanır ve yalnızca service-role üzerinden güvenli RPC çağırır. RPC, aynı mağaza/saat için transaction advisory lock kullanarak son kontenjan yarışını engeller. Supabase anahtarları yoksa form sahte başarı göstermez; kullanıcıya bağlantının hazır olmadığı açıkça bildirilir.

## Yayınlama

Bu proje hem Vercel'de hem de Node.js desteği açık Güzel Hosting Linux paketlerinde çalışır. API adresleri ve yönetim ekranı bulunduğu için yalnızca statik dosya olarak `public_html` klasörüne yüklenemez; hosting panelinde Node.js uygulaması olarak çalıştırılmalıdır.

### Vercel

1. Git deposunu Vercel'e bağlayın. Framework otomatik olarak Next.js seçilir; ayrıca build veya output ayarı girmeyin.
2. `.env.example` içindeki değişkenleri Vercel proje ayarlarına ekleyin. `NEXT_PUBLIC_SITE_URL` üretim alan adınızın `https://` ile başlayan tam adresi olmalıdır.
3. Yayınlamayı başlatın. `vercel.json`, randevu hatırlatma görevini 15 dakikada bir çağırır. Vercel'in bu isteği yetkilendirebilmesi için `CRON_SECRET` değerini en az 16 karakterlik rastgele bir anahtar olarak tanımlayın.

### Güzel Hosting (Linux / Node.js)

1. Pakette Node.js desteğinin açık olduğundan ve Node.js 20.9 veya daha yeni bir sürüm seçilebildiğinden emin olun.
2. Projeyi Git ile ya da arşiv halinde uygulama dizinine yükleyin; uygulama dizini `public_html` olmak zorunda değildir.
3. Panelde uygulama kökü olarak proje klasörünü, başlangıç dosyası olarak `server.cjs` dosyasını seçin. Kurulum komutu `npm ci`, derleme komutu `npm run build`, başlatma komutu destekleniyorsa `npm run start:hosting` olmalıdır.
4. `.env.example` içindeki değerleri panelin ortam değişkenleri bölümüne ekleyin ve uygulamayı yeniden başlatın.
5. Paneldeki Cron Jobs bölümünden `/api/cron/reminders` adresine 15 dakikada bir `Authorization: Bearer CRON_SECRET` başlığıyla GET veya POST isteği gönderin. Panel özel başlık ekleyemiyorsa bu çağrı için bir harici cron hizmeti kullanın.

E-posta gönderimi için Resend hesabınızda alan adını doğrulayın, `RESEND_API_KEY` değerini yalnızca sunucu ortamına ekleyin ve admin panelindeki Ayarlar bölümünden gönderen adresi ile şablonları doldurun. Ayrıntılı bakım planı için `OPERATIONS.md` dosyasına bakın.
