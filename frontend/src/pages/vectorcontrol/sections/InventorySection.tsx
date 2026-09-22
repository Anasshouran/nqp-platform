import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { DataTable, StatusChip } from '../../../components/ui';
import { useServerTable } from '../../../hooks/useServerTable';
import {
  adjustInventory,
  createChemical,
  getChemicals,
  getInventory,
  getMovements,
  lowStockInventory,
} from '../../../api/endpoints/vectorControl';
import type { InventoryMovement, VectorChemical, VectorInventoryItem } from '../../../types/vectorControl';
import { vectorChemicalForm, vectorChemicalTarget, vectorHazardClass, vectorMovementType } from '../../../utils/status';
import { useVectorLookups } from '../hooks/useVectorLookups';
import { FieldGrid, SectionCard, SectionHeading, ToggleForm } from './common';
import { formatDate } from '../../../utils/formatters';
import { OfflineQueuedError } from '../../../utils/vectorOffline';

const NewChemicalForm = ({ onSaved }: { onSaved: () => void }) => {
  const [form, setForm] = useState({
    name_ar: '', active_ingredient: '', concentration: '', form: 'EC', hazard_class: 'WHO_II',
    target: 'MOSQUITO', unit: 'لتر', min_stock: '10', supplier: '', is_restricted: 'false', notes: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name_ar.trim()) return;
    setSaving(true);
    try {
      await createChemical({ ...form, min_stock: Number(form.min_stock), is_restricted: form.is_restricted === 'true' });
      setForm((f) => ({ ...f, name_ar: '', active_ingredient: '', concentration: '', notes: '' }));
      onSaved();
    } catch (err) {
      if (!(err instanceof OfflineQueuedError)) window.alert('تعذر حفظ المبيد');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ToggleForm open={true} onToggle={() => {}} title="مبيد جديد">
      <FieldGrid>
        <TextField required label="الاسم" value={form.name_ar} onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))} />
        <TextField label="المادة الفعالة" value={form.active_ingredient} onChange={(e) => setForm((f) => ({ ...f, active_ingredient: e.target.value }))} />
        <TextField label="التركيز" value={form.concentration} onChange={(e) => setForm((f) => ({ ...f, concentration: e.target.value }))} />
        <TextField select label="الشكل" value={form.form} onChange={(e) => setForm((f) => ({ ...f, form: e.target.value }))}>
          {Object.entries(vectorChemicalForm).map(([v, m]) => (<MenuItem key={v} value={v}>{m.label}</MenuItem>))}
        </TextField>
        <TextField select label="الفئة الخطرة" value={form.hazard_class} onChange={(e) => setForm((f) => ({ ...f, hazard_class: e.target.value }))}>
          {Object.entries(vectorHazardClass).map(([v, m]) => (<MenuItem key={v} value={v}>{m.label}</MenuItem>))}
        </TextField>
        <TextField select label="الاستخدام" value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}>
          {Object.entries(vectorChemicalTarget).map(([v, m]) => (<MenuItem key={v} value={v}>{m.label}</MenuItem>))}
        </TextField>
        <TextField label="وحدة القياس" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
        <TextField type="number" label="حد الإشعار (الحد الأدنى)" value={form.min_stock} onChange={(e) => setForm((f) => ({ ...f, min_stock: e.target.value }))} />
        <TextField label="المورد" value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} />
        <TextField select label="مقيد" value={form.is_restricted} onChange={(e) => setForm((f) => ({ ...f, is_restricted: e.target.value }))}>
          <MenuItem value="true">نعم</MenuItem>
          <MenuItem value="false">لا</MenuItem>
        </TextField>
      </FieldGrid>
      <TextField fullWidth multiline minRows={2} sx={{ mt: 2 }} label="ملاحظات" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
      <Box sx={{ mt: 2 }}>
        <Button variant="contained" onClick={submit} disabled={saving || !form.name_ar.trim()}>{saving ? 'جارٍ الحفظ...' : 'حفظ المبيد'}</Button>
      </Box>
    </ToggleForm>
  );
};

