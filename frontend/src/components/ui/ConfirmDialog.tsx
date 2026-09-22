import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  tone?: 'error' | 'success' | 'info';
  children?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}

const toneMeta = {
  error: { color: 'error.main', bg: 'error.light', icon: <WarningAmberIcon fontSize="small" />, btn: 'error' as const },
  success: { color: 'success.main', bg: 'success.light', icon: <CheckCircleIcon fontSize="small" />, btn: 'success' as const },
  info: { color: 'info.main', bg: 'info.light', icon: <InfoIcon fontSize="small" />, btn: 'primary' as const },
};

const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  loading = false,
  tone = 'error',
  children,
  onConfirm,
  onClose,
}: ConfirmDialogProps) => {
  const isMobile = useMediaQuery('(max-width: 600px)');
  const meta = toneMeta[tone];

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.75, fontWeight: 700 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 3,
            display: 'grid',
            placeItems: 'center',
            color: meta.color,
            bgcolor: meta.bg,
            flexShrink: 0,
          }}
        >
          {meta.icon}
        </Box>
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText component="div">{message}</DialogContentText>
        {children}
      </DialogContent>
      <DialogActions>
        <Stack direction="row" spacing={1} width="100%" justifyContent="flex-end" flexWrap="wrap">
          <Button onClick={onClose} color="inherit" disabled={loading}>
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} color={meta.btn} variant="contained" disableElevation disabled={loading}>
            {loading ? <CircularProgress size={20} color="inherit" /> : confirmLabel}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;