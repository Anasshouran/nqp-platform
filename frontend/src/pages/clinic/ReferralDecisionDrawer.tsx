import { useState } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EventIcon from '@mui/icons-material/Event';
import NotesIcon from '@mui/icons-material/Notes';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import FlagIcon from '@mui/icons-material/Flag';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import UndoIcon from '@mui/icons-material/Undo';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import DoubleArrowIcon from '@mui/icons-material/DoubleArrow';
import type { ClinicReferral, ClinicVisit } from '../../types/clinic';
import { referralSource } from '../../utils/status';
import { referralStatus } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';
import { PassportChip, PersonAvatar } from './ui';

const FEVER_THRESHOLD = 38;

const sourceLabel = (source?: string): string | undefined => referralSource[source ?? '']?.label;

const temperatureLabel = (temp?: number | null): string => (temp == null ? 'لا قياس' : `${temp}°م`);

const MetaItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) => (
  <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ py: 0.75 }}>
    <Box sx={{ color: 'text.disabled', display: 'flex', pt: 0.15 }}>{icon}</Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.5 }}>{value || '—'}</Typography>
    </Box>
  </Stack>
);

export interface ReferralDecisionDrawerProps {
  open: boolean;
  referral: ClinicReferral | null;
  submitting: boolean;
  acceptedVisit: ClinicVisit | null;
  hasNext: boolean;
  onClose: () => void;
  onAccept: (referral: ClinicReferral) => void;
  onReject: (referral: ClinicReferral, reason: string) => void;
  onHold: (referral: ClinicReferral) => void;
  onRelease: (referral: ClinicReferral) => void;
  onOpenVisit: (visit: ClinicVisit) => void;
  onProcessNext: () => void;
}

