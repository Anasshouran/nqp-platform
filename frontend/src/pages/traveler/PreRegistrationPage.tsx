import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import Checkbox from '@mui/material/Checkbox';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LanguageIcon from '@mui/icons-material/Language';
import PersonIcon from '@mui/icons-material/Person';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SaveIcon from '@mui/icons-material/Save';
import { PageHeader } from '../../components/common';
import { registerTraveler, getTravelerQr } from '../../api/endpoints/travelers';
import { getCountries, getPorts } from '../../api/endpoints/public';
import type { PublicCountry, PublicPort } from '../../api/endpoints/public';
import type { TravelerQrResult } from '../../api/endpoints/travelers';
import { isValidEmail, isValidPhone } from '../../utils/validators';
import { setTravelerSession } from '../../utils/travelerSession';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import InputAdornment from '@mui/material/InputAdornment';
import PassportScanner from '../../components/traveler/PassportScanner';
import type { MrzResult } from '../../components/traveler/PassportScanner';

const STORAGE_KEY = 'nqp_traveler_pre';

interface WizardData {
  language: 'ar' | 'en';
  full_name: string;
  passport_number: string;
  date_of_birth: string;
  nationality: string;
  gender: string;
  origin_country: string;
  port_of_entry: string;
  transport_mode: string;
  flight_number: string;
  seat_number: string;
  arrival_date: string;
  transit_countries: string[];
  purpose: string;
  purpose_other: string;
  phone: string;
  whatsapp: string;
  email: string;
  emergency_phone: string;
  symptoms: Record<string, { has: boolean; temperature?: string; patient_name?: string; details?: string }>;
  consent: boolean;
}

const defaultData: WizardData = {
  language: 'ar',
  full_name: '',
  passport_number: '',
  date_of_birth: '',
  nationality: '',
  gender: '',
  origin_country: '',
  port_of_entry: '',
  transport_mode: 'AIR',
  flight_number: '',
  seat_number: '',
  arrival_date: '',
  transit_countries: [],
  purpose: '',
  purpose_other: '',
  phone: '',
  whatsapp: '',
  email: '',
  emergency_phone: '',
  symptoms: {
    fever: { has: false },
    headache: { has: false },
    body_pain: { has: false },
    vomiting: { has: false },
    diarrhea: { has: false },
    loss_of_appetite: { has: false },
    difficulty_swallowing: { has: false },
    bleeding: { has: false },
    contact_with_patient: { has: false },
    other_symptoms: { has: false },
  },
  consent: false,
};

const symptomQuestions: Array<{ key: string; label: string; hasExtra?: 'temperature' | 'patient_name' | 'details' }> = [
  { key: 'fever', label: 'حمى', hasExtra: 'temperature' },
  { key: 'headache', label: 'صداع' },
  { key: 'body_pain', label: 'ألم في الجسم' },
  { key: 'vomiting', label: 'قيء' },
  { key: 'diarrhea', label: 'إسهال' },
  { key: 'loss_of_appetite', label: 'فقدان الشهية' },
  { key: 'difficulty_swallowing', label: 'صعوبة في البلع' },
  { key: 'bleeding', label: 'نزيف' },
  { key: 'contact_with_patient', label: 'مخالطة مريض', hasExtra: 'patient_name' },
  { key: 'other_symptoms', label: 'أعراض أخرى', hasExtra: 'details' },
];

const purposeOptions = ['سياحة', 'عمل', 'زيارة', 'دراسة', 'عبور', 'دبلوماسي', 'منظمة دولية', 'آخر'];

const stepMeta = [
  { label: 'البدء', icon: <LanguageIcon /> },
  { label: 'البيانات الشخصية', icon: <PersonIcon /> },
  { label: 'بيانات الرحلة', icon: <FlightTakeoffIcon /> },
  { label: 'الغرض والتواصل', icon: <ContactMailIcon /> },
  { label: 'الإقرار الصحي', icon: <HealthAndSafetyIcon /> },
  { label: 'المراجعة والتأكيد', icon: <FactCheckIcon /> },
];

