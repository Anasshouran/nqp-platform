import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Divider from '@mui/material/Divider';
import ScienceIcon from '@mui/icons-material/Science';
import { StatusChip, AppButton, FormSelect, FormTextField } from '../../components/uikit';
import { evaluateSampleTest, getApplicableLimits } from '../../api/endpoints/foodlab';
import type { ApplicableLimits, MicrobiologicalLimit, MicroEvaluation, SampleTest } from '../../types/food';
import { labDecision } from '../../utils/status';
import { notifyError, notifySuccess } from '../../utils/toast';

interface UnitRow {
  unit_number: number;
  result_value: string;
  qualifier: string;
}

const isPresenceAbsence = (limit: MicrobiologicalLimit) =>
  limit.plan === 'PRESENCE_ABSENCE' || limit.detection_type === 'PRESENCE_ABSENCE';

const buildUnits = (n: number): UnitRow[] =>
  Array.from({ length: n }, (_, i) => ({ unit_number: i + 1, result_value: '', qualifier: 'NEGATIVE' }));

interface Props {
  open: boolean;
  test: SampleTest | null;
  onClose: () => void;
  onChanged: () => void;
}

const MicroEvaluationDialog = ({ open, test, onClose, onChanged }: Props) => {
  const { t } = useTranslation();
  const [applicable, setApplicable] = useState<ApplicableLimits | null>(null);
  const [loadingLimits, setLoadingLimits] = useState(false);
  const [selLimitId, setSelLimitId] = useState('');
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [result, setResult] = useState<MicroEvaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    if (!open || !test) return;
    let cancelled = false;
    setLoadingLimits(true);
    setApplicable(null);
    setResult(null);
    getApplicableLimits(test.id)
      .then((r) => {
        if (cancelled) return;
        const data = r.data.data;
        setApplicable(data);
        const first = data.limits[0];
        if (first) {
          setSelLimitId(first.id);
          setUnits(buildUnits(first.n));
        } else {
          setSelLimitId('');
          setUnits([]);
        }
      })
      .catch(() => {
        if (!cancelled) notifyError(t('food.microEvaluation.errorLoad'));
      })
      .finally(() => {
        if (!cancelled) setLoadingLimits(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, test, t]);

  const selLimit = applicable?.limits.find((l) => l.id === selLimitId) ?? null;

  const selectLimit = (id: string) => {
    setSelLimitId(id);
    setResult(null);
    const limit = applicable?.limits.find((l) => l.id === id);
    if (limit) setUnits(buildUnits(limit.n));
  };

  const updateUnit = (idx: number, patch: Partial<UnitRow>) => {
    setUnits((prev) => prev.map((u, i) => (i === idx ? { ...u, ...patch } : u)));
  };

  const submitEvaluation = async () => {
    if (!test || !selLimit) return;
    setEvaluating(true);
    try {
      const payload = units.map((u) => ({
        unit_number: u.unit_number,
        result_value: u.result_value === '' ? null : Number(u.result_value),
        qualifier: u.qualifier || undefined,
      }));
      const res = await evaluateSampleTest(test.id, { limit: selLimit.id, units: payload });
      setResult(res.data.data);
      notifySuccess(t('food.microEvaluation.successEval'));
      onChanged();
    } catch {
      notifyError(t('food.microEvaluation.errorEval'));
    } finally {
      setEvaluating(false);
    }
  };

  const limitLabel = (l: MicrobiologicalLimit) =>
    `${l.microorganism_code} — n=${l.n} c=${l.c}${l.m != null ? ` m=${l.m}` : ''}${l.M != null ? ` M=${l.M}` : ''} (${l.plan_label})`;

  return (
    <Dialog open={open} onClose={loadingLimits || evaluating ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ color: 'primary.main', display: 'grid', placeItems: 'center' }}>
          <ScienceIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {t('food.microEvaluation.dialogTitle')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {test ? t('food.microEvaluation.parameterSubtitle', { name: test.parameter.name_ar }) : ''}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
        {loadingLimits && <Typography variant="body2" color="text.secondary">{t('food.microEvaluation.loading')}</Typography>}
        {!loadingLimits && !applicable && <Typography variant="body2" color="text.secondary">{t('food.microEvaluation.noApplicable')}</Typography>}
        {!loadingLimits && applicable && (
          <>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.default' }}>
              <Stack spacing={0.5}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {applicable.spec_version?.label ?? t('food.microEvaluation.noSpecVersion')}
                </Typography>
                {applicable.product && (
                  <Typography variant="caption" color="text.secondary">
                    {t('food.microEvaluation.productLabel', { product: applicable.product.name_ar })}
                  </Typography>
                )}
                {applicable.spec_version?.spec_code && (
                  <Typography variant="caption" color="text.secondary">
                    {t('food.microEvaluation.specRef', { ref: applicable.spec_version.spec_code })}
                  </Typography>
                )}
              </Stack>
            </Box>

            {applicable.limits.length === 0 ? (
              <Typography variant="body2" color="text.secondary">{t('food.microEvaluation.noLimits')}</Typography>
            ) : (
              <>
                <FormSelect
                  label={t('food.microEvaluation.limitLabel')}
                  value={selLimitId}
                  onChange={selectLimit}
                  options={applicable.limits.map((l) => ({ value: l.id, label: limitLabel(l) }))}
                />
                {selLimit && (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip size="small" variant="outlined" label={`n = ${selLimit.n}`} />
                    <Chip size="small" variant="outlined" label={`c = ${selLimit.c}`} />
                    {selLimit.m != null && <Chip size="small" variant="outlined" label={`m = ${selLimit.m}`} />}
                    {selLimit.M != null && <Chip size="small" variant="outlined" label={`M = ${selLimit.M}`} />}
                    <Chip size="small" variant="outlined" label={selLimit.unit || t('food.microEvaluation.unitFallback')} />
                  </Stack>
                )}

                <Divider />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {t('food.microEvaluation.unitResultsLabel', { n: units.length })}
                </Typography>
                {selLimit && isPresenceAbsence(selLimit) ? (
                  units.map((u, idx) => (
                    <FormSelect
                      key={u.unit_number}
                      label={t('food.microEvaluation.unitLabel', { n: u.unit_number })}
                      value={u.qualifier}
                      onChange={(v) => updateUnit(idx, { qualifier: v })}
                      options={[
                        { value: 'NEGATIVE', label: t('food.microEvaluation.negative') },
                        { value: 'POSITIVE', label: t('food.microEvaluation.positive') },
                        { value: 'TENTATIVE', label: t('food.microEvaluation.tentative') },
                      ]}
                    />
                  ))
                ) : (
                  <Stack spacing={1}>
                    {units.map((u, idx) => (
                      <Box key={u.unit_number} sx={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 1, alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {t('food.microEvaluation.unitLabel', { n: u.unit_number })}
                        </Typography>
                        <FormTextField
                          label={t('food.microEvaluation.valueLabel')}
                          type="number"
                          value={u.result_value}
                          onChange={(e) => updateUnit(idx, { result_value: e.target.value })}
                          placeholder={selLimit?.unit || t('food.microEvaluation.valuePlaceholder')}
                          size="small"
                        />
                      </Box>
                    ))}
                  </Stack>
                )}

                <AppButton startIcon={<ScienceIcon />} onClick={submitEvaluation} disabled={evaluating || !selLimit}>
                  {evaluating ? t('food.microEvaluation.evaluating') : t('food.microEvaluation.evaluateLabel')}
                </AppButton>

                {result && (
                  <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.default' }}>
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <StatusChip label={labDecision[result.decision]?.label ?? result.decision} tone={labDecision[result.decision]?.tone} />
                        <Typography variant="caption" color="text.secondary">{result.engine}</Typography>
                      </Stack>
                      <Typography variant="body2">{result.reason}</Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {selLimit && isPresenceAbsence(selLimit) ? (
                          <>
                            <Chip size="small" variant="outlined" label={t('food.microEvaluation.positiveCount', { n: result.counts.positive })} />
                            <Chip size="small" variant="outlined" label={t('food.microEvaluation.negativeCount', { n: result.counts.negative })} />
                          </>
                        ) : (
                          <>
                            <Chip size="small" variant="outlined" label={t('food.microEvaluation.belowM', { n: result.counts.below_m })} />
                            <Chip size="small" variant="outlined" label={t('food.microEvaluation.betweenMAndM', { n: result.counts.between_m_M })} />
                            <Chip size="small" variant="outlined" label={t('food.microEvaluation.aboveM', { n: result.counts.above_M })} />
                          </>
                        )}
                      </Stack>
                    </Stack>
                  </Box>
                )}
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <AppButton variant="ghost" onClick={onClose} disabled={loadingLimits || evaluating}>{t('food.microEvaluation.close')}</AppButton>
      </DialogActions>
    </Dialog>
  );
};

export default MicroEvaluationDialog;
