import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { PageHeader } from '../../components/common';
import { AppButton, ConfirmDialog, DataTable, StatusChip } from '../../components/ui';
import LabParameterFormDialog from '../../components/forms/LabParameterFormDialog';
import { deleteLabParameter, getLabParameters } from '../../api/endpoints/foodlab';
import { useServerTable } from '../../hooks/useServerTable';
import { labBench } from '../../utils/status';
import { notifySuccess } from '../../utils/toast';
import type { DataTableFilterDef } from '../../components/ui/DataTable';
import type { LabParameter } from '../../types/food';

const num = (v: number | string | null | undefined) =>
  v == null || v === '' ? 0 : Number(v);

const fmt = (v: number) => v.toLocaleString('en-US');

const LabPricingPage = () => {
  const table = useServerTable<LabParameter>({
    fetchData: (params) => getLabParameters(params),
  });

  const [benchFilter, setBenchFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const filters: DataTableFilterDef[] = [
    {
      key: 'bench',
      label: 'كل المختبرات',
      options: Object.entries(labBench).map(([value, meta]) => ({ value, label: meta.label })),
      value: benchFilter,
      onChange: (value: string) => {
        setBenchFilter(value);
        table.setFilter('bench', value);
      },
    },
    {
      key: 'is_active',
      label: 'كل الحالات',
      options: [
        { value: 'true', label: 'نشط' },
        { value: 'false', label: 'موقوف' },
      ],
      value: activeFilter,
      onChange: (value: string) => {
        setActiveFilter(value);
        table.setFilter('is_active', value);
      },
    },
  ];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LabParameter | null>(null);
  const [deleting, setDeleting] = useState<LabParameter | null>(null);

  const [summary, setSummary] = useState<Record<string, { count: number; total: number }>>({});
  useEffect(() => {
    let mounted = true;
    getLabParameters({ page_size: 500 })
      .then((res) => {
        if (!mounted) return;
        const all = Array.isArray(res.data?.data?.results) ? res.data.data.results : [];
        const acc: Record<string, { count: number; total: number }> = {};
        for (const p of all) {
          if (!acc[p.bench]) acc[p.bench] = { count: 0, total: 0 };
          acc[p.bench].count += 1;
          acc[p.bench].total += num(p.price);
        }
        setSummary(acc);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const totalPrice = useMemo(() => Object.values(summary).reduce((s, v) => s + v.total, 0), [summary]);

  const handleSave = () => {
    setDialogOpen(false);
    setEditing(null);
    table.refresh();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteLabParameter(deleting.id);
      notifySuccess('تم حذف الفحص');
      setDeleting(null);
      table.refresh();
    } catch {
      setDeleting(null);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, lg: 3 } }}>
      <PageHeader
        title="تسعير الفحوص المخبرية"
        eyebrow="معاملات التحليل"
        subtitle="أسعار التحاليل لكل فحص — تُخصم آلياً على فواتير العينات عند إدراج المعامل"
        action={
          <AppButton startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            إضافة فحص
          </AppButton>
        }
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(summary).length > 0 && (
          <Grid item xs={6} sm={4} md={2}>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                p: 1.5,
                bgcolor: 'rgba(255,255,255,0.86)',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                إجمالي التعرفة
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 17 }}>{fmt(totalPrice)} ج.س</Typography>
            </Box>
          </Grid>
        )}
        {Object.entries(labBench).map(([key, meta]) => {
          const s = summary[key];
          if (!s || s.count === 0) return null;
          return (
            <Grid item xs={6} sm={4} md={2} key={key}>
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  p: 1.5,
                  bgcolor: 'rgba(255,255,255,0.86)',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {meta.label}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="baseline">
                  <Typography sx={{ fontWeight: 700, fontSize: 17 }}>{s.count}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    فحص — {fmt(s.total)} ج.س
                  </Typography>
                </Stack>
              </Box>
            </Grid>
          );
        })}
      </Grid>

      <DataTable
        title="معاملات التحليل"
        subtitle="كتالوج الفحوص المخبرية وأسعارها حسب المختبر"
        columns={[
          { key: 'code', label: 'الكود', width: 120, noWrap: true },
          {
            key: 'name',
            label: 'الاسم',
            render: (p) => (
              <Stack>
                <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>{p.name_ar}</Typography>
                {p.name_en && (
                  <Typography variant="caption" color="text.secondary">
                    {p.name_en}
                  </Typography>
                )}
              </Stack>
            ),
          },
          {
            key: 'bench',
            label: 'المختبر',
            render: (p) => (
              <StatusChip label={labBench[p.bench]?.label || p.bench} tone="info" variant="outlined" />
            ),
          },
          { key: 'unit', label: 'الوحدة', render: (p) => p.unit || '—' },
          {
            key: 'price',
            label: 'السعر (ج.س)',
            render: (p) => <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{fmt(num(p.price))}</Typography>,
          },
          { key: 'sla', label: 'مدة الإنجاز', render: (p) => `${p.sla_min_days}–${p.sla_max_days} يوم` },
          {
            key: 'is_active',
            label: 'الحالة',
            render: (p) => (
              <StatusChip
                label={p.is_active ? 'نشط' : 'موقوف'}
                tone={p.is_active ? 'success' : 'neutral'}
                variant="outlined"
              />
            ),
          },
        ]}
        rows={table.rows}
        rowKey={(p) => p.id}
        count={table.count}
        page={table.page}
        rowsPerPage={table.rowsPerPage}
        loading={table.loading}
        error={table.error}
        searchInput={table.searchInput}
        onSearchChange={table.setSearchInput}
        searchPlaceholder="بحث بالكود أو الاسم..."
        filters={filters}
        sortBy={table.sortBy}
        sortOrder={table.sortOrder}
        onSortChange={table.setSorting}
        onPageChange={table.setPage}
        onRowsPerPageChange={table.setRowsPerPage}
        onRefresh={table.refresh}
        actions={(p) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="تعديل">
              <IconButton
                size="small"
                color="primary"
                aria-label="تعديل"
                onClick={() => {
                  setEditing(p);
                  setDialogOpen(true);
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="حذف">
              <IconButton size="small" color="error" aria-label="حذف" onClick={() => setDeleting(p)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      />

      <LabParameterFormDialog
        open={dialogOpen}
        param={editing}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onSaved={handleSave}
      />

      <ConfirmDialog
        open={!!deleting}
        title="حذف الفحص"
        message={`تأكيد حذف الفحص «${deleting?.name_ar}»؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </Box>
  );
};

export default LabPricingPage;