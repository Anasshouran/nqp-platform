import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FlagIcon from '@mui/icons-material/Flag';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import GavelIcon from '@mui/icons-material/Gavel';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FlightIcon from '@mui/icons-material/Flight';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import CrisisAlertIcon from '@mui/icons-material/CrisisAlert';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import PersonIcon from '@mui/icons-material/Person';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link } from 'react-router-dom';
import { PageHeader, SectionTitle, Particles } from '../../components/common';
import { getCmsPage, getDirectorProfile, type DirectorProfile } from '../../api/endpoints/public';

const FALLBACK_OVERVIEW =
  'الإدارة العامة للحجر الصحي القومي هي الجهاز الرسمي المعني بحماية صحة المواطنين والمسافرين ' +
  'عبر تطبيق اللوائح الصحية الدولية (IHR 2005) في جميع منافذ الدخول الحدودية - الجوية والبحرية والبرية - ' +
  'بجمهورية السودان. تتبع الإدارة لوزارة الصحة الاتحادية، وتعمل على الرصد الوبائي للأمراض المعدية، ' +
  'وإجراء الفحص الصحي للمسافرين والوافدين، وإصدار الشهادات الصحية الدولية، ومكافحة نواقل الأمراض ' +
  'داخل نطاق المنافذ، والتنسيق مع المنظمات الصحية الإقليمية والدولية لضمان الاستجابة السريعة لأي خطر صحي عام.';

const vision =
  'الريادة في منظومة الحجر الصحي والرصد الوبائي وفق أعلى المعايير الدولية، لضمان بيئة سفر آمنة تحمي صحة الإنسان وتدعم التنمية الوطنية والإقليمية.';

const mission =
  'توفير منظومة حجر صحي متكاملة وفعّالة عبر تطبيق اللوائح الصحية الدولية، وتطوير الكوادر والبنية التحتية، واعتماد التقنيات الحديثة في الرصد والفحص، لضمان الاستجابة السريعة للأخطار الصحية العامة.';

const objectives = [
  'الوقاية من دخول الأمراض الوبائية الخطيرة إلى البلاد وتقليل انتشارها.',
  'تطبيق اللوائح الصحية الدولية (IHR) في جميع منافذ الدخول الحدودية.',
  'رفع كفاءة الفحص الصحي والترصد الوبائي للأمراض المعدية.',
  'إصدار الشهادات الصحية الدولية وضبط صلاحيتها وسلامتها.',
  'بناء نظام معلومات وطني متكامل للرصد الصحي الحدودي.',
  'التعاون الوثيق مع المنظمات الصحية الإقليمية والدولية.',
  'تدريب وتأهيل الكوادر الصحية المتخصصة في الحجر الصحي.',
  'رفع الوعي الصحي للمسافرين والمجتمع المحلي.',
];

const mandates = [
  'الإشراف على تنفيذ أعمال الحجر الصحي في جميع المنافذ الحدودية.',
  'الفحص الصحي للمسافرين والوافدين والمركبات ووسائط النقل.',
  'مكافحة نواقل الأمراض داخل نطاق المنافذ والمناطق المحيطة بها.',
  'إصدار وتوثيق الشهادات الصحية الدولية وتدقيقها.',
  'إدارة الطوارئ الصحية العامة وتفعيل خطط الاستجابة السريعة.',
  'التنسيق مع الجهات الوطنية والدولية في مجال الصحة الحدودية.',
  'جمع وتحليل البيانات الوبائية وإصدار التقارير الدورية.',
  'مراقبة التزام شركات النقل بالاشتراطات الصحية الدولية.',
];

const orgStructure = [
  { id: 1, label: 'إدارة الحجر الصحي الجوي', icon: <FlightIcon />, desc: 'الإشراف على منافذ المطارات الدولية والداخلية.' },
  { id: 2, label: 'إدارة الحجر الصحي البحري', icon: <DirectionsBoatIcon />, desc: 'الإشراف على الموانئ البحرية والسفن القادمة.' },
  { id: 3, label: 'إدارة الحجر الصحي البري', icon: <DirectionsBusIcon />, desc: 'الإشراف على المعابر الحدودية البرية.' },
  { id: 4, label: 'إدارة الرصد الوبائي والمعلومات الصحية', icon: <MonitorHeartIcon />, desc: 'الترصد الوبائي وتحليل البيانات والتقارير.' },
  { id: 5, label: 'إدارة التطعيمات والشهادات الصحية', icon: <VaccinesIcon />, desc: 'إصدار وتوثيق الشهادات الصحية الدولية.' },
  { id: 6, label: 'وحدة الطوارئ الصحية', icon: <CrisisAlertIcon />, desc: 'غرفة العمليات والاستجابة السريعة للأخطار.' },
];

