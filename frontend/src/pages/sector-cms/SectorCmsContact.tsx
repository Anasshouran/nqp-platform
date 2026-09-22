import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { FormEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import MailIcon from '@mui/icons-material/Mail';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { SectorPageShell, SectorHomeLink, useSectorSite, ErrorNotice, usePageTitle } from './SectorCmsShared';
import { getSectorPorts, getContactSettings, sendContactMessage } from '../../api/endpoints/public';
import type { PublicPort, ContactInfo } from '../../api/endpoints/public';

const contactLabel = (title: string, value?: string | null) => (
  <Stack direction="row" spacing={1.5} alignItems="flex-start">
    <Box sx={{ width: 42, height: 42, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: 'primary.main', bgcolor: 'primary.light', flexShrink: 0 }}>
      {title === 'العنوان' ? <LocationOnIcon /> : title === 'الهاتف' ? <PhoneIcon /> : title === 'البريد الإلكتروني' ? <MailIcon /> : <ScheduleIcon />}
    </Box>
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{title}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>{value || '— يُضاف عند الاعتماد —'}</Typography>
    </Box>
  </Stack>
);

const SectorCmsContact = () => {
  const { sector, slug, loading } = useSectorSite();
  const [ports, setPorts] = useState<PublicPort[]>([]);
  const [portsLoading, setPortsLoading] = useState(true);
  const [contact, setContact] = useState<ContactInfo>({});
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  usePageTitle('اتصل بنا');

  useEffect(() => {
    if (!sector) return;
    setPortsLoading(true);
    getSectorPorts(sector.id)
      .then((res) => setPorts(res.data.data))
      .catch(() => setPorts([]))
      .finally(() => setPortsLoading(false));
    getContactSettings(sector.id)
      .then(setContact)
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSending(true);
    try {
      await sendContactMessage({
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
      });
      setSent(true);
    } catch {
      setErrorMsg('تعذّر إرسال الرسالة. يرجى المحاولة لاحقاً.');
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setSent(false);
    setForm({ name: '', email: '', subject: '', message: '' });
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <SectorPageShell>
      <SectorHomeLink />
      <Typography component="h1" variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>اتصل بنا</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        تواصل مع {sector.name_ar} عبر القنوات الرسمية أو منافذ القطاع.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Stack spacing={2}>
            <Card>
              <CardContent sx={{ p: 3, display: 'grid', gap: 2 }}>
                {contactLabel('العنوان', contact.address)}
                {contactLabel('الهاتف', contact.official_phone)}
                {contactLabel('البريد الإلكتروني', contact.official_email)}
                {contactLabel('ساعات العمل', sector.working_hours || '— يُضاف عند الاعتماد —')}
                {contact.website && (
                  <a href={contact.website} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }} dir="ltr">
                      {contact.website}
                    </Typography>
                  </a>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>تواصل مباشر مع منافذ القطاع</Typography>
                {portsLoading ? (
                  <Skeleton variant="rounded" height={80} />
                ) : ports.filter((p) => p.phone || p.email).length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    لم تُسجّل بيانات تواصل مباشرة للمنافذ بعد. استخدم نموذج المراسلات أو صفحة المنافذ.
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {ports.filter((p) => p.phone || p.email).slice(0, 5).map((p) => (
                      <Box key={p.id}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{p.name_ar}</Typography>
                        <Stack spacing={0.25}>
                          {p.phone && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <PhoneIcon sx={{ fontSize: 14 }} /> <span dir="ltr">{p.phone}</span>
                            </Typography>
                          )}
                          {p.email && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <MailIcon sx={{ fontSize: 14 }} /> <span dir="ltr">{p.email}</span>
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    ))}
                    <Button component={Link} to={`/sector/${slug}/ports`} size="small" variant="outlined">
                      عرض جميع المنافذ
                    </Button>
                  </Stack>
                )}
              </CardContent>
            </Card>

            {sector.code === 'KHARTOUM' && (
              <Card sx={{ border: '1px dashed', borderColor: 'divider' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    بيانات أرشيفية — الحجر الصحي بمطار الخرطوم
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    سجلات منشورة لدى منظمة الطيران المدني الدولي (ICAO) ووثائق الطيران المدني السودانية؛
                    تُعرض كمادة مرجعية ولا تُعد بديلاً عن أرقام الاتصال الحالية حتى تعتمد إدارة القطاع
                    أرقاماً رسمية حديثة.
                  </Typography>
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      <b>سجل ICAO:</b> <span dir="ltr">+249 183 771 555</span> — فاكس <span dir="ltr">+249 183 780 265</span> — ص.ب 303
                    </Typography>
                    <Typography variant="body2">
                      <b>وثائق الطيران المدني السودانية:</b> <span dir="ltr">+249 183 776 269</span> — <span dir="ltr">healthquarantine@yahoo.com</span> (قديم)
                    </Typography>
                    <Typography variant="body2">
                      <b>فاكس وزارة الصحة الاتحادية:</b> <span dir="ltr">0024983769928</span> — ص.ب 303
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>نموذج المراسلات</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              أرسل استفسارك أو ملاحظاتك وسيتم الرد عبر البريد الإلكتروني.
            </Typography>
            {sent ? (
              <Box role="status" aria-live="polite" sx={{ textAlign: 'center', py: 5 }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 56, mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>تم إرسال رسالتك</Typography>
                <Typography variant="body2" color="text.secondary">
                  شكراً لتواصلك مع {sector.name_ar}. سنعاود الرد قريباً.
                </Typography>
                <Button variant="outlined" sx={{ mt: 3 }} onClick={resetForm}>
                  إرسال رسالة أخرى
                </Button>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField label="الاسم الكامل" required fullWidth value={form.name} onChange={set('name')} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="البريد الإلكتروني" type="email" required fullWidth value={form.email} onChange={set('email')} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="الموضوع" required fullWidth select value={form.subject} onChange={set('subject')}>
                      <MenuItem value="استفسار عام">استفسار عام</MenuItem>
                      <MenuItem value="سلامة الأغذية">سلامة الأغذية</MenuItem>
                      <MenuItem value="إجراءات السفر">إجراءات السفر</MenuItem>
                      <MenuItem value="الشهادات الصحية">الشهادات الصحية</MenuItem>
                      <MenuItem value="ملاحظات واقتراحات">ملاحظات واقتراحات</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="نص الرسالة" required fullWidth multiline minRows={5} value={form.message} onChange={set('message')} />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="error" sx={{ display: 'block', minHeight: 18 }}>
                      {errorMsg}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Button type="submit" variant="contained" size="large" disabled={sending} sx={{ mt: 1 }}>
                      {sending ? 'جارٍ الإرسال...' : 'إرسال الرسالة'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </SectorPageShell>
  );
};

export default SectorCmsContact;
