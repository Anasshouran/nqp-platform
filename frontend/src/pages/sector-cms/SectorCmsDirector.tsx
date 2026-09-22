import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PersonIcon from '@mui/icons-material/Person';
import SchoolIcon from '@mui/icons-material/School';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import VerifiedIcon from '@mui/icons-material/Verified';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import { SectorPageShell, SectorHomeLink, useSectorSite, usePageTitle } from './SectorCmsShared';
import { getDirectorProfile } from '../../api/endpoints/public';
import type { DirectorProfile } from '../../api/endpoints/public';

const fallbackDirector = {
  nameAr: 'الاسم الرسمي قيد الاعتماد',
  placeholder: true,
  title: 'مدير القطاع للحجر الصحي',
  qualification: 'قيد الاعتماد',
  specialization: 'تُستكمل البيانات الرسمية',
  summary:
    'تتولى إدارة الحجر الصحي في القطاع تنفيذ إجراءات الترصد والكشف الصحي والاستجابة للطوارئ، ' +
    'بالتنسيق مع الإدارة العامة للطوارئ الصحية ومكافحة الأوبئة والجهات العاملة في نقاط الدخول، ' +
    'وبما يتوافق مع اللوائح الصحية الدولية (IHR 2005).',
  message:
    'الاسم الرسمي لمدير القطاع قيد الاعتماد، وسيتم نشر السيرة الكاملة والرسالة والمسؤوليات ' +
    'فور اعتمادها من الجهات المختصة.',
};

const responsibilities = [
  'الإشراف العام على إدارات الحجر الصحي في منافذ القطاع الجوية والبحرية والبرية.',
  'تنفيذ اللوائح الصحية الدولية (IHR 2005) وتحديث إجراءات منافذ الدخول.',
  'قيادة منظومة الرصد الوبائي في القطاع والاستجابة للأخطار الصحية العامة.',
  'إدارة عمليات فحص الشحنات الغذائية واعتماد الشهادات الصحية.',
  'الإشراف على برامج مكافحة النواقل والعمل الميداني في المنافذ.',
  'التنسيق مع سلطات الموانئ والمطارات والجهات الصحية المحلية والاتحادية.',
];

const priorities = [
  { icon: <VerifiedIcon />, label: 'الرقابة الصحية للمنافذ', desc: 'تطبيق الرقابة الصحية الفعالة في منافذ القطاع' },
  { icon: <MedicalServicesIcon />, label: 'الاستجابة للطوارئ الصحية', desc: 'جاهزية عالية للاستجابة للأخطار الوبائية في القطاع' },
  { icon: <SchoolIcon />, label: 'بناء القدرات', desc: 'تأهيل الكوادر وتحديث المختبرات والمرجعيات القياسية' },
];

const SectorCmsDirector = () => {
  const { sector } = useSectorSite();
  const [profile, setProfile] = useState<DirectorProfile | null>(null);

  usePageTitle('مدير القطاع');

  useEffect(() => {
    if (!sector) return;
    getDirectorProfile(sector.code)
      .then((p) => {
        if (p && p.name_ar) setProfile(p);
      })
      .catch(() => undefined);
  }, [sector]);

  const director = {
    nameAr: profile?.name_ar || fallbackDirector.nameAr,
    title: profile?.title || fallbackDirector.title,
    qualification: profile?.qualification || fallbackDirector.qualification,
    specialization: profile?.specialization || fallbackDirector.specialization,
    summary: profile?.summary || fallbackDirector.summary,
    message: profile?.message || fallbackDirector.message,
    photo: profile?.photo || null,
    placeholder: !profile,
    unconfirmed: !!profile && profile.is_confirmed === false,
    confirmationNote: profile?.confirmation_note || '',
  };

  const messageParagraphs = (director.message || '').split('\n').filter(Boolean);

  return (
    <SectorPageShell>
      <SectorHomeLink />
      <Typography component="h1" variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>مدير القطاع</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        السيرة والرسالة والمسؤوليات.
      </Typography>

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
        <CardContent sx={{ p: { xs: 3, md: 5 }, position: 'relative', color: '#fff' }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: 'center' }}>
              {director.photo ? (
                  <Avatar
                    src={director.photo}
                    sx={{
                      width: { xs: 160, md: 200 },
                      height: { xs: 160, md: 200 },
                      bgcolor: 'rgba(255,255,255,0.18)',
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
                label="مدير القطاع"
                sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: '#fff', mb: 1.5 }}
              />
              {director.placeholder && (
                <Chip
                  label="بانتظار اعتماد التسمية الرسمية"
                  sx={{ bgcolor: 'rgba(255,193,7,0.22)', color: '#fff', mb: 1.5, mr: 1 }}
                />
              )}
              {director.unconfirmed && (
                <Chip
                  label="بحاجة إلى تأكيد إداري"
                  sx={{ bgcolor: 'rgba(255,193,7,0.22)', color: '#fff', mb: 1.5, mr: 1 }}
                />
              )}
              <Typography variant="h3" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
                {director.nameAr}
              </Typography>
              <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)', mb: 2 }}>
                {director.title}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                <Chip
                  icon={<SchoolIcon />}
                  label={director.qualification}
                  sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', '& .MuiChip-icon': { color: '#fff' } }}
                />
                <Chip
                  label={director.specialization}
                  sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff' }}
                />
              </Stack>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.95)', lineHeight: 2 }}>
                {director.summary}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ mb: 5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>أولويات مدير القطاع</Typography>
        <Grid container spacing={2.5}>
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

      {!director.placeholder && director.message && (
        <Box sx={{ mb: 5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>كلمة مدير القطاع</Typography>
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
                {director.nameAr}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {director.title}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>المسؤوليات والاختصاصات</Typography>
        <Grid container spacing={2}>
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
    </SectorPageShell>
  );
};

export default SectorCmsDirector;
