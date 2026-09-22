import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme, type Theme } from '@mui/material/styles';

const resolveTone = (theme: Theme, tone?: string): string => {
  if (!tone || tone === 'primary.main') return theme.palette.primary.main;
  if (tone.startsWith('#')) return tone;
  const [group, shade] = tone.split('.');
  const entry = (theme.palette as unknown as Record<string, unknown>)[group];
  if (shade && entry && typeof entry === 'object') {
    const v = (entry as Record<string, unknown>)[shade];
    if (typeof v === 'string') return v;
  }
  if (typeof entry === 'string') return entry;
  return tone;
};

const avatarTones = [
  { bg: '#d9f2ea', fg: '#0a6b58' },
  { bg: '#e8f0fc', fg: '#1d4f9e' },
  { bg: '#fbf1e2', fg: '#7d4a00' },
  { bg: '#fdeaea', fg: '#9c2626' },
  { bg: '#ece7fb', fg: '#4a3383' },
  { bg: '#e3f4ec', fg: '#145a3d' },
];

const hashCode = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const initialsOf = (name?: string): string =>
  (name || '؟')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('');

export const PersonAvatar = ({
  name,
  size = 42,
  square = false,
}: {
  name?: string;
  size?: number;
  square?: boolean;
}) => {
  const tone = avatarTones[hashCode(name || '?') % avatarTones.length];
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: square ? 2.4 : '50%',
        display: 'grid',
        placeItems: 'center',
        bgcolor: tone.bg,
        color: tone.fg,
        fontWeight: 700,
        fontSize: size * 0.34,
        fontFamily: '"IBM Plex Sans Arabic", sans-serif',
        border: '1px solid rgba(16,40,34,0.08)',
        boxShadow: '0 6px 14px -8px rgba(16,40,34,0.35)',
        userSelect: 'none',
      }}
    >
      {initialsOf(name)}
    </Box>
  );
};

export const GlassPanel = ({
  children,
  sx,
  accent,
}: {
  children: ReactNode;
  sx?: Record<string, unknown>;
  accent?: string;
}) => (
  <Card
    elevation={0}
    sx={{
      height: '100%',
      borderRadius: 4,
      overflow: 'hidden',
      position: 'relative',
      border: '1px solid rgba(16,40,34,0.07)',
      bgcolor: 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(18px) saturate(1.35)',
      boxShadow: '0 1px 2px rgba(16,40,34,0.03), 0 12px 34px rgba(16,40,34,0.07)',
      ...(accent
        ? {
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              insetInline: 28,
              height: 3,
              borderRadius: '0 0 99px 99px',
              background: `linear-gradient(90deg, ${accent}, transparent)`,
              opacity: 0.6,
            },
          }
        : {}),
      ...(sx || {}),
    }}
  >
    {children}
  </Card>
);

export const SectionHeader = ({
  icon,
  title,
  count,
  tone = 'primary.main',
  action,
}: {
  icon: ReactNode;
  title: string;
  count?: number | string;
  tone?: string;
  action?: ReactNode;
}) => {
  const theme = useTheme();
  const color = resolveTone(theme, tone);
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={1.5}
      sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
        <Box
          sx={{
            width: 42,
            height: 42,
            minWidth: 42,
            borderRadius: 2.6,
            display: 'grid',
            placeItems: 'center',
            background: `linear-gradient(135deg, ${color}, ${alpha(color, 0.78)})`,
            color: '#fff',
            boxShadow: `0 8px 16px -8px ${alpha(color, 0.6)}`,
          }}
        >
          {icon}
        </Box>
        <Typography variant="h5" component="h3" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {title}
        </Typography>
        {count !== undefined && (
          <Chip
            size="small"
            label={count}
            sx={{
              fontWeight: 700,
              height: 26,
              minWidth: 30,
              bgcolor: `${color}1a`,
              color,
              borderRadius: '999px',
            }}
          />
        )}
      </Stack>
      {action}
    </Stack>
  );
};

export const ScreenReaderText = ({ children }: { children: ReactNode }) => (
  <Box
    component="p"
    sx={{
      position: 'absolute',
      width: 1,
      height: 1,
      padding: 0,
      margin: -1,
      overflow: 'hidden',
      clip: 'rect(0 0 0 0)',
      clipPath: 'inset(50%)',
      whiteSpace: 'nowrap',
      border: 0,
    }}
  >
    {children}
  </Box>
);

export const MetaLine = ({ label, value, icon }: { label: string; value?: string; icon?: ReactNode }) => (
  <Box>
    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
      {icon}
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
    </Box>
    <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.5 }}>{value || '—'}</Typography>
  </Box>
);

export interface QueueRailItem {
  id: string;
  label: string;
  icon: ReactNode;
  count?: number;
  tone?: string;
  hint?: string;
}

