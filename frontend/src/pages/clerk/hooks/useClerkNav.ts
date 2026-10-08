// Clerk dashboard navigation: URL-synced view state, responsive drawer/rail flags, chrome menus and the language toggle.
// Extracted from ClerkDashboardPage without behavioural change.
import { useCallback, useState, useEffect } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useSearchParams } from 'react-router-dom';

export const useClerkNav = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlView = searchParams.get('view') || 'home';
  const [activeView, setActiveViewState] = useState(urlView);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [newMenuAnchor, setNewMenuAnchor] = useState<null | HTMLElement>(null);
  const isDesktop = useMediaQuery('(min-width: 1000px)');
  const [lang, setLang] = useState<'AR' | 'EN'>('AR');
  const setActiveView = useCallback(
    (view: string) => {
      setActiveViewState(view);
      setSearchParams(view === 'home' ? {} : { view }, { replace: true });
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (urlView && urlView !== activeView) setActiveViewState(urlView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlView]);

  return { activeView, isDesktop, lang, mobileNavOpen, navCollapsed, newMenuAnchor, railOpen, setActiveView, setLang, setMobileNavOpen, setNavCollapsed, setNewMenuAnchor, setRailOpen, setUserMenuAnchor, userMenuAnchor };
};
