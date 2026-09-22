import { Component, type ErrorInfo, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import CachedRoundedIcon from '@mui/icons-material/CachedRounded';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <Box
          role="alert"
          sx={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            px: 3,
            py: 8,
            textAlign: 'center',
            background:
              'radial-gradient(900px 480px at 50% -10%, rgba(12,127,106,0.10), transparent 60%), #eef5f2',
          }}
        >
          <Box sx={{ maxWidth: 440 }}>
            <Box
              aria-hidden
              sx={{
                width: 84,
                height: 84,
                mx: 'auto',
                mb: 2.5,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                color: 'error.main',
                bgcolor: 'rgba(211,47,47,0.08)',
                border: '1px solid rgba(211,47,47,0.18)',
              }}
            >
              <ErrorOutlineRoundedIcon sx={{ fontSize: 44 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              حدث خطأ غير متوقع
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, mx: 'auto', maxWidth: 360 }}>
              تعذّر عرض الصفحة بسبب مشكلة مؤقتة. أعد المحاولة أو حدّث الصفحة.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<CachedRoundedIcon />}
              onClick={this.handleReload}
              sx={{ px: 4 }}
            >
              إعادة المحاولة
            </Button>
          </Box>
        </Box>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;