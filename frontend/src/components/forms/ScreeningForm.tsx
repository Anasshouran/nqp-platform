import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import { FormDialog } from '../uikit';
import { FormTextField } from '../ui';
import { StatusChip } from '../ui';
import { getTravelers } from '../../api/endpoints/travelers';
import { getMasterEntryPoints } from '../../api/endpoints/masterdata';
import { createScreening, type ScreeningRiskAssessment } from '../../api/endpoints/screening';
import type { Traveler } from '../../types/traveler';
import type { MasterEntryPoint } from '../../types/masterdata';
import { riskLevel, riskRecommendation } from '../../utils/status/screening';
import { labelOf, toneOf } from '../../utils/labels';
import { extractErrorMessage } from '../../utils/toast';

interface ScreeningFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: (screeningId: string) => void;
}

const SYMPTOM_OPTIONS = [
  'حمى',
  'كحة',
  'ضيق تنفس',
  'صداع',
  'قيء',
  'إسهال',
  'توعك عام',
] as const;

const ScreeningForm = ({ open, onClose, onSaved }: ScreeningFormProps) => {
  const [traveler, setTraveler] = useState<Traveler | null>(null);
  const [travelerQuery, setTravelerQuery] = useState('');
  const [port, setPort] = useState<MasterEntryPoint | null>(null);
  const [temperature, setTemperature] = useState('');
  const [oxygen, setOxygen] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [ports, setPorts] = useState<MasterEntryPoint[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [assessment, setAssessment] = useState<ScreeningRiskAssessment | null>(null);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    getMasterEntryPoints({ is_active: true })
      .then((res) => {
        if (mounted) setPorts(res.data.data.results ?? []);
      })
      .catch(() => {
        /* تبقى القائمة فارغة — الخادم يعيد رفض الحفظ إن لزم */
      });
    return () => {
      mounted = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !travelerQuery.trim()) {
      setTravelers([]);
      return;
    }
    let mounted = true;
    const timer = window.setTimeout(() => {
      getTravelers({ search: travelerQuery.trim(), page_size: 8 })
        .then((res) => {
          if (mounted) setTravelers(res.data.data.results ?? []);
        })
        .catch(() => {
          if (mounted) setTravelers([]);
        });
    }, 350);
    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [travelerQuery, open]);

  const reset = () => {
    setTraveler(null);
    setTravelerQuery('');
    setPort(null);
    setTemperature('');
    setOxygen('');
    setSystolic('');
    setDiastolic('');
    setSymptoms([]);
    setNotes('');
    setErrors({});
    setServerError(null);
    setAssessment(null);
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!traveler) next.traveler = 'اختر المسافر';
    if (!port) next.port = 'اختر المنفذ';
    if (temperature && (Number.isNaN(Number(temperature)) || Number(temperature) < 34 || Number(temperature) > 43)) {
      next.temperature = 'قيمة حرارة غير منطقية (34–43)';
    }
    if (oxygen && (Number.isNaN(Number(oxygen)) || Number(oxygen) < 50 || Number(oxygen) > 100)) {
      next.oxygen = 'أدخل تشبع الأكسجين بنسبة 50–100%';
    }
    if (systolic && (Number.isNaN(Number(systolic)) || Number(systolic) < 50 || Number(systolic) > 300)) {
      next.systolic = 'ضغط انقباضي غير منطقي';
    }
    if (diastolic && (Number.isNaN(Number(diastolic)) || Number(diastolic) < 30 || Number(diastolic) > 200)) {
      next.diastolic = 'ضغط انبساطي غير منطقي';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const toggleSymptom = (s: string) =>
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const submit = async () => {
    if (saving || assessment) return;
    if (!validate()) return;
    setSaving(true);
    setServerError(null);
    try {
      const res = await createScreening({
        traveler: traveler!.id,
        port: port!.id,
        body_temperature: temperature ? Number(temperature) : null,
        oxygen_saturation: oxygen ? Number(oxygen) : null,
        systolic_bp: systolic ? Number(systolic) : null,
        diastolic_bp: diastolic ? Number(diastolic) : null,
        observed_symptoms: symptoms,
        officer_notes: notes,
      });
      const created = res.data.data;
      setAssessment(created.risk_assessment);
      onSaved(created.screening_id);
    } catch (err) {
      setServerError(extractErrorMessage(err, 'تعذر حفظ الفحص الصحي'));
    } finally {
      setSaving(false);
    }
  };

  const assessmentChip = useMemo(
    () =>
      assessment ? (
        <Stack spacing={1} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <StatusChip label={labelOf(riskLevel, assessment.risk_level)} tone={toneOf(riskLevel, assessment.risk_level)} />
            <StatusChip label={labelOf(riskRecommendation, assessment.recommendation)} tone={toneOf(riskRecommendation, assessment.recommendation)} />
            <Chip label={`درجة الخطر: ${assessment.risk_score}`} variant="outlined" size="small" />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            التقييم تلقائي من نظام تقييم المخاطر — القرار النهائي من الخادم.
          </Typography>
        </Stack>
      ) : null,
    [assessment],
  );

  return (
    <FormDialog
      open={open}
      title="تسجيل فحص صحي"
      subtitle="بيانات الفحص تؤدي لتقييم مخاطر تلقائي يحدد الإجراء"
      icon={<ManageSearchIcon />}
      loading={saving}
      submitDisabled={Boolean(assessment) || saving}
      submitLabel={assessment ? 'تم الحفظ' : 'حفظ الفحص'}
      onClose={() => {
        reset();
        onClose();
      }}
      onSubmit={submit}
    >
      {serverError && <Alert severity="error">{serverError}</Alert>}

      <Autocomplete
        options={travelers}
        getOptionLabel={(t) => `${t.full_name} — ${t.passport_number}`}
        value={traveler}
        onChange={(_, v) => setTraveler(v)}
        inputValue={travelerQuery}
        onInputChange={(_, v) => setTravelerQuery(v)}
        noOptionsText="لا توجد نتائج… اكتب الاسم أو الجواز"
        isOptionEqualToValue={(a, b) => a.id === b.id}
        renderInput={(params) => (
          <TextField
            {...params}
            label="المسافر (الاسم أو رقم الجواز)"
            required
            error={Boolean(errors.traveler)}
            helperText={errors.traveler || ' '}
            fullWidth
          />
        )}
      />

      <Autocomplete
        options={ports}
        getOptionLabel={(p) => p.name_ar}
        value={port}
        onChange={(_, v) => setPort(v)}
        noOptionsText="لا توجد منافذ"
        isOptionEqualToValue={(a, b) => a.id === b.id}
        renderInput={(params) => (
          <TextField
            {...params}
            label="المنفذ"
            required
            error={Boolean(errors.port)}
            helperText={errors.port || ' '}
            fullWidth
          />
        )}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormTextField
          label="درجة الحرارة (°C)"
          name="temperature"
          value={temperature}
          onChange={(e) => setTemperature(e.target.value)}
          hint={!errors.temperature ? '38+ تعتبر حمى عالية' : undefined}
          error={Boolean(errors.temperature)}
          helperText={errors.temperature || ' '}
          inputMode="decimal"
        />
        <FormTextField
          label="تشبع الأكسجين (%)"
          name="oxygen"
          value={oxygen}
          onChange={(e) => setOxygen(e.target.value)}
          hint={!errors.oxygen ? 'أقل من 95% مؤشر خطر' : undefined}
          error={Boolean(errors.oxygen)}
          helperText={errors.oxygen || ' '}
          inputMode="numeric"
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormTextField
          label="الضغط الانقباضي"
          name="systolic"
          value={systolic}
          onChange={(e) => setSystolic(e.target.value)}
          error={Boolean(errors.systolic)}
          helperText={errors.systolic || ' '}
          inputMode="numeric"
        />
        <FormTextField
          label="الضغط الانبساطي"
          name="diastolic"
          value={diastolic}
          onChange={(e) => setDiastolic(e.target.value)}
          error={Boolean(errors.diastolic)}
          helperText={errors.diastolic || ' '}
          inputMode="numeric"
        />
      </Stack>

      <Box>
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
          الأعراض الملاحظة
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {SYMPTOM_OPTIONS.map((s) => (
            <FormControlLabel
              key={s}
              control={
                <Checkbox size="small" checked={symptoms.includes(s)} onChange={() => toggleSymptom(s)} />
              }
              label={s}
              sx={{ mr: 0 }}
            />
          ))}
        </Stack>
      </Box>

      <FormTextField
        label="ملاحظات الموظف"
        name="notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        multiline
        minRows={2}
        hint="مثال: حرارة مرتفعة دون أعراض تنفسية"
      />

      {assessmentChip}
    </FormDialog>
  );
};

export default ScreeningForm;