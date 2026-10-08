import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { downloadCarrierDocument, getCarrierDocuments, getFlight, getFlightTimeline } from '../../api/endpoints/carriers';
import type { CarrierDocument, Flight, FlightTimelineEvent } from '../../types/carrier';

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ar-SD', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
};

const formatFileSize = (size?: number) => {
  if (!size) return '—';
  return `${(size / 1024).toFixed(1)} KB`;
};

const CarrierFlightDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [flight, setFlight] = useState<Flight | null>(null);
  const [timeline, setTimeline] = useState<FlightTimelineEvent[]>([]);
  const [documents, setDocuments] = useState<CarrierDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([getFlight(id), getFlightTimeline(id), getCarrierDocuments({ flight: id })])
      .then(([flightResponse, timelineResponse, documentsResponse]) => {
        if (!active) return;
        setFlight(flightResponse.data.data);
        setTimeline(timelineResponse.data.data.events);
        setDocuments(documentsResponse.data.data.results);
      })
      .catch(() => {
        if (active) setError('تعذر تحميل تفاصيل الرحلة');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'grid', minHeight: 240, placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  if (!flight) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="info">الرحلة غير موجودة</Alert>
      </Paper>
    );
  }

  const declarationEvents = timeline.filter((event) => event.source_type === 'health_declaration_log');
  const latestDeclarationStatus = declarationEvents.length > 0 ? declarationEvents[declarationEvents.length - 1].status : undefined;

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 800 }}>
        تفاصيل الرحلة {flight.flight_number}
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={1.5}>
          <Typography><strong>الشركة:</strong> {flight.carrier_name ?? '—'}</Typography>
          <Typography><strong>الطائرة:</strong> {flight.aircraft_type ?? '—'}</Typography>
          <Typography><strong>الرحلة:</strong> {flight.flight_number}</Typography>
          <Typography><strong>من:</strong> {flight.origin_country_name ?? flight.origin_code ?? '—'}</Typography>
          <Typography><strong>إلى:</strong> {flight.destination_port_name ?? flight.destination_port ?? '—'}</Typography>
          <Typography><strong>المغادرة المجدولة:</strong> {formatDateTime(flight.scheduled_departure)}</Typography>
          <Typography><strong>الوصول المجدول:</strong> {formatDateTime(flight.scheduled_arrival)}</Typography>
          <Box><strong>الحالة الحالية:</strong> <Chip label={flight.status} size="small" /></Box>
          <Typography><strong>حالة الإقرار الصحي:</strong> {latestDeclarationStatus ?? '—'}</Typography>
        </Stack>
      </Paper>

      <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 800 }}>
        المستندات
      </Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        {documents.length === 0 ? (
          <Alert severity="info" variant="outlined">لا توجد مستندات مرتبطة بهذه الرحلة</Alert>
        ) : (
          <List disablePadding>
            {documents.map((doc) => (
              <ListItem key={doc.id} disableGutters sx={{ py: 1.25, justifyContent: 'space-between' }}>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{doc.title || doc.original_filename || 'مستند'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {doc.document_type_label ?? doc.document_type} · {formatDateTime(doc.created_at)} · {formatFileSize(doc.file_size)}
                  </Typography>
                </Box>
                <Button variant="outlined" size="small" onClick={() => downloadCarrierDocument(doc.id)}>
                  تنزيل
                </Button>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 800 }}>
        سجل أحداث الرحلة
      </Typography>
      <Paper sx={{ p: 2 }}>
        {timeline.length === 0 ? (
          <Alert severity="info">لا توجد أحداث مسجلة لهذه الرحلة</Alert>
        ) : (
          <List disablePadding>
            {timeline.map((event, index) => (
              <ListItem key={`${event.source_type}-${event.source_id}-${index}`} disableGutters sx={{ py: 1.25 }}>
                <Box sx={{ width: '100%' }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Chip size="small" label={event.category === 'operational' ? 'تشغيلي' : 'صحي / إداري'} />
                    <Typography sx={{ fontWeight: 700 }}>{event.title}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {formatDateTime(event.timestamp)}
                    {event.actor_name ? ` · ${event.actor_name}` : ''}
                  </Typography>
                  {(event.from_status || event.to_status) && (
                    <Typography variant="body2" color="text.secondary">
                      {event.from_status ?? '—'} → {event.to_status ?? event.status ?? '—'}
                    </Typography>
                  )}
                  {event.details && Object.keys(event.details).length > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      {Object.entries(event.details).map(([key, value]) => `${key}: ${String(value)}`).join(' · ')}
                    </Typography>
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default CarrierFlightDetailPage;