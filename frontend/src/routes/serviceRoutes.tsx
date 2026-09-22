import { lazy } from 'react';
import { Route } from 'react-router-dom';

/**
 * خرائط المسارات التفصيلية (العميقة) إلى أكواد الخدمات في الكتالوج.
 * تتطابق مع قيم Service.code المزروعة في seed_services.
 */
const DEEP_SERVICE_ROUTES: Record<string, string> = {
  '/services/travelers': 'traveler-registration',
  '/services/travelers/registration': 'traveler-registration',
  '/services/travelers/declaration': 'traveler-declaration',
  '/services/travelers/trip': 'traveler-trip-data',
  '/services/travelers/documents': 'traveler-documents',
  '/services/travelers/vaccinations': 'traveler-vaccines',
  '/services/travelers/qr': 'traveler-qr',
  '/services/travelers/tracking': 'traveler-tracking',
  '/services/travelers/amend': 'traveler-amend',

  '/services/food-safety': 'food-import',
  '/services/food-safety/import': 'food-import',
  '/services/food-safety/export': 'food-export',
  '/services/food-safety/inspection': 'food-inspection',
  '/services/food-safety/sampling': 'food-sampling',
  '/services/food-safety/laboratory': 'food-laboratory',
  '/services/food-safety/certificates': 'food-certificates',
  '/services/food-safety/fees': 'food-fees',
  '/services/food-safety/track-shipment': 'food-tracking',
  '/services/food-safety/release-decision': 'food-release',

  '/services/carriers': 'carrier-portal',
  '/services/carriers/flights': 'carrier-flights',
  '/services/carriers/manifest': 'carrier-manifest',
  '/services/carriers/crew': 'carrier-crew',
  '/services/carriers/integration': 'carrier-integration',
  '/services/carriers/api': 'carrier-api',

  '/services/point-of-entry-health': 'poe-airport',
  '/services/point-of-entry-health/airport': 'poe-airport',
  '/services/point-of-entry-health/port': 'poe-port',
  '/services/point-of-entry-health/land': 'poe-land',

  '/services/vector-control': 'vector-info',
  '/services/vector-control/guidelines': 'vector-guidelines',
  '/services/vector-control/alerts': 'vector-alerts',
  '/services/vector-control/info': 'vector-general',

  '/services/surveillance': 'surveillance-alerts',
  '/services/surveillance/alerts': 'surveillance-alerts',
  '/services/surveillance/events': 'surveillance-events',
  '/services/surveillance/diseases': 'surveillance-diseases',
  '/services/surveillance/reports': 'surveillance-reports',

  '/services/laboratory': 'lab-sample-lookup',
  '/services/laboratory/sample-lookup': 'lab-sample-lookup',
  '/services/laboratory/analysis-status': 'lab-analysis-status',
  '/services/laboratory/results': 'lab-results',
  '/services/laboratory/reports': 'lab-reports',

  '/services/government': 'gov-verify',
  '/services/government/verify': 'gov-verify',
  '/services/government/release-decisions': 'gov-release',
  '/services/government/shipments': 'gov-shipments',
  '/services/government/data-exchange': 'gov-data-exchange',
  '/services/government/api': 'gov-api',
  '/services/government/reports': 'gov-reports',

  // الخدمات العامة والتحقق (تُفتح داخل أدوات التحقق الذكية المحفوظة)
  '/services/verify/lookup': 'public-lookup',
  '/services/verify/qr': 'public-verify-qr',
  '/services/verify/certificate': 'public-verify-certificate',
  '/services/verify/notices': 'public-notifications',
  '/services/verify/assistant': 'public-assistant',

  // المساعد الذكي (خدمة مستقلة)
  '/services/assistant': 'assistant',
};

export const serviceCodeForPath = (path: string): string | undefined =>
  DEEP_SERVICE_ROUTES[path];

const ServicePageLazy = lazy(() => import('../pages/public/ServicePage'));
const AssistantPageLazy = lazy(() => import('../pages/public/AssistantPage'));
const LabResultsLookupPageLazy = lazy(() => import('../pages/public/LabResultsLookupPage'));
const VectorServicesPageLazy = lazy(() => import('../pages/public/VectorServicesPage'));

// صفحة المساعد الذكي المخصصة (تُعرض مباشرة بدل صفحة الخدمة العامة)
export const assistantRoute = (
  <Route path="/services/assistant" element={<AssistantPageLazy />} />
);

// صفحة استعلام نتائج التحاليل المعتمدة (خدمة حقيقية مباشرة بدل صفحة الوصف العام)
export const labResultsRoute = (
  <Route path="/services/laboratory/results" element={<LabResultsLookupPageLazy />} />
);

// صفحات محتوى مكافحة النواقل (إرشادات/تنبيهات/معلومات) بدل صفحة الوصف العام
export const vectorControlRoutes = (
  <>
    <Route path="/services/vector-control" element={<VectorServicesPageLazy variant="info" />} />
    <Route path="/services/vector-control/guidelines" element={<VectorServicesPageLazy variant="guidelines" />} />
    <Route path="/services/vector-control/alerts" element={<VectorServicesPageLazy variant="alerts" />} />
    <Route path="/services/vector-control/info" element={<VectorServicesPageLazy variant="general" />} />
  </>
);

const DEEP_VECTOR_PATHS = new Set([
  '/services/vector-control',
  '/services/vector-control/guidelines',
  '/services/vector-control/alerts',
  '/services/vector-control/info',
]);

export const deepServiceRoutes = Object.entries(DEEP_SERVICE_ROUTES)
  .filter(
    ([path]) =>
      path !== '/services/assistant' &&
      path !== '/services/laboratory/results' &&
      !DEEP_VECTOR_PATHS.has(path),
  )
  .map(([path, code]) => (
    <Route key={path} path={path} element={<ServicePageLazy key={code} serviceCode={code} />} />
  ));

export { ServicePageLazy as ServicePage, AssistantPageLazy as AssistantPage };
