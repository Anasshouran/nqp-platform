import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
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

const getAreas = (t: (key: string) => string): AreaDef[] => [
  { field: 'accommodation_status', label: t('borders.shipInspection.areas.accommodation.label'), hint: t('borders.shipInspection.areas.accommodation.hint') },
  { field: 'kitchen_status', label: t('borders.shipInspection.areas.kitchen.label'), hint: t('borders.shipInspection.areas.kitchen.hint') },
  { field: 'storeroom_status', label: t('borders.shipInspection.areas.storeroom.label'), hint: t('borders.shipInspection.areas.storeroom.hint') },
  { field: 'water_tank_status', label: t('borders.shipInspection.areas.waterTank.label'), hint: t('borders.shipInspection.areas.waterTank.hint') },
  { field: 'clinic_status', label: t('borders.shipInspection.areas.clinic.label'), hint: t('borders.shipInspection.areas.clinic.hint') },
  { field: 'toilet_status', label: t('borders.shipInspection.areas.toilet.label'), hint: t('borders.shipInspection.areas.toilet.hint') },
  { field: 'ventilation_status', label: t('borders.shipInspection.areas.ventilation.label'), hint: t('borders.shipInspection.areas.ventilation.hint') },
  { field: 'cleanliness_status', label: t('borders.shipInspection.areas.cleanliness.label'), hint: t('borders.shipInspection.areas.cleanliness.hint') },
];

const getComplianceOptions = (t: (key: string) => string): { value: Compliance; label: string }[] => [
  { value: 'COMPLIANT', label: t('borders.shipInspection.compliance.compliant') },
  { value: 'NON_COMPLIANT', label: t('borders.shipInspection.compliance.nonCompliant') },
  { value: 'NOT_APPLICABLE', label: t('borders.shipInspection.compliance.notApplicable') },
];

/**
 * Phase 1D-6B: the final verdict is DERIVED by the backend from the eight
 * zones. These labels are for read-only display only; the operator cannot
 * choose one, and the client never sends `overall_status`.
 */
const getDerivedStatusLabel = (t: (key: string) => string): Record<string, string> => ({
  PASSED: t('borders.shipInspection.derived.passed'),
  FAILED: t('borders.shipInspection.derived.failed'),
  CONDITIONAL: t('borders.shipInspection.derived.conditional'),
});

const getEmptyAreas = (areas: AreaDef[]) => Object.fromEntries(areas.map((a) => [a.field, 'COMPLIANT'])) as Record<AreaDef['field'], Compliance>;

const ShipInspectionForm = () => {
  const { t } = useTranslation();
  const AREAS = useMemo(() => getAreas(t), [t]);
  const COMPLIANCE_OPTIONS = useMemo(() => getComplianceOptions(t), [t]);
  const DERIVED_STATUS_LABEL = useMemo(() => getDerivedStatusLabel(t), [t]);
  const emptyAreas = useMemo(() => getEmptyAreas(AREAS), [AREAS]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [visits, setVisits] = useState<VesselVisit[]>([]);
  const [vesselId, setVesselId] = useState('');
  const [visitId, setVisitId] = useState('');
  const [areas, setAreas] = useState(emptyAreas);
  const [findings, setFindings] = useState('');
  const [saving, setSaving] = useState(false);
  const [derived, setDerived] = useState<ShipInspection | null>(null);

  useEffect(() => {
    setAreas(emptyAreas);
  }, [emptyAreas]);

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
  const notApplicableCount = useMemo(
    () => Object.values(areas).filter((v) => v === 'NOT_APPLICABLE').length,
    [areas],
  );
  // Live preview of the backend verdict (Rule 1 > Rule 2 > fail-closed).
  // Preview only — the server remains the authority and recomputes on save.
  const previewStatus: 'PASSED' | 'FAILED' | 'AMBIGUOUS' =
    nonCompliantCount > 0 ? 'FAILED' : notApplicableCount > 0 ? 'AMBIGUOUS' : 'PASSED';
  const selectedVessel = vessels.find((v) => v.id === vesselId);

  const reset = () => {
    setVesselId('');
    setVisitId('');
    setAreas(emptyAreas);
    setFindings('');
  };

  const handleSubmit = async () => {
    if (notApplicableCount > 0) {
      notifyError(t('borders.shipInspection.errors.notApplicableNotSupported'));
      return;
    }
    if (!vesselId) {
      notifyError(t('borders.shipInspection.errors.selectVesselFirst'));
      return;
    }
    setSaving(true);
    try {
      const res = await createShipInspection({
        vessel: vesselId,
        visit: visitId || null,
        findings,
        ...areas,
      });
      setDerived(res.data.data);
      notifySuccess(t('borders.shipInspection.success.saved', { vessel: selectedVessel?.vessel_name ?? '' }));
      reset();
    } catch {
      notifyError(t('borders.shipInspection.errors.saveFailed'));
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
            {t('borders.shipInspection.title')}
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ mb: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              select fullWidth required label={t('borders.shipInspection.form.vessel')}
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
              select fullWidth label={t('borders.shipInspection.form.visitOptional')} disabled={!vesselId}
              value={visitId} onChange={(e) => setVisitId(e.target.value)}
            >
              <MenuItem value="">{t('borders.shipInspection.form.noVisit')}</MenuItem>
              {visits.map((v) => (
                <MenuItem key={v.id} value={v.id}>{v.port_name || v.port} — {v.arrival_date}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        {selectedVessel && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('borders.shipInspection.form.vesselMeta', { flag: selectedVessel.flag_state || '—', company: selectedVessel.shipping_company || '—', port: selectedVessel.last_port_of_call || '—' })}
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{t('borders.shipInspection.sections.areas')}</Typography>
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
{t('borders.shipInspection.alerts.nonCompliantWarning', { count: nonCompliantCount })}
          </Alert>
        )}

        <TextField
          fullWidth multiline minRows={3} sx={{ mt: 2 }}
          label={t('borders.shipInspection.form.findings')}
          placeholder={t('borders.shipInspection.form.findingsPlaceholder')}
          value={findings} onChange={(e) => setFindings(e.target.value)}
        />

        <Alert severity="info" sx={{ mt: 2 }}>
{t('borders.shipInspection.info.finalResultDerived')}
        </Alert>

        <Box sx={{ mt: 2, border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
{t('borders.shipInspection.sections.finalResult')}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip
              color={previewStatus === 'FAILED' ? 'error' : previewStatus === 'AMBIGUOUS' ? 'warning' : 'success'}
              label={
                previewStatus === 'AMBIGUOUS'
                  ? t('borders.shipInspection.preview.notDetermined')
                  : DERIVED_STATUS_LABEL[previewStatus]
              }
            />
            <Chip size="small" variant="outlined" label={t('borders.shipInspection.chips.nonCompliant', { count: nonCompliantCount })} />
            <Chip size="small" variant="outlined" label={t('borders.shipInspection.chips.notApplicable', { count: notApplicableCount })} />
          </Stack>
          {derived && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
{t('borders.shipInspection.form.lastSaved', { status: DERIVED_STATUS_LABEL[derived.overall_status] ?? derived.overall_status })}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, mt: 2.5 }}>
          <Button
            variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit}
            disabled={saving || !vesselId}
          >
{saving ? t('borders.shipInspection.actions.saving') : t('borders.shipInspection.actions.save')}
          </Button>
          <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={reset} disabled={saving}>
{t('borders.shipInspection.actions.reset')}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ShipInspectionForm;
