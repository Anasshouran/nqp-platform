import { useTranslation } from 'react-i18next';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Outlet, NavLink, Link, useLocation, useNavigationType } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Collapse from '@mui/material/Collapse';
import useScrollTrigger from '@mui/material/useScrollTrigger';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import LoginIcon from '@mui/icons-material/Login';
import PublicIcon from '@mui/icons-material/Public';
import SearchIcon from '@mui/icons-material/Search';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CampaignIcon from '@mui/icons-material/Campaign';
import BrandLogo from '../common/BrandLogo';
import LanguageSwitcher from '../common/LanguageSwitcher';
import BackToTop from '../common/BackToTop';
import AssistantFab from '../AssistantFab';
import GlobalSearchPalette, { openGlobalSearch } from '../search/GlobalSearchPalette';
import { getSectors, getNotices, getPorts } from '../../api/endpoints/public';
import type { Sector, HealthNotice, PublicPort } from '../../api/endpoints/public';
import { isCmsSector, sectorDashboardRoute } from '../../config/cmsSectors';

interface NavItem {
  label: string;
  path: string;
  /** مسار بديل يستخدم للتنقل عند الاختلاف عن path (مثل: /ports?type=AIRPORT) */
  to?: string;
  /** رأس مجموعة داخل القوائم المنسدلة متعددة المستويات (عنصر غير قابل للنقر) */
  section?: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: 'public.layout.nav.home', path: '/' },
  {
    label: 'public.layout.nav.services',
    path: '/services',
    children: [
      { label: 'public.layout.nav.menu.services.catalog', path: '/services', section: 'public.layout.nav.menu.services.section.actions' },
      { label: 'public.layout.nav.menu.services.travelers', path: '/services/travelers', section: 'public.layout.nav.menu.services.section.actions' },
      { label: 'public.layout.nav.menu.services.foodSafety', path: '/services/food-safety', section: 'public.layout.nav.menu.services.section.actions' },
      { label: 'public.layout.nav.menu.services.preRegister', path: '/traveler/register', section: 'public.layout.nav.menu.services.section.actions' },
      { label: 'public.layout.nav.menu.services.travelerPortal', path: '/traveler/dashboard', section: 'public.layout.nav.menu.services.section.platforms' },
      { label: 'public.layout.nav.menu.services.companiesPortal', path: '/partners', section: 'public.layout.nav.menu.services.section.platforms' },
      { label: 'public.layout.nav.menu.services.verify', path: '/verify', section: 'public.layout.nav.menu.services.section.tools' },
      { label: 'public.layout.nav.menu.services.smartServices', path: '/services/tools', section: 'public.layout.nav.menu.services.section.tools' },
      { label: 'public.layout.nav.menu.services.assistant', path: '/services/assistant', section: 'public.layout.nav.menu.services.section.tools' },
    ],
  },
  {
    label: 'public.layout.nav.travelers',
    path: '/travel-requirements',
    children: [
      { label: 'public.layout.nav.menu.travelers.travelRequirements', path: '/travel-requirements', section: 'public.layout.nav.menu.travelers.section.preparation' },
      { label: 'public.layout.nav.menu.travelers.preRegister', path: '/traveler/register', section: 'public.layout.nav.menu.travelers.section.preparation' },
      { label: 'public.layout.nav.menu.travelers.trackApplication', path: '/traveler/tracking', section: 'public.layout.nav.menu.travelers.section.preparation' },
      { label: 'public.layout.nav.menu.travelers.diseaseGuide', path: '/diseases', section: 'public.layout.nav.menu.travelers.section.knowledge' },
      { label: 'public.layout.nav.menu.travelers.verify', path: '/verify', section: 'public.layout.nav.menu.travelers.section.knowledge' },
    ],
  },
  {
    label: 'public.layout.nav.entryPoints',
    path: '/ports',
    children: [
      { label: 'جميع المنافذ', path: '/ports', section: 'شبكة المنافذ' },
    ],
  },
  {
    label: 'public.layout.nav.gateways',
    path: '/gateways',
    children: [
      { label: 'public.layout.nav.menu.gateways.traveler', path: '/traveler/login', section: 'public.layout.nav.menu.gateways.section.forTravelers' },
      { label: 'public.layout.nav.menu.gateways.verify', path: '/verify', section: 'public.layout.nav.menu.gateways.section.forTravelers' },
      { label: 'public.layout.nav.menu.gateways.sectorsPortal', path: '/gateways', to: '/gateways#sectors', section: 'public.layout.nav.menu.gateways.section.sectorsAndPorts' },
      { label: 'public.layout.nav.menu.gateways.portsGateway', path: '/gateways', to: '/gateways#ports', section: 'public.layout.nav.menu.gateways.section.sectorsAndPorts' },
      { label: 'public.layout.nav.menu.gateways.airlines', path: '/app/carrier', section: 'public.layout.nav.menu.gateways.section.sectorsAndPorts' },
      { label: 'public.layout.nav.menu.gateways.shippingCompanies', path: '/app/food-ops', section: 'public.layout.nav.menu.gateways.section.sectorsAndPorts' },
      { label: 'public.layout.nav.menu.gateways.clinics', path: '/app/clinic', section: 'public.layout.nav.menu.gateways.section.healthAdmin' },
      { label: 'public.layout.nav.menu.gateways.laboratories', path: '/app/laboratory', section: 'public.layout.nav.menu.gateways.section.healthAdmin' },
      { label: 'public.layout.nav.menu.gateways.surveillance', path: '/app/surveillance', section: 'public.layout.nav.menu.gateways.section.healthAdmin' },
      { label: 'public.layout.nav.menu.gateways.foodControl', path: '/app/food', section: 'public.layout.nav.menu.gateways.section.healthAdmin' },
      { label: 'public.layout.nav.menu.gateways.vectorControl', path: '/app/vector-control', section: 'public.layout.nav.menu.gateways.section.healthAdmin' },
      { label: 'public.layout.nav.menu.gateways.vaccination', path: '/app/vaccination', section: 'public.layout.nav.menu.gateways.section.healthAdmin' },
      { label: 'public.layout.nav.menu.gateways.partners', path: '/partners', section: 'public.layout.nav.menu.gateways.section.healthAdmin' },
    ],
  },
{
    label: 'public.layout.nav.news',
    path: '/news',
    children: [
      { label: 'public.layout.nav.menu.news.all', path: '/news' },
      { label: 'public.layout.nav.menu.news.healthNotices', path: '/notices' },
      { label: 'public.layout.nav.menu.news.circulars', path: '/circulars' },
    ],
  },
  { label: 'public.layout.nav.documents', path: '/documents' },
  {
    label: 'public.layout.nav.diseases',
    path: '/diseases',
    children: [
      { label: 'public.layout.nav.menu.diseases.guide', path: '/diseases', section: 'public.layout.nav.menu.diseases.section.knowledge' },
      { label: 'public.layout.nav.menu.diseases.healthNotices', path: '/notices', section: 'public.layout.nav.menu.diseases.section.knowledge' },
      { label: 'public.layout.nav.menu.diseases.circulars', path: '/circulars', section: 'public.layout.nav.menu.diseases.section.knowledge' },
    ],
  },
  {
    label: 'public.layout.nav.about',
    path: '/about',
    children: [
      { label: 'public.layout.nav.menu.about.aboutUs', path: '/about', section: 'public.layout.nav.menu.about.section.platform' },
      { label: 'public.layout.nav.menu.about.director', path: '/director', section: 'public.layout.nav.menu.about.section.platform' },
      { label: 'public.layout.nav.menu.about.faq', path: '/faq', section: 'public.layout.nav.menu.about.section.support' },
      { label: 'public.layout.nav.menu.about.contact', path: '/contact', section: 'public.layout.nav.menu.about.section.support' },
    ],
  },
];

