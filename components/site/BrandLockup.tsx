/*
 * The brand, as artwork rather than as type.
 *
 * The header and footer used to draw the logo out of two spans: a circled "C"
 * in Georgia italic and the word "CostAnswer" with its second half tinted. That
 * was a stand-in, and it was a stand-in that drifted — the mark was cream-on-
 * ink in one place and lime-on-ink in the other, and neither matched the real
 * one. This ships the actual lockup, in the one pair of tones every dark and
 * light surface on the site draws from.
 *
 * Plain `<img>` with the file's own pixels declared, like the category art: the
 * Worker deploy has no image optimizer, and a logo whose intrinsic ratio is
 * stated cannot shift the header while it loads.
 */
export type BrandTone = 'ink' | 'reverse';

type BrandAsset = { readonly src: string; readonly width: number; readonly height: number };

/* Stored at 3x the 40px the header paints, so a retina tab is still sharp. */
const LOCKUP: Record<BrandTone, BrandAsset> = {
  ink: { src: '/brand/costanswer-lockup.png', width: 564, height: 120 },
  reverse: { src: '/brand/costanswer-lockup-light.png', width: 564, height: 120 },
};

type BrandImageProps = {
  /** `reverse` is the cream-and-sea-green pair, for the footer and other dark ground. */
  tone?: BrandTone;
  /** Empty whenever the surrounding link or heading already names the brand. */
  alt?: string;
  className?: string;
  /** The header's copy is in the first viewport; nothing else here is. */
  priority?: boolean;
};

function brandImage(asset: BrandAsset, base: string, { alt = '', className, priority = false }: BrandImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className ? `${base} ${className}` : base}
      src={asset.src}
      alt={alt}
      width={asset.width}
      height={asset.height}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      draggable={false}
      aria-hidden={alt ? undefined : true}
    />
  );
}

/** Mark and wordmark, side by side. The site's one brand signature. */
export function BrandLockup(props: BrandImageProps) {
  return brandImage(LOCKUP[props.tone ?? 'ink'], 'brand-lockup', props);
}
