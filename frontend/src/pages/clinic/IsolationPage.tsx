import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import LogoutIcon from '@mui/icons-material/Logout';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import { PageHeader } from '../../components/common';
import { DataTable, StatusChip } from '../../components/ui';
import { useServerTable } from '../../hooks/useServerTable';
import { getIsolations, releaseIsolation, updateIsolationStatus } from '../../api/endpoints/clinic';
import type { IsolationRow } from '../../types/clinic';
import { formatDate } from '../../utils/formatters';
import { extractErrorMessage, notifyError, notifySuccess } from '../../utils/toast';
import { healthStatusMeta, isolationStatusMeta, isolationTypeMeta, isoSeverityMeta } from '../../utils/clinicStatus';
import { PassportChip, PersonAvatar } from './ui';

const statusOptions = Object.entries(isolationStatusMeta).map(([v, m]) => ({ value: v, label: m.label }));
const isolationOptions = Object.entries(isolationTypeMeta).map(([v, m]) => ({ value: v, label: m.label }));
const healthOptions = Object.entries(healthStatusMeta).map(([v, m]) => ({ value: v, label: m.label }));

const AvatarCell = ({ name, passport }: { name?: string; passport?: string }) => (
  <Stack direction="row" spacing={1.5} alignItems="center">
    <PersonAvatar name={name} size={38} />
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontWeight: 700, fontSize: 14 }} noWrap>
        {name || '—'}
      </Typography>
      <PassportChip number={passport} />
    </Box>
  </Stack>
);