const PORT_TYPE_SECTION: Record<PublicPort['type'], string> = {
  AIRPORT: 'public.layout.portType.airport',
  SEAPORT: 'public.layout.portType.seaport',
  LAND_PORT: 'public.layout.portType.land',
};

const UI_STRINGS: Record<string, string> = {
  'وزارة الصحة الاتحادية': 'Federal Ministry of Health',
  'الإدارة العامة للطوارئ الصحية ومكافحة الأوبئة': 'General Directorate of Health Emergencies & Epidemic Control',
  'الرئيسية': 'Home',
  'الخدمات': 'Services',
  'السفر': 'Travel',
  'المنافذ': 'Ports',
  'الأخبار': 'News',
  'الوثائق': 'Documents',
  'كتالوج الخدمات': 'Service Catalog',
  'خدمات المسافرين': 'Traveler Services',
  'سلامة الأغذية': 'Food Safety',
  'التسجيل المسبق': 'Pre-Registration',
  'بوابة المسافرين': 'Traveler Portal',
  'بوابة الشركات': 'Companies Portal',
  'التحقق من الشهادات': 'Certificate Verification',
  'الخدمات الذكية': 'Smart Services',
  'المساعد الذكي': 'Smart Assistant',
  'الإجراءات': 'Procedures',
  'المنصات': 'Portals',
  'الأدوات': 'Tools',
  'متطلبات السفر': 'Travel Requirements',
  'متابعة الطلب': 'Track Application',
  'دليل الأمراض': 'Disease Guide',
  'الاستعداد للسفر': 'Preparing to Travel',
  'المعرفة': 'Knowledge',
  'جميع المنافذ': 'All Ports',
  'بوابة المنافذ': 'Ports Gateway',
  'شبكة المنافذ': 'Ports Network',
  'المطارات': 'Airports',
  'الموانئ': 'Seaports',
  'المعابر البرية': 'Land Crossings',
  'التنبيهات الصحية': 'Health Alerts',
  'التعاميم': 'Circulars',
  'تسجيل الدخول': 'Sign In',
  'تخطي إلى المحتوى الرئيسي': 'Skip to main content',
  'سجّل الآن': 'Register Now',
  'تفاصيل التنبيه': 'Alert Details',
  'قائمة التنقل': 'Navigation menu',
  'فتح القائمة': 'Open menu',
  'إغلاق القائمة': 'Close menu',
  'البحث الشامل': 'Global search',
  'حساب المستخدم': 'User account',
  'روابط مهمة': 'Important Links',
  'دولي': 'International',
  'تواصل معنا': 'Contact Us',
  'رئيسية': 'Home',
  'المنافذ الصحية': 'Health Ports',
  'نقاط الدخول': 'Entry Points',
  'المسافرون': 'Travelers',
  'بوابات المنصة': 'Platform Gateways',
  'البوابات': 'Gateways',
  'للمسافرين': 'Travelers',
  'القطاعات والمنافذ': 'Sectors & Ports',
  'الإدارة الصحية': 'Health Administration',
  'بوابة المسافر': 'Traveler Portal',
  'بوابة القطاعات': 'Sectors Portal',
  'بوابة شركات الطيران': 'Airlines Portal',
  'بوابة شركات الشحن والموانئ': 'Shipping & Port Companies Portal',
  'بوابة العيادات': 'Clinics Portal',
  'بوابة المختبرات': 'Laboratories Portal',
  'بوابة الترصد': 'Surveillance Portal',
  'بوابة رقابة الأغذية': 'Food Control Portal',
  'بوابة مكافحة النواقل': 'Vector Control Portal',
  'بوابة التطعيم الدولي': 'International Vaccination Portal',
  'بوابة المنظمات والشركاء': 'Partners Portal',
  'الأمراض والإرشادات': 'Diseases & Guidelines',
  'الأمراض والأوبئة': 'Diseases & Epidemics',
  'دليل الأمراض والإرشادات': 'Disease & Guidelines Guide',
  'المعرفة الصحية': 'Health Knowledge',
  'الأسئلة الشائعة': 'FAQ',
  'المؤشرات العامة': 'Indicators',
  'حول': 'About',
  'من نحن': 'About Us',
  'مدير المنصة': 'Platform Director',
  'اتصل بنا': 'Contact Us',
  'المنصة': 'Platform',
  'الدعم': 'Support',
  'الخصوصية': 'Privacy Policy',
  'الشروط والأحكام': 'Terms & Conditions',
};

