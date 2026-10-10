import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader } from '../../../components/common';
import { DataTable, ConfirmDialog } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui/DataTable';
import { useServerTable } from '../../../hooks/useServerTable';
import {
  createOrganization,
  deleteOrganization,
  getOrganizations,
  updateOrganization,
} from '../../../api/endpoints/integration';
import type { Organization, OrganizationFormData } from '../../../types/integration';
import { formatDateTime } from '../../../utils/formatters';
import { notifyError, notifySuccess } from '../../../utils/toast';
import OrganizationDialog from './OrganizationDialog';

const ORG_TYPE_LABELS: Record<string, string> = {
  INTERNATIONAL: 'دولية',
  GOVERNMENT: 'حكومية',
  LABORATORY: 'مختبر',
  HOSPITAL: 'مستشفى',
  PARTNER: 'شريك',
  OTHER: 'أخرى',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'نشط',
  PENDING: 'معلق',
  INACTIVE: 'غير نشط',
};

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'default'> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  INACTIVE: 'default',
};

const PortalOrganizationsPage = () => {
  const table = useServerTable<Organization>({ fetchData: getOrganizations });
  const {
    rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder,
    setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions,
  } = table;

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (row: Organization) => {
    setEditing(row);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: OrganizationFormData) => {
    setSaving(true);
    try {
      if (editing) {
        await updateOrganization(editing.id, data);
        notifySuccess('تم تحديث المنظمة');
      } else {
        await createOrganization(data);
        notifySuccess('تم إنشاء المنظمة');
      }
      setDialogOpen(false);
      setEditing(null);
      refresh();
    } catch {
      notifyError('تعذّر حفظ المنظمة');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: Organization) => {
    if (deletingId) return;
    setDeletingId(row.id);
    try {
      await deleteOrganization(row.id);
      notifySuccess('تم حذف المنظمة');
      refresh();
    } catch {
      notifyError('تعذّر حذف المنظمة');
    } finally {
      setDeletingId(null);
    }
  };
  const columns: DataTableColumn<Organization>[] = [
    { key: 'code', label: 'الكود', sortable: true },
    { key: 'name_ar', label: 'الاسم', sortable: true },
    {
      key: 'name_en', label: 'الاسم (EN)', sortable: true,
      render: (row) => <span dir="ltr" style={{ display: 'inline-block' }}>{row.name_en}</span>,
    },
    {
      key: 'org_type', label: 'النوع',
      render: (row) => <Chip size="small" label={ORG_TYPE_LABELS[row.org_type] ?? row.org_type} />,
    },
    {
      key: 'status', label: 'الحالة', sortable: true,
      render: (row) => (
        <Chip
          size="small"
          color={STATUS_COLORS[row.status] ?? 'default'}
          label={STATUS_LABELS[row.status] ?? row.status}
        />
      ),
    },
    {
      key: 'created_at', label: 'تاريخ الإنشاء', sortable: true,
      render: (row) => formatDateTime(row.created_at), hideOnMobile: true,
    },
  ];

  return (
    <Box>
      <PageHeader
        title="المنظمات"
        subtitle="الجهات الشريكة التي تتبادل البيانات مع المنصة"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            إضافة منظمة
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="ابحث بالاسم أو الكود"
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        onExport={table.fetchAllRows}
        emptyTitle="لا توجد منظّمات"
        emptyDescription="ابدأ بإضافة أول منظمة شريكة"
        actions={(row) => (
          <>
            <Tooltip title="تعديل">
              <IconButton size="small" onClick={() => handleEdit(row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="حذف">
              <IconButton size="small" color="error" disabled={deletingId === row.id} onClick={() => setDeleteTarget(row)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="تأكيد الحذف"
        message={deleteTarget ? `حذف «${deleteTarget.name_ar || deleteTarget.name_en}»؟` : ''}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        tone="error"
        loading={deletingId !== null}
        onConfirm={() => {
          if (deleteTarget) {
            const target = deleteTarget;
            setDeleteTarget(null);
            void handleDelete(target);
          }
        }}
        onClose={() => { if (!deletingId) setDeleteTarget(null); }}
      />

      <OrganizationDialog
        open={dialogOpen}
        organization={editing}
        saving={saving}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
      />
    </Box>
  );
};

export default PortalOrganizationsPage;