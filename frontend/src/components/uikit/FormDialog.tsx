import type { ReactNode } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { DialogProps } from '@mui/material/Dialog';

export interface FormDialogProps {
  open: boolean;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  maxWidth?: DialogProps['maxWidth'];
  fullWidth?: boolean;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  submitDisabled?: boolean;
  children: ReactNode;
}

const FormDialog = ({
  open,
  title,
  subtitle,
  icon,
  maxWidth = 'sm',
  fullWidth = true,
  onClose,
  onSubmit,
  submitLabel = 'حفظ',
  cancelLabel = 'إلغاء',
  loading = false,
  submitDisabled = false,
  children,
}: FormDialogProps) => {
  const isMobile = useMediaQuery('(max-width: 600px)');

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      fullScreen={isMobile}
      scroll="paper"
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.75, pb: 1.5 }}>
        {icon && (
          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: 3,
              display: 'grid',
              placeItems: 'center',
              color: 'primary.main',
              bgcolor: 'primary.light',
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.35 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </DialogTitle>
      <DialogContent
        dividers={false}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2.25,
          px: { xs: 3, sm: 3.5 },
          pb: 3,
        }}
      >
        {children}
      </DialogContent>
      <DialogActions>
        <Stack direction="row" spacing={1} width="100%" justifyContent="flex-end" flexWrap="wrap">
          <Button onClick={onClose} color="inherit" disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            onClick={onSubmit}
            variant="contained"
            disableElevation
            disabled={loading || submitDisabled}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {loading ? 'جارٍ الحفظ...' : submitLabel}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default FormDialog;