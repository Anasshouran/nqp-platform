import type { ReactElement } from 'react';
import Chip from '@mui/material/Chip';
import type { ChipProps } from '@mui/material/Chip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoIcon from '@mui/icons-material/Info';
import CircleIcon from '@mui/icons-material/Circle';
import RemoveIcon from '@mui/icons-material/Remove';
import { alpha, useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'primary' | 'neutral';

export interface StatusChipProps {
  label: string;
  tone?: StatusTone;
  size?: ChipProps['size'];
  variant?: ChipProps['variant'];
  /** Whether to show a leading status icon (non-color cue). Defaults to true for non-neutral tones. */
  showIcon?: boolean;
}

const toneToken = (tone: StatusTone) => {
  switch (tone) {
    case 'success':
      return { fg: 'success.main', bg: 'success.light' };
    case 'warning':
      return { fg: 'warning.main', bg: 'warning.light' };
    case 'error':
      return { fg: 'error.main', bg: 'error.light' };
    case 'info':
      return { fg: 'info.main', bg: 'info.light' };
    case 'primary':
      return { fg: 'primary.main', bg: 'primary.light' };
    case 'neutral':
      return { fg: 'text.secondary', bg: 'grey.100' };
  }
};

const toneIcon: Record<StatusTone, ReactElement> = {
  success: <CheckCircleIcon />,
  warning: <WarningAmberIcon />,
  error: <CancelIcon />,
  info: <InfoIcon />,
  primary: <CircleIcon />,
  neutral: <RemoveIcon />,
};

const resolveToken = (theme: Theme, token: string): string => {
  if (!token.includes('.')) return token;
  const [group, shade] = token.split('.');
  const entry = theme.palette[group as keyof typeof theme.palette];
  if (entry && typeof entry === 'object' && shade) {
    const v = (entry as unknown as Record<string, unknown>)[shade];
    if (typeof v === 'string') return v;
  }
  return theme.palette.primary.main;
};

const StatusChip = ({ label, tone = 'neutral', size = 'small', variant, showIcon }: StatusChipProps) => {
  const theme = useTheme();
  const filled = variant !== 'outlined';
  const { fg, bg } = toneToken(tone);
  const withIcon = showIcon ?? (filled && tone !== 'neutral');

  const fgColor = resolveToken(theme, fg);
  const bgColor = resolveToken(theme, bg);

  return (
    <Chip
      label={label}
      size={size}
      variant={filled ? 'filled' : 'outlined'}
      icon={withIcon ? toneIcon[tone] : undefined}
      sx={{
        fontWeight: 700,
        borderRadius: '999px',
        bgcolor: filled ? bgColor : 'transparent',
        color: fgColor,
        border: `1px solid ${alpha(fgColor, filled ? 0.38 : 0.55)}`,
        '& .MuiChip-icon': { color: 'inherit' },
      }}
    />
  );
};

export default StatusChip;