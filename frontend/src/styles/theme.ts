import { createTheme, alpha, type Shadows } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface PaletteColor {
    darker?: string;
    lighter?: string;
  }
  interface SimplePaletteColorOptions {
    darker?: string;
    lighter?: string;
  }
  interface Palette {
    /** Material 3 tonal surface ramp. */
    surface: {
      default: string;
      dim: string;
      bright: string;
      containerLowest: string;
      containerLow: string;
      container: string;
      containerHigh: string;
      containerHighest: string;
    };
    outline: { main: string; variant: string };
    /** Brand tonal ramp for tinted fills/containers. */
    brand: { 50: string; 100: string; 200: string; 300: string; 400: string; 500: string; 600: string; 700: string; 800: string; 900: string };
  }
  interface PaletteOptions {
    surface?: Partial<Palette['surface']>;
    outline?: { main?: string; variant?: string };
    brand?: Partial<Palette['brand']>;
  }
}

/* ------------------------------------------------------------------ */
/*  Design tokens — Material 3, tuned for a modern SaaS look           */
/* ------------------------------------------------------------------ */

/* Brand tonal ramp — deep teal */
const brand = {
  /* ramp */
  50: '#eaf7f1',
  100: '#d9f2e8',
  200: '#b3e4d1',
  300: '#79d0b2',
  400: '#12a585',
  500: '#0c8a6f',
  600: '#0c7f6a',
  700: '#075e4d',
  800: '#075447',
  900: '#064238',
  /* aliases */
  main: '#0c7f6a',
  dark: '#075e4d',
  darker: '#064238',
  light: '#d9f2e8',
  lighter: '#eefaf6',
} as const;

const gold = {
  main: '#8c6d1f',
  light: '#f7efd9',
  lighter: '#fbf6e9',
  dark: '#6f5516',
  darker: '#5a4512',
} as const;

/* On-colors — dark green-tinted ink for ink/teal surfaces */
const onSurface = '#1b332c';
const onSurfaceVariant = '#55685f';

/* Brown / neutral outline tones */
const outline = 'rgba(16, 40, 34, 0.12)';
const outlineVariant = 'rgba(16, 40, 34, 0.16)';

/* Shared surface ramp (MD3 light scheme tuned for a pale sage canvas) */
const surface = {
  default: '#f5f8f6',
  dim: '#e4ece8',
  bright: '#ffffff',
  containerLowest: '#ffffff',
  containerLow: '#eef4f1',
  container: '#e8efeb',
  containerHigh: '#e3ebe7',
  containerHighest: '#dce6e1',
};

/* Accent tokens — مستخلصة من الثيم لاستخدامها في البطاقات والمؤشرات */
export const accentTokens = {
  brand: '#0e8a72',
  air: '#2f6f9f',
  sea: '#8c6d1f',
  land: '#b3544b',
  health: '#7a5c9e',
  lab: '#0277bd',
} as const;

const ink = 'rgba(16, 40, 34, 0.08)';

/*
 * Glass surfaces — the core of the frosted-glass look.
 * Two stops keep the header readable over busy hero art while staying translucent.
 */
const glass = {
  bg: 'rgba(248, 252, 249, 0.72)',
  bgStrong: 'rgba(255, 255, 255, 0.86)',
  tint: 'rgba(238, 250, 246, 0.6)',
  blur: 'blur(20px) saturate(1.4)',
  border: ink,
  highlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.65)',
};

/* Soft, layered MD3-style elevation with a green-tinted ambient layer */
const elevation = {
  level0: 'none',
  level1: '0 1px 2px rgba(16,40,34,0.03), 0 2px 8px rgba(16,40,34,0.04)',
  level2: '0 2px 4px rgba(16,40,34,0.04), 0 10px 26px rgba(16,40,34,0.07)',
  level3: '0 6px 14px rgba(16,40,34,0.06), 0 18px 44px rgba(16,40,34,0.11)',
  level4: '0 10px 22px rgba(16,40,34,0.08), 0 26px 60px rgba(16,40,34,0.15)',
  level5: '0 14px 30px rgba(16,40,34,0.1), 0 34px 80px rgba(16,40,34,0.2)',
};

/* Radius system (px) — MD3 "medium" field → "extra-large" surfaces */
const radius = {
  xs: 10,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 36,
  pill: 999,
};

