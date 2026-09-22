import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import LibraryAddCheckIcon from '@mui/icons-material/LibraryAddCheck';
import {
  createRecord,
  getBatches,
  getSites,
  getVaccines,
  issueCertificate,
  searchTraveler,
} from '../../api/endpoints/vaccination';
import { PageHeader, EmptyState } from '../../components/common';
import { useAuth } from '../../hooks/useAuth';
import type {
  AssessmentItem,
  TravelerBrief,
  TravelerSummary,
  Vaccine,
  VaccineBatch,
  VaccinationCertificate,
  VaccinationSite,
} from '../../types/vaccination';
import { formatDate } from '../../utils/formatters';
import { extractErrorMessage, notifyError, notifySuccess } from '../../utils/toast';

const DOSE_TYPES = [
  { value: 'FIRST', label: 'الجرعة الأولى' },
  { value: 'SECOND', label: 'الجرعة الثانية' },
  { value: 'THIRD', label: 'الجرعة الثالثة' },
  { value: 'BOOSTER', label: 'جرعة تنشيطية' },
];

const assessmentTone: Record<string, 'success' | 'warning' | 'error'> = {
  COMPLETE: 'success',
  PARTIAL: 'warning',
  MISSING: 'error',
};

const assessmentLabel: Record<string, string> = {
  COMPLETE: 'مكتمل',
  PARTIAL: 'ناقص',
  MISSING: 'مطلوب',
};

