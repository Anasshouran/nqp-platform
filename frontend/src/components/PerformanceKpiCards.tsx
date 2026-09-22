import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import type { ReactElement } from 'react';
import AirportShuttleIcon from '@mui/icons-material/AirportShuttle';
import DomainIcon from '@mui/icons-material/Domain';
import GroupsIcon from '@mui/icons-material/Groups';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import BiotechIcon from '@mui/icons-material/Biotech';
import BugReportIcon from '@mui/icons-material/BugReport';
import CampaignIcon from '@mui/icons-material/Campaign';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import HelpIcon from '@mui/icons-material/Help';
import ScienceIcon from '@mui/icons-material/Science';
import type { PublicStatistics } from '../api/endpoints/public';
import { CardsGridSkeleton } from './common';

interface StatDef {
  key: keyof PublicStatistics;
  label: string;
  icon: ReactElement;
  accent: string;
  hint: string;
}

const statDefs: StatDef[] = [
  { key: 'entry_points', label: 'منافذ الدخول', icon: <AirportShuttleIcon />, accent: '#0e8a72', hint: 'منفذ برّي وبحري وجوي نشط' },
  { key: 'sectors', label: 'القطاعات الصحية', icon: <DomainIcon />, accent: '#2f6f9f', hint: 'قطاع صحي تغطّي المنافذ' },
  { key: 'travelers', label: 'المسافرون المسجلون', icon: <GroupsIcon />, accent: '#7a5c9e', hint: 'مسافر عبر بوابة المنصة' },
  { key: 'screenings', label: 'الفحوصات الصحية', icon: <HealthAndSafetyIcon />, accent: '#c8a13a', hint: 'عملية فرز صحي عند المنافذ' },
  { key: 'certificates', label: 'الشهادات الصحية', icon: <WorkspacePremiumIcon />, accent: '#0e8a72', hint: 'شهادة صدرت واعتُمدت' },
  { key: 'food_shipments', label: 'شحنات الأغذية', icon: <LocalShippingIcon />, accent: '#b3544b', hint: 'شحنة خاضعة للفحص الصحي' },
  { key: 'lab_samples', label: 'العينات المخبرية', icon: <ScienceIcon />, accent: '#2f6f9f', hint: 'عينة محلّلة في المختبر' },
  { key: 'diseases', label: 'الأمراض المُترصَّدة', icon: <BugReportIcon />, accent: '#c62828', hint: 'مرض ضمن منظومة الترصد' },
  { key: 'vector_activities', label: 'أنشطة مكافحة النواقل', icon: <BiotechIcon />, accent: '#00695c', hint: 'نشاط مكافحة حشرات النواقل' },
  { key: 'notices', label: 'الإشعارات الصحية', icon: <CampaignIcon />, accent: '#ef6c00', hint: 'إشعار منشور ومتاح للجمهور' },
  { key: 'news', label: 'الأخبار', icon: <NewspaperIcon />, accent: '#5d4037', hint: 'خبر منشور في المركز الإعلامي' },
  { key: 'faq', label: 'الأسئلة الشائعة', icon: <HelpIcon />, accent: '#1565c0', hint: 'سؤال مُجاب في صفحة الأسئلة' },
];

const formatNumber = (n: number) => n.toLocaleString('en-US');

interface PerformanceKpiCardsProps {
  stats: PublicStatistics | null;
  loading: boolean;
  onRetry: () => void;
}

const PerformanceKpiCards = ({ stats, loading, onRetry }: PerformanceKpiCardsProps) => {
  if (loading) {
    return <CardsGridSkeleton count={8} />;
  }

  if (!stats) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          تعذر تحميل المؤشرات.
        </Typography>
        <Button variant="outlined" onClick={onRetry} sx={{ textTransform: 'none' }}>
          إعادة المحاولة
        </Button>
      </Box>
    );
  }

  return (
    <Grid container spacing={2.5}>
      {statDefs.map((def) => (
        <Grid item xs={6} sm={4} md={3} lg={2} key={def.key}>
          <Card
            className="fade-up"
            sx={{
              height: '100%',
              border: '1px solid',
              borderColor: 'divider',
              transition: 'box-shadow 220ms ease, transform 220ms ease, border-color 220ms ease',
              '&:hover': {
                boxShadow: 6,
                borderColor: alpha(def.accent, 0.35),
                transform: 'translateY(-4px)',
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                insetInline: 0,
                bottom: 0,
                height: 3,
                background: `linear-gradient(90deg, transparent, ${def.accent}, transparent)`,
                opacity: 0.35,
                transition: 'opacity 220ms ease',
              },
              '&:hover::after': { opacity: 1 },
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 1.2,
                    display: 'grid',
                    placeItems: 'center',
                    color: def.accent,
                    bgcolor: `${def.accent}1a`,
                    border: `1px solid ${def.accent}2b`,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.7)`,
                    flexShrink: 0,
                  }}
                >
                  {def.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}
                  >
                    {formatNumber(Number(stats[def.key] ?? 0))}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mt: 0.5 }}>
                    {def.label}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default PerformanceKpiCards;