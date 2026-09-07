'use client';
import { useEffect, useState } from 'react';
import { defaultSiteContent, type SiteContent } from './site-content';

let cache: SiteContent | undefined;
export function useSiteContent() {
  const [data, setData] = useState<SiteContent>(defaultSiteContent);
  useEffect(() => {
    let active = true;
    if (cache) setData(cache);
    const refresh = () => fetch('/api/site-content', { cache: 'no-store' })
      .then((r) => r.json())
      .then((x) => {
        cache = x;
        if (active) setData(x);
      })
      .catch(() => {});
    refresh();
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return data;
}
