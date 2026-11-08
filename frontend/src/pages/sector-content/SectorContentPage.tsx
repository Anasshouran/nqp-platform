import ArticleIcon from '@mui/icons-material/Article';
import { useTranslation } from 'react-i18next';
import CampaignIcon from '@mui/icons-material/Campaign';
import DescriptionIcon from '@mui/icons-material/Description';
import LiveHelpIcon from '@mui/icons-material/LiveHelp';
import ImageIcon from '@mui/icons-material/Image';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import SettingsIcon from '@mui/icons-material/Settings';
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, PageTabs } from '../../components/uikit';
import RedSeaNewsPanel from '../redsea/portal/content/panels/RedSeaNewsPanel';
import RedSeaCircularsPanel from '../redsea/portal/content/panels/RedSeaCircularsPanel';
import RedSeaPagesPanel from '../redsea/portal/content/panels/RedSeaPagesPanel';
import RedSeaFaqPanel from '../redsea/portal/content/panels/RedSeaFaqPanel';
import RedSeaDocumentsPanel from '../redsea/portal/content/panels/RedSeaDocumentsPanel';
import RedSeaSlidersPanel from '../redsea/portal/content/panels/RedSeaSlidersPanel';
import RedSeaMediaPanel from '../redsea/portal/content/panels/RedSeaMediaPanel';
import RedSeaSettingsPanel from '../redsea/portal/content/panels/RedSeaSettingsPanel';
import AnnouncementsPanel from '../redsea/portal/content/panels/AnnouncementsPanel';
import { SectorContentProvider } from './sectorContentContext';

interface SectorContentPageProps {
  sectorName: string;
  sectorSlug: string;
  eyebrow?: string;
  subtitle?: string;
}

const TAB_KEYS = ['news', 'circulars', 'announcements', 'pages', 'faq', 'documents', 'sliders', 'media', 'settings'];

const SectorContentPage = ({ sectorName, sectorSlug, eyebrow, subtitle }: SectorContentPageProps) => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const defaultTab = TAB_KEYS.indexOf(tabParam ?? '') >= 0 ? TAB_KEYS.indexOf(tabParam!) : 0;
  const { t } = useTranslation();

  return (
    <SectorContentProvider value={{ sectorName, sectorSlug }}>
      <PageHeader
        eyebrow={eyebrow ?? t('sector-content.sectorContentPage.eyebrow')}
        title={`${t('sector-content.sectorContentPage.title')} — ${sectorName}`}
        subtitle={
          subtitle ??
          t('sector-content.sectorContentPage.subtitle')
        }
      />
      <PageTabs
        variant="scrollable"
        keepMounted
        defaultTab={defaultTab}
        tabs={[
          { label: t('sector-content.sectorContentPage.items.news'), icon: <ArticleIcon />, panel: <RedSeaNewsPanel /> },
          { label: t('sector-content.sectorContentPage.items.circulars'), icon: <CampaignIcon />, panel: <RedSeaCircularsPanel /> },
          { label: t('sector-content.sectorContentPage.items.announcements'), icon: <NotificationsActiveIcon />, panel: <AnnouncementsPanel /> },
          { label: t('sector-content.sectorContentPage.items.pages'), icon: <LibraryBooksIcon />, panel: <RedSeaPagesPanel /> },
          { label: t('sector-content.sectorContentPage.items.faq'), icon: <LiveHelpIcon />, panel: <RedSeaFaqPanel /> },
          { label: t('sector-content.sectorContentPage.items.documents'), icon: <DescriptionIcon />, panel: <RedSeaDocumentsPanel /> },
          { label: t('sector-content.sectorContentPage.items.sliders'), icon: <ViewCarouselIcon />, panel: <RedSeaSlidersPanel /> },
          { label: t('sector-content.sectorContentPage.items.media'), icon: <ImageIcon />, panel: <RedSeaMediaPanel /> },
          { label: t('sector-content.sectorContentPage.items.settings'), icon: <SettingsIcon />, panel: <RedSeaSettingsPanel /> },
        ]}
      />
    </SectorContentProvider>
  );
};

export default SectorContentPage;