const externalLinks = [
  { label: 'public.layout.externalLinks.moh', href: 'https://fmoh.gov.sd' },
  { label: 'public.layout.externalLinks.who', href: 'https://www.who.int' },
  { label: 'public.layout.externalLinks.ihr', href: 'https://www.who.int/health-topics/international-health-regulations' },
];

const footerLinkGroups = [
  {
    title: 'public.layout.footer.group.important',
    links: [
      { label: 'public.layout.footer.link.home', path: '/' },
      { label: 'public.layout.footer.link.serviceCatalog', path: '/services' },
      { label: 'public.layout.footer.link.travelRequirements', path: '/travel-requirements' },
      { label: 'public.layout.footer.link.healthPorts', path: '/ports' },
      { label: 'public.layout.footer.link.indicators', path: '/indicators' },
      { label: 'public.layout.footer.link.platformGateways', path: '/gateways' },
      { label: 'public.layout.footer.link.documents', path: '/documents' },
    ],
  },
  {
    title: 'public.layout.footer.group.services',
    links: [
      { label: 'public.layout.footer.link.verify', path: '/verify' },
      { label: 'public.layout.footer.link.smartServices', path: '/services/tools' },
      { label: 'public.layout.footer.link.travelerPortal', path: '/traveler/dashboard' },
      { label: 'public.layout.footer.link.companiesPortal', path: '/partners' },
      { label: 'public.layout.footer.link.preRegister', path: '/traveler/register' },
    ],
  },
  {
    title: 'public.layout.footer.group.knowledge',
    links: [
      { label: 'public.layout.footer.link.healthAlerts', path: '/notices' },
      { label: 'public.layout.footer.link.news', path: '/news' },
      { label: 'public.layout.footer.link.circulars', path: '/circulars' },
      { label: 'public.layout.footer.link.documents', path: '/documents' },
      { label: 'public.layout.footer.link.diseasesGuidelines', path: '/diseases' },
      { label: 'public.layout.footer.link.faq', path: '/faq' },
    ],
  },
];

