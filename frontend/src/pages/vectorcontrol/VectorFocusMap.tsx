import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getVectorMap } from '../../api/endpoints/vectorControl';
import type { VectorMapFocus } from '../../types/vectorControl';
import { vectorSeverity, vectorFocusStatus } from '../../utils/status';
import { StatusChip } from '../../components/ui';

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#d32f2f',
  HIGH: '#f57c00',
  MEDIUM: '#fbc02d',
  LOW: '#2e7d32',
};

const DEFAULT_COLOR = '#0288d1';

function markerIcon(severity: string): L.DivIcon {
  return L.divIcon({
    className: 'vector-marker',
    html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${SEVERITY_COLORS[severity] ?? DEFAULT_COLOR};border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.4)"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -20],
  });
}

function Recenter({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, bounds]);
  return null;
}

export interface VectorFocusMapProps {
  height?: number;
  interactive?: boolean;
}

export const VectorFocusMap = ({ height = 480, interactive = true }: VectorFocusMapProps) => {
  const [foci, setFoci] = useState<VectorMapFocus[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getVectorMap({ severity: severityFilter || undefined })
      .then((res) => {
        if (alive) setFoci(res.data.data);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [severityFilter]);

  const withCoords = useMemo(() => foci.filter((f) => f.latitude != null && f.longitude != null), [foci]);
  const bounds = useMemo<L.LatLngBounds | null>(() => {
    if (withCoords.length === 0) return null;
    const latlngs = withCoords.map((f) => L.latLng(Number(f.latitude), Number(f.longitude)));
    return L.latLngBounds(latlngs);
  }, [withCoords]);

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} alignItems="center">
        <Typography variant="body2" sx={{ fontWeight: 700 }}>الفلترة:</Typography>
        {Object.entries(vectorSeverity).map(([k, m]) => (
          <Chip
            key={k}
            size="small"
            label={m.label}
            color={severityFilter === k ? 'primary' : 'default'}
            variant={severityFilter === k ? 'filled' : 'outlined'}
            onClick={() => setSeverityFilter((prev) => (prev === k ? '' : k))}
          />
        ))}
        {loading && <CircularProgress size={18} sx={{ ml: 1 }} />}
      </Stack>

      <Box sx={{ height, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider', position: 'relative', zIndex: 1 }}>
        {withCoords.length === 0 && !loading ? (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">
              {foci.length === 0 ? 'لا توجد بؤر مطابقة (أضف إحداثيات GPS للبؤر لتظهر على الخريطة)' : 'البؤر المسجلة لا تحوي إحداثيات GPS بعد'}
            </Typography>
          </Box>
        ) : (
          <MapContainer
            center={[15.5, 29.0]}
            zoom={6}
            scrollWheelZoom={interactive}
            style={{ height: '100%', width: '100%' }}
            attributionControl
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {withCoords.map((f) => (
              <Marker key={f.id} position={[Number(f.latitude), Number(f.longitude)]} icon={markerIcon(f.severity)}>
                <Tooltip direction="top" offset={[0, -16]}>
                  {f.focus_number} — {f.entry_point_name}
                </Tooltip>
                <Popup>
                  <Box sx={{ minWidth: 200 }}>
                    <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{f.focus_number}</Typography>
                    <Typography variant="body2">{f.entry_point_name}{f.site_name ? ` — ${f.site_name}` : ''}</Typography>
                    {f.vector_name && <Typography variant="caption" display="block">{f.vector_name}</Typography>}
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <StatusChip label={f.severity_display} tone={vectorSeverity[f.severity]?.tone ?? 'neutral'} />
                      <StatusChip label={f.status_display} tone={vectorFocusStatus[f.status]?.tone ?? 'neutral'} />
                    </Stack>
                    {f.sector_name && <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'text.secondary' }}>{f.sector_name}</Typography>}
                  </Box>
                </Popup>
              </Marker>
            ))}
            {bounds && <Recenter bounds={bounds} />}
          </MapContainer>
        )}
      </Box>
    </Box>
  );
};

export default VectorFocusMap;