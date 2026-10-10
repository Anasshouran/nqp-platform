import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '../../components/common';
import { FormTextField } from '../../components/ui';
import StatusChip from '../../components/ui/StatusChip';
import {
  createTrainingEnrollment,
  getEmployees,
  getTrainingEnrollments,
  getTrainingPlans,
  submitTrainingEnrollment,
} from '../../api/endpoints/hr';
import type { Employee, TrainingEnrollment, TrainingPlan } from '../../types/hr';
import { useAuth } from '../../hooks/useAuth';
import {
  DELIVERY_MODE_LABELS,
  enrollmentStatusLabel,
  ENROLLMENT_STATUS_TONES,
} from '../../utils/hrLabels';
import { formatDate } from '../../utils/formatters';
import { extractErrorMessage, notifySuccess } from '../../utils/toast';

const enrollmentSchema = z.object({
  employee: z.string().min(1, 'حدّد الموظف'),
  plan: z.string().uuid('حدّد الدورة'),
});

type EnrollmentFormValues = z.infer<typeof enrollmentSchema>;

const emptyForm: EnrollmentFormValues = { employee: '', plan: '' };

const TrainingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEmployee = !['HR_MANAGER', 'HR_SPECIALIST', 'HR_APPROVER'].includes(user?.role ?? '');

  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [mine, setMine] = useState<TrainingEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitNow, setSubmitNow] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [planRes, enrollRes] = await Promise.allSettled([
        getTrainingPlans({ page_size: 100, ordering: 'order' }),
        getTrainingEnrollments({ page_size: 50, ordering: '-created_at' }),
      ]);
      if (planRes.status === 'fulfilled') setPlans(planRes.value.data.data?.results ?? []);
      if (enrollRes.status === 'fulfilled') setMine(enrollRes.value.data.data?.results ?? []);
      if (!isEmployee) {
        const empRes = await Promise.allSettled([
          getEmployees({ page_size: 100, ordering: 'full_name_ar' }),
        ]);
        if (empRes[0].status === 'fulfilled') {
          setEmployees(empRes[0].value.data.data?.results ?? []);
        }
      }
      setLoading(false);
    };
    load();
  }, [isEmployee]);

  const {
    control, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EnrollmentFormValues>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: emptyForm,
    mode: 'onTouched',
  });

  const onSubmit = async (values: EnrollmentFormValues, now: boolean) => {
    setFormError(null);
    try {
      const { data } = await createTrainingEnrollment({
        employee: values.employee,
        plan: values.plan,
      });
      if (now) await submitTrainingEnrollment(data.data.id);
      notifySuccess(now ? 'تم إرسال طلب الاشتراك' : 'تم حفظ المسودة');
      navigate(`/app/hr/training/${data.data.id}`);
    } catch (err) {
      setFormError(extractErrorMessage(err, 'تعذر إنشاء التسجيل'));
    }
  };

  const activePlans = useMemo(() => plans.filter((p) => p.is_active), [plans]);

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
        title="التدريب"
        subtitle="اشترك في دورة، واعتمد اشتراكك، ثم تُسجَّل الدرجة فيُشتق الإتمام منها"
        action={
          <Button onClick={() => navigate('/app/hr/training/enrollments')}>
            كل التسجيلات
          </Button>
        }
      />

      {formError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
          {formError}
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={handleSubmit((v) => onSubmit(v, submitNow))}
        noValidate
      >
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              اشتراك في دورة
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              {!isEmployee && (
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
                  name="plan"
                  control={control}
                  render={({ field }) => (
                    <FormTextField
                      {...field}
                      select
                      label="الدورة"
                      required
                      value={field.value}
                      onChange={field.onChange}
                      error={Boolean(errors.plan)}
                      helperText={errors.plan?.message}
                    >
                      <MenuItem value="">— اختر —</MenuItem>
                      {activePlans.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.name_ar} ({p.duration_hours}س)
                        </MenuItem>
                      ))}
                    </FormTextField>
                  )}
                />
              </Grid>
            </Grid>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                onClick={() => setSubmitNow(true)}
              >
                اشتراك وإرسال للاعتماد
              </Button>
              <Button
                type="submit"
                variant="outlined"
                disabled={isSubmitting}
                onClick={() => setSubmitNow(false)}
              >
                حفظ كمسودة
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Grid container spacing={2}>
        {activePlans.map((plan) => (
          <Grid item xs={12} sm={6} md={4} key={plan.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Typography variant="body1" fontWeight={700}>
                    {plan.name_ar}
                  </Typography>
                  {plan.is_mandatory && <Chip size="small" color="warning" label="إلزامي" />}
                </Stack>
                <Typography variant="caption" color="text.secondary" dir="ltr">
                  {plan.code}
                </Typography>
                {plan.description && (
                  <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
                    {plan.description}
                  </Typography>
                )}
                <Divider sx={{ my: 1.5 }} />
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={DELIVERY_MODE_LABELS[plan.delivery_mode] ?? plan.delivery_mode}
                  />
                  <Chip size="small" variant="outlined" label={`${plan.duration_hours} ساعة`} />
                  <Chip size="small" variant="outlined" label={`${plan.employee_count} مسجَّل`} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {mine.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              تسجيلاتي
            </Typography>
            <Divider sx={{ mb: 1 }} />
            {mine.map((e) => (
              <Box
                key={e.id}
                onClick={() => navigate(`/app/hr/training/${e.id}`)}
                sx={{
                  py: 1.25,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'action.hover' },
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <StatusChip
                    label={enrollmentStatusLabel(e.status)}
                    tone={ENROLLMENT_STATUS_TONES[e.status] ?? 'neutral'}
                  />
                  <Typography variant="body2" fontWeight={600}>
                    {e.plan_name}
                  </Typography>
                  {e.start_date && (
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(e.start_date)}
                    </Typography>
                  )}
                </Stack>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default TrainingPage;
