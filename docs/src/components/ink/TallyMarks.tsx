import React from 'react';
import clsx from 'clsx';
import styles from './ink.module.css';

/** Cell geometry: four uprights and a diagonal fifth, drawn by hand. */
const UPRIGHTS = [
  'M3 3C2 9 4 15 3 21',
  'M9 3C10 9 8 15 9.5 21',
  'M15 3C14.5 9.5 15.6 14 14.6 20.6',
  'M21 3C20 9 22 15 21 21',
];
const DIAGONAL = 'M1.5 20.5C8 17 18 10 26.5 4';

/**
 * Counted strokes. They only ever appear where something real is being
 * counted — three custody patterns, five user flows — never as decoration
 * for its own sake, because a mark that counts nothing is a lie in a project
 * about not claiming things you cannot show.
 */
export default function TallyMarks({
  count,
  label,
  className,
}: {
  /** How many marks are inked, 1 to 5. */
  count: number;
  /** Screen-reader text. Without it the marks are decorative. */
  label?: string;
  className?: string;
}): React.ReactElement {
  const inked = Math.max(0, Math.min(5, Math.floor(count)));
  const paths = inked === 5 ? [...UPRIGHTS, DIAGONAL] : UPRIGHTS.slice(0, inked);

  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={clsx(styles.tally, className)}
    >
      <svg viewBox="0 0 28 24" fill="none" focusable="false">
        <g stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" fill="none">
          {paths.map((d, i) => (
            <path key={i} d={d} strokeOpacity={0.88} />
          ))}
        </g>
      </svg>
    </span>
  );
}