export const QueueRail = ({
  items,
  active,
  onNavigate,
  label = 'أقسام اللوحة',
}: {
  items: QueueRailItem[];
  active: string;
  onNavigate: (id: string) => void;
  label?: string;
}) => (
  <Stack spacing={1} role="navigation" aria-label={label}>
    <Typography
      variant="overline"
      sx={{ color: 'text.disabled', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', display: 'block', mb: 0.25 }}
    >
      {label}
    </Typography>
    {items.map((it) => {
      const current = active === it.id;
      const tone = it.tone ?? '#0c7f6a';
      const showCount = it.count !== undefined && it.count > 0;
      return (
        <Box
          key={it.id}
          role="button"
          tabIndex={0}
          aria-pressed={current || undefined}
          onClick={() => onNavigate(it.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigate(it.id);
            }
          }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            p: 1.1,
            borderRadius: 2.5,
            cursor: 'pointer',
            outline: 'none',
            bgcolor: current ? `${tone}12` : 'rgba(255,255,255,0.7)',
            border: `1px solid ${current ? `${tone}55` : 'rgba(16,40,34,0.08)'}`,
            transition: 'border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease',
            '&:hover, &:focus-visible': {
              borderColor: tone,
              boxShadow: `0 6px 18px -10px ${alpha(tone, 0.4)}`,
              transform: 'translateY(-1px)',
            },
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              bgcolor: current ? `${tone}1f` : 'rgba(16,40,34,0.05)',
              color: current ? tone : 'text.secondary',
            }}
          >
            {it.icon}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 12.5, color: current ? tone : 'inherit' }} noWrap>
              {it.label}
            </Typography>
            {it.hint && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: 10.5, fontWeight: 600 }}>
                {it.hint}
              </Typography>
            )}
          </Box>
          {showCount && (
            <Box
              sx={{
                minWidth: 26,
                height: 22,
                px: 0.75,
                borderRadius: '999px',
                display: 'grid',
                placeItems: 'center',
                bgcolor: current ? tone : 'rgba(16,40,34,0.08)',
                color: current ? '#fff' : 'text.secondary',
                fontWeight: 800,
                fontSize: 12,
              }}
            >
              {it.count}
            </Box>
          )}
        </Box>
      );
    })}
  </Stack>
);

export interface NotifItem {
  id: string;
  label: string;
  detail?: string;
  count: number;
  tone: string;
  icon: ReactNode;
  onClick: () => void;
}

export const NotificationPanel = ({
  items,
  title = 'التنبيهات والمتابعة',
  emptyText = 'لا توجد عناصر بحاجة إلى إجراء حالياً',
}: {
  items: NotifItem[];
  title?: string;
  emptyText?: string;
}) => (
  <GlassPanel accent="linear-gradient(90deg, #c2410c, transparent)">
    <Box sx={{ p: 2.25 }}>
      <Typography
        variant="overline"
        sx={{ display: 'block', color: 'text.disabled', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', mb: 1.25 }}
      >
        {title}
      </Typography>
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1.5, textAlign: 'center' }}>
          {emptyText}
        </Typography>
      ) : (
        <Stack spacing={1.1}>
          {items.map((it) => (
            <Box
              key={it.id}
              role="button"
              tabIndex={0}
              onClick={it.onClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  it.onClick();
                }
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                p: 1.25,
                borderRadius: 2.5,
                cursor: 'pointer',
                outline: 'none',
                border: `1px solid ${it.tone}2b`,
                bgcolor: `${it.tone}0d`,
                transition: 'border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease',
                '&:hover, &:focus-visible': {
                  borderColor: it.tone,
                  boxShadow: `0 8px 20px -12px ${alpha(it.tone, 0.45)}`,
                  transform: 'translateY(-1px)',
                },
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2.25,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  bgcolor: `${it.tone}1c`,
                  color: it.tone,
                }}
              >
                {it.icon}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 12.5 }}>{it.label}</Typography>
                {it.detail && (
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: 10.5, fontWeight: 600 }}>
                    {it.detail}
                  </Typography>
                )}
              </Box>
              <Box
                sx={{
                  minWidth: 28,
                  height: 24,
                  px: 0.75,
                  borderRadius: '999px',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: it.tone,
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 12.5,
                }}
              >
                {it.count}
              </Box>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  </GlassPanel>
);

export const PassportChip = ({ number }: { number?: string }) => (
  <Chip
    size="small"
    label={number || '—'}
    sx={{
      fontFamily: 'ui-monospace, Menlo, monospace',
      fontWeight: 600,
      fontSize: '0.72rem',
      letterSpacing: '0.04em',
      height: 24,
      bgcolor: 'rgba(16,40,34,0.06)',
      borderRadius: '8px',
      '& .MuiChip-label': { px: 1 },
    }}
  />
);