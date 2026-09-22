import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  align?: 'right' | 'center';
  light?: boolean;
}

const SectionTitle = ({ title, subtitle, align = 'right', light = false }: SectionTitleProps) => (
  <Box sx={{ textAlign: align, mb: 4 }}>
    <Typography
      variant="h2"
      component="h2"
      sx={{
        fontWeight: 700,
        color: light ? '#fff' : 'text.primary',
        position: 'relative',
        display: 'inline-block',
        '&::before': {
          content: '""',
          position: 'absolute',
          right: align === 'center' ? '50%' : 0,
          transform: align === 'center' ? 'translateX(50%)' : 'none',
          bottom: -10,
          width: 44,
          height: 4,
          borderRadius: 2,
          background: (t) => `linear-gradient(90deg, ${t.palette.primary.main}, ${t.palette.secondary.main})`,
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          right: align === 'center' ? 'calc(50% + 56px)' : 56,
          transform: align === 'center' ? 'translateX(50%)' : 'none',
          bottom: -7,
          width: 26,
          height: 2,
          borderRadius: 2,
          background: (t) => `linear-gradient(90deg, ${t.palette.secondary.main}, transparent)`,
          opacity: 0.8,
        },
      }}
    >
      {title}
    </Typography>
    <Box
      aria-hidden
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        mt: 2.5,
        width: '100%',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
      }}
    >
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          className="pulse-dot"
          sx={(t) => ({
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: i === 1 ? t.palette.secondary.main : t.palette.primary.main,
            boxShadow:
              i === 1
                ? `0 0 10px ${t.palette.secondary.main}E6`
                : `0 0 10px ${t.palette.primary.main}CC`,
            animationDelay: `${i * 0.25}s`,
          })}
        />
      ))}
    </Box>
    {subtitle && (
      <Typography
        variant="body1"
        sx={{
          mt: 2,
          color: light ? 'rgba(255,255,255,0.75)' : 'text.secondary',
          maxWidth: 620,
          mx: align === 'center' ? 'auto' : 0,
        }}
      >
        {subtitle}
      </Typography>
    )}
  </Box>
);

export default SectionTitle;