const InventorySection = () => {
  const t = useServerTable<VectorInventoryItem>({ fetchData: getInventory });
  const mt = useServerTable<InventoryMovement>({ fetchData: getMovements });
  const ct = useServerTable<VectorChemical>({ fetchData: getChemicals });
  const [formOpen, setFormOpen] = useState(false);
  const [adjustFor, setAdjustFor] = useState<VectorInventoryItem | null>(null);
  const [lowStock, setLowStock] = useState<VectorInventoryItem[]>([]);
  const lk = useVectorLookups();

  const act = (p: Promise<unknown>) => p.then(() => { t.refresh(); mt.refresh(); lk.reload(); }).catch((err) => { if (!(err instanceof OfflineQueuedError)) window.alert('فشلت العملية'); });

  const checkLowStock = () => lowStockInventory().then((r) => setLowStock(r.data.data)).then(lk.reload).catch(() => undefined);

  return (
    <SectionCard id="inventory">
      <SectionHeading
        icon={<Inventory2Icon color="info" />}
        title="المخزون والمبيدات"
        subtitle="مبيدات، أرصدة نقط الدخول، وحركات الصرف"
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" onClick={checkLowStock}>فحص المخزون المنخفض</Button>
            <Button size="small" variant="contained" onClick={() => setFormOpen((o) => !o)}>{formOpen ? 'إخفاء' : 'مبيد جديد'}</Button>
          </Box>
        }
      />
      {lowStock.length > 0 && (
        <Box sx={{ mb: 2 }}>
          {lowStock.map((i) => (
            <Typography key={i.id} variant="caption" display="block" color="error.main" sx={{ fontWeight: 700 }}>
              ⚠ {i.chemical_name} — {i.entry_point_name ?? 'عام'} متبقي {i.quantity} {i.unit}
            </Typography>
          ))}
        </Box>
      )}
      {formOpen && <NewChemicalForm onSaved={() => ct.refresh()} />}

      <DataTable<VectorChemical>
        columns={[
          { key: 'name_ar', label: 'المبيد' },
          { key: 'active_ingredient', label: 'المادة الفعالة', hideOnMobile: true },
          { key: 'form', label: 'الشكل', render: (r) => r.form_display || r.form, hideOnMobile: true },
          { key: 'hazard_class', label: 'الخطورة', render: (r) => { const m = vectorHazardClass[r.hazard_class]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.hazard_class; } },
          { key: 'target', label: 'الاستخدام', render: (r) => r.target_display || r.target, hideOnMobile: true },
          { key: 'in_stock_total', label: 'الرصيد الكلي', render: (r) => `${r.in_stock_total ?? 0} ${r.unit}` },
          { key: 'is_restricted', label: 'مقيد', render: (r) => (r.is_restricted ? <StatusChip label="مقيد" tone="error" /> : <StatusChip label="عادي" tone="success" />) },
        ]}
        rows={ct.rows} rowKey={(r) => r.id} count={ct.count} page={ct.page} rowsPerPage={ct.rowsPerPage}
        pageSizeOptions={ct.pageSizeOptions} loading={ct.loading} error={ct.error}
        title="المبيدات" subtitle={`${ct.count} مبيد`}
        searchInput={ct.searchInput} onSearchChange={ct.setSearchInput} searchPlaceholder="بحث باسم المبيد..."
        onPageChange={ct.setPage} onRowsPerPageChange={ct.setRowsPerPage} onRefresh={() => { ct.refresh(); lk.reload(); }}
        emptyTitle="لا توجد مبيدات" emptyDescription="سجل المبيدات يظهر هنا"
      />

      <DataTable<VectorInventoryItem>
        columns={[
          { key: 'chemical_name', label: 'المبيد' },
          { key: 'entry_point_name', label: 'نقطة التوزيع', render: (r) => r.entry_point_name ?? 'مخزون عام', hideOnMobile: true },
          { key: 'batch_number', label: 'الدفعة', hideOnMobile: true },
          { key: 'quantity', label: 'الرصيد', render: (r) => (<Box sx={{ fontWeight: 700, color: r.low_stock ? 'error.main' : 'inherit' }}>{r.quantity} {r.unit}</Box>) },
          { key: 'expiry_date', label: 'تاريخ الانتهاء', render: (r) => formatDate(r.expiry_date) || '—', hideOnMobile: true },
          {
            key: 'actions', label: 'إجراءات', sortable: false,
            render: (r) => <Button size="small" variant="outlined" onClick={() => setAdjustFor(r)}>تسوية رصيد</Button>,
          },
        ]}
        rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
        pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
        title="أرصدة المخزون" subtitle={`${t.count} رصيد`}
        searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالرصيد أو المبيد..."
        onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={() => { t.refresh(); checkLowStock(); }}
        emptyTitle="لا توجد أرصدة" emptyDescription="يجب إدخال الدفعات عبر فحص المخزون في الإدارة"
      />

      <DataTable<InventoryMovement>
        columns={[
          { key: 'item_label', label: 'الصنف', render: (r) => r.item_label ?? '—' },
          { key: 'movement_type', label: 'الحركة', render: (r) => { const m = vectorMovementType[r.movement_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.movement_type_display || r.movement_type; } },
          { key: 'quantity', label: 'الكمية', render: (r) => `${r.quantity} ${r.unit}` },
          { key: 'operation_number', label: 'العملية', render: (r) => r.operation_number ?? '—', hideOnMobile: true },
          { key: 'performed_at', label: 'التاريخ', render: (r) => formatDate(r.performed_at), hideOnMobile: true },
          { key: 'performed_by_name', label: 'بواسطة', hideOnMobile: true },
        ]}
        rows={mt.rows} rowKey={(r) => r.id} count={mt.count} page={mt.page} rowsPerPage={mt.rowsPerPage}
        pageSizeOptions={mt.pageSizeOptions} loading={mt.loading} error={mt.error}
        title="حركات المخزون" subtitle={`${mt.count} حركة`}
        searchInput={mt.searchInput} onSearchChange={mt.setSearchInput} searchPlaceholder="بحث بالحركة أو الصنف..."
        filters={[{ key: 'movement_type', label: 'الحركة', options: Object.entries(vectorMovementType).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => mt.setFilter('movement_type', v) }]}
        onPageChange={mt.setPage} onRowsPerPageChange={mt.setRowsPerPage} onRefresh={mt.refresh}
        emptyTitle="لا توجد حركات" emptyDescription="صرف واستلام المخزون يظهر هنا"
      />

      {adjustFor && (
        <AdjustDialog item={adjustFor} onClose={() => setAdjustFor(null)} onSaved={() => { t.refresh(); mt.refresh(); lk.reload(); }} />
      )}
    </SectionCard>
  );
};

const AdjustDialog = ({ item, onClose, onSaved }: { item: VectorInventoryItem; onClose: () => void; onSaved: () => void }) => {
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!quantity) return;
    setSaving(true);
    try {
      await adjustInventory(item.id, { quantity: Number(quantity), note });
      onSaved();
      onClose();
    } catch (err) {
      if (!(err instanceof OfflineQueuedError)) window.alert('تعذر تسوية الرصيد');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>تسوية رصيد — {item.chemical_name}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1 }}>الرصيد الحالي: <b>{item.quantity} {item.unit}</b></Typography>
        <TextField fullWidth type="number" label={`الكمية الجديدة (${item.unit})`} value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus />
        <TextField fullWidth multiline minRows={2} sx={{ mt: 2 }} label="ملاحظة" value={note} onChange={(e) => setNote(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={submit} disabled={saving || !quantity}>{saving ? 'جارٍ الحفظ...' : 'حفظ التسوية'}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default InventorySection;