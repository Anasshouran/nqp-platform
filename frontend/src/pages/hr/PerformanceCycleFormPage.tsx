import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '../../components/common';
import { FormTextField } from '../../components/ui';
import { createPerformanceCycle } from '../../api/endpoints/hr';
import { getDepartments } from '../../api/endpoints/organization';
import type { Department } from '../../types/organization';
import { extractErrorMessage, notifySuccess } from '../../utils/toast';

const cycleSchema = z.object({
  name: z.string().min(3, 'اسم الدورة مطلوب'),
  period_start: z.string().min(1, 'حدّد بداية الفترة'),
  period_end: z.string().min(1, 'حدّد نهاية الفترة'),
  review_due_date: z.string().optional(),
  department: z.string().optional(),
  notes: z.string().optional(),
});

type CycleFormValues = z.infer<typeof cycleSchema>;

const PerformanceCycleFormPage = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDepartments({ page_size: 100 })
      .then(({ data }) => setDepartments(data.data?.results ?? []))
      .catch(() => setDepartments([]));
  }, []);

  const {
    control, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CycleFormValues>({
    resolver: zodResolver(cycleSchema),
    defaultValues: {
      name: '',
      period_start: '',
      period_end: '',
      review_due_date: '',
      department: '',
      notes: '',
    },
    mode: 'onTouched',
  });

  const onSubmit = async (values: CycleFormValues) => {
    setError(null);
    try {
      const { data } = await createPerformanceCycle({
        ...values,
        department: values.department || null,
        review_due_date: values.review_due_date || null,
      });
      notifySuccess('تم إنشاء الدورة — عرّف مؤشراتها الآن');
      navigate(`/app/hr/performance/cycles/${data.data.id}`);
    } catch (err) {
      setError(extractErrorMessage(err, 'تعذر إنشاء الدورة'));
    }
  };

  return (
    <Box>
      <PageHeader
        title="دورة تقييم جديدة"
        subtitle="تُنشأ كمسودة: عرّف المؤشرات بأوزانها ثم افتح الدورة للتقييم"
        action={<Button onClick={() => navigate('/app/hr/performance/cycles')}>رجوع</Button>}
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
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <FormTextField
                      {...field}
                      value={field.value}
                      onChange={field.onChange}
                      label="اسم الدورة"
                      required
                      error={Boolean(errors.name)}
                      helperText={errors.name?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="department"
                  control={control}
                  render={({ field }) => (
                    <FormTextField
                      {...field}
                      select
                      value={field.value}
                      onChange={field.onChange}
                      label="الإدارة"
                      helperText="اتركه فارغاً لدورة وطنية"
                    >
                      <MenuItem value="">— وطني —</MenuItem>
                      {departments.map((d) => (
                        <MenuItem key={d.id} value={d.id}>
                          {d.name_ar}
                        </MenuItem>
                      ))}
                    </FormTextField>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="period_start"
                  control={control}
                  render={({ field }) => (
                    <FormTextField
                      {...field}
                      value={field.value}
                      onChange={field.onChange}
                      type="date"
                      label="بداية الفترة"
                      required
                      error={Boolean(errors.period_start)}
                      helperText={errors.period_start?.message}
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="period_end"
                  control={control}
                  render={({ field }) => (
                    <FormTextField
                      {...field}
                      value={field.value}
                      onChange={field.onChange}
                      type="date"
                      label="نهاية الفترة"
                      required
                      error={Boolean(errors.period_end)}
                      helperText={errors.period_end?.message}
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="review_due_date"
                  control={control}
                  render={({ field }) => (
                    <FormTextField
                      {...field}
                      value={field.value}
                      onChange={field.onChange}
                      type="date"
                      label="موعد اعتماد التقييمات"
                      InputLabelProps={{ shrink: true }}
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
                      value={field.value}
                      onChange={field.onChange}
                      label="ملاحظات"
                      multiline
                      minRows={3}
                    />
                  )}
                />
              </Grid>
            </Grid>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                إنشاء الدورة
              </Button>
              <Button onClick={() => navigate('/app/hr/performance/cycles')}>إلغاء</Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default PerformanceCycleFormPage;
