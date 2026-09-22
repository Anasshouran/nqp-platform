import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import ScienceIcon from '@mui/icons-material/Science';
import { createLabParameter, updateLabParameter } from '../../api/endpoints/foodlab';
import { labBench } from '../../utils/status';
import { notifySuccess } from '../../utils/toast';
import type { LabParameter } from '../../types/food';

interface Props {
  open: boolean;
  param?: LabParameter | null;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY = {
  code: '',
  name_ar: '',
  name_en: '',
  bench: 'MICROBIOLOGY',
  unit: '',
  method: '',
  reference_limit: '',
  detection_limit: '',
  price: '',
  sla_min_days: '1',
  sla_max_days: '5',
  order: '0',
  is_active: true,
};

const LabParameterFormDialog = ({ open, param, onClose, onSaved }: Props) => {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({
        code: param?.code || '',
        name_ar: param?.name_ar || '',
        name_en: param?.name_en || '',
        bench: param?.bench || 'MICROBIOLOGY',
        unit: param?.unit || '',
        method: param?.method || '',
        reference_limit: param?.reference_limit || '',
        detection_limit: param?.detection_limit || '',
        price: param?.price != null ? String(param.price) : '',
        sla_min_days: param ? String(param.sla_min_days) : '1',
        sla_max_days: param ? String(param.sla_max_days) : '5',
        order: param ? String(param.order ?? 0) : '0',
        is_active: param?.is_active ?? true,
      });
      setError(null);
    }
  }, [open, param]);

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const payload = {
      code: form.code.trim(),
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim(),
      bench: form.bench,
      unit: form.unit.trim(),
      method: form.method.trim(),
      reference_limit: form.reference_limit.trim(),
      detection_limit: form.detection_limit.trim(),
      price: Number(form.price || 0),
      sla_min_days: Number(form.sla_min_days || 1),
      sla_max_days: Number(form.sla_max_days || 5),
      order: Number(form.order || 0),
      is_active: form.is_active,
    };
    try {
      if (param) {
        await updateLabParameter(param.id, payload);
        notifySuccess('تم تحديث الفحص بنجاح');
      } else {
        await createLabParameter(payload);
        notifySuccess('تمت إضافة الفحص بنجاح');
      }
      onSaved();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const msg =
        (data?.message as string) ||
        (data?.code as string) ||
        (data?.detail as string) ||
        'حدث خطأ أثناء الحفظ';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <Box
        className="gradient-shift"
        sx={{
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          background: 'linear-gradient(120deg, #0a6b58, #0e8a72, #12a585)',
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'rgba(255,255,255,0.16)',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <ScienceIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>
            {param ? 'تعديل الفحص' : 'فحص جديد'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
            {param ? param.code : 'أدخل بيانات التحليل وسعره'}
          </Typography>
        </Box>
      </Box>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField
            label="الكود"
            value={form.code}
            onChange={set('code')}
            fullWidth
            disabled={!!param}
            helperText="مثال: MOISTURE-01"
          />
          <TextField
            label="الاسم بالعربية"
            value={form.name_ar}
            onChange={set('name_ar')}
            fullWidth
            required
          />
          <TextField
            label="الاسم بالإنجليزية"
            value={form.name_en}
            onChange={set('name_en')}
            fullWidth
          />
          <TextField
            select
            label="المختبر"
            value={form.bench}
            onChange={set('bench')}
            fullWidth
          >
            {Object.entries(labBench).map(([value, meta]) => (
              <MenuItem key={value} value={value}>
                {meta.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="الوحدة" value={form.unit} onChange={set('unit')} fullWidth />
          <TextField label="الطريقة" value={form.method} onChange={set('method')} fullWidth />
          <TextField
            label="الحد المرجعي"
            value={form.reference_limit}
            onChange={set('reference_limit')}
            fullWidth
          />
          <TextField
            label="حد الكشف"
            value={form.detection_limit}
            onChange={set('detection_limit')}
            fullWidth
          />
          <TextField
            label="سعر التحليل (جنيه)"
            value={form.price}
            onChange={set('price')}
            fullWidth
            type="number"
            required
            helperText="يُخصم تلقائياً على كل عينة تُجرى عليها"
          />
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr 1fr' }}>
            <TextField
              label="الحد الأدنى (يوم)"
              value={form.sla_min_days}
              onChange={set('sla_min_days')}
              type="number"
            />
            <TextField
              label="الحد الأقصى (يوم)"
              value={form.sla_max_days}
              onChange={set('sla_max_days')}
              type="number"
            />
            <TextField label="الترتيب" value={form.order} onChange={set('order')} type="number" />
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
            }
            label="نشط"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          إلغاء
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || !form.code.trim() || !form.name_ar.trim() || form.price === ''}
        >
          {submitting ? <CircularProgress size={20} color="inherit" /> : 'حفظ'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LabParameterFormDialog;