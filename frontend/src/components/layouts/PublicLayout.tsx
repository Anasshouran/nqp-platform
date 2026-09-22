import { Fragment, useEffect, useState } from 'react';
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
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
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
import BackToTop from '../common/BackToTop';
import AssistantFab from '../AssistantFab';
import GlobalSearchPalette, { openGlobalSearch } from '../search/GlobalSearchPalette';
import { getSectors, getNotices } from '../../api/endpoints/public';
import type { Sector, HealthNotice } from '../../api/endpoints/public';
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
  { label: 'الرئيسية', path: '/' },
  {
    label: 'الخدمات',
    path: '/services',
    children: [
      { label: 'كتالوج الخدمات', path: '/services', section: 'الإجراءات' },
      { label: 'خدمات المسافرين', path: '/services/travelers', section: 'الإجراءات' },
      { label: 'سلامة الأغذية', path: '/services/food-safety', section: 'الإجراءات' },
      { label: 'التسجيل المسبق', path: '/traveler/register', section: 'الإجراءات' },
      { label: 'بوابة المسافرين', path: '/traveler/dashboard', section: 'المنصات' },
      { label: 'بوابة الشركات', path: '/partners', section: 'المنصات' },
      { label: 'التحقق من الشهادات', path: '/verify', section: 'الأدوات' },
      { label: 'الخدمات الذكية', path: '/services/tools', section: 'الأدوات' },
      { label: 'المساعد الذكي', path: '/services/assistant', section: 'الأدوات' },
    ],
  },
  {
    label: 'المسافرون',
    path: '/travel-requirements',
    children: [
      { label: 'متطلبات السفر', path: '/travel-requirements', section: 'الاستعداد للسفر' },
      { label: 'التسجيل المسبق', path: '/traveler/register', section: 'الاستعداد للسفر' },
      { label: 'متابعة الطلب', path: '/traveler/tracking', section: 'الاستعداد للسفر' },
      { label: 'دليل الأمراض', path: '/diseases', section: 'المعرفة' },
      { label: 'التحقق من الشهادات', path: '/verify', section: 'المعرفة' },
    ],
  },
  {
    label: 'نقاط الدخول',
    path: '/ports',
    children: [
      { label: 'جميع المنافذ', path: '/ports', section: 'شبكة المنافذ' },
      { label: 'بوابة المنافذ', path: '/gateways', to: '/gateways#ports', section: 'شبكة المنافذ' },
      { label: 'مطار الخرطوم الدولي', path: '/ports/3b348265-6c36-43d4-b0f0-ac38b36794cb', section: 'المطارات' },
      { label: 'مطار بورتسودان الدولي', path: '/ports/fd20cfbb-41d7-4c8d-aea5-c12a690abd18', section: 'المطارات' },
      { label: 'ميناء بورتسودان', path: '/ports/85280d13-1273-45af-9760-4c558ef49b77', section: 'الموانئ' },
      { label: 'ميناء الأمير عثمان دقنة – سواكن', path: '/ports/9565c52e-aeed-4f8f-b04f-a539a168ef4b', section: 'الموانئ' },
      { label: 'ميناء مرسى بشاير', path: '/ports/25b64bdf-7a5e-4534-b6e1-7299ffd5d0e8', section: 'الموانئ' },
      { label: 'ميناء الخير', path: '/ports/f517ef6e-ba2b-4052-8c50-0d00bf6fcd12', section: 'الموانئ' },
      { label: 'ميناء الزبير محمد صالح', path: '/ports/de2abf1c-f4b0-4327-8348-503bfb882f69', section: 'الموانئ' },
      { label: 'معبر أرقين', path: '/ports/01dedab9-7ccc-4afb-8a5d-2f2b5937bc32', section: 'المعابر البرية' },
      { label: 'معبر وادي حلفا', path: '/ports/e4202853-d398-4069-8e8a-01e70aa390c1', section: 'المعابر البرية' },
      { label: 'معبر المثلث', path: '/ports/790a1843-9f88-4dd7-b482-087c59d4b01c', section: 'المعابر البرية' },
      { label: 'المعابر الحدودية مع إريتريا', path: '/ports/cc1ce25b-b420-4977-8fe6-0a014d379293', section: 'المعابر البرية' },
      { label: 'معبر القلابات', path: '/ports/6c308abe-4f0b-4100-9c0f-afd4b90b86b2', section: 'المعابر البرية' },
      { label: 'المعابر الحدودية مع جنوب السودان', path: '/ports/ad3db613-e296-4c22-b49f-1ca7ae2c614b', section: 'المعابر البرية' },
      { label: 'معبر أدري', path: '/ports/f959d2c8-7e60-4c04-887e-d26c7f3bf527', section: 'المعابر البرية' },
      { label: 'معبر تينة', path: '/ports/8a000357-d514-466c-9bb6-9f235d2249e8', section: 'المعابر البرية' },
      { label: 'معبر أوسيف', path: '/ports/987cd070-fc93-4c88-bbd0-04ac5c00844d', section: 'المعابر البرية' },
      { label: 'معبر قباتيت', path: '/ports/39027876-3615-49df-8504-f9bb72531a6b', section: 'المعابر البرية' },
    ],
  },
  {
    label: 'البوابات',
    path: '/gateways',
    children: [
      { label: 'بوابة المسافر', path: '/traveler/login', section: 'للمسافرين' },
      { label: 'التحقق من الشهادات', path: '/verify', section: 'للمسافرين' },
      { label: 'بوابة القطاعات', path: '/gateways', to: '/gateways#sectors', section: 'القطاعات والمنافذ' },
      { label: 'بوابة المنافذ', path: '/gateways', to: '/gateways#ports', section: 'القطاعات والمنافذ' },
      { label: 'بوابة شركات الطيران', path: '/app/carrier', section: 'القطاعات والمنافذ' },
      { label: 'بوابة شركات الشحن والموانئ', path: '/app/food-ops', section: 'القطاعات والمنافذ' },
      { label: 'بوابة العيادات', path: '/app/clinic', section: 'الإدارة الصحية' },
      { label: 'بوابة المختبرات', path: '/app/laboratory', section: 'الإدارة الصحية' },
      { label: 'بوابة الترصد', path: '/app/surveillance', section: 'الإدارة الصحية' },
      { label: 'بوابة رقابة الأغذية', path: '/app/food', section: 'الإدارة الصحية' },
      { label: 'بوابة مكافحة النواقل', path: '/app/vector-control', section: 'الإدارة الصحية' },
      { label: 'بوابة التطعيم الدولي', path: '/app/vaccination', section: 'الإدارة الصحية' },
      { label: 'بوابة المنظمات والشركاء', path: '/partners', section: 'الإدارة الصحية' },
    ],
  },
{
    label: 'الأخبار',
    path: '/news',
    children: [
      { label: 'الأخبار', path: '/news' },
      { label: 'التنبيهات الصحية', path: '/notices' },
      { label: 'التعاميم', path: '/circulars' },
    ],
  },
  { label: 'الوثائق', path: '/documents' },
  {
    label: 'الأمراض والأوبئة',
    path: '/diseases',
    children: [
      { label: 'دليل الأمراض والإرشادات', path: '/diseases', section: 'المعرفة الصحية' },
      { label: 'التنبيهات الصحية', path: '/notices', section: 'المعرفة الصحية' },
      { label: 'التعاميم', path: '/circulars', section: 'المعرفة الصحية' },
    ],
  },
  {
    label: 'حول',
    path: '/about',
    children: [
      { label: 'من نحن', path: '/about', section: 'المنصة' },
      { label: 'مدير المنصة', path: '/director', section: 'المنصة' },
      { label: 'الأسئلة الشائعة', path: '/faq', section: 'الدعم' },
      { label: 'اتصل بنا', path: '/contact', section: 'الدعم' },
    ],
  },
];

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
  'المنافذ الجوية': 'Airports',
  'المنافذ البحرية': 'Seaports',
  'المنافذ البرية': 'Land Ports',
  'بوابة المنافذ': 'Ports Gateway',
  'شبكة المنافذ': 'Ports Network',
  'المطارات': 'Airports',
  'الموانئ': 'Seaports',
  'المعابر البرية': 'Land Crossings',
  'مطار الخرطوم الدولي': 'Khartoum International Airport',
  'مطار بورتسودان الدولي': 'Port Sudan International Airport',
  'ميناء بورتسودان': 'Port Sudan Seaport',
  'ميناء الأمير عثمان دقنة – سواكن': 'Sakin Port (Prince Uthman Digna)',
  'ميناء مرسى بشاير': 'Mersa Bashair Port',
  'ميناء الخير': 'Al Khayr Port',
  'ميناء الزبير محمد صالح': 'Al Zubair Mohamed Saleh Port',
  'معبر أرقين': 'Arqin Crossing',
  'معبر وادي حلفا': 'Wadi Halfa Crossing',
  'معبر المثلث': 'Al Muthallath Crossing',
  'المعابر الحدودية مع إريتريا': 'Eritrea Border Crossings',
  'معبر القلابات': 'Al Qalabat Crossing',
  'المعابر الحدودية مع جنوب السودان': 'South Sudan Border Crossings',
  'معبر أدري': 'Adri Crossing',
  'معبر تينة': 'Tina Crossing',
  'معبر أوسيف': 'Usif Crossing',
  'معبر قباتيت': 'Qubatit Crossing',
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
  { label: 'وزارة الصحة الاتحادية', href: 'https://fmoh.gov.sd' },
  { label: 'منظمة الصحة العالمية', href: 'https://www.who.int' },
  { label: 'اللوائح الصحية الدولية (IHR)', href: 'https://www.who.int/health-topics/international-health-regulations' },
];

