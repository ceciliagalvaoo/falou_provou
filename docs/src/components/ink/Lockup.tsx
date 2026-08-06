import React from 'react';
import clsx from 'clsx';
import styles from './ink.module.css';

/**
 * The lockup: `falou` said quietly in the display face, and `PROVOU` in the
 * machine's own face with a stamp drawn round it, twice round, by hand, in
 * the same ink as the mark.
 *
 * It is deliberately not a filled block. Nothing in this system is filled;
 * emphasis is made with a drawn mark, the way somebody circles the line that
 * matters on a printed page.
 */
export default function Lockup({className}: {className?: string}): React.ReactElement {
  return (
    <span className={clsx(styles.lockup, className)}>
      <span className={styles.falou}>falou</span>
      <span className={styles.provou}>
        PROVOU
        <svg
          className={clsx(styles.seal, styles.draw)}
          viewBox="0 0 400 120"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <g stroke="currentColor" strokeLinecap="round" fill="none">
            <path
              d="M26 60C20 24 128 8 208 10C300 12 380 24 374 60C368 98 262 114 190 112C104 110 32 96 26 60"
              strokeWidth={5}
              strokeOpacity={0.85}
              pathLength={1}
            />
            <path
              d="M32 68C28 32 134 16 212 18C302 20 382 30 376 66C370 102 266 120 194 118C110 116 38 104 32 68"
              strokeWidth={2.6}
              strokeOpacity={0.45}
              pathLength={1}
            />
          </g>
        </svg>
      </span>
    </span>
  );
}
