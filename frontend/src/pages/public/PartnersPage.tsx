import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import VerifiedIcon from '@mui/icons-material/Verified';
import SendIcon from '@mui/icons-material/Send';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import AirplanemodeActiveIcon from '@mui/icons-material/AirplanemodeActive';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import ListAltIcon from '@mui/icons-material/ListAlt';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ApiIcon from '@mui/icons-material/Api';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { PageHeader } from '../../components/common';
import { submitCarrierRegistration } from '../../api/endpoints/public';
import type { CarrierRegistrationResult } from '../../api/endpoints/public';
import { notifyError, notifySuccess } from '../../utils/toast';

const PartnersPage = () => {
  const { t } = useTranslation();
  const [scopes, setScopes] = useState<string[]>(['flights']);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CarrierRegistrationResult | null>(null);

  const partnerSchema = useMemo(
    () => z.object({
      company_name: z.string().min(2, t('public.اسم الشركة مطلوب')),
      iata_code: z.string().toUpperCase().regex(/^[A-Z0-9]{2,3}$/, t('public.كود IATA غير صحيح (سطرتان أو ثلاثة)')).optional().or(z.literal('')),
      icao_code: z.string().toUpperCase().regex(/^[A-Z]{3,4}$/, t('public.كود ICAO غير صحيح (3–4 أحرف)')).optional().or(z.literal('')),
      contact_name: z.string().min(3, t('public.اسم جهة الاتصال مطلوب')),
      email: z.string().email(t('public.بريد إلكتروني غير صحيح')),
      phone: z.string().optional(),
      address: z.string().optional(),
      documents_url: z.string().url(t('public.رابط غير صالح')).optional().or(z.literal('')),
    }),
    [t],
  );
  type PartnerFormValues = z.infer<typeof partnerSchema>;

  const scopeOptions = useMemo(
    () => [
      { value: 'flights', label: t('public.الرحلات والكشوف والتنبيهات (flights)'), icon: <ListAltIcon /> },
      { value: 'health_events', label: t('public.الإبلاغ عن الأحداث الصحية على الرحلات (health_events)'), icon: <HealthAndSafetyIcon /> },
    ],
    [t],
  );

  const benefits = useMemo(
    () => [
      {
        icon: <ListAltIcon />,
        title: t('public.رفع كشوف المسافرين'),
        desc: t('public.إرسال كشوف الركاب إلكترونياً وتلقي تأكيد المعالجة الآلية دون وسيط بشري'),
      },
      {
        icon: <NotificationsActiveIcon />,
        title: t('public.تنبيهات صحية لحظية'),
        desc: t('public.استلام التنبيهات الصحية والإرشادات المحدثة لكل رحلة وجهة'),
      },
      {
        icon: <HealthAndSafetyIcon />,
        title: t('public.أحداث صحية على الرحلات'),
        desc: t('public.الإبلاغ الفوري عن الحالات الصحية المشتبهة أثناء الرحلة وتصعيدها إلى غرفة العمليات'),
      },
      {
        icon: <ApiIcon />,
        title: t('public.بوابة API موثّقة'),
        desc: t('public.تكامل آلي آمن (X-API-Key) مع سجل تدقيق مركزي وحدود استخدام للامتثال'),
      },
    ],
    [t],
  );

  const transportTypes = useMemo(
    () => [
      { icon: <AirplanemodeActiveIcon />, label: t('public.الجوي') },
      { icon: <DirectionsBoatIcon />, label: t('public.البحري') },
      { icon: <DirectionsBusIcon />, label: t('public.البري') },
    ],
    [t],
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerSchema),
  });

  const toggleScope = (value: string) => {
    setScopes((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const onSubmit = async (values: PartnerFormValues) => {
    setSubmitting(true);
    try {
      const response = await submitCarrierRegistration({
        company_name: values.company_name,
        iata_code: values.iata_code || undefined,
        icao_code: values.icao_code || undefined,
        contact_name: values.contact_name,
        email: values.email,
        phone: values.phone || undefined,
        address: values.address || undefined,
        documents: values.documents_url ? [values.documents_url] : [],
        requested_scopes: scopes,
      });
      const d = response.data?.data ?? response.data;
      setResult(d as CarrierRegistrationResult);
      reset();
      setScopes(['flights']);
      notifySuccess(t('public.تم إرسال طلب التسجيل وسيُراجع من قبل الإدارة'));
    } catch {
      notifyError(t('public.تعذّر إرسال الطلب — تأكد من اكتمال البيانات وحدّث الصفحة'));
    } finally {
      setSubmitting(false);
    }
  };

  const copyReference = () => {
    if (result?.id) void navigator.clipboard.writeText(result.id).then(() => notifySuccess(t('public.تم نسخ رقم الطلب')));
  };

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <PageHeader
        title={t('public.بوابة الشركات')}
        subtitle={t('public.حوار آلي موحّد مع شركات النقل الجوي والبحري والبري القومية والإقليمية والدولية')}
        eyebrow={t('public.دوائر النقل')}
      />

      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" sx={{ mb: 4 }}>
        {transportTypes.map((tt) => (
          <Chip key={tt.label} icon={tt.icon} label={`${t('public.شركات النقل')} ${tt.label}`} variant="outlined" />
        ))}
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Stack spacing={2}>
            {benefits.map((b) => (
              <Card key={b.title} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', p: 2, borderRadius: 3 }}>
                <Box sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 2, bgcolor: 'primary.main', color: 'primary.contrastText',
                  width: 44, height: 44, flexShrink: 0,
                }}>
                  {b.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{b.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{b.desc}</Typography>
                </Box>
              </Card>
            ))}
            <Alert severity="info" sx={{ borderRadius: 2 }} icon={<Diversity3Icon />}>
              {t('public.يُراجع طلب التسجيل من إدارة المنصة قبل اعتماد الشركة وتفعيل مفاتيح الوصول')}</Alert>
          </Stack>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                {result ? t('public.تم استلام طلب التسجيل') : t('public.نموذج تسجيل شركة نقل')}
              </Typography>

              {result && (
                <Alert severity="success" icon={<VerifiedIcon />} sx={{ mb: 3, borderRadius: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{result.company_name}</Typography>
                      <Typography variant="body2">{t('public.رقم الطلب')}: {result.id} — {t('public.الحالة')}: {t('public.بانتظار المراجعة')}</Typography>
                    </Box>
                    <Button size="small" startIcon={<ContentCopyIcon />} onClick={copyReference}>
                      {t('public.نسخ رقم الطلب')}</Button>
                  </Stack>
                </Alert>
              )}

              <Stack spacing={2} component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                <TextField label={t('public.اسم الشركة *')} fullWidth {...register('company_name')} error={!!errors.company_name} helperText={errors.company_name?.message} />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField label={t('public.كود IATA')} fullWidth {...register('iata_code')} error={!!errors.iata_code} helperText={errors.iata_code?.message} placeholder={t('public.مثال J4')} />
                  <TextField label={t('public.كود ICAO')} fullWidth {...register('icao_code')} error={!!errors.icao_code} helperText={errors.icao_code?.message} placeholder={t('public.مثال BDR')} />
                </Stack>
                <TextField label={t('public.اسم جهة الاتصال *')} fullWidth {...register('contact_name')} error={!!errors.contact_name} helperText={errors.contact_name?.message} />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField label={t('public.البريد الإلكتروني *')} type="email" fullWidth {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
                  <TextField label={t('public.رقم الجوال')} fullWidth {...register('phone')} />
                </Stack>
                <TextField label={t('public.العنوان')} fullWidth {...register('address')} />
                <TextField label={t('public.رابط مستند إثبات (سجل أو شهادة) — اختياري')} fullWidth {...register('documents_url')} error={!!errors.documents_url} helperText={errors.documents_url?.message} placeholder="https://…" />

                <Divider />

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{t('public.الصلاحيات المطلوبة')}</Typography>
                  <Stack spacing={0.5}>
                    {scopeOptions.map((s) => (
                      <FormControlLabel
                        key={s.value}
                        control={
                          <Checkbox
                            checked={scopes.includes(s.value)}
                            onChange={() => toggleScope(s.value)}
                          />
                        }
                        label={s.label}
                      />
                    ))}
                  </Stack>
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  startIcon={submitting ? <CircularProgress size={18} /> : <SendIcon />}
                  disabled={submitting}
                >
                  {submitting ? t('public.جارٍ الإرسال…') : t('public.إرسال طلب التسجيل')}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default PartnersPage;