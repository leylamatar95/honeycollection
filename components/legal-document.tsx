'use client';
import { SiteFooter, SiteHeader, PageHero } from '@/components/site-shell';
import { useSiteContent } from '@/lib/use-site-content';

export function LegalDocument({
  kind,
}: {
  kind: 'kvkk' | 'privacy' | 'cookies' | 'terms';
}) {
  const content = useSiteContent(),
    company = content.legal.officialName,
    controller = content.legal.dataController,
    address = content.legal.registeredAddress,
    email = content.legal.contactEmail;
  const documents = {
    kvkk: {
      eyebrow: 'YASAL BİLGİLENDİRME',
      title: 'KVKK Aydınlatma Metni',
      intro: `${controller}, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusudur.`,
      sections: [
        [
          'İşlenen kişisel veriler',
          'Randevu ve iletişim taleplerinde ad, soyad, telefon, e-posta, seçilen hizmet, tarih, saat ve iletilen mesaj; kiralama işlemlerinde sözleşme, ürün, teslim ve imza bilgileri işlenebilir.',
        ],
        [
          'İşleme amaçları ve hukuki sebepler',
          'Veriler; talebi ve sözleşmeyi yerine getirmek, iletişim kurmak, randevu teyidi ve hatırlatması göndermek, mağaza operasyonlarını yürütmek, hukuki yükümlülükleri yerine getirmek ve hakları korumak amaçlarıyla; sözleşmenin kurulması veya ifası, hukuki yükümlülük, meşru menfaat ve gerekli hâllerde açık rıza sebeplerine dayanılarak işlenir.',
        ],
        [
          'Aktarım ve saklama',
          'Veriler yalnızca hizmetin gerektirdiği ölçüde yetkili çalışanlara, altyapı/e-posta hizmet sağlayıcılarına ve kanunen yetkili mercilere aktarılabilir. Amaç ve yasal saklama süresi sona erdiğinde silinir, yok edilir veya anonimleştirilir.',
        ],
        [
          'Haklarınız',
          'KVKK’nın 11. maddesi kapsamında verilerinizin işlenip işlenmediğini öğrenme, bilgi isteme, amacına uygun kullanımını sorgulama, aktarılan kişileri bilme, düzeltme, silme veya yok etme isteme, otomatik sonuçlara itiraz etme ve zararınızın giderilmesini talep etme haklarına sahipsiniz.',
        ],
      ],
    },
    privacy: {
      eyebrow: 'GİZLİLİK',
      title: 'Gizlilik Politikası',
      intro: `${company}, ziyaretçi ve müşterilerinin gizliliğini korumayı taahhüt eder.`,
      sections: [
        [
          'Toplanan bilgiler',
          'Randevu, iletişim ve kiralama formlarında doğrudan verdiğiniz bilgiler ile güvenlik ve hizmet sürekliliği için gerekli teknik kayıtlar işlenebilir.',
        ],
        [
          'Bilgilerin kullanımı',
          'Bilgiler taleplerinizi yanıtlamak, hizmet sunmak, randevuları ve sözleşmeleri yönetmek, güvenliği sağlamak ve yasal yükümlülükleri yerine getirmek için kullanılır.',
        ],
        [
          'Paylaşım ve güvenlik',
          'Bilgiler satılmaz. Yalnızca gerekli hizmet sağlayıcıları ve yetkili mercilerle sınırlı biçimde paylaşılır; erişim kontrolü ve uygun teknik tedbirlerle korunur.',
        ],
        [
          'İletişim',
          'Gizlilik talepleriniz için aşağıdaki e-posta adresinden bize ulaşabilirsiniz.',
        ],
      ],
    },
    cookies: {
      eyebrow: 'ÇEREZLER',
      title: 'Çerez Politikası',
      intro:
        'Bu site, temel işlevlerin güvenli ve tutarlı çalışması için gerekli teknolojileri kullanır.',
      sections: [
        [
          'Gerekli teknolojiler',
          'Yönetici oturumunun güvenli biçimde sürdürülmesi ve çerez bildirimi tercihinizin bu cihazda hatırlanması için yerel depolama veya gerekli oturum bilgileri kullanılabilir.',
        ],
        [
          'Analiz ve reklam',
          'Şu anda reklam, davranışsal hedefleme veya zorunlu olmayan analiz çerezleri kullanılmamaktadır. İleride eklenirse bu politika güncellenecek ve gerektiğinde önceden onayınız alınacaktır.',
        ],
        [
          'Tercihinizi değiştirme',
          'Tarayıcı ayarlarınızdan depolanan site verilerini silebilirsiniz. Gerekli teknolojilerin engellenmesi yönetici girişi gibi bazı özellikleri etkileyebilir.',
        ],
      ],
    },
    terms: {
      eyebrow: 'KULLANIM',
      title: 'Kullanım Koşulları',
      intro: `Bu site ${company} tarafından sunulmaktadır. Siteyi kullanmanız aşağıdaki koşulları kabul ettiğiniz anlamına gelir.`,
      sections: [
        [
          'Site içeriği',
          'Ürün görselleri, fiyatlar, müsaitlik ve açıklamalar bilgilendirme amaçlıdır. Nihai hizmet ve kiralama şartları teyit ve ilgili sözleşmeyle kesinleşir.',
        ],
        [
          'Randevu ve talepler',
          'Doğru ve güncel bilgi vermeniz gerekir. Randevu oluşturulması ürün rezervasyonu veya satış işleminin tamamlandığı anlamına gelmez. Değişiklik için mağazayla iletişime geçebilirsiniz.',
        ],
        [
          'Fikri mülkiyet',
          'Sitedeki marka, metin, görsel ve tasarımlar hak sahibinin izni olmadan ticari amaçla kopyalanamaz veya kullanılamaz.',
        ],
        [
          'Sorumluluk ve güncellemeler',
          'Teknik kesinti veya üçüncü taraf hizmetlerinden kaynaklanan erişim sorunları oluşabilir. Koşullar gerektiğinde güncellenebilir; güncel metin bu sayfada yayımlanır.',
        ],
      ],
    },
  } as const;
  const doc = documents[kind];
  return (
    <>
      <SiteHeader />
      <PageHero eyebrow={doc.eyebrow} title={doc.title} text={doc.intro} />
      <main className="legal-page">
        <p>{doc.intro}</p>
        {doc.sections.map(([title, text]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
        <h2>Veri sorumlusu ve iletişim</h2>
        <div className="legal-contact">
          <strong>{controller}</strong>
          <span>{address}</span>
          <a href={`mailto:${email}`}>{email}</a>
          <a href={`tel:${content.contact.phoneHref}`}>
            {content.contact.phone}
          </a>
        </div>
        <p className="legal-note">Son güncelleme: 7 Eylül 2026</p>
      </main>
      <SiteFooter />
    </>
  );
}
