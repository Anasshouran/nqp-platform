import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';

export interface CommandSectionDef {
  id: string;
  label: string;
  icon?: ReactElement;
}

/**
 * Tracks active section via IntersectionObserver and registers scroll anchors
 * for a command-center style section rail. Re-runs the observer whenever the
 * supplied deps change (e.g. loading state to catch late-mounted sections).
 */
export function useCommandSections(sections: CommandSectionDef[], deps: unknown[] = []) {
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const fnCache = useRef<Record<string, (el: HTMLElement | null) => void>>({});
  const [active, setActive] = useState<string>(sections[0]?.id ?? '');

  const register = useCallback((id: string) => {
    if (!fnCache.current[id]) {
      fnCache.current[id] = (el: HTMLElement | null) => {
        refs.current[id] = el;
      };
    }
    return fnCache.current[id];
  }, []);

  const scrollTo = useCallback((id: string) => {
    const el = refs.current[id];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const id = visible[0].target.getAttribute('data-section') || sections[0]?.id || '';
          setActive(id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    );
    Object.values(refs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { active, setActive, register, scrollTo };
}