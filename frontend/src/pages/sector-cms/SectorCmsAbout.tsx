import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import PestControlIcon from '@mui/icons-material/PestControl';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import ShieldIcon from '@mui/icons-material/Shield';
import GroupsIcon from '@mui/icons-material/Groups';
import ApartmentIcon from '@mui/icons-material/Apartment';
import HandshakeIcon from '@mui/icons-material/Handshake';
import { SectorPageShell, SectorHomeLink, useSectorSite, ErrorNotice, usePageTitle } from './SectorCmsShared';
import { getCmsPage } from '../../api/endpoints/public';

const competencies = [
  { label: 'الحجر الصحي', icon: <ShieldIcon />, desc: 'الإشراف على منافذ الدخول وضبط الاشتراطات الصحية.' },
  { label: 'الصحة العامة والترصد', icon: <MonitorHeartIcon />, desc: 'رصد التهديدات الصحية ومتابعة الأوبئة والأمراض.' },
  { label: 'سلامة الأغذية', icon: <RestaurantIcon />, desc: 'فحص الشحنات الغذائية الواردة وإصدار الشهادات.' },
  { label: 'مكافحة النواقل', icon: <PestControlIcon />, desc: 'برامج مكافحة الحشرات والنواقل في المنافذ.' },
  { label: 'الصحة المهنية والطوارئ', icon: <HealthAndSafetyIcon />, desc: 'التعامل مع الطوارئ الصحية والاستجابة السريعة.' },
];

const units = [
  { name: 'رئاسة القطاع', icon: <ApartmentIcon /> },
  { name: 'إدارة صحة المطارات', icon: <HealthAndSafetyIcon /> },
  { name: 'إدارة الصحة البحرية والموانئ', icon: <GroupsIcon /> },
  { name: 'إدارة سلامة الأغذية', icon: <RestaurantIcon /> },
  { name: 'وحدة مكافحة النواقل', icon: <PestControlIcon /> },
  { name: 'وحدة الترصد الوبائي', icon: <MonitorHeartIcon /> },
];

const partners = [
  'وزارة الصحة الاتحادية',
  'هيئة الموانئ البحرية',
  'الجمارك والموانئ',
  'السلطات الصحية المحلية',
  'المنظمات الصحية الدولية',
  'شركاء اللوجستيات والشحن',
];

const SectorCmsAbout = () => {
  const { sector, loading } = useSectorSite();
  const [aboutContent, setAboutContent] = useState<string | null>(null);

  usePageTitle('عن القطاع');

  useEffect(() => {
    if (!sector) return;
    getCmsPage('about', sector.id)
      .then((res) => {
        const page = res.data.data;
        if (page && page.content) setAboutContent(page.content);
      })
      .catch(() => undefined);
  }, [sector]);

  if (loading) {
    return (
      <SectorPageShell>
        <Skeleton variant="rounded" height={180} />
      </SectorPageShell>
    );
  }

  if (!sector) {
    return (
      <SectorPageShell>
        <ErrorNotice title="قطاع غير متاح" />
      </SectorPageShell>
    );
  }

  return (
    <SectorPageShell>
      <SectorHomeLink />
      <Typography component="h1" variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>عن القطاع</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {sector.name_ar} — نبذة واختصاصات وهيكل تنظيمي.
      </Typography>

      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>نبذة مؤسسية</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
            {aboutContent || sector.description_ar || `يعمل ${sector.name_ar} على تنفيذ الاشتراطات الصحية والمعايير الدولية في جميع منافذ الدخول، بما يضمن حماية الصحة العامة وصحة المسافرين وسلامة السلع والمواد الغذائية الواردة.`}
          </Typography>
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>الاختصاصات والمهام</Typography>
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {competencies.map((c) => (
          <Grid item xs={12} sm={6} md={4} key={c.label}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ width: 44, height: 44, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: 'primary.main', bgcolor: 'primary.light', mb: 1.5 }}>
                  {c.icon}
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{c.label}</Typography>
                <Typography variant="body2" color="text.secondary">{c.desc}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>الهيكل التنظيمي</Typography>
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {units.map((u) => (
          <Grid item xs={12} sm={6} md={4} key={u.name}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ color: 'primary.main', display: 'flex', fontSize: 30 }}>{u.icon}</Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{u.name}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>الشركاء</Typography>
      <Stack direction="row" flexWrap="wrap" spacing={1} useFlexGap>
        {partners.map((p) => (
          <Chip key={p} icon={<HandshakeIcon fontSize="small" />} label={p} variant="outlined" />
        ))}
      </Stack>
    </SectorPageShell>
  );
};

export default SectorCmsAbout;
