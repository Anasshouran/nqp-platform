import { useMemo } from 'react';
import Box from '@mui/material/Box';

interface ParticleSpec {
  size: number;
  left: string;
  top: string;
  color: string;
  delay: number;
  duration: number;
  opacity: number;
}

interface ParticlesProps {
  count?: number;
  tint?: 'gold' | 'teal' | 'white';
}

const tintMap = {
  gold: '#c8a13a',
  teal: '#2bb8a0',
  white: 'rgba(255,255,255,0.55)',
};

const Particles = ({ count = 14, tint = 'white' }: ParticlesProps) => {
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.( '(prefers-reduced-motion: reduce)' ).matches === true,
    [],
  );

  const particles = useMemo<ParticleSpec[]>(
    () =>
      Array.from({ length: count }, (_, i) => {
        const color = i % 3 === 0 ? tintMap.gold : tintMap[tint];
        return {
          size: 4 + ((i * 37) % 14),
          left: `${(i * 67) % 100}%`,
          top: `${(i * 29) % 100}%`,
          color,
          delay: (i % 7) * 0.45,
          duration: 6 + (i % 5),
          opacity: 0.25 + ((i * 13) % 40) / 100,
        };
      }),
    [count, tint],
  );

  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        display: { xs: 'none', sm: 'block' },
      }}
    >
      {particles.map((p, i) => (
        <Box
          key={i}
          className="particle"
          sx={{
            width: p.size,
            height: p.size,
            left: p.left,
            top: p.top,
            background: p.color,
            boxShadow: `0 0 12px ${p.color}`,
            opacity: p.opacity,
            ...(reducedMotion
              ? { animation: 'none' }
              : { animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }),
          }}
        />
      ))}
    </Box>
  );
};

export default Particles;
