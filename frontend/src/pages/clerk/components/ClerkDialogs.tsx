// The submit confirmation and draft-deletion confirmation dialogs.
// Extracted from ClerkDashboardPage without behavioural change.
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { deleteTarget, deleting, handleDelete, setDeleteTarget } = actions;
  const { confirmOpen, handleSubmit, requesting, setConfirmOpen } = wizard;

  return (
    <>

        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>{t('clerk.components.dialogs.confirmTitle')}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              {t('clerk.components.dialogs.confirmDescription')}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setConfirmOpen(false)} disabled={requesting}>{t('clerk.components.dialogs.cancel')}</Button>
            <Button variant="contained" color="success" startIcon={<SendIcon />} disabled={requesting} onClick={handleSubmit}>
              {requesting ? t('clerk.components.dialogs.sending') : t('clerk.components.dialogs.confirmSend')}
            </Button>
          </DialogActions>
        </Dialog>
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title={t('clerk.components.dialogs.deleteTitle')}
          message={t('clerk.components.dialogs.deleteMessage', { manifestNumber: deleteTarget?.manifest_number ?? '' })}
          confirmLabel={t('clerk.components.dialogs.deleteConfirm')}
          loading={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
    </>
  );
};