export const ReferralDecisionDrawer = ({
  open,
  referral,
  submitting,
  acceptedVisit,
  hasNext,
  onClose,
  onAccept,
  onReject,
  onHold,
  onRelease,
  onOpenVisit,
  onProcessNext,
}: ReferralDecisionDrawerProps) => {
  const [reason, setReason] = useState('');

  const reset = () => {
    setReason('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const symptoms = referral?.observed_symptoms?.length ? referral.observed_symptoms : [];
  const showFever = (referral?.body_temperature ?? 0) >= FEVER_THRESHOLD;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 430 }, maxWidth: '100%', bgcolor: '#f6faf8' } }}
    >
      {acceptedVisit ? (
        <Stack sx={{ height: '100%', justifyContent: 'center', alignItems: 'center', p: 4, textAlign: 'center' }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              bgcolor: 'success.light',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 40 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>تم قبول الإحالة</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
            فُتحت زيارة عيادة للمسافر «{acceptedVisit.traveler_name}»
          </Typography>
          <Stack spacing={1.5} sx={{ width: '100%' }}>
            <Button
              variant="contained"
              startIcon={<AssignmentTurnedInIcon />}
              onClick={() => onOpenVisit(acceptedVisit)}
              sx={{ fontWeight: 700 }}
            >
              فتح زيارة «{acceptedVisit.traveler_name}»
            </Button>
            <Button
              variant="outlined"
              startIcon={<DoubleArrowIcon />}
              disabled={!hasNext}
              onClick={onProcessNext}
              sx={{ fontWeight: 700 }}
            >
              {hasNext ? 'معالجة الإحالة التالية' : 'لا توجد إحالة تالية'}
            </Button>
            <Button variant="text" onClick={handleClose} sx={{ fontWeight: 700 }}>
              البقاء في القائمة
            </Button>
          </Stack>
        </Stack>
      ) : referral ? (
        <Stack sx={{ height: '100%' }}>
          <Box sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.8)', borderBottom: '1px solid rgba(16,40,34,0.07)' }}>
            <Typography variant="overline" component="p" sx={{ fontWeight: 700, letterSpacing: '0.12em', color: 'text.secondary', mb: 1 }}>
              قرار الإحالة
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <PersonAvatar name={referral.traveler_name} size={56} square />
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{referral.traveler_name}</Typography>
                  {showFever && (
                    <Chip size="small" label="حمّى" color="error" sx={{ fontWeight: 700, height: 22 }} />
                  )}
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <PassportChip number={referral.passport_number} />
                  {referral.queue_no != null && (
                    <Chip size="small" label={`دور ${referral.queue_no}`} sx={{ height: 24, fontWeight: 700 }} />
                  )}
                  {referral.status && (
                    <Chip
                      size="small"
                      label={referralStatus[referral.status]?.label ?? referral.status}
                      color={referral.status === 'PRE_ACCEPT' ? 'primary' : 'default'}
                      sx={{ height: 24, fontWeight: 700 }}
                    />
                  )}
                </Stack>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>بيانات المسافر</Typography>
                <Stack spacing={0}>
                  <MetaItem
                    icon={<FlagIcon fontSize="small" />}
                    label="الجنسية"
                    value={referral.nationality_name || '—'}
                  />
                  <MetaItem
                    icon={<ThermostatIcon fontSize="small" />}
                    label="درجة الحرارة عند الفحص"
                    value={temperatureLabel(referral.body_temperature)}
                  />
                  <MetaItem
                    icon={<LocationOnIcon fontSize="small" />}
                    label="المنفذ"
                    value={referral.port_name || '—'}
                  />
                  <MetaItem
                    icon={<EventIcon fontSize="small" />}
                    label="وقت الإحالة"
                    value={formatDateTime(referral.created_at)}
                  />
                  <MetaItem
                    icon={<MonitorHeartIcon fontSize="small" />}
                    label="المصدر"
                    value={sourceLabel(referral.source) || referral.source || '—'}
                  />
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>نتائج الفحص المبدئي</Typography>
                {symptoms.length > 0 ? (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                    {symptoms.map((s) => (
                      <Chip
                        key={s}
                        size="small"
                        label={s}
                        color={showFever ? 'error' : 'warning'}
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">لا أعراض مسجلة.</Typography>
                )}
                {referral.officer_notes ? (
                  <Box
                    sx={{
                      mt: 1.5,
                      p: 1.5,
                      borderRadius: 2.5,
                      bgcolor: 'rgba(255,255,255,0.7)',
                      border: '1px solid rgba(16,40,34,0.07)',
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <NotesIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                        ملاحظات موظف الفحص
                      </Typography>
                    </Stack>
                    <Typography variant="body2">{referral.officer_notes}</Typography>
                  </Box>
                ) : null}
                {referral.notes ? (
                  <Box
                    sx={{
                      mt: 1.5,
                      p: 1.5,
                      borderRadius: 2.5,
                      bgcolor: 'rgba(255,255,255,0.7)',
                      border: '1px solid rgba(16,40,34,0.07)',
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                      ملاحظات الإحالة
                    </Typography>
                    <Typography variant="body2">{referral.notes}</Typography>
                  </Box>
                ) : null}
              </Box>
            </Stack>
          </Box>

          <Box sx={{ p: 3, borderTop: '1px solid rgba(16,40,34,0.07)', bgcolor: 'rgba(255,255,255,0.8)' }}>
            <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
              {referral.status === 'PRE_ACCEPT' ? (
                <Button
                  size="small"
                  startIcon={<UndoIcon />}
                  disabled={submitting}
                  onClick={() => onRelease(referral)}
                  sx={{ fontWeight: 700 }}
                >
                  إرجاع إلى قائمة الانتظار
                </Button>
              ) : (
                <Button
                  size="small"
                  startIcon={<PendingActionsIcon />}
                  disabled={submitting}
                  onClick={() => onHold(referral)}
                  sx={{ fontWeight: 700 }}
                >
                  تأجيل للمراجعة
                </Button>
              )}
            </Stack>
            <TextField
              label="سبب الرفض (اختياري)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              size="small"
              disabled={submitting}
              sx={{ mb: 2 }}
            />
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="contained"
                color="error"
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <CancelIcon />}
                disabled={submitting}
                onClick={() => onReject(referral, reason.trim())}
                sx={{ flex: 1, fontWeight: 700 }}
              >
                رفض الإحالة
              </Button>
              <Button
                variant="contained"
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
                disabled={submitting}
                onClick={() => onAccept(referral)}
                sx={{ flex: 1, fontWeight: 700 }}
              >
                قبول وفتح زيارة
              </Button>
            </Stack>
          </Box>
        </Stack>
      ) : null}
    </Drawer>
  );
};


export default ReferralDecisionDrawer;