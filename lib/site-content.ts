export type CustomerGalleryItem = { url: string; alt: string };

export const defaultSiteContent = {
  branding: {
    logo: '/logo.png',
    favicon: '/favicon.svg',
    siteName: 'Honey Collection',
  },
  hero: {
    image: '/hero-honey-collection.webp',
    eyebrow: 'YENİ SEZON · 2026',
    titleBefore: 'Her davetin',
    titleAccent: 'kendine ait',
    titleAfter: 'bir ışıltısı var.',
    description: 'Kiralık, satılık ve kişiye özel abiye tasarımları.',
  },
  contact: {
    phone: '+90 212 000 00 00',
    phoneHref: '+902120000000',
    whatsapp: '902120000000',
    email: 'info@honeycollection.com',
    address: 'Honey Collection İstanbul',
    hours: 'Pazartesi–Cumartesi 10.00–19.00',
    mapsUrl: 'https://maps.google.com',
  },
  legal: {
    officialName: 'Honey Collection',
    dataController: 'Honey Collection',
    registeredAddress: 'Honey Collection İstanbul',
    contactEmail: 'info@honeycollection.com',
  },
  rentalContract: {
    text: `1. KONU VE ÜRÜN: Bu sözleşme, müşterinin seçtiği abiye ürününün belirtilen tarihler arasında kiralanmasına ilişkin teslim, kullanım ve iade esaslarını düzenler.

2. TESLİM VE İADE: Ürün, tarafların belirlediği tarihte teslim alınır ve iade tarihinde mağazaya eksiksiz olarak teslim edilir. Gecikme halinde mağazanın güncel gecikme koşulları uygulanır.

3. KULLANIM VE BAKIM: Müşteri ürünü özenle kullanmayı; üründe izinsiz tadilat, kesim, boyama veya temizleme işlemi yapmamayı kabul eder.

4. HASAR VE KAYIP: Olağan kullanım dışındaki yırtılma, kalıcı leke, yanık, aksesuar kaybı veya ürünün kullanılamaz hale gelmesi durumunda hasar tespit tutanağı düzenlenir.

5. İPTAL VE DEĞİŞİKLİK: İptal, tarih değişikliği ve ücret iadesi mağazanın müşteriye işlem öncesinde bildirdiği güncel kurallara tabidir.

6. KİŞİSEL VERİLER: Sözleşmede yer alan bilgiler, kiralama işleminin yürütülmesi, ispatı ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla işlenir.

7. ONAY: Müşteri ürün, tarih ve iletişim bilgilerinin doğru olduğunu; sözleşmeyi okuyup anladığını ve kendi iradesiyle onayladığını kabul eder.`,
  },
  faq: {
    eyebrow: 'MERAK EDİLENLER',
    title: 'Sıkça Sorulan Sorular',
    description: 'Kiralama, satış, prova ve özel dikim süreçleri hakkında kısa yanıtlar.',
    items: [
      { question: 'Randevu almadan mağazayı ziyaret edebilir miyim?', answer: 'En iyi hizmeti sunabilmek için mağaza ziyaretlerimiz randevuyla gerçekleşir.' },
      { question: 'Kiralama süresi ne kadar?', answer: 'Standart kiralama süresi teslim ve iade dahil dört gündür.' },
      { question: 'Her ürün satılık mı?', answer: 'Ürün sayfasında kiralık, satılık veya her ikisi bilgisi yer alır.' },
      { question: 'Prova yapılıyor mu?', answer: 'Evet. Randevunuzda beden ve gerekiyorsa tadilat provası yapılır.' },
      { question: 'Özel dikim ne kadar sürer?', answer: 'Tasarıma göre değişmekle birlikte ortalama 4–8 haftadır.' },
      { question: 'Fiyatları neden göremiyorum?', answer: 'Fiyat görünürlüğü ürün bazında yönetilir; güncel fiyat ve müsaitlik için bize ulaşabilirsiniz.' },
    ],
  },
  emailSettings: {
    fromName: 'Honey Collection',
    fromEmail: '',
    replyTo: '',
    notificationEmail: '',
    appointmentSubject: 'Randevunuz oluşturuldu · {{code}}',
    appointmentTemplate:
      'Merhaba {{firstName}},\n\n{{date}} tarihinde saat {{time}} için {{service}} randevunuz oluşturuldu.\nRandevu kodunuz: {{code}}\n\nDeğişiklik için {{phone}} numarasından bize ulaşabilirsiniz.',
    reminderSubject: 'Randevu hatırlatması · {{code}}',
    reminderTemplate:
      'Merhaba {{firstName}},\n\n{{date}} tarihinde saat {{time}} için {{service}} randevunuzu hatırlatmak isteriz.\nRandevu kodunuz: {{code}}\n\nSizi bekliyoruz.',
    contactReceiptSubject: 'Mesajınızı aldık',
    contactReceiptTemplate:
      'Merhaba {{name}},\n\nMesajınızı aldık. Ekibimiz en kısa sürede size dönüş yapacaktır.\n\nHoney Collection',
    rentalSubject: 'Kiralama talebiniz alındı · {{code}}',
    rentalTemplate:
      'Merhaba {{name}},\n\n{{product}} için {{startDate}} – {{endDate}} tarihleri arasındaki kiralama talebiniz ve sözleşmeniz alındı.\nSözleşme numaranız: {{code}}\n\nEkibimiz uygunluğu kontrol ederek sizinle iletişime geçecektir.',
  },
  social: {
    instagram: 'https://www.instagram.com/honeycollection34/',
    instagramUser: '@HONEYCOLLECTION34',
    facebook: '',
    tiktok: '',
  },
  footer: {
    description: 'Her davete, her stile ve her kadına özel abiye seçkileri.',
    copyright: '© 2026 Honey Collection',
  },
  home: {
    servicesEyebrow: 'HONEY COLLECTION DENEYİMİ',
    servicesTitle: 'Geceniz için üç özel yol.',
    featuredEyebrow: 'ÖZEL SEÇKİ',
    featuredTitle: 'Öne çıkan tasarımlar',
    appointmentEyebrow: 'RANDEVULU MAĞAZA DENEYİMİ',
    appointmentTitle: 'Zamanınız ve prova odanız yalnızca size ayrılsın.',
    appointmentText:
      'Mağaza ziyaretlerimiz kişisel ve sakin bir deneyim için randevuyla gerçekleşir.',
    instagramTitle: 'Bizi Instagram’da takip edin',
  },
  appointmentSettings: {
    times: ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30'],
  },
  customerGallery: {
    eyebrow: 'SİZDEN GELENLER',
    title: 'Müşteri\nMemnuniyeti',
    description:
      'Honey Collection ile gecesine eşlik ettiğimiz misafirlerimizden zarif anlar.',
    items: [] as CustomerGalleryItem[],
  },
  customTailoring: {
    heroEyebrow: 'HONEY ATÖLYE',
    heroTitle: 'Kişiye Özel Dikim',
    heroText: 'İlhamınızdan son provaya kadar size ait bir tasarım yolculuğu.',
    image:
      'https://marciafariafestas.com.br/wp-content/uploads/2020/01/modafesta1.jpg',
    sectionEyebrow: 'ATÖLYEDEN SİZE',
    sectionTitle: 'Bedeninize, stilinize ve gecenize özel.',
    step1Title: 'Tasarım görüşmesi',
    step1Text:
      'Her detay birlikte değerlendirilir ve tasarımınız kusursuzlaştırılır.',
    step2Title: 'Ölçü ve kumaş seçimi',
    step2Text:
      'Her detay birlikte değerlendirilir ve tasarımınız kusursuzlaştırılır.',
    step3Title: 'Prova süreci',
    step3Text:
      'Her detay birlikte değerlendirilir ve tasarımınız kusursuzlaştırılır.',
    step4Title: 'Özenli teslim',
    step4Text:
      'Her detay birlikte değerlendirilir ve tasarımınız kusursuzlaştırılır.',
    buttonText: 'Tasarım görüşmesi planla',
  },
};
export type SiteContent = typeof defaultSiteContent;
