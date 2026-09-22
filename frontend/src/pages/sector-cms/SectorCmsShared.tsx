import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link as RouterLink, Outlet, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { getSectors } from '../../api/endpoints/public';
import type { Sector } from '../../api/endpoints/public';
import { usePageTitle as sharedUsePageTitle } from '../../hooks/usePageTitle';

export type SectorSiteSector = Sector | null;

export type SectorSiteCtx = { sector: SectorSiteSector; slug: string; loading: boolean };

const SectorSiteContext = createContext<SectorSiteCtx>({
  sector: null,
  slug: 'red-sea',
  loading: true,
});

export const SectorSiteProvider = ({ children }: { children: ReactNode }) => {
  const params = useParams<{ sectorCode: string }>();
  const slug = params.sectorCode ?? 'red-sea';
  const [sector, setSector] = useState<SectorSiteSector>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSectors()
      .then((res) => {
        const all = res.data.data ?? [];
        const found = all.find((s) => s.slug === slug) ?? all.find((s) => s.code.toLowerCase() === slug);
        setSector(found ?? null);
      })
      .catch(() => setSector(null))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <SectorSiteContext.Provider value={{ sector, slug, loading }}>{children}</SectorSiteContext.Provider>
  );
};

export const useSectorSite = () => useContext(SectorSiteContext);

export const sectorBareName = (name_ar?: string | null) =>
  (name_ar ?? '').replace(/^(قطاع|القطاع)\s+/, '');

export const SectorCmsLayout = () => (
  <SectorSiteProvider>
    <Outlet />
  </SectorSiteProvider>
);

export const SectorBreadcrumbs = ({ current }: { current?: string }) => {
  const { sector, slug } = useSectorSite();
  const sectorLabel = sector?.name_ar ?? 'القطاع';
  return (
    <Breadcrumbs aria-label="مسار التنقل" sx={{ mb: 2.5 }}>
      <Link component={RouterLink} to="/" underline="hover" color="inherit" sx={{ fontWeight: 600 }}>
        الرئيسية
      </Link>
      <Link component={RouterLink} to="/sectors" underline="hover" color="inherit" sx={{ fontWeight: 600 }}>
        القطاعات
      </Link>
      {current ? (
        <>
          <Link component={RouterLink} to={`/sector/${slug}`} underline="hover" color="inherit" sx={{ fontWeight: 600 }}>
            {sectorLabel}
          </Link>
          <Typography color="text.primary" sx={{ fontWeight: 700 }}>
            {current}
          </Typography>
        </>
      ) : (
        <Typography color="text.primary" sx={{ fontWeight: 700 }}>
          {sectorLabel}
        </Typography>
      )}
    </Breadcrumbs>
  );
};

export const SectorHomeLink = ({ current }: { current?: string }) => <SectorBreadcrumbs current={current} />;

export const SectorPageShell = ({ children }: { children: ReactNode }) => (
  <Box sx={{ minHeight: '60vh' }}>
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {children}
    </Container>
  </Box>
);

export const ErrorNotice = ({ title = 'تعذّر التحميل' }: { title?: string }) => (
  <Paper role="alert" sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
    <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
      لم نتمكن من جلب البيانات. يرجى المحاولة لاحقاً.
    </Typography>
  </Paper>
);

export const NEWS_CATEGORY_LABELS: Record<string, string> = {
  GENERAL: 'عام',
  HEALTH: 'صحي',
  TRAVEL: 'سفر',
  OFFICIAL: 'رسمي',
};

export const usePageTitle = sharedUsePageTitle;
