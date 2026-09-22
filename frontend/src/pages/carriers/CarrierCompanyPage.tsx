import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import BusinessIcon from '@mui/icons-material/Business';
import ApiIcon from '@mui/icons-material/Api';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { PageHeader } from '../../components/common';
import { getCompanyProfile, updateCompanyProfile, getApiKey, regenerateApiKey } from '../../api/endpoints/carriers';
import type { CarrierApiKeyInfo, CarrierProfile } from '../../types/carrier';
import { formatDateTime } from '../../utils/formatters';

const CarrierCompanyPage = () => {
  const [profile, setProfile] = useState<CarrierProfile | null>(null);
  const [api, setApi] = useState<CarrierApiKeyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getCompanyProfile(), getApiKey()])
      .then(([p, k]) => {
        const pk = p.data?.data ?? p.data;
        const ak = k.data?.data ?? k.data;
        setProfile(pk as CarrierProfile);
        setApi(ak as CarrierApiKeyInfo);
      })
      .catch(() => setMessage({ type: 'error', text: 'تعذّر تحميل بيانات الشركة' }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const profileEditable = useMemo(() => {
    if (!profile) return null;
    const { email, phone, address, logo_url } = profile;
    return { email: email ?? '', phone: phone ?? '', address: address ?? '', logo_url: logo_url ?? '' };
  }, [profile]);

  const [form, setForm] = useState({ email: '', phone: '', address: '', logo_url: '' });

  useEffect(() => {
    if (profileEditable) setForm(profileEditable);
  }, [profileEditable]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await updateCompanyProfile(form);
      const updated = res.data?.data ?? res.data;
      setProfile(updated as CarrierProfile);
      setMessage({ type: 'success', text: 'تم حفظ بيانات الشركة' });
    } catch {
      setMessage({ type: 'error', text: 'فشل حفظ البيانات — تحقق من الحقول' });
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm('إعادة توليد مفتاح API يُبطل المفتاح الحالي فوراً. هل تريد المتابعة؟')) return;
    setMessage(null);
    try {
      const res = await regenerateApiKey();
      const data = res.data?.data ?? res.data;
      setApi(data as CarrierApiKeyInfo);
      setShowKey(true);
      setMessage({ type: 'success', text: 'تم توليد مفتاح جديد — احفظه في مكان آمن، لن يظهر مرة أخرى' });
    } catch {
      setMessage({ type: 'error', text: 'فشل إعادة توليد المفتاح' });
    }
  };

  const handleCopy = async () => {
    if (!api?.api_key) return;
    try {
      await navigator.clipboard.writeText(api.api_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setMessage({ type: 'error', text: 'تعذّر النسخ' });
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, maxWidth: 1080, mx: 'auto', width: '100%' }}>
        <Skeleton width="40%" height={48} />
        <Skeleton variant="rectangular" height={200} sx={{ mt: 3 }} />
        <Skeleton variant="rectangular" height={200} sx={{ mt: 3 }} />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ p: 3, maxWidth: 1080, mx: 'auto', width: '100%' }}>
        <Alert severity="error">لم يتم العثور على شركة مرتبطة بحسابك.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1080, mx: 'auto', width: '100%' }}>
      <PageHeader title="إعدادات الشركة" subtitle="بيانات شركة النقل ومفتاح التكامل مع البوابة" />

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, borderRadius: 3 }} elevation={0} variant="outlined">
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
              <Box
                sx={{
                  width: 46, height: 46, borderRadius: 2.5, display: 'grid', placeItems: 'center',
                  bgcolor: 'rgba(21,101,192,0.12)',
                }}
              >
                <BusinessIcon color="primary" />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>بيانات الشركة</Typography>
                <Typography variant="body2" color="text.secondary">
                  {profile.name} · {profile.iata_code || 'بدون IATA'}
                </Typography>
              </Box>
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label="البريد الإلكتروني" value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} fullWidth size="small" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="الهاتف" value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} fullWidth size="small" />
              </Grid>
              <Grid item xs={12}>
                <TextField label="العنوان" value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} fullWidth size="small" />
              </Grid>
              <Grid item xs={12}>
                <TextField label="رابط الشعار (URL)" value={form.logo_url}
                  onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))} fullWidth size="small" />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
                {saving ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: 3, height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 46, height: 46, borderRadius: 2.5, display: 'grid', placeItems: 'center',
                    bgcolor: api?.api_key ? 'rgba(46,125,50,0.12)' : 'rgba(198,40,40,0.12)',
                  }}
                >
                  <ApiIcon color={api?.api_key ? 'success' : 'error'} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>مفتاح التكامل (API)</Typography>
                  <Typography variant="body2" color="text.secondary">
                    يُرسل في رأس <code>X-API-Key</code> لربط أنظمة الشركة
                  </Typography>
                </Box>
              </Stack>

              {api?.api_key ? (
                <>
                  <Box
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1, p: 1.5, borderRadius: 2,
                      bgcolor: 'rgba(21,101,192,0.06)', border: '1px dashed', borderColor: 'primary.light',
                    }}
                  >
                    <Typography
                      sx={{ flex: 1, fontFamily: 'monospace', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      dir="ltr"
                    >
                      {showKey ? api.api_key : 'nqp_••••••••••••••••••••••••••••••'}
                    </Typography>
                    <Tooltip title={showKey ? 'إخفاء' : 'إظهار'}>
                      <IconButton size="small" onClick={() => setShowKey((v) => !v)}>
                        {showKey ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="نسخ">
                      <IconButton size="small" onClick={handleCopy}>
                        <ContentCopyIcon fontSize="small" color={copied ? 'success' : 'inherit'} />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Stack spacing={1} sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="flex">
                      أنشئ في: {api.created_at ? formatDateTime(api.created_at) : '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="flex">
                      آخر استخدام: {api.last_use_at ? formatDateTime(api.last_use_at) : 'لم يُستخدم بعد'}
                      {api.last_use_ip ? ` · ${api.last_use_ip}` : ''}
                    </Typography>
                  </Stack>
                </>
              ) : (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  لا يوجد مفتاح API بعد — أنشئ مفتاحاً لتفعيل التكامل.
                </Alert>
              )}

              <Divider sx={{ my: 3 }} />

              <Button variant="outlined" color="error" startIcon={<RefreshIcon />} fullWidth onClick={handleRegenerate}>
                إعادة توليد المفتاح
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                إعادة التوليد تُبطل المفتاح القديم وتوقف أي تكامل قائم فوراً.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CarrierCompanyPage;