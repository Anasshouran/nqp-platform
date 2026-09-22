import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { createShipInspection, getVesselVisits, getVessels } from '../../api/endpoints/portHealth';
import type { ShipInspection, Vessel, VesselVisit } from '../../types/portHealth';
import { notifyError, notifySuccess } from '../../utils/toast';

type Compliance = 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_APPLICABLE';

interface AreaDef {
  field: keyof Pick<ShipInspection,
    'accommodation_status' | 'kitchen_status' | 'storeroom_status' | 'clinic_status'
    | 'water_tank_status' | 'toilet_status' | 'ventilation_status' | 'cleanliness_status'>;
  label: string;
  hint: string;
}

const AREAS: AreaDef[] = [
  { field: 'accommodation_status', label: 'أماكن الإقامة (Crew Quarters)', hint: 'نظيفة ومناسبة، لا توجد آفات' },
  { field: 'kitchen_status', label: 'المطابخ (Galley)', hint: 'النظافة، تخزين الأغذية، حرارات الثلاجات' },
  { field: 'storeroom_status', label: 'مخازن الأغذية (Stores)', hint: 'لا مواد منتهية الصلاحية، تهوية جيدة' },
  { field: 'water_tank_status', label: 'خزانات المياه (Water Tanks)', hint: 'نظيفة ومغلقة، لا تسريبات' },
  { field: 'clinic_status', label: 'العيادة الطبية (Medical Bay)', hint: 'مجهزة، الأدوية سارية' },
  { field: 'toilet_status', label: 'دورات المياه والصرف (Toilets)', hint: 'نظيفة وعاملة' },
  { field: 'ventilation_status', label: 'التهوية (Ventilation)', hint: 'عاملة وسليمة' },
  { field: 'cleanliness_status', label: 'النظافة العامة (Cleanliness)', hint: 'مطابقة للمعايير' },
];

const COMPLIANCE_OPTIONS: { value: Compliance; label: string }[] = [
  { value: 'COMPLIANT', label: 'مطابق' },
  { value: 'NON_COMPLIANT', label: 'غير مطابق' },
  { value: 'NOT_APPLICABLE', label: 'غير متاح' },
];

const OVERALL_OPTIONS = [
  { value: 'PASSED', label: 'سليمة — لا توجد نواقص' },
  { value: 'CONDITIONAL', label: 'نواقص طفيفة — يمنح مهلة للتصحيح' },
  { value: 'FAILED', label: 'نواقص جسيمة — توقيف السفينة' },
];

const emptyAreas = Object.fromEntries(AREAS.map((a) => [a.field, 'COMPLIANT'])) as Record<AreaDef['field'], Compliance>;

const ShipInspectionForm = () => {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [visits, setVisits] = useState<VesselVisit[]>([]);
  const [vesselId, setVesselId] = useState('');
  const [visitId, setVisitId] = useState('');
  const [areas, setAreas] = useState(emptyAreas);
  const [findings, setFindings] = useState('');
  const [overall, setOverall] = useState('PASSED');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getVessels({ page_size: 100 }).then((r) => setVessels(r.data.data.results));
  }, []);

  useEffect(() => {
    setVisitId('');
    if (!vesselId) {
      setVisits([]);
      return;
    }
    getVesselVisits({ vessel: vesselId, page_size: 50 }).then((r) => setVisits(r.data.data.results));
  }, [vesselId]);

  const nonCompliantCount = useMemo(
    () => Object.values(areas).filter((v) => v === 'NON_COMPLIANT').length,
    [areas],
  );
  const selectedVessel = vessels.find((v) => v.id === vesselId);

  const reset = () => {
    setVesselId('');
    setVisitId('');
    setAreas(emptyAreas);
    setFindings('');
    setOverall('PASSED');
  };

  const handleSubmit = async () => {
    if (!vesselId) {
      notifyError('اختر السفينة أولاً');
      return;
    }
    setSaving(true);
    try {
      await createShipInspection({
        vessel: vesselId,
        visit: visitId || null,
        findings,
        overall_status: overall,
        ...areas,
      });
      notifySuccess(`تم حفظ تفتيش السفينة «${selectedVessel?.vessel_name ?? ''}»`);
      reset();
    } catch {
      notifyError('تعذر حفظ التفتيش — تحقق من البيانات والصلاحيات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <FactCheckIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            استمارة التفتيش الصحي الميداني
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ mb: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              select fullWidth required label="السفينة"
              value={vesselId} onChange={(e) => setVesselId(e.target.value)}
            >
              {vessels.map((v) => (
                <MenuItem key={v.id} value={v.id}>
                  {v.vessel_name} — IMO {v.imo_number}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select fullWidth label="الزيارة (اختياري)" disabled={!vesselId}
              value={visitId} onChange={(e) => setVisitId(e.target.value)}
            >
              <MenuItem value="">— بدون ربط بزيارة —</MenuItem>
              {visits.map((v) => (
                <MenuItem key={v.id} value={v.id}>{v.port_name || v.port} — {v.arrival_date}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        {selectedVessel && (
          <Alert severity="info" sx={{ mb: 2 }}>
            العلم: {selectedVessel.flag_state || '—'} · الشركة: {selectedVessel.shipping_company || '—'}
            {' '}· آخر ميناء: {selectedVessel.last_port_of_call || '—'}
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>مناطق الفحص الثماني</Typography>
        <Grid container spacing={2}>
          {AREAS.map((a) => (
            <Grid item xs={12} md={6} key={a.field}>
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{a.label}</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>{a.hint}</Typography>
                <RadioGroup
                  row
                  value={areas[a.field]}
                  onChange={(_, v) => setAreas((s) => ({ ...s, [a.field]: v as Compliance }))}
                >
                  {COMPLIANCE_OPTIONS.map((o) => (
                    <FormControlLabel key={o.value} value={o.value} control={<Radio size="small" />} label={o.label} />
                  ))}
                </RadioGroup>
              </Box>
            </Grid>
          ))}
        </Grid>

        {nonCompliantCount > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            توجد {nonCompliantCount} منطقة غير مطابقة — يُنصح بتوثيقها في الملاحظات ومراجعة النتيجة النهائية.
          </Alert>
        )}

        <TextField
          fullWidth multiline minRows={3} sx={{ mt: 2 }}
          label="الملاحظات العامة (Findings)"
          placeholder="وصف المخالفات وموقعها وإجراءات التصحيح المطلوبة..."
          value={findings} onChange={(e) => setFindings(e.target.value)}
        />

        <Box sx={{ mt: 2, border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>النتيجة النهائية (إلزامية)</Typography>
          <RadioGroup row value={overall} onChange={(_, v) => setOverall(v)}>
            {OVERALL_OPTIONS.map((o) => (
              <FormControlLabel key={o.value} value={o.value} control={<Radio />} label={o.label} />
            ))}
          </RadioGroup>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, mt: 2.5 }}>
          <Button
            variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit}
            disabled={saving || !vesselId}
          >
            {saving ? 'جارٍ الحفظ...' : 'حفظ التفتيش'}
          </Button>
          <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={reset} disabled={saving}>
            إعادة تعيين
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ShipInspectionForm;
