import { useEffect } from 'react';

const DEFAULT_TITLE = 'عافيتنا | AFYATNA — منصة الحجر الصحي القومي';

export const usePageTitle = (title?: string) => {
  useEffect(() => {
    if (!title) {
      document.title = DEFAULT_TITLE;
      return;
    }
    document.title = `${title} — ${DEFAULT_TITLE}`;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);
};

export default usePageTitle;