const IsolationPage = () => {
  const navigate = useNavigate();
  const table = useServerTable<IsolationRow>({ fetchData: getIsolations });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  const [statusTarget, setStatusTarget] = useState<IsolationRow | null>(null);
  const [healthStatus, setHealthStatus] = useState('STABLE');
  const [releaseTarget, setReleaseTarget] = useState<IsolationRow | null>(null);
  const [dischargeSummary, setDischargeSummary] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleUpdateStatus = async () => {
    if (!statusTarget || submitting) return;
    setSubmitting(true);
    try {
      await updateIsolationStatus(statusTarget.id, healthStatus);
      notifySuccess('تم تحديث الحالة الصحية');
      setStatusTarget(null);
      refresh();
    } catch (err) {
      notifyError(extractErrorMessage(err, 'تعذر تحديث الحالة الصحية'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRelease = async () => {
    if (!releaseTarget || submitting) return;
    setSubmitting(true);
    try {
      await releaseIsolation(releaseTarget.id, {
        end_date: endDate || undefined,
        discharge_summary: dischargeSummary,
      });
      notifySuccess('تم تسجيل خروج المريض من العزل');
      setReleaseTarget(null);
      setDischargeSummary('');
      setEndDate('');
      refresh();
    } catch (err) {
      notifyError(extractErrorMessage(err, 'تعذر تسجيل الخروج'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="العزل والحجر الصحي"
        subtitle="متابعة حالات العزل داخل العيادة والمستشفى والحجر الإجباري"
        eyebrow="العمليات"
        action={
          <Stack direction="row" spacing={1}>
            <Chip icon={<MonitorHeartIcon />} label="جاري" sx={{ fontWeight: 700 }} variant="outlined" />
          </Stack>
        }
      />
      <DataTable<IsolationRow>
        columns={[
          {
            key: 'traveler_name',
            label: 'المسافر',
            render: (v) => <AvatarCell name={v.traveler_name} passport={v.passport_number} />,
          },
          {
            key: 'isolation_type',
            label: 'نوع العزل',
            hideOnMobile: true,
            render: (v) => {
              const m = isolationTypeMeta[v.isolation_type];
              return m ? <StatusChip label={m.label} tone={m.tone} /> : v.isolation_type;
            },
          },
          {
            key: 'severity',
            label: 'الخطورة',
            hideOnMobile: true,
            render: (v) => {
              const m = isoSeverityMeta[v.severity];
              return m ? <Chip size="small" color={m.color} label={m.label} sx={{ fontWeight: 700 }} /> : (v.severity ?? '—');
            },
          },
          {
            key: 'health_status',
            label: 'الحالة الصحية',
            hideOnMobile: true,
            render: (v) => {
              const m = healthStatusMeta[v.health_status];
              return m ? <StatusChip label={m.label} tone={m.tone} /> : (v.health_status ?? '—');
            },
          },
          {
            key: 'start_date',
            label: 'بداية العزل',
            sortable: true,
            render: (v) => formatDate(v.start_date),
          },
          {
            key: 'required_days',
            label: 'المدة (يوم)',
            hideOnMobile: true,
            render: (v) => v.required_days,
          },
          {
            key: 'status',
            label: 'الحالة',
            render: (v) => {
              const m = isolationStatusMeta[v.status];
              return m ? <StatusChip label={m.label} tone={m.tone} /> : v.status;
            },
          },
        ]}
        rows={rows}
        rowKey={(v) => v.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="سجلات العزل"
        subtitle={`${count} سجل`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث بالاسم أو جواز السفر..."
        filters={[
          {
            key: 'status',
            label: 'الحالة',
            options: statusOptions,
            value: '',
            onChange: (v) => setFilter('status', v),
          },
          {
            key: 'isolation_type',
            label: 'النوع',
            options: isolationOptions,
            value: '',
            onChange: (v) => setFilter('isolation_type', v),
          },
        ]}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد سجلات عزل"
        emptyDescription="سجلات العزل تظهر عند عزل حالات من الزيارات"
        actions={(v) => (
          <>
            <Tooltip title="فتح الزيارة">
              <IconButton
                aria-label="فتح الزيارة"
                size="small"
                color="primary"
                onClick={() => navigate(`/app/clinic/visits/${v.visit}`)}
                sx={{ bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: '#fff' } }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {v.status === 'ACTIVE' && (
              <>
                <Tooltip title="تحديث الحالة الصحية">
                  <IconButton
                    aria-label="تحديث الحالة"
                    size="small"
                    color="info"
                    onClick={() => {
                      setHealthStatus(v.health_status || 'STABLE');
                      setStatusTarget(v);
                    }}
                    sx={{ bgcolor: 'info.light', '&:hover': { bgcolor: 'info.main', color: '#fff' } }}
                  >
                    <MonitorHeartIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="تسجيل الخروج">
                  <IconButton
                    aria-label="خروج"
                    size="small"
                    color="error"
                    onClick={() => {
                      setDischargeSummary('');
                      setEndDate('');
                      setReleaseTarget(v);
                    }}
                    sx={{ bgcolor: 'error.light', '&:hover': { bgcolor: 'error.main', color: '#fff' } }}
                  >
                    <LogoutIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </>
        )}
      />

      <Dialog open={Boolean(statusTarget)} onClose={() => setStatusTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>تحديث الحالة الصحية</DialogTitle>
        <DialogContent dividers>
          <TextField
            select
            fullWidth
            label="الحالة الصحية"
            value={healthStatus}
            onChange={(e) => setHealthStatus(e.target.value)}
          >
            {healthOptions.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setStatusTarget(null)} sx={{ fontWeight: 700 }}>إلغاء</Button>
          <Button
            variant="contained"
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <MonitorHeartIcon />}
            onClick={handleUpdateStatus}
            disabled={submitting}
            sx={{ fontWeight: 700 }}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(releaseTarget)} onClose={() => setReleaseTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>تسجيل خروج من العزل</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              سيتم توثيق خروج {releaseTarget?.traveler_name} وتسجيل تاريخ الانتهاء الفعلي.
            </Typography>
            <TextField
              type="date"
              fullWidth
              label="تاريخ الانتهاء الفعلي"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <TextField
              multiline
              minRows={3}
              fullWidth
              label="ملخص الخروج"
              value={dischargeSummary}
              onChange={(e) => setDischargeSummary(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setReleaseTarget(null)} sx={{ fontWeight: 700 }}>إلغاء</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <LogoutIcon />}
            onClick={handleRelease}
            disabled={submitting}
            sx={{ fontWeight: 700 }}
          >
            تسجيل الخروج
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default IsolationPage;