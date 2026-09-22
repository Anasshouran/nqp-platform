import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import InfoIcon from '@mui/icons-material/Info';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CloseIcon from '@mui/icons-material/Close';
import SourceIcon from '@mui/icons-material/Source';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  chatAssistant,
  getAssistantSuggestions,
  type AssistantAction,
  type AssistantAnswer,
  type AssistantAnswerType,
  type AssistantSource,
} from '../../api/endpoints/assistant';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  answer_type?: AssistantAnswerType;
  sources?: AssistantSource[];
  action?: AssistantAction | null;
  failed?: boolean;
}

type Lang = 'ar' | 'en';

const enGreeting =
  'Welcome to the NQP Smart Assistant.\nI can help you with:\n• Travel requirements\n• Electronic services\n• Health guidance\n• Notices and circulars\n• Service enquiries\n\nHow can I help?';
const arGreeting =
  'مرحباً بك في المساعد الذكي لمنصة الحجر الصحي القومي\nيمكنني مساعدتك في:\n• متطلبات السفر\n• الخدمات الإلكترونية\n• الإرشادات الصحية\n• التنبيهات والتعاميم\n• الاستعلام عن الخدمات\n\nكيف أستطيع مساعدتك؟';

const greetingFor: Record<Lang, string> = { ar: arGreeting, en: enGreeting };

const sourceTypeLabel: Record<string, string> = {
  FAQ: 'FAQ',
  TRAVEL_REQUIREMENT: 'متطلبات السفر',
  HEALTH_NOTICE: 'إشعار صحي',
  SERVICE: 'خدمة',
};

const typeMeta: Record<AssistantAnswerType, { icon: React.ReactElement; label: string; color: 'info' | 'success' | 'warning' | 'secondary' | 'error' }> = {
  INFO: { icon: <InfoIcon fontSize="small" />, label: 'معلومات', color: 'info' },
  ACTION: { icon: <VerifiedUserIcon fontSize="small" />, label: 'إجراء', color: 'success' },
  ALERT: { icon: <NotificationsActiveIcon fontSize="small" />, label: 'تنبيه صحي', color: 'warning' },
  SOURCE: { icon: <SourceIcon fontSize="small" />, label: 'مصدر رسمي', color: 'secondary' },
  NOT_FOUND: { icon: <ErrorOutlineIcon fontSize="small" />, label: 'لم أجد معلومة', color: 'error' },
};

function formatDate(value?: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
}

const UserBubble = ({ text }: { text: string }) => (
  <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ justifyContent: 'flex-start', flexDirection: 'row-reverse' }}>
    <Avatar sx={{ width: 30, height: 30, bgcolor: 'secondary.main' }}>
      <PersonIcon sx={{ fontSize: 18 }} />
    </Avatar>
    <Box
      sx={{
        maxWidth: '78%',
        bgcolor: 'primary.main',
        color: '#fff',
        borderRadius: 3,
        borderTopLeftRadius: 3,
        p: 1.5,
        whiteSpace: 'pre-line',
        boxShadow: 1,
        fontSize: 14,
        lineHeight: 1.8,
      }}
    >
      {text}
    </Box>
  </Stack>
);

const ActionCta = ({ action }: { action: AssistantAction }) => {
  const toBeacon = action.route && (action.route.startsWith('/') || action.route.startsWith('http'));
  const auth = action.requires_auth;
  return (
    <Box sx={{ mt: 0.5 }}>
      <Button
        component={toBeacon ? Link : Box}
        to={toBeacon ? action.route : undefined}
        variant={auth ? 'contained' : 'outlined'}
        color={auth ? 'primary' : 'secondary'}
        startIcon={auth ? <VerifiedUserIcon /> : undefined}
        size="small"
        sx={{ mt: 1, textTransform: 'none', fontWeight: 700 }}
      >
        {action.label || (auth ? 'المتابعة' : 'ابدأ الخدمة')}
      </Button>
    </Box>
  );
};

const SourceBlock = ({ sources }: { sources: AssistantSource[] }) => {
  if (!sources.length) return null;
  return (
    <Box
      sx={{
        mt: 1,
        p: 1,
        borderRadius: 2,
        border: '1px dashed',
        borderColor: 'divider',
        bgcolor: 'rgba(16,40,34,0.02)',
      }}
    >
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
        <SourceIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }} color="text.secondary">
          المصدر الرسمي
        </Typography>
      </Stack>
      {sources.map((s, i) => {
        const updated = formatDate(s.source_updated_at);
        const linkable = s.source_url && (s.source_url.startsWith('/') || s.source_url.startsWith('http'));
        return (
          <Stack key={i} direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
            <Typography variant="caption" sx={{ fontSize: '0.72rem', fontWeight: 600 }}>
              {sourceTypeLabel[s.type] || s.type}
            </Typography>
            {s.title && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', maxWidth: 220 }} noWrap title={s.title}>
                ({s.title})
              </Typography>
            )}
            {updated && (
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>
                · آخر تحديث: {updated}
              </Typography>
            )}
            {linkable && (
              <Link to={s.source_url!} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
                <Chip
                  size="small"
                  icon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
                  label="عرض المصدر"
                  variant="outlined"
                  sx={{ fontSize: '0.65rem', height: 22 }}
                />
              </Link>
            )}
          </Stack>
        );
      })}
    </Box>
  );
};

