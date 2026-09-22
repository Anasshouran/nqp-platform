export const CMS_SECTOR_SLUGS: readonly string[] = ['red-sea', 'khartoum'];

export const SECTOR_DASHBOARD_ROUTES: Record<string, string> = {
  'red-sea': '/dashboard/sector/red-sea',
  khartoum: '/dashboard/sector/khartoum',
};

export const isCmsSector = (slug?: string) => !!slug && CMS_SECTOR_SLUGS.includes(slug);

export const sectorDashboardRoute = (slug?: string) =>
  slug ? SECTOR_DASHBOARD_ROUTES[slug] : undefined;