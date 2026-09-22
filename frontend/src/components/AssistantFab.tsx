import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Fab from '@mui/material/Fab';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CloseIcon from '@mui/icons-material/Close';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SmartAssistant from './common/SmartAssistant';
import useMediaQuery from '@mui/material/useMediaQuery';
import useTheme from '@mui/material/styles/useTheme';

type Lang = 'ar' | 'en';

const AssistantFab = () => {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<Lang>('ar');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { pathname } = useLocation();

  // موضع الزر العائم
  const [fabPos, setFabPos] = useState<{ x: number; y: number } | null>(null);
  const fabDragging = useRef<{ offX: number; offY: number; moved: boolean } | null>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);

  // موضع نافذة المحادثة العائمة
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
  const panelDragging = useRef<{ offX: number; offY: number } | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // لا نعرض الزر في صفحات الدخول/اللوحات (تجنب الصراعات)؛ أما صفحة المساعد فتبقى متاحة
  if (pathname.startsWith('/login') || pathname.startsWith('/app')) {
    return null;
  }

  const watchDrag = (kind: 'fab' | 'panel') => (e: React.PointerEvent) => {
    const target = kind === 'fab' ? fabRef.current : panelRef.current;
    target?.setPointerCapture?.(e.pointerId);
    if (kind === 'fab') {
      fabDragging.current = { offX: e.clientX, offY: e.clientY, moved: false };
    } else {
      const el = panelRef.current;
      panelDragging.current = el
        ? { offX: e.clientX - el.getBoundingClientRect().left, offY: e.clientY - el.getBoundingClientRect().top }
        : { offX: 0, offY: 0 };
    }
  };

  const moveFab = (e: React.PointerEvent) => {
    const d = fabDragging.current;
    const el = fabRef.current;
    if (!d || !el) return;
    const dx = e.clientX - d.offX;
    const dy = e.clientY - d.offY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    if (!d.moved) return;
    const pad = 12;
    setFabPos({
      x: Math.min(Math.max(e.clientX - d.offX + pad, pad), window.innerWidth - el.offsetWidth - pad),
      y: Math.min(Math.max(e.clientY - d.offY + pad, pad), window.innerHeight - el.offsetHeight - pad),
    });
  };

  const movePanel = (e: React.PointerEvent) => {
    const d = panelDragging.current;
    const el = panelRef.current;
    if (!d || !el) return;
    if (!open) return;
    const pad = 8;
    setPanelPos({
      x: Math.min(Math.max(e.clientX - d.offX, pad), window.innerWidth - el.offsetWidth - pad),
      y: Math.min(Math.max(e.clientY - d.offY, pad), window.innerHeight - el.offsetHeight - pad),
    });
  };

  const stopDrag = () => {
    fabDragging.current = null;
    panelDragging.current = null;
  };

  const handleFabClick = () => {
    if (fabDragging.current?.moved) return;
    setOpen((o) => !o);
  };

  const panelWidth = isMobile ? '100vw' : 'min(92vw, 420px)';
  const panelHeight = isMobile ? '90vh' : 'min(88vh, 640px)';

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          left: fabPos?.x ?? 'auto',
          top: fabPos?.y ?? 'auto',
          right: fabPos ? 'auto' : isMobile ? 16 : 28,
          bottom: fabPos ? 'auto' : isMobile ? 72 : 24,
          zIndex: theme.zIndex.drawer + 5,
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'rgba(14,138,114,0.45)',
            animation: 'pulseRing 2.4s cubic-bezier(0.22,1,0.36,1) infinite',
            pointerEvents: 'none',
          }}
        />
        <Fab
          ref={fabRef}
          aria-label="المساعد الذكي"
          title="اسأل NQP - المساعد الذكي (اسحب لنقله)"
          onClick={handleFabClick}
          onPointerDown={watchDrag('fab')}
          onPointerMove={moveFab}
          onPointerUp={stopDrag}
          sx={{
            touchAction: 'none',
            cursor: 'grab',
            background: 'linear-gradient(135deg, #0c7f6a, #12a585)',
            color: '#fff',
            boxShadow: '0 14px 32px rgba(14,138,114,0.5)',
            '&:hover': {
              transform: 'scale(1.08)',
              boxShadow: '0 18px 40px rgba(14,138,114,0.62)',
            },
            transition: 'transform 200ms ease, box-shadow 200ms ease',
          }}
        >
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ px: 0.5 }}>
            <SmartToyIcon />
            {!isMobile && <Typography sx={{ fontWeight: 700, fontSize: '0.82rem' }}>اسأل NQP</Typography>}
          </Stack>
        </Fab>
        <Box
          aria-hidden
          className="pulse-dot"
          sx={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 14,
            height: 14,
            borderRadius: '50%',
            bgcolor: '#22c55e',
            border: '2px solid #fff',
            boxShadow: '0 0 10px rgba(34,197,94,0.9)',
            pointerEvents: 'none',
          }}
        />
      </Box>

      {open && (
        <Paper
          ref={panelRef}
          elevation={12}
          sx={{
            position: 'fixed',
            left: panelPos?.x ?? 'auto',
            top: panelPos?.y ?? 84,
            right: panelPos ? 'auto' : 8,
            width: panelWidth,
            height: panelHeight,
            zIndex: theme.zIndex.drawer + 6,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: isMobile ? 0 : '20px',
            boxShadow: '0 24px 60px rgba(2,20,16,0.35)',
            bgcolor: 'background.paper',
          }}
        >
          <Box
            onPointerDown={watchDrag('panel')}
            onPointerMove={movePanel}
            onPointerUp={stopDrag}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 1,
              cursor: 'grab',
              touchAction: 'none',
              userSelect: 'none',
              bgcolor: 'primary.900',
              color: '#fff',
              borderTopLeftRadius: isMobile ? 0 : 20,
              borderTopRightRadius: isMobile ? 0 : 20,
            }}
          >
            <Box sx={{ display: 'grid', placeItems: 'center' }}>
              <SmartToyIcon />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }} noWrap>
              {isMobile ? 'NQP Smart Assistant' : 'المساعد الذكي لمنصة الحجر الصحي القومي'}
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={language}
              onChange={(_, v) => v && setLanguage(v as Lang)}
              aria-label="language"
              sx={{
                '& .MuiToggleButton-root': { color: '#fff', borderColor: 'rgba(255,255,255,0.4)' },
                '& .Mui-selected': { color: '#fff', bgcolor: 'rgba(255,255,255,0.2) !important' },
              }}
            >
              <ToggleButton value="ar" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>عربي</ToggleButton>
              <ToggleButton value="en" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>EN</ToggleButton>
            </ToggleButtonGroup>
            {!isMobile && <DragHandleIcon sx={{ opacity: 0.7 }} />}
            <IconButton
              size="small"
              onClick={() => setOpen(false)}
              aria-label="إغلاق"
              sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Divider />
          <Box sx={{ flex: 1, minHeight: 0, p: isMobile ? 1.5 : 2, display: 'flex' }}>
            <SmartAssistant
              embedded
              hideHeader
              language={language}
              onLanguageChange={setLanguage}
              height="100%"
            />
          </Box>
        </Paper>
      )}
    </>
  );
};

export default AssistantFab;