'use client';

import { useEffect, useRef, useState } from 'react';

const HERO_NOUNS = ['a house', 'a car', 'a mortgage', 'a paycheck', 'power', 'groceries', 'gas'] as const;
const HOLD_MS = 2200;
const SLIDE_MS = 380;

export function HeroHeadline() {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const headline = headlineRef.current;
    let onScreen = true;
    const visibility = headline
      ? new IntersectionObserver((entries) => {
        onScreen = entries[0]?.isIntersecting ?? false;
      }, { threshold: 0 })
      : null;
    if (headline) visibility?.observe(headline);

    const timer = window.setInterval(() => {
      if (!onScreen) return;
      const current = indexRef.current;
      const next = (current + 1) % HERO_NOUNS.length;
      indexRef.current = next;
      setPrevious(current);
      setIndex(next);
    }, HOLD_MS + SLIDE_MS);
    return () => {
      window.clearInterval(timer);
      visibility?.disconnect();
    };
  }, [reduceMotion]);

  useEffect(() => {
    if (previous == null) return undefined;
    const timer = window.setTimeout(() => setPrevious(null), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [previous]);

  const noun = HERO_NOUNS[index];
  const outgoing = previous == null ? null : HERO_NOUNS[previous];

  return (
    /*
      One sentence, with the noun swapping inside it.
      A screen-reader-only copy of the headline used to sit beside the animated
      one in the same <h1>. Assistive tech read the right thing, but anything
      reading raw text — crawlers, previews, extraction — saw both copies run
      together as a single doubled title. The stable name now comes from
      aria-label, so the heading holds exactly one readable sentence.
    */
    <h1 ref={headlineRef} aria-label="How much will it cost in the U.S.?">
      <span className="hero-headline">
        <span className="hero-kicker">How much will</span>
        <span className="hero-rotate" aria-hidden="true">
          {outgoing == null ? (
            <span className="hero-noun">{noun}</span>
          ) : (
            <span className="hero-rotate-pair">
              <span className="hero-noun">{outgoing}</span>
              <span className="hero-noun">{noun}</span>
            </span>
          )}
        </span>
        cost in the <em>U.S.?</em>
      </span>
    </h1>
  );
}
