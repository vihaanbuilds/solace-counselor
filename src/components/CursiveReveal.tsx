import { useLayoutEffect, useRef } from 'react';
import { CURSIVE_PATHS } from '../lib/cursivePaths.generated';

const DRAW_MS = 3200;
const FILL_MS = 900;

interface CursiveRevealProps {
  variant: 'solace';
  delaySeconds?: number;
  className?: string;
}

export function CursiveReveal({ variant, delaySeconds = 0, className = '' }: CursiveRevealProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const data = CURSIVE_PATHS[variant];

  useLayoutEffect(() => {
    const pathEl = pathRef.current;
    if (!pathEl || typeof pathEl.getTotalLength !== 'function') return;

    const length = pathEl.getTotalLength();
    pathEl.style.strokeDasharray = `${length}`;
    pathEl.style.strokeDashoffset = `${length}`;
    pathEl.style.fillOpacity = '0';

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      pathEl.style.strokeDashoffset = '0';
      pathEl.style.fillOpacity = '1';
      return;
    }

    const timeoutId = window.setTimeout(() => {
      pathEl.style.transition = `stroke-dashoffset ${DRAW_MS}ms ease-in-out, fill-opacity ${FILL_MS}ms ease-in ${
        DRAW_MS - 300
      }ms`;
      pathEl.style.strokeDashoffset = '0';
      pathEl.style.fillOpacity = '1';
    }, delaySeconds * 1000);

    return () => window.clearTimeout(timeoutId);
  }, [delaySeconds]);

  return (
    <span className={`cursive-reveal ${className}`}>
      <svg viewBox={data.viewBox} className="cursive-reveal-svg" role="img" aria-label={data.text}>
        <path ref={pathRef} d={data.d} className="cursive-reveal-path" />
      </svg>
    </span>
  );
}