const focusRing = `0 0 0 3px ${alpha(brand.main, 0.5)}`;
const focusRingSoft = `0 0 0 4px ${alpha(brand.main, 0.16)}`;

const shadows: Shadows = [
  'none',
  elevation.level1,
  elevation.level1,
  elevation.level2,
  elevation.level2,
  elevation.level3,
  elevation.level3,
  elevation.level3,
  elevation.level4,
  elevation.level4,
  elevation.level4,
  elevation.level4,
  elevation.level4,
  elevation.level4,
  elevation.level4,
  elevation.level4,
  elevation.level4,
  elevation.level4,
  elevation.level4,
  elevation.level4,
  elevation.level4,
  elevation.level4,
  elevation.level5,
  elevation.level5,
  elevation.level5,
];

const theme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'light',
    primary: {
      main: brand.main,
      dark: brand.dark,
      darker: brand.darker,
      light: brand.light,
      lighter: brand.lighter,
      contrastText: '#ffffff',
    },
    secondary: {
      main: gold.main,
      light: gold.light,
      darker: gold.darker,
      dark: gold.dark,
      contrastText: '#4b3a10',
    },
    success: { main: '#1d7a54', light: '#e3f4ec', dark: '#145a3d' },
    info: { main: '#2f6dd0', light: '#e8f0fc', dark: '#1d4f9e' },
    warning: { main: '#a86400', light: '#fbf1e2', dark: '#7d4a00' },
    error: { main: '#c63a3a', light: '#fdeaea', dark: '#9c2626' },
    /* Legend: RTL Arabic + English both read well on these greys */
    grey: {
      50: '#f6faf8',
      100: '#eef5f2',
      200: '#dfeae5',
      300: '#c5d9d2',
      400: '#9fb8b0',
      500: '#78948b',
      600: '#57726a',
      700: '#3f584f',
      800: '#2b3f38',
      900: '#15221e',
    },
    text: {
      primary: onSurface,
      secondary: onSurfaceVariant,
      disabled: '#6a857c',
    },
    background: {
      default: surface.default,
      paper: surface.bright,
    },
    divider: ink,
    surface,
    outline: { main: outline, variant: outlineVariant },
    brand: {
      50: brand[50],
      100: brand[100],
      200: brand[200],
      300: brand[300],
      400: brand[400],
      500: brand[500],
      600: brand[600],
      700: brand[700],
      800: brand[800],
      900: brand[900],
    },
  },
  shape: { borderRadius: radius.sm },
  typography: {
    fontFamily: '"IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif',
    htmlFontSize: 16,
    /* Display */
    h1: { fontWeight: 800, fontSize: 'clamp(2.25rem, 4.5vw, 3.25rem)', lineHeight: 1.15, letterSpacing: '-0.02em' },
    h2: { fontWeight: 800, fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', lineHeight: 1.2, letterSpacing: '-0.01em' },
    h3: { fontWeight: 800, fontSize: 'clamp(1.375rem, 2.2vw, 1.875rem)', lineHeight: 1.28 },
    h4: { fontWeight: 800, fontSize: '1.375rem', lineHeight: 1.32 },
    h5: { fontWeight: 700, fontSize: '1.125rem', lineHeight: 1.36 },
    h6: { fontWeight: 700, fontSize: '1rem', lineHeight: 1.42 },
    /* Body */
    subtitle1: { fontWeight: 600, fontSize: '1.0625rem', lineHeight: 1.62 },
    subtitle2: { fontWeight: 600, fontSize: '0.9375rem', lineHeight: 1.6 },
    body1: { fontWeight: 400, fontSize: '1rem', lineHeight: 1.72 },
    body2: { fontWeight: 400, fontSize: '0.875rem', lineHeight: 1.7 },
    /* Labels */
    button: { fontWeight: 700, fontSize: '0.9375rem', letterSpacing: 0 },
    caption: { fontWeight: 500, fontSize: '0.8125rem', lineHeight: 1.55 },
    overline: { fontWeight: 700, fontSize: '0.75rem', lineHeight: 1.6, letterSpacing: '0.12em' },
  },
  shadows,
  components: {
    /* ------- Base ------- */
    MuiCssBaseline: {
      styleOverrides: {
        html: { colorScheme: 'light' },
        body: {
          minHeight: '100vh',
          color: onSurface,
          background:
            'radial-gradient(1100px 520px at 88% -8%, rgba(18,165,133,0.09), transparent 60%),' +
            'radial-gradient(900px 480px at -8% 112%, rgba(47,109,208,0.07), transparent 55%),' +
            'radial-gradient(760px 420px at 60% 118%, rgba(140,109,31,0.05), transparent 55%),' +
            surface.default,
          backgroundAttachment: 'fixed',
        },
        'img, svg, video': { display: 'block' },
        /* Numerals stay aligned in tables & stats */
        '.tabular': { fontVariantNumeric: 'tabular-nums' },
        '.text-balance': { textWrap: 'balance' },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: radius.md,
          border: '1px solid transparent',
          transition: 'box-shadow 200ms ease, transform 200ms ease, border-color 200ms ease',
        },
      },
    },
    /* ------- Surfaces (MD3 elevated cards) ------- */
    MuiCard: {
      styleOverrides: {
        root: {
          overflow: 'hidden',
          borderRadius: radius.lg,
          border: `1px solid ${glass.border}`,
          backgroundColor: glass.bgStrong,
          backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0))`,
          boxShadow: elevation.level2,
          backdropFilter: glass.blur,
          WebkitBackdropFilter: glass.blur,
          transition: 'transform 220ms cubic-bezier(0.22,1,0.36,1), box-shadow 220ms ease, border-color 220ms ease',
          '&:hover': {
            boxShadow: elevation.level3,
            borderColor: 'rgba(16,40,34,0.18)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: { root: { padding: 28, '&:last-child': { paddingBottom: 28 } } },
    },
    MuiCardActions: {
      styleOverrides: { root: { padding: '0 28px 24px' } },
    },
    MuiCardActionArea: {
      styleOverrides: {
        root: { borderRadius: 'inherit', '&.Mui-focusVisible': { boxShadow: focusRing } },
      },
    },
    /* ------- Buttons (MD3, min touch target 44px) ------- */
    MuiButton: {
      defaultProps: { disableElevation: false },
      styleOverrides: {
        root: {
          position: 'relative',
          textTransform: 'none',
          borderRadius: radius.md,
          fontWeight: 800,
          padding: '0.625rem 1.5rem',
          minHeight: 48,
          transition: 'transform 150ms ease, box-shadow 150ms ease, background-color 150ms ease, border-color 150ms ease',
          '&:hover': { transform: 'translateY(-1px)' },
          '&:active': { transform: 'translateY(0) scale(0.99)' },
          '&.Mui-focusVisible': { boxShadow: focusRing },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${brand[400]}, ${brand.main} 45%, ${brand.dark})`,
          boxShadow: `0 6px 18px -4px ${alpha(brand.main, 0.45)}`,
          '&:hover': {
            background: `linear-gradient(135deg, ${brand.main}, ${brand.dark} 60%, ${brand.darker})`,
            boxShadow: `0 10px 26px -6px ${alpha(brand.main, 0.55)}`,
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: '0 0 auto 0',
            height: '50%',
            borderRadius: 'inherit',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.22), transparent)',
            pointerEvents: 'none',
          },
        },
        containedSecondary: {
          /* MD3 tonal action — soft gold container, dark ink text */
          color: gold.dark,
          backgroundColor: gold.light,
          backgroundImage: 'none',
          boxShadow: 'none',
          '&:hover': {
            color: gold.darker,
            backgroundColor: alpha(gold.main, 0.16),
            boxShadow: 'none',
          },
        },
        containedError: {
          boxShadow: '0 6px 18px -4px rgba(198,58,58,0.45)',
          '&:hover': { boxShadow: '0 10px 26px -6px rgba(198,58,58,0.55)' },
        },
        outlined: {
          borderWidth: '1.5px',
          borderColor: 'rgba(16,40,34,0.3)',
          color: onSurface,
          backgroundColor: 'rgba(255,255,255,0.45)',
          backdropFilter: glass.blur,
          WebkitBackdropFilter: glass.blur,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
          '&:hover': { borderColor: brand.main, bgcolor: alpha(brand.main, 0.07) },
          '&.Mui-disabled': { backgroundColor: 'transparent' },
        },
        text: {
          borderRadius: radius.md,
          '&:hover': { bgcolor: alpha(brand.main, 0.08) },
        },
        sizeSmall: { minHeight: 40, padding: '0.375rem 1rem', borderRadius: radius.sm, fontSize: '0.875rem' },
        sizeLarge: { minHeight: 56, padding: '0.875rem 2rem', borderRadius: radius.lg, fontSize: '1rem' },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: radius.sm,
          transition: 'background-color 150ms ease, transform 150ms ease',
          '&:hover': { backgroundColor: alpha(brand.main, 0.08) },
          '&:active': { transform: 'scale(0.94)' },
          '&.Mui-focusVisible': { boxShadow: focusRing },
          '&.MuiIconButton-sizeMedium': { minWidth: 44, minHeight: 44 },
          '&.MuiIconButton-sizeSmall': { minWidth: 38, minHeight: 38 },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          textTransform: 'none',
          fontWeight: 700,
          minHeight: 44,
          border: '1px solid transparent',
          '&.Mui-selected': {
            bgcolor: brand.light,
            color: brand.dark,
            borderColor: alpha(brand.main, 0.3),
            boxShadow: elevation.level1,
          },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: { root: { borderRadius: radius.md, padding: 4, bgcolor: 'rgba(16,40,34,0.05)' } },
    },
    /* ------- Inputs & fields (MD3 outlined w/ soft fill) ------- */
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: radius.md,
            backgroundColor: 'rgba(255,255,255,0.7)',
            transition: 'box-shadow 150ms ease, border-color 150ms ease, background-color 150ms ease',
            '&.Mui-focused': {
              backgroundColor: 'rgba(255,255,255,0.95)',
              boxShadow: focusRingSoft,
            },
            '&.Mui-error.Mui-focused': { boxShadow: '0 0 0 4px rgba(198,58,58,0.14)' },
            '&:hover:not(.Mui-disabled) .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(16,40,34,0.38)' },
          },
          '& .MuiInputLabel-root': { fontWeight: 700 },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          backgroundColor: 'rgba(255,255,255,0.7)',
          '&.Mui-focused': {
            backgroundColor: 'rgba(255,255,255,0.95)',
            boxShadow: focusRingSoft,
          },
        },
        notchedOutline: { borderColor: outlineVariant, borderWidth: '1.5px' },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': { borderColor: outlineVariant },
        },
        input: { '&::placeholder': { opacity: 0.75 } },
      },
    },
    MuiSelect: {
      styleOverrides: { root: { borderRadius: radius.md } },
    },
    MuiInputLabel: {
      styleOverrides: { root: { fontWeight: 700 } },
    },
    MuiFormHelperText: {
      styleOverrides: { root: { marginTop: 6, fontSize: '0.75rem', fontWeight: 500 } },
    },
    MuiAutocomplete: {
      styleOverrides: {
        root: { '& .MuiOutlinedInput-root': { borderRadius: radius.md } },
        paper: { borderRadius: radius.lg, boxShadow: elevation.level3, border: `1px solid ${glass.border}` },
      },
    },
    /* ------- Selection surfaces ------- */
    MuiMenu: {
      styleOverrides: {
        list: { padding: 6 },
        paper: {
          borderRadius: radius.lg,
          boxShadow: elevation.level4,
          backgroundColor: glass.bgStrong,
          backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0))`,
          backdropFilter: glass.blur,
          WebkitBackdropFilter: glass.blur,
          border: `1px solid ${glass.border}`,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          margin: '0 4px',
          minHeight: 46,
          fontWeight: 600,
          '&.Mui-selected': { bgcolor: brand.light, color: brand.dark },
          '&:hover': { bgcolor: alpha(brand.main, 0.07) },
          '&.Mui-focusVisible': { boxShadow: focusRing },
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          borderRadius: radius.lg,
          boxShadow: elevation.level4,
          backgroundColor: glass.bgStrong,
          backdropFilter: glass.blur,
          WebkitBackdropFilter: glass.blur,
          border: `1px solid ${glass.border}`,
        },
      },
    },
    /* ------- Chips (MD3 assist/filter pill) ------- */
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          borderRadius: radius.pill,
          '&.Mui-focusVisible': { boxShadow: focusRing },
        },
        outlined: {
          backgroundColor: 'rgba(255,255,255,0.6)',
          borderColor: 'rgba(16,40,34,0.2)',
          '&:hover': { backgroundColor: alpha(brand.main, 0.06) },
        },
        filled: { backgroundColor: alpha(brand.main, 0.1), color: brand.dark, '&:hover': { backgroundColor: alpha(brand.main, 0.16) } },
        colorPrimary: { backgroundColor: brand.main, color: '#fff' },
        clickable: { '&:hover': { backgroundColor: alpha(brand.main, 0.1) } },
      },
    },
    MuiBadge: {
      styleOverrides: { badge: { borderRadius: radius.pill } },
    },
    MuiAvatar: {
      styleOverrides: {
        root: { fontWeight: 800, backgroundColor: brand[200], color: brand[900], '&.Mui-focusVisible': { boxShadow: focusRing } },
      },
    },
    /* ------- Lists / navigation ------- */
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          margin: '2px 8px',
          minHeight: 46,
          transition: 'background-color 150ms ease, color 150ms ease',
          '&:hover': { backgroundColor: alpha(brand.main, 0.07) },
          '&.Mui-selected': {
            backgroundColor: brand.light,
            color: brand.dark,
            boxShadow: elevation.level1,
            '&:hover': { backgroundColor: alpha(brand.main, 0.14) },
          },
          '&.Mui-focusVisible': { boxShadow: focusRing },
        },
      },
    },
    MuiListItemText: {
      styleOverrides: { primary: { fontSize: '0.875rem' }, secondary: { fontSize: '0.75rem' } },
    },
    MuiListItemIcon: {
      styleOverrides: { root: { minWidth: 40, color: 'inherit' } },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(250, 253, 252, 0.84)',
          backdropFilter: glass.blur,
          WebkitBackdropFilter: glass.blur,
          borderRight: `1px solid ${glass.border}`,
          boxShadow: elevation.level2,
        },
      },
    },
    /* ------- Tables (modern SaaS) ------- */
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: radius.lg,
          border: `1px solid ${glass.border}`,
          boxShadow: elevation.level1,
          backgroundColor: 'rgba(255,255,255,0.85)',
          backdropFilter: glass.blur,
          WebkitBackdropFilter: glass.blur,
          overflowX: 'auto',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: 'rgba(16,40,34,0.04)',
            fontWeight: 800,
            fontSize: '0.75rem',
            letterSpacing: 0.03,
            color: onSurfaceVariant,
            borderBottomColor: 'rgba(16,40,34,0.12)',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 800, backgroundColor: 'rgba(16,40,34,0.04)', fontSize: '0.8125rem' },
        root: { borderBottomColor: 'rgba(16,40,34,0.08)', fontSize: '0.875rem', py: '0.9rem' },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 150ms ease',
          '&:hover': { backgroundColor: alpha(brand.main, 0.045) },
          '&:last-child td': { borderBottom: 0 },
        },
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        toolbar: { flexWrap: 'wrap', gap: 8, minHeight: 64, padding: '0 12px' },
        select: { borderRadius: radius.sm },
      },
    },
    /* ------- Tabs (MD3 segmented pill) ------- */
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 48,
          '& .MuiTabs-indicator': { display: 'none' },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 800,
          borderRadius: radius.md,
          minHeight: 44,
          padding: '6px 18px',
          margin: '2px 4px',
          color: onSurfaceVariant,
          transition: 'background-color 180ms ease, box-shadow 180ms ease, color 180ms ease',
          '&.Mui-selected': {
            bgcolor: 'rgba(255,255,255,0.9)',
            color: brand.dark,
            boxShadow: elevation.level2,
            border: `1px solid ${glass.border}`,
          },
          '&.Mui-focusVisible': { boxShadow: focusRing },
        },
      },
    },
    /* ------- App bars ------- */
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: glass.bg,
          backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.45), rgba(255,255,255,0))`,
          backdropFilter: glass.blur,
          WebkitBackdropFilter: glass.blur,
          boxShadow: elevation.level1,
          borderBottom: `1px solid ${glass.border}`,
          color: onSurface,
        },
      },
    },
    MuiToolbar: {
      styleOverrides: { root: { minHeight: 70, '@media (min-width:600px)': { minHeight: 70 } } },
    },
    /* ------- Overlays ------- */
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: radius.xl, boxShadow: elevation.level5, backgroundImage: 'none' } },
    },
    MuiBackdrop: {
      styleOverrides: { root: { backgroundColor: 'rgba(15, 33, 28, 0.4)', backdropFilter: 'blur(4px)' } },
    },
    MuiDialogTitle: { styleOverrides: { root: { padding: 28, paddingBottom: 12 } } },
    MuiDialogContent: { styleOverrides: { root: { padding: '8px 28px' } } },
    MuiDialogActions: {
      styleOverrides: { root: { padding: '16px 28px 28px', gap: 8, '& > .MuiButton-root': { minWidth: 100 } } },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: radius.lg, fontWeight: 600 },
        outlined: { backgroundColor: 'rgba(255,255,255,0.6)' },
        filledError: { boxShadow: '0 10px 24px rgba(198,58,58,0.28)' },
      },
    },
    MuiSkeleton: {
      styleOverrides: { root: { backgroundColor: 'rgba(16,40,34,0.08)', borderRadius: radius.sm } },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: 'rgba(16,40,34,0.08)' } },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: '#223a32', borderRadius: radius.sm, fontSize: '0.7812rem', fontWeight: 600, boxShadow: elevation.level3 },
        arrow: { color: '#223a32' },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: { root: { borderRadius: radius.md, backgroundColor: '#223a32', boxShadow: elevation.level4 } },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { height: 8, borderRadius: radius.pill, backgroundColor: 'rgba(16,40,34,0.08)' },
        bar: { borderRadius: radius.pill },
        barColorPrimary: { backgroundImage: `linear-gradient(90deg, ${brand.dark}, ${brand[400]})` },
      },
    },
    MuiCircularProgress: {
      styleOverrides: { root: { '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } } },
    },
    /* ------- Form controls ------- */
    MuiSwitch: {
      styleOverrides: {
        root: { width: 52, height: 32, padding: 3 },
        switchBase: { padding: 4, '&.Mui-focusVisible': { boxShadow: `0 0 0 6px ${alpha(brand.main, 0.25)}` } },
        track: { borderRadius: radius.pill, backgroundColor: 'rgba(16,40,34,0.24)', opacity: 1 },
        thumb: { boxShadow: elevation.level2, width: 24, height: 24 },
        colorPrimary: {
          '&.Mui-checked': { color: '#fff' },
          '&.Mui-checked + .MuiSwitch-track': { backgroundColor: brand.main, opacity: 1 },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: { root: { borderRadius: radius.sm, '&.Mui-focusVisible': { boxShadow: focusRing } } },
    },
    MuiRadio: {
      styleOverrides: { root: { borderRadius: '50%', '&.Mui-focusVisible': { boxShadow: focusRing } } },
    },
    MuiSlider: {
      styleOverrides: { root: { color: brand.main, height: 6, '& .MuiSlider-thumb': { width: 20, height: 20 } } },
    },
    MuiRating: {
      styleOverrides: { root: { color: gold.main } },
    },
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          borderRadius: radius.sm,
          minWidth: 40,
          height: 40,
          fontWeight: 800,
          border: '1px solid transparent',
          '&.Mui-selected': {
            bgcolor: brand.main,
            color: '#fff',
            boxShadow: `0 6px 14px -4px ${alpha(brand.main, 0.5)}`,
          },
          '&.Mui-focusVisible': { boxShadow: focusRing },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          boxShadow: elevation.level3,
          '&:hover': { boxShadow: elevation.level4, transform: 'translateY(-2px)' },
          '&.Mui-focusVisible': { boxShadow: focusRing },
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: radius.lg,
          boxShadow: elevation.level1,
          border: `1px solid ${glass.border}`,
          '&:before': { display: 'none' },
          '&.Mui-expanded': { margin: 0, boxShadow: elevation.level2 },
        },
      },
    },
    MuiAccordionSummary: { styleOverrides: { root: { borderRadius: radius.lg, minHeight: 56 } } },
    MuiBreadcrumbs: { styleOverrides: { li: { a: { fontWeight: 600 } } } },
  },
});

export default theme;