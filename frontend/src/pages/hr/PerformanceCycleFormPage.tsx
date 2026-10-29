import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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

const createCycleSchema = (t: TFunction) => z.object({
  name: z.string().min(3, t('hr.performanceCycleForm.validation.nameMinLength')),
  period_start: z.string().min(1, t('hr.performanceCycleForm.validation.selectStartDate')),
  period_end: z.string().min(1, t('hr.performanceCycleForm.validation.selectEndDate')),
  review_due_date: z.string().optional(),
  department: z.string().optional(),
  notes: z.string().optional(),
});

type CycleFormValues = z.infer<ReturnType<typeof createCycleSchema>>;

const PerformanceCycleFormPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState<string | null>(null);

  const cycleSchema = useMemo(() => createCycleSchema(t), [t]);

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
      notifySuccess(t('hr.performanceCycleForm.messages.created'));
      navigate(`/app/hr/performance/cycles/${data.data.id}`);
    } catch (err) {
      setError(extractErrorMessage(err, t('hr.performanceCycleForm.errors.createFailed')));
    }
  };

  return (
    <Box>
      <PageHeader
        title={t('hr.performanceCycleForm.pageHeader.title')}
        subtitle={t('hr.performanceCycleForm.pageHeader.subtitle')}
        action={<Button onClick={() => navigate('/app/hr/performance/cycles')}>{t('hr.performanceCycleForm.button.back')}</Button>}
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
                      label={t('hr.performanceCycleForm.label.cycleName')}
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
                      label={t('hr.performanceCycleForm.label.department')}
                      helperText={t('hr.performanceCycleForm.helperText.nationalCycle')}
                    >
                      <MenuItem value="">{t('hr.performanceCycleForm.select.national')}</MenuItem>
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
                      label={t('hr.performanceCycleForm.label.periodStart')}
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
                      label={t('hr.performanceCycleForm.label.periodEnd')}
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
                      label={t('hr.performanceCycleForm.label.reviewDueDate')}
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
                      label={t('hr.performanceCycleForm.label.notes')}
                      multiline
                      minRows={3}
                    />
                  )}
                />
              </Grid>
            </Grid>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {t('hr.performanceCycleForm.button.createCycle')}
              </Button>
              <Button onClick={() => navigate('/app/hr/performance/cycles')}>{t('hr.performanceCycleForm.button.cancel')}</Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default PerformanceCycleFormPage;
