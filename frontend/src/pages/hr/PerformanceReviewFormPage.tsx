import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '../../components/common';
import { FormTextField } from '../../components/ui';
import {
  createPerformanceReview,
  getCycleKpis,
  getEmployees,
  getPerformanceCycle,
} from '../../api/endpoints/hr';
import type { Employee, PerformanceCycle } from '../../types/hr';
import { extractErrorMessage, notifySuccess } from '../../utils/toast';

const reviewSchema = z.object({
  cycle: z.string().min(1, 'حدّد الدورة'),
  employee: z.string().min(1, 'حدّد الموظف'),
  strengths: z.string().max(2000, 'النص طويل جداً').optional(),
  improvements: z.string().max(2000, 'النص طويل جداً').optional(),
  comments: z.string().max(2000, 'النص طويل جداً').optional(),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

const PerformanceReviewFormPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [cycles, setCycles] = useState<PerformanceCycle[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hints, setHints] = useState<Record<string, unknown>>({});

  useEffect(() => {
    getPerformanceCycle(params.get('cycle') ?? '').then(
      ({ data }) => setCycles([data.data]),
      () => setCycles([]),
    );
    getEmployees({ page_size: 100, ordering: 'full_name_ar' }).then(
      ({ data }) => setEmployees(data.data?.results ?? []),
      () => setEmployees([]),
    );
  }, [params]);

  const {
    control, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      cycle: params.get('cycle') ?? '',
      employee: '',
      strengths: '',
      improvements: '',
      comments: '',
    },
    mode: 'onTouched',
  });

  const cycleId = watch('cycle');
  useEffect(() => {
    if (!cycleId) {
      setHints({});
      return;
    }
    getCycleKpis(cycleId).then(
      ({ data }) => setHints({ kpis: data.data ?? [] }),
      () => setHints({}),
    );
  }, [cycleId]);

  const kpiList = (hints.kpis as { id: string; name: string; weight: string }[] | undefined) ?? [];

  const onSubmit = async (values: ReviewFormValues) => {
    setError(null);
    try {
      const { data } = await createPerformanceReview({
        cycle: values.cycle,
        employee: values.employee,
        strengths: values.strengths ?? '',
        improvements: values.improvements ?? '',
        comments: values.comments ?? '',
      });
      notifySuccess('تم إنشاء التقييم — أضف درجات المؤشرات ثم أرسله');
      navigate(`/app/hr/performance/reviews/${data.data.id}`);
    } catch (err) {
      setError(extractErrorMessage(err, 'تعذر إنشاء التقييم'));
    }
  };

  return (
    <Box>
      <PageHeader
        title="تقييم أداء جديد"
        subtitle="الدرجات تُدخل في صفحة التقييم؛ الدرجة النهائية والتقدير يُشتقّان منها"
        action={
          <Button onClick={() => navigate('/app/hr/performance/reviews')}>رجوع</Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card>
          <CardContent>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={2}>
              <Controller
                name="cycle"
                control={control}
                render={({ field }) => (
                  <FormTextField
                    {...field}
                    select
                    value={field.value}
                    onChange={(e) => {
                      field.onChange(e);
                      setValue('cycle', e.target.value);
                    }}
                    label="الدورة"
                    required
                    error={Boolean(errors.cycle)}
                    helperText={
                      errors.cycle?.message ??
                      (cycles.length === 0 ? 'مرّر ?cycle=<id> أو اختر من القائمة' : undefined)
                    }
                  >
                    {cycles.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </FormTextField>
                )}
              />
              <Controller
                name="employee"
                control={control}
                render={({ field }) => (
                  <FormTextField
                    {...field}
                    select
                    value={field.value}
                    onChange={field.onChange}
                    label="الموظف"
                    required
                    error={Boolean(errors.employee)}
                    helperText={errors.employee?.message}
                  >
                    {employees.map((e) => (
                      <MenuItem key={e.id} value={e.id}>
                        {e.full_name} — {e.employee_number}
                      </MenuItem>
                    ))}
                  </FormTextField>
                )}
              />
              <Controller
                name="strengths"
                control={control}
                render={({ field }) => (
                  <FormTextField
                    {...field}
                    value={field.value}
                    onChange={field.onChange}
                    label="نقاط القوة"
                    multiline
                    minRows={2}
                  />
                )}
              />
              <Controller
                name="improvements"
                control={control}
                render={({ field }) => (
                  <FormTextField
                    {...field}
                    value={field.value}
                    onChange={field.onChange}
                    label="نقاط التحسين"
                    multiline
                    minRows={2}
                  />
                )}
              />
              <Controller
                name="comments"
                control={control}
                render={({ field }) => (
                  <FormTextField
                    {...field}
                    value={field.value}
                    onChange={field.onChange}
                    label="ملاحظات"
                    multiline
                    minRows={2}
                  />
                )}
              />
            </Stack>

            {kpiList.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  مؤشرات هذه الدورة — تُدخال درجاتها بعد الإنشاء
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {kpiList.map((k) => (
                    <Chip key={k.id} size="small" variant="outlined" label={`${k.name} (${k.weight}%)`} />
                  ))}
                </Stack>
              </Box>
            )}

            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                إنشاء التقييم
              </Button>
              <Button onClick={() => navigate('/app/hr/performance/reviews')}>إلغاء</Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default PerformanceReviewFormPage;
