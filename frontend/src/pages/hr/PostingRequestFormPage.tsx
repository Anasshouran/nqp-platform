import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '../../components/common';
import { FormTextField } from '../../components/ui';
import {
  createPostingRequest,
  getEmployees,
  getHrEstablishments,
  submitPostingRequest,
} from '../../api/endpoints/hr';
import type { Employee, HrEstablishment } from '../../types/hr';
import { POSTING_KIND_LABELS } from '../../utils/hrLabels';
import { extractErrorMessage, notifySuccess } from '../../utils/toast';

const createPostingSchema = (t: TFunction) => z
  .object({
    employee: z.string().uuid(t('hr.postingRequestForm.validation.selectEmployee')),
    kind: z.enum(['TRANSFER', 'PROMOTION', 'DEMOTION']),
    status: z.enum(['DRAFT', 'SUBMITTED']),
    targetDepartment: z.string().uuid().or(z.literal('')),
    effectiveDate: z.string().optional(),
    reason: z.string().trim().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.kind !== 'TRANSFER' && !data.targetDepartment) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targetDepartment'],
        message: t('hr.postingRequestForm.validation.targetDepartmentRequired'),
      });
    }
  });

type PostingFormValues = z.infer<ReturnType<typeof createPostingSchema>>;

const emptyForm: PostingFormValues = {
  employee: '',
  kind: 'TRANSFER',
  status: 'DRAFT',
  targetDepartment: '',
  effectiveDate: '',
  reason: '',
};

const PostingRequestFormPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<HrEstablishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const postingSchema = useMemo(() => createPostingSchema(t), [t]);

  useEffect(() => {
    Promise.allSettled([
      getEmployees({ page_size: 100, ordering: 'full_name_ar' }),
      getHrEstablishments({ page_size: 100, ordering: 'name_ar' }),
    ]).then(([emp, dep]) => {
      if (emp.status === 'fulfilled') setEmployees(emp.value.data.data?.results ?? []);
      if (dep.status === 'fulfilled') setDepartments(dep.value.data.data?.results ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const {
    control, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PostingFormValues>({
    resolver: zodResolver(postingSchema),
    defaultValues: emptyForm,
    mode: 'onTouched',
  });

  const onSubmit = async (values: PostingFormValues) => {
    setFormError(null);
    const payload: Record<string, unknown> = {
      employee: values.employee,
      kind: values.kind,
    };
    if (values.targetDepartment) payload.target_department = values.targetDepartment;
    if (values.effectiveDate) payload.effective_date = values.effectiveDate;
    if (values.reason) payload.reason = values.reason;

    try {
      const { data } = await createPostingRequest(payload);
      const created = data.data;
      if (values.status === 'SUBMITTED') {
        // الطلب يُنشأ مسودةً ثم يُرسَل: مسار الإرسال هو الذي يتحقق من
        // صلاحية صاحب الملف، فلا يُنشأ طلب «مُقدَّم» بغير مراجعة.
        await submitPostingRequest(created.id);
      }
      notifySuccess(values.status === 'SUBMITTED' ? t('hr.postingRequestForm.messages.submitted') : t('hr.postingRequestForm.messages.draftSaved'));
      navigate(`/app/hr/postings/${created.id}`);
    } catch (err) {
      setFormError(extractErrorMessage(err, t('hr.postingRequestForm.errors.createFailed')));
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
        title={t('hr.postingRequestForm.pageHeader.title')}
        subtitle={t('hr.postingRequestForm.pageHeader.subtitle')}
        action={
          <Button onClick={() => navigate('/app/hr/postings')}>
            {t('hr.postingRequestForm.button.back')}
          </Button>
        }
      />

      {formError && (
        <Alert severity="error" sx={{ mb: 2 }}>
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
                  label={t('hr.postingRequestForm.label.employee')}
                  required
                  value={field.value}
                  onChange={field.onChange}
                  error={Boolean(errors.employee)}
                  helperText={errors.employee?.message}
                  hint={t('hr.postingRequestForm.hint.employeeScope')}
                >
                  <MenuItem value="">{t('hr.postingRequestForm.select.choose')}</MenuItem>
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
              name="kind"
              control={control}
              render={({ field }) => (
                <FormTextField
                  {...field}
                  select
                  label={t('hr.postingRequestForm.label.kind')}
                  required
                  value={field.value}
                  onChange={field.onChange}
                  hint={t('hr.postingRequestForm.hint.kind')}
                >
                  {Object.entries(POSTING_KIND_LABELS).map(([v, l]) => (
                    <MenuItem key={v} value={v}>
                      {l}
                    </MenuItem>
                  ))}
                </FormTextField>
              )}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Controller
              name="targetDepartment"
              control={control}
              render={({ field }) => (
                <FormTextField
                  {...field}
                  select
                  label={t('hr.postingRequestForm.label.targetDepartment')}
                  value={field.value}
                  onChange={field.onChange}
                  error={Boolean(errors.targetDepartment)}
                  helperText={errors.targetDepartment?.message}
                  hint={t('hr.postingRequestForm.hint.targetDepartment')}
                >
                  <MenuItem value="">{t('hr.postingRequestForm.select.noChange')}</MenuItem>
                  {departments.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.name_ar}
                      {d.sector_name ? ` — ${d.sector_name}` : ''}
                    </MenuItem>
                  ))}
                </FormTextField>
              )}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Controller
              name="effectiveDate"
              control={control}
              render={({ field }) => (
                <FormTextField
                  {...field}
                  type="date"
                  label={t('hr.postingRequestForm.label.effectiveDate')}
                  InputLabelProps={{ shrink: true }}
                  value={field.value}
                  onChange={field.onChange}
                  hint={t('hr.postingRequestForm.hint.effectiveDate')}
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Controller
              name="reason"
              control={control}
              render={({ field }) => (
                <FormTextField
                  {...field}
                  multiline
                  minRows={3}
                  label={t('hr.postingRequestForm.label.reason')}
                  value={field.value}
                  onChange={field.onChange}
                  hint={t('hr.postingRequestForm.hint.reason')}
                />
              )}
            />
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {t('hr.postingRequestForm.button.saveDraft')}
          </Button>
          <Button
            variant="outlined"
            disabled={isSubmitting}
            onClick={handleSubmit((v) => onSubmit({ ...v, status: 'SUBMITTED' }))}
          >
            {t('hr.postingRequestForm.button.submitForApproval')}
          </Button>
          <Button onClick={() => navigate('/app/hr/postings')} disabled={isSubmitting}>
            {t('hr.postingRequestForm.button.cancel')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default PostingRequestFormPage;