const sectorNavItems = (slug: string): NavItem[] => [
  { label: 'public.layout.sectorNav.home', path: `/sector/${slug}` },
  {
    label: 'public.layout.sectorNav.about',
    path: `/sector/${slug}/about`,
    children: [
      { label: 'public.layout.sectorNav.aboutUs', path: `/sector/${slug}/about` },
      { label: 'public.layout.sectorNav.director', path: `/sector/${slug}/director` },
      { label: 'public.layout.sectorNav.ports', path: `/sector/${slug}/ports` },
      { label: 'public.layout.sectorNav.documentsCenter', path: `/sector/${slug}/documents` },
      { label: 'public.layout.sectorNav.faq', path: `/sector/${slug}/faq` },
      { label: 'public.layout.sectorNav.contact', path: `/sector/${slug}/contact` },
    ],
  },
  {
    label: 'public.layout.sectorNav.services',
    path: `/sector/${slug}/services`,
    children: [
      { label: 'public.layout.sectorNav.serviceCatalog', path: `/sector/${slug}/services` },
      { label: 'public.layout.sectorNav.foodSafety', path: `/sector/${slug}/services/food-safety` },
      { label: 'public.layout.sectorNav.vectorControl', path: `/sector/${slug}/services/vector-control` },
      { label: 'public.layout.sectorNav.entryExitRequirements', path: `/sector/${slug}/travel-requirements` },
    ],
  },
  {
    label: 'public.layout.sectorNav.alertsNews',
    path: `/sector/${slug}/news`,
    children: [
      { label: 'public.layout.sectorNav.news', path: `/sector/${slug}/news` },
      { label: 'public.layout.sectorNav.circulars', path: `/sector/${slug}/circulars` },
    ],
  },
];

