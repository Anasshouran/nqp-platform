import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import VerifiedIcon from '@mui/icons-material/Verified';
import CancelIcon from '@mui/icons-material/Cancel';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import GavelIcon from '@mui/icons-material/Gavel';
import BlockIcon from '@mui/icons-material/Block';
import AddIcon from '@mui/icons-material/Add';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import LocateHistoryIcon from '@mui/icons-material/History';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsInputComponentIcon from '@mui/icons-material/SettingsInputComponent';
import { SectionCard, StatusChip } from '../../../components/uikit';
import { notifySuccess } from '../../../utils/toast';
import { DECISIONS, STATION_USERS, ACTIVITY_LOG, PERMISSIONS } from '../data';

/* ============ دعم القرار ============ */

export const DecisionSupport = () => (
  <Box id="decision" sx={{ scrollMarginTop: 96 }}>
    <SectionCard
      title="💡 دعم اتخاذ القرار"
      subtitle="ما هو التأثير؟ وما الإجراء الإداري المناسب؟ — النظام يوصي والمدير يقرر"
    >
      <Grid container spacing={2}>
        {DECISIONS.map((d) => (
          <Grid item xs={12} md={4} key={d.topic}>
            <Box
              sx={{
                p: 1.75,
                borderRadius: 3,
                height: '100%',
                border: '1px solid rgba(47,109,208,0.15)',
                bgcolor: 'rgba(47,109,208,0.035)',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.75,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={{ width: 32, height: 32, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#2f6dd0', bgcolor: 'rgba(47,109,208,0.1)' }}>
                  <LightbulbIcon sx={{ fontSize: 18 }} />
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{d.topic}</Typography>
              </Stack>
              <Typography variant="body2" sx={{ fontSize: 13 }}>{d.finding}</Typography>
              <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700 }}>{d.cause}</Typography>
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 700 }}>{d.recommendation}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
      <Box sx={{ mt: 2, p: 1.5, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.6)', border: '1px dashed rgba(47,109,208,0.25)' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          ⚠️ التنبيه: تقدّم هذه المنصة <strong>توصيات إدارية استرشادية فقط</strong>، والقرار الإداري النهائي يظل من اختصاص مدير إدارة رقابة الأغذية وحده.
        </Typography>
      </Box>
    </SectionCard>
  </Box>
);

/* ============ الوارد / الصادر ============ */

export const TradeSummary = () => (
  <Box id="trade" sx={{ scrollMarginTop: 96 }}>
    <SectionCard title="الوارد والصادر" subtitle="ملخص حركة الشحنات الغذائية هذا الأسبوع">
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Box sx={{ p: 2, borderRadius: 3, border: '1px solid rgba(47,109,208,0.15)', bgcolor: 'rgba(47,109,208,0.04)', height: '100%' }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <SettingsInputComponentIcon sx={{ color: '#2f6dd0', transform: 'rotate(180deg)' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2f6dd0' }}>الوارد (استيراد)</Typography>
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>144</Typography>
            <Typography variant="caption" color="text.secondary">شحنة · بزيادة 9% عن الأسبوع السابق</Typography>
            <TradeBreakdown good={[['حبوب', '48'], ['ألبان', '27'], ['زيوت', '23'], ['أخرى', '46']]} />
          </Box>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Box sx={{ p: 2, borderRadius: 3, border: '1px solid rgba(29,122,84,0.15)', bgcolor: 'rgba(29,122,84,0.04)', height: '100%' }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <SettingsInputComponentIcon sx={{ color: '#1d7a54' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1d7a54' }}>الصادر (تصدير)</Typography>
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>61</Typography>
            <Typography variant="caption" color="text.secondary">شحنة · بزيادة 6% عن الأسبوع السابق</Typography>
            <TradeBreakdown good={[['سمسم', '18'], ['صمغ عربي', '14'], ['لحوم', '12'], ['أخرى', '17']]} />
          </Box>
        </Grid>
      </Grid>
    </SectionCard>
  </Box>
);

const TradeBreakdown = ({ good }: { good: Array<[string, string]> }) => (
  <Stack spacing={0.75} sx={{ mt: 1.5 }}>
    {good.map(([label, count]) => (
      <Stack key={label} direction="row" justifyContent="space-between">
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>{count}</Typography>
      </Stack>
    ))}
  </Stack>
);

/* ============ مستخدمو المحطات ============ */

export const StationUsers = () => (
  <Box id="station-users" sx={{ scrollMarginTop: 96 }}>
    <SectionCard
      title="مستخدمو المحطات"
      subtitle="إدارة مستخدمي المحطات فقط — رؤساء محطات، مفتشون، كتّاب إدخال"
      action={
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => notifySuccess('فتح إضافة مستخدم محطة')}>
          إضافة مستخدم
        </Button>
      }
    >
      <TableContainer>
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12.5 } }}>
              <TableCell>المستخدم</TableCell>
              <TableCell>الدور</TableCell>
              <TableCell>المحطة</TableCell>
              <TableCell align="center">آخر نشاط</TableCell>
              <TableCell align="center">الحالة</TableCell>
              <TableCell align="center">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {STATION_USERS.map((u) => (
              <TableRow key={u.name} hover>
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Avatar sx={{ width: 32, height: 32, fontSize: 14, bgcolor: 'primary.main' }}>{u.name.charAt(0)}</Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{u.name}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell>{u.station}</TableCell>
                <TableCell align="center">{u.lastActive}</TableCell>
                <TableCell align="center">
                  <StatusChip tone={u.status === 'نشط' ? 'success' : 'neutral'} label={u.status} />
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={0.5} justifyContent="center">
                    <Tooltip title="تعديل الصلاحيات">
                      <IconButton aria-label="تعديل الصلاحيات" size="small" onClick={() => notifySuccess(`تعديل صلاحيات ${u.name}`)}><GavelIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="إعادة تعيين كلمة المرور">
                      <IconButton aria-label="إعادة تعيين كلمة المرور" size="small" onClick={() => notifySuccess(`إعادة تعيين كلمة مرور ${u.name}`)}><RestartAltIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="عرض سجل النشاط">
                      <IconButton aria-label="السجل" size="small" onClick={() => notifySuccess(`سجل نشاط ${u.name}`)}><LocateHistoryIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title={u.status === 'نشط' ? 'إيقاف الحساب' : 'تفعيل الحساب'}>
                      <IconButton aria-label="إيقاف" size="small" color={u.status === 'نشط' ? 'error' : 'success'} onClick={() => notifySuccess(`تم ${u.status === 'نشط' ? 'إيقاف' : 'تفعيل'} حساب ${u.name}`)}>
                        {u.status === 'نشط' ? <BlockIcon fontSize="small" /> : <VerifiedIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </SectionCard>
  </Box>
);

/* ============ مصفوفة الصلاحيات ============ */

export const PermissionsMatrix = () => (
  <Box id="permissions" sx={{ scrollMarginTop: 96 }}>
    <SectionCard title="مصفوفة الصلاحيات" subtitle="التحكم الصارم بالوصول — المراقبة والتحليل دون تدخل تشغيلي">
      <Grid container spacing={2}>
        <Grid item xs={12} lg={6}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'success.main', mb: 1 }}>✔ المتاح للمدير</Typography>
          <Stack spacing={0.75}>
            {PERMISSIONS.allowed.map((p) => (
              <Stack
                key={p}
                direction="row"
                alignItems="center"
                spacing={1.25}
                sx={{ p: 1, borderRadius: 2.5, border: '1px solid rgba(29,122,84,0.16)', bgcolor: 'rgba(29,122,84,0.04)' }}
              >
                <VerifiedIcon sx={{ fontSize: 18, color: 'success.main' }} />
                <Typography variant="body2" sx={{ fontSize: 13.5, fontWeight: 600 }}>{p}</Typography>
              </Stack>
            ))}
          </Stack>
        </Grid>
        <Grid item xs={12} lg={6}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'error.main', mb: 1 }}>✖ غير متاح (مستبعد تشغيليًا)</Typography>
          <Stack spacing={0.75}>
            {PERMISSIONS.denied.map((p) => (
              <Stack
                key={p}
                direction="row"
                alignItems="center"
                spacing={1.25}
                sx={{ p: 1, borderRadius: 2.5, border: '1px solid rgba(198,58,58,0.16)', bgcolor: 'rgba(198,58,58,0.035)' }}
              >
                <CancelIcon sx={{ fontSize: 18, color: 'error.main' }} />
                <Typography variant="body2" sx={{ fontSize: 13.5, fontWeight: 600 }}>{p}</Typography>
              </Stack>
            ))}
          </Stack>
        </Grid>
      </Grid>
    </SectionCard>
  </Box>
);

/* ============ سجل الأنشطة ============ */

export const ActivityLog = () => (
  <Box id="activity" sx={{ scrollMarginTop: 96 }}>
    <SectionCard title="📋 سجل الأنشطة" subtitle="آخر الإجراءات الإدارية المسجلة في النظام">
      <Stack spacing={0.75}>
        {ACTIVITY_LOG.map((a) => (
          <Stack
            key={`${a.time}-${a.action}`}
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ p: 1.1, borderRadius: 2.5, border: '1px solid rgba(16,40,34,0.06)', bgcolor: 'rgba(255,255,255,0.5)' }}
          >
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                color: a.tone === 'success' ? 'success.main' : a.tone === 'info' ? 'info.main' : a.tone === 'warning' ? 'warning.main' : 'primary.main',
                bgcolor: 'rgba(16,40,34,0.04)',
                flexShrink: 0,
              }}
            >
              {a.tone === 'warning' ? <BlockIcon sx={{ fontSize: 16 }} /> : a.tone === 'info' ? <LoginIcon sx={{ fontSize: 16 }} /> : a.tone === 'primary' ? <LogoutIcon sx={{ fontSize: 16 }} /> : <VerifiedIcon sx={{ fontSize: 16 }} />}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13.5 }}>{a.action}</Typography>
              <Typography variant="caption" color="text.secondary">{a.actor}</Typography>
            </Box>
            <Chip label={a.time} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
          </Stack>
        ))}
      </Stack>
    </SectionCard>
  </Box>
);