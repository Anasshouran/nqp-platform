import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '../../components/common';
import { FormTextField } from '../../components/ui';
import {
  createLeaveRequest,
  getEmployees,
  getLeaveBalances,
  getLeaveTypes,
  getMyLeaveSummary,
  submitLeaveRequest,
} from '../../api/endpoints/hr';
import type { Employee, LeaveBalance, LeaveBalanceSummary, LeaveType } from '../../types/hr';
import { useAuth } from '../../hooks/useAuth';
import { extractErrorMessage, notifySuccess } from '../../utils/toast';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

const leaveSchema = z
  .object({
    employee: z.string().min(1, 'حدّد الموظف'),
    leaveType: z.string().min(1, 'حدّد نوع الإجازة'),
    startDate: z.string().regex(ISO, 'تاريخ غير صالح'),
    endDate: z.string().regex(ISO, 'تاريخ غير صالح'),
    isHalfDay: z.boolean(),
    reason: z.string().trim().max(2000).optional(),
    document: z.string().trim().max(255).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'تاريخ النهاية لا يسبق تاريخ البداية',
      });
    }
    if (data.isHalfDay && data.startDate !== data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['isHalfDay'],
        message: 'نصف اليوم ليوم واحد فقط',
      });
    }
  });

type LeaveFormValues = z.infer<typeof leaveSchema>;

const emptyForm: LeaveFormValues = {
  employee: '',
  leaveType: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  isHalfDay: false,
  reason: '',
  document: '',
};

const num = (v: string | number) => (typeof v === 'number' ? v : parseFloat(v) || 0);

