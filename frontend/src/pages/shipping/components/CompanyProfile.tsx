/**
 * CompanyProfile — بيانات شركة النقل.
 *
 * قرار التصميم: نموذج (عرض + تعديل). الدالة `updateCompanyProfile` موجودة
 * وآمنة: الـ serializer في الخلفية يضع name/iata_code/icao_code/is_active
 * ضمن `read_only_fields` ويرفضها بـ 400، لذا النموذج يعرض حقول التواصل
 * القابلة للتعديل فقط (email, phone, address, logo_url) بينما تبقى حقول
 * الهوية للقراءة فقط.
 */
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  AppButton,
  FormTextField,
  PageHeader,
  SectionCard,
  StatusChip,
} from '../../../components/uikit';
import { ErrorState, ListSkeleton } from '../../../components/common';
import { useApi } from '../../../hooks/useApi';
import { getCompanyProfile, updateCompanyProfile } from '../../../api/endpoints/carriers';
import type { CarrierProfile } from '../../../types/carrier';

type ContactKey = 'email' | 'phone' | 'address' | 'logo_url';
type ContactForm = Record<ContactKey, string>;

interface ContactField {
  name: ContactKey;
  label: string;
  type?: 'text' | 'email';
}

const CONTACT_FIELDS: ContactField[] = [
  { name: 'email', label: 'البريد الإلكتروني', type: 'email' },
  { name: 'phone', label: 'رقم الهاتف' },
  { name: 'address', label: 'العنوان' },
  { name: 'logo_url', label: 'رابط الشعار' },
];

const EMPTY_FORM: ContactForm = { email: '', phone: '', address: '', logo_url: '' };

const toForm = (profile: CarrierProfile): ContactForm => ({
  email: profile.email ?? '',
  phone: profile.phone ?? '',
  address: profile.address ?? '',
  logo_url: profile.logo_url ?? '',
});

const ReadOnlyField = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
      {label}
    </Typography>
    <Typography variant="body1" color="text.secondary">
      {value}
    </Typography>
  </Box>
);

export const CompanyProfile = () => {
  const { data: profile, loading, error, retry } = useApi<CarrierProfile>(() =>
    getCompanyProfile().then(r => r.data.data)
  );

  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) setForm(toForm(profile));
  }, [profile]);

  const handleChange = (name: ContactKey, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }));
    setSaved(false);
    setSaveError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await updateCompanyProfile(form);
      setSaved(true);
    } catch {
      setSaveError('تعذّر حفظ بيانات التواصل. تحقق من القيم المدخلة وحاول مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ListSkeleton />;
  if (error || !profile) return <ErrorState onRetry={retry} />;

  return (
    <Box>
      <PageHeader
        eyebrow="الشحن البحري"
        title="ملف الشركة"
        subtitle="بيانات شركة النقل ووسيلة التواصل المسجّلة"
      />

      <Stack spacing={3}>
        <SectionCard
          title="بيانات الشركة"
          subtitle="حقول محمية لا يمكن تعديلها من هذه البوابة"
        >
          <Grid container spacing={2.5}>
            <Grid item xs={12} md={6}>
              <ReadOnlyField label="اسم الشركة" value={profile.name} />
            </Grid>
            <Grid item xs={12} md={6}>
              <ReadOnlyField label="رمز IATA" value={profile.iata_code ?? '—'} />
            </Grid>
            <Grid item xs={12} md={6}>
              <ReadOnlyField label="رمز ICAO" value={profile.icao_code ?? '—'} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
                  الحالة
                </Typography>
                <StatusChip
                  label={profile.is_active ? 'نشِطة' : 'موقوفة'}
                  tone={profile.is_active ? 'success' : 'neutral'}
                />
              </Box>
            </Grid>
          </Grid>
        </SectionCard>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <SectionCard
            title="بيانات التواصل"
            action={
              <AppButton type="submit" variant="primary" loading={saving} loadingText="جارٍ الحفظ">
                حفظ
              </AppButton>
            }
          >
            <Stack spacing={2.5}>
              {saved && <Alert severity="success">تم حفظ بيانات التواصل بنجاح.</Alert>}
              {saveError && <Alert severity="error">{saveError}</Alert>}
              <Grid container spacing={2.5}>
                {CONTACT_FIELDS.map(field => (
                  <Grid item xs={12} md={6} key={field.name}>
                    <FormTextField
                      name={field.name}
                      label={field.label}
                      type={field.type ?? 'text'}
                      value={form[field.name]}
                      onChange={e => handleChange(field.name, e.target.value)}
                    />
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </SectionCard>
        </Box>
      </Stack>
    </Box>
  );
};
