import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import PhoneIcon from '@mui/icons-material/Phone';
import MailIcon from '@mui/icons-material/Mail';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SendIcon from '@mui/icons-material/Send';
import FacebookIcon from '@mui/icons-material/Facebook';
import XIcon from '@mui/icons-material/X';
import YouTubeIcon from '@mui/icons-material/YouTube';
import InstagramIcon from '@mui/icons-material/Instagram';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { PageHeader } from '../../components/common';
import { sendContactMessage } from '../../api/endpoints/public';
import { notifyError, notifySuccess } from '../../utils/toast';

const contactSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب (حرفان على الأقل)'),
  email: z.string().email('بريد إلكتروني غير صحيح'),
  phone: z.string().optional(),
  subject: z.string().min(3, 'الموضوع مطلوب'),
  message: z.string().min(10, 'الرسالة قصيرة جداً (10 أحرف على الأقل)'),
});

type ContactFormValues = z.infer<typeof contactSchema>;

const contactInfo = [
  {
    icon: <PhoneIcon />,
    title: 'الهاتف',
    lines: ['+249 187 777 (الخط الساخن)', '+249 183 123 456 (المكتب الرئيسي)'],
  },
  {
    icon: <MailIcon />,
    title: 'البريد الإلكتروني',
    lines: ['info@nqp.gov.sd', 'support@nqp.gov.sd'],
  },
  {
    icon: <LocationOnIcon />,
    title: 'المقر الرئيسي',
    lines: ['الخرطوم - شارع النيل', 'مباني وزارة الصحة الاتحادية'],
  },
];

const socialLinks = [
  { label: 'فيسبوك', icon: <FacebookIcon />, url: 'https://facebook.com' },
  { label: 'إكس', icon: <XIcon />, url: 'https://x.com' },
  { label: 'يوتيوب', icon: <YouTubeIcon />, url: 'https://youtube.com' },
  { label: 'إنستغرام', icon: <InstagramIcon />, url: 'https://instagram.com' },
];

const mapEmbedUrl =
  'https://maps.google.com/maps?q=Khartoum%2C%20Sudan&z=11&output=embed&hl=ar';

const ContactPage = () => {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', phone: '', subject: '', message: '' },
  });

  const onSubmit = async (values: ContactFormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      await sendContactMessage(values);
      setSubmitted(true);
      notifySuccess('تم استلام رسالتك بنجاح، سنرد عليك قريباً.');
    } catch {
      setError('تعذر إرسال الرسالة، حاول مرة أخرى لاحقاً.');
      notifyError('تعذر إرسال الرسالة، حاول مرة أخرى لاحقاً.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <PageHeader
        title="اتصل بنا"
        subtitle="نحن هنا للإجابة عن استفساراتك حول خدمات الحجر الصحي ومتطلبات السفر"
        eyebrow="قنوات التواصل"
      />

      <Grid container spacing={3}>
        {/* Contact form */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              {submitted ? (
                <Stack alignItems="center" sx={{ py: 6, textAlign: 'center' }}>
                  <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    تم استلام رسالتك
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    شكراً لتواصلك معنا، سيقوم فريقنا بالرد عليك في أقرب وقت ممكن.
                  </Typography>
                  <Button
                    variant="outlined"
                    sx={{ mt: 3 }}
                    onClick={() => {
                      setSubmitted(false);
                    }}
                  >
                    إرسال رسالة أخرى
                  </Button>
                </Stack>
              ) : (
                <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 2.5 }}>
                    نموذج التواصل
                  </Typography>
                  {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {error}
                    </Alert>
                  )}
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        {...register('name')}
                        label="الاسم الكامل"
                        fullWidth
                        autoComplete="name"
                        error={!!errors.name}
                        helperText={errors.name?.message}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        {...register('email')}
                        label="البريد الإلكتروني"
                        type="email"
                        fullWidth
                        autoComplete="email"
                        error={!!errors.email}
                        helperText={errors.email?.message}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        {...register('phone')}
                        label="رقم الهاتف (اختياري)"
                        fullWidth
                        autoComplete="tel"
                        error={!!errors.phone}
                        helperText={errors.phone?.message}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        {...register('subject')}
                        label="الموضوع"
                        fullWidth
                        error={!!errors.subject}
                        helperText={errors.subject?.message}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        {...register('message')}
                        label="الرسالة"
                        fullWidth
                        multiline
                        minRows={5}
                        error={!!errors.message}
                        helperText={errors.message?.message}
                      />
                    </Grid>
                  </Grid>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
                    disabled={submitting}
                    sx={{ mt: 3, minWidth: 160 }}
                  >
                    {submitting ? 'جارٍ الإرسال…' : 'إرسال الرسالة'}
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Contact info */}
        <Grid item xs={12} md={5}>
          <Stack spacing={3}>
            <Stack spacing={2}>
              {contactInfo.map((info) => (
                <Card key={info.title} sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: 2.5, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Box
                      sx={{
                        width: 46,
                        height: 46,
                        borderRadius: 3,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: 'primary.light',
                        color: 'primary.main',
                        flexShrink: 0,
                      }}
                    >
                      {info.icon}
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {info.title}
                      </Typography>
                      {info.lines.map((line) => (
                        <Typography key={line} variant="body2" color="text.secondary" dir="ltr" textAlign="right">
                          {line}
                        </Typography>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>

            {/* Map */}
            <Card sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              <Box sx={{ p: 2.5, pb: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                  مواقع المكاتب
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  المقر الرئيسي - الخرطوم
                </Typography>
              </Box>
              <Box
                component="iframe"
                title="خريطة مواقع المكاتب"
                src={mapEmbedUrl}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                sx={{
                  width: '100%',
                  height: 260,
                  border: 0,
                  display: 'block',
                }}
              />
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Social media */}
      <Card sx={{ mt: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 3,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'primary.dark',
                  color: '#fff',
                }}
              >
                <SendIcon />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  تابعنا على
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  آخر الأخبار والتنبيهات الصحية عبر قنواتنا الرسمية
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center">
              {socialLinks.map((social) => (
                <Tooltip key={social.label} title={social.label} placement="top">
                  <IconButton
                    component="a"
                    href={social.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.label}
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 2.5,
                      color: 'primary.main',
                      border: '1px solid',
                      borderColor: 'primary.light',
                      transition:
                        'transform 450ms cubic-bezier(0.22,1,0.36,1), box-shadow 300ms ease, background 300ms ease',
                      '&:hover': {
                        transform: 'rotate(-10deg) scale(1.12) translateY(-4px)',
                        bgcolor: 'primary.main',
                        color: '#fff',
                        boxShadow: '0 12px 24px rgba(14,138,114,0.35)',
                      },
                      '& .MuiSvgIcon-root': { fontSize: 24 },
                    }}
                  >
                    {social.icon}
                  </IconButton>
                </Tooltip>
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ContactPage;
