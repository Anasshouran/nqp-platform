// Presentational pieces of the new-request wizard: field renderer and the item picker with its suggestions.
// Extracted from ClerkDashboardPage without behavioural change.
import { useMemo, useRef, useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Badge from '@mui/material/Badge';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Autocomplete from '@mui/material/Autocomplete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ScienceIcon from '@mui/icons-material/Science';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { notifySuccess } from '../../../utils/toast';
import { resolveSamplingPolicy, riskGroupMeta } from '../samplingPolicy';
import type { WizardItem } from '../constants';

export const WizardField = ({
  label,
  placeholder,
  fieldKey,
  form,
  onChange,
  required,
  errorText,
  clearError,
}: {
  label: string;
  placeholder?: string;
  fieldKey: string;
  form: Record<string, string>;
  onChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  required?: boolean;
  errorText?: string;
  clearError?: (key: string) => void;
}) => (
  <Grid item xs={12} sm={6}>
    <TextField
      fullWidth
      size="small"
      label={label}
      placeholder={placeholder}
      value={form[fieldKey] ?? ''}
      onChange={(e) => {
        onChange((p) => ({ ...p, [fieldKey]: e.target.value }));
        clearError?.(fieldKey);
      }}
      required={required}
      error={Boolean(errorText)}
      helperText={errorText || (required ? 'حقل إلزامي' : undefined)}
    />
  </Grid>
);

export const PACKAGE_OPTIONS = ['جوال', 'براميل', 'طرد', 'كرتون', 'عبوة', 'صندوق', 'أخرى'];

const SMART_ITEMS: string[] = ['أرز', 'زيت عباد الشمس', 'سكر', 'دقيق قمح', 'شاي', 'عدس', 'فول', 'قهوة', 'مكرونة', 'سمن', 'لحوم مجمدة', 'دواجن مجمدة', 'حليب مجفف', 'صلصة طماطم', 'تمر'];

const SMART_BRANDS: Record<string, string[]> = {
  أرز: ['بسمتي', 'سيلا', 'الأصيل', 'أمة الري'],
  'زيت عباد الشمس': ['الشروق', 'عافية', 'سنبلة'],
  سكر: ['الكنانة', 'العربي', 'السكر السوداني'],
  'دقيق قمح': ['الفاخر', 'قوطة', 'كواكر'],
  شاي: ['الليبتون', 'أحمد', 'المصنع'],
  عدس: ['فرسان', 'الهلال'],
  فول: ['النيل الأزرق', 'السمراء'],
  قهوة: ['شركوب', 'سودانيز'],
  'مكرونة': ['رويال', 'جلال'],
  تمر: ['خلاص', 'برحي', 'بارنس'],
  'حليب مجفف': ['نيدو', 'الرهيب'],
  'لحوم مجمدة': ['علياء', 'سوكورو'],
  'دواجن مجمدة': ['الجوهرة', 'الفرح'],
  'صلصة طماطم': ['الطازج', 'راما'],
};

const SUGGESTION_BANNER_ITEMS: Array<{ item: string; brand: string; origin: string }> = [
  { item: 'أرز', brand: 'بسمتي', origin: 'الهند' },
  { item: 'زيت عباد الشمس', brand: 'الشروق', origin: 'السودان' },
  { item: 'سكر', brand: 'الكنانة', origin: 'السودان' },
  { item: 'دقيق قمح', brand: 'الفاخر', origin: 'تركيا' },
  { item: 'شاي', brand: 'الليبتون', origin: 'كينيا' },
];


export const WizardItems = ({ items, setItems }: { items: WizardItem[]; setItems: React.Dispatch<React.SetStateAction<WizardItem[]>> }) => {
  const [form, setForm] = useState<WizardItem>({ name: '', brand: '', origin: '', weight: '', quantity: '', packageType: '' });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [itemsErrors, setItemsErrors] = useState<{ name?: string; quantity?: string }>({});

  const update = (key: keyof WizardItem) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (key === 'name' || key === 'quantity') setItemsErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const smartBrands = useMemo(() => {
    const fromCatalog = SMART_BRANDS[form.name.trim()] ?? [];
    const prompt = form.brand.trim().toLowerCase();
    const fromPrompt = prompt
      ? SMART_ITEMS.flatMap((it) => SMART_BRANDS[it] ?? []).filter((b) => b.toLowerCase().includes(prompt))
      : [];
    return Array.from(new Set([...fromCatalog, ...fromPrompt])).slice(0, 12);
  }, [form.name, form.brand]);

  const smartItems = useMemo(() => {
    const prompt = form.name.trim().toLowerCase();
    return prompt
      ? SMART_ITEMS.filter((it) => it.toLowerCase().includes(prompt)).slice(0, 12)
      : SMART_ITEMS.slice(0, 8);
  }, [form.name]);

  const applySuggestion = (s: { item: string; brand: string; origin: string }) => {
    setForm((prev) => ({ ...prev, ...s }));
    notifySuccess(`اقتراح ذكي: ${s.item} — ${s.brand}`);
  };

  const add = () => {
    const errors: { name?: string; quantity?: string } = {};
    if (!form.name.trim()) errors.name = 'يرجى إدخال اسم الصنف';
    if (!form.quantity.trim()) errors.quantity = 'يرجى إدخال العدد';
    setItemsErrors(errors);
    if (errors.name || errors.quantity) return;
    const next: WizardItem = {
      name: form.name.trim(),
      brand: form.brand.trim() || '—',
      origin: form.origin.trim() || '—',
      weight: form.weight.trim() || '—',
      quantity: form.quantity.trim(),
      packageType: form.packageType || PACKAGE_OPTIONS[0],
      sampling: resolveSamplingPolicy(form.name.trim(), form.packageType || PACKAGE_OPTIONS[0]),
    };
    if (editingIndex !== null) {
      setItems((prev) => prev.map((it, i) => (i === editingIndex ? next : it)));
      setEditingIndex(null);
      notifySuccess('تم تعديل الصنف');
    } else {
      setItems((prev) => [...prev, next]);
      notifySuccess('تمت إضافة الصنف');
    }
    setForm({ name: '', brand: '', origin: '', weight: '', quantity: '', packageType: '' });
    setItemsErrors({});
  };

  const startEdit = (index: number) => {
    const it = items[index];
    setForm({ ...it });
    setEditingIndex(index);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setForm({ name: '', brand: '', origin: '', weight: '', quantity: '', packageType: '' });
  };

  const confirmDelete = () => {
    if (deleteIndex === null) return;
    setItems((prev) => prev.filter((_, idx) => idx !== deleteIndex));
    if (editingIndex === deleteIndex) cancelEdit();
    setDeleteIndex(null);
    notifySuccess('تم حذف الصنف');
  };

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (items.length > 0) {
      listRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
    }
  }, [items.length]);

  return (
    <Stack spacing={2}>
      {/* اقتراحات ذكية */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(12,127,106,0.04)', borderColor: 'rgba(12,127,106,0.25)' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <Box sx={{ width: 28, height: 28, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: 'primary.main' }}>
            <ScienceIcon fontSize="small" />
          </Box>
          <Stack>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>اقتراحات ذكية</Typography>
            <Typography variant="caption" color="text.secondary">اقتراح أصناف متكررة تلقائيًا — اضغط لملء الحقول بسرعة</Typography>
          </Stack>
        </Stack>
        <Grid container spacing={1}>
          {SUGGESTION_BANNER_ITEMS.map((s) => (
            <Grid item xs={12} sm={6} md={4} key={s.item}>
              <Button
                fullWidth
                size="small"
                variant="outlined"
                color="info"
                onClick={() => applySuggestion(s)}
                sx={{ justifyContent: 'space-between', borderRadius: 2, textTransform: 'none' }}
              >
                <Box sx={{ textAlign: 'right', minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.item}</Typography>
                  <Typography variant="caption" color="text.secondary">{s.brand} · {s.origin}</Typography>
                </Box>
                <AddIcon fontSize="small" />
              </Button>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.6)' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>إضافة صنف</Typography>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              freeSolo
              size="small"
              value={form.name}
              onInputChange={(_, v) => {
                setForm((p) => ({ ...p, name: v }));
                if (v.trim()) setItemsErrors((p) => ({ ...p, name: undefined }));
              }}
              options={smartItems}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="اسم الصنف"
                  required
                  error={Boolean(itemsErrors.name)}
                  helperText={itemsErrors.name || 'حقل إلزامي'}
                  placeholder="ابدأ الكتابة لعرض الاقتراحات…"
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              freeSolo
              size="small"
              value={form.brand}
              onInputChange={(_, v) => setForm((p) => ({ ...p, brand: v }))}
              options={smartBrands}
              renderInput={(params) => <TextField {...params} label="الماركة" placeholder="مثال: بسمتي" />}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField size="small" label="المنشأ" value={form.origin} onChange={update('origin')} fullWidth placeholder="مثال: الهند" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField size="small" label="الوزن" value={form.weight} onChange={update('weight')} fullWidth placeholder="مثال: 25 طن" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField size="small" label="العدد" value={form.quantity} onChange={update('quantity')} fullWidth required error={Boolean(itemsErrors.quantity)} helperText={itemsErrors.quantity || 'حقل إلزامي'} placeholder="مثال: 1,000" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField size="small" label="نوع العبوة" value={form.packageType} onChange={update('packageType')} fullWidth select>
              {PACKAGE_OPTIONS.map((o) => (
                <MenuItem key={o} value={o}>{o}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" spacing={1}>
              {editingIndex !== null && (
                <Button variant="outlined" color="inherit" onClick={cancelEdit} sx={{ borderRadius: 2.5 }}>
                  إلغاء التعديل
                </Button>
              )}
              <Button variant="contained" fullWidth startIcon={editingIndex !== null ? <EditIcon /> : <AddIcon />} onClick={add} sx={{ borderRadius: 2.5 }}>
                {editingIndex !== null ? 'حفظ تعديلات الصنف' : 'إضافة الصنف'}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {items.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Inventory2Icon sx={{ fontSize: 40, color: 'text.disabled' }} />
          <Typography variant="caption" color="text.secondary">لم تُضف أي أصناف بعد.</Typography>
        </Box>
      ) : (
        <Stack spacing={1} ref={listRef}>
          {items.map((it, i) => (
            <Stack key={i} direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1.25, borderRadius: 2, border: '1px solid rgba(16,40,34,0.07)' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{i + 1}. {it.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {[it.brand, it.origin, it.packageType, `عدد ${it.quantity}`, it.weight].filter((v) => v && v !== '—').join(' · ')}
                </Typography>
                {it.sampling ? (
                  <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                    <Chip
                      size="small"
                      color={riskGroupMeta(it.sampling.risk_group).color}
                      label={`${it.sampling.sampling_rate} — ${riskGroupMeta(it.sampling.risk_group).label}`}
                      sx={{ bgcolor: 'transparent', fontWeight: 700 }}
                    />
                    <Chip size="small" variant="outlined" label={`${it.sampling.quantity} عينة`} />
                  </Stack>
                ) : (
                  <Chip size="small" variant="outlined" label="لا تتطلب عينة (فحص ظاهري)" sx={{ mt: 0.5 }} />
                )}
              </Box>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Badge badgeContent={it.quantity} color="info">
                  <Chip label={it.packageType} size="small" variant="outlined" />
                </Badge>
                <IconButton aria-label="تعديل" size="small" color={editingIndex === i ? 'primary' : 'default'} onClick={() => startEdit(i)}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton aria-label="حذف" size="small" color="error" onClick={() => setDeleteIndex(i)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>
          ))}
        </Stack>
      )}

      <Dialog open={deleteIndex !== null} onClose={() => setDeleteIndex(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>حذف الصنف</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            هل أنت متأكد من حذف الصنف «{deleteIndex !== null ? items[deleteIndex]?.name : ''}»؟ لا يمكن التراجع عن هذا الإجراء.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteIndex(null)}>إلغاء</Button>
          <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={confirmDelete}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export { SMART_ITEMS, SMART_BRANDS, SUGGESTION_BANNER_ITEMS };
