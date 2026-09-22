import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { PageHeader } from '../../components/common';
import { AppButton, ConfirmDialog, DataTable, StatusChip } from '../../components/ui';
import RoleAssignmentFormDialog from '../../components/forms/RoleAssignmentFormDialog';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import {
  listRoleAssignments,
  deleteRoleAssignment,
} from '../../api/endpoints/roleAssignments';
import { notifyError, notifySuccess } from '../../utils/toast';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { scopeType } from '../../utils/status';
import { SCOPE_TYPES } from '../../types/user';
import type { RoleAssignment, ScopeType } from '../../types/user';

const RoleAssignmentsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilteredUser = useMemo(() => searchParams.get('user') || '', [searchParams]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<RoleAssignment | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<RoleAssignment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(
    (params: Record<string, unknown>) => {
      const merged = { ...params };
      if (prefilteredUser) merged.user = prefilteredUser;
      return listRoleAssignments(merged);
    },
    [prefilteredUser],
  );

  const table = useServerTable<RoleAssignment>({
    fetchData,
    initialPageSize: 15,
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
    setFilter,
  } = table;

  const { exporting, exportAll } = useTableExport(table.fetchAllRows);

  const openCreate = () => {
    setEditingAssignment(null);
    setDialogOpen(true);
  };

  const openEdit = (a: RoleAssignment) => {
    setEditingAssignment(a);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingAssignment) return;
    setDeleting(true);
    try {
      await deleteRoleAssignment(deletingAssignment.id);
      notifySuccess('تم حذف التعيين بنجاح');
      setDeletingAssignment(null);
      refresh();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string } } })?.response?.data;
      notifyError(data?.message || 'تعذر حذف التعيين');
      setDeletingAssignment(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = () =>
    exportAll({
      filename: `role-assignments-${new Date().toISOString().slice(0, 10)}.csv`,
      headers: ['المستخدم', 'البريد الإلكتروني', 'الدور', 'النطاق', 'تاريخ البداية', 'تاريخ النهاية', 'الحالة', 'تعيين بواسطة', 'تاريخ الإنشاء'],
      mapRow: (a: RoleAssignment) => [
        a.user_email || a.user,
        a.user_email || '',
        a.role_name || a.role_code,
        scopeType[a.scope_type ?? ''] || a.scope_type || '—',
        a.start_date || '—',
        a.end_date || 'مفتوح',
        a.is_active ? 'نشط' : 'معطّل',
        a.assigned_by_email || '—',
        formatDateTime(a.created_at),
      ],
      message: 'تم تصدير تعيينات الأدوار',
    });

  return (
    <Box>
      <PageHeader
        title="تعيينات الأدوار"
        subtitle="إدارة تعيينات الأدوار للمستخدمين مع تحديد النطاق والمدة"
        eyebrow="الإدارة"
        action={
          <Stack direction="row" spacing={1.5}>
            <AppButton variant="ghost" startIcon={<OpenInNewIcon />} onClick={() => navigate('/app/roles')}>
              الأدوار
            </AppButton>
            <AppButton onClick={openCreate}>تعيين جديد</AppButton>
          </Stack>
        }
      />

      {prefilteredUser && (
        <Box sx={{ mb: 2 }}>
          <StatusChip label="مرشّح حسب المستخدم" tone="primary" />
        </Box>
      )}

      <DataTable<RoleAssignment>
        columns={[
          {
            key: 'user_email',
            label: 'المستخدم',
            sortable: true,
            render: (a) => (
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{a.user_email || a.user}</Typography>
              </Box>
            ),
          },
          {
            key: 'role_name',
            label: 'الدور',
            sortable: true,
            render: (a) => (
              <Box>
                <StatusChip label={a.role_code} tone="primary" variant="outlined" />
                {a.role_name && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.3 }}>
                    {a.role_name}
                  </Typography>
                )}
              </Box>
            ),
          },
          {
            key: 'scope_type',
            label: 'النطاق',
            sortable: true,
            render: (a) => {
              const label = scopeType[a.scope_type ?? ''] || a.scope_type || '—';
              return (
                <Box>
                  <StatusChip label={label} tone="neutral" />
                  {a.scope_id && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.3 }}>
                      {a.scope_id}
                    </Typography>
                  )}
                </Box>
              );
            },
          },
          {
            key: 'start_date',
            label: 'المدة',
            render: (a) => (
              <Box>
                <Typography fontSize={13}>{formatDate(a.start_date)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {a.end_date ? `→ ${formatDate(a.end_date)}` : 'مفتوح'}
                </Typography>
              </Box>
            ),
            hideOnMobile: true,
          },
          {
            key: 'is_active',
            label: 'الحالة',
            render: (a) => {
              if (!a.is_active) return <StatusChip label="معطّل" tone="neutral" />;
              if (a.is_current) return <StatusChip label="نشط" tone="success" />;
              return <StatusChip label="في المدى" tone="info" />;
            },
          },
          {
            key: 'assigned_by_email',
            label: 'تعيين بواسطة',
            render: (a) => a.assigned_by_email || '—',
            hideOnMobile: true,
          },
          {
            key: 'created_at',
            label: 'الإنشاء',
            sortable: true,
            render: (a) => formatDateTime(a.created_at),
            hideOnMobile: true,
          },
        ]}
        rows={rows}
        rowKey={(a) => a.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="قائمة التعيينات"
        subtitle={`${count} تعيين`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث بالبريد أو الدور..."
        filters={[
          {
            key: 'is_active',
            label: 'الحالة',
            options: [
              { value: 'true', label: 'نشط' },
              { value: 'false', label: 'معطّل' },
            ],
            value: '',
            onChange: (v) => setFilter('is_active', v),
          },
          {
            key: 'scope_type',
            label: 'النطاق',
            options: SCOPE_TYPES.map((s) => ({ value: s, label: scopeType[s] || s })),
            value: '',
            onChange: (v) => setFilter('scope_type', v),
          },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onExport={handleExport}
        exporting={exporting}
        onRefresh={refresh}
        emptyTitle="لا توجد تعيينات"
        emptyDescription="ابدأ بتعيين دور لأحد المستخدمين"
        actions={(a) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="تعديل">
              <IconButton aria-label="تعديل" size="small" onClick={() => openEdit(a)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="حذف">
              <IconButton
                aria-label="حذف"
                size="small"
                color="error"
                onClick={() => setDeletingAssignment(a)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      />

      <RoleAssignmentFormDialog
        open={dialogOpen}
        assignment={editingAssignment}
        defaultUserId={prefilteredUser || undefined}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          refresh();
        }}
      />

      <ConfirmDialog
        open={Boolean(deletingAssignment)}
        title="حذف التعيين"
        message={`هل أنت متأكد من حذف تعيين الدور «${deletingAssignment?.role_name || deletingAssignment?.role_code}» للمستخدم "${deletingAssignment?.user_email}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeletingAssignment(null)}
      />
    </Box>
  );
};

export default RoleAssignmentsPage;
