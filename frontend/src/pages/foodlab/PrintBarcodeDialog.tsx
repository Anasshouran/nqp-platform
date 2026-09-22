import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Divider from '@mui/material/Divider';
import PrintIcon from '@mui/icons-material/Print';
import JsBarcode from 'jsbarcode';
import { QRCodeSVG } from 'qrcode.react';
import { AppButton } from '../../components/uikit';
import type { FoodSample } from '../../types/food';

type LabelFormat = 'barcode' | 'qr';

const BarcodeSvg = ({ value }: { value: string }) => {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current && value) {
      try {
        JsBarcode(ref.current, value, { format: 'CODE128', width: 2, height: 72, margin: 8, displayValue: false });
      } catch {
        /* قيمة غير صالحة للباركود */
      }
    }
  }, [value]);
  return <svg ref={ref} style={{ width: '100%', height: 'auto', maxHeight: 110 }} />;
};

interface Props {
  open: boolean;
  sample: FoodSample | null;
  onClose: () => void;
}

const PrintBarcodeDialog = ({ open, sample, onClose }: Props) => {
  const [format, setFormat] = useState<LabelFormat>('barcode');
  if (!sample) return null;
  const value = sample.sample_barcode || sample.sample_number;
  const classification =
    sample.classification === 'REFERENCE'
      ? { code: 'REFERENCE', label: 'مرجعية' }
      : { code: 'ANALYSIS', label: 'للتحليل' };
  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-label, .print-label * { visibility: visible !important; }
          .print-label { position: absolute !important; right: 0; top: 0; width: 100%; display: block !important; }
        }
      `}</style>
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>ملصق العينة — Barcode / QR</DialogTitle>
        <DialogContent>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <AppButton size="small" variant={format === 'barcode' ? 'primary' : 'secondary'} onClick={() => setFormat('barcode')}>Barcode (CODE128)</AppButton>
            <AppButton size="small" variant={format === 'qr' ? 'primary' : 'secondary'} onClick={() => setFormat('qr')}>QR Code</AppButton>
          </Stack>
          <Box className="print-label" sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1.5, p: 2 }}>
            <Box sx={{ textAlign: 'center', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: 1 }}>FCLIS</Typography>
              <Typography variant="caption" color="text.secondary">Food Control Laboratory</Typography>
            </Box>
            <Divider sx={{ mb: 1 }} />
            <Stack spacing={0.35} sx={{ fontSize: 13 }}>
              <Typography variant="body2"><b>Sample:</b> {sample.sample_number}</Typography>
              <Typography variant="body2"><b>Request:</b> {sample.analysis_request_number || '—'}</Typography>
              <Typography variant="body2"><b>Type:</b> {classification.code}</Typography>
              <Typography variant="body2"><b>Product:</b> {sample.sample_type}</Typography>
              <Typography variant="body2"><b>Received:</b> {sample.received_at ? sample.received_at.slice(0, 10) : new Date().toLocaleDateString()}</Typography>
              {sample.source_name ? (
                <Typography variant="body2"><b>Source:</b> {sample.source_name}</Typography>
              ) : null}
            </Stack>
            <Box sx={{ mt: 1, textAlign: 'center' }}>
              {format === 'barcode' ? (
                <BarcodeSvg value={value} />
              ) : (
                <QRCodeSVG value={value} size={150} level="M" includeMargin />
              )}
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 2, display: 'block', textAlign: 'center' }}>{value}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
              {classification.label} • {sample.brand || ''} {sample.origin_country ? `• ${sample.origin_country}` : ''}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <AppButton variant="ghost" onClick={onClose}>إغلاق</AppButton>
          <AppButton startIcon={<PrintIcon />} onClick={() => window.print()}>طباعة</AppButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PrintBarcodeDialog;