import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Autocomplete from '@mui/material/Autocomplete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { FormTextField } from '../../components/ui';
import { PageHeader } from '../../components/common';
import { employeeSchema, emptyEmployeeForm } from '../../components/forms/schemas/hr';
import type { EmployeeFormValues } from '../../components/forms/schemas/hr';
import {
  createEmployee,
  getEmployee,
  getEmployees,
  getLinkableUsers,
  updateEmployee,
} from '../../api/endpoints/hr';
import type { Employee, EmployeeDetail, LinkableUser } from '../../types/hr';
import {
  EMPLOYMENT_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  GENDER_LABELS,
} from '../../utils/hrLabels';
import { notifySuccess, extractErrorMessage } from '../../utils/toast';

/** يحوّل أخطاء الخادم (`{field: [msg]}`) إلى رسائل عربية قابلة للعرض. */
const serverErrorMessage = (payload: unknown): string | null => {
  if (typeof payload === 'string') return payload.trim() || null;
  if (payload && typeof payload === 'object') {
    const messages = Object.values(payload as Record<string, unknown>)
      .flatMap((v) => (Array.isArray(v) ? v : [v]))
      .map((v) => String(v))
      .filter(Boolean);
    if (messages.length) return messages.join(' • ');
  }
  return null;
};

const EmployeeFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [formError, setFormError] = useState<string | null>(null);
  const [current, setCurrent] = useState<EmployeeDetail | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [linkable, setLinkable] = useState<LinkableUser[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    // `accountMode` يُقرأ من RHF لا من state منفصل: الـstate المنفصل
    // ينحرف عن القيم التي يرسلها `onSubmit` فلا يُرسل الحقل الصحيح عند التبديل.
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: emptyEmployeeForm,
    mode: 'onTouched',
  });

  const accountMode = watch('accountMode');

  // تحميل القيم الحالية عند التعديل.
  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    setLoadingCurrent(true);
    getEmployee(id)
      .then(({ data }) => {
        if (cancelled) return;
        const e = data.data;
        setCurrent(e);
        reset({
          ...emptyEmployeeForm,
          accountMode: 'existing',
          userId: e.user,
          email: e.email,
          fullName: e.full_name,
          phone: e.phone ?? '',
          employeeNumber: e.employee_number ?? '',
          fullNameAr: e.full_name_ar ?? '',
          fullNameEn: e.full_name_en ?? '',
          jobTitle: e.job_title ?? '',
          gender: (e.gender as 'MALE' | 'FEMALE') || 'MALE',
          employmentType: e.employment_type,
          employmentStatus: e.employment_status,
          hireDate: e.hire_date ?? '',
          probationEndDate: e.probation_end_date ?? '',
          birthDate: e.birth_date ?? '',
          reportingManager: e.reporting_manager ?? '',
          degree: e.degree ?? '',
          specialization: e.specialization ?? '',
          office: e.office ?? '',
          internalPhone: e.internal_phone ?? '',
          homeAddress: e.home_address ?? '',
          emergencyContactName: e.emergency_contact_name ?? '',
          emergencyContactPhone: e.emergency_contact_phone ?? '',
          emergencyContactRelation: e.emergency_contact_relation ?? '',
        });
      })
      .catch((err) => {
        if (!cancelled) setFormError(extractErrorMessage(err, 'تعذر تحميل بيانات الموظف'));
      })
      .finally(() => {
        if (!cancelled) setLoadingCurrent(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, id, reset]);

  // مرشحو «ربط حساب موجود»: حسابات نشطة **بلا** ملف وظيفي.
  // لا تصلح `getEmployees` هنا: كل من فيها له ملف مسبقاً، والخادم يرفض ربط
  // حساب له ملف (`'لهذا الحساب ملف وظيفي مسجّل مسبقاً'`).
  useEffect(() => {
    let cancelled = false;
    getLinkableUsers({ page_size: 100, ordering: 'full_name' })
      .then(({ data }) => {
        if (!cancelled) setLinkable(data.data?.results ?? []);
      })
      .catch(() => {
        if (!cancelled) setLinkable([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // قائمة الموظفين في النطاق: مرشحو «المدير المُبلّغ» (مرتبطون بملف وظيفي).
  useEffect(() => {
    let cancelled = false;
    getEmployees({ page_size: 100, ordering: 'full_name_ar' })
      .then(({ data }) => {
        if (!cancelled) setEmployees(data.data?.results ?? []);
      })
      .catch(() => {
        if (!cancelled) setEmployees([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const managerOptions = useMemo<Employee[]>(
    () => employees.filter((e) => e.id !== id),
    [employees, id],
  );

  const onSubmit = async (values: EmployeeFormValues) => {
    setFormError(null);
    const payload: Record<string, unknown> = {
      employee_number: values.employeeNumber,
      full_name_ar: values.fullNameAr,
      full_name_en: values.fullNameEn,
      job_title: values.jobTitle,
      gender: values.gender,
      employment_type: values.employmentType,
      employment_status: values.employmentStatus,
      hire_date: values.hireDate || null,
      probation_end_date: values.probationEndDate || null,
      birth_date: values.birthDate || null,
      reporting_manager: values.reportingManager || null,
      degree: values.degree,
      specialization: values.specialization,
      office: values.office,
      internal_phone: values.internalPhone,
      home_address: values.homeAddress,
      emergency_contact_name: values.emergencyContactName,
      emergency_contact_phone: values.emergencyContactPhone,
      emergency_contact_relation: values.emergencyContactRelation,
    };

    if (isEdit) {
      // التعديل لا ينشئ حساباً جديداً؛ ربط الحساب يأتي من الملف المحمّل.
      payload.user = values.userId;
    } else if (values.accountMode === 'existing') {
      payload.user = values.userId;
    } else {
      payload.new_user = {
        email: values.email,
        username: values.username,
        full_name: values.fullName,
        phone: values.phone,
        password: values.password,
      };
    }

    try {
      if (isEdit) {
        await updateEmployee(id as string, payload);
        notifySuccess('تم تحديث الملف الوظيفي');
      } else {
        const { data } = await createEmployee(payload);
        notifySuccess('تم إنشاء الملف الوظيفي');
        const created = data.data;
        if (created?.id) {
          navigate(`/app/hr/employees/${created.id}`);
          return;
        }
      }
      navigate('/app/hr/employees');
    } catch (err) {
      const response = (err as { response?: { data?: unknown } })?.response;
      const message = serverErrorMessage(response?.data) ?? extractErrorMessage(err, 'تعذر حفظ الملف الوظيفي');
      setFormError(message);
      // ربط الأخطاء بالحقول عندما يعيد الخادم أسماءها.
      const data = response?.data as Record<string, unknown> | undefined;
      if (data && typeof data === 'object') {
        for (const field of Object.keys(data)) {
          const key = field as keyof EmployeeFormValues;
          const first = (data[field] as string[] | undefined)?.[0];
          if (first && key in emptyEmployeeForm) {
            setError(key, { type: 'server', message: String(first) });
          }
        }
      }
    }
  };

  if (isEdit && loadingCurrent) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/app/hr/employees')} sx={{ mb: 2 }}>
        رجوع للقائمة
      </Button>

      <PageHeader
        title={isEdit ? 'تعديل الملف الوظيفي' : 'ملف وظيفي جديد'}
        subtitle={isEdit ? current?.full_name : 'إنشاء حساب وظيفية داخل نطاقك'}
      />

      {formError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
          {formError}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={2}>
          {!isEdit && (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  حساب الدخول
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  يُنشأ حساب بصلاحيات صفرية؛ منح الصلاحيات يتم لاحقاً من إدارة المستخدمين.
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  value={accountMode}
                  onChange={(_, v) => v && setValue('accountMode', v as 'new' | 'existing')}
                  sx={{ mb: 2 }}
                >
                  <ToggleButton value="new">
                    <PersonAddIcon sx={{ ml: 1 }} /> حساب جديد
                  </ToggleButton>
                  <ToggleButton value="existing">ربط حساب موجود</ToggleButton>
                </ToggleButtonGroup>

                {accountMode === 'new' ? (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="email"
                        control={control}
                        render={({ field }) => (
                          <FormTextField
                            label="البريد الإلكتروني"
                            required
                            dir="ltr"
                            value={field.value}
                            onChange={field.onChange}
                            error={Boolean(errors.email)}
                            helperText={errors.email?.message}
                            hint="يستخدم لتسجيل الدخول"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="username"
                        control={control}
                        render={({ field }) => (
                          <FormTextField
                            label="اسم المستخدم"
                            dir="ltr"
                            value={field.value}
                            onChange={field.onChange}
                            hint="يُشتق من البريد إن تُرك فارغاً"
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="fullName"
                        control={control}
                        render={({ field }) => (
                          <FormTextField
                            label="الاسم الكامل (على الحساب)"
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="phone"
                        control={control}
                        render={({ field }) => (
                          <FormTextField
                            label="الهاتف"
                            dir="ltr"
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="password"
                        control={control}
                        render={({ field }) => (
                          <FormTextField
                            label="كلمة المرور"
                            type="password"
                            dir="ltr"
                            value={field.value}
                            onChange={field.onChange}
                            error={Boolean(errors.password)}
                            helperText={errors.password?.message}
                            hint="اتركها فارغة إن أردت تعيينها لاحقاً"
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                ) : (
                  <Controller
                    name="userId"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        options={linkable}
                        getOptionLabel={(o) => (o.full_name ? `${o.full_name} — ${o.email}` : o.username)}
                        value={linkable.find((u) => u.id === field.value) ?? null}
                        onChange={(_, v) => field.onChange(v?.id ?? '')}
                        noOptionsText="لا توجد حسابات متاحة للربط"
                        renderInput={(params) => (
                          <FormTextField
                            {...params}
                            label="الحساب المرتبط"
                            required
                            error={Boolean(errors.userId)}
                            helperText={errors.userId?.message}
                            hint="حسابات نشطة بلا ملف وظيفي"
                          />
                        )}
                      />
                    )}
                  />
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                البيانات الوظيفية
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="employeeNumber"
                    control={control}
                    render={({ field }) => (
                      <FormTextField
                        label="الرقم الوظيفي"
                        value={field.value}
                        onChange={field.onChange}
                        hint="يولَّد تلقائياً إن تُرك فارغاً"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="fullNameAr"
                    control={control}
                    render={({ field }) => (
                      <FormTextField
                        label="الاسم بالعربية"
                        required
                        value={field.value}
                        onChange={field.onChange}
                        error={Boolean(errors.fullNameAr)}
                        helperText={errors.fullNameAr?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="fullNameEn"
                    control={control}
                    render={({ field }) => (
                      <FormTextField
                        label="الاسم بالإنجليزية"
                        dir="ltr"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="jobTitle"
                    control={control}
                    render={({ field }) => (
                      <FormTextField
                        label="المسمى الوظيفي"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="gender"
                    control={control}
                    render={({ field }) => (
                      <FormTextField
                        select
                        label="الجنس"
                        value={field.value}
                        onChange={field.onChange}
                      >
                        {Object.entries(GENDER_LABELS).map(([v, l]) => (
                          <MenuItem key={v} value={v}>{l}</MenuItem>
                        ))}
                      </FormTextField>
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="employmentType"
                    control={control}
                    render={({ field }) => (
                      <FormTextField
                        select
                        label="نوع التعيين"
                        required
                        value={field.value}
                        onChange={field.onChange}
                      >
                        {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([v, l]) => (
                          <MenuItem key={v} value={v}>{l}</MenuItem>
                        ))}
                      </FormTextField>
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="employmentStatus"
                    control={control}
                    render={({ field }) => (
                      <FormTextField
                        select
                        label="حالة التوظيف"
                        required
                        value={field.value}
                        onChange={field.onChange}
                      >
                        {Object.entries(EMPLOYMENT_STATUS_LABELS).map(([v, l]) => (
                          <MenuItem key={v} value={v}>{l}</MenuItem>
                        ))}
                      </FormTextField>
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="hireDate"
                    control={control}
                    render={({ field }) => (
                      <FormTextField
                        type="date"
                        label="تاريخ التعيين"
                        value={field.value}
                        onChange={field.onChange}
                        InputLabelProps={{ shrink: true }}
                        error={Boolean(errors.hireDate)}
                        helperText={errors.hireDate?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="probationEndDate"
                    control={control}
                    render={({ field }) => (
                      <FormTextField
                        type="date"
                        label="نهاية فترة الاختبار"
                        value={field.value}
                        onChange={field.onChange}
                        InputLabelProps={{ shrink: true }}
                        error={Boolean(errors.probationEndDate)}
                        helperText={errors.probationEndDate?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="birthDate"
                    control={control}
                    render={({ field }) => (
                      <FormTextField
                        type="date"
                        label="تاريخ الميلاد"
                        value={field.value}
                        onChange={field.onChange}
                        InputLabelProps={{ shrink: true }}
                        error={Boolean(errors.birthDate)}
                        helperText={errors.birthDate?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="reportingManager"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        options={managerOptions}
                        getOptionLabel={(o) => `${o.full_name}${o.job_title ? ` — ${o.job_title}` : ''}`}
                        value={managerOptions.find((u) => u.id === field.value) ?? null}
                        onChange={(_, v) => field.onChange(v?.id ?? '')}
                        clearText="مسح"
                        noOptionsText="لا يوجد مرشحون"
                        renderInput={(params) => (
                          <FormTextField
                            {...params}
                            label="المدير المباشر"
                            helperText={errors.reportingManager?.message}
                          />
                        )}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                المؤهلات والاتصال
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="degree"
                    control={control}
                    render={({ field }) => (
                      <FormTextField label="الشهادة" value={field.value} onChange={field.onChange} />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="specialization"
                    control={control}
                    render={({ field }) => (
                      <FormTextField label="التخصص" value={field.value} onChange={field.onChange} />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="office"
                    control={control}
                    render={({ field }) => (
                      <FormTextField label="المكتب" value={field.value} onChange={field.onChange} />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="internalPhone"
                    control={control}
                    render={({ field }) => (
                      <FormTextField
                        label="هاتف داخلي"
                        dir="ltr"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="homeAddress"
                    control={control}
                    render={({ field }) => (
                      <FormTextField label="العنوان" value={field.value} onChange={field.onChange} />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="emergencyContactName"
                    control={control}
                    render={({ field }) => (
                      <FormTextField
                        label="جهة الاتصال الطارئة"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="emergencyContactPhone"
                    control={control}
                    render={({ field }) => (
                      <FormTextField
                        label="هاتف الطوارئ"
                        dir="ltr"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="emergencyContactRelation"
                    control={control}
                    render={({ field }) => (
                      <FormTextField
                        label="صلة القرابة"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            <Button onClick={() => navigate('/app/hr/employees')}>إلغاء</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            >
              {isEdit ? 'حفظ التعديلات' : 'إنشاء الملف'}
            </Button>
          </Stack>
        </Stack>
      </form>
    </Container>
  );
};

export default EmployeeFormPage;
