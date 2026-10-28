import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { PageHeader, ErrorState } from '../../components/common';
import { FormTextField } from '../../components/ui';
import StatusChip from '../../components/ui/StatusChip';
import {
  addCycleKpi,
  deleteCycleKpi,
  getCycleKpis,
  getPerformanceCycle,
} from '../../api/endpoints/hr';
import type { PerformanceKPI } from '../../types/hr';
import { formatDate } from '../../utils/formatters';
import { extractErrorMessage, notifySuccess, notifyError } from '../../utils/toast';
import { ConfirmDialog } from '../../components/uikit';

const PerformanceCycleDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [cycle, setCycle] = useState<Awaited<ReturnType<typeof getPerformanceCycle>>['data']['data'] | null>(null);
  const [kpis, setKpis] = useState<PerformanceKPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PerformanceKPI | null>(null);
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [cycleRes, kpiRes] = await Promise.allSettled([
        getPerformanceCycle(id),
        getCycleKpis(id),
      ]);
      if (cycleRes.status === 'fulfilled') setCycle(cycleRes.value.data.data);
      if (kpiRes.status === 'fulfilled') setKpis(kpiRes.value.data.data ?? []);
      if (cycleRes.status === 'rejected') {
        setError(extractErrorMessage(cycleRes.reason, t('hr.performanceCycle.errors.loadCycle')));
      } else {
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const total = kpis.reduce((sum, k) => sum + Number(k.weight), 0);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setBusy(true);
    setFormError(null);
    try {
      await addCycleKpi(id, {
        name: name.trim(),
        weight: Number(weight),
      });
      setName('');
      setWeight('');
      notifySuccess(t('hr.performanceCycle.messages.kpiAdded'));
      await load();
    } catch (err) {
      setFormError(extractErrorMessage(err, t('hr.performanceCycle.errors.addKpi')));
    } finally {
      setBusy(false);
    }
  };

  const confirmDeleteKpi = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deleteCycleKpi(deleteTarget.id);
      notifySuccess(t('hr.performanceCycle.messages.kpiDeleted'));
      setDeleteTarget(null);
      await load();
    } catch (err) {
      notifyError(extractErrorMessage(err, t('hr.performanceCycle.errors.deleteKpi')));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!cycle) return <ErrorState message={error ?? t('hr.performanceCycle.errors.cycleNotFound')} />;

  const editable = cycle.status === 'DRAFT' || cycle.status === 'OPEN';
  const balanced = Math.round(total) === 100;

  return (
    <Box>
      <PageHeader
        title={cycle.name}
        subtitle={`${formatDate(cycle.period_start)} ← ${formatDate(cycle.period_end)}`}
        action={
          <Stack direction="row" spacing={1}>
            <Button onClick={() => navigate('/app/hr/performance/cycles')}>
              {t('hr.performanceCycle.actions.back')}
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate(`/app/hr/performance/reviews/new?cycle=${cycle.id}`)}
            >
              {t('hr.performanceCycle.actions.newReview')}
            </Button>
          </Stack>
        }
      />

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <StatusChip
                  label={t(`hr.performanceCycle.statusLabels.${cycle.status}`) ?? cycle.status}
                  tone={cycle.status === 'OPEN' ? 'info' : cycle.status === 'CLOSED' ? 'success' : 'neutral'}
                />
                {cycle.review_count !== null && cycle.approved_count !== null && (
                  <Typography variant="caption" color="text.secondary">
                    {t('hr.performanceCycle.reviewCount', { approved: cycle.approved_count, total: cycle.review_count })}
                  </Typography>
                )}
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                {t('hr.performanceCycle.sections.kpis')}
              </Typography>

              {!balanced && (
                <Alert severity={total > 100 ? 'error' : 'warning'} sx={{ mb: 2 }}>
                  {t('hr.performanceCycle.alerts.weightsIncomplete', { total })}
                </Alert>
              )}
              {balanced && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {t('hr.performanceCycle.alerts.weightsComplete')}
                </Alert>
              )}
              <LinearProgress
                variant="determinate"
                value={Math.min(total, 100)}
                color={balanced ? 'success' : total > 100 ? 'error' : 'warning'}
                sx={{ mb: 2, height: 8, borderRadius: 4 }}
              />

              {kpis.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t('hr.performanceCycle.empty.noKpis')}
                </Typography>
              ) : (
                kpis.map((kpi) => (
                  <Box
                    key={kpi.id}
                    sx={{ display: 'flex', alignItems: 'center', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {kpi.name}
                      </Typography>
                      {kpi.description && (
                        <Typography variant="caption" color="text.secondary">
                          {kpi.description}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ mx: 2 }} dir="ltr">
                      {kpi.weight}%
                    </Typography>
                    {editable && (
                      <Button
                        size="small"
                        color="error"
                        disabled={busy}
                        aria-label={t('hr.performanceCycle.actions.deleteKpi')}
                        onClick={() => setDeleteTarget(kpi)}
                      >
                        <DeleteIcon fontSize="small" />
                      </Button>
                    )}
                  </Box>
                ))
              )}

              {formError && (
                <Alert severity="error" sx={{ mt: 2 }} onClose={() => setFormError(null)}>
                  {formError}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                {t('hr.performanceCycle.sections.addKpi')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {!editable ? (
                <Alert severity="info">
                  {t('hr.performanceCycle.alerts.cycleClosed')}
                </Alert>
              ) : (
                <Box component="form" onSubmit={onAdd}>
                  <Stack spacing={2}>
                    <FormTextField
                      label={t('hr.performanceCycle.form.kpiName')}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                    <FormTextField
                      label={t('hr.performanceCycle.form.weight')}
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      required
                      inputProps={{ min: 1, max: 100, step: 1 }}
                      helperText={t('hr.performanceCycle.form.weightHelper')}
                    />
                    <Button type="submit" variant="contained" startIcon={<AddIcon />} disabled={busy}>
                      {t('hr.performanceCycle.actions.add')}
                    </Button>
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('hr.performanceCycle.dialogs.deleteKpiTitle')}
        message={
          deleteTarget
            ? t('hr.performanceCycle.dialogs.deleteKpiMessage', { name: deleteTarget.name })
            : ''
        }
        confirmLabel={t('hr.performanceCycle.dialogs.confirmDelete')}
        tone="error"
        loading={busy}
        onClose={() => {
          if (!busy) setDeleteTarget(null);
        }}
        onConfirm={confirmDeleteKpi}
      />
    </Box>
  );
};

export default PerformanceCycleDetailPage;
