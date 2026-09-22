import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const PageLoader = () => (
  <Box
    sx={{
      minHeight: '62vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    }}
  >
    <Box sx={{ position: 'relative', width: 88, height: 88 }}>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '3px solid',
          borderColor: 'rgba(14,138,114,0.18)',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '3px solid transparent',
          borderTopColor: 'primary.main',
          borderLeftColor: 'primary.light',
          animation: 'spinRing 1.1s cubic-bezier(0.5,0.1,0.4,1) infinite',
          animationName: 'spinRing',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 12,
          borderRadius: '50%',
          border: '3px solid transparent',
          borderBottomColor: '#c8a13a',
          animation: 'spinRing 1.8s linear infinite reverse',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 30,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #0e8a72, #10b3a0)',
          animation: 'spinGlow 2s ease-in-out infinite',
        }}
      />
    </Box>
    <Box sx={{ textAlign: 'center' }}>
      <Typography
        variant="body1"
        fontWeight={800}
        sx={{
          fontSize: '1.05rem',
          letterSpacing: 0.5,
          animation: 'shimmerText 2.2s linear infinite',
          background: 'linear-gradient(90deg,#0a6b58 25%,#10b3a0 40%,#0a6b58 55%)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
        }}
      >
        جارٍ تحميل المنصة
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        الإدارة الاتحادية للحجر الصحي
      </Typography>
    </Box>
  </Box>
);

export default PageLoader;