const BotBubble = ({ msg }: { msg: ChatMessage }) => {
  const meta = msg.answer_type ? typeMeta[msg.answer_type] : null;
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ justifyContent: 'flex-end', flexDirection: 'row' }}>
      <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main' }}>
        <SmartToyIcon sx={{ fontSize: 18 }} />
      </Avatar>
      <Stack sx={{ maxWidth: '82%' }}>
        {meta && (
          <Chip
            size="small"
            icon={meta.icon}
            label={meta.label}
            color={meta.color}
            variant={msg.failed ? 'outlined' : 'filled'}
            sx={{ fontSize: '0.66rem', height: 22, width: 'fit-content', mb: 0.5 }}
          />
        )}
        <Box
          sx={{
            bgcolor: msg.failed ? '#fdeaea' : '#fff',
            color: 'text.primary',
            borderRadius: 3,
            borderTopRightRadius: 0,
            p: 1.5,
            whiteSpace: 'pre-line',
            boxShadow: 1,
            fontSize: 14,
            lineHeight: 1.8,
            border: msg.failed ? '1px solid' : 'none',
            borderColor: 'error.main',
          }}
        >
          {msg.text}
        </Box>
        {msg.action && msg.action.route && !msg.failed && <ActionCta action={msg.action} />}
        {!msg.failed && <SourceBlock sources={msg.sources || []} />}
        {!msg.failed && msg.answer_type === 'NOT_FOUND' && (
          <Button component={Link} to="/contact" size="small" sx={{ textTransform: 'none', mt: 0.5, alignSelf: 'flex-start' }}>
            تواصل معنا
          </Button>
        )}
      </Stack>
    </Stack>
  );
};

