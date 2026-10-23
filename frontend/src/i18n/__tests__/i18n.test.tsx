import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../index';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

describe('i18n Phase 0', () => {
  it('default language is Arabic', () => {
    expect(i18n.language).toBe('ar');
  });

  it('switch to English', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.language).toBe('en');
    await i18n.changeLanguage('ar');
  });

  it('translation returns correct string', () => {
    i18n.changeLanguage('ar');
    expect(i18n.t('common.save')).toBe('حفظ');
    i18n.changeLanguage('en');
    expect(i18n.t('common.save')).toBe('Save');
    i18n.changeLanguage('ar');
  });

  it('LanguageSwitcher renders', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LanguageSwitcher />
      </I18nextProvider>,
    );
    expect(screen.getByText('اللغة')).toBeTruthy();
  });
});