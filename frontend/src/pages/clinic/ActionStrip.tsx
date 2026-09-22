import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export interface ActionStripItem {
  id: string;
  label: string;
  hint: string;
  count: number;
  icon: ReactNode;
  tone: string;
}

interface ActionStripProps {
  items: ActionStripItem[];
  onSelect: (id: string) => void;
}

export const ActionStrip = ({ items, onSelect }: ActionStripProps) => (
  <Stack spacing={1.5}>
    {items.map((it) => {
      const active = it.count > 0;
      return (
        <Box
          key={it.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(it.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(it.id);
            }
          }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.75,
            borderRadius: 3,
            cursor: 'pointer',
            border: '1px solid rgba(16,40,34,0.08)',
            bgcolor: active ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.45)',
            opacity: active ? 1 : 0.62,
            outline: 'none',
            transition: 'border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease, opacity 150ms ease',
            '&:hover, &:focus-visible': {
              borderColor: 'primary.main',
              boxShadow: '0 8px 22px -12px rgba(16,40,34,0.3)',
              transform: 'translateY(-1px)',
            },
          }}
        >
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2.5,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              bgcolor: `${it.tone}14`,
              color: it.tone,
            }}
          >
            {it.icon}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>{it.label}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {it.hint}
            </Typography>
          </Box>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: 24,
              lineHeight: 1,
              color: active ? it.tone : 'text.disabled',
            }}
          >
            {it.count}
          </Typography>
        </Box>
      );
    })}
  </Stack>
);

export default ActionStrip;