import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import AddIcon from '@mui/icons-material/Add';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import RiskIcon from '@mui/icons-material/Insights';
import Alert from '@mui/material/Alert';
import { PageHeader } from '../../components/common';
import { AppButton, DataTable, StatusChip, ConfirmDialog } from '../../components/ui';
import { useServerTable } from '../../hooks/useServerTable';
import { getScreenings, getLatestRisk, referScreening } from '../../api/endpoints/screening';
import type { ScreeningRiskAssessment } from '../../api/endpoints/screening';
import type { HealthScreening } from '../../types/screening';
import { formatDateTime, formatTemperature } from '../../utils/formatters';
import { exportToCsv } from '../../utils/csv';
import { notifySuccess, notifyError } from '../../utils/toast';
import { riskLevel, riskRecommendation } from '../../utils/status/screening';
import { labelOf, toneOf } from '../../utils/labels';
import ScreeningForm from '../../components/forms/ScreeningForm';

const ScreeningPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const table = useServerTable<HealthScreening>({ fetchData: getScreenings });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, fetchAllRows } = table;
  const [exporting, setExporting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [referTarget, setReferTarget] = useState<HealthScreening | null>(null);
  const [referring, setReferring] = useState(false);
  const [riskTarget, setRiskTarget] = useState<HealthScreening | null>(null);
  const [assessment, setAssessment] = useState<ScreeningRiskAssessment | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);

  const searchFilter = searchParams.get('search');
  useEffect(() => {
    if (searchFilter) {
      setSearchInput(searchFilter);
    }
  }, [searchFilter, setSearchInput]);

  const goToTraveler = (passportNumber: string) =>
    navigate(`/app/travelers?search=${encodeURIComponent(passportNumber)}`);

  const temperatureTone = (temp: number | null) => {
    if (temp == null) return 'neutral' as const;
    if (temp >= 38) return 'error' as const;
    if (temp >= 37.5) return 'warning' as const;
    return 'success' as const;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const all = await fetchAllRows();
      const headers = [
        t('clinic.screening.csv.traveler'),
        t('clinic.screening.csv.passport'),
        t('clinic.screening.csv.temperature'),
        t('clinic.screening.csv.oxygen'),
        t('clinic.screening.csv.pressure'),
        t('clinic.screening.csv.notes'),
        t('clinic.screening.csv.screenedAt'),
      ];
      const data = all.map((s) => [
        s.traveler_name,
        s.passport_number,
        s.body_temperature != null ? s.body_temperature.toFixed(1) : '',
        s.oxygen_saturation != null ? `${s.oxygen_saturation}%` : '',
        [s.systolic_bp, s.diastolic_bp].filter((v) => v != null).join('/'),
        s.officer_notes,
        formatDateTime(s.screened_at),
      ]);
      exportToCsv(`screening-${new Date().toISOString().slice(0, 10)}.csv`, headers, data);
      notifySuccess(t('clinic.screening.export.success', { count: all.length }));
    } catch {
      notifyError(t('clinic.screening.export.error'));
    } finally {
      setExporting(false);
    }
  };

  const openRisk = async (s: HealthScreening) => {
    setRiskTarget(s);
    setAssessment(null);
    setRiskLoading(true);
    try {
      const res = await getLatestRisk(s.id);
      setAssessment(res.data.data);
    } catch {
      notifyError(t('clinic.screening.risk.noAssessment'));
    } finally {
      setRiskLoading(false);
    }
  };

  const confirmRefer = async () => {
    if (!referTarget || referring) return;
    setReferring(true);
    try {
      await referScreening(referTarget.id);
      notifySuccess(t('clinic.screening.refer.success'));
      setReferTarget(null);
    } catch {
      notifyError(t('clinic.screening.refer.error'));
    } finally {
      setReferring(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title={t('clinic.screening.header.title')}
        subtitle={t('clinic.screening.header.subtitle')}
        eyebrow={t('clinic.clinic.header.eyebrow')}
        action={
          <AppButton variant="primary" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
            {t('clinic.screening.action.newScreening')}
          </AppButton>
        }
      />

      <DataTable<HealthScreening>
        columns={[
          {
            key: 'traveler_name',
            label: t('clinic.screening.cols.traveler'),
            render: (s) => (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'info.light', color: 'info.main', fontWeight: 700, fontSize: 14 }}>
                  {s.traveler_name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {s.traveler_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" dir="ltr">
                    {s.passport_number}
                  </Typography>
                </Box>
              </Box>
            ),
          },
          {
            key: 'body_temperature',
            label: t('clinic.screening.cols.temperature'),
            render: (s) => <StatusChip label={formatTemperature(s.body_temperature)} tone={temperatureTone(s.body_temperature)} />,
          },
          {
            key: 'oxygen_saturation',
            label: t('clinic.screening.cols.oxygen'),
            render: (s) =>
              s.oxygen_saturation != null ? (
                <StatusChip
                  label={`${s.oxygen_saturation}%`}
                  tone={s.oxygen_saturation < 92 ? 'error' : s.oxygen_saturation < 95 ? 'warning' : 'success'}
                />
              ) : (
                '—'
              ),
            hideOnMobile: true,
          },
          {
            key: 'blood_pressure',
            label: t('clinic.screening.cols.pressure'),
            render: (s) => (s.systolic_bp && s.diastolic_bp ? `${s.systolic_bp}/${s.diastolic_bp}` : '—'),
            hideOnMobile: true,
          },
          { key: 'officer_notes', label: t('clinic.screening.cols.notes'), render: (s) => s.officer_notes || '—', hideOnMobile: true },
          {
            key: 'screened_at',
            label: t('clinic.screening.cols.screenedAt'),
            sortable: true,
            render: (s) => formatDateTime(s.screened_at),
            hideOnMobile: true,
          },
        ]}
        rows={rows}
        rowKey={(s) => s.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title={t('clinic.screening.table.title')}
        subtitle={t('clinic.screening.table.subtitle', { count })}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder={t('clinic.screening.table.searchPlaceholder')}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onExport={handleExport}
        exporting={exporting}
        onRefresh={refresh}
        emptyTitle={t('clinic.screening.table.emptyTitle')}
        emptyDescription={t('clinic.screening.table.emptyDescription')}
      actions={(s) => (
            <>
              <Tooltip title={t('clinic.screening.risk.title')}>
                <AppButton
                  variant="ghost"
                  size="small"
                  startIcon={<RiskIcon />}
                  onClick={() => openRisk(s)}
                >
                  {t('clinic.screening.action.risk')}
                </AppButton>
              </Tooltip>
              <Tooltip title={t('clinic.screening.refer.title')}>
                <AppButton
                  variant="ghost"
                  size="small"
                  startIcon={<LocalHospitalIcon />}
                  onClick={() => setReferTarget(s)}
                >
                  {t('clinic.screening.action.refer')}
                </AppButton>
              </Tooltip>
              <Tooltip title={t('clinic.screening.tooltip.viewTraveler')}>
                <AppButton
                  variant="ghost"
                  size="small"
                  startIcon={<PersonSearchIcon />}
                  onClick={() => goToTraveler(s.passport_number)}
                >
                  {t('clinic.screening.action.viewTraveler')}
                </AppButton>
              </Tooltip>
            </>
          )}
        />

      <ScreeningForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setTimeout(refresh, 200);
        }}
      />

      <ConfirmDialog
        open={Boolean(referTarget)}
        title={t('clinic.screening.refer.dialogTitle')}
        message={
          referTarget
            ? t('clinic.screening.refer.message', { name: referTarget.traveler_name })
            : ''
        }
        confirmLabel={t('clinic.screening.refer.confirm')}
        loading={referring}
        tone="info"
        onConfirm={confirmRefer}
        onClose={() => setReferTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(riskTarget)}
        title={t('clinic.screening.risk.dialogTitle')}
        message={t('clinic.screening.risk.message')}
        confirmLabel={t('clinic.screening.risk.confirm')}
        cancelLabel={t('clinic.common.close')}
        tone="info"
        onConfirm={() => setRiskTarget(null)}
        onClose={() => setRiskTarget(null)}
      >
        {riskLoading ? (
          <Typography color="text.secondary">{t('clinic.screening.risk.loading')}</Typography>
        ) : assessment ? (
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
              <StatusChip label={labelOf(riskLevel, assessment.risk_level)} tone={toneOf(riskLevel, assessment.risk_level)} />
              <StatusChip label={labelOf(riskRecommendation, assessment.recommendation)} tone={toneOf(riskRecommendation, assessment.recommendation)} />
            </Stack>
            <Typography variant="body2">{t('clinic.screening.risk.score', { score: assessment.risk_score })}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('clinic.screening.risk.assessed', { at: formatDateTime(assessment.assessed_at) })}
            </Typography>
          </Box>
        ) : (
          <Alert severity="info">{t('clinic.screening.risk.noAssessmentHint')}</Alert>
        )}
      </ConfirmDialog>
    </Box>
  );
};

export default ScreeningPage;
