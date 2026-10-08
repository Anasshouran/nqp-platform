import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '../../components/common';
import { FormTextField } from '../../components/ui';
import KpiCard from '../../components/dashboard/KpiCard';
import {
  createAttendanceRecord,
  getEmployees,
  getMyAttendanceSummary,
} from '../../api/endpoints/hr';
import type { AttendanceStatus, Employee } from '../../types/hr';
import {
  ATTENDANCE_NEEDS_PUNCH,
  ATTENDANCE_NO_PUNCH,
  ATTENDANCE_STATUS_LABELS,
  attendanceStatusLabel,
} from '../../utils/hrLabels';
import { extractErrorMessage, notifySuccess } from '../../utils/toast';

/** الخادم يفرض هذه القواعد أيضاً؛ نكرّرها هنا ليُصحَّح الحقل فوره. */
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const attendanceSchema = z
  .object({
    employee: z.string().uuid('حدّد الموظف'),
    date: z.string().min(1, 'التاريخ مطلوب'),
    status: z.enum([
      'PRESENT', 'ABSENT', 'LATE', 'EARLY_LEAVE', 'REMOTE', 'ON_LEAVE', 'OFF_DAY',
    ]),
    checkIn: z.string().regex(HHMM, 'وقت غير صالح (HH:MM)').or(z.literal('')),
    checkOut: z.string().regex(HHMM, 'وقت غير صالح (HH:MM)').or(z.literal('')),
    overtimeMinutes: z.coerce.number().int().min(0, 'لا يمكن أن يكون سالباً'),
    shiftCode: z.string().max(40).optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    const status = data.status as AttendanceStatus;
    const hasIn = Boolean(data.checkIn);
    const hasOut = Boolean(data.checkOut);

    if (ATTENDANCE_NO_PUNCH.includes(status) && (hasIn || hasOut)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['checkIn'],
        message: `حالة «${attendanceStatusLabel(status)}» لا تقبل أوقات حضور/انصراف`,
      });
    }
    if (ATTENDANCE_NEEDS_PUNCH.includes(status) && !hasIn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['checkIn'],
        message: 'هذه الحالة تتطلّب وقت حضور',
      });
    }
    if (hasIn && hasOut && data.checkOut! <= data.checkIn!) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['checkOut'],
        message: 'وقت الانصراف يجب أن يكون بعد وقت الحضور',
      });
    }
    const today = new Date().toISOString().slice(0, 10);
    if (data.date > today) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['date'], message: 'لا يُسجَّل حضور لتاريخ مستقبلي' });
    }
  });

type AttendanceFormValues = z.infer<typeof attendanceSchema>;

const emptyForm: AttendanceFormValues = {
  employee: '',
  date: new Date().toISOString().slice(0, 10),
  status: 'PRESENT',
  checkIn: '08:00',
  checkOut: '16:00',
  overtimeMinutes: 0,
  shiftCode: '',
  notes: '',
};

const today = () => new Date().toISOString().slice(0, 10);

