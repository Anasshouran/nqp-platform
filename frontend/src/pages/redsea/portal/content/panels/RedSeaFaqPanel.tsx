import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { DataTable, SectionCard, FormDialog, ConfirmDialog } from '../../../../../components/uikit';
import type { DataTableColumn } from '../../../../../components/uikit';
import { getCmsFaq, createCmsFaq, updateCmsFaq, deleteCmsFaq } from '../../../../../api/endpoints/cms';
import type { CmsFaq } from '../../../../../api/endpoints/cms';

const EMPTY: Partial<CmsFaq> = { question: '', answer: '', order: 0, is_active: true };

const RedSeaFaqPanel = () => {
  const [rows, setRows] = useState<CmsFaq[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<CmsFaq | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<CmsFaq | null>(null);
  const [form, setForm] = useState<Partial<CmsFaq>>(EMPTY);

  const load = () => {
    setLoading(true);
    getCmsFaq()
      .then((res) => {
        setRows(res.data.data.results);
        setCount(res.data.data.count);
      })
      .catch(() => {
        setRows([]);
        setCount(0);
      })
      .finally(() => setLoading(false));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpened(true);
  };

  const openEdit = (row: CmsFaq) => {
    setEditing(row);
    setForm({ question: row.question, answer: row.answer, order: row.order, is_active: row.is_active });
    setOpened(true);
  };

  const save = () => {
    setSaving(true);
    const op = editing ? updateCmsFaq(editing.id, form) : createCmsFaq(form);
    op.then(() => {
      setOpened(false);
      load();
    })
      .catch(() => undefined)
      .finally(() => setSaving(false));
  };

  const columns: DataTableColumn<CmsFaq>[] = [
    { key: 'order', label: 'الترتيب', render: (r) => r.order },
    {
      key: 'question',
      label: 'السؤال',
      render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.question}</Typography>,
      noWrap: false,
    },
    {
      key: 'is_active',
      label: 'الحالة',
      render: (r) => (
        <Chip size="small" label={r.is_active ? 'نشط' : 'غير نشط'} color={r.is_active ? 'success' : 'default'} variant="outlined" />
      ),
    },
  ];

  return (
    <SectionCard
      title="الأسئلة الشائعة"
      subtitle="إدارة الأسئلة الشائعة في موقع القطاع"
      action={
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          إضافة سؤال
        </Button>
      }
    >
      <DataTable<CmsFaq>
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        count={count}
        page={1}
        rowsPerPage={count || 10}
        loading={loading}
        hidePagination
        actions={(r) => (
          <>
            <IconButton aria-label="تعديل" onClick={() => openEdit(r)} color="primary"><EditIcon /></IconButton>
            <IconButton aria-label="حذف" onClick={() => setDeleting(r)} color="error"><DeleteIcon /></IconButton>
          </>
        )}
      />

      <FormDialog
        open={opened}
        title={editing ? 'تعديل سؤال' : 'إضافة سؤال'}
        maxWidth="md"
        onClose={() => setOpened(false)}
        onSubmit={save}
        loading={saving}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth type="number" label="الترتيب" value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="السؤال" required value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="الجواب" required multiline minRows={4} value={form.answer} onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))} />
          </Grid>
          <Grid item xs={12}>
            <Chip
              label={form.is_active ? 'نشط' : 'غير نشط'}
              color={form.is_active ? 'success' : 'default'}
              onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
            />
          </Grid>
        </Grid>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="حذف السؤال"
        message={`هل أنت متأكد من حذف "${deleting?.question}"؟`}
        confirmLabel="حذف"
        onConfirm={() => {
          if (!deleting) return;
          deleteCmsFaq(deleting.id).then(() => {
            setDeleting(null);
            load();
          });
        }}
        onClose={() => setDeleting(null)}
      />
    </SectionCard>
  );
};

export default RedSeaFaqPanel;
