'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(localStorage.getItem('hc-cookie-notice') !== 'acknowledged');
  }, []);
  if (!visible) return null;
  return (
    <aside className="cookie-banner" aria-label="Çerez bildirimi">
      <div>
        <b>Çerez bildirimi</b>
        <p>
          Site işlevleri ve güvenli yönetici oturumu için yalnızca gerekli
          teknolojileri kullanıyoruz.
        </p>
        <Link href="/cerez-politikasi">Ayrıntıları inceleyin</Link>
      </div>
      <button
        onClick={() => {
          localStorage.setItem('hc-cookie-notice', 'acknowledged');
          setVisible(false);
        }}
      >
        Anladım
      </button>
    </aside>
  );
}
