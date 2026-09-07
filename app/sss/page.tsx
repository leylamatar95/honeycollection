'use client';

import { ChevronDown } from 'lucide-react';
import { PageHero, SiteFooter, SiteHeader } from '@/components/site-shell';
import { useSiteContent } from '@/lib/use-site-content';

export default function Page() {
  const content = useSiteContent();
  const faq = content.faq;
  return <><SiteHeader/><PageHero eyebrow={faq.eyebrow} title={faq.title} text={faq.description}/><section className="faq-page">{faq.items.map((item, index)=><details key={`${item.question}-${index}`}><summary>{item.question}<ChevronDown/></summary><p>{item.answer}</p></details>)}</section><SiteFooter/></>;
}
