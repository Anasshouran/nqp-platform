import ArticleIcon from '@mui/icons-material/Article';
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

  return (
    <SectorContentProvider value={{ sectorName, sectorSlug }}>
      <PageHeader
        eyebrow={eyebrow ?? 'نظام إدارة المحتوى'}
        title={`إدارة المحتوى — ${sectorName}`}
        subtitle={
          subtitle ??
          'أدر أخبار القطاع، التعاميم، الصفحات، الأسئلة الشائعة، الوثائق، الشرائح، الوسائط وإعدادات الاتصال.'
        }
      />
      <PageTabs
        variant="scrollable"
        keepMounted
        defaultTab={defaultTab}
        tabs={[
          { label: 'الأخبار', icon: <ArticleIcon />, panel: <RedSeaNewsPanel /> },
          { label: 'التعاميم', icon: <CampaignIcon />, panel: <RedSeaCircularsPanel /> },
          { label: 'الإعلانات', icon: <NotificationsActiveIcon />, panel: <AnnouncementsPanel /> },
          { label: 'الصفحات الثابتة', icon: <LibraryBooksIcon />, panel: <RedSeaPagesPanel /> },
          { label: 'الأسئلة الشائعة', icon: <LiveHelpIcon />, panel: <RedSeaFaqPanel /> },
          { label: 'الوثائق', icon: <DescriptionIcon />, panel: <RedSeaDocumentsPanel /> },
          { label: 'الشرائح الدعائية', icon: <ViewCarouselIcon />, panel: <RedSeaSlidersPanel /> },
          { label: 'مكتبة الوسائط', icon: <ImageIcon />, panel: <RedSeaMediaPanel /> },
          { label: 'الإعدادات', icon: <SettingsIcon />, panel: <RedSeaSettingsPanel /> },
        ]}
      />
    </SectorContentProvider>
  );
};

export default SectorContentPage;