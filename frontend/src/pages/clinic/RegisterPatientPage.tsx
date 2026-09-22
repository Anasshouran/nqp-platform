import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { PageHeader } from '../../components/common';
import { getClinics, getPatientQr, registerWalkInPatient, searchPatients } from '../../api/endpoints/clinic';
import { getCountries } from '../../api/endpoints/public';
import type { Clinic, ClinicPatient } from '../../types/clinic';
import { extractErrorMessage, notifyError, notifySuccess } from '../../utils/toast';
import { GlassPanel, PersonAvatar, SectionHeader } from './ui';
import { useNavigate } from 'react-router-dom';

const RegisterPatientPage = () => {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [countries, setCountries] = useState<Array<{ code: string; name_ar: string }>>([]);

  const [form, setForm] = useState<Record<string, string>>({
    passport_number: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    nationality: '',
    phone: '',
    email: '',
    notes: '',
  });

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClinicPatient[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [qr, setQr] = useState<{ qr_png: string; medical_file_no: string } | null>(null);
  const [registered, setRegistered] = useState<string | null>(null);

  useEffect(() => {
    getClinics({ page_size: 200, is_active: true })
      .then((res) => {
        setClinics(res.data.data.results);
        setClinic(res.data.data.results[0] ?? null);
      })
      .catch((err) => notifyError(extractErrorMessage(err, 'تعذر تحميل العيادات')));
    getCountries()
      .then((res) => setCountries(res.data.data))
      .catch(() => undefined);
  }, []);

  const countryOptions = useMemo(() => countries, [countries]);

  const doSearch = () => {
    if (!query.trim()) return;
    setSearching(true);
    searchPatients(query.trim())
      .then((res) => setResults(res.data.data))
      .catch((err) => notifyError(extractErrorMessage(err, 'تعذر البحث عن المريض')))
      .finally(() => setSearching(false));
  };

  const prefill = (p: ClinicPatient) => {
    setForm((f) => ({
      ...f,
      passport_number: p.passport_number.startsWith('UNK-') ? '' : p.passport_number,
      first_name: p.first_name === 'غير محدد' ? '' : p.first_name,
      last_name: p.last_name === 'غير محدد' ? '' : p.last_name,
      date_of_birth: p.date_of_birth ?? '',
      nationality: p.nationality_name ?? '',
      phone: p.phone ?? '',
    }));
    setResults([]);
    setQuery('');
  };

  const canSubmit =
    Boolean(clinic) &&
    form.first_name.trim() !== '' &&
    form.last_name.trim() !== '' &&
    form.date_of_birth !== '' &&
    form.passport_number.trim() !== '';

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmitting(true);
    registerWalkInPatient({
      ...form,
      clinic: clinic!.id,
      passport_number: form.passport_number.trim().toUpperCase(),
    })
      .then((res) => {
        const traveler = res.data.data.traveler;
        setRegistered(res.data.data.referral.id);
        notifySuccess(`تم تسجيل ${traveler.full_name} برقم ملف ${traveler.medical_file_no}`);
        getPatientQr(traveler.id)
          .then((qrRes) => setQr(qrRes.data.data))
          .catch(() => undefined);
      })
      .catch((err) => notifyError(extractErrorMessage(err, 'تعذر تسجيل المريض')))
      .finally(() => setSubmitting(false));
  };

  return (
    <Box>
      <PageHeader
        title="تسجيل حالة جديدة"
        subtitle="تسجيل الحضور المباشر أو استدعاء ملف مريض سابق لعيادة الحجر الصحي"
        eyebrow="عيادة الحجر الصحي"
      />
      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={6}>
          <GlassPanel accent="linear-gradient(90deg, #0e7490, transparent)">
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              <SectionHeader icon={<PersonSearchIcon fontSize="small" />} title="البحث عن مريض سابق" />
              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="رقم الجواز، رقم الملف MR-… أو الاسم"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                />
                <Button variant="contained" onClick={doSearch} disabled={searching || !query.trim()}>
                  بحث
                </Button>
              </Stack>
              {results.length > 0 && (
                <Stack spacing={1} sx={{ mt: 2 }}>
                  {results.map((p) => (
                    <Box
                      key={p.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 2.4,
                        border: '1px solid rgba(16,40,34,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1.5,
                        bgcolor: 'rgba(255,255,255,0.7)',
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                        <PersonAvatar name={p.full_name} size={38} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 14 }} noWrap>
                            {p.full_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                            {p.medical_file_no || '—'} · {p.passport_number}
                          </Typography>
                        </Box>
                      </Stack>
                      <Button size="small" onClick={() => prefill(p)}>
                        تحديد
                      </Button>
                    </Box>
                  ))}
                </Stack>
              )}
              {searching && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  جاري البحث…
                </Typography>
              )}
            </Box>
          </GlassPanel>
        </Grid>

        <Grid item xs={12} lg={6}>
          <GlassPanel accent="linear-gradient(90deg, #0c7f6a, transparent)">
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              <SectionHeader icon={<HowToRegIcon fontSize="small" />} title="بيانات الحالة الجديدة" />
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    size="small"
                    label="رقم الجواز *"
                    fullWidth
                    value={form.passport_number}
                    onChange={(e) => setForm((f) => ({ ...f, passport_number: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    size="small"
                    label="الاسم الأول *"
                    fullWidth
                    value={form.first_name}
                    onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    size="small"
                    label="اسم العائلة *"
                    fullWidth
                    value={form.last_name}
                    onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    size="small"
                    type="date"
                    label="تاريخ الميلاد *"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={form.date_of_birth}
                    onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    size="small"
                    options={countryOptions}
                    getOptionLabel={(o) => o.name_ar}
                    onChange={(_, v) => setForm((f) => ({ ...f, nationality: v?.code ?? '' }))}
                    renderInput={(p) => <TextField {...p} label="الجنسية" fullWidth />}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    size="small"
                    options={clinics}
                    getOptionLabel={(c) => c.name_ar}
                    value={clinic}
                    onChange={(_, v) => setClinic(v)}
                    renderInput={(p) => <TextField {...p} label="وحدة العيادة" fullWidth />}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    size="small"
                    label="الجوال"
                    fullWidth
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={8}>
                  <TextField
                    size="small"
                    label="ملاحظات (سبب الحضور)"
                    fullWidth
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </Grid>
              </Grid>
              <Button
                fullWidth
                variant="contained"
                sx={{ mt: 2.5 }}
                onClick={handleSubmit}
                disabled={submitting || !canSubmit}
              >
                {submitting ? 'جاري التسجيل…' : 'تسجيل الحالة وإضافة للطابور'}
              </Button>
            </Box>
          </GlassPanel>
        </Grid>
      </Grid>

      {registered && (
        <Box sx={{ mt: 2 }}>
          <Chip
            label="تم إنشاء إحالة بانتظار القبول — يمكن قبولها من تبويب الإحالات"
            sx={{ bgcolor: 'rgba(12,127,106,0.12)', color: '#0a6b58', fontWeight: 700 }}
          />
        </Box>
      )}

      <Dialog open={Boolean(qr)} onClose={() => setQr(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center' }}>الملف الطبي الموحد</DialogTitle>
        <DialogContent>
          {qr && (
            <Stack alignItems="center" spacing={1.5} sx={{ pt: 1 }}>
              <img
                src={`data:image/png;base64,${qr.qr_png}`}
                alt="QR الملف الطبي"
                width={220}
                height={220}
                style={{ borderRadius: 12, border: '1px solid rgba(16,40,34,0.1)' }}
              />
              <Typography sx={{ fontWeight: 700 }}>{qr.medical_file_no}</Typography>
              <Box
                sx={{
                  p: 1,
                  width: '100%',
                  borderRadius: 2,
                  bgcolor: 'rgba(14,116,144,0.08)',
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  امسح الرمز لاستدعاء ملف المريض داخل وحدة العيادة
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button variant="outlined" onClick={() => navigate('/app/clinic?tab=referrals')}>
            الذهاب للإحالات
          </Button>
          <Button
            variant="contained"
            startIcon={<QrCode2Icon />}
            onClick={() => window.print()}
          >
            طباعة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RegisterPatientPage;