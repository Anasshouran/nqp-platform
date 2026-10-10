// The draft edit dialog: lets a clerk correct a DRAFT shipment before submitting it.
import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import EditIcon from '@mui/icons-material/Edit';
import type { FoodShipment } from '../../../types/food';

type Props = {
  shipment: FoodShipment | null;
  saving: boolean;
  onClose: () => void;
  onSave: (id: string, payload: Record<string, unknown>) => Promise<void>;
};

const FIELDS: Array<{ key: string; label: string; type?: string; required?: boolean; only?: 'IMPORT' }> = [
  { key: 'manifest_number', label: 'رقم البيان', required: true },
  { key: 'supplier_name', label: 'اسم المورد/المصدر', required: true },
  { key: 'origin_country', label: 'بلد المنشأ' },
  { key: 'arrival_date', label: 'تاريخ الوصول', type: 'date' },
  { key: 'vessel_name', label: 'اسم الباخرة/وسيلة النقل' },
  { key: 'bill_of_lading', label: 'رقم البوليصة' },
  { key: 'customs_number', label: 'الرقم الجمركي' },
  { key: 'certificate_no', label: 'رقم الشهادة' },
  { key: 'clearing_agent', label: 'وكيل التخليص' },
  { key: 'exporter_name', label: 'اسم المصدر' },
];

export const ClerkShipmentEditor = ({ shipment, saving, onClose, onSave }: Props) => {
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!shipment) return;
    setForm({
      manifest_number: shipment.manifest_number ?? '',
      supplier_name: shipment.supplier_name ?? '',
      origin_country: shipment.origin_country ?? '',
      arrival_date: shipment.arrival_date ? String(shipment.arrival_date).slice(0, 10) : '',
      vessel_name: shipment.vessel_name ?? '',
      bill_of_lading: shipment.bill_of_lading ?? '',
      customs_number: shipment.customs_number ?? '',
      certificate_no: shipment.certificate_no ?? '',
      clearing_agent: shipment.clearing_agent ?? '',
      exporter_name: shipment.exporter_name ?? '',
    });
    setErrors({});
  }, [shipment]);

  const setField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = async () => {
    if (!shipment) return;
    const nextErrors: Record<string, string> = {};
    FIELDS.filter((f) => f.required).forEach((f) => {
      if (!form[f.key]?.trim()) nextErrors[f.key] = 'حقل إلزامي';
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    await onSave(shipment.id, Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v.trim() || undefined]),
    ));
  };

  return (
    <Dialog open={Boolean(shipment)} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
        <EditIcon fontSize="small" />
        تعديل المسودة {shipment?.manifest_number}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          {FIELDS.map((f) => (
            <Grid item xs={12} sm={6} key={f.key}>
              <TextField
                fullWidth
                size="small"
                type={f.type ?? 'text'}
                label={f.label}
                value={form[f.key] ?? ''}
                error={Boolean(errors[f.key])}
                helperText={errors[f.key]}
                onChange={(e) => setField(f.key, e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          ))}
        </Grid>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          لا يمكن تعديل الطلب بعد إرساله لتحصيل الرسوم.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose}>إلغاء</Button>
          <Button variant="contained" disabled={saving} onClick={() => void handleSave()}>
            {saving ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};
