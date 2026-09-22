import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CaptureIcon from '@mui/icons-material/PhotoCamera';
import CloseIcon from '@mui/icons-material/Close';
import { createWorker } from 'tesseract.js';

export interface MrzResult {
  passportNumber: string;
  dateOfBirth: string;
  expiryDate: string;
  nationality: string;
  fullName?: string;
  givenNames?: string;
  surname?: string;
  sex?: string;
  mrzLine1?: string;
  mrzLine2?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onResult: (data: MrzResult) => void;
}

const MRZ_RE = /^[A-Z0-9<]{44}$/;

const parseMrz = (text: string): MrzResult => {
  const clean = text
    .replace(/[^A-Z0-9<\s]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
  const lines = clean.split(' ').filter((l) => l.length >= 30 && MRZ_RE.test(l.replace(/ /g, '')));
  const mrzLines = lines.filter((l) => l.length === 44).slice(0, 2);
  if (mrzLines.length !== 2) {
    // Try to recombine split lines
    const joined = clean.replace(/ /g, '');
    const recombined: string[] = [];
    let idx = 0;
    while (idx + 44 <= joined.length && recombined.length < 2) {
      recombined.push(joined.slice(idx, idx + 44));
      idx += 44;
    }
    if (recombined.length !== 2) {
      throw new Error('تعذر قراءة بيانات جواز السفر (MRZ). أعد المحاولة أو أدخل البيانات يدوياً.');
    }
    return parseMrz(recombined.join(' '));
  }
  const [line1, line2] = mrzLines;

  let passportNumber = '';
  let nationality = '';
  let dateOfBirth = '';
  let sex = '';
  let expiryDate = '';

  if (line1[0] === 'P') {
    // TD1 / TD3 passport: line1 = type+issuer+names, line2 = passport+checksum+nat+DOB+sex+expiry+...
    passportNumber = line2.slice(0, 9).replace(/</g, '');
    nationality = line2.slice(10, 13).replace(/</g, '');
    dateOfBirth = line2.slice(13, 19).replace(/</g, '');
    sex = line2.slice(20, 21).replace(/</g, '');
    expiryDate = line2.slice(21, 27).replace(/</g, '');
  } else {
    // TD1: line1 = passport+..., line2 = DOB+sex+expiry+nat
    passportNumber = line1.slice(0, 9).replace(/</g, '');
    nationality = line2.slice(15, 18).replace(/</g, '');
    dateOfBirth = line2.slice(0, 6).replace(/</g, '');
    sex = line2.slice(7, 8).replace(/</g, '');
    expiryDate = line2.slice(8, 14).replace(/</g, '');
  }

  const formatDate = (yymmdd: string) => {
    if (yymmdd.length !== 6) return '';
    const yy = parseInt(yymmdd.slice(0, 2), 10);
    const mm = yymmdd.slice(2, 4);
    const dd = yymmdd.slice(4, 6);
    const year = yy > 70 ? `19${yy}` : `20${yy}`;
    return `${year}-${mm}-${dd}`;
  };

  return {
    passportNumber,
    nationality,
    dateOfBirth: formatDate(dateOfBirth),
    expiryDate: formatDate(expiryDate),
    sex,
    mrzLine1: line1,
    mrzLine2: line2,
  };
};

const PassportScanner = ({ open, onClose, onResult }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      setCaptured(null);
      setCameraError(null);
      return;
    }
    let cancelled = false;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setCameraError('تعذر الوصول إلى الكاميرا. تأكد من السماح بالوصول إليها.');
      }
    };
    start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open]);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    setCaptured(canvas.toDataURL('image/jpeg', 0.8));
  };

  const runOcr = async () => {
    if (!captured) return;
    setScanning(true);
    setCameraError(null);
    try {
      const worker = await createWorker('eng', 1, {
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@v5/dist/worker.min.js',
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@v5',
        langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      });
      const image = await fetch(captured).then((r) => r.blob());
      const { data } = await worker.recognize(image);
      await worker.terminate();
      const result = parseMrz(data.text || '');
      onResult(result);
      stopCamera();
      onClose();
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : 'تعذر قراءة بيانات الجواز.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CameraAltIcon color="primary" />
          <Typography sx={{ fontWeight: 700 }}>مسح جواز السفر</Typography>
        </Stack>
        <Button onClick={onClose} startIcon={<CloseIcon />} size="small">
          إغلاق
        </Button>
      </DialogTitle>
      <DialogContent>
        {captured ? (
          <Box sx={{ textAlign: 'center' }}>
            <Box component="img" src={captured} alt="صورة الجواز" sx={{ width: '100%', borderRadius: 2, mb: 2 }} />
            <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" gap={1}>
              <Button variant="contained" onClick={runOcr} disabled={scanning} startIcon={scanning ? <CircularProgress size={18} color="inherit" /> : <CameraAltIcon />}>
                {scanning ? 'جارٍ القراءة...' : 'قراءة البيانات'}
              </Button>
              <Button variant="outlined" onClick={() => setCaptured(null)}>
                إعادة الالتقاط
              </Button>
            </Stack>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center' }}>
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ width: '100%', borderRadius: 8, background: '#000', maxHeight: 320 }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {cameraError && <Alert severity="error" sx={{ mt: 1.5, textAlign: 'right' }}>{cameraError}</Alert>}
            {!cameraError && (
              <Button variant="contained" color="secondary" onClick={capture} startIcon={<CaptureIcon />} sx={{ mt: 2 }}>
                التقاط الصورة
              </Button>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
              وجّه الجواز نحو الكاميرا مع إضاءة جيدة بحيث تظهر سطرا MRZ في الأسفل.
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PassportScanner;