const footerLinkGroups = [
  {
    title: 'روابط مهمة',
    links: [
      { label: 'رئيسية', path: '/' },
      { label: 'كتالوج الخدمات', path: '/services' },
      { label: 'متطلبات السفر', path: '/travel-requirements' },
      { label: 'المنافذ الصحية', path: '/ports' },
      { label: 'المؤشرات العامة', path: '/indicators' },
      { label: 'بوابات المنصة', path: '/gateways' },
      { label: 'الوثائق', path: '/documents' },
    ],
  },
  {
    title: 'الخدمات',
    links: [
      { label: 'التحقق من الشهادات', path: '/verify' },
      { label: 'الخدمات الذكية', path: '/services/tools' },
      { label: 'بوابة المسافرين', path: '/traveler/dashboard' },
      { label: 'بوابة الشركات', path: '/partners' },
      { label: 'التسجيل المسبق', path: '/traveler/register' },
    ],
  },
  {
    title: 'المعرفة',
    links: [
      { label: 'التنبيهات الصحية', path: '/notices' },
      { label: 'الأخبار', path: '/news' },
      { label: 'التعاميم', path: '/circulars' },
      { label: 'الوثائق', path: '/documents' },
      { label: 'الأمراض والإرشادات', path: '/diseases' },
      { label: 'الأسئلة الشائعة', path: '/faq' },
    ],
  },
];

