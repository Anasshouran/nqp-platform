import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Breadcrumbs,
  Paper,
  Skeleton,
} from '@mui/material';
import {
  Person as PersonIcon,
  Devices as DevicesIcon,
  History as HistoryIcon,
  AccountBalance as AccountBalanceIcon,
  LocationOn as LocationIcon,
  Biotech as BiotechIcon,
  Business as BusinessIcon,
  Shield as ShieldIcon,
  Badge as BadgeIcon,
  Email as EmailIcon,
  PersonPin as PersonPinIcon,
  Edit as EditIcon,
  ArrowDownward as ArrowDownwardIcon,
  VerifiedUser as VerifiedUserIcon,
  Security as SecurityIcon,
  Smartphone as SmartphoneIcon,
  Notifications as NotificationsIcon,
  Language as LanguageIcon,
  Logout as LogoutIcon,
  Computer as ComputerIcon,
  PhoneIphone as PhoneIcon,
  Wifi as WifiIcon,
  GppGood as GppGoodIcon,
  CalendarMonth as CalendarIcon,
  Task as TaskIcon,
  HealthAndSafety as HealthAndSafetyIcon,
  WorkspacePremium as CertificateIcon,
  SystemUpdateAlt as SystemUpdateAltIcon,
  TextFormat as TextFormatIcon,
} from '@mui/icons-material';
import { getProfile, type ProfileData } from '../../api/endpoints/auth';
import { meOrganization, meSessions, meActivity } from '../../api/endpoints/account';
import { OrganizationEntry, SessionInfo, ActivityLogEntry } from '../../types/account';

const chemTheme = {
  primary: '#0B5ED7',
  success: '#1d7a54',
  warning: '#FFC107',
  danger: '#c63a3a',
  background: '#F4F6F9',
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </Box>
  );
}

function a11yProps(index: number) {
  return {
    id: `profile-tab-${index}`,
    'aria-controls': `profile-tabpanel-${index}`,
  };
}

