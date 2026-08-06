import React from 'react';
import clsx from 'clsx';
import styles from './ink.module.css';

/**
 * The mark: a claw holding a proof seal, drawn as a handful of confident ink
 * strokes rather than as a filled icon. The claw is ZeroClaw. The seal is the
 * only thing in the product that can move an entry to PROVOU.
 *
 * It takes its colour from `currentColor`, so the same file serves the header,
 * the hero and a footnote without a second copy in a second colour.
 */
export default function Mark({
  size = 64,
  animate = true,
  title,
  className,
}: {
  size?: number | string;
  animate?: boolean;
  /** Give it a title when it carries meaning; otherwise it stays decorative. */
  title?: string;
  className?: string;
}): React.ReactElement {
  const px = typeof size === 'number' ? `${size}px` : size;

  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      className={clsx(animate && styles.draw, className)}
      style={{width: px, height: 'auto'}}
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M14 60C36 46 58 52 70 70" strokeWidth={9} strokeOpacity={0.82} pathLength={1} />
        <path d="M14 136C36 150 58 144 70 126" strokeWidth={9} strokeOpacity={0.82} pathLength={1} />
        <path
          d="M78 48C112 40 156 42 182 50C190 78 190 122 182 148C150 158 106 158 78 148C70 120 70 76 78 48Z"
          strokeWidth={8.5}
          pathLength={1}
        />
        <path d="M96 100C104 110 111 118 118 127C134 105 150 84 166 64" strokeWidth={11} pathLength={1} />
      </g>
    </svg>
  );
}
