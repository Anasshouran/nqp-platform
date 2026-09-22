import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import PersonIcon from '@mui/icons-material/Person';
import SchoolIcon from '@mui/icons-material/School';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import VerifiedIcon from '@mui/icons-material/Verified';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import { getDirectorProfile, type DirectorProfile } from '../../api/endpoints/public';
import { PageHeader, SectionTitle, Particles } from '../../components/common';

const fallback: DirectorProfile = {
  id: '',
  name_ar: 'د. الفاتح ربيع',
  name_en: 'El Fateh Rabeih',
  title: 'المدير العام للحجر الصحي القومي',
  qualification: 'دكتوراه في الطب',
  specialization: 'الصحة العامة وطب المنافذ الحدودية',
  summary:
    'الطبيب المسؤول عن الإشراف العام على منظومة الحجر الصحي في جمهورية السودان، ' +
    'وعلى تنفيذ اللوائح الصحية الدولية (IHR 2005) في المنافذ الجوية والبحرية والبرية، ' +
    'وإدارة الرصد الوبائي للأمراض المعدية والتنسيق مع الجهات الوطنية والدولية.',
  message:
    'تحرص الإدارة العامة للحجر الصحي القومي على حماية صحة المواطنين والمسافرين، وضمان سلامة الحركة عبر منافذ الدخول المختلفة، وذلك بتطبيق أعلى المعايير الصحية وفق اللوائح الصحية الدولية.\n\nإن التنسيق بين الجهات الوطنية هو حجر الأساس في نجاح منظومة الحجر الصحي، ونؤكد استمرار العمل لرفع كفاءة المختبرات وتحديث المرجعيات القياسية وتأهيل الكوادر.\n\nندعو جميع المسافرين إلى الالتزام بالإجراءات الصحية المعتمدة لضمان رحلة آمنة وبيئة صحية مستقرة للجميع.',
};

const responsibilities = [
  'الإشراف العام على إدارات الحجر الصحي في المنافذ الجوية والبحرية والبرية.',
  'تطبيق اللوائح الصحية الدولية (IHR 2005) وتحديث إجراءات المنافذ الحدودية.',
  'قيادة منظومة الرصد الوبائي والاستجابة للأخطار الصحية العامة.',
  'اعتماد الشهادات الصحية الدولية والتنسيق مع السلطات الصحية الإقليمية والدولية.',
  'تطوير الكوادر الصحية وتحديث البنية التحتية لمنافذ الحجر الصحي.',
  'تفعيل الشراكات المؤسسية مع وزارة الصحة والجهات الرقابية الوطنية.',
];

const priorities = [
  { icon: <VerifiedIcon />, label: 'الرقابة الصحية للمنافذ', desc: 'تطبيق الرقابة الصحية الفعالة في المنافذ الحدودية' },
  { icon: <MedicalServicesIcon />, label: 'الاستجابة للطوارئ الصحية', desc: 'جاهزية عالية للاستجابة للأخطار الوبائية' },
  { icon: <SchoolIcon />, label: 'بناء القدرات', desc: 'تأهيل الكوادر وتحديث المختبرات والمرجعيات' },
];

const DirectorPage = () => {
  const [profile, setProfile] = useState<DirectorProfile>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDirectorProfile()
      .then((data) => {
        if (data) setProfile(data);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const messageParagraphs = profile.message
    ? profile.message.split('\n').filter(Boolean)
    : fallback.message?.split('\n').filter(Boolean) ?? [];

  return (
  <Container maxWidth="lg" sx={{ py: 5 }}>
    <PageHeader
      title="المدير العام للحجر الصحي القومي"
      subtitle="صفحة المدير العام: السيرة، الرسالة، والمسؤوليات"
      eyebrow="قيادة الحجر الصحي"
    />

    {/* Profile hero */}
    <Card
      sx={{
        mb: 5,
        border: '1px solid',
        borderColor: 'divider',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, #075447, #0e8a72 60%, #12a585)',
        }}
      />
      <Particles count={8} />
      <CardContent sx={{ p: { xs: 3, md: 5 }, position: 'relative', color: '#fff' }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: 'center' }}>
            {profile.photo ? (
              <CardMedia
                component="img"
                image={profile.photo}
                alt={profile.name_ar}
                sx={{
                  width: { xs: 160, md: 200 },
                  height: { xs: 160, md: 200 },
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '4px solid rgba(255,255,255,0.35)',
                }}
              />
            ) : (
              <Avatar
                sx={{
                  width: { xs: 160, md: 200 },
                  height: { xs: 160, md: 200 },
                  bgcolor: 'rgba(255,255,255,0.18)',
                  border: '4px solid rgba(255,255,255,0.35)',
                  fontSize: 90,
                }}
              >
                <PersonIcon sx={{ fontSize: 110 }} />
              </Avatar>
            )}
          </Grid>
          <Grid item xs={12} md={8}>
            <Chip
              label="المدير العام"
              sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: '#fff', mb: 1.5 }}
            />
            <Typography variant="h3" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
              {profile.name_ar}
            </Typography>
            <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)', mb: 2 }}>
              {profile.title}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              <Chip
                icon={<SchoolIcon />}
                label={profile.qualification}
                sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', '& .MuiChip-icon': { color: '#fff' } }}
              />
              <Chip
                label={profile.specialization}
                sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff' }}
              />
            </Stack>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.95)', lineHeight: 2 }}>
              {profile.summary}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>

    {/* Priorities */}
    <Box sx={{ mb: 5 }}>
      <SectionTitle
        title="أولويات المدير العام"
        subtitle="أبرز المحاور التي يقودها المدير العام للحجر الصحي القومي"
        align="center"
      />
      <Grid container spacing={3} className="stagger">
        {priorities.map((priority) => (
          <Grid item xs={12} md={4} key={priority.label}>
            <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 3,
                    mx: 'auto',
                    mb: 1.5,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'primary.light',
                    color: 'primary.main',
                  }}
                >
                  {priority.icon}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {priority.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {priority.desc}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>

    {/* Director's message */}
    <Box sx={{ mb: 5 }}>
      <SectionTitle
        title="كلمة المدير العام"
        subtitle="رسالة المدير العام إلى المواطنين والمسافرين والشركاء"
        align="center"
      />
      <Card sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          <Box sx={{ color: 'primary.main', mb: 2 }}>
            <FormatQuoteIcon sx={{ fontSize: 48 }} />
          </Box>
          <Stack spacing={2}>
            {messageParagraphs.map((paragraph) => (
              <Typography
                key={paragraph}
                variant="body1"
                color="text.secondary"
                sx={{ lineHeight: 2.2, fontSize: '1.05rem' }}
              >
                {paragraph}
              </Typography>
            ))}
          </Stack>
          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>
            {profile.name_ar}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {profile.title}
          </Typography>
        </CardContent>
      </Card>
    </Box>

    {/* Responsibilities */}
    <Box sx={{ mb: 2 }}>
      <SectionTitle
        title="المسؤوليات والاختصاصات"
        subtitle="الاختصاصات المنوطة بالمدير العام للحجر الصحي القومي"
        align="center"
      />
      <Grid container spacing={2} className="stagger">
        {responsibilities.map((responsibility) => (
          <Grid item xs={12} md={6} key={responsibility}>
            <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Box sx={{ color: 'primary.main', mt: 0.5, flexShrink: 0 }}>
                    <VerifiedIcon sx={{ fontSize: 22 }} />
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.9 }}>
                    {responsibility}
                  </Typography>
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

export default DirectorPage;