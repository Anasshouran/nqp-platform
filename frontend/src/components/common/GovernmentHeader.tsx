import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useGovernmentOrg } from '../../hooks/useGovernmentOrg';

/**
 * الترويسة الحكومية الموحدة — Government Design System.
 * تسلسل رسمي مركزي (شكل خطاب رسمي):
 * وزارة الصحة الاتحادية ← الإدارة العامة ← الحجر الصحي القومي ← القطاع ← الإدارة.
 * القطاع والإدارة ديناميكيان من حساب المستخدم (غير مكتوبين بشكل ثابت).
 * الألوان مستمدة من سمة المنصة (primary) — لا ألوان ثابتة.
 */
const GovernmentHeader = ({ compact = false }: { compact?: boolean }) => {
  const org = useGovernmentOrg();
  const theme = useTheme();
  const primary = theme.palette.primary.main;

  const sectorLine = org?.sector ? `الحجر الصحي القومي – ${org.sector}` : 'الحجر الصحي القومي';
  const administration = org?.administration || (org?.department ?? '');

  if (compact) {
    return (
      <Box
        sx={{
          width: '100%',
          background: `linear-gradient(135deg, ${primary} 0%, ${primary}CC 55%, ${primary}99 100%)`,
          color: theme.palette.primary.contrastText,
          px: { xs: 1.5, md: 3 },
          py: 0.6,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: { xs: 0.5, md: 1 },
            flexWrap: 'wrap',
            textAlign: 'center',
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: { xs: 12, md: 13.5 }, lineHeight: 1.5 }}>
            وزارة الصحة الاتحادية
          </Typography>
          <Typography sx={{ fontSize: { xs: 11, md: 12.5 }, lineHeight: 1.5, opacity: 0.92 }}>
            {sectorLine}
          </Typography>
          {administration ? (
            <Typography sx={{ fontSize: { xs: 11, md: 12.5 }, lineHeight: 1.5, opacity: 0.85 }}>
              {administration}
            </Typography>
          ) : null}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        background: `linear-gradient(135deg, ${primary} 0%, ${primary}CC 55%, ${primary}99 100%)`,
        color: theme.palette.primary.contrastText,
        px: { xs: 1.5, md: 3 },
        py: 1.1,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* زخرفة خلفية خفيفة */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 12% 0%, rgba(255,255,255,0.09), transparent 40%), radial-gradient(circle at 88% 100%, rgba(255,255,255,0.06), transparent 40%)',
          pointerEvents: 'none',
        }}
      />

      <Box sx={{ position: 'relative', textAlign: 'center' }}>
        {/* السطر الأول — الوزارة */}
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: { xs: 15, md: 18 },
            lineHeight: 1.3,
            letterSpacing: { md: 0.5 },
          }}
        >
          وزارة الصحة الاتحادية
        </Typography>

        {/* السطر الثاني — الإدارة العامة */}
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: { xs: 11.5, md: 13 },
            lineHeight: 1.4,
            opacity: 0.92,
            mt: 0.3,
          }}
        >
          الإدارة العامة للطوارئ الصحية ومكافحة الأوبئة
        </Typography>

        {/* فاصل زخرفي */}
        <Box
          sx={{
            width: { xs: 90, md: 140 },
            height: 2,
            mx: 'auto',
            my: 0.7,
            background: `linear-gradient(90deg, transparent, ${theme.palette.primary.contrastText}CC, transparent)`,
            borderRadius: 2,
          }}
        />

        {/* السطر الثالث — الحجر الصحي القومي – القطاع */}
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: { xs: 11.5, md: 13 },
            lineHeight: 1.4,
            color: theme.palette.primary.contrastText,
            opacity: 0.95,
          }}
        >
          {sectorLine}
        </Typography>

        {/* السطر الرابع — الإدارة */}
        {administration ? (
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: { xs: 11.5, md: 13 },
              lineHeight: 1.4,
              color: theme.palette.primary.contrastText,
              opacity: 0.88,
              mt: 0.2,
            }}
          >
            {administration}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
};

export default GovernmentHeader;