const sectorNavItems = (slug: string): NavItem[] => [
  { label: 'الرئيسية', path: `/sector/${slug}` },
  {
    label: 'حول القطاع',
    path: `/sector/${slug}/about`,
    children: [
      { label: 'من نحن', path: `/sector/${slug}/about` },
      { label: 'مدير القطاع', path: `/sector/${slug}/director` },
      { label: 'المنافذ', path: `/sector/${slug}/ports` },
      { label: 'مركز الوثائق', path: `/sector/${slug}/documents` },
      { label: 'الأسئلة الشائعة', path: `/sector/${slug}/faq` },
      { label: 'اتصل بنا', path: `/sector/${slug}/contact` },
    ],
  },
  {
    label: 'الخدمات',
    path: `/sector/${slug}/services`,
    children: [
      { label: 'كتالوج الخدمات', path: `/sector/${slug}/services` },
      { label: 'سلامة الغذاء', path: `/sector/${slug}/services/food-safety` },
      { label: 'مكافحة النواقل', path: `/sector/${slug}/services/vector-control` },
      { label: 'متطلبات الدخول والخروج', path: `/sector/${slug}/travel-requirements` },
    ],
  },
  {
    label: 'التنبيهات والأخبار',
    path: `/sector/${slug}/news`,
    children: [
      { label: 'الأخبار', path: `/sector/${slug}/news` },
      { label: 'التعميمات', path: `/sector/${slug}/circulars` },
    ],
  },
];

const PublicLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuState, setMenuState] = useState<{ anchor: HTMLElement; children: NavItem[] } | null>(null);
  const [drawerOpenItem, setDrawerOpenItem] = useState<string | null>(null);
  const [bannerOpen, setBannerOpen] = useState(
    () => sessionStorage.getItem('nqp_banner_dismissed') !== '1'
  );
  const [urgentNotice, setUrgentNotice] = useState<HealthNotice | null>(null);
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const tl = (ar?: string) => (lang === 'ar' ? (ar ?? '') : ar ? UI_STRINGS[ar] ?? ar : '');
  const location = useLocation();
  const navigationType = useNavigationType();
  const scrolled = useScrollTrigger({ disableHysteresis: true, threshold: 24 });

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('nqp_lang', lang);
  }, [lang]);

  useEffect(() => {
    const saved = localStorage.getItem('nqp_lang');
    if (saved === 'ar' || saved === 'en') setLang(saved);
  }, []);

  const pathSlug = location.pathname.match(/^\/sector\/([^/]+)(?:\/|$)/)?.[1] ?? null;
  const cmsSlug = isCmsSector(pathSlug ?? undefined) ? pathSlug : null;
  const dashboardRoute = sectorDashboardRoute(cmsSlug ?? undefined);
  const loginLink = dashboardRoute ? `/login?next=${dashboardRoute}` : '/login';
  const [activeSector, setActiveSector] = useState<Sector | null>(null);

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

  const activeNavItems = cmsSlug ? sectorNavItems(cmsSlug) : navItems;

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
    const active = isNavItemActive(item) || (item.children && servicesActive && item.label === 'الخدمات');
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
        {tl(item.label)}
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
        {tl(item.label)}
      </Button>
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <a href="#main-content" className="skip-link">
        {tl('تخطي إلى المحتوى الرئيسي')}
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
                {cmsSlug ? orgLabel : tl('وزارة الصحة الاتحادية')}
              </Typography>
              {!cmsSlug && (
                <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.6)' }} />
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 600, opacity: 0.95, whiteSpace: 'nowrap' }}
                  >
                    {tl('الإدارة العامة للطوارئ الصحية ومكافحة الأوبئة')}
                  </Typography>
                </Box>
              )}
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <ToggleButtonGroup
                exclusive
                size="small"
                value={lang}
                onChange={(_, next) => {
                  if (next === 'ar' || next === 'en') setLang(next);
                }}
                aria-label={lang === 'ar' ? 'اختيار اللغة' : 'Language'}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  p: 0.25,
                  '& .MuiToggleButtonGroup-grouped': { border: 'none', borderRadius: 6 },
                }}
              >
                {(['ar', 'en'] as const).map((code) => (
                  <ToggleButton
                    key={code}
                    value={code}
                    sx={{
                      minWidth: 0,
                      px: 1.25,
                      py: 0.25,
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'none',
                      color: '#fff',
                      bgcolor: 'transparent',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.18)', color: '#fff' },
                      '&.Mui-selected': { bgcolor: '#fff', color: 'primary.darker' },
                      '&.Mui-selected:hover': { bgcolor: '#fff', color: 'primary.darker' },
                    }}
                  >
                    {code === 'ar' ? 'العربية' : 'English'}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
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
            <Link to={cmsSlug ? `/sector/${cmsSlug}` : '/'} aria-label="الصفحة الرئيسية" style={{ textDecoration: 'none', color: 'inherit' }}>
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
              slotProps={{ paper: { sx: { mt: 1, borderRadius: 3, minWidth: 200 }, 'aria-label': lang === 'ar' ? 'قائمة التنقل' : 'Navigation menu' } }}
            >
              {menuState?.children.map((child, i) => {
                const prev = i > 0 ? menuState?.children?.[i - 1] : undefined;
                const showSection = !!child.section && child.section !== prev?.section;
                return (
                  <Fragment key={child.path ?? child.label}>
                    {showSection && (
                      <Box sx={{ px: 2, pt: i > 0 ? 0.75 : 1, pb: 0.25 }}>
                        {i > 0 && <Divider sx={{ mb: 1 }} />}
                        <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: 0.5 }}>
                          {tl(child.section)}
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
                      {tl(child.label)}
                    </MenuItem>
                  </Fragment>
                );
              })}
            </Menu>

            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton
                aria-label={lang === 'ar' ? 'البحث الشامل' : 'Global search'}
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
                {tl('تسجيل الدخول')}
              </Button>
              <IconButton
                component={Link}
                to={loginLink}
                aria-label={lang === 'ar' ? 'حساب المستخدم' : 'User account'}
                sx={{ display: { xs: 'inline-flex', sm: 'none' }, color: 'primary.main' }}
              >
                <AccountCircleIcon />
              </IconButton>
              <IconButton
                aria-label={lang === 'ar' ? 'فتح القائمة' : 'Open menu'}
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
            background: 'linear-gradient(90deg, #0a6b58, #0e8a72, #12a585)',
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
                      ? 'التسجيل المسبق إلزامي للمسافرين القادمين عبر جميع منافذ الدخول'
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
                {tl(urgentNotice ? 'تفاصيل التنبيه' : 'سجّل الآن')}
              </Button>
              <IconButton
                aria-label={lang === 'ar' ? 'إغلاق الإشعار' : 'Close notification'}
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
            <IconButton aria-label={lang === 'ar' ? 'إغلاق القائمة' : 'Close menu'} onClick={closeMobile}>
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
                        primary={tl(item.label)}
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
                                <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block' }}>
                                  {tl(child.section)}
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
                                <ListItemText primary={tl(child.label)} />
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
                    <ListItemText primary={tl(item.label)} />
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
                {tl('تسجيل الدخول')}
              </Button>
              <Button
                onClick={openGlobalSearch}
                variant="outlined"
                aria-label={lang === 'ar' ? 'البحث الشامل' : 'Global search'}
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
                منصة وطنية متكاملة لإدارة الحجر الصحي والرصد الوبائي في جميع منافذ الدخول بجمهورية السودان،
                وفق معايير اللوائح الصحية الدولية (IHR).
              </Typography>
            </Box>
            {/* روابط سريعة مقسمة */}
            <nav aria-label="روابط سريعة">
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 3, sm: 6 }} useFlexGap>
                {footerLinkGroups.map((group) => (
                  <Stack key={group.title} spacing={1}>
                    <Typography variant="subtitle1" color="white" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {tl(group.title)}
                    </Typography>
                    {group.links.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        style={{ color: 'inherit', textDecoration: 'none', fontSize: 14 }}
                      >
                        {tl(link.label)}
                      </Link>
                    ))}
                  </Stack>
                ))}
                {externalLinks.length > 0 && (
                  <Stack spacing={1}>
                    <Typography variant="subtitle1" color="white" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {tl('دولي')}
                    </Typography>
                    {externalLinks.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'inherit', textDecoration: 'none', fontSize: 14 }}
                      >
                        {link.label}
                      </a>
                    ))}
                  </Stack>
                )}
              </Stack>
            </nav>
            <Stack spacing={1}>
              <Typography variant="subtitle1" color="white" sx={{ fontWeight: 700, mb: 0.5 }}>
                {tl('تواصل معنا')}
              </Typography>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PublicIcon sx={{ fontSize: 16 }} /> الخرطوم، جمهورية السودان
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
                {tl('الخصوصية')}
              </Link>
              <Link to="/terms" style={{ color: 'inherit', textDecoration: 'none', fontSize: 13 }}>
                {tl('الشروط والأحكام')}
              </Link>
            </Stack>
            <Typography variant="caption" color="grey.600">
              {lang === 'ar' ? 'منصة الحجر الصحي القومي - عافيتنا' : 'National Quarantine Platform - AFYATNA'} | AFYATNA
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