const PublicLayout = () => {
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuState, setMenuState] = useState<{ anchor: HTMLElement; children: NavItem[] } | null>(null);
  const [drawerOpenItem, setDrawerOpenItem] = useState<string | null>(null);
  const [bannerOpen, setBannerOpen] = useState(
    () => sessionStorage.getItem('nqp_banner_dismissed') !== '1'
  );
  const [urgentNotice, setUrgentNotice] = useState<HealthNotice | null>(null);
  const [lang, setLang] = useState<'ar' | 'en'>(() =>
    i18n.language === 'en' ? 'en' : 'ar',
  );
  const tl = (ar?: string) => (lang === 'ar' ? (ar ?? '') : ar ? UI_STRINGS[ar] ?? ar : '');
  // Transitional: keys via t(), remaining Arabic via tl() until 1a.6
  const tt = (label?: string) => (label && label.startsWith('public.') ? t(label) : tl(label));
  const location = useLocation();
  const navigationType = useNavigationType();
  const scrolled = useScrollTrigger({ disableHysteresis: true, threshold: 24 });

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    const l = i18n.language === 'ar' ? 'ar' : 'en';
    if (l !== lang) setLang(l);
  }, [i18n.language, lang]);

  const pathSlug = location.pathname.match(/^\/sector\/([^/]+)(?:\/|$)/)?.[1] ?? null;
  const cmsSlug = isCmsSector(pathSlug ?? undefined) ? pathSlug : null;
  const dashboardRoute = sectorDashboardRoute(cmsSlug ?? undefined);
  const loginLink = dashboardRoute ? `/login?next=${dashboardRoute}` : '/login';
  const [activeSector, setActiveSector] = useState<Sector | null>(null);
  const [ports, setPorts] = useState<PublicPort[]>([]);

  useEffect(() => {
    if (cmsSlug) return;
    let mounted = true;
    getPorts()
      .then((res) => {
        if (mounted) setPorts(res.data.data ?? []);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [cmsSlug]);

  useEffect(() => {
    if (!cmsSlug) {
      setActiveSector(null);
      return;
    }
    let mounted = true;
    getSectors()
      .then((res) => {
        const found = (res.data.data ?? []).find((s) => s.slug === cmsSlug);
        if (mounted) setActiveSector(found ?? null);
      })
      .catch(() => {
        if (mounted) setActiveSector(null);
      });
    return () => {
      mounted = false;
    };
  }, [cmsSlug]);

  useEffect(() => {
    let mounted = true;
    getNotices()
      .then((res) => {
        if (!mounted) return;
        const active = (res.data.data ?? []).filter(
          (n) => !n.expiry_date || new Date(n.expiry_date).getTime() > Date.now(),
        );
        setUrgentNotice(active.find((n) => n.priority === 'HIGH') ?? active[0] ?? null);
      })
      .catch(() => {
        if (mounted) setUrgentNotice(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const orgLabel = cmsSlug && activeSector ? `الحجر الصحي القومي - ${activeSector.name_ar}` : 'الحجر الصحي القومي - جمهورية السودان';

  const activeNavItems = useMemo(() => {
    if (cmsSlug) return sectorNavItems(cmsSlug);
    const portChildren: NavItem[] = [
      { label: 'جميع المنافذ', path: '/ports', section: 'شبكة المنافذ' },
      ...(['AIRPORT', 'SEAPORT', 'LAND_PORT'] as PublicPort['type'][]).flatMap((type) =>
        ports
          .filter((p) => p.is_active && p.type === type)
          .map((p) => ({ label: p.name_ar, path: `/ports/${p.id}`, section: PORT_TYPE_SECTION[type] })),
      ),
    ];
    return navItems.map((item) => (item.path === '/ports' ? { ...item, children: portChildren } : item));
  }, [cmsSlug, ports]);

  const dismissBanner = () => {
    setBannerOpen(false);
    sessionStorage.setItem('nqp_banner_dismissed', '1');
  };

  useEffect(() => {
    setMobileOpen(false);
    setMenuState(null);
    setDrawerOpenItem(null);
    if (navigationType !== 'POP') window.scrollTo({ top: 0 });
  }, [location.pathname, navigationType]);

  const closeMobile = () => setMobileOpen(false);

  const servicesActive =
    location.pathname.startsWith('/services') ||
    (location.pathname.startsWith('/sector/') &&
      (location.pathname.includes('/services') || location.pathname.endsWith('/travel-requirements'))) ||
    location.pathname === '/travel-requirements' ||
    location.pathname === '/faq' ||
    location.pathname === '/traveler/register' ||
    location.pathname === '/traveler/dashboard';

  const isNavItemActive = (item: NavItem) => {
    if (!item.children) return false;
    const current = location.pathname;
    return item.children.some(
      (c) => c.path === current || (current.startsWith(c.path) && c.path !== '/'),
    );
  };

  const renderNavButton = (item: NavItem) => {
    const active = isNavItemActive(item) || (item.children && servicesActive && item.label === 'public.layout.nav.services');
    return item.children ? (
      <Button
        key={item.label}
        onClick={(e) => setMenuState({ anchor: e.currentTarget, children: item.children ?? [] })}
        aria-haspopup="true"
        aria-expanded={Boolean(menuState)}
        sx={{
          borderRadius: 10,
          px: 1.5,
          py: 0.8,
          color: active ? 'primary.main' : 'text.primary',
          fontWeight: 700,
          bgcolor: active ? 'primary.light' : 'transparent',
          '&:hover': { bgcolor: 'primary.lighter' },
        }}
        endIcon={<ExpandMoreIcon />}
      >
        {t(item.label)}
      </Button>
    ) : (
      <Button
        key={item.path}
        component={NavLink}
        to={item.path}
        end={item.path === '/'}
        sx={{
          borderRadius: 10,
          px: 1.5,
          py: 0.8,
          color: 'text.primary',
          fontWeight: 700,
          '&.active': { bgcolor: 'primary.light', color: 'primary.dark' },
          '&:hover': { bgcolor: 'primary.lighter' },
        }}
      >
        {t(item.label)}
      </Button>
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <a href="#main-content" className="skip-link">
        {t('public.layout.body.skipToContent')}
      </a>

      {/* Top utility bar (ministry + directorate merged) */}
      <Box sx={{ bgcolor: 'primary.darker', color: '#fff' }}>
        <Container maxWidth="lg">
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ minHeight: 42, py: 0.6, gap: 1 }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  minWidth: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {cmsSlug ? orgLabel : t('public.layout.externalLinks.moh')}
              </Typography>
              {!cmsSlug && (
                <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.6)' }} />
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 600, opacity: 0.95, whiteSpace: 'nowrap' }}
                  >
                    {t('public.layout.body.emergencyAdmin')}
                  </Typography>
                </Box>
              )}
            </Stack>

          </Stack>
        </Container>
      </Box>

      {/* Main nav */}
      <AppBar
        position="sticky"
        elevation={scrolled ? 3 : 0}
        color="inherit"
        sx={{
          bgcolor: scrolled ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid',
          borderColor: scrolled ? 'divider' : 'transparent',
          color: 'text.primary',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar
            sx={{
              justifyContent: 'space-between',
              px: { xs: 0, sm: 2 },
              gap: 1,
              minHeight: scrolled ? 54 : 74,
              transition: 'min-height 320ms cubic-bezier(0.22,1,0.36,1)',
              '@media (min-width:600px)': { minHeight: scrolled ? 54 : 74 },
            }}
          >
            <Link to={cmsSlug ? `/sector/${cmsSlug}` : '/'} aria-label={t('public.layout.body.homepage')} style={{ textDecoration: 'none', color: 'inherit' }}>
              <BrandLogo
                compact
                product="afyatna"
                sx={{
                  '& .MuiSvgIcon-root': { fontSize: scrolled ? 20 : 25, transition: 'font-size 320ms ease' },
                  '& > div': { width: scrolled ? 38 : 46, height: scrolled ? 38 : 46, transition: 'width 320ms ease, height 320ms ease' },
                }}
              />
            </Link>

            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5 }}>
              {activeNavItems.map(renderNavButton)}
            </Box>

            <Menu
              anchorEl={menuState?.anchor}
              open={Boolean(menuState)}
              onClose={() => setMenuState(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{ paper: { sx: { mt: 1, borderRadius: 3, minWidth: 200 }, 'aria-label': lang === 'ar' ? t('public.layout.body.navigationMenu') : 'Navigation menu' } }}
            >
              {menuState?.children.map((child, i) => {
                const prev = i > 0 ? menuState?.children?.[i - 1] : undefined;
                const showSection = !!child.section && child.section !== prev?.section;
                return (
                  <Fragment key={child.path ?? child.label}>
                    {showSection && (
                      <Box sx={{ px: 2, pt: i > 0 ? 0.75 : 1, pb: 0.25 }}>
                        {i > 0 && <Divider sx={{ mb: 1 }} />}
                        <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: 0 }}>
                          {tt(child.section)}
                        </Typography>
                      </Box>
                    )}
                    <MenuItem
                      component={Link}
                      to={child.to ?? child.path}
                      onClick={() => setMenuState(null)}
                      selected={location.pathname === child.path}
                      sx={{ fontWeight: 700 }}
                    >
                      {tt(child.label)}
                    </MenuItem>
                  </Fragment>
                );
              })}
            </Menu>

            <Stack direction="row" spacing={1} alignItems="center">
              <LanguageSwitcher />
              <IconButton
                aria-label={lang === 'ar' ? t('public.layout.body.globalSearch') : 'Global search'}
                onClick={openGlobalSearch}
                sx={{ color: 'text.secondary' }}
              >
                <SearchIcon />
              </IconButton>
              <Button
                component={Link}
                to={loginLink}
                variant="contained"
                size="small"
                startIcon={<LoginIcon sx={{ fontSize: 18 }} />}
                sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
              >
                {t('public.layout.body.signIn')}
              </Button>
              <IconButton
                component={Link}
                to={loginLink}
                aria-label={lang === 'ar' ? t('public.layout.body.userAccount') : 'User account'}
                sx={{ display: { xs: 'inline-flex', sm: 'none' }, color: 'primary.main' }}
              >
                <AccountCircleIcon />
              </IconButton>
              <IconButton
                aria-label={lang === 'ar' ? t('public.layout.body.openMenu') : 'Open menu'}
                edge="end"
                onClick={() => setMobileOpen(true)}
                sx={{ display: { md: 'none' }, color: 'primary.main' }}
              >
                <MenuIcon />
              </IconButton>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Announcement banner */}
      {bannerOpen && (
        <Box
          className="banner-slide gradient_shift"
          sx={{
            background: 'linear-gradient(90deg, #075e4d, #0a6b58, #0c7f6a)',
            color: '#fff',
          }}
        >
          <Container maxWidth="lg">
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{ py: 1, pr: { xs: 4, sm: 0 } }}
            >
              <CampaignIcon sx={{ fontSize: 20, flexShrink: 0 }} />
<Typography variant="body2" sx={{ fontWeight: 700, flex: 1 }}>
                  {urgentNotice?.title ??
                    (lang === 'ar'
                      ? t('public.layout.body.preregMandatory')
                      : 'Pre-registration is mandatory for travelers arriving through all ports of entry')}
                </Typography>
              <Button
                component={Link}
                to={urgentNotice ? '/notices' : '/traveler/register'}
                size="small"
                sx={{
                  flexShrink: 0,
                  bgcolor: 'rgba(255,255,255,0.16)',
                  color: '#fff',
                  fontWeight: 700,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' },
                }}
              >
                {t(urgentNotice ? 'public.layout.body.alertDetails' : 'public.layout.body.registerNow')}
              </Button>
              <IconButton
                aria-label={lang === 'ar' ? t('public.layout.body.closeNotification') : 'Close notification'}
                onClick={dismissBanner}
                size="small"
                sx={{ color: '#fff', position: { xs: 'absolute', sm: 'static' }, top: 4, left: 4 }}
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Stack>
          </Container>
        </Box>
      )}

      {/* Mobile drawer */}
      <Drawer anchor="right" open={mobileOpen} onClose={closeMobile}>
        <Box sx={{ width: 280, py: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, mb: 1 }}>
            <BrandLogo compact product="afyatna" />
            <IconButton aria-label={lang === 'ar' ? t('public.layout.body.closeMenu') : 'Close menu'} onClick={closeMobile}>
              <CloseIcon />
            </IconButton>
          </Stack>
          <Divider sx={{ mb: 1 }} />
          <List>
            {activeNavItems.map((item) =>
              item.children ? (
                <Box key={item.label}>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => setDrawerOpenItem((prev) => (prev === item.label ? null : item.label))}
                      sx={{ borderRadius: 2, mx: 1 }}
                    >
                      <ListItemText
                        primary={t(item.label)}
                        primaryTypographyProps={{
                          fontWeight: 700,
                          color: isNavItemActive(item) ? 'primary.main' : 'inherit',
                        }}
                      />
                      {drawerOpenItem === item.label ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </ListItemButton>
                  </ListItem>
                  <Collapse in={drawerOpenItem === item.label} timeout="auto" unmountOnExit>
                    <List disablePadding>
                      {item.children.map((child, i) => {
                        const prev = i > 0 ? item.children?.[i - 1] : undefined;
                        const showSection = !!child.section && child.section !== prev?.section;
                        return (
                          <Fragment key={child.path ?? child.label}>
                            {showSection && (
                              <Box sx={{ px: 3, pt: i > 0 ? 1 : 1.5, pb: 0.25 }}>
                                {i > 0 && <Divider sx={{ mb: 1 }} />}
                                <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block' }}>
                                  {tt(child.section)}
                                </Typography>
                              </Box>
                            )}
                            <ListItem disablePadding>
                              <ListItemButton
                                component={NavLink}
                                to={child.to ?? child.path}
                                onClick={closeMobile}
                                sx={{
                                  borderRadius: 2,
                                  mx: 1,
                                  pr: 4,
                                  '&.active': { bgcolor: 'primary.light', color: 'primary.dark', fontWeight: 700 },
                                }}
                              >
                                <ListItemText primary={tt(child.label)} />
                              </ListItemButton>
                            </ListItem>
                          </Fragment>
                        );
                      })}
                    </List>
                  </Collapse>
                </Box>
              ) : (
                <ListItem key={item.path} disablePadding>
                  <ListItemButton
                    component={NavLink}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={closeMobile}
                    sx={{
                      borderRadius: 2,
                      mx: 1,
                      '&.active': { bgcolor: 'primary.light', color: 'primary.dark', fontWeight: 700 },
                    }}
                  >
                    <ListItemText primary={t(item.label)} />
                  </ListItemButton>
                </ListItem>
              ),
            )}
          </List>
          <Box sx={{ px: 2, mt: 2 }}>
            <Stack direction="row" spacing={1}>
              <Button
                component={Link}
                to={loginLink}
                variant="contained"
                fullWidth
                startIcon={<LoginIcon />}
              >
                {t('public.layout.body.signIn')}
              </Button>
              <Button
                onClick={openGlobalSearch}
                variant="outlined"
                aria-label={lang === 'ar' ? t('public.layout.body.globalSearch') : 'Global search'}
                sx={{ minWidth: 52 }}
              >
                <SearchIcon />
              </Button>
            </Stack>
          </Box>
        </Box>
      </Drawer>

      <Box component="main" id="main-content" sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </Box>

      {/* Footer */}
      <Box component="footer" sx={{ bgcolor: 'grey.900', color: 'grey.300', mt: 8 }}>
        <Box
          sx={{
            height: 6,
            background: 'linear-gradient(90deg, #0e8a72, #c8a13a, #0e8a72)',
          }}
        />
        <Container maxWidth="lg" sx={{ py: 6 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={4}
            justifyContent="space-between"
          >
            <Box sx={{ maxWidth: 360 }}>
              <BrandLogo light product="afyatna" />
              <Typography variant="body2" sx={{ mt: 2, color: 'grey.400' }}>
                {t('public.layout.body.nationalPlatform')} {t('public.layout.body.ihrCompliance')}
              </Typography>
            </Box>
            {/* روابط سريعة مقسمة */}
            <nav aria-label={t('public.layout.body.quickLinks')}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 3, sm: 6 }} useFlexGap>
                {footerLinkGroups.map((group) => (
                  <Stack key={group.title} spacing={1}>
                    <Typography variant="subtitle1" color="white" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {tt(group.title)}
                    </Typography>
                    {group.links.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        style={{ color: 'inherit', textDecoration: 'none', fontSize: 14 }}
                      >
                        {tt(link.label)}
                      </Link>
                    ))}
                  </Stack>
                ))}
                {externalLinks.length > 0 && (
                  <Stack spacing={1}>
                    <Typography variant="subtitle1" color="white" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {t('public.layout.externalLinks.sectionTitle')}
                    </Typography>
                    {externalLinks.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'inherit', textDecoration: 'none', fontSize: 14 }}
                      >
                        {tt(link.label)}
                      </a>
                    ))}
                  </Stack>
                )}
              </Stack>
            </nav>
            <Stack spacing={1}>
              <Typography variant="subtitle1" color="white" sx={{ fontWeight: 700, mb: 0.5 }}>
                {t('public.layout.body.contactUs')}
              </Typography>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PublicIcon sx={{ fontSize: 16 }} /> {t('public.layout.body.khartoumSudan')}
              </Typography>
            </Stack>
          </Stack>
          <Divider sx={{ my: 4, borderColor: 'grey.800' }} />
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            spacing={1}
          >
            <Typography variant="caption" color="grey.500">
              {lang === 'ar' ? (
                <>{`© ${new Date().getFullYear()} الإدارة العامة للطوارئ الصحية ومكافحة الأوبئة. جميع الحقوق محفوظة.`}</>
              ) : (
                <>© {new Date().getFullYear()} General Directorate of Health Emergencies &amp; Epidemic Control. All rights reserved.</>
              )}
            </Typography>
            <Stack direction="row" spacing={2}>
              <Link to="/privacy" style={{ color: 'inherit', textDecoration: 'none', fontSize: 13 }}>
                {t('public.layout.body.privacy')}
              </Link>
              <Link to="/terms" style={{ color: 'inherit', textDecoration: 'none', fontSize: 13 }}>
                {t('public.layout.body.terms')}
              </Link>
            </Stack>
            <Typography variant="caption" color="grey.600">
              {t('public.layout.body.afyatna')} | AFYATNA
            </Typography>
          </Stack>
        </Container>
      </Box>

      <BackToTop />
      <AssistantFab />
      <GlobalSearchPalette />
    </Box>
  );
};

export default PublicLayout;