const RegisterVaccinationPage = () => {
  const { user } = useAuth();
  const [passport, setPassport] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [traveler, setTraveler] = useState<TravelerBrief | null>(null);
  const [summary, setSummary] = useState<TravelerSummary | null>(null);
  const [assessment, setAssessment] = useState<AssessmentItem[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [batches, setBatches] = useState<VaccineBatch[]>([]);
  const [sites, setSites] = useState<VaccinationSite[]>([]);

  const [form, setForm] = useState({
    vaccine: '',
    batch: '',
    dose_type: 'FIRST',
    dose_number: '1',
    administered_at: new Date().toISOString().slice(0, 10),
    site: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<VaccinationCertificate | null>(null);
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      getVaccines({ page_size: 200, ordering: 'order' }),
      getBatches({ page_size: 200, status: 'ACTIVE' }),
      getSites({ page_size: 200 }),
    ]).then(([v, b, s]) => {
      if (v.status === 'fulfilled') setVaccines(v.value.data.data.results ?? []);
      if (b.status === 'fulfilled') setBatches(b.value.data.data.results ?? []);
      if (s.status === 'fulfilled') setSites(s.value.data.data.results ?? []);
    });
  }, []);

  const eligibleBatches = useMemo(
    () => batches.filter((b) => !form.vaccine || b.vaccine === form.vaccine),
    [batches, form.vaccine],
  );

  const doSearch = () => {
    const q = passport.trim().toUpperCase();
    if (!q) return;
    setLookupLoading(true);
    setLookupError(null);
    setSearched(false);
    setSavedRecordId(null);
    setCertificate(null);
    searchTraveler(q)
      .then((res) => {
        const d = res.data.data;
        if (!d.traveler) {
          setTraveler(null);
          setSummary(null);
          setAssessment([]);
          setLookupError(d.message || 'لم يتم العثور على مسافر بهذا الجواز');
          return;
        }
        setTraveler(d.traveler);
        setSummary(d.summary ?? null);
        setAssessment(d.assessment ?? []);
        setLookupError(null);
      })
      .catch((err) => {
        setTraveler(null);
        setSummary(null);
        setAssessment([]);
        setLookupError(extractErrorMessage(err, 'تعذر البحث عن المسافر'));
      })
      .finally(() => {
        setSearched(true);
        setLookupLoading(false);
      });
  };

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: event.target.value }));

  const handleSubmit = async () => {
    if (!traveler || saving) return;
    if (!form.vaccine) {
      notifyError('اختر اللقاح');
      return;
    }
    setSaving(true);
    try {
      const res = await createRecord({
        passport_number: traveler.passport_number,
        vaccine: form.vaccine,
        batch: form.batch || undefined,
        dose_type: form.dose_type,
        dose_number: Number(form.dose_number),
        administered_at: form.administered_at,
        site: form.site || undefined,
        vaccinator_id: (user as { id?: string } | null)?.id,
        notes: form.notes,
      });
      setSavedRecordId(res.data.data.id);
      notifySuccess('تم تسجيل الجرعة');
    } catch (err) {
      notifyError(extractErrorMessage(err, 'تعذر تسجيل الجرعة'));
    } finally {
      setSaving(false);
    }
  };

  const handleIssue = async () => {
    if (!savedRecordId || issuing) return;
    setIssuing(true);
    try {
      const res = await issueCertificate(savedRecordId);
      setCertificate(res.data.data);
      notifySuccess('صدرت الشهادة بنجاح');
    } catch (err) {
      notifyError(extractErrorMessage(err, 'تعذر إصدار الشهادة'));
    } finally {
      setIssuing(false);
    }
  };

  return (
    <>
      <PageHeader
        title="تسجيل جرعة تطعيم"
        subtitle="ابحث عن المسافر بجواز السفر، ثم سجّل الجرعة لتصدر الشهادة الدولية عند الاكتمال"
        eyebrow="بوابة التطعيم الدولي"
      />

      <Card sx={{ borderRadius: 4, border: '1px solid rgba(16,40,34,0.07)', p: { xs: 2, md: 3 }, mb: 3 }}>
        <Stack spacing={2}>
          <Typography sx={{ fontWeight: 800 }}>البحث عن المسافر</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              size="medium"
              label="رقم جواز السفر"
              placeholder="مثال: SDN123456"
              value={passport}
              onChange={(e) => setPassport(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') doSearch();
              }}
              dir="ltr"
              sx={{ '& input': { fontFamily: 'monospace' } }}
            />
            <Button
              variant="contained"
              startIcon={lookupLoading ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
              onClick={doSearch}
              disabled={!passport.trim() || lookupLoading}
              sx={{ fontWeight: 700, textTransform: 'none', px: 3 }}
            >
              بحث
            </Button>
          </Stack>
          {lookupError && searched && (
            <Alert severity="warning" sx={{ borderRadius: 2.5 }}>{lookupError}</Alert>
          )}
        </Stack>
      </Card>

      {traveler && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={4}>
            <Card sx={{ borderRadius: 4, border: '1px solid rgba(16,40,34,0.07)', p: { xs: 2, md: 3 } }}>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 3,
                      display: 'grid',
                      placeItems: 'center',
                      color: 'primary.main',
                      bgcolor: 'primary.light',
                    }}
                  >
                    <PersonIcon />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 800 }}>{traveler.full_name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      {traveler.passport_number}
                    </Typography>
                  </Box>
                </Stack>
                <Divider />
                <Typography variant="body2">
                  الجنسية: <b>{traveler.country_name || '—'}</b>
                </Typography>
                <Typography variant="body2">
                  تاريخ الميلاد: <b>{traveler.date_of_birth ? formatDate(traveler.date_of_birth) : '—'}</b>
                </Typography>
                {traveler.medical_file_no && (
                  <Typography variant="body2">
                    الملف الصحي: <b>{traveler.medical_file_no}</b>
                  </Typography>
                )}

                <Typography sx={{ fontWeight: 800, mt: 1 }}>تقييم احتياج التطعيم</Typography>
                <Stack spacing={1}>
                  {assessment.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      لا توجد قواعد تطعيم إلزامية مطبقة على هذا المسافر.
                    </Typography>
                  ) : (
                    assessment.map((a) => (
                      <Stack key={a.vaccine_id} direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {a.vaccine_name_ar}
                        </Typography>
                        <Chip
                          size="small"
                          label={`${assessmentLabel[a.status] || a.status} · ${a.doses_given}/${a.doses_required}`}
                          color={assessmentTone[a.status]}
                          sx={{ fontWeight: 700 }}
                        />
                      </Stack>
                    ))
                  )}
                </Stack>
              </Stack>
            </Card>
          </Grid>

          <Grid item xs={12} lg={8}>
            <Card sx={{ borderRadius: 4, border: '1px solid rgba(16,40,34,0.07)', p: { xs: 2, md: 3 }, mb: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <VaccinesIcon color="primary" />
                <Typography sx={{ fontWeight: 800 }}>بيانات الجرعة</Typography>
              </Stack>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField select fullWidth label="اللقاح" value={form.vaccine} onChange={update('vaccine')}>
                    <MenuItem value="">— اختر اللقاح —</MenuItem>
                    {vaccines.map((v) => (
                      <MenuItem key={v.id} value={v.id}>
                        {v.name_ar} ({v.code})
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField select fullWidth label="التشغيلة (LOT)" value={form.batch} onChange={update('batch')}>
                    <MenuItem value="">بدون تشغيلة</MenuItem>
                    {eligibleBatches.map((b) => (
                      <MenuItem key={b.id} value={b.id}>
                        {b.lot_number} — متاح {b.available_quantity}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField select fullWidth label="نوع الجرعة" value={form.dose_type} onChange={update('dose_type')}>
                    {DOSE_TYPES.map((d) => (
                      <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    label="رقم الجرعة"
                    type="number"
                    inputProps={{ min: 1, max: 20 }}
                    value={form.dose_number}
                    onChange={update('dose_number')}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label="تاريخ التطعيم"
                    type="date"
                    value={form.administered_at}
                    onChange={update('administered_at')}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField select fullWidth label="مكان التطعيم" value={form.site} onChange={update('site')}>
                    <MenuItem value="">— بدون مكان —</MenuItem>
                    {sites.map((s) => (
                      <MenuItem key={s.id} value={s.id}>{s.name_ar}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="ملاحظات"
                    value={form.notes}
                    onChange={update('notes')}
                  />
                </Grid>
              </Grid>
              <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <LibraryAddCheckIcon />}
                  onClick={handleSubmit}
                  disabled={saving || !form.vaccine}
                  sx={{ fontWeight: 700, textTransform: 'none' }}
                >
                  تسجيل الجرعة
                </Button>
              </Stack>
            </Card>

            {savedRecordId && !certificate && (
              <Alert
                icon={<WorkspacePremiumIcon />}
                severity="success"
                sx={{ borderRadius: 2.5 }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    startIcon={issuing ? <CircularProgress size={16} color="inherit" /> : <WorkspacePremiumIcon />}
                    onClick={handleIssue}
                    disabled={issuing}
                    sx={{ fontWeight: 700 }}
                  >
                    إصدار شهادة تطعيم دولية
                  </Button>
                }
              >
                تم تسجيل الجرعة بنجاح. يمكنك الآن إصدار الشهادة الدولية لهذه الجرعة.
              </Alert>
            )}

            {certificate && (
              <Alert severity="success" sx={{ borderRadius: 2.5 }}>
                <Typography sx={{ fontWeight: 700 }}>
                  صدرت الشهادة {certificate.certificate_number} — سارية حتى {formatDate(certificate.valid_until)}
                </Typography>
                <Typography variant="caption">
                  رابط التحقق: {window.location.origin}{certificate.verification_path || `/verify/vaccination/${certificate.certificate_number}`}
                </Typography>
              </Alert>
            )}

            {summary && summary.records.length > 0 && (
              <Card sx={{ borderRadius: 4, border: '1px solid rgba(16,40,34,0.07)', p: { xs: 2, md: 3 }, mt: 3 }}>
                <Typography sx={{ fontWeight: 800, mb: 1.5 }}>سجل الجرعات السابقة</Typography>
                <Stack spacing={1}>
                  {summary.records.map((r) => (
                    <Stack key={r.id} direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{r.vaccine_name_ar}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          جرعة {r.dose_number} · {r.dose_type} · {formatDate(r.administered_at)}
                        </Typography>
                      </Box>
                      <Chip size="small" label={r.lot_number || 'بدون LOT'} variant="outlined" />
                    </Stack>
                  ))}
                </Stack>
              </Card>
            )}

            {summary && summary.certificates.length > 0 && (
              <Card sx={{ borderRadius: 4, border: '1px solid rgba(16,40,34,0.07)', p: { xs: 2, md: 3 }, mt: 3 }}>
                <Typography sx={{ fontWeight: 800, mb: 1.5 }}>شهادات سارية</Typography>
                <Stack spacing={1}>
                  {summary.certificates.map((c) => (
                    <Stack key={c.id} direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{c.vaccine_name_ar}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                          {c.certificate_number}
                        </Typography>
                      </Box>
                      <Chip size="small" label={`حتى ${formatDate(c.valid_until)}`} color="success" sx={{ fontWeight: 700 }} />
                    </Stack>
                  ))}
                </Stack>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {searched && !traveler && !lookupError && (
        <EmptyState
          icon={<PersonIcon sx={{ fontSize: 40, color: 'text.disabled' }} />}
          title="لا يوجد مسافر"
          description="ابحث برقم جواز سفر صحيح للبدء."
        />
      )}
    </>
  );
};

export default RegisterVaccinationPage;