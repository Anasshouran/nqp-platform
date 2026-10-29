import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Collapse from '@mui/material/Collapse';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { PageHeader, ErrorState, EmptyState } from '../../components/common';
import StatusChip from '../../components/ui/StatusChip';
import { getEmployee, getEmployeeTimeline, createTimelineEvent } from '../../api/endpoints/hr';
import type { EmployeeDetail, EmployeeTimelineEntry, TimelineEventType } from '../../types/hr';
import {
  employmentStatusTone,
  TIMELINE_EVENT_TONES,
  TIMELINE_EVENT_LABELS,
} from '../../utils/hrLabels';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { notifySuccess, notifyError, extractErrorMessage } from '../../utils/toast';

interface DetailRowProps {
  label: string;
  value: ReactNode;
}

const DetailRow = ({ label, value }: DetailRowProps) => (
  <Box sx={{ py: 1 }}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    {typeof value === 'string' || value === null || value === undefined ? (
      <Typography variant="body2" fontWeight={500}>
        {value && value.trim() ? value : '—'}
      </Typography>
    ) : (
      <Typography variant="body2" fontWeight={500} component="div">
        {value}
      </Typography>
    )}
  </Box>
);

/** تبديل قديم/جديد داخل صف المسار الوظيفي. */
const ChangeCell = ({ from, to }: { from: string | null; to: string | null }) => {
  if (!from && !to) return <Typography variant="body2" color="text.disabled">—</Typography>;
  if (!from) return <Typography variant="body2">{to}</Typography>;
  if (!to) return <Typography variant="body2">{from}</Typography>;
  return (
    <Typography variant="body2" noWrap>
      <Box component="span" sx={{ color: 'text.secondary' }}>{from}</Box>
      {' ← '}
      <Box component="span" sx={{ fontWeight: 600 }}>{to}</Box>
    </Typography>
  );
};

const EmployeeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [timeline, setTimeline] = useState<EmployeeTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const tabParam = searchParams.get('tab');
  const tab: 0 | 1 | 2 = tabParam === 'timeline' ? 1 : tabParam === 'assignments' ? 2 : 0;

  const loadTimeline = useCallback(async () => {
    if (!id) return;
    setTimelineLoading(true);
    try {
      const { data } = await getEmployeeTimeline(id);
      setTimeline(data.data ?? []);
    } catch (err) {
      notifyError(extractErrorMessage(err, t('hr.employeeDetail.errors.timelineLoad')));
    } finally {
      setTimelineLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const { data } = await getEmployee(id);
        if (cancelled) return;
        setEmployee(data.data);
      } catch (err) {
        if (!cancelled) setError(extractErrorMessage(err, t('hr.employeeDetail.errors.employeeLoad')));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  useEffect(() => {
    if (tab === 1) loadTimeline();
  }, [tab, loadTimeline, t]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !employee) {
    return <ErrorState message={error ?? t('hr.employeeDetail.errors.employeeNotFound')} onRetry={() => navigate('/app/hr/employees')} />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/app/hr/employees')}
        sx={{ mb: 2 }}
      >
        {t('hr.employeeDetail.button.backToList')}
      </Button>

      <PageHeader
        title={employee.full_name || t('hr.employeeDetail.pageHeader.titleFallback')}
        subtitle={employee.job_title || undefined}
        action={
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/app/hr/employees/${employee.id}/edit`)}
          >
            {t('hr.employeeDetail.button.edit')}
          </Button>
        }
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ md: 'center' }}>
            <Avatar
              src={employee.photo ?? undefined}
              sx={{ width: 72, height: 72, fontSize: 28 }}
            >
              {(employee.full_name || '؟').charAt(0)}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="h6" fontWeight={700}>
                  {employee.full_name || '—'}
                </Typography>
                <StatusChip
                  label={t(`hr.employeeDetail.employmentStatus.${employee.employment_status}`) ?? employee.employment_status}
                  tone={employmentStatusTone(employee.employment_status)}
                />
                <StatusChip
                  label={t(`hr.employeeDetail.employmentType.${employee.employment_type}`) ?? employee.employment_type}
                  tone="info"
                  showIcon={false}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {t('hr.employeeDetail.label.employeeNumber')}: <Box component="span" sx={{ fontWeight: 600 }}>{employee.employee_number || '—'}</Box>
              </Typography>
              <Typography variant="body2" color="text.secondary" dir="ltr" sx={{ textAlign: 'right' }}>
                {employee.email}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Tabs
        value={tab}
        onChange={(_, v: 0 | 1 | 2) =>
          setSearchParams(v === 1 ? { tab: 'timeline' } : v === 2 ? { tab: 'assignments' } : {})
        }
        sx={{ mb: 2 }}
      >
        <Tab label={t('hr.employeeDetail.tabs.jobData')} />
        <Tab label={t('hr.employeeDetail.tabs.timeline', { count: employee.timeline_count })} />
        <Tab label={t('hr.employeeDetail.tabs.assignments')} />
      </Tabs>

      {tab === 0 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  {t('hr.employeeDetail.sections.jobData')}
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={6}><DetailRow label={t('hr.employeeDetail.rows.jobTitle')} value={employee.job_title} /></Grid>
                  <Grid item xs={12} sm={6}><DetailRow label={t('hr.employeeDetail.rows.position')} value={employee.position_name} /></Grid>
                  <Grid item xs={12} sm={6}><DetailRow label={t('hr.employeeDetail.rows.department')} value={employee.department_name} /></Grid>
                  <Grid item xs={12} sm={6}><DetailRow label={t('hr.employeeDetail.rows.sector')} value={employee.sector_name} /></Grid>
                  <Grid item xs={12} sm={6}><DetailRow label={t('hr.employeeDetail.rows.hireDate')} value={employee.hire_date ? formatDate(employee.hire_date) : null} /></Grid>
                  <Grid item xs={12} sm={6}>
                    <DetailRow
                      label={t('hr.employeeDetail.rows.probationEnd')}
                      value={employee.probation_end_date ? formatDate(employee.probation_end_date) : null}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}><DetailRow label={t('hr.employeeDetail.rows.manager')} value={employee.manager_name} /></Grid>
                  <Grid item xs={12} sm={6}><DetailRow label={t('hr.employeeDetail.rows.office')} value={employee.office} /></Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  {t('hr.employeeDetail.sections.education')}
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={6}><DetailRow label={t('hr.employeeDetail.rows.degree')} value={employee.degree} /></Grid>
                  <Grid item xs={12} sm={6}><DetailRow label={t('hr.employeeDetail.rows.specialization')} value={employee.specialization} /></Grid>
                </Grid>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  {t('hr.employeeDetail.sections.contact')}
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={6}><DetailRow label={t('hr.employeeDetail.rows.phone')} value={employee.phone} /></Grid>
                  <Grid item xs={12} sm={6}><DetailRow label={t('hr.employeeDetail.rows.internalPhone')} value={employee.internal_phone} /></Grid>
                  <Grid item xs={12} sm={12}><DetailRow label={t('hr.employeeDetail.rows.address')} value={employee.home_address} /></Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  {t('hr.employeeDetail.sections.emergencyContact')}
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={6}><DetailRow label={t('hr.employeeDetail.rows.name')} value={employee.emergency_contact_name} /></Grid>
                  <Grid item xs={12} sm={6}><DetailRow label={t('hr.employeeDetail.rows.relation')} value={employee.emergency_contact_relation} /></Grid>
                  <Grid item xs={12} sm={6}><DetailRow label={t('hr.employeeDetail.rows.phone')} value={employee.emergency_contact_phone} /></Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 1 && (
        <Card>
          <CardContent>
            <TimelinePanel
              employeeId={employee.id}
              entries={timeline}
              loading={timelineLoading}
              expanded={expanded}
              onToggle={setExpanded}
              onCreated={loadTimeline}
              saving={saving}
              onSavingChange={setSaving}
            />
          </CardContent>
        </Card>
      )}

      {tab === 2 && (
        <Card>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <AccountTreeIcon color="primary" />
              <Typography variant="subtitle1" fontWeight={700}>
                t('hr.employeeDetail.sections.assignments')
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('hr.employeeDetail.assignments.derived')}
            </Typography>
            <Divider sx={{ mb: 1 }} />
            {employee.assignments.length === 0 ? (
              <EmptyState
                title={t('hr.employeeDetail.emptyAssignments.title')}
                description={t('hr.employeeDetail.emptyAssignments.description')}
              />
            ) : (
              employee.assignments.map((a) => (
                <Box key={a.id} sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body1" fontWeight={600}>
                      {a.position_name || t('hr.employeeDetail.assignments.noTitle')}
                    </Typography>
                    {a.is_primary && <StatusChip label={t('hr.employeeDetail.assignments.primary')} tone="primary" showIcon={false} />}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {[a.sector_name, a.department_name, a.station_name, a.entry_point_name]
                      .filter(Boolean)
                      .join(' — ') || '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('hr.employeeDetail.assignments.from')} {a.start_date ? formatDate(a.start_date) : '—'}
                    {a.end_date ? t('hr.employeeDetail.assignments.to') + ' ' + formatDate(a.end_date) : ''}
                  </Typography>
                </Box>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

interface TimelinePanelProps {
  employeeId: string;
  entries: EmployeeTimelineEntry[];
  loading: boolean;
  expanded: string | null;
  onToggle: (id: string | null) => void;
  onCreated: () => void;
  saving: boolean;
  onSavingChange: (value: boolean) => void;
}

const TimelinePanel = ({
  employeeId, entries, loading, expanded, onToggle, onCreated, saving, onSavingChange,
}: TimelinePanelProps) => {
  const { t } = useTranslation();
  const [formOpen, setFormOpen] = useState(false);
  const [event, setEvent] = useState<TimelineEventType>('HIRE');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [reason, setReason] = useState('');

  const resetForm = () => {
    setEvent('HIRE');
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate('');
    setNewPosition('');
    setNewDepartment('');
    setReason('');
  };

  const submit = async () => {
    onSavingChange(true);
    try {
      await createTimelineEvent({
        employee: employeeId,
        event,
        start_date: startDate,
        end_date: endDate || null,
        new_position: newPosition,
        new_department: newDepartment,
        reason,
      });
      notifySuccess(t('hr.employeeDetail.messages.eventRecorded'));
      setFormOpen(false);
      resetForm();
      onCreated();
    } catch (err) {
      notifyError(extractErrorMessage(err, t('hr.employeeDetail.errors.eventCreate')));
    } finally {
      onSavingChange(false);
    }
  };

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          t('hr.employeeDetail.timeline.panelTitle')
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={formOpen ? <ExpandLessIcon /> : <AddIcon />}
          onClick={() => {
            setFormOpen((v) => !v);
            if (formOpen) resetForm();
          }}
        >
          {formOpen ? t('hr.employeeDetail.timeline.button.cancel') : t('hr.employeeDetail.timeline.button.registerEvent')}
        </Button>
      </Stack>

      <Collapse in={formOpen}>
        <Card variant="outlined" sx={{ mb: 3, p: 2, backgroundColor: 'action.hover' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                select
                fullWidth
                label={t('hr.employeeDetail.timeline.form.eventType')}
                value={event}
                onChange={(e) => setEvent(e.target.value as TimelineEventType)}
              >
                {Object.keys(TIMELINE_EVENT_LABELS).map((value) => (
                  <MenuItem key={value} value={value}>
                    {t(`hr.employeeDetail.timelineEvent.${value}`) ?? value}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                type="date"
                label={t('hr.employeeDetail.timeline.form.startDate')}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                type="date"
                label={t('hr.employeeDetail.timeline.form.endDate')}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('hr.employeeDetail.timeline.form.newPosition')}
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('hr.employeeDetail.timeline.form.newDepartment')}
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                label={t('hr.employeeDetail.timeline.form.reason')}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Stack direction="row" justifyContent="flex-end">
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                  disabled={saving || !startDate}
                  onClick={submit}
                >
                  t('hr.employeeDetail.timeline.form.save')
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Card>
      </Collapse>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : entries.length === 0 ? (
        <EmptyState
          title={t('hr.employeeDetail.emptyTimeline.title')}
          description={t('hr.employeeDetail.emptyTimeline.description')}
        />
      ) : (
        entries.map((entry) => (
          <Box key={entry.id}>
            <Box
              onClick={() => onToggle(expanded === entry.id ? null : entry.id)}
              sx={{
                py: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                '&:hover': { backgroundColor: 'action.hover' },
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <StatusChip
                      label={t(`hr.employeeDetail.timelineEvent.${entry.event}`) ?? entry.event_display}
                      tone={TIMELINE_EVENT_TONES[entry.event] ?? 'neutral'}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(entry.start_date)}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 0.5 }} noWrap>
                    <ChangeCell from={entry.old_position || entry.old_department} to={entry.new_position || entry.new_department} />
                  </Typography>
                </Box>
                {expanded === entry.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </Stack>
            </Box>
            <Collapse in={expanded === entry.id}>
              <Box sx={{ py: 2, px: 1, backgroundColor: 'action.hover', borderRadius: 1 }}>
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={6}>
                    <DetailRow label={t('hr.employeeDetail.rows.position')} value={<ChangeCellFromTo from={entry.old_position} to={entry.new_position} />} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <DetailRow
                      label={t('hr.employeeDetail.rows.department')}
                      value={<ChangeCellFromTo from={entry.old_department} to={entry.new_department} />}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <DetailRow
                      label={t('hr.employeeDetail.rows.sector')}
                      value={<ChangeCellFromTo from={entry.old_sector} to={entry.new_sector} />}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <DetailRow
                      label={t('hr.employeeDetail.rows.entryPoint')}
                      value={<ChangeCellFromTo from={entry.old_entry_point} to={entry.new_entry_point} />}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <DetailRow
                      label={t('hr.employeeDetail.rows.duration')}
                      value={
                        entry.end_date
                          ? `${formatDate(entry.start_date)} — ${formatDate(entry.end_date)}`
                          : formatDate(entry.start_date)
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <DetailRow label={t('hr.employeeDetail.rows.createdBy')} value={entry.created_by_name} />
                  </Grid>
                  {entry.reason && (
                    <Grid item xs={12}>
                      <DetailRow label={t('hr.employeeDetail.rows.reason')} value={entry.reason} />
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      {formatDateTime(entry.created_at)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Collapse>
          </Box>
        ))
      )}
    </Box>
  );
};

/** عرض من → إلى كعنصر React داخل DetailRow. */
const ChangeCellFromTo = ({ from, to }: { from: string | null; to: string | null }) => {
  if (!from && !to) return <>—</>;
  if (!from) return <>{to}</>;
  if (!to) return <>{from}</>;
  return (
    <>
      {from} ← {to}
    </>
  );
};

export default EmployeeDetailPage;
