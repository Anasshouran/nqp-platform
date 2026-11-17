import { useTranslation } from 'react-i18next';
import SectorContentPage from '../../../sector-content/SectorContentPage';

const RedSeaContentPage = () => {
  const { t } = useTranslation();
  return (
    <SectorContentPage sectorName={t('redsea.portal.content.sectorName')} sectorSlug="red-sea" />
  );
};

export default RedSeaContentPage;