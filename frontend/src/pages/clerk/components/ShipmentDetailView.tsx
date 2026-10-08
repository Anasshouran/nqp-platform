// Slide-over shipment detail with its document rows, event timeline and fee breakdown.
// Extracted from ClerkDashboardPage without behavioural change.
import { useCallback, useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RefreshIcon from '@mui/icons-material/Refresh';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { getShipmentTimeline }  from '../../../api/endpoints/food';
import type { FoodShipment, FoodShipmentEvent, ShipmentAttachment } from '../../../types/food';
import { StatusChip } from '../../../components/uikit';
import { DOC_STATUS_META, STAGE_META, counterpartyOf, statusLabel, statusTone } from '../constants';

export const ShipmentDetailView = ({
  shipment,
  onClose,
  onEdit,
}: {
  shipment: FoodShipment | null;
  onClose: () => void;
  onEdit: (r: FoodShipment) => void;
}) => {
  const canEditShipment = Boolean(shipment && shipment.status === 'DRAFT');

  return (
    <Dialog open={Boolean(shipment)} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: shipment?.shipment_type === 'IMPORT' ? 'primary.main' : 'secondary.main' }}>
            {shipment?.shipment_type === 'IMPORT' ? <MoveToInboxIcon fontSize="small" /> : <SendIcon fontSize="small" />}
          </Box>
          <Box>
            <Typography>طلب {shipment?.shipment_type === 'IMPORT' ? 'وارد' : 'صادر'}</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{shipment?.manifest_number}</Typography>
          </Box>
        </Stack>
        <IconButton aria-label="إغلاق" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {shipment && (
          <>
            {/* الحالة */}
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
              <StatusChip label={statusLabel(shipment.status)} tone={statusTone(shipment.status)} />
              {shipment.submitted_at && (
                <Typography variant="body2" color="text.secondary">
                  تم الإرسال: {shipment.submitted_at.slice(0, 16).replace('T', ' ')}
                </Typography>
              )}
              {shipment.fees_paid && <Chip size="small" color="success" variant="outlined" label="الرسوم مسددة" />}
            </Stack>

            {/* البيانات الأساسية */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2, bgcolor: 'rgba(255,255,255,0.6)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>البيانات الأساسية</Typography>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">المنفذ: <b>{shipment.port_name || shipment.port || '—'}</b></Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">{shipment.shipment_type === 'IMPORT' ? 'المورد' : 'المستورد'}: <b>{counterpartyOf(shipment)}</b></Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">بلد المنشأ: <b>{shipment.origin_country || '—'}</b></Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">تاريخ الوصول: <b>{(shipment.arrival_date || '—').slice(0, 10)}</b></Typography>
                </Grid>
                {shipment.vessel_name && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">الباخرة/الوسيلة: <b>{shipment.vessel_name}</b></Typography>
                  </Grid>
                )}
                {shipment.bill_of_lading && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">رقم البوليصة: <b>{shipment.bill_of_lading}</b></Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>

            {/* الأصناف */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2, bgcolor: 'rgba(255,255,255,0.6)' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>الأصناف ({shipment.items.length})</Typography>
                <Chip size="small" variant="outlined" color={shipment.samples_required ? 'warning' : 'success'} label={`${shipment.samples_required} عينة مطلوبة`} />
              </Stack>
              <Stack spacing={1}>
                {shipment.items.map((item, index) => (
                  <Stack key={item.id || index} direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1, borderRadius: 2, border: '1px solid rgba(16,40,34,0.07)' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{index + 1}. {item.product_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {[item.brand, item.origin, item.package_type, `عدد ${item.package_count}`, `${Number(item.weight_kg || 0).toLocaleString('ar-EG')} كجم`].filter((v) => v && v !== '—').join(' · ')}
                      </Typography>
                    </Box>
                    <Badge badgeContent={item.package_count} color="info">
                      <Chip label={item.package_type} size="small" variant="outlined" />
                    </Badge>
                  </Stack>
                ))}
              </Stack>
            </Paper>

            {/* المستندات */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2, bgcolor: 'rgba(255,255,255,0.6)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>المستندات ({shipment.attachments.length})</Typography>
              <Stack spacing={0.5}>
                {shipment.attachments.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">لا توجد مرفقات.</Typography>
                ) : (
                  shipment.attachments.map((a) => <DocRow key={a.id} doc={a} />)
                )}
                {!shipment.attachments.some((a) => a.doc_type === 'INVOICE') && <DocRow name="الفاتورة التجارية" required />}
                {!shipment.attachments.some((a) => a.doc_type === 'ORIGIN_CERT') && <DocRow name="شهادة المنشأ" required />}
              </Stack>
            </Paper>

            {/* التسلسل الزمني للطلب */}
            <RequestTimeline shipmentId={shipment.id} />

            {/* الرسوم */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2, bgcolor: 'rgba(255,255,255,0.6)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>الرسوم (تلقائي)</Typography>
              {shipment.fee_preview.exempt ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CheckCircleIcon fontSize="small" color="success" />
                  <Typography variant="body2">معفاة من الرسوم حسب نوع الرسالة</Typography>
                </Stack>
              ) : (
                <Stack spacing={0.5}>
                  {shipment.fee_preview.lines.map((line, i) => (
                    <FeeRow key={i} label={line.name} value={`${Number(line.fee).toLocaleString('ar-EG')} جنيه`} />
                  ))}
                  <Divider sx={{ my: 0.5 }} />
                  <FeeRow label="الإجمالي" value={`${Number(shipment.fee_preview.total).toLocaleString('ar-EG')} جنيه`} bold />
                </Stack>
              )}
            </Paper>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>إغلاق</Button>
        {shipment && canEditShipment && (
          <Button variant="contained" startIcon={<EditIcon />} onClick={() => { onClose(); onEdit(shipment); }}>
            تعديل
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export const DocRow = ({ doc, name, required }: { doc?: ShipmentAttachment; name?: string; required?: boolean }) => {
  const label = name || doc?.doc_type_label || doc?.doc_type || '';
  const status = doc?.status;
  const meta = status ? (DOC_STATUS_META[status] ?? { label: status, color: 'default' as const }) : null;
  const uploaded = Boolean(doc);
  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1.5}
        sx={{
        p: 1.5,
        borderRadius: 2.5,
        border: '1px solid rgba(16,40,34,0.08)',
        bgcolor: uploaded ? '#fff' : 'rgba(255,255,255,0.5)',
        transition: 'all .15s ease',
        '&:hover': { borderColor: meta?.color === 'error' ? 'error.main' : 'primary.main' },
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            color: uploaded ? (meta?.color === 'error' ? 'error.main' : 'success.main') : required ? 'warning.main' : 'text.disabled',
            bgcolor: 'rgba(16,40,34,0.04)',
          }}
        >
          <AttachFileIcon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{label}</Typography>
          {required && !uploaded && (
            <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700 }}>مستند إلزامي ناقص</Typography>
          )}
        </Box>
      </Stack>
      {meta ? (
        <Chip label={meta.label} size="small" color={meta.color} variant={uploaded ? 'filled' : 'outlined'} sx={{ fontWeight: 700, flexShrink: 0 }} />
      ) : (
        <Chip
          size="small"
          variant="outlined"
          color={uploaded ? 'success' : required ? 'warning' : 'default'}
          label={uploaded ? 'مرفوع' : required ? 'مطلوب' : 'غير مرفوع'}
          sx={{ fontWeight: 700, flexShrink: 0 }}
        />
      )}
    </Stack>
    {doc?.rejected_reason && (
      <Typography
        variant="caption"
        color="error"
        sx={{ display: 'block', mt: 0.75, pr: 2, bgcolor: 'rgba(198,58,58,0.05)', borderRadius: 1.5, p: 1, border: '1px solid rgba(198,58,58,0.15)' }}
      >
        سبب الرفض: {doc.rejected_reason}
      </Typography>
    )}
    </>
  );
};

export const RequestTimeline = ({ shipmentId }: { shipmentId: string }) => {
  const [events, setEvents] = useState<FoodShipmentEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTimeline = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getShipmentTimeline(shipmentId);
      const data = res.data?.data ?? res.data ?? [];
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setEvents([]);
      setError('تعذّر تحميل التسلسل الزمني. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    if (shipmentId) loadTimeline();
  }, [shipmentId, loadTimeline]);

  const sorted = [...events].sort(
    (a, b) => new Date(a.occurred_at || a.id).getTime() - new Date(b.occurred_at || b.id).getTime(),
  );

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2, bgcolor: 'rgba(255,255,255,0.6)' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5, pb: 1, borderBottom: '1px solid rgba(16,40,34,0.07)' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 32, height: 32, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'rgba(27,122,110,0.12)', color: 'primary.main' }}>
            <ReceiptLongIcon fontSize="small" />
          </Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>التسلسل الزمني للطلب</Typography>
        </Stack>
        <Tooltip title="تحديث">
          <Box component="span" sx={{ display: 'inline-flex' }}>
            <IconButton size="small" onClick={loadTimeline} disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Box>
        </Tooltip>
      </Stack>
      {sorted.length === 0 ? (
        <Typography variant="body2" color={error ? 'error' : 'text.secondary'} sx={{ py: 1 }}>
          {loading ? 'جارٍ التحميل…' : (error ?? 'لا توجد أحداث بعد.')}
        </Typography>
      ) : (
        <Stack spacing={0} sx={{ mt: 0.5 }}>
          {sorted.map((e, i) => {
            const meta = STAGE_META[e.stage] ?? { label: e.stage_label || e.stage, color: 'default' as const };
            const isLast = i === sorted.length - 1;
            return (
              <Stack key={e.id} direction="row" spacing={2}>
                <Stack alignItems="center" sx={{ minWidth: 18 }}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      mt: 0.7,
                      border: '3px solid',
                      borderColor: `${meta.color}.main`,
                      bgcolor: isLast ? `${meta.color}.main` : '#fff',
                      boxShadow: `0 0 0 3px color-mix(in srgb, ${meta.color}.main 15%, transparent)`,
                      flexShrink: 0,
                    }}
                  />
                  {!isLast && (
                    <Box sx={{ width: 2, flexGrow: 1, bgcolor: 'divider', borderRadius: 2, my: 0.5 }} />
                  )}
                </Stack>
                <Box
                  sx={{
                    pb: isLast ? 0 : 2,
                    minWidth: 0,
                    flexGrow: 1,
                    ...(i % 2 === 1
                      ? {
                          p: 1.25,
                          borderRadius: 2.5,
                          mb: isLast ? 0 : 1,
                          bgcolor: 'rgba(16,40,34,0.03)',
                          border: '1px solid rgba(16,40,34,0.06)',
                        }
                      : {}),
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label={meta.label} size="small" color={meta.color} sx={{ fontWeight: 700 }} />
                    <Typography variant="caption" color="text.secondary">
                      {e.occurred_at ? new Date(e.occurred_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                    </Typography>
                  </Stack>
                  {e.message && (
                    <Typography variant="body2" sx={{ mt: 0.5, color: 'text.primary' }}>{e.message}</Typography>
                  )}
                  {e.actor_name && (
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">بواسطة:</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>{e.actor_name}</Typography>
                    </Stack>
                  )}
                </Box>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
};

export const FeeRow = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Typography variant="body2" sx={{ fontWeight: bold ? 800 : 600 }}>{label}</Typography>
    <Typography variant={bold ? 'h6' : 'body2'} sx={{ fontWeight: bold ? 800 : 600, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
  </Stack>
);