export default function AccountPage() {
  const [tabValue, setTabValue] = useState(0);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [organization, setOrganization] = useState<OrganizationEntry[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getProfile().then((res) => {
        const payload = res.data?.data ?? res.data;
        setProfile(payload);
      }).catch(() => setProfile(null)),
      meOrganization().then((res) => {
        const payload = res.data?.data ?? res.data;
        setOrganization(payload);
      }).catch(() => setOrganization([])),
      meSessions().then((res) => {
        const payload = res.data?.data ?? res.data;
        setSessions(payload);
      }).catch(() => setSessions([])),
      meActivity().then((res) => {
        const payload = res.data?.data ?? res.data;
        setActivity(payload);
      }).catch(() => setActivity([])),
    ]).finally(() => setLoading(false));
  }, []);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const user = profile?.user;
  const emp = profile?.profile;
  const org = profile?.organization?.[0];
  const userName = emp?.full_name_ar || user?.full_name || 'أحمد محمد علي';
  const roleName = org?.position || emp?.job_title || 'محلل كيمياء';

  const orgChain = [
    { label: 'القطاع', value: org?.sector || '—', icon: AccountBalanceIcon },
    { label: 'المحطة', value: org?.station || '—', icon: LocationIcon },
    { label: 'المعمل', value: org?.lab || '—', icon: BiotechIcon },
    { label: 'القسم', value: org?.department || '—', icon: BusinessIcon },
    { label: 'المستخدم', value: userName, icon: PersonIcon },
  ];

  if (loading) {
    return (
      <Box sx={{ p: 3, maxWidth: 1080, mx: 'auto', width: '100%' }}>
        <Skeleton variant="rectangular" height={64} sx={{ borderRadius: 2, mb: 3 }} />
        <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2, mb: 3 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1080, mx: 'auto', width: '100%', bgcolor: 'transparent' }}>
      <Box
        sx={{
          mb: 3,
          p: 2,
          borderRadius: 2,
          bgcolor: 'white',
          border: '1px solid rgba(11,94,215,0.12)',
          boxShadow: '0 1px 3px rgba(16,24,40,0.06)',
        }}
      >
        <Breadcrumbs separator="/" aria-label="breadcrumb" sx={{ fontSize: 13, color: 'text.secondary' }}>
          <Typography sx={{ display: 'flex', alignItems: 'center', fontWeight: 700, color: chemTheme.primary }}>
            🧪 FCLIS
          </Typography>
          {orgChain.slice(0, 4).map((item) => (
            <Typography key={item.label} sx={{ fontSize: 13, color: 'text.secondary' }}>
              {item.value}
            </Typography>
          ))}
          <Typography sx={{ fontSize: 13, color: 'text.primary', fontWeight: 600 }}>{roleName}</Typography>
        </Breadcrumbs>
      </Box>

      <Card
        sx={{
          borderRadius: 3,
          boxShadow: '0 2px 8px rgba(16,24,40,0.08)',
          overflow: 'hidden',
          mb: 3,
        }}
      >
        <Box
          sx={{
            height: 88,
            background: `linear-gradient(135deg, ${chemTheme.primary} 0%, #0a4fae 100%)`,
          }}
        />
        <CardContent sx={{ pt: 0 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ alignItems: 'flex-start' }}>
            <Avatar
              sx={{
                width: 88,
                height: 88,
                mt: -5,
                bgcolor: 'white',
                color: chemTheme.primary,
                border: '4px solid white',
                boxShadow: '0 2px 8px rgba(16,24,40,0.15)',
                fontSize: 36,
                fontWeight: 700,
              }}
            >
              {userName[0]}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'flex-start' }, justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {userName}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                    {roleName}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                    {org?.department || 'قسم الكيمياء'}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Chip
                    icon={<VerifiedUserIcon sx={{ fontSize: 16 }} />}
                    label="نشط"
                    size="small"
                    sx={{ bgcolor: 'rgba(25,135,84,0.12)', color: chemTheme.success, fontWeight: 600 }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditIcon />}
                    sx={{
                      borderColor: chemTheme.primary,
                      color: chemTheme.primary,
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 2,
                      '&:hover': { bgcolor: 'rgba(11,94,215,0.06)', borderColor: chemTheme.primary },
                    }}
                  >
                    تعديل الملف
                  </Button>
                </Stack>
              </Stack>
              <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 1.5 }}>
                Employee ID: {emp?.employee_number || 'LAB-CH-0025'}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3, boxShadow: '0 2px 8px rgba(16,24,40,0.08)', mb: 3, overflow: 'hidden' }}>
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 3 }}>
            <AccountBalanceIcon sx={{ color: chemTheme.primary }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              الهيكل الوظيفي
            </Typography>
          </Stack>
          <Stack spacing={1} sx={{ alignItems: 'stretch' }}>
            {orgChain.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Box key={item.label}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      borderColor: 'rgba(11,94,215,0.18)',
                      bgcolor: idx === orgChain.length - 1 ? 'rgba(11,94,215,0.05)' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: 2,
                        bgcolor: 'rgba(11,94,215,0.1)',
                        color: chemTheme.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon sx={{ fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 600 }}>{item.label}</Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{item.value}</Typography>
                    </Box>
                  </Paper>
                  {idx < orgChain.length - 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.25 }}>
                      <ArrowDownwardIcon sx={{ fontSize: 16, color: chemTheme.primary }} />
                    </Box>
                  )}
                </Box>
              );
            })}
          </Stack>
          <Divider sx={{ my: 3 }} />
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
            <ShieldIcon sx={{ color: chemTheme.primary }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              الدور
            </Typography>
          </Stack>
          <Chip
            label={roleName}
            sx={{ bgcolor: 'rgba(11,94,215,0.1)', color: chemTheme.primary, fontWeight: 700, borderRadius: 2 }}
          />
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3, boxShadow: '0 2px 8px rgba(16,24,40,0.08)', mb: 3, overflow: 'hidden' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: 2,
            pt: 1.5,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: 14, minHeight: 48 },
            '& .Mui-selected': { color: chemTheme.primary },
            '& .MuiTabs-indicator': { bgcolor: chemTheme.primary },
          }}
        >
          <Tab label="الملف الشخصي" icon={<PersonIcon />} iconPosition="start" {...a11yProps(0)} />
          <Tab label="جهة العمل" icon={<AccountBalanceIcon />} iconPosition="start" {...a11yProps(1)} />
          <Tab label="الأمان" icon={<SecurityIcon />} iconPosition="start" {...a11yProps(2)} />
          <Tab label="الأجهزة والجلسات" icon={<DevicesIcon />} iconPosition="start" {...a11yProps(3)} />
          <Tab label="الإشعارات" icon={<NotificationsIcon />} iconPosition="start" {...a11yProps(4)} />
          <Tab label="اللغة" icon={<LanguageIcon />} iconPosition="start" {...a11yProps(5)} />
          <Tab label="سجل النشاط" icon={<HistoryIcon />} iconPosition="start" {...a11yProps(6)} />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ px: 3, pb: 3 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 3 }}>
              <PersonIcon sx={{ color: chemTheme.primary }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                الملف الشخصي
              </Typography>
            </Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <InfoRow icon={BadgeIcon} label="الرقم الوظيفي" value={emp?.employee_number || '—'} />
                <InfoRow icon={PersonPinIcon} label="اسم المستخدم" value={user?.email?.split('@')[0] || '—'} />
                <InfoRow icon={EmailIcon} label="البريد الإلكتروني" value={user?.email || '—'} />
                <InfoRow icon={PhoneIcon} label="رقم الهاتف" value={user?.phone || '—'} />
                <InfoRow icon={VerifiedUserIcon} label="الحالة" value="نشط" success />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <InfoRow icon={PersonIcon} label="الاسم بالعربية" value={emp?.full_name_ar || user?.full_name || '—'} />
                <InfoRow icon={PersonIcon} label="الاسم بالإنجليزية" value={emp?.full_name_en || '—'} />
                <InfoRow icon={BadgeIcon} label="المسمى الوظيفي" value={emp?.job_title || '—'} />
                <InfoRow icon={BusinessIcon} label="القسم" value={emp?.office || '—'} />
                <InfoRow icon={CalendarIcon} label="تاريخ الإنشاء" value={emp?.hire_date ? new Date(emp.hire_date).toLocaleDateString('ar-SA') : '—'} />
              </Box>
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ px: 3, pb: 3 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 3 }}>
              <AccountBalanceIcon sx={{ color: chemTheme.primary }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                جهة العمل
              </Typography>
            </Stack>
            <Typography sx={{ color: 'text.secondary', fontSize: 13, mb: 2 }}>
              هذه المعلومات تُدار مركزياً وغير قابلة للتعديل
            </Typography>
            <Stack spacing={1} sx={{ alignItems: 'stretch' }}>
              {organization.map((org, idx) => (
                <Box key={idx}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      borderColor: 'rgba(11,94,215,0.18)',
                      bgcolor: idx === organization.length - 1 ? 'rgba(11,94,215,0.05)' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: 2,
                        bgcolor: 'rgba(11,94,215,0.1)',
                        color: chemTheme.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <AccountBalanceIcon sx={{ fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 600 }}>
                        القطاع
                      </Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
                        {org.sector_name || org.sector || '—'}
                      </Typography>
                    </Box>
                  </Paper>
                  {idx < organization.length - 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.25 }}>
                      <ArrowDownwardIcon sx={{ fontSize: 16, color: chemTheme.primary }} />
                    </Box>
                  )}
                </Box>
              ))}
            </Stack>
            <Divider sx={{ my: 3 }} />
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
              <LocationIcon sx={{ color: chemTheme.primary }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                المنفذ
              </Typography>
            </Stack>
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 2,
                borderColor: 'rgba(11,94,215,0.18)',
                bgcolor: 'rgba(11,94,215,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 2,
                  bgcolor: 'rgba(11,94,215,0.1)',
                  color: chemTheme.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <LocationIcon sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 600 }}>
                  المنفذ
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
                  {organization[0]?.station_name || organization[0]?.station || '—'}
                </Typography>
              </Box>
            </Paper>
            <Divider sx={{ my: 3 }} />
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
              <BusinessIcon sx={{ color: chemTheme.primary }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                الوحدة
              </Typography>
            </Stack>
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 2,
                borderColor: 'rgba(11,94,215,0.18)',
                bgcolor: 'rgba(11,94,215,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 2,
                  bgcolor: 'rgba(11,94,215,0.1)',
                  color: chemTheme.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <BusinessIcon sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 600 }}>
                  الوحدة
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
                  {organization[0]?.unit_name || organization[0]?.unit || '—'}
                </Typography>
              </Box>
            </Paper>
            <Divider sx={{ my: 3 }} />
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
              <ShieldIcon sx={{ color: chemTheme.primary }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                الدور
              </Typography>
            </Stack>
            <Chip
              label={emp?.job_title || user?.role || '—'}
              sx={{ bgcolor: 'rgba(11,94,215,0.1)', color: chemTheme.primary, fontWeight: 700, borderRadius: 2 }}
            />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ px: 3, pb: 3 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 3 }}>
              <SecurityIcon sx={{ color: chemTheme.primary }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                الأمان
              </Typography>
            </Stack>
            <List disablePadding>
              <ListItem
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  border: '1px solid rgba(16,24,40,0.08)',
                  bgcolor: 'white',
                }}
              >
                <ListItemIcon>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(11,94,215,0.1)',
                      color: chemTheme.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <PersonIcon sx={{ fontSize: 18 }} />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary="تسجيل الدخول"
                  primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                />
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                  SUDAPASS
                </Typography>
              </ListItem>
              <ListItem
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  border: '1px solid rgba(16,24,40,0.08)',
                  bgcolor: 'white',
                }}
              >
                <ListItemIcon>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(25,135,84,0.1)',
                      color: chemTheme.success,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <GppGoodIcon sx={{ fontSize: 18 }} />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary="التحقق بخطوتين"
                  primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                />
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                  🟢 مفعّل
                </Typography>
              </ListItem>
              <ListItem
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  border: '1px solid rgba(16,24,40,0.08)',
                  bgcolor: 'white',
                }}
              >
                <ListItemIcon>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(11,94,215,0.1)',
                      color: chemTheme.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ComputerIcon sx={{ fontSize: 18 }} />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary="الأجهزة الموثوقة"
                  primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                />
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                  {sessions.filter(s => s.is_active).length} أجهزة
                </Typography>
              </ListItem>
              <ListItem
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  border: '1px solid rgba(16,24,40,0.08)',
                  bgcolor: 'white',
                }}
              >
                <ListItemIcon>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(11,94,215,0.1)',
                      color: chemTheme.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <WifiIcon sx={{ fontSize: 18 }} />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary="جلسات الدخول"
                  primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                />
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                  {sessions.filter(s => s.is_active).length} جلسات نشطة
                </Typography>
              </ListItem>
              <ListItem
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  border: '1px solid rgba(16,24,40,0.08)',
                  bgcolor: 'white',
                }}
              >
                <ListItemIcon>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(25,135,84,0.1)',
                      color: chemTheme.success,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <GppGoodIcon sx={{ fontSize: 18 }} />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary="تنبيهات الأمان"
                  primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                />
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                  🟢 لا توجد تنبيهات
                </Typography>
              </ListItem>
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Box sx={{ px: 3, pb: 3 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 3 }}>
              <DevicesIcon sx={{ color: chemTheme.primary }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                الأجهزة والجلسات
              </Typography>
            </Stack>
            <Typography sx={{ color: 'text.secondary', fontSize: 13, mb: 2 }}>
              الجهاز              آخر نشاط        الحالة
            </Typography>
            <List disablePadding>
              {sessions.map((session, idx) => (
                <ListItem
                  key={session.id}
                  sx={{
                    borderRadius: 2,
                    mb: 1,
                    border: '1px solid rgba(16,24,40,0.08)',
                    bgcolor: 'white',
                  }}
                >
                  <ListItemText
                    primary={session.device_info || `جهاز ${idx + 1}`}
                    secondary={session.last_activity ? `منذ ${new Date(session.last_activity).toLocaleDateString('ar-SA')}` : 'الآن'}
                    primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                    secondaryTypographyProps={{ fontSize: 12 }}
                  />
                  <Chip
                    label={session.is_active ? '🟢 نشطة' : '🔴 غير نشطة'}
                    size="small"
                    sx={{
                      bgcolor: session.is_active ? 'rgba(25,135,84,0.12)' : 'rgba(198,58,58,0.12)',
                      color: session.is_active ? chemTheme.success : chemTheme.danger,
                      fontWeight: 700,
                    }}
                  />
                </ListItem>
              ))}
            </List>
            <Button
              variant="contained"
              startIcon={<LogoutIcon />}
              sx={{
                mt: 2,
                bgcolor: chemTheme.danger,
                color: 'white',
                '&:hover': { bgcolor: '#b3261e' },
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              تسجيل الخروج من جميع الأجهزة
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Box sx={{ px: 3, pb: 3 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 3 }}>
              <NotificationsIcon sx={{ color: chemTheme.primary }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                إعدادات الإشعارات
              </Typography>
            </Stack>
            <List disablePadding>
              <ListItem
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  border: '1px solid rgba(16,24,40,0.08)',
                  bgcolor: 'white',
                  alignItems: 'center',
                }}
              >
                <ListItemIcon>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(11,94,215,0.1)',
                      color: chemTheme.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <BusinessIcon sx={{ fontSize: 18 }} />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary="إشعارات المعاملات"
                  primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                />
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                  ☑
                </Typography>
              </ListItem>
              <ListItem
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  border: '1px solid rgba(16,24,40,0.08)',
                  bgcolor: 'white',
                  alignItems: 'center',
                }}
              >
                <ListItemIcon>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(11,94,215,0.1)',
                      color: chemTheme.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TaskIcon sx={{ fontSize: 18 }} />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary="إشعارات المهام"
                  primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                />
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                  ☑
                </Typography>
              </ListItem>
              <ListItem
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  border: '1px solid rgba(16,24,40,0.08)',
                  bgcolor: 'white',
                  alignItems: 'center',
                }}
              >
                <ListItemIcon>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(11,94,215,0.1)',
                      color: chemTheme.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <HealthAndSafetyIcon sx={{ fontSize: 18 }} />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary="التنبيهات الصحية"
                  primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                />
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                  ☑
                </Typography>
              </ListItem>
              <ListItem
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  border: '1px solid rgba(16,24,40,0.08)',
                  bgcolor: 'white',
                  alignItems: 'center',
                }}
              >
                <ListItemIcon>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(11,94,215,0.1)',
                      color: chemTheme.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CertificateIcon sx={{ fontSize: 18 }} />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary="إشعارات الشهادات"
                  primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                />
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                  ☑
                </Typography>
              </ListItem>
              <ListItem
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  border: '1px solid rgba(16,24,40,0.08)',
                  bgcolor: 'white',
                  alignItems: 'center',
                }}
              >
                <ListItemIcon>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(11,94,215,0.1)',
                      color: chemTheme.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SystemUpdateAltIcon sx={{ fontSize: 18 }} />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary="إشعارات النظام"
                  primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                />
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                  ☑
                </Typography>
              </ListItem>
              <ListItem
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  border: '1px solid rgba(16,24,40,0.08)',
                  bgcolor: 'white',
                  alignItems: 'center',
                }}
              >
                <ListItemIcon>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(11,94,215,0.1)',
                      color: chemTheme.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <EmailIcon sx={{ fontSize: 18 }} />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary="رسائل البريد الإلكتروني"
                  primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                />
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                  ☐
                </Typography>
              </ListItem>
              <ListItem
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  border: '1px solid rgba(16,24,40,0.08)',
                  bgcolor: 'white',
                  alignItems: 'center',
                }}
              >
                <ListItemIcon>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(11,94,215,0.1)',
                      color: chemTheme.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SmartphoneIcon sx={{ fontSize: 18 }} />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary="إشعارات التطبيق"
                  primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                />
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                  ☑
                </Typography>
              </ListItem>
            </List>
            <Button
              variant="contained"
              sx={{
                mt: 2,
                bgcolor: chemTheme.primary,
                color: 'white',
                '&:hover': { bgcolor: '#0a4fae' },
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              حفظ التغييرات
            </Button>
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={5}>
          <Box sx={{ px: 3, pb: 3 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 3 }}>
              <LanguageIcon sx={{ color: chemTheme.primary }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                اللغة
              </Typography>
            </Stack>
            <Typography sx={{ color: 'text.secondary', fontSize: 13, mb: 2 }}>
              لغة النظام
            </Typography>
            <List disablePadding>
              <ListItem
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  border: '1px solid rgba(16,24,40,0.08)',
                  bgcolor: 'white',
                  alignItems: 'center',
                }}
              >
                <ListItemIcon>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(11,94,215,0.1)',
                      color: chemTheme.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <LanguageIcon sx={{ fontSize: 18 }} />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary="العربية"
                  primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                />
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                  ◉
                </Typography>
              </ListItem>
              <ListItem
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  border: '1px solid rgba(16,24,40,0.08)',
                  bgcolor: 'white',
                  alignItems: 'center',
                }}
              >
                <ListItemIcon>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(11,94,215,0.1)',
                      color: chemTheme.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <LanguageIcon sx={{ fontSize: 18 }} />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary="English"
                  primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                />
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                  ○
                </Typography>
              </ListItem>
            </List>
            <Typography sx={{ color: 'text.secondary', fontSize: 13, mb: 2, mt: 3 }}>
              اتجاه الواجهة:
            </Typography>
            <List disablePadding>
              <ListItem
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  border: '1px solid rgba(16,24,40,0.08)',
                  bgcolor: 'white',
                  alignItems: 'center',
                }}
              >
                <ListItemIcon>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(11,94,215,0.1)',
                      color: chemTheme.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TextFormatIcon sx={{ fontSize: 18 }} />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary="RTL / LTR"
                  primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                />
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                  RTL
                </Typography>
              </ListItem>
            </List>
            <Typography sx={{ color: 'text.secondary', fontSize: 11, mt: 2, fontStyle: 'italic' }}>
              يتم تطبيق اللغة على كامل المنصة
            </Typography>
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={6}>
          <Box sx={{ px: 3, pb: 3 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 3 }}>
              <HistoryIcon sx={{ color: chemTheme.primary }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                سجل نشاطي
              </Typography>
            </Stack>
            <Typography sx={{ color: 'text.secondary', fontSize: 13, mb: 2 }}>
              المستخدم يرى نشاطه الشخصي فقط
            </Typography>
            <List disablePadding>
              {activity.map((act, idx) => (
                <ListItem
                  key={idx}
                  sx={{
                    borderRadius: 2,
                    mb: 1,
                    border: '1px solid rgba(16,24,40,0.08)',
                    bgcolor: 'white',
                  }}
                >
                  <ListItemText
                    primary={`${act.date} – ${act.time}`}
                    secondary={act.description}
                    primaryTypographyProps={{ fontWeight: 600, fontSize: 13 }}
                    secondaryTypographyProps={{ fontSize: 12 }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </TabPanel>
      </Card>
    </Box>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  success,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  success?: boolean;
}) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 1 }}>
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: 1.5,
          bgcolor: 'rgba(11,94,215,0.08)',
          color: chemTheme.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: 18 }} />
      </Box>
      <Typography sx={{ color: 'text.secondary', fontSize: 14, minWidth: 110 }}>{label}</Typography>
      <Typography sx={{ fontWeight: 700, fontSize: 14, color: success ? chemTheme.success : 'text.primary' }}>
        {value}
      </Typography>
    </Stack>
  );
}