const SmartAssistant = ({
  height = 380,
  compact = false,
  embedded = false,
  hideHeader = false,
  onClose,
  language: controlledLanguage,
  onLanguageChange,
}: {
  height?: number | string;
  compact?: boolean;
  embedded?: boolean;
  hideHeader?: boolean;
  onClose?: () => void;
  language?: Lang;
  onLanguageChange?: (lang: Lang) => void;
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'bot', text: arGreeting }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [internalLanguage, setInternalLanguage] = useState<Lang>('ar');
  const [listening, setListening] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([
    'متطلبات السفر',
    'التطعيمات',
    'الحمى الصفراء',
    'وثائق الدخول',
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const isControlled = controlledLanguage !== undefined;
  const language: Lang = isControlled ? controlledLanguage : internalLanguage;
  const changeLanguage = (lang: Lang) => {
    if (lang === language) return;
    if (isControlled) {
      onLanguageChange?.(lang);
    } else {
      setInternalLanguage(lang);
      setMessages([{ role: 'bot', text: greetingFor[lang] }]);
    }
  };

  useEffect(() => {
    getAssistantSuggestions()
      .then((res) => res.data.data && setQuickReplies(res.data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typing]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || typing) return;
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setInput('');
    setTyping(true);
    try {
      const response = await chatAssistant({ message: question, language });
      const data = response.data.data as AssistantAnswer;
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: data.answer,
          answer_type: data.answer_type,
          sources: data.sources || [],
          action: data.action,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text:
            language === 'en'
              ? 'Could not reach the assistant. Please try again later, or use the "Contact Us" page.'
              : 'تعذر الاتصال بالمساعد. حاول مرة أخرى لاحقاً، أو تواصل معنا عبر صفحة "اتصل بنا".',
          failed: true,
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const speechApi = (window as unknown as Record<string, unknown>)?.SpeechRecognition
    || (window as unknown as Record<string, unknown>)?.webkitSpeechRecognition;

  const toggleMic = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    if (!speechApi) return;
    const SR = speechApi as new () => { start: () => void; onresult: (e: any) => void; onend: () => void; lang: string; interimResults: boolean };
    const recognition = new SR();
    recognition.lang = language === 'ar' ? 'ar-SA' : 'en-US';
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const transcript = e.results?.[0]?.[0]?.transcript || '';
      if (transcript) setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  };

  const showLanguageToggle = (embedded && !compact) || (!embedded && !compact);

  const header = (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
      <Box sx={{ position: 'relative' }}>
        <Avatar sx={{ bgcolor: 'primary.main' }}>
          <SmartToyIcon />
        </Avatar>
        <Box
          className="pulse-dot"
          sx={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 12,
            height: 12,
            borderRadius: '50%',
            bgcolor: '#22c55e',
            border: '2px solid #fff',
          }}
        />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>
          {language === 'ar' ? 'المساعد الذكي لمنصة الحجر الصحي القومي' : 'NQP Smart Assistant'}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, whiteSpace: 'nowrap' }}>
            {language === 'ar' ? 'بوابة ذكية للإجابة عن الاستفسارات' : 'Smart gateway for official Q&A'}
          </Typography>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.8)' }} />
          <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {language === 'ar' ? 'متصل الآن' : 'Online'}
          </Typography>
        </Stack>
      </Box>
      {showLanguageToggle && (
        <ToggleButtonGroup
          size="small"
          exclusive
          value={language}
          onChange={(_, v) => v && changeLanguage(v)}
          aria-label="language"
        >
          <ToggleButton value="ar" sx={{ fontWeight: 700 }}>عربي</ToggleButton>
          <ToggleButton value="en" sx={{ fontWeight: 700 }}>EN</ToggleButton>
        </ToggleButtonGroup>
      )}
      {embedded && onClose && (
        <IconButton onClick={onClose} aria-label="إغلاق" size="small" sx={{ alignSelf: 'flex-start' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      )}
    </Stack>
  );

  const chatPaper = (
    <Paper
      variant="outlined"
      sx={{
        flex: 1,
        minHeight: 0,
        height: embedded ? undefined : height,
        overflowY: 'auto',
        p: 2,
        borderRadius: 3,
        bgcolor: 'primary.lighter',
        mb: 2,
      }}
    >
      <Stack spacing={1.5}>
        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <UserBubble key={i} text={msg.text} />
          ) : (
            <Box key={i} className={i === messages.length - 1 ? 'fade-in' : undefined}>
              <BotBubble msg={msg} />
            </Box>
          ),
        )}
        {typing && (
          <Stack direction="row" spacing={1} className="fade-in">
            <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main' }}>
              <SmartToyIcon sx={{ fontSize: 18 }} />
            </Avatar>
            <Box sx={{ bgcolor: '#fff', borderRadius: 3, p: 1.5, boxShadow: 1 }}>
              <Stack direction="row" spacing={0.6} alignItems="center" sx={{ color: 'primary.main' }}>
                <Box className="typing-dot" />
                <Box className="typing-dot" sx={{ animationDelay: '0.15s' }} />
                <Box className="typing-dot" sx={{ animationDelay: '0.3s' }} />
              </Stack>
            </Box>
          </Stack>
        )}
        <div ref={bottomRef} />
      </Stack>
    </Paper>
  );

  const inputRow = (
    <>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        {language === 'ar' ? 'أسئلة شائعة سريعة:' : 'Quick replies:'}
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
        {quickReplies.map((reply) => (
          <Chip
            key={reply}
            label={reply}
            size="small"
            onClick={() => send(reply)}
            clickable
            sx={{
              fontWeight: 700,
              borderColor: 'primary.main',
              '&:hover': { bgcolor: 'primary.main', color: '#fff', boxShadow: '0 4px 12px rgba(14,138,114,0.35)' },
              transition: 'background 250ms ease, color 250ms ease, box-shadow 250ms ease',
            }}
            variant="outlined"
          />
        ))}
      </Stack>

      <Stack direction="row" spacing={1}>
        <TextField
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send(input);
          }}
          placeholder={language === 'ar' ? 'اكتب سؤالك هنا…' : 'Type your question here…'}
          fullWidth
          size="small"
        />
        <Tooltip title={listening ? 'إيقاف الإملاء' : speechApi ? 'إملاء صوتي' : 'الإملاء الصوتي غير مدعوم في هذا المتصفح'}>
          <span>
            <IconButton
              aria-label="إملاء صوتي"
              color={listening ? 'error' : 'default'}
              onClick={toggleMic}
              disabled={!speechApi}
              sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
            >
              {listening ? <MicOffIcon /> : <MicIcon />}
            </IconButton>
          </span>
        </Tooltip>
        <IconButton
          aria-label="إرسال"
          color="primary"
          onClick={() => send(input)}
          disabled={!input.trim() || typing}
          sx={{ bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' } }}
        >
          <SendIcon />
        </IconButton>
      </Stack>

      <Divider sx={{ my: 1 }} />
      <Stack direction="row" spacing={0.5} alignItems="center">
        <WarningAmberIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
          {language === 'ar'
            ? 'لا يطلب المساعد بيانات شخصية إلا عند الحاجة لخدمة مصادق عليها، ويجيب اعتماداً على المحتوى الرسمي المنشور فقط.'
            : 'The assistant never requests personal data unless needed for a verified service, and answers only from official published content.'}
        </Typography>
      </Stack>
    </>
  );

  if (embedded) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
        {!hideHeader && header}
        {chatPaper}
        {inputRow}
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        {header}
        {chatPaper}
        {inputRow}
      </CardContent>
    </Card>
  );
};

export default SmartAssistant;
