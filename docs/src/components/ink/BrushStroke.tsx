import React, {useId} from 'react';
import clsx from 'clsx';
import styles from './ink.module.css';

export type BrushVariant = 1 | 2 | 3 | 4;

type Layer = {d: string; width: number; opacity: number};

/**
 * Hand-painted turquoise strokes. Each is two or three offset paths at
 * descending opacity, displaced by a turbulence filter so the edges are never
 * mechanical: that layering is what reads as gouache rather than as a vector
 * line.
 *
 * Meant to be used large and asymmetric: hero corners, section rules, page
 * bleeds. Never small, never symmetrical, never as an icon.
 */
const VARIANTS: Record<BrushVariant, {viewBox: string; layers: Layer[]}> = {
  // 1, long wavy horizontal sweep. Dividers, section rules.
  1: {
    viewBox: '0 0 400 40',
    layers: [
      {d: 'M6 26C60 8 120 32 180 20S300 6 394 22', width: 7, opacity: 0.85},
      {d: 'M8 31C64 15 126 37 186 25S304 12 392 27', width: 4, opacity: 0.5},
      {d: 'M10 21C66 6 122 28 182 16S298 4 390 18', width: 2.2, opacity: 0.35},
    ],
  },
  // 2, short thick underline swash. Under headlines, beside eyebrows.
  2: {
    viewBox: '0 0 240 36',
    layers: [
      {d: 'M5 21C40 9 90 28 140 16S210 8 235 18', width: 9, opacity: 0.85},
      {d: 'M7 27C44 16 94 33 144 22S212 14 233 24', width: 4.5, opacity: 0.5},
    ],
  },
  // 3, big sweeping arc. Hero corners, page bleeds.
  3: {
    viewBox: '0 0 300 300',
    layers: [
      {d: 'M288 10C188 22 88 92 28 242', width: 8, opacity: 0.85},
      {d: 'M296 22C198 34 98 102 40 254', width: 4.5, opacity: 0.5},
      {d: 'M280 4C182 14 80 84 18 232', width: 2.4, opacity: 0.32},
    ],
  },
  // 4, wide double wave. Section tops, full-bleed footers.
  4: {
    viewBox: '0 0 500 90',
    layers: [
      {d: 'M6 40C80 8 150 66 230 42C310 18 380 74 494 40', width: 7, opacity: 0.85},
      {d: 'M6 54C82 24 152 80 232 56C312 32 382 86 494 54', width: 4, opacity: 0.5},
      {d: 'M8 28C84 0 154 56 234 32C314 8 384 62 492 28', width: 2.2, opacity: 0.32},
    ],
  },
};

export default function BrushStroke({
  variant = 1,
  className,
  animate = true,
  style,
}: {
  variant?: BrushVariant;
  className?: string;
  animate?: boolean;
  style?: React.CSSProperties;
}): React.ReactElement {
  const {viewBox, layers} = VARIANTS[variant];
  const filterId = `ink-${useId().replace(/:/g, '')}`;

  return (
    <svg
      viewBox={viewBox}
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={clsx(styles.stroke, animate && styles.draw, className)}
      style={style}
    >
      <defs>
        <filter id={filterId} x="-15%" y="-40%" width="130%" height="180%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.026"
            numOctaves="3"
            seed={variant * 7}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="3.4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>

      <g filter={`url(#${filterId})`} stroke="currentColor" strokeLinecap="round" fill="none">
        {layers.map((layer, i) => (
          <path
            key={i}
            d={layer.d}
            pathLength={1}
            strokeWidth={layer.width}
            strokeOpacity={layer.opacity}
          />
        ))}
      </g>
    </svg>
  );
}
