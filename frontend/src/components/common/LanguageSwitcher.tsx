import { useTranslation } from 'react-i18next';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import LanguageIcon from '@mui/icons-material/Language';
import { useState } from 'react';

/**
 * مبدّل لغة بسيط (Phase 0 — i18n infrastructure).
 * يبدّل بين العربية والإنجليزية عبر i18next.
 */
const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  const change = (lng: string) => {
    i18n.changeLanguage(lng);
    setAnchor(null);
  };

  return (
    <>
      <Button
        size="small"
        startIcon={<LanguageIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ textTransform: 'none', fontWeight: 700 }}
      >
        {t('common.language')}
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => change('ar')}>{t('common.arabic')}</MenuItem>
        <MenuItem onClick={() => change('en')}>{t('common.english')}</MenuItem>
      </Menu>
    </>
  );
};

export default LanguageSwitcher;