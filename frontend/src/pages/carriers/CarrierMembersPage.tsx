import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

import { PageHeader } from '../../components/common';
import { DataTable, StatusChip, FormDialog, ConfirmDialog, FormSelect } from '../../components/uikit';
import { useServerTable } from '../../hooks/useServerTable';
import { useAuth } from '../../hooks/useAuth';
import {
  listCarrierMembers,
  createCarrierMember,
  updateCarrierMember,
  activateCarrierMember,
  deactivateCarrierMember,
  getCarriers,
} from '../../api/endpoints/carriers';
import type { Carrier, CarrierMember } from '../../types/carrier';
import { formatDateTime } from '../../utils/formatters';
import { notifySuccess, notifyError, extractErrorMessage } from '../../utils/toast';

/** كل تحفّظ على النطاق يُعبَّر عنه كقائمة فارغة — لا يخترق المستخدم أي شركة لم تُسنَد إليه. */
const deriveScopedCompanies = (
  user: { role_assignments?: Array<{ scope_type?: string; scope_id?: string | null; is_active?: boolean; role_code?: string; role?: string }> } | null | undefined,
): string[] => {
  const ids = new Set<string>();
  for (const a of user?.role_assignments ?? []) {
    if (a.scope_type !== 'COMPANY' || a.is_active === false || !a.scope_id) continue;
    const code = a.role_code ?? a.role ?? '';
    if (code === 'CARRIER_ADMIN') ids.add(a.scope_id);
  }
  return Array.from(ids);
};

