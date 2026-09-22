import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import type { Sector } from '../api/endpoints/public';
import { regionForSector, SUDAN_MAP_POINTS } from '../utils/sudanMapPoints';

interface PublicSudanMapProps {
  sectors: Sector[];
  selectedId?: string | null;
}

interface TooltipState {
  x: number;
  y: number;
  sector: Sector;
}

const PublicSudanMap = ({ sectors, selectedId }: PublicSudanMapProps) => {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const navigate = useNavigate();

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <Box
        component="img"
        src="/maps/sudan-map.svg"
        alt="خريطة السودان — القطاعات الصحية ومنافذ الحجر الصحي"
        sx={{ width: '100%', height: 'auto', display: 'block', userSelect: 'none' }}
      />

      {sectors.map((sector) => {
        const key = regionForSector(sector.region, sector.name_ar);
        const point = SUDAN_MAP_POINTS[key];
        const active = tooltip?.sector.id === sector.id || selectedId === sector.id;
        return (
          <Box
            key={sector.id}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.parentElement?.getBoundingClientRect();
              if (rect) setTooltip({ x: point.x, y: point.y, sector });
            }}
            onMouseLeave={() => setTooltip(null)}
            onClick={() => navigate(`/sectors/${sector.id}`)}
            sx={{
              position: 'absolute',
              left: `${point.x}%`,
              top: `${point.y}%`,
              transform: 'translate(-50%, -50%)',
              cursor: 'pointer',
              zIndex: active ? 4 : 2,
            }}
          >
            <Box sx={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
              {active && (
                <Box
                  className="pulse-ring"
                  sx={{
                    position: 'absolute',
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    bgcolor: `${sector.color || '#0e8a72'}33`,
                  }}
                />
              )}
              <Box
                sx={{
                  width: 13,
                  height: 13,
                  borderRadius: '50%',
                  bgcolor: sector.color || '#0e8a72',
                  border: '2px solid rgba(255,255,255,0.9)',
                  boxShadow: `0 0 0 ${active ? 5 : 3}px ${sector.color || '#0e8a72'}40, 0 2px 6px rgba(16,40,34,0.35)`,
                  transition: 'box-shadow 150ms ease, transform 150ms ease',
                  transform: active ? 'scale(1.25)' : undefined,
                }}
              />
              <Typography
                sx={{
                  position: 'absolute',
                  top: '135%',
                  whiteSpace: 'nowrap',
                  fontSize: 11,
                  fontWeight: active ? 800 : 700,
                  color: active ? (sector.color || '#0e8a72') : '#425a53',
                  textShadow: '0 1px 2px rgba(255,255,255,0.9)',
                  bgcolor: 'rgba(255,255,255,0.75)',
                  borderRadius: 1,
                  px: 0.6,
                  py: 0.1,
                }}
              >
                {sector.name_ar}
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
            width: 200,
            pointerEvents: 'none',
            left: `${Math.max(6, Math.min(78, tooltip.x - 6))}%`,
            top: `${Math.max(4, Math.min(76, tooltip.y - 16))}%`,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            {tooltip.sector.name_ar}
          </Typography>
          <Stack spacing={0.4}>
            <MiniRow label="المنافذ" value={tooltip.sector.ports_count} />
            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, mt: 0.5 }}>
              اضغط للاطلاع على التفاصيل
            </Typography>
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

const MiniRow = ({ label, value }: { label: string; value: number | string }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="caption" sx={{ fontWeight: 700 }}>{value}</Typography>
  </Stack>
);

export default PublicSudanMap;
