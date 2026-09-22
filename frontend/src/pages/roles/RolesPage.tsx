import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import { PageHeader } from '../../components/common';
import { AppButton, ConfirmDialog, DataTable, StatusChip } from '../../components/ui';
import RoleFormDialog from '../../components/forms/RoleFormDialog';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import { deleteRole, listRoles } from '../../api/endpoints/roles';
import { notifyError, notifySuccess } from '../../utils/toast';
import { formatDateTime } from '../../utils/formatters';
import type { Role } from '../../types/user';

const RolesPage = () => {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);

  const table = useServerTable<Role>({
    fetchData: listRoles,
  });

  const {
    rows,
    count,
    loading,
    error,
    searchInput,
    setSearchInput,
    sortBy,
    sortOrder,
    setSorting,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    refresh,
    page,
    pageSizeOptions,
  } = table;

  const { exporting, exportAll } = useTableExport(table.fetchAllRows);

  const openCreate = () => {
    setEditingRole(null);
    setDialogOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingRole) return;
    setDeleting(true);
    try {
      await deleteRole(deletingRole.id);
      notifySuccess('تم حذف الدور بنجاح');
      setDeletingRole(null);
      refresh();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string } } })
        ?.response?.data;
      notifyError(data?.message || 'تعذر حذف الدور');
      setDeletingRole(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = () =>
    exportAll({
      filename: `roles-${new Date().toISOString().slice(0, 10)}.csv`,
      headers: ['الكود', 'الاسم بالإنجليزية', 'الاسم بالعربية', 'الوصف', 'عدد الصلاحيات', 'عدد المستخدمين'],
      mapRow: (r: Role) => [
        r.code,
        r.name,
        r.name_ar,
        r.description || '',
        String(r.permission_count ?? 0),
        String(r.user_count ?? 0),
      ],
      message: 'تم تصدير الأدوار',
    });

  return (
    <Box>
      <PageHeader
        title="الأدوار والصلاحيات"
        subtitle="إدارة أدوار النظام وتحديد الصلاحيات الممنوحة لكل دور"
        eyebrow="الإدارة"
        action={
          <Stack direction="row" spacing={1.5}>
            <AppButton
              variant="ghost"
              startIcon={<AssignmentIndIcon />}
              onClick={() => navigate('/app/roles/assignments')}
            >
              تعيينات الأدوار
            </AppButton>
            <AppButton onClick={openCreate}>دور جديد</AppButton>
          </Stack>
        }
      />

      <DataTable<Role>
        columns={[
          {
            key: 'code',
            label: 'الكود',
            sortable: true,
            render: (r) => <StatusChip label={r.code} tone="primary" variant="outlined" />,
          },
          {
            key: 'name',
            label: 'الاسم',
            render: (r) => (
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{r.name_ar || r.name}</Typography>
                {r.name_ar && r.name && (
                  <Typography variant="caption" color="text.secondary">
                    {r.name}
                  </Typography>
                )}
              </Box>
            ),
          },
          {
            key: 'default_scope',
            label: 'النطاق',
            sortable: true,
            render: (r) => {
              const labels: Record<string, string> = {
                GLOBAL: 'عام',
                SECTOR: 'قطاع',
                DEPARTMENT: 'إدارة',
                STATION: 'محطة',
                PORT: 'ميناء',
                POINT: 'نقطة',
                REGION: 'منطقة',
              };
              return <StatusChip label={labels[r.default_scope ?? ''] ?? (r.default_scope || '—')} tone="neutral" />;
            },
          },
          {
            key: 'description',
            label: 'الوصف',
            render: (r) => r.description || '—',
            hideOnMobile: true,
          },
          {
            key: 'permission_count',
            label: 'الصلاحيات',
            sortable: true,
            render: (r) => (
              <StatusChip label={`${r.permission_count ?? 0}`} tone="info" />
            ),
          },
          {
            key: 'user_count',
            label: 'المستخدمون',
            sortable: true,
            render: (r) => (
              <StatusChip label={`${r.user_count ?? 0}`} tone={r.user_count ? 'success' : 'neutral'} />
            ),
          },
          {
            key: 'created_at',
            label: 'تاريخ الإنشاء',
            render: (r) => formatDateTime(r.created_at),
            hideOnMobile: true,
          },
        ]}
        rows={rows}
        rowKey={(r) => r.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="قائمة الأدوار"
        subtitle={`${count} دور`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث بالكود أو الاسم..."
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onExport={handleExport}
        exporting={exporting}
        onRefresh={refresh}
        emptyTitle="لا توجد أدوار"
        emptyDescription="ابدأ بإنشاء دور جديد ومنحه الصلاحيات"
        actions={(r) => (
          <>
            <Tooltip title="تعديل">
              <IconButton aria-label="تعديل" size="small" onClick={() => openEdit(r)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="حذف">
              <IconButton aria-label="حذف"
                size="small"
                color="error"
                onClick={() => setDeletingRole(r)}
                disabled={(r.user_count ?? 0) > 0}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      />

      <RoleFormDialog
        open={dialogOpen}
        role={editingRole}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          refresh();
        }}
      />

      <ConfirmDialog
        open={Boolean(deletingRole)}
        title="حذف الدور"
        message={`هل أنت متأكد من حذف الدور «${deletingRole?.name_ar || deletingRole?.code}»؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeletingRole(null)}
      />
    </Box>
  );
};

export default RolesPage;