const AttendancePage = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [summary, setSummary] = useState<{
    present: number; absent: number; late: number; overtime: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([
      getEmployees({ page_size: 100, ordering: 'full_name_ar' }),
      getMyAttendanceSummary(30),
    ]).then(([emp, sum]) => {
      if (emp.status === 'fulfilled') setEmployees(emp.value.data.data?.results ?? []);
      if (sum.status === 'fulfilled') {
        const s = sum.value.data.data;
        if (s && s.period_days) {
          setSummary({
            present: s.present_days,
            absent: s.absent_days,
            late: s.late_days,
            overtime: s.total_overtime_minutes,
          });
        }
      }
    }).finally(() => setLoading(false));
  }, []);

  const {
    control, handleSubmit, watch, reset,
    formState: { errors, isSubmitting },
  } = useForm<AttendanceFormValues>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: emptyForm,
    mode: 'onTouched',
  });

  const status = watch('status') as AttendanceStatus;
  const showPunches = !ATTENDANCE_NO_PUNCH.includes(status);

  const onSubmit = async (values: AttendanceFormValues) => {
    setFormError(null);
    const payload: Record<string, unknown> = {
      employee: values.employee,
      date: values.date,
      status: values.status,
      overtime_minutes: values.overtimeMinutes,
    };
    if (showPunches) {
      if (values.checkIn) payload.check_in = values.checkIn;
      if (values.checkOut) payload.check_out = values.checkOut;
    }
    if (values.shiftCode) payload.shift_code = values.shiftCode;
    if (values.notes) payload.notes = values.notes;

    try {
      await createAttendanceRecord(payload);
      notifySuccess('تم تسجيل الحضور');
      reset({ ...emptyForm, date: today() });
    } catch (err) {
      setFormError(extractErrorMessage(err, 'تعذر تسجيل الحضور'));
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="الحضور والانصراف"
        subtitle="سجل يومي لكل موظف — يُوثَّق من مصدره ثم يُعتمد من طرف ثالث"
        action={
          <Stack direction="row" spacing={1}>
            <Button onClick={() => navigate('/app/hr/attendance/records')}>
              كل السجلات
            </Button>
            <Button onClick={() => navigate('/app/hr/postings')}>طلبات النقل</Button>
          </Stack>
        }
      />

      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <KpiCard label="أيام الحضور (30 يوم)" value={summary.present} accent="success.main" />
          </Grid>
          <Grid item xs={6} md={3}>
            <KpiCard label="أيام الغياب" value={summary.absent} accent="error.main" />
          </Grid>
          <Grid item xs={6} md={3}>
            <KpiCard label="مرات التأخر" value={summary.late} accent="warning.main" />
          </Grid>
          <Grid item xs={6} md={3}>
            <KpiCard
              label="دقائق إضافية"
              value={summary.overtime}
              accent="info.main"
            />
          </Grid>
        </Grid>
      )}

      {formError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
          {formError}
        </Alert>
      )}
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Controller
              name="employee"
              control={control}
              render={({ field }) => (
                <FormTextField
                  {...field}
                  select
                  label="الموظف"
                  required
                  value={field.value}
                  onChange={field.onChange}
                  error={Boolean(errors.employee)}
                  helperText={errors.employee?.message}
                  hint="لا يُسجَّل الحضور الذاتي من هنا"
                >
                  <MenuItem value="">— اختر —</MenuItem>
                  {employees.map((e) => (
                    <MenuItem key={e.id} value={e.id}>
                      {e.full_name} — {e.employee_number}
                    </MenuItem>
                  ))}
                </FormTextField>
              )}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <FormTextField
                  {...field}
                  type="date"
                  label="التاريخ"
                  required
                  InputLabelProps={{ shrink: true }}
                  value={field.value}
                  onChange={field.onChange}
                  error={Boolean(errors.date)}
                  helperText={errors.date?.message}
                  hint="سجل واحد لكل موظف في اليوم"
                />
              )}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <FormTextField
                  {...field}
                  select
                  label="الحالة"
                  required
                  value={field.value}
                  onChange={field.onChange}
                >
                  {Object.entries(ATTENDANCE_STATUS_LABELS).map(([v, l]) => (
                    <MenuItem key={v} value={v}>
                      {l}
                    </MenuItem>
                  ))}
                </FormTextField>
              )}
            />
          </Grid>

          {showPunches && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <Controller
                  name="checkIn"
                  control={control}
                  render={({ field }) => (
                    <FormTextField
                      {...field}
                      type="time"
                      label="وقت الحضور"
                      InputLabelProps={{ shrink: true }}
                      value={field.value}
                      onChange={field.onChange}
                      error={Boolean(errors.checkIn)}
                      helperText={errors.checkIn?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Controller
                  name="checkOut"
                  control={control}
                  render={({ field }) => (
                    <FormTextField
                      {...field}
                      type="time"
                      label="وقت الانصراف"
                      InputLabelProps={{ shrink: true }}
                      value={field.value}
                      onChange={field.onChange}
                      error={Boolean(errors.checkOut)}
                      helperText={errors.checkOut?.message}
                    />
                  )}
                />
              </Grid>
            </>
          )}

          <Grid item xs={12} sm={6} md={3}>
            <Controller
              name="overtimeMinutes"
              control={control}
              render={({ field }) => (
                <FormTextField
                  {...field}
                  type="number"
                  label="دقائق إضافية"
                  value={field.value}
                  onChange={field.onChange}
                  error={Boolean(errors.overtimeMinutes)}
                  helperText={errors.overtimeMinutes?.message}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Controller
              name="shiftCode"
              control={control}
              render={({ field }) => (
                <FormTextField
                  {...field}
                  label="رمز الوردية"
                  value={field.value}
                  onChange={field.onChange}
                  hint="اختياري — تُنظَّم كمناوبات في مرحلة لاحقة"
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <FormTextField
                  {...field}
                  multiline
                  minRows={2}
                  label="ملاحظات"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            تسجيل الحضور
          </Button>
          <Button
            onClick={() => {
              reset({ ...emptyForm, date: today() });
              setFormError(null);
            }}
            disabled={isSubmitting}
          >
            مسح النموذج
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default AttendancePage;