const CarrierMembersTable = ({
  carrierId,
  canAdd,
  canEdit,
  canActivate,
  canDeactivate,
}: {
  carrierId: string;
  canAdd: boolean;
  canEdit: boolean;
  canActivate: boolean;
  canDeactivate: boolean;
}) => {
  const fetchMembers = useCallback(
    (params: Record<string, unknown>) => listCarrierMembers(carrierId, params),
    [carrierId],
  );
  const table = useServerTable<CarrierMember>({ fetchData: fetchMembers });
  const { rows, count, loading, error, page, rowsPerPage, setPage, setRowsPerPage, pageSizeOptions, refresh } = table;

  const [addOpen, setAddOpen] = useState(false);
  const [editMember, setEditMember] = useState<CarrierMember | null>(null);
  const [deactivateMember, setDeactivateMember] = useState<CarrierMember | null>(null);
  const [busy, setBusy] = useState(false);
  const [addUser, setAddUser] = useState('');
  const [addPrimary, setAddPrimary] = useState(false);
  const [editPrimary, setEditPrimary] = useState(false);

  const openAdd = () => { setAddUser(''); setAddPrimary(false); setAddOpen(true); };
  const closeAdd = () => setAddOpen(false);
  const openEdit = (m: CarrierMember) => { setEditMember(m); setEditPrimary(m.is_primary); };
  const closeEdit = () => setEditMember(null);

  const submitAdd = () => {
    const userId = addUser.trim();
    if (!userId) { notifyError('مطلوب معرّف المستخدم'); return; }
    setBusy(true);
    createCarrierMember(carrierId, { user: userId, is_primary: addPrimary })
      .then(() => { notifySuccess('تمت إضافة العضو بنجاح'); closeAdd(); refresh(); })
      .catch((err) => notifyError(extractErrorMessage(err, 'تعذّرت إضافة العضو')))
      .finally(() => setBusy(false));
  };

  const submitEdit = () => {
    if (!editMember) return;
    setBusy(true);
    updateCarrierMember(carrierId, editMember.id, { is_primary: editPrimary })
      .then(() => { notifySuccess('تم تحديث العضو بنجاح'); closeEdit(); refresh(); })
      .catch((err) => notifyError(extractErrorMessage(err, 'تعذّر تحديث العضو')))
      .finally(() => setBusy(false));
  };

  const confirmDeactivate = () => {
    if (!deactivateMember) return;
    setBusy(true);
    deactivateCarrierMember(carrierId, deactivateMember.id)
      .then(() => { notifySuccess('تم تعطيل العضو. فُقد وصوله إلى بوابة الشركة فوراً.'); setDeactivateMember(null); refresh(); })
      .catch((err) => notifyError(extractErrorMessage(err, 'تعذّرت تعطيل العضو')))
      .finally(() => setBusy(false));
  };

  const doActivate = (m: CarrierMember) => {
    setBusy(true);
    activateCarrierMember(carrierId, m.id)
      .then(() => { notifySuccess('تم تفعيل العضو بنجاح'); refresh(); })
      .catch((err) => notifyError(extractErrorMessage(err, 'تعذّر تفعيل العضو')))
      .finally(() => setBusy(false));
  };

  const columns = useMemo(() => [
    { key: 'user_full_name', label: 'الاسم', render: (m: CarrierMember) => <Typography fontWeight={700}>{m.user_full_name}</Typography> },
    { key: 'user_email', label: 'البريد الإلكتروني', hideOnMobile: true },
    { key: 'is_active', label: 'الحالة', render: (m: CarrierMember) => (m.is_active ? <StatusChip label="نشط" tone="success" /> : <StatusChip label="غير نشط" tone="neutral" />) },
    { key: 'is_primary', label: 'الأساسي', render: (m: CarrierMember) => (m.is_primary ? <StatusChip label="أساسي" tone="primary" /> : '—'), hideOnMobile: true },
    { key: 'created_at', label: 'تاريخ الإنشاء', render: (m: CarrierMember) => formatDateTime(m.created_at), hideOnMobile: true },
  ], []);

  return (
    <>
      {canAdd && (
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
          <Button type="button" variant="contained" startIcon={<PersonAddIcon />} onClick={openAdd}>
            إضافة عضو
          </Button>
        </Stack>
      )}
      <DataTable<CarrierMember>
        columns={columns}
        rows={rows}
        rowKey={(m) => m.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="قائمة الأعضاء"
        subtitle={`${count} عضو`}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا يوجد أعضاء"
        emptyDescription="ابدأ بإضافة عضو جديد لهذه الشركة"
        actions={(m) => (
          <Stack direction="row" spacing={0.5}>
            {canEdit && (
              <Tooltip title="تعديل العضوية">
                <IconButton aria-label="تعديل" size="small" onClick={() => openEdit(m)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {m.is_active ? (
              canDeactivate && (
                <Tooltip title="تعطيل">
                  <IconButton aria-label="تعطيل" size="small" color="error" onClick={() => setDeactivateMember(m)}>
                    <BlockIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )
            ) : (
              canActivate && (
                <Tooltip title="تفعيل">
                  <IconButton aria-label="تفعيل" size="small" color="success" onClick={() => doActivate(m)}>
                    <CheckCircleIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )
            )}
          </Stack>
        )}
      />

      <FormDialog
        open={addOpen}
        title="إضافة عضو جديد"
        subtitle="أدخل معرّف المستخدم واختر ما إذا كان سيكون الممثل الرئيسي للشركة"
        submitLabel="حفظ العضو"
        onClose={closeAdd}
        onSubmit={submitAdd}
        loading={busy}
      >
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="معرّف المستخدم (UUID)"
            value={addUser}
            onChange={(e) => setAddUser(e.target.value)}
            fullWidth
            autoFocus
            required
            inputProps={{ 'aria-label': 'معرّف المستخدم' }}
          />
          <FormControlLabel
            control={<Checkbox checked={addPrimary} onChange={(e) => setAddPrimary(e.target.checked)} />}
            label="تعيين كممثل رئيسي"
          />
        </Stack>
      </FormDialog>

      <FormDialog
        open={!!editMember}
        title="تعديل العضوية"
        subtitle="يمكن تعديل كون العضو ممثلاً أساسياً فقط — لا يمكن تغيير المستخدم أو الشركة."
        submitLabel="حفظ"
        onClose={closeEdit}
        onSubmit={submitEdit}
        loading={busy}
      >
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {editMember?.user_full_name} · {editMember?.user_email}
          </Typography>
          <FormControlLabel
            control={<Checkbox checked={editPrimary} onChange={(e) => setEditPrimary(e.target.checked)} />}
            label="تعيين كممثل رئيسي"
          />
        </Stack>
      </FormDialog>

      <ConfirmDialog
        open={!!deactivateMember}
        title="تعطيل العضوية"
        message={`هل أنت متأكد من تعطيل "${deactivateMember?.user_full_name ?? ''}"؟ سيُفقَد وصوله إلى بوابة الشركة فوراً، ولا يمكن استعادته إلا بإعادة تفعيل العضوية.`}
        confirmLabel="تعطيل"
        loading={busy}
        onConfirm={confirmDeactivate}
        onClose={() => !busy && setDeactivateMember(null)}
      />
    </>
  );
};

const CarrierMembersPage = () => {
  const { user } = useAuth();
  const isSystemAdmin = user?.role === 'ADMIN';
  const scopedCompanyIds = useMemo(() => deriveScopedCompanies(user), [user]);

  const [adminCompanies, setAdminCompanies] = useState<Carrier[]>([]);
  const [adminCompaniesError, setAdminCompaniesError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSystemAdmin) return;
    let alive = true;
    getCarriers({ page_size: 500 })
      .then((r) => { if (alive) setAdminCompanies(r.data.data.results || []); })
      .catch((err) => { if (alive) setAdminCompaniesError(extractErrorMessage(err, 'تعذّر تحميل قائمة الشركات')); });
    return () => { alive = false; };
  }, [isSystemAdmin]);

  const companyOptions = useMemo(() => {
    if (isSystemAdmin) return adminCompanies.map((c) => ({ value: c.id, label: c.name }));
    return scopedCompanyIds.map((id) => ({ value: id, label: id }));
  }, [isSystemAdmin, adminCompanies, scopedCompanyIds]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const effectiveSelectedId = selectedId && companyOptions.some((c) => c.value === selectedId)
    ? selectedId
    : companyOptions.length > 0
      ? companyOptions[0].value
      : null;

  const can = (code: string): boolean => {
    const perms = user?.permissions;
    if (!perms || perms.length === 0) return true; // تغطية empty (موظفو is_staff، ثابت RoleNavMenu)
    return perms.includes(code);
  };
  const canAdd = can('carrier_members:add');
  const canEdit = can('carrier_members:edit');
  const canActivate = can('carrier_members:activate');
  const canDeactivate = can('carrier_members:deactivate');

  // غياب التعيين الصريح ⇒ لا صفحة عادية، بل إشعار informative.
  if (!isSystemAdmin && scopedCompanyIds.length === 0) {
    return (
      <Box sx={{ p: { xs: 1.5, md: 3 } }}>
        <PageHeader title="أعضاء الشركة" subtitle="إدارة عضويات شركات النقل التابعة لهويّتك" />
        <Alert severity="info">ليس لديك أي شركة مُسندة لإدارتها.</Alert>
      </Box>
    );
  }

  if (!effectiveSelectedId) {
    return (
      <Box sx={{ p: { xs: 1.5, md: 3 } }}>
        <PageHeader title="أعضاء الشركة" subtitle="إدارة عضويات شركات النقل التابعة لهويّتك" />
        <Alert severity="info">لا توجد شركات مُتاحة لإدارتها حالياً.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <PageHeader
        title="أعضاء الشركة"
        subtitle="إدارة عضويات شركات النقل — لا يُمسح عضو، بل يُعطَّل حتى يُزال وصوله من البوابة."
      />

      {isSystemAdmin && adminCompaniesError && (
        <Alert severity="error" sx={{ mb: 2 }}>{adminCompaniesError}</Alert>
      )}

      {companyOptions.length > 1 && (
        <Paper sx={{ p: 2, mb: 2.5, borderRadius: 3, maxWidth: 420 }}>
          <FormSelect
            label="الشركة"
            value={effectiveSelectedId ?? ''}
            options={companyOptions}
            onChange={(v) => setSelectedId(v)}
          />
        </Paper>
      )}

      <CarrierMembersTable
        key={effectiveSelectedId}
        carrierId={effectiveSelectedId}
        canAdd={canAdd}
        canEdit={canEdit}
        canActivate={canActivate}
        canDeactivate={canDeactivate}
      />
    </Box>
  );
};

export default CarrierMembersPage;
