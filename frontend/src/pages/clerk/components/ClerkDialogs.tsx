// The submit confirmation and draft-deletion confirmation dialogs.
// Extracted from ClerkDashboardPage without behavioural change.
import type { useClerkActions } from '../hooks/useClerkActions';
import type { useClerkWizard } from '../hooks/useClerkWizard';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import SendIcon from '@mui/icons-material/Send';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';

type Props = {
  actions: Pick<ReturnType<typeof useClerkActions>, 'deleteTarget' | 'deleting' | 'handleDelete' | 'setDeleteTarget'>;
  wizard: Pick<ReturnType<typeof useClerkWizard>, 'confirmOpen' | 'handleSubmit' | 'requesting' | 'setConfirmOpen'>;
};

export const ClerkDialogs = ({ actions, wizard }: Props) =>{
  const { deleteTarget, deleting, handleDelete, setDeleteTarget } = actions;
  const { confirmOpen, handleSubmit, requesting, setConfirmOpen } = wizard;

  return (
    <>

        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>تأكيد إرسال الطلب</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              سيتم إنشاء البيان وإرساله لتحصيل الرسوم مع إشعار قسم الحسابات. بعد الإرسال لن تتمكن من تعديل الطلب. هل أنت متأكد؟
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setConfirmOpen(false)} disabled={requesting}>إلغاء</Button>
            <Button variant="contained" color="success" startIcon={<SendIcon />} disabled={requesting} onClick={handleSubmit}>
              {requesting ? 'جارٍ الإرسال…' : 'تأكيد الإرسال'}
            </Button>
          </DialogActions>
        </Dialog>
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title="حذف المسودة"
          message={`هل أنت متأكد من حذف المسودة «${deleteTarget?.manifest_number ?? ''}»؟ لا يمكن التراجع عن هذا الإجراء.`}
          confirmLabel="حذف"
          loading={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
    </>
  );
};