const departments = [
  {
    title: 'إدارة الحجر الصحي الجوي',
    desc: 'تعمل في مطار الخرطوم الدولي وبقية المطارات، وتتولى فحص القادمين والمغادرين ومراقبة الطائرات ووسائل النقل الجوي.',
    icon: <FlightIcon />,
    tags: ['المطارات', 'الرحلات الدولية', 'فحص الوافدين'],
  },
  {
    title: 'إدارة الحجر الصحي البحري',
    desc: 'تشرف على موانئ بورتسودان وغيرها من الموانئ البحرية، وتفحص السفن وأطقمها والبضائع وفق اللوائح الصحية الدولية.',
    icon: <DirectionsBoatIcon />,
    tags: ['الموانئ', 'السفن', 'شهادات الخلو الصحي'],
  },
  {
    title: 'إدارة الحجر الصحي البري',
    desc: 'تدير المعابر الحدودية البرية وتتولى فحص المسافرين والمركبات ووسائل النقل البري لمنع دخول الأمراض.',
    icon: <DirectionsBusIcon />,
    tags: ['المعابر البرية', 'المركبات', 'الشاحنات'],
  },
  {
    title: 'إدارة الرصد الوبائي والمعلومات الصحية',
    desc: 'تتولى الترصد الوبائي المستمر، وجمع وتحليل البيانات الصحية الحدودية، وإصدار التقارير والإنذارات المبكرة.',
    icon: <MonitorHeartIcon />,
    tags: ['الترصد', 'البيانات', 'الإنذار المبكر'],
  },
  {
    title: 'إدارة التطعيمات والشهادات الصحية',
    desc: 'تصدر الشهادات الصحية الدولية للتطعيم، وتتحقق من صلاحيتها وسلامتها، وتوثق بيانات التطعيم للمسافرين.',
    icon: <VaccinesIcon />,
    tags: ['الشهادات الصحية', 'التطعيم', 'التوثيق'],
  },
  {
    title: 'وحدة الطوارئ الصحية',
    desc: 'تشغّل غرفة عمليات على مدار الساعة للاستجابة السريعة للأخطار الصحية العامة وحالات الطوارئ الوبائية.',
    icon: <CrisisAlertIcon />,
    tags: ['غرفة العمليات', 'الاستجابة', '24/7'],
  },
];

const director = {
  label: 'المدير العام للحجر الصحي القومي',
  desc: 'الإشراف العام على الإدارات والوحدات التابعة',
};

