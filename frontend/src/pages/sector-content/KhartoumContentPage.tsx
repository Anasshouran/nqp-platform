import { useTranslation } from 'react-i18next';
import SectorContentPage from './SectorContentPage';

const KhartoumContentPage = () => {
  const { t } = useTranslation();
  return (
    <SectorContentPage
      sectorName={t('sector-content.khartoum.sectorName')}
      sectorSlug="khartoum"
      subtitle={t('sector-content.khartoum.subtitle')}
    />
  );
};

export default KhartoumContentPage;