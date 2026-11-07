import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import FormHelperText from '@mui/material/FormHelperText';
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

const PreRegistrationPage = () => {
  const { t } = useTranslation();

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
    const level = score <= 10 ? t('traveler.preRegistration.risk.low') : score <= 30 ? t('traveler.preRegistration.risk.medium') : t('traveler.preRegistration.risk.high');
    return { score, level };
  };

  const symptomQuestions = useMemo<Array<{ key: string; label: string; hasExtra?: 'temperature' | 'patient_name' | 'details' }>>(
    () => [
      { key: 'fever', label: t('traveler.preRegistration.symptoms.fever'), hasExtra: 'temperature' },
      { key: 'headache', label: t('traveler.preRegistration.symptoms.headache') },
      { key: 'body_pain', label: t('traveler.preRegistration.symptoms.bodyPain') },
      { key: 'vomiting', label: t('traveler.preRegistration.symptoms.vomiting') },
      { key: 'diarrhea', label: t('traveler.preRegistration.symptoms.diarrhea') },
      { key: 'loss_of_appetite', label: t('traveler.preRegistration.symptoms.lossOfAppetite') },
      { key: 'difficulty_swallowing', label: t('traveler.preRegistration.symptoms.difficultySwallowing') },
      { key: 'bleeding', label: t('traveler.preRegistration.symptoms.bleeding') },
      { key: 'contact_with_patient', label: t('traveler.preRegistration.symptoms.contactWithPatient'), hasExtra: 'patient_name' },
      { key: 'other_symptoms', label: t('traveler.preRegistration.symptoms.otherSymptoms'), hasExtra: 'details' },
    ],
    [t],
  );

  const purposeOptions = useMemo(
    () => [
      { value: 'سياحة', label: t('traveler.preRegistration.purpose.tourism') },
      { value: 'عمل', label: t('traveler.preRegistration.purpose.work') },
      { value: 'زيارة', label: t('traveler.preRegistration.purpose.visit') },
      { value: 'دراسة', label: t('traveler.preRegistration.purpose.study') },
      { value: 'عبور', label: t('traveler.preRegistration.purpose.transit') },
      { value: 'دبلوماسي', label: t('traveler.preRegistration.purpose.diplomatic') },
      { value: 'منظمة دولية', label: t('traveler.preRegistration.purpose.internationalOrg') },
      { value: 'آخر', label: t('traveler.preRegistration.purpose.other') },
    ],
    [t],
  );

  const stepMeta = useMemo(
    () => [
      { label: t('traveler.preRegistration.steps.start'), icon: <LanguageIcon /> },
      { label: t('traveler.preRegistration.steps.personal'), icon: <PersonIcon /> },
      { label: t('traveler.preRegistration.steps.trip'), icon: <FlightTakeoffIcon /> },
      { label: t('traveler.preRegistration.steps.purposeContact'), icon: <ContactMailIcon /> },
      { label: t('traveler.preRegistration.steps.health'), icon: <HealthAndSafetyIcon /> },
      { label: t('traveler.preRegistration.steps.review'), icon: <FactCheckIcon /> },
    ],
    [t],
  );

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
    if (mrz.sex) next.gender = mrz.sex === 'M' ? t('traveler.preRegistration.genderOption.male') : mrz.sex === 'F' ? t('traveler.preRegistration.genderOption.female') : next.gender;
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
      if (data.full_name.trim().length < 2) e.full_name = t('traveler.preRegistration.validation.fullNameTooShort');
      if (!/^[A-Za-z0-9]{6,20}$/.test(data.passport_number.trim())) e.passport_number = t('traveler.preRegistration.validation.passport');
      if (!data.date_of_birth) {
        e.date_of_birth = t('traveler.preRegistration.validation.dateOfBirthRequired');
      }
      if (!data.nationality) e.nationality = t('traveler.preRegistration.validation.nationalityRequired');
      if (!data.gender) e.gender = t('traveler.preRegistration.validation.genderRequired');
    } else if (s === 2) {
      if (!data.origin_country) e.origin_country = t('traveler.preRegistration.validation.originCountryRequired');
      if (!data.port_of_entry) e.port_of_entry = t('traveler.preRegistration.validation.portOfEntryRequired');
      if (!data.transport_mode) e.transport_mode = t('traveler.preRegistration.validation.transportModeRequired');
      if (data.transport_mode === 'AIR' && !/^[A-Za-z0-9]{2,10}$/.test(data.flight_number.trim())) {
        e.flight_number = t('traveler.preRegistration.validation.flight');
      }
      if (!data.arrival_date) {
        e.arrival_date = t('traveler.preRegistration.validation.arrivalDateRequired');
      } else if (new Date(data.arrival_date) < new Date(new Date().toDateString())) {
        e.arrival_date = t('traveler.preRegistration.validation.arrivalDateInvalid');
      }
    } else if (s === 3) {
      if (!data.purpose) e.purpose = t('traveler.preRegistration.validation.purposeRequired');
      if (!isValidPhone(data.phone)) e.phone = t('traveler.preRegistration.validation.phoneInvalid');
      if (data.email && !isValidEmail(data.email)) e.email = t('traveler.preRegistration.validation.emailInvalid');
      if (!isValidPhone(data.emergency_phone)) e.emergency_phone = t('traveler.preRegistration.validation.emergencyPhoneInvalid');
    } else if (s === 4) {
      for (const q of symptomQuestions) {
        if (data.symptoms[q.key].has) {
          if (q.hasExtra === 'temperature') {
            const tempVal = parseFloat(data.symptoms[q.key].temperature || '');
            if (!tempVal || tempVal < 35 || tempVal > 42) e[`temp_${q.key}`] = t('traveler.preRegistration.validation.temperatureInvalid');
          }
          if (q.hasExtra === 'patient_name' && (data.symptoms[q.key].patient_name || '').trim().length < 2) {
            e[`name_${q.key}`] = t('traveler.preRegistration.validation.patientNameRequired');
          }
        }
      }
    } else if (s === 5) {
      if (!data.consent) e.consent = t('traveler.preRegistration.validation.consentRequired');
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
      setSubmitError(t('traveler.preRegistration.submitError'));
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
            {t('traveler.preRegistration.portalTitle')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {t('traveler.preRegistration.portalSubtitle')}
          </Typography>
          <FormControl sx={{ minWidth: 200, mb: 3 }}>
            <InputLabel>{t('traveler.preRegistration.languageLabel')}</InputLabel>
            <Select
              value={data.language}
              label={t('traveler.preRegistration.language')}
              onChange={(e) => update('language', e.target.value as 'ar' | 'en')}
            >
              <MenuItem value="ar">{t('traveler.preRegistration.languageArabic')}</MenuItem>
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
              {t('traveler.preRegistration.startRegistration')}
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            {t('traveler.preRegistration.dataEncrypted')}
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
                label={t('traveler.preRegistration.form.fullName')}
                value={data.full_name}
                onChange={(e) => update('full_name', e.target.value)}
                fullWidth
                error={Boolean(errors.full_name)}
                helperText={errors.full_name}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('traveler.preRegistration.form.passportNumber')}
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
                        {t('traveler.preRegistration.clear')}
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('traveler.preRegistration.form.dateOfBirth')}
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
                <InputLabel>{t('traveler.preRegistration.form.nationality')}</InputLabel>
                <Select value={data.nationality} label={t('traveler.preRegistration.form.nationality')} onChange={(e) => update('nationality', e.target.value)}>
                  {countries.map((country) => (
                    <MenuItem key={country.code} value={country.code}>
                      {country.name_ar || country.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.nationality && <FormHelperText error>{errors.nationality}</FormHelperText>}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl error={Boolean(errors.gender)}>
                <FormLabel>{t('traveler.preRegistration.form.gender')}</FormLabel>
                <RadioGroup row value={data.gender} onChange={(e) => update('gender', e.target.value)}>
                  <FormControlLabel value="ذكر" control={<Radio />} label={t('traveler.preRegistration.genderOption.male')} />
                  <FormControlLabel value="أنثى" control={<Radio />} label={t('traveler.preRegistration.genderOption.female')} />
                </RadioGroup>
                {errors.gender && <FormHelperText error>{errors.gender}</FormHelperText>}
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
                <InputLabel>{t('traveler.preRegistration.form.originCountry')}</InputLabel>
                <Select value={data.origin_country} label={t('traveler.preRegistration.form.originCountry')} onChange={(e) => update('origin_country', e.target.value)}>
                  {countries.map((country) => (
                    <MenuItem key={country.code} value={country.code}>
                      {country.name_ar || country.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.origin_country && <FormHelperText error>{errors.origin_country}</FormHelperText>}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={Boolean(errors.port_of_entry)}>
                <InputLabel>{t('traveler.preRegistration.form.portOfEntry')}</InputLabel>
                <Select value={data.port_of_entry} label={t('traveler.preRegistration.form.portOfEntry')} onChange={(e) => update('port_of_entry', e.target.value)}>
                  {ports.map((port) => (
                    <MenuItem key={port.id} value={port.id}>
                      {port.name_ar} ({port.type})
                    </MenuItem>
                  ))}
                </Select>
                {errors.port_of_entry && <FormHelperText error>{errors.port_of_entry}</FormHelperText>}
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl error={Boolean(errors.transport_mode)}>
                <FormLabel>{t('traveler.preRegistration.form.transportMode')}</FormLabel>
                <RadioGroup
                  row
                  value={data.transport_mode}
                  onChange={(e) => update('transport_mode', e.target.value)}
                >
                  <FormControlLabel value="AIR" control={<Radio />} label={t('traveler.preRegistration.transportMode.air')} />
                  <FormControlLabel value="SEA" control={<Radio />} label={t('traveler.preRegistration.transportMode.sea')} />
                  <FormControlLabel value="LAND" control={<Radio />} label={t('traveler.preRegistration.transportMode.land')} />
                </RadioGroup>
                {errors.transport_mode && (
                  <FormHelperText error>{errors.transport_mode}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            {data.transport_mode !== 'LAND' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label={data.transport_mode === 'SEA' ? t('traveler.preRegistration.form.flightNumberOrShip') : t('traveler.preRegistration.form.flightNumber')}
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
                    ? t('traveler.preRegistration.form.seatOrCabin')
                    : data.transport_mode === 'LAND'
                      ? t('traveler.preRegistration.form.bookingOrFlight')
                      : t('traveler.preRegistration.form.seat')
                }
                value={data.seat_number}
                onChange={(e) => update('seat_number', e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('traveler.preRegistration.form.arrivalDate')}
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
                <InputLabel>{t('traveler.preRegistration.form.transitCountries')}</InputLabel>
                <Select
                  multiple
                  value={data.transit_countries}
                  label={t('traveler.preRegistration.form.transitCountries')}
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
                <FormLabel>{t('traveler.preRegistration.summary.purposeLabel')}</FormLabel>
                <RadioGroup row value={data.purpose} onChange={(e) => update('purpose', e.target.value)}>
                  {purposeOptions.map((option) => (
                    <FormControlLabel key={option.value} value={option.value} control={<Radio />} label={option.label} />
                  ))}
                </RadioGroup>
                {errors.purpose && <FormHelperText error>{errors.purpose}</FormHelperText>}
              </FormControl>
            </Grid>
            {data.purpose === 'آخر' && (
              <Grid item xs={12}>
                <TextField
                  label={t('traveler.preRegistration.summary.purposeSpecifyLabel')}
                  value={data.purpose_other}
                  onChange={(e) => update('purpose_other', e.target.value)}
                  fullWidth
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('traveler.preRegistration.form.phone')}
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
                label={t('traveler.preRegistration.form.whatsapp')}
                value={data.whatsapp}
                onChange={(e) => update('whatsapp', e.target.value)}
                fullWidth
                dir="ltr"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('traveler.preRegistration.form.email')}
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
                label={t('traveler.preRegistration.form.emergencyPhone')}
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
          <Alert severity="info">{t('traveler.preRegistration.symptoms.intro')}</Alert>
          {symptomQuestions.map((q, index) => (
            <Card key={q.key} variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                  <Typography sx={{ fontWeight: 700 }}>
                    {t('traveler.preRegistration.symptoms.question', { index: index + 1, label: q.label })}
                  </Typography>
                  <RadioGroup
                    row
                    value={data.symptoms[q.key].has ? 'yes' : 'no'}
                    onChange={(e) => updateSymptom(q.key, 'has', e.target.value === 'yes')}
                  >
                    <FormControlLabel value="yes" control={<Radio />} label={t('traveler.preRegistration.symptoms.yes')} />
                    <FormControlLabel value="no" control={<Radio />} label={t('traveler.preRegistration.symptoms.no')} />
                  </RadioGroup>
                </Stack>
                {data.symptoms[q.key].has && q.hasExtra === 'temperature' && (
                  <TextField
                    label={t('traveler.preRegistration.form.temperature')}
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
                    label={t('traveler.preRegistration.form.patientName')}
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
                    label={t('traveler.preRegistration.symptoms.details')}
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
          <Alert severity={risk.level === t('traveler.preRegistration.risk.high') ? 'error' : risk.level === t('traveler.preRegistration.risk.medium') ? 'warning' : 'success'}>
            {t('traveler.preRegistration.risk.initial')}: {risk.level} ({risk.score} {t('traveler.preRegistration.risk.points')}).
            {t(risk.level === t('traveler.preRegistration.risk.low') ? 'traveler.preRegistration.risk.lowDesc' : risk.level === t('traveler.preRegistration.risk.medium') ? 'traveler.preRegistration.risk.mediumDesc' : 'traveler.preRegistration.risk.highDesc')}
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
                {t('traveler.preRegistration.summary')}
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body1"><b>{t('traveler.preRegistration.form.fullName')}</b> {data.full_name}</Typography>
                <Typography variant="body1"><b>{t('traveler.preRegistration.form.passportNumber')}</b> {data.passport_number}</Typography>
                <Typography variant="body1">
                  <b>{t('traveler.preRegistration.form.trip')}</b> {data.flight_number || '—'}، {t('traveler.preRegistration.summary.date')} {data.arrival_date}
                </Typography>
                <Typography variant="body1"><b>{t('traveler.preRegistration.form.portOfEntry')}</b> {tripPort?.name_ar || '—'}</Typography>
                <Typography variant="body1"><b>{t('traveler.preRegistration.form.purpose')}</b> {data.purpose}{data.purpose === t('traveler.preRegistration.purpose.other') ? ` - ${data.purpose_other}` : ''}</Typography>
                <Typography variant="body1"><b>{t('traveler.preRegistration.form.phone')}</b> {data.phone}</Typography>
                <Typography variant="body1">
                  <b>{t('traveler.preRegistration.summary.symptomsLabel')}</b> {symptomQuestions.filter((q) => data.symptoms[q.key].has).map((q) => q.label).join('، ') || t('traveler.preRegistration.noSymptoms')}
                </Typography>
                <Typography variant="body1"><b>{t('traveler.preRegistration.risk.label')}</b> {risk.level} ({risk.score} {t('traveler.preRegistration.risk.points')})</Typography>
              </Stack>
            </CardContent>
          </Card>
          <FormControlLabel
            control={
              <Checkbox checked={data.consent} onChange={(e) => update('consent', e.target.checked)} />
            }
            label={t('traveler.preRegistration.summary.consent')}
          />
          {errors.consent && <FormHelperText error>{errors.consent}</FormHelperText>}
          {submitError && <Alert severity="error">{submitError}</Alert>}
          <Button
            variant="contained"
            size="large"
            onClick={submit}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          >
            {t('traveler.preRegistration.summary.save')}
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
              {t('traveler.preRegistration.summary.success')}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 0.5 }}>
              {t('traveler.preRegistration.summary.registrationNumber')}: <b dir="ltr">{result.travelerId.slice(0, 8).toUpperCase()}</b>
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
                  alt={t('traveler.preRegistration.summary.qrAlt')}
                  sx={{ width: 220, height: 220, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {t('traveler.preRegistration.summary.qrInstruction')}
                </Typography>
              </Box>
            ) : (
              <Alert severity="info" sx={{ mb: 3 }}>
                {t('traveler.preRegistration.summary.qrIssuance')}
              </Alert>
            )}

            <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" gap={1}>
              <Button
                variant="contained"
                size="large"
                startIcon={<UploadFileIcon />}
                onClick={() => navigate('/traveler/documents')}
              >
                {t('traveler.preRegistration.summary.uploadNow')}
              </Button>
              <Button variant="outlined" onClick={() => navigate(`/traveler/tracking?passport=${result.passport}`)}>
                {t('traveler.preRegistration.summary.trackRequest')}
              </Button>
              <Button variant="outlined" onClick={() => navigate('/traveler/dashboard')}>
                {t('traveler.preRegistration.summary.dashboard')}
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              {t('traveler.preRegistration.summary.uploadLater')}
            </Typography>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <PageHeader
        title={t('traveler.preRegistration.pageTitle')}
        subtitle={t('traveler.preRegistration.pageSubtitle')}
        eyebrow={t('traveler.preRegistration.summary.eyebrow')}
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
              {t('traveler.preRegistration.stepProgress')} {step + 1} {t('traveler.preRegistration.of')} 6
            </Typography>
          </Stack>
        </Box>

        <CardContent sx={{ px: { xs: 2, md: 4 }, pb: 4 }}>
          {renderStep()}
          {step >= 1 && step <= 4 && (
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 4 }}>
              <Button onClick={back} startIcon={<ArrowBackIcon />} variant="outlined">
                {t('traveler.preRegistration.summary.back')}
              </Button>
              <Button onClick={next} endIcon={<ArrowForwardIcon />} variant="contained">
                {step === 4 ? t('traveler.preRegistration.summary.nextReview') : t('traveler.preRegistration.summary.next')}
              </Button>
            </Stack>
          )}
          {step === 5 && (
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 4 }}>
              <Button onClick={back} startIcon={<ArrowBackIcon />} variant="outlined">
                {t('traveler.preRegistration.summary.back')}
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