const AboutPage = () => {
  const [overview, setOverview] = useState<string | null>(null);
  const [directorProfile, setDirectorProfile] = useState<DirectorProfile | null>(null);

  useEffect(() => {
    getCmsPage('about-us')
      .then((response) => setOverview(response.data.data.content))
      .catch(() => setOverview(null));
    getDirectorProfile()
      .then(setDirectorProfile)
      .catch(() => setDirectorProfile(null));
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <PageHeader
        title="من نحن"
        subtitle="التعريف بالإدارة العامة للحجر الصحي القومي: الرؤية، الرسالة، الأهداف، الاختصاصات، والهيكل التنظيمي"
        eyebrow="عن الإدارة"
      />

      {/* Overview */}
      <Card sx={{ mb: 5, border: '1px solid', borderColor: 'divider', position: 'relative', overflow: 'hidden' }}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, #075447, #0e8a72 60%, #12a585)',
            color: '#fff',
            opacity: 1,
          }}
        />
        <Particles count={8} />
        <CardContent sx={{ p: { xs: 3, md: 5 }, position: 'relative' }}>
          <Chip
            icon={<MedicalInformationIcon />}
            label="الإدارة العامة للحجر الصحي القومي"
            sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: '#fff', mb: 2.5, '& .MuiChip-icon': { color: '#fff' } }}
          />
          <Typography variant="h3" component="h2" sx={{ mb: 2, color: '#fff' }}>
            نبذة عن الإدارة
          </Typography>
          {overview === null ? (
            <Stack spacing={1.5}>
              <Skeleton variant="text" sx={{ bgcolor: 'rgba(255,255,255,0.25)' }} />
              <Skeleton variant="text" sx={{ bgcolor: 'rgba(255,255,255,0.25)' }} />
              <Skeleton variant="text" sx={{ width: '70%', bgcolor: 'rgba(255,255,255,0.25)' }} />
            </Stack>
          ) : (
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.95)', lineHeight: 2.2, fontSize: '1.05rem' }}>
              {overview}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Vision + Mission */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} md={6}>
          <Card className="fade-up" sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3.5 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 3,
                  mb: 2,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'rgba(200,161,58,0.14)',
                  color: '#c8a13a',
                }}
              >
                <VisibilityIcon sx={{ fontSize: 30 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1.5 }}>
                رؤيتنا
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 2 }}>
                {vision}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card className="fade-up" sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3.5 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 3,
                  mb: 2,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'rgba(14,138,114,0.14)',
                  color: 'primary.main',
                }}
              >
                <FlagIcon sx={{ fontSize: 30 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1.5 }}>
                رسالتنا
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 2 }}>
                {mission}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Objectives */}
      <Box sx={{ mb: 5 }}>
        <SectionTitle
          title="الأهداف"
          subtitle="أبرز الأهداف الاستراتيجية للإدارة العامة للحجر الصحي القومي"
          align="center"
        />
        <Grid container spacing={2} className="stagger">
          {objectives.map((objective, index) => (
            <Grid item xs={12} sm={6} lg={3} key={objective}>
              <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: 'primary.light',
                        color: 'primary.main',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.8 }}>
                      {objective}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Mandates */}
      <Box sx={{ mb: 5 }}>
        <SectionTitle
          title="الاختصاصات"
          subtitle="الاختصاصات والمسؤوليات المنوطة بالإدارة"
          align="center"
        />
        <Grid container spacing={2} className="stagger">
          {mandates.map((mandate) => (
            <Grid item xs={12} md={6} key={mandate}>
              <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Box sx={{ color: 'primary.main', mt: 0.5, flexShrink: 0 }}>
                      <GavelIcon sx={{ fontSize: 22 }} />
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.9 }}>
                      {mandate}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Org structure */}
      <Box sx={{ mb: 5 }}>
        <SectionTitle
          title="الهيكل التنظيمي"
          subtitle="التوزيع التنظيمي للإدارات والوحدات التابعة للمدير العام"
          align="center"
        />
        <Card sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box
            sx={{
              p: 4,
              textAlign: 'center',
              background: 'linear-gradient(120deg, #0a6b58, #0e8a72)',
              color: '#fff',
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                mx: 'auto',
                mb: 1.5,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'rgba(255,255,255,0.16)',
                color: '#fff',
              }}
            >
              <AccountTreeIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {director.label}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              {director.desc}
            </Typography>
          </Box>

          <Box
            aria-hidden
            sx={{ width: 2, height: 24, mx: 'auto', bgcolor: 'primary.main' }}
          />
          <Box sx={{ px: { xs: 2, md: 4 }, pb: 4 }}>
            <Grid container spacing={2}>
              {orgStructure.map((node, index) => (
                <Grid item xs={12} sm={6} lg={4} key={node.id}>
                  <Card
                    className={index === 0 ? 'fade-up' : undefined}
                    variant="outlined"
                    sx={{
                      height: '100%',
                      borderColor: 'primary.light',
                      bgcolor: 'primary.lighter',
                      transition: 'transform 300ms ease, box-shadow 300ms ease',
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: 3 },
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 2.5,
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: '#fff',
                            color: 'primary.main',
                            boxShadow: 1,
                            flexShrink: 0,
                          }}
                        >
                          {node.icon}
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.4 }}>
                            {node.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {node.desc}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Card>
      </Box>

      {/* Director */}
      {directorProfile && (
        <Box sx={{ mb: 5 }}>
          <SectionTitle
            title="كلمة المدير العام"
            subtitle="الرسالة القيادية للمدير العام للحجر الصحي القومي"
            align="center"
          />
          <Card sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Grid container>
              <Grid
                item
                xs={12}
                md={4}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  p: 4,
                  background: 'linear-gradient(135deg, #075447, #0e8a72 60%, #12a585)',
                  color: '#fff',
                }}
              >
                <Avatar
                  sx={{
                    width: 110,
                    height: 110,
                    mb: 2,
                    bgcolor: 'rgba(255,255,255,0.18)',
                    border: '3px solid rgba(255,255,255,0.35)',
                    fontSize: 48,
                  }}
                >
                  <PersonIcon sx={{ fontSize: 56 }} />
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {directorProfile.name_ar}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
                  {directorProfile.title}
                </Typography>
                <Button
                  component={Link}
                  to="/director"
                  variant="contained"
                  sx={{ bgcolor: '#fff', color: '#075447', '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } }}
                  endIcon={<ArrowForwardIcon />}
                >
                  الصفحة الكاملة
                </Button>
              </Grid>
              <Grid item xs={12} md={8}>
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                  <Box sx={{ color: 'primary.main', mb: 1.5 }}>
                    <FormatQuoteIcon sx={{ fontSize: 40 }} />
                  </Box>
                  <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 2.2 }}>
                    {directorProfile.summary}
                  </Typography>
                </CardContent>
              </Grid>
            </Grid>
          </Card>
        </Box>
      )}

      {/* Departments */}
      <Box sx={{ mb: 2 }}>
        <SectionTitle
          title="الإدارات التابعة"
          subtitle="الإدارات والوحدات التابعة للإدارة العامة للحجر الصحي القومي"
          align="center"
        />
        <Grid container spacing={3} className="stagger">
          {departments.map((department) => (
            <Grid item xs={12} sm={6} lg={4} key={department.title}>
              <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 3,
                      mb: 2,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: 'primary.light',
                      color: 'primary.main',
                    }}
                  >
                    {department.icon}
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    {department.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.9 }}>
                    {department.desc}
                  </Typography>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {department.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" color="primary" variant="outlined" />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};

export default AboutPage;
