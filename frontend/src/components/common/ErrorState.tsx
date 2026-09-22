import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CachedRoundedIcon from '@mui/icons-material/CachedRounded';

interface ErrorStateProps {
  message?: string;
  compact?: boolean;
  onRetry?: () => void;
}

const ErrorState = ({
  message = 'تعذّر تحميل البيانات الآن',
  compact = false,
  onRetry,
}: ErrorStateProps) => (
  <Box
    role="alert"
    sx={{
      display: 'flex',
      flexDirection: compact ? 'row' : 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: compact ? 1.5 : 1.25,
      textAlign: 'center',
      px: 3,
      py: compact ? 3 : 6,
      borderRadius: 3,
      border: '1.5px solid rgba(211,47,47,0.25)',
      bgcolor: 'rgba(211,47,47,0.04)',
    }}
  >
    <ErrorOutlineIcon aria-hidden sx={{ color: 'error.main', fontSize: compact ? 32 : 44 }} />
    <Box>
      <Typography variant={compact ? 'subtitle2' : 'h6'} sx={{ fontWeight: 700, mb: 0.5 }}>
        {message}
      </Typography>
      {!compact && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mx: 'auto' }}>
          قد تكون هناك مشكلة في الاتصال بالخادم. حاول مرة أخرى بعد قليل.
        </Typography>
      )}
      {onRetry && (
        <Button
          variant="outlined"
          color="primary"
          size={compact ? 'small' : 'medium'}
          startIcon={<CachedRoundedIcon />}
          onClick={onRetry}
          sx={{ mt: compact ? 0 : 1.5 }}
        >
          إعادة المحاولة
        </Button>
      )}
    </Box>
  </Box>
);

export default ErrorState;