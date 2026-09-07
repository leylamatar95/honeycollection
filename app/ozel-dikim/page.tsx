'use client';
import Link from 'next/link';
import { SiteHeader, SiteFooter, PageHero } from '@/components/site-shell';
import { useSiteContent } from '@/lib/use-site-content';

export default function Page() {
  const { customTailoring: content } = useSiteContent();
  const steps = [1, 2, 3, 4].map(number => ({
    title: content[`step${number}Title` as keyof typeof content],
    text: content[`step${number}Text` as keyof typeof content],
  }));
  return <>
    <SiteHeader />
    <PageHero eyebrow={content.heroEyebrow} title={content.heroTitle} text={content.heroText} />
    <section className="atelier-page">
      <img src={content.image} alt={content.heroTitle} />
      <div>
        <p>{content.sectionEyebrow}</p>
        <h2>{content.sectionTitle}</h2>
        {steps.map((step, index) => <article key={index}>
          <b>0{index + 1}</b>
          <span><h3>{step.title}</h3><p>{step.text}</p></span>
        </article>)}
        <Link href="/randevu">{content.buttonText}</Link>
      </div>
    </section>
    <SiteFooter />
  </>;
}
