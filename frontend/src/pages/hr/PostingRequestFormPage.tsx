import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

/** الترقية/الخفض يتطلّب وجهة، والنقل يقبل وجهة أو لا. */
const postingSchema = z
  .object({
    employee: z.string().uuid('حدّد الموظف'),
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
        message: 'الترقية والخفض يتطلّبان قسماً هدفاً',
      });
    }
  });

type PostingFormValues = z.infer<typeof postingSchema>;

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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<HrEstablishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

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
      notifySuccess(values.status === 'SUBMITTED' ? 'تم رفع الطلب للاعتماد' : 'تم حفظ المسودة');
      navigate(`/app/hr/postings/${created.id}`);
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
        title="طلب نقل أو ترقية"
        subtitle="يُحفظ الطلب كمسودة، أو يُرسل مباشرةً للاعتماد"
        action={
          <Button onClick={() => navigate('/app/hr/postings')}>رجوع</Button>
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
                  label="الموظف"
                  required
                  value={field.value}
                  onChange={field.onChange}
                  error={Boolean(errors.employee)}
                  helperText={errors.employee?.message}
                  hint="الموظفون ضمن نطاقك الإداري"
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
              name="kind"
              control={control}
              render={({ field }) => (
                <FormTextField
                  {...field}
                  select
                  label="نوع الطلب"
                  required
                  value={field.value}
                  onChange={field.onChange}
                  hint="النقل: تغيير القسم — الترقية: تغيير الصفة بمنصب أعلى"
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
                  label="القسم الهدف"
                  value={field.value}
                  onChange={field.onChange}
                  error={Boolean(errors.targetDepartment)}
                  helperText={errors.targetDepartment?.message}
                  hint="اتركه فارغاً للنقل دون تغيير القسم"
                >
                  <MenuItem value="">— بدون تغيير —</MenuItem>
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
                  label="تاريخ النفاذ المطلوب"
                  InputLabelProps={{ shrink: true }}
                  value={field.value}
                  onChange={field.onChange}
                  hint="اتركه فارغاً للتطبيق فور الاعتماد"
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
                  label="المبرِّر"
                  value={field.value}
                  onChange={field.onChange}
                  hint="يظهر للمعتمد عند المراجعة"
                />
              )}
            />
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            حفظ كمسودة
          </Button>
          <Button
            variant="outlined"
            disabled={isSubmitting}
            onClick={handleSubmit((v) => onSubmit({ ...v, status: 'SUBMITTED' }))}
          >
            حفظ وإرسال للاعتماد
          </Button>
          <Button onClick={() => navigate('/app/hr/postings')} disabled={isSubmitting}>
            إلغاء
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default PostingRequestFormPage;
