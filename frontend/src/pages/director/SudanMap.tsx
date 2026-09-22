import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import CloseIcon from '@mui/icons-material/Close';
import type { ReactNode } from 'react';
import type { SectorOps } from '../../types/commandCenter';
import { statusMeta } from '../../types/commandCenter';

interface SudanMapProps {
  sectors: SectorOps[];
  height?: number;
}

interface TooltipState {
  x: number;
  y: number;
  sector: SectorOps;
}

const SudanMap = ({ sectors, height = 520 }: SudanMapProps) => {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [selected, setSelected] = useState<SectorOps | null>(null);

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <Box
        component="img"
        src="/maps/sudan-map.svg"
        alt="خريطة السودان — قطاعات الحجر الصحي"
        sx={{ width: '100%', height: 'auto', display: 'block', userSelect: 'none' }}
      />

      {sectors.map((sector) => {
        const meta = statusMeta[sector.status];
        const active = tooltip?.sector.id === sector.id;
        const critical = sector.status === 'CRITICAL';
        const watch = sector.status === 'WATCH';
        return (
          <Box
            key={sector.id}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.parentElement?.getBoundingClientRect();
              if (rect) {
                setTooltip({ x: sector.mapX, y: sector.mapY, sector });
              }
            }}
            onMouseLeave={() => setTooltip(null)}
            onClick={() => setSelected(sector)}
            sx={{
              position: 'absolute',
              left: `${sector.mapX}%`,
              top: `${sector.mapY}%`,
              transform: 'translate(-50%, -50%)',
              cursor: 'pointer',
              zIndex: active ? 4 : 2,
            }}
          >
            <Box sx={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
              {(critical || active) && (
                <Box
                  className={critical ? 'pulse-ring' : undefined}
                  sx={{
                    position: 'absolute',
                    width: critical ? 34 : 28,
                    height: critical ? 34 : 28,
                    borderRadius: '50%',
                    bgcolor: `${meta.color}33`,
                    animation: critical ? undefined : 'none',
                  }}
                />
              )}
              <Box
                sx={{
                  width: watch ? 12 : critical ? 14 : 10,
                  height: watch ? 12 : critical ? 14 : 10,
                  borderRadius: '50%',
                  bgcolor: meta.color,
                  border: critical ? '2px solid #fff' : '2px solid rgba(255,255,255,0.85)',
                  boxShadow: `0 0 0 ${active ? 5 : 3}px ${meta.soft}, 0 2px 6px rgba(16,40,34,0.35)`,
                  transition: 'box-shadow 150ms ease, transform 150ms ease',
                  transform: active ? 'scale(1.25)' : undefined,
                }}
              />
              <Typography
                sx={{
                  position: 'absolute',
                  top: '135%',
                  whiteSpace: 'nowrap',
                  fontSize: 10.5,
                  fontWeight: active ? 800 : 700,
                  color: active ? meta.color : '#425a53',
                  textShadow: '0 1px 2px rgba(255,255,255,0.9)',
                  bgcolor: 'rgba(255,255,255,0.7)',
                  borderRadius: 1,
                  px: 0.6,
                  py: 0.1,
                }}
              >
                {sector.name}
              </Typography>
            </Box>
          </Box>
        );
      })}

      {tooltip && (
        <Paper
          elevation={8}
          className="fade-in"
          onMouseLeave={() => setTooltip(null)}
          sx={{
            position: 'absolute',
            zIndex: 6,
            p: 1.5,
            borderRadius: 3,
            bgcolor: 'rgba(255,255,255,0.97)',
            boxShadow: '0 10px 40px rgba(16,40,34,0.18)',
            border: '1px solid rgba(16,40,34,0.1)',
            width: 220,
            pointerEvents: 'none',
            left: `${Math.max(6, Math.min(78, tooltip.x - 8))}%`,
            top: `${Math.max(4, Math.min(76, tooltip.y - 18))}%`,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            {tooltip.sector.name}
            <Box component="span" sx={{ color: statusMeta[tooltip.sector.status].color, mr: 0.5 }}>
              {' '}· {statusMeta[tooltip.sector.status].label}
            </Box>
          </Typography>
          <Stack spacing={0.4}>
            <MiniRow label="المنافذ" value={tooltip.sector.ports} />
            <MiniRow label="المحطات" value={tooltip.sector.stations} />
            <MiniRow label="الفحوصات" value={tooltip.sector.screenings.toLocaleString('en-US')} />
            <MiniRow label="مشتبه بها" value={tooltip.sector.suspected} />
            <MiniRow label="محوّلة" value={tooltip.sector.referred} />
            <ProgressLine label="الجاهزية" value={tooltip.sector.readiness} color={statusMeta[tooltip.sector.status].color} />
          </Stack>
        </Paper>
      )}

      <SectorDialog sector={selected} onClose={() => setSelected(null)} />
    </Box>
  );
};

const SectorDialog = ({ sector, onClose }: { sector: SectorOps | null; onClose: () => void }) => {
  if (!sector) return null;
  const meta = statusMeta[sector.status];
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: meta.color }} />
          <Typography sx={{ fontWeight: 700 }}>{sector.name}</Typography>
        </Stack>
        <IconButton aria-label="إغلاق" onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">حالة التشغيل</Typography>
            <Chip label={meta.label} size="small" sx={{ bgcolor: meta.soft, color: meta.color, fontWeight: 700 }} />
          </Stack>
          <MiniRow label="الإقليم" value={sector.region} />
          <MiniRow label="المنافذ" value={sector.ports} />
          <MiniRow label="المحطات" value={sector.stations} />
          <MiniRow label="المسافرون" value={sector.passengers.toLocaleString('en-US')} />
          <MiniRow label="الفحوصات" value={sector.screenings.toLocaleString('en-US')} />
          <MiniRow label="حالات مشتبه بها" value={sector.suspected} />
          <MiniRow label="حالات محوّلة" value={sector.referred} />
          <MiniRow label="حالات الحجر" value={sector.quarantine} />
          <MiniRow label="الجاهزية" value={`${sector.readiness}%`} />
          <MiniRow label="التغير" value={sector.trend} />
          <ProgressLine label="مؤشر الجاهزية" value={sector.readiness} color={meta.color} />
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

const MiniRow = ({ label, value }: { label: string; value: ReactNode | number | string }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="caption" sx={{ fontWeight: 700 }}>{value}</Typography>
  </Stack>
);

const ProgressLine = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <Box sx={{ mt: 0.5 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="caption" sx={{ fontWeight: 700 }}>{value}%</Typography>
    </Stack>
    <Box sx={{ mt: 0.5, height: 5, borderRadius: 4, bgcolor: 'rgba(16,40,34,0.08)', overflow: 'hidden' }}>
      <Box sx={{ height: '100%', width: `${value}%`, borderRadius: 4, bgcolor: color }} />
    </Box>
  </Box>
);

export default SudanMap;