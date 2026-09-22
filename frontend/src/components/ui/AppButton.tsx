import { forwardRef, ReactNode } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import type { ButtonProps as MuiButtonProps, CircularProgressProps } from '@mui/material';

export type AppButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface AppButtonProps extends Omit<MuiButtonProps, 'variant' | 'color'> {
  variant?: AppButtonVariant;
  loading?: boolean;
  loadingText?: ReactNode;
  progressSize?: CircularProgressProps['size'];
  children?: ReactNode;
}

const variantStyles: Record<AppButtonVariant, { variant: MuiButtonProps['variant']; color: MuiButtonProps['color'] }> = {
  primary: { variant: 'contained', color: 'primary' },
  secondary: { variant: 'outlined', color: 'primary' },
  danger: { variant: 'contained', color: 'error' },
  ghost: { variant: 'text', color: 'primary' },
};

const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(
  (
    {
      variant = 'primary',
      loading = false,
      loadingText,
      progressSize = 18,
      disabled,
      children,
      startIcon,
      ...props
    },
    ref
  ) => {
    const styles = variantStyles[variant];
    return (
      <Button
        ref={ref}
        {...styles}
        {...props}
        disabled={disabled || loading}
        startIcon={loading ? undefined : startIcon}
        sx={{
          minWidth: 110,
          '&.Mui-disabled': { pointerEvents: 'auto' },
          ...props.sx,
        }}
      >
        {loading ? (
          <>
            <CircularProgress size={progressSize} color="inherit" sx={{ mr: 1 }} />
            {loadingText ?? children}
          </>
        ) : (
          children
        )}
      </Button>
    );
  }
);

AppButton.displayName = 'AppButton';

export default AppButton;
