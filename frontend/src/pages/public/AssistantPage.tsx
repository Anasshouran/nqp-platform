import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Badge from '@mui/material/Badge';
import Avatar from '@mui/material/Avatar';
import CallIcon from '@mui/icons-material/Call';
import EmailIcon from '@mui/icons-material/Email';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import LuggageIcon from '@mui/icons-material/Luggage';
import AppsIcon from '@mui/icons-material/Apps';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import VerifiedIcon from '@mui/icons-material/Verified';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import {
  getAssistantTopics,
  type AssistantTopic,
} from '../../api/endpoints/assistant';
import { ListSkeleton } from '../../components/common';
import SmartAssistant from '../../components/common/SmartAssistant';

const heroTopics: Array<{ key: string; label: string; icon: React.ReactElement }> = [
  { key: 'travel', label: 'متطلبات السفر', icon: <LuggageIcon /> },
  { key: 'services', label: 'الخدمات', icon: <AppsIcon /> },
  { key: 'health', label: 'الإرشادات الصحية', icon: <HealthAndSafetyIcon /> },
  { key: 'notices', label: 'التنبيهات', icon: <NotificationsActiveIcon /> },
  { key: 'verify', label: 'التحقق من الشهادات', icon: <VerifiedIcon /> },
  { key: 'food', label: 'سلامة الأغذية', icon: <RestaurantIcon /> },
];

const topicIconMap: Record<string, React.ReactElement> = {
  FAQ: <HealthAndSafetyIcon fontSize="small" />,
  TRAVEL: <LuggageIcon fontSize="small" />,
  NOTICES: <NotificationsActiveIcon fontSize="small" />,
  SERVICES: <AppsIcon fontSize="small" />,
  ESCALATION: <CallIcon fontSize="small" />,
};

const topicColor: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  FAQ: 'primary',
  TRAVEL: 'info',
  NOTICES: 'warning',
  SERVICES: 'success',
  ESCALATION: 'secondary',
};

const AssistantPage = () => {
  const [topics, setTopics] = useState<AssistantTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAssistantTopics()
      .then((res) => setTopics(res.data.data))
      .catch(() => setTopics([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      {/* Hero */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Avatar
          sx={{
            width: 88,
            height: 88,
            mx: 'auto',
            mb: 2,
            background: 'linear-gradient(135deg,#0c7f6a,#0a6b58)',
            boxShadow: '0 16px 40px rgba(14,138,114,0.35)',
          }}
        >
          <SmartToyIcon sx={{ fontSize: 44 }} />
        </Avatar>
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
          المساعد الذكي
        </Typography>
        <Typography color="text.secondary" sx={{ fontWeight: 700, mb: 1 }} dir="ltr">
          NQP Smart Assistant
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, mx: 'auto' }}>
          مساعدك للوصول إلى المعلومات والخدمات الرسمية لمنصة الحجر الصحي القومي.
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center" useFlexGap sx={{ mt: 2.5 }}>
          {heroTopics.map((t) => (
            <Chip
              key={t.key}
              icon={t.icon}
              label={t.label}
              variant="outlined"
              color="primary"
              onClick={() => document.getElementById('assistant-chat')?.scrollIntoView({ behavior: 'smooth' })}
              sx={{ fontWeight: 700, px: 0.5 }}
            />
          ))}
        </Stack>
      </Box>

      <Grid container spacing={3} id="assistant-chat">
        <Grid item xs={12} md={4}>
          <Stack spacing={2}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  المواضيع الشائعة
                </Typography>
                {loading ? (
                  <ListSkeleton count={4} />
                ) : (
                  <List disablePadding>
                    {topics.map((topic) => (
                      <ListItem key={topic.group} disableGutters sx={{ py: 0.75 }}>
                        <ListItemText
                          primary={
                            <Stack direction="row" spacing={1} alignItems="center">
                              {topicIconMap[topic.group]}
                              <Typography variant="body2" sx={{ fontWeight: 700 }} flexGrow={1}>
                                {topic.title}
                              </Typography>
                              <Badge badgeContent={topic.count} color={topicColor[topic.group] || 'default'} max={999} />
                            </Stack>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  يقوم المسؤول بتحديث هذه المصادر من لوحة الإدارة دون تعديل البرنامج.
                </Typography>
              </CardContent>
            </Card>

            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                  التواصل مع الدعم
                </Typography>
                <Stack spacing={1}>
                  <Chip icon={<CallIcon />} label="الخط الساخن: 18777" sx={{ width: 'fit-content', fontWeight: 700 }} />
                  <Chip icon={<EmailIcon />} label="info@nqp.gov.sd" sx={{ width: 'fit-content', fontWeight: 700 }} />
                </Stack>
                <Button
                  component={Link}
                  to="/contact"
                  variant="outlined"
                  size="small"
                  sx={{ mt: 2, textTransform: 'none' }}
                >
                  صفحة اتصل بنا
                </Button>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        <Grid item xs={12} md={8}>
          <SmartAssistant height={520} />
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button component={Link} to="/services" size="small" sx={{ textTransform: 'none' }}>
          تصفح جميع خدمات المنصة
        </Button>
      </Box>
    </Container>
  );
};

export default AssistantPage;