const computeRisk = (data: WizardData) => {
  let score = 0;
  const s = data.symptoms;
  if (s.fever.has) score += 10;
  if (s.headache.has) score += 5;
  if (s.body_pain.has) score += 5;
  if (s.vomiting.has) score += 5;
  if (s.diarrhea.has) score += 5;
  if (s.loss_of_appetite.has) score += 5;
  if (s.difficulty_swallowing.has) score += 10;
  if (s.bleeding.has) score += 15;
  if (s.contact_with_patient.has) score += 10;
  if (s.other_symptoms.has) score += 5;
  const temp = parseFloat(s.fever.temperature || '0');
  if (s.fever.has && temp > 38) score += 10;
  const level = score <= 10 ? 'منخفض' : score <= 30 ? 'متوسط' : 'مرتفع';
  return { score, level };
};

const PreRegistrationPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...defaultData, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return defaultData;
  });
  const [countries, setCountries] = useState<PublicCountry[]>([]);
  const [ports, setPorts] = useState<PublicPort[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ travelerId: string; passport: string; fullName: string } | null>(null);
  const [qr, setQr] = useState<TravelerQrResult | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleMrzResult = (mrz: MrzResult) => {
    const next: Partial<WizardData> = { passport_number: mrz.passportNumber };
    if (mrz.dateOfBirth) next.date_of_birth = mrz.dateOfBirth;
    if (mrz.sex) next.gender = mrz.sex === 'M' ? 'ذكر' : mrz.sex === 'F' ? 'أنثى' : next.gender;
    const nationalityCode = mrz.nationality;
    if (nationalityCode && countries.some((c) => c.code === nationalityCode)) {
      next.nationality = nationalityCode;
    }
    setData((prev) => ({ ...prev, ...next }));
  };

  useEffect(() => {
    getCountries()
      .then((response) => setCountries(response.data.data))
      .catch(() => setCountries([]));
    getPorts()
      .then((response) => setPorts(response.data.data))
      .catch(() => setPorts([]));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const update = <K extends keyof WizardData>(key: K, value: WizardData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const updateSymptom = (key: string, field: string, value: string | boolean) => {
    setData((prev) => ({
      ...prev,
      symptoms: {
        ...prev.symptoms,
        [key]: { ...prev.symptoms[key], [field]: value },
      },
    }));
  };

  const validateStep = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (data.full_name.trim().length < 2) e.full_name = 'يرجى إدخال الاسم الكامل.';
      if (!/^[A-Za-z0-9]{6,20}$/.test(data.passport_number.trim())) e.passport_number = 'رقم الجواز غير صحيح (6-20 حرفاً).';
      if (!data.date_of_birth) {
        e.date_of_birth = 'يرجى إدخال تاريخ الميلاد.';
      }
      if (!data.nationality) e.nationality = 'يرجى اختيار الجنسية.';
      if (!data.gender) e.gender = 'يرجى اختيار الجنس.';
    } else if (s === 2) {
      if (!data.origin_country) e.origin_country = 'يرجى اختيار دولة القدوم.';
      if (!data.port_of_entry) e.port_of_entry = 'يرجى اختيار منفذ الدخول.';
      if (!data.transport_mode) e.transport_mode = 'يرجى اختيار وسيلة النقل.';
      if (data.transport_mode === 'AIR' && !/^[A-Za-z0-9]{2,10}$/.test(data.flight_number.trim())) {
        e.flight_number = 'رقم الرحلة غير صحيح.';
      }
      if (!data.arrival_date) {
        e.arrival_date = 'يرجى إدخال تاريخ الوصول.';
      } else if (new Date(data.arrival_date) < new Date(new Date().toDateString())) {
        e.arrival_date = 'يرجى إدخال تاريخ وصول صحيح.';
      }
    } else if (s === 3) {
      if (!data.purpose) e.purpose = 'يرجى اختيار الغرض من الزيارة.';
      if (!isValidPhone(data.phone)) e.phone = 'رقم الهاتف غير صحيح.';
      if (data.email && !isValidEmail(data.email)) e.email = 'يرجى إدخال بريد إلكتروني صحيح.';
      if (!isValidPhone(data.emergency_phone)) e.emergency_phone = 'رقم الطوارئ غير صحيح.';
    } else if (s === 4) {
      for (const q of symptomQuestions) {
        if (data.symptoms[q.key].has) {
          if (q.hasExtra === 'temperature') {
            const t = parseFloat(data.symptoms[q.key].temperature || '');
            if (!t || t < 35 || t > 42) e[`temp_${q.key}`] = 'درجة الحرارة غير صحيحة (35-42).';
          }
          if (q.hasExtra === 'patient_name' && (data.symptoms[q.key].patient_name || '').trim().length < 2) {
            e[`name_${q.key}`] = 'يرجى إدخال اسم المريض.';
          }
        }
      }
    } else if (s === 5) {
      if (!data.consent) e.consent = 'يرجى الموافقة على صحة البيانات.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validateStep(step)) return;
    setStep((prev) => Math.min(prev + 1, 5));
  };

  const back = () => setStep((prev) => Math.max(prev - 1, 0));

  const submit = async () => {
    if (!validateStep(5)) return;
    setLoading(true);
    setSubmitError(null);
    const nameParts = data.full_name.trim().split(/\s+/);
    const first_name = nameParts[0] || '';
    const last_name = nameParts.slice(1).join(' ') || first_name;
    const risk = computeRisk(data);
    const payload = {
      passport_number: data.passport_number.trim().toUpperCase(),
      first_name,
      last_name,
      date_of_birth: data.date_of_birth,
      nationality: data.nationality,
      phone: data.phone,
      email: data.email || undefined,
      medical_history: {
        gender: data.gender,
        trip: {
          origin_country: data.origin_country,
          port_of_entry: data.port_of_entry,
          transport_mode: data.transport_mode,
          flight_number: data.flight_number,
          seat_number: data.seat_number,
          arrival_date: data.arrival_date,
          transit_countries: data.transit_countries,
        },
        purpose: data.purpose === 'آخر' ? `آخر - ${data.purpose_other}` : data.purpose,
        contact: {
          whatsapp: data.whatsapp,
          emergency_phone: data.emergency_phone,
        },
        health_declaration: {
          symptoms: data.symptoms,
          risk_score: risk.score,
          risk_level: risk.level,
        },
      },
    };
    try {
      const response = await registerTraveler(payload);
      const created = response.data.data as unknown as { id: string; passport_number: string; full_name: string };
      setResult({
        travelerId: created.id,
        passport: created.passport_number,
        fullName: created.full_name || data.full_name,
      });
      setTravelerSession({
        traveler_id: created.id,
        passport_number: created.passport_number,
        full_name: created.full_name || data.full_name,
        registration_status: 'PENDING_DOCUMENTS',
      });
      localStorage.removeItem(STORAGE_KEY);
      window.scrollTo({ top: 0 });
      setQrLoading(true);
      try {
        const qrResponse = await getTravelerQr(created.id);
        setQr(qrResponse.data.data);
      } catch {
        setQr(null);
      } finally {
        setQrLoading(false);
      }
    } catch {
      setSubmitError('حدث خطأ أثناء التسجيل، يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const risk = useMemo(() => computeRisk(data), [data]);

  const progress = ((step + 1) / 6) * 100;

  const renderStep = () => {
    if (step === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            بوابة التسجيل الصحي للسفر
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            لتسريع إجراءاتك عند الوصول، يرجى تعبئة الاستمارة الصحية قبل السفر.
          </Typography>
          <FormControl sx={{ minWidth: 200, mb: 3 }}>
            <InputLabel>اللغة</InputLabel>
            <Select
              value={data.language}
              label="اللغة"
              onChange={(e) => update('language', e.target.value as 'ar' | 'en')}
            >
              <MenuItem value="ar">العربية</MenuItem>
              <MenuItem value="en">English</MenuItem>
            </Select>
          </FormControl>
          <Box>
            <Button
              variant="contained"
              size="large"
              startIcon={<ArrowForwardIcon />}
              onClick={() => setStep(1)}
            >
              بدء التسجيل
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            جميع البيانات مشفرة وآمنة
          </Typography>
        </Box>
      );
    }

    if (step === 1) {
      return (
        <Stack spacing={2.5}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="الاسم الكامل"
                value={data.full_name}
                onChange={(e) => update('full_name', e.target.value)}
                fullWidth
                error={Boolean(errors.full_name)}
                helperText={errors.full_name}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="رقم جواز السفر"
                value={data.passport_number}
                onChange={(e) => update('passport_number', e.target.value.toUpperCase())}
                fullWidth
                dir="ltr"
                error={Boolean(errors.passport_number)}
                helperText={errors.passport_number}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button onClick={() => setScannerOpen(true)} startIcon={<DocumentScannerIcon />} size="small">
                        مسح
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="تاريخ الميلاد"
                type="date"
                value={data.date_of_birth}
                onChange={(e) => update('date_of_birth', e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                error={Boolean(errors.date_of_birth)}
                helperText={errors.date_of_birth}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={Boolean(errors.nationality)}>
                <InputLabel>الجنسية</InputLabel>
                <Select value={data.nationality} label="الجنسية" onChange={(e) => update('nationality', e.target.value)}>
                  {countries.map((country) => (
                    <MenuItem key={country.code} value={country.code}>
                      {country.name_ar || country.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.nationality && <Typography variant="caption" color="error">{errors.nationality}</Typography>}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl error={Boolean(errors.gender)}>
                <FormLabel>الجنس</FormLabel>
                <RadioGroup row value={data.gender} onChange={(e) => update('gender', e.target.value)}>
                  <FormControlLabel value="ذكر" control={<Radio />} label="ذكر" />
                  <FormControlLabel value="أنثى" control={<Radio />} label="أنثى" />
                </RadioGroup>
                {errors.gender && <Typography variant="caption" color="error">{errors.gender}</Typography>}
              </FormControl>
            </Grid>
          </Grid>
        </Stack>
      );
    }

    if (step === 2) {
      return (
        <Stack spacing={2.5}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={Boolean(errors.origin_country)}>
                <InputLabel>دولة القدوم</InputLabel>
                <Select value={data.origin_country} label="دولة القدوم" onChange={(e) => update('origin_country', e.target.value)}>
                  {countries.map((country) => (
                    <MenuItem key={country.code} value={country.code}>
                      {country.name_ar || country.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.origin_country && <Typography variant="caption" color="error">{errors.origin_country}</Typography>}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={Boolean(errors.port_of_entry)}>
                <InputLabel>منفذ الدخول</InputLabel>
                <Select value={data.port_of_entry} label="منفذ الدخول" onChange={(e) => update('port_of_entry', e.target.value)}>
                  {ports.map((port) => (
                    <MenuItem key={port.id} value={port.id}>
                      {port.name_ar} ({port.type})
                    </MenuItem>
                  ))}
                </Select>
                {errors.port_of_entry && <Typography variant="caption" color="error">{errors.port_of_entry}</Typography>}
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl error={Boolean(errors.transport_mode)}>
                <FormLabel>وسيلة النقل</FormLabel>
                <RadioGroup
                  row
                  value={data.transport_mode}
                  onChange={(e) => update('transport_mode', e.target.value)}
                >
                  <FormControlLabel value="AIR" control={<Radio />} label="طائرة" />
                  <FormControlLabel value="SEA" control={<Radio />} label="سفينة" />
                  <FormControlLabel value="LAND" control={<Radio />} label="بر" />
                </RadioGroup>
              </FormControl>
            </Grid>
            {data.transport_mode !== 'LAND' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label={data.transport_mode === 'SEA' ? 'رقم الرحلة / اسم السفينة' : 'رقم الرحلة'}
                  value={data.flight_number}
                  onChange={(e) => update('flight_number', e.target.value)}
                  fullWidth
                  dir="ltr"
                  error={Boolean(errors.flight_number)}
                  helperText={errors.flight_number}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                label={
                  data.transport_mode === 'SEA'
                    ? 'رقم المقعد / الكابينة (اختياري)'
                    : data.transport_mode === 'LAND'
                      ? 'رقم الحجز / الرحلة (اختياري)'
                      : 'رقم المقعد (اختياري)'
                }
                value={data.seat_number}
                onChange={(e) => update('seat_number', e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="تاريخ الوصول"
                type="date"
                value={data.arrival_date}
                onChange={(e) => update('arrival_date', e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                error={Boolean(errors.arrival_date)}
                helperText={errors.arrival_date}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>دول العبور (اختياري)</InputLabel>
                <Select
                  multiple
                  value={data.transit_countries}
                  label="دول العبور (اختياري)"
                  onChange={(e) => update('transit_countries', e.target.value as string[])}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((code) => (
                        <Chip
                          key={code}
                          label={countries.find((c) => c.code === code)?.name_ar || code}
                          size="small"
                          onDelete={() => update('transit_countries', data.transit_countries.filter((c) => c !== code))}
                        />
                      ))}
                    </Box>
                  )}
                >
                  {countries
                    .filter((c) => c.code !== data.origin_country)
                    .map((country) => (
                      <MenuItem key={country.code} value={country.code}>
                        {country.name_ar || country.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Stack>
      );
    }

    if (step === 3) {
      return (
        <Stack spacing={2.5}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl error={Boolean(errors.purpose)}>
                <FormLabel>الغرض من الزيارة</FormLabel>
                <RadioGroup row value={data.purpose} onChange={(e) => update('purpose', e.target.value)}>
                  {purposeOptions.map((option) => (
                    <FormControlLabel key={option} value={option} control={<Radio />} label={option} />
                  ))}
                </RadioGroup>
                {errors.purpose && <Typography variant="caption" color="error">{errors.purpose}</Typography>}
              </FormControl>
            </Grid>
            {data.purpose === 'آخر' && (
              <Grid item xs={12}>
                <TextField
                  label="وضّح الغرض"
                  value={data.purpose_other}
                  onChange={(e) => update('purpose_other', e.target.value)}
                  fullWidth
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                label="رقم الهاتف"
                value={data.phone}
                onChange={(e) => update('phone', e.target.value)}
                fullWidth
                dir="ltr"
                error={Boolean(errors.phone)}
                helperText={errors.phone}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="واتساب (اختياري)"
                value={data.whatsapp}
                onChange={(e) => update('whatsapp', e.target.value)}
                fullWidth
                dir="ltr"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="البريد الإلكتروني (اختياري)"
                value={data.email}
                onChange={(e) => update('email', e.target.value)}
                fullWidth
                dir="ltr"
                error={Boolean(errors.email)}
                helperText={errors.email}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="رقم الطوارئ (أقرب شخص)"
                value={data.emergency_phone}
                onChange={(e) => update('emergency_phone', e.target.value)}
                fullWidth
                dir="ltr"
                error={Boolean(errors.emergency_phone)}
                helperText={errors.emergency_phone}
              />
            </Grid>
          </Grid>
        </Stack>
      );
    }

    if (step === 4) {
      return (
        <Stack spacing={2}>
          <Alert severity="info">خلال آخر 21 يوماً، هل عانيت من أي من الأعراض التالية؟</Alert>
          {symptomQuestions.map((q, index) => (
            <Card key={q.key} variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                  <Typography sx={{ fontWeight: 700 }}>
                    {index + 1}. {q.label}؟
                  </Typography>
                  <RadioGroup
                    row
                    value={data.symptoms[q.key].has ? 'yes' : 'no'}
                    onChange={(e) => updateSymptom(q.key, 'has', e.target.value === 'yes')}
                  >
                    <FormControlLabel value="yes" control={<Radio />} label="نعم" />
                    <FormControlLabel value="no" control={<Radio />} label="لا" />
                  </RadioGroup>
                </Stack>
                {data.symptoms[q.key].has && q.hasExtra === 'temperature' && (
                  <TextField
                    label="درجة الحرارة (°C)"
                    type="number"
                    value={data.symptoms[q.key].temperature || ''}
                    onChange={(e) => updateSymptom(q.key, 'temperature', e.target.value)}
                    sx={{ mt: 1.5 }}
                    dir="ltr"
                    error={Boolean(errors[`temp_${q.key}`])}
                    helperText={errors[`temp_${q.key}`]}
                  />
                )}
                {data.symptoms[q.key].has && q.hasExtra === 'patient_name' && (
                  <TextField
                    label="اسم المريض"
                    value={data.symptoms[q.key].patient_name || ''}
                    onChange={(e) => updateSymptom(q.key, 'patient_name', e.target.value)}
                    sx={{ mt: 1.5 }}
                    fullWidth
                    error={Boolean(errors[`name_${q.key}`])}
                    helperText={errors[`name_${q.key}`]}
                  />
                )}
                {data.symptoms[q.key].has && q.hasExtra === 'details' && (
                  <TextField
                    label="تفاصيل الأعراض"
                    value={data.symptoms[q.key].details || ''}
                    onChange={(e) => updateSymptom(q.key, 'details', e.target.value)}
                    sx={{ mt: 1.5 }}
                    fullWidth
                    multiline
                    minRows={2}
                  />
                )}
              </CardContent>
            </Card>
          ))}
          <Alert severity={risk.level === 'مرتفع' ? 'error' : risk.level === 'متوسط' ? 'warning' : 'success'}>
            {risk.level === 'منخفض'
              ? `تصنيف المخاطر المبدئي: ${risk.level} (${risk.score} نقطة).`
              : risk.level === 'متوسط'
                ? `تصنيف المخاطر المبدئي: ${risk.level} (${risk.score} نقطة). قد تحتاج إلى فحص إضافي عند الوصول.`
                : `تصنيف المخاطر المبدئي: ${risk.level} (${risk.score} نقطة). يرجى التوجه إلى الفحص الطبي فور وصولك.`}
          </Alert>
        </Stack>
      );
    }

    if (step === 5) {
      const tripPort = ports.find((p) => p.id === data.port_of_entry);
      return (
        <Stack spacing={2.5}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                ملخص البيانات
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body1"><b>الاسم:</b> {data.full_name}</Typography>
                <Typography variant="body1"><b>الجواز:</b> {data.passport_number}</Typography>
                <Typography variant="body1">
                  <b>الرحلة:</b> {data.flight_number || '—'}، تاريخ {data.arrival_date}
                </Typography>
                <Typography variant="body1"><b>منفذ الدخول:</b> {tripPort?.name_ar || '—'}</Typography>
                <Typography variant="body1"><b>الغرض:</b> {data.purpose}{data.purpose === 'آخر' ? ` - ${data.purpose_other}` : ''}</Typography>
                <Typography variant="body1"><b>الهاتف:</b> {data.phone}</Typography>
                <Typography variant="body1">
                  <b>الأعراض:</b> {symptomQuestions.filter((q) => data.symptoms[q.key].has).map((q) => q.label).join('، ') || 'لا توجد أعراض'}
                </Typography>
                <Typography variant="body1"><b>تصنيف المخاطر:</b> {risk.level} ({risk.score} نقطة)</Typography>
              </Stack>
            </CardContent>
          </Card>
          <FormControlLabel
            control={
              <Checkbox checked={data.consent} onChange={(e) => update('consent', e.target.checked)} />
            }
            label="أقر بصحة البيانات المقدمة"
          />
          {errors.consent && <Typography variant="caption" color="error">{errors.consent}</Typography>}
          {submitError && <Alert severity="error">{submitError}</Alert>}
          <Button
            variant="contained"
            size="large"
            onClick={submit}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          >
            حفظ وإصدار رمز المرور الصحي
          </Button>
        </Stack>
      );
    }

    return null;
  };

  if (result) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Card sx={{ border: '1px solid', borderColor: 'success.main', borderRadius: 4 }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              تم التسجيل بنجاح
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 0.5 }}>
              رقم التسجيل: <b dir="ltr">{result.travelerId.slice(0, 8).toUpperCase()}</b>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {result.fullName} · {result.passport}
            </Typography>

            {qrLoading ? (
              <CircularProgress sx={{ my: 3 }} />
            ) : qr ? (
              <Box sx={{ my: 3 }}>
                <Box
                  component="img"
                  src={qr.qr_code}
                  alt="رمز QR"
                  sx={{ width: 220, height: 220, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  اعرض هذا الرمز لموظف الحجر الصحي عند الوصول لتسريع إجراءاتك.
                </Typography>
              </Box>
            ) : (
              <Alert severity="info" sx={{ mb: 3 }}>
                سيتم إصدار رمز QR الخاص بك بعد مراجعة المستندات واعتماد الطلب.
              </Alert>
            )}

            <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" gap={1}>
              <Button
                variant="contained"
                size="large"
                startIcon={<UploadFileIcon />}
                onClick={() => navigate('/traveler/documents')}
              >
                رفع المستندات الآن
              </Button>
              <Button variant="outlined" onClick={() => navigate(`/traveler/tracking?passport=${result.passport}`)}>
                متابعة حالة الطلب
              </Button>
              <Button variant="outlined" onClick={() => navigate('/traveler/dashboard')}>
                لوحة التحكم
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              يمكنك رفع المستندات لاحقاً من صفحة "رفع المستندات" في بوابة المسافرين.
            </Typography>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <PageHeader
        title="التسجيل المسبق للمسافر"
        subtitle="استمارة إلكترونية متعددة الخطوات لتسريع إجراءات وصولك إلى المنافذ"
        eyebrow="بوابة المسافرين"
      />

      <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
        <Box sx={{ px: { xs: 2, md: 4 }, pt: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            {stepMeta.map((meta, index) => (
              <Box key={meta.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  icon={meta.icon}
                  label={index === step ? meta.label : undefined}
                  size="small"
                  color={index === step ? 'primary' : index < step ? 'success' : 'default'}
                  variant={index <= step ? 'filled' : 'outlined'}
                />
              </Box>
            ))}
          </Stack>
          <LinearProgress variant="determinate" value={progress} sx={{ mb: 3, borderRadius: 2 }} />
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
              الخطوة {step + 1} من 6
            </Typography>
          </Stack>
        </Box>

        <CardContent sx={{ px: { xs: 2, md: 4 }, pb: 4 }}>
          {renderStep()}
          {step >= 1 && step <= 4 && (
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 4 }}>
              <Button onClick={back} startIcon={<ArrowBackIcon />} variant="outlined">
                السابق
              </Button>
              <Button onClick={next} endIcon={<ArrowForwardIcon />} variant="contained">
                {step === 4 ? 'التالي: مراجعة وتأكيد' : 'التالي'}
              </Button>
            </Stack>
          )}
          {step === 5 && (
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 4 }}>
              <Button onClick={back} startIcon={<ArrowBackIcon />} variant="outlined">
                السابق
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>
      <PassportScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onResult={handleMrzResult} />
    </Container>
  );
};

export default PreRegistrationPage;