/** شريط الاستهلاك: مأخوذ + محجوز مقابل المتاح. */
const BalanceBar = ({ balance }: { balance: LeaveBalance }) => {
  const entitled = num(balance.entitled_days) + num(balance.carried_over_days);
  const taken = num(balance.taken_days);
  const pending = num(balance.pending_days);
  const pct = entitled > 0 ? Math.min(100, Math.round(((taken + pending) / entitled) * 100)) : 0;
  return (
    <Box sx={{ py: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
        <Typography variant="body2" fontWeight={600}>
          {balance.leave_type_name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {num(balance.available_days)} متاح
        </Typography>
      </Stack>
      <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3 }} />
      <Typography variant="caption" color="text.secondary">
        استُهلك {taken}
        {pending > 0 && ` · محجوز ${pending}`}
        {` من ${entitled}`}
      </Typography>
    </Box>
  );
};

const LeavePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEmployee = !['HR_MANAGER', 'HR_SPECIALIST', 'HR_APPROVER'].includes(user?.role ?? '');

  const [types, setTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [mySummary, setMySummary] = useState<LeaveBalanceSummary | null>(null);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitNow, setSubmitNow] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [typesRes, summaryRes] = await Promise.allSettled([
        getLeaveTypes({ page_size: 50, ordering: 'order' }),
        getMyLeaveSummary(),
      ]);
      if (typesRes.status === 'fulfilled') setTypes(typesRes.value.data.data?.results ?? []);
      if (summaryRes.status === 'fulfilled') setMySummary(summaryRes.value.data.data);

      if (!isEmployee) {
        const [empRes, balRes] = await Promise.allSettled([
          getEmployees({ page_size: 100, ordering: 'full_name_ar' }),
          getLeaveBalances({ page_size: 100, ordering: '-year' }),
        ]);
        if (empRes.status === 'fulfilled') setEmployees(empRes.value.data.data?.results ?? []);
        if (balRes.status === 'fulfilled') setBalances(balRes.value.data.data?.results ?? []);
      }
      setLoading(false);
    };
    load();
  }, [isEmployee]);

  const {
    control, handleSubmit, watch,
    formState: { errors, isSubmitting },
  } = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveSchema),
    defaultValues: emptyForm,
    mode: 'onTouched',
  });

  const leaveTypeId = watch('leaveType');
  const selectedType = useMemo(
    () => types.find((t) => t.id === leaveTypeId) ?? null,
    [types, leaveTypeId],
  );

  // الموظف يطلب لنفسه تلقائياً؛ الحقل يظهر لمدير HR فقط.
  const employeeField = !isEmployee;

  const onSubmit = async (values: LeaveFormValues, submitNow: boolean) => {
    setFormError(null);
    const payload: Record<string, unknown> = {
      leave_type: values.leaveType,
      start_date: values.startDate,
      end_date: values.endDate,
      is_half_day: values.isHalfDay,
    };
    if (employeeField) payload.employee = values.employee;
    if (values.reason) payload.reason = values.reason;
    if (values.document) payload.document = values.document;

    try {
      const { data } = await createLeaveRequest(payload);
      const created = data.data;
      if (submitNow) {
        // يُنشأ كمسودة ثم يُرسَل: مسار الإرسال يتحقق من التداخل والرصيد
        // والمستند، فلا يُوجد طلب «مُقدَّم» تجاوز تلك الفحوص.
        await submitLeaveRequest(created.id);
      }
      notifySuccess(submitNow ? 'تم رفع الطلب للاعتماد' : 'تم حفظ المسودة');
      navigate(`/app/hr/leave/${created.id}`);
    } catch (err) {
      setFormError(extractErrorMessage(err, 'تعذر إنشاء الطلب'));
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
        title="الإجازات"
        subtitle="الرصيد يُحسب من الطلبات: أيام معتمدة تُخصم وأيام مُقدَّمة تُحجز"
        action={
          <Stack direction="row" spacing={1}>
            <Button onClick={() => navigate('/app/hr/leave/requests')}>كل الطلبات</Button>
            {!isEmployee && (
              <Button onClick={() => navigate('/app/hr/leave/balances')}>الأرصدة</Button>
            )}
          </Stack>
        }
      />

      {mySummary && mySummary.items.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              رصيدي {mySummary.year}
            </Typography>
            <Divider sx={{ mb: 1 }} />
            <Grid container>
              {mySummary.items.map((b) => (
                <Grid item xs={12} sm={6} md={4} key={b.id}>
                  <BalanceBar balance={b} />
                </Grid>
              ))}
            </Grid>
            <Typography variant="body2" sx={{ mt: 1 }}>
              الإجمالي المتاح: <strong>{num(mySummary.total_available)}</strong> يوم
            </Typography>
          </CardContent>
        </Card>
      )}

      {!isEmployee && balances.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              أرصدة نطاقي الإداري
            </Typography>
            <Divider sx={{ mb: 1 }} />
            <Grid container>
              {balances.slice(0, 12).map((b) => (
                <Grid item xs={12} sm={6} md={4} key={b.id}>
                  <Box sx={{ py: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {b.employee_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {b.leave_type_name} — {num(b.available_days)} متاح من{' '}
                      {num(b.entitled_days) + num(b.carried_over_days)}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
            {balances.length > 12 && (
              <Button size="small" onClick={() => navigate('/app/hr/leave/balances')}>
                عرض كل الأرصدة
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {formError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
          {formError}
        </Alert>
      )}

      {/* زرّان يفعلان `onSubmit` مرتين بمسمّى مختلف: `submitNow`، لا حالة
          معلّقة على `onMouseLeave` الذي لا يعمل بلوحة المفاتيح. */}
      <Box
        component="form"
        onSubmit={handleSubmit((v) => onSubmit(v, submitNow))}
        noValidate
      >
        <Grid container spacing={2}>
          {employeeField && (
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
          )}

          <Grid item xs={12} md={6}>
            <Controller
              name="leaveType"
              control={control}
              render={({ field }) => (
                <FormTextField
                  {...field}
                  select
                  label="نوع الإجازة"
                  required
                  value={field.value}
                  onChange={field.onChange}
                  error={Boolean(errors.leaveType)}
                  helperText={errors.leaveType?.message}
                  hint={
                    selectedType?.requires_document
                      ? 'هذا النوع يطلب مستنداً عند الاعتماد'
                      : undefined
                  }
                >
                  <MenuItem value="">— اختر —</MenuItem>
                  {types.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name_ar}
                      {t.is_paid ? '' : ' (بلا راتب)'}
                    </MenuItem>
                  ))}
                </FormTextField>
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <FormTextField
                  {...field}
                  type="date"
                  label="من تاريخ"
                  required
                  InputLabelProps={{ shrink: true }}
                  value={field.value}
                  onChange={field.onChange}
                  error={Boolean(errors.startDate)}
                  helperText={errors.startDate?.message}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Controller
              name="endDate"
              control={control}
              render={({ field }) => (
                <FormTextField
                  {...field}
                  type="date"
                  label="إلى تاريخ"
                  required
                  InputLabelProps={{ shrink: true }}
                  value={field.value}
                  onChange={field.onChange}
                  error={Boolean(errors.endDate)}
                  helperText={errors.endDate?.message}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Controller
              name="isHalfDay"
              control={control}
              render={({ field }) => (
                <FormTextField
                  {...field}
                  select
                  label="المدة"
                  value={field.value ? 'true' : 'false'}
                  onChange={(e) => field.onChange(e.target.value === 'true')}
                  error={Boolean(errors.isHalfDay)}
                  helperText={errors.isHalfDay?.message}
                >
                  <MenuItem value="false">أيام كاملة</MenuItem>
                  <MenuItem value="true">نصف يوم</MenuItem>
                </FormTextField>
              )}
            />
          </Grid>

          {selectedType?.requires_document && (
            <Grid item xs={12} md={6}>
              <Controller
                name="document"
                control={control}
                render={({ field }) => (
                  <FormTextField
                    {...field}
                    label="المرفق"
                    required
                    value={field.value}
                    onChange={field.onChange}
                    hint="مرجع المستند المرفوع — لا يُعتمد الطلب بدونه"
                  />
                )}
              />
            </Grid>
          )}

          <Grid item xs={12}>
            <Controller
              name="reason"
              control={control}
              render={({ field }) => (
                <FormTextField
                  {...field}
                  multiline
                  minRows={2}
                  label="المبرِّر"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            onClick={() => setSubmitNow(true)}
          >
            حفظ وإرسال للاعتماد
          </Button>
          <Button
            type="submit"
            variant="outlined"
            disabled={isSubmitting}
            onClick={() => setSubmitNow(false)}
          >
            حفظ كمسودة
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default LeavePage;
