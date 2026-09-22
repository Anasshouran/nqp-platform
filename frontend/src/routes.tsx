import { Suspense, lazy, type ReactNode } from 'react';
import { Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import TravelerProtectedRoute from './components/TravelerProtectedRoute';
import PageLoader from './components/common/PageLoader';
import PublicLayout from './components/layouts/PublicLayout';
import RoleLayout from './components/layouts/RoleLayout';
import { SectorPortalProvider, SectorPortalLayout } from './components/sectors/SectorPortalLayout';
import { SectorSiteProvider } from './pages/sector-cms/SectorCmsShared';
import { LabSectorProvider } from './hooks/useLabSectors';
import { isCmsSector } from './config/cmsSectors';
import {
  deepServiceRoutes,
  assistantRoute,
  labResultsRoute,
  vectorControlRoutes,
} from './routes/serviceRoutes';

const HomePage = lazy(() => import('./pages/public/HomePage'));
const NotFoundPage = lazy(() => import('./pages/public/NotFoundPage'));
const AboutPage = lazy(() => import('./pages/public/AboutPage'));
const GatewayHubPage = lazy(() => import('./pages/public/GatewayHubPage'));
const SectorDetailPage = lazy(() => import('./pages/public/SectorDetailPage'));
const PortDetailPage = lazy(() => import('./pages/public/PortDetailPage'));
const VerifyPage = lazy(() => import('./pages/public/VerifyPage'));
const CircularsPage = lazy(() => import('./pages/public/CircularsPage'));
const CircularDetailPage = lazy(() => import('./pages/public/CircularDetailPage'));
const NewsPage = lazy(() => import('./pages/public/NewsPage'));
const NewsDetailPage = lazy(() => import('./pages/public/NewsDetailPage'));
const DirectorPage = lazy(() => import('./pages/public/DirectorPage'));
const DiseasePage = lazy(() => import('./pages/public/DiseasePage'));
const FaqPage = lazy(() => import('./pages/public/FaqPage'));
const DocumentsPage = lazy(() => import('./pages/public/DocumentsPage'));
const NoticesPage = lazy(() => import('./pages/public/NoticesPage'));
const IndicatorsPage = lazy(() => import('./pages/public/IndicatorsPage'));
const TravelRequirementsPage = lazy(() => import('./pages/public/TravelRequirementsPage'));
const ContactPage = lazy(() => import('./pages/public/ContactPage'));
const SmartServicesPage = lazy(() => import('./pages/public/SmartServicesPage'));
const PartnersPage = lazy(() => import('./pages/public/PartnersPage'));
const ServicesCatalogPage = lazy(() => import('./pages/public/ServicesCatalogPage'));
const SectorsPortsPage = lazy(() => import('./pages/public/SectorsPortsPage'));
const PrivacyPage = lazy(() => import('./pages/public/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/public/TermsPage'));
const PreRegistrationPage = lazy(() => import('./pages/traveler/PreRegistrationPage'));
const TravelerLoginPage = lazy(() => import('./pages/traveler/TravelerLoginPage'));
const TravelerSignupPage = lazy(() => import('./pages/traveler/TravelerSignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/traveler/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/traveler/ResetPasswordPage'));
const TravelerDashboardPage = lazy(() => import('./pages/traveler/TravelerDashboardPage'));
const RequestTrackingPage = lazy(() => import('./pages/traveler/RequestTrackingPage'));
const UploadDocumentsPage = lazy(() => import('./pages/traveler/UploadDocumentsPage'));
const HealthProfilePage = lazy(() => import('./pages/traveler/HealthProfilePage'));
const LoginPage = lazy(() => import('./pages/login/LoginPage'));
const StaffForgotPasswordPage = lazy(() => import('./pages/login/ForgotPasswordPage'));
const StaffResetPasswordPage = lazy(() => import('./pages/login/ResetPasswordPage'));
const AppHomeRoute = lazy(() => import('./pages/dashboard/AppHomeRoute'));
const PortOfficerDashboardPage = lazy(() => import('./pages/portofficer/PortOfficerDashboardPage'));
const UsersPage = lazy(() => import('./pages/users/UsersPage'));
const RolesPage = lazy(() => import('./pages/roles/RolesPage'));
const RoleAssignmentsPage = lazy(() => import('./pages/roles/RoleAssignmentsPage'));
const TravelersPage = lazy(() => import('./pages/travelers/TravelersPage'));
const ScreeningPage = lazy(() => import('./pages/screening/ScreeningPage'));
const LaboratoryPage = lazy(() => import('./pages/laboratory/LaboratoryPage'));
const NationalLabDashboard = lazy(() => import('./pages/laboratory/NationalLabDashboard'));
const FoodPage = lazy(() => import('./pages/food/FoodPage'));
const ShipmentWorkflowPage = lazy(() => import('./pages/food/ShipmentWorkflowPage'));
const FoodOpsPage = lazy(() => import('./pages/food/FoodOpsPage'));
const FoodLabPage = lazy(() => import('./pages/foodlab/FoodLabPage'));
const LabPricingPage = lazy(() => import('./pages/foodlab/LabPricingPage'));
const ChemistryLabPage = lazy(() => import('./pages/foodlab/ChemistryLabPage'));
const AccountPage = lazy(() => import('./pages/profile/ProfilePage'));
const ChemistryAnalystPage = lazy(() => import('./pages/foodlab/ChemLabPage'));
const ChemistryAnalystDashboard = lazy(() => import('./pages/chemistry/ChemistryAnalystDashboard'));
const ChemistrySampleDetails = lazy(() => import('./pages/chemistry/ChemistrySampleDetails'));
const ChemistryAnalysisExecution = lazy(() => import('./pages/chemistry/ChemistryAnalysisExecution'));
const ChemistryQCScreen = lazy(() => import('./pages/chemistry/ChemistryQCScreen'));

const ChemistryRoute = () => {
  const { user } = useAuth();
  if (user?.role === 'LAB_TECHNICIAN') return withSuspense(<ChemistryAnalystPage />);
  return withSuspense(<ChemistryLabPage />);
};

const ChemistryAnalystRoute = () => {
  const { user } = useAuth();
  const role = user?.role;
  if (role !== 'LAB_TECHNICIAN' && role !== 'CHEM_ANALYST') {
    return withSuspense(<ChemistryLabPage />);
  }
  return withSuspense(<ChemistryAnalystDashboard />);
};
const MicrobiologyLabPage = lazy(() => import('./pages/foodlab/MicrobiologyLabPage'));
const MicrobiologyAnalystDashboard = lazy(() => import('./pages/microbiology/MicrobiologyAnalystDashboard'));
const QualityAssurancePage = lazy(() => import('./pages/quality/QualityAssurancePage'));
const LaboratoryDirectorPage = lazy(() => import('./pages/labdirector/LaboratoryDirectorPage'));
const ReagentsPage = lazy(() => import('./pages/reagents/ReagentsPage'));
const StandardsReviewPage = lazy(() => import('./pages/standards/StandardsReviewPage'));
const ReceptionLabPage = lazy(() => import('./pages/foodlab/ReceptionLabPage'));
const EmergencyPage = lazy(() => import('./pages/emergency/EmergencyPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const ClinicPage = lazy(() => import('./pages/clinic/ClinicPage'));
const ClinicDashboardPage = lazy(() => import('./pages/clinic/ClinicDashboardPage'));
const ClinicRegisterPage = lazy(() => import('./pages/clinic/RegisterPatientPage'));
const IsolationPage = lazy(() => import('./pages/clinic/IsolationPage'));
const VisitDetailPage = lazy(() => import('./pages/clinic/VisitDetailPage'));
const ClinicMedicationsPage = lazy(() => import('./pages/clinic/MedicationsPage'));
const CertificatesPage = lazy(() => import('./pages/clinic/CertificatesPage'));
const CertificateVerifyPage = lazy(() => import('./pages/public/CertificateVerifyPage'));
const VaccineCertificateVerifyPage = lazy(() => import('./pages/public/VaccineCertificateVerifyPage'));
const VaccinationDashboardPage = lazy(() => import('./pages/vaccination/VaccinationDashboardPage'));
const RegisterVaccinationPage = lazy(() => import('./pages/vaccination/RegisterVaccinationPage'));
const VaccinationRecordsPage = lazy(() => import('./pages/vaccination/VaccinationRecordsPage'));
const VaccinationCertificatesPage = lazy(() => import('./pages/vaccination/VaccinationCertificatesPage'));
const VaccinesPage = lazy(() => import('./pages/vaccination/VaccinesPage'));
const BatchesInventoryPage = lazy(() => import('./pages/vaccination/BatchesInventoryPage'));
const VaccinationSitesPage = lazy(() => import('./pages/vaccination/VaccinationSitesPage'));
const ClinicLabPage = lazy(() => import('./pages/clinic/LabPage'));
const CarriersPage = lazy(() => import('./pages/carriers/CarriersPage'));
const CarrierDashboardPage = lazy(() => import('./pages/carriers/CarrierDashboardPage'));
const CarrierCompanyPage = lazy(() => import('./pages/carriers/CarrierCompanyPage'));
const RiskPage = lazy(() => import('./pages/risk/RiskPage'));
const IntegrationPage = lazy(() => import('./pages/integration/IntegrationPage'));
const WhoDashboardPage = lazy(() => import('./pages/integration/who/WhoDashboardPage'));
const IhrEventsPage = lazy(() => import('./pages/integration/who/IhrEventsPage'));
const SparPage = lazy(() => import('./pages/integration/who/SparPage'));
const DiseaseSyncPage = lazy(() => import('./pages/integration/who/DiseaseSyncPage'));
const DbAdminPage = lazy(() => import('./pages/dbadmin/DbAdminPage'));
const OrgStructurePage = lazy(() => import('./pages/organization/OrgStructurePage'));
const PortHealthPage = lazy(() => import('./pages/porthealth/PortHealthPage'));
const VectorControlPage = lazy(() => import('./pages/vectorcontrol/VectorControlPage'));
const DeveloperPortalPage = lazy(() => import('./pages/developer/DeveloperPortalPage'));
const UiKitPage = lazy(() => import('./pages/uikit/UiKitPage'));
const HealthDashboardPage = lazy(() => import('./pages/health/HealthDashboardPage'));
const QuarantineDirectorPage = lazy(() => import('./pages/director/QuarantineDirectorPage'));
const NationalCommandPage = lazy(() => import('./pages/director/NationalCommandPage'));
const SectorManagerPage = lazy(() => import('./pages/sector/SectorManagerPage'));
const RedSeaCommandPage = lazy(() => import('./pages/redsea/RedSeaCommandPage'));
const RedSeaPortalHome = lazy(() => import('./pages/redsea/portal/RedSeaPortalHome'));
const RedSeaPointsPage = lazy(() => import('./pages/redsea/portal/modules/RedSeaPointsPage'));
const RedSeaPortHealthPage = lazy(() => import('./pages/redsea/portal/modules/RedSeaPortHealthPage'));
const RedSeaAirportHealthPage = lazy(() => import('./pages/redsea/portal/modules/RedSeaAirportHealthPage'));
const RedSeaFoodSafetyPage = lazy(() => import('./pages/redsea/portal/modules/RedSeaFoodSafetyPage'));
const RedSeaFoodLabPage = lazy(() => import('./pages/redsea/portal/modules/RedSeaFoodLabPage'));
const RedSeaStationPortalPage = lazy(() => import('./pages/redsea/portal/modules/RedSeaStationPortalPage'));
const FoodWindowPage = lazy(() => import('./pages/foodWindow/FoodWindowPage'));
const RedSeaVectorControlPage = lazy(() => import('./pages/redsea/portal/modules/RedSeaVectorControlPage'));
const RedSeaSurveillancePage = lazy(() => import('./pages/redsea/portal/modules/RedSeaSurveillancePage'));
const RedSeaStaffPage = lazy(() => import('./pages/redsea/portal/modules/RedSeaStaffPage'));
const RedSeaReportsPage = lazy(() => import('./pages/redsea/portal/modules/RedSeaReportsPage'));
const RedSeaContentPage = lazy(() => import('./pages/redsea/portal/content/RedSeaContentPage'));
const RedSeaItAdminPage = lazy(() => import('./pages/redsea/portal/it/RedSeaItAdminPage'));
const RedSeaItSystemsPage = lazy(() => import('./pages/redsea/portal/it/RedSeaItSystemsPage'));
const RedSeaItAssetsPage = lazy(() => import('./pages/redsea/portal/it/RedSeaItAssetsPage'));
const RedSeaItTicketsPage = lazy(() => import('./pages/redsea/portal/it/RedSeaItTicketsPage'));
const RedSeaItNetworksPage = lazy(() => import('./pages/redsea/portal/it/RedSeaItNetworksPage'));
const RedSeaItReportsPage = lazy(() => import('./pages/redsea/portal/it/RedSeaItReportsPage'));
const KhartoumPortalHome = lazy(() => import('./pages/sector-content/KhartoumPortalHome'));
const KhartoumContentPage = lazy(() => import('./pages/sector-content/KhartoumContentPage'));
const SectorCmsHome = lazy(() => import('./pages/sector-cms/SectorCmsHome'));
const SectorCmsAbout = lazy(() => import('./pages/sector-cms/SectorCmsAbout'));
const SectorCmsDirector = lazy(() => import('./pages/sector-cms/SectorCmsDirector'));
const SectorCmsDocuments = lazy(() => import('./pages/sector-cms/SectorCmsDocuments'));
const SectorCmsPorts = lazy(() => import('./pages/sector-cms/SectorCmsPorts'));
const SectorCmsPortDetail = lazy(() => import('./pages/sector-cms/SectorCmsPortDetail'));
const SectorCmsServices = lazy(() => import('./pages/sector-cms/SectorCmsServices'));
const SectorCmsFoodSafety = lazy(() => import('./pages/sector-cms/SectorCmsFoodSafety'));
const SectorCmsVectorControl = lazy(() => import('./pages/sector-cms/SectorCmsVectorControl'));
const SectorCmsCirculars = lazy(() => import('./pages/sector-cms/SectorCmsCirculars'));
const SectorCmsCircularDetail = lazy(() => import('./pages/sector-cms/SectorCmsCircularDetail'));
const SectorCmsTravelRequirements = lazy(() => import('./pages/sector-cms/SectorCmsTravelRequirements'));
const SectorCmsNews = lazy(() => import('./pages/sector-cms/SectorCmsNews'));
const SectorCmsNewsDetail = lazy(() => import('./pages/sector-cms/SectorCmsNewsDetail'));
const SectorCmsContact = lazy(() => import('./pages/sector-cms/SectorCmsContact'));
const SectorCmsStatistics = lazy(() => import('./pages/sector-cms/SectorCmsStatistics'));
const SectorCmsFaq = lazy(() => import('./pages/sector-cms/SectorCmsFaq'));
const ClerkDashboardPage = lazy(() => import('./pages/clerk/ClerkDashboardPage'));
const AccountantDashboardPage = lazy(() => import('./pages/accountant/AccountantDashboardPage'));
const NationalFinancePage = lazy(() => import('./pages/finance/NationalFinancePage'));
const StationManagerDashboardPage = lazy(() => import('./pages/sectionhead/SectionHeadDashboardPage'));
const SectorHeadDashboardPage = lazy(() => import('./pages/sectorhead/SectorHeadDashboardPage'));
const InspectorDashboardPage = lazy(() => import('./pages/inspector/InspectorDashboardPage'));
const QuarantineInspectorPage = lazy(() => import('./pages/quarantine/QuarantineInspectorPage'));
const EpidemicDashboardPage = lazy(() => import('./pages/emergency/EpidemicDashboardPage'));
const SurveillanceModulePage = lazy(() => import('./pages/surveillance/SurveillanceModulePage'));
const FoodSurveillancePage = lazy(() => import('./pages/foodsurveillance/FoodSurveillancePage'));
const FoodDirectorPage = lazy(() => import('./pages/fooddirector/FoodDirectorPage'));
const AirportDirectorPage = lazy(() => import('./pages/airportdirector/AirportDirectorPage'));
const AirportOpsPage = lazy(() => import('./pages/airport/AirportPage'));
const QuarantineFeesPage = lazy(() => import('./pages/food/QuarantineFeesPage'));
const AirportHealthPage = lazy(() => import('./pages/airporthealth/AirportHealthPage'));
const MasterDataPage = lazy(() => import('./pages/masterdata/MasterDataPage'));
const NationalItDashboardPage = lazy(() => import('./pages/nationalit/NationalItDashboardPage'));
const NationalItSystemsPage = lazy(() => import('./pages/nationalit/NationalItSystemsPage'));
const NationalItSectorsPage = lazy(() => import('./pages/nationalit/NationalItSectorsPage'));

const SectorPortalHome = lazy(() => import('./pages/sector/SectorPortalHome'));
const SectorPortalAbout = lazy(() => import('./pages/sector/SectorPortalAbout'));
const SectorPortalPorts = lazy(() => import('./pages/sector/SectorPortalPorts'));
const SectorPortalServices = lazy(() => import('./pages/sector/SectorPortalServices'));
const SectorPortalStatistics = lazy(() => import('./pages/sector/SectorPortalStatistics'));
const SectorPortalNews = lazy(() => import('./pages/sector/SectorPortalNews'));
const SectorPortalContact = lazy(() => import('./pages/sector/SectorPortalContact'));

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<PageLoader />}>{element}</Suspense>
);

const SectorSwitchLayout = () => {
  const { sectorCode } = useParams<{ sectorCode: string }>();
  if (isCmsSector(sectorCode)) {
    return (
      <SectorSiteProvider>
        <Outlet />
      </SectorSiteProvider>
    );
  }
  return (
    <SectorPortalProvider>
      <SectorPortalLayout />
    </SectorPortalProvider>
  );
};

const SectorSwitch = ({ cms, portal }: { cms: ReactNode; portal: ReactNode }) => {
  const { sectorCode } = useParams<{ sectorCode: string }>();
  return <Suspense fallback={<PageLoader />}>{isCmsSector(sectorCode) ? cms : portal}</Suspense>;
};

const SectorCmsOnly = ({ children }: { children: ReactNode }) => {
  const { sectorCode } = useParams<{ sectorCode: string }>();
  if (!isCmsSector(sectorCode)) {
    return <Navigate to={`/sector/${sectorCode ?? ''}`} replace />;
  }
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
};

const AppRoutes = () => (
  <Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={withSuspense(<HomePage />)} />
      <Route path="/about" element={withSuspense(<AboutPage />)} />
      <Route path="/gateways" element={withSuspense(<GatewayHubPage />)} />
      <Route path="/sectors" element={<Navigate to="/gateways" replace />} />
      <Route path="/sectors/:id" element={withSuspense(<SectorDetailPage />)} />
      <Route path="/ports" element={withSuspense(<SectorsPortsPage />)} />
      <Route path="/ports/:id" element={withSuspense(<PortDetailPage />)} />
      <Route path="/privacy" element={withSuspense(<PrivacyPage />)} />
      <Route path="/terms" element={withSuspense(<TermsPage />)} />
      <Route path="/verify" element={withSuspense(<VerifyPage />)} />
      <Route path="/verify/certificates/:number" element={withSuspense(<CertificateVerifyPage />)} />
      <Route path="/verify/vaccination/:code" element={withSuspense(<VaccineCertificateVerifyPage />)} />
      <Route path="/circulars" element={withSuspense(<CircularsPage />)} />
      <Route path="/circulars/:id" element={withSuspense(<CircularDetailPage />)} />
      <Route path="/news" element={withSuspense(<NewsPage />)} />
      <Route path="/news/:id" element={withSuspense(<NewsDetailPage />)} />
      <Route path="/director" element={withSuspense(<DirectorPage />)} />
      <Route path="/diseases" element={withSuspense(<DiseasePage />)} />
      <Route path="/faq" element={withSuspense(<FaqPage />)} />
      <Route path="/documents" element={withSuspense(<DocumentsPage />)} />
      <Route path="/notices" element={withSuspense(<NoticesPage />)} />
      <Route path="/indicators" element={withSuspense(<IndicatorsPage />)} />
      <Route path="/travel-requirements" element={withSuspense(<TravelRequirementsPage />)} />
      <Route path="/contact" element={withSuspense(<ContactPage />)} />
      <Route path="/services" element={withSuspense(<ServicesCatalogPage />)} />
      <Route path="/services/tools" element={withSuspense(<SmartServicesPage />)} />
      <Route path="/partners" element={withSuspense(<PartnersPage />)} />
      {/* بوابات الموحدة */}
      <Route element={<SectorSwitchLayout />}>
        <Route path="/sector/:sectorCode" element={<SectorSwitch cms={<SectorCmsHome />} portal={<SectorPortalHome />} />} />
        <Route path="/sector/:sectorCode/about" element={<SectorSwitch cms={<SectorCmsAbout />} portal={<SectorPortalAbout />} />} />
        <Route path="/sector/:sectorCode/director" element={<SectorCmsOnly><SectorCmsDirector /></SectorCmsOnly>} />
        <Route path="/sector/:sectorCode/documents" element={<SectorCmsOnly><SectorCmsDocuments /></SectorCmsOnly>} />
        <Route path="/sector/:sectorCode/ports" element={<SectorSwitch cms={<SectorCmsPorts />} portal={<SectorPortalPorts />} />} />
        <Route path="/sector/:sectorCode/ports/:id" element={<SectorCmsOnly><SectorCmsPortDetail /></SectorCmsOnly>} />
        <Route path="/sector/:sectorCode/services" element={<SectorSwitch cms={<SectorCmsServices />} portal={<SectorPortalServices />} />} />
        <Route path="/sector/:sectorCode/services/food-safety" element={<SectorCmsOnly><SectorCmsFoodSafety /></SectorCmsOnly>} />
        <Route path="/sector/:sectorCode/services/vector-control" element={<SectorCmsOnly><SectorCmsVectorControl /></SectorCmsOnly>} />
        <Route path="/sector/:sectorCode/travel-requirements" element={<SectorCmsOnly><SectorCmsTravelRequirements /></SectorCmsOnly>} />
        <Route path="/sector/:sectorCode/circulars" element={<SectorCmsOnly><SectorCmsCirculars /></SectorCmsOnly>} />
        <Route path="/sector/:sectorCode/circulars/:id" element={<SectorCmsOnly><SectorCmsCircularDetail /></SectorCmsOnly>} />
        <Route path="/sector/:sectorCode/news" element={<SectorSwitch cms={<SectorCmsNews />} portal={<SectorPortalNews />} />} />
        <Route path="/sector/:sectorCode/news/:id" element={<SectorCmsOnly><SectorCmsNewsDetail /></SectorCmsOnly>} />
        <Route path="/sector/:sectorCode/contact" element={<SectorSwitch cms={<SectorCmsContact />} portal={<SectorPortalContact />} />} />
        <Route path="/sector/:sectorCode/statistics" element={<SectorSwitch cms={<SectorCmsStatistics />} portal={<SectorPortalStatistics />} />} />
        <Route path="/sector/:sectorCode/faq" element={<SectorCmsOnly><SectorCmsFaq /></SectorCmsOnly>} />
      </Route>
      {deepServiceRoutes}
      {assistantRoute}
      {labResultsRoute}
      {vectorControlRoutes}
      <Route path="/traveler/register" element={withSuspense(<PreRegistrationPage />)} />
      <Route path="/traveler/login" element={withSuspense(<TravelerLoginPage />)} />
      <Route path="/traveler/signup" element={withSuspense(<TravelerSignupPage />)} />
      <Route path="/traveler/forgot-password" element={withSuspense(<ForgotPasswordPage />)} />
      <Route path="/traveler/reset-password" element={withSuspense(<ResetPasswordPage />)} />
      <Route element={<TravelerProtectedRoute />}>
        <Route path="/traveler/dashboard" element={withSuspense(<TravelerDashboardPage />)} />
        <Route path="/traveler/tracking" element={withSuspense(<RequestTrackingPage />)} />
        <Route path="/traveler/documents" element={withSuspense(<UploadDocumentsPage />)} />
        <Route path="/traveler/profile" element={withSuspense(<HealthProfilePage />)} />
      </Route>
      <Route path="*" element={withSuspense(<NotFoundPage />)} />
    </Route>
    <Route path="/login" element={withSuspense(<LoginPage />)} />
    <Route path="/forgot-password" element={withSuspense(<StaffForgotPasswordPage />)} />
    <Route path="/reset-password" element={withSuspense(<StaffResetPasswordPage />)} />
    <Route element={<ProtectedRoute />}>
      <Route element={<RoleLayout />}>
        <Route path="/app" element={withSuspense(<AppHomeRoute />)} />
        <Route path="/app/port-officer" element={withSuspense(<PortOfficerDashboardPage />)} />
        <Route path="/app/roles" element={withSuspense(<RolesPage />)} />
        <Route path="/app/roles/assignments" element={withSuspense(<RoleAssignmentsPage />)} />
        <Route path="/app/food" element={withSuspense(<FoodPage />)} />
        <Route path="/app/food/shipments/:id" element={withSuspense(<ShipmentWorkflowPage />)} />
        <Route path="/app/food-lab" element={withSuspense(<FoodLabPage />)} />
        <Route path="/app/food-lab/pricing" element={withSuspense(<LabPricingPage />)} />
        <Route path="/app/food-window" element={withSuspense(<FoodWindowPage />)} />
        <Route path="/app/chemistry" element={<ChemistryRoute />} />
        <Route path="/app/chemistry-analyst" element={withSuspense(<ChemistryAnalystRoute />)} />
        <Route path="/app/chemistry-analyst/:sampleId" element={withSuspense(<ChemistrySampleDetails />)} />
        <Route path="/app/chemistry-analyst/:sampleId/execute/:testId" element={withSuspense(<ChemistryAnalysisExecution />)} />
        <Route path="/app/chemistry-qc" element={withSuspense(<ChemistryQCScreen />)} />
        <Route path="/app/account" element={withSuspense(<AccountPage />)} />
        <Route path="/app/microbiology" element={withSuspense(<MicrobiologyLabPage />)} />
        <Route path="/app/microbiology-analyst" element={withSuspense(<MicrobiologyAnalystDashboard />)} />
        <Route path="/app/quality" element={withSuspense(<QualityAssurancePage />)} />
<Route path="/app/lab-director" element={withSuspense(<LaboratoryDirectorPage />)} />
<Route path="/app/reagents" element={withSuspense(<ReagentsPage />)} />
<Route path="/app/standards" element={withSuspense(<StandardsReviewPage />)} />
        <Route path="/app/reports" element={withSuspense(<ReportsPage />)} />
        <Route path="/app/quarantine-fees" element={withSuspense(<QuarantineFeesPage />)} />
        <Route path="/app/quarantine-inspector" element={withSuspense(<QuarantineInspectorPage />)} />
        <Route path="/app/organization" element={withSuspense(<OrgStructurePage />)} />
        <Route path="/app/clinic" element={withSuspense(<ClinicPage />)} />
        <Route path="/app/clinic/dashboard" element={withSuspense(<ClinicDashboardPage />)} />
        <Route path="/app/clinic/register" element={withSuspense(<ClinicRegisterPage />)} />
        <Route path="/app/clinic/isolation" element={withSuspense(<IsolationPage />)} />
        <Route path="/app/clinic/medications" element={withSuspense(<ClinicMedicationsPage />)} />
        <Route path="/app/clinic/certificates" element={withSuspense(<CertificatesPage />)} />
        <Route path="/app/clinic/lab" element={withSuspense(<ClinicLabPage />)} />
        <Route path="/app/clinic/visits/:id" element={withSuspense(<VisitDetailPage />)} />
        <Route path="/app/vaccination" element={withSuspense(<VaccinationDashboardPage />)} />
        <Route path="/app/vaccination/register" element={withSuspense(<RegisterVaccinationPage />)} />
        <Route path="/app/vaccination/records" element={withSuspense(<VaccinationRecordsPage />)} />
        <Route path="/app/vaccination/certificates" element={withSuspense(<VaccinationCertificatesPage />)} />
        <Route path="/app/vaccination/vaccines" element={withSuspense(<VaccinesPage />)} />
        <Route path="/app/vaccination/batches" element={withSuspense(<BatchesInventoryPage />)} />
        <Route path="/app/vaccination/sites" element={withSuspense(<VaccinationSitesPage />)} />
        <Route path="/app/carrier" element={withSuspense(<CarrierDashboardPage />)} />
        <Route path="/app/company" element={withSuspense(<CarrierCompanyPage />)} />
        <Route path="/app/airport" element={withSuspense(<AirportOpsPage />)} />
        <Route path="/app/dbadmin" element={withSuspense(<DbAdminPage />)} />
        <Route path="/app/developer-portal" element={withSuspense(<DeveloperPortalPage />)} />
        <Route path="/app/ui-kit" element={withSuspense(<UiKitPage />)} />
        <Route path="/app/master-data" element={withSuspense(<MasterDataPage />)} />
        <Route path="/app/national-command" element={withSuspense(<NationalCommandPage />)} />
        <Route path="/app/users" element={withSuspense(<UsersPage />)} />
        <Route path="/app/travelers" element={withSuspense(<TravelersPage />)} />
        <Route path="/app/screening" element={withSuspense(<ScreeningPage />)} />
        <Route
          path="/app/laboratory"
          element={
            <LabSectorProvider>
              <Outlet />
            </LabSectorProvider>
          }
        >
          <Route index element={withSuspense(<LaboratoryPage />)} />
          <Route path="national" element={withSuspense(<NationalLabDashboard />)} />
        </Route>
        <Route path="/app/food-ops" element={withSuspense(<FoodOpsPage />)} />
        <Route path="/app/emergency" element={withSuspense(<EmergencyPage />)} />
        <Route path="/app/epidemic-dashboard" element={withSuspense(<EpidemicDashboardPage />)} />
        <Route path="/app/surveillance" element={withSuspense(<SurveillanceModulePage />)} />
        <Route path="/app/food-surveillance" element={withSuspense(<FoodSurveillancePage />)} />
        <Route path="/app/carriers" element={withSuspense(<CarriersPage />)} />
        <Route path="/app/risk" element={withSuspense(<RiskPage />)} />
        <Route path="/app/integration" element={withSuspense(<IntegrationPage />)} />
        <Route element={<ProtectedRoute roles={['DG_MANAGER','NATIONAL_IT_DIRECTOR','IHR_NFP','WHO_INTEGRATION_OFFICER','NATIONAL_SURVEILLANCE_OFFICER','SECTOR_IHR_OFFICER','POE_HEALTH_OFFICER']} />}>
          <Route path="/app/integration/who" element={withSuspense(<WhoDashboardPage />)} />
          <Route path="/app/integration/who/events" element={withSuspense(<IhrEventsPage />)} />
          <Route path="/app/integration/who/spar" element={withSuspense(<SparPage />)} />
          <Route path="/app/integration/who/diseases" element={withSuspense(<DiseaseSyncPage />)} />
        </Route>
        <Route path="/app/port-health" element={withSuspense(<PortHealthPage />)} />
        <Route path="/app/vector-control" element={withSuspense(<VectorControlPage />)} />
        <Route path="/app/health" element={withSuspense(<HealthDashboardPage />)} />
        <Route path="/app/quarantine-director" element={withSuspense(<QuarantineDirectorPage />)} />
        <Route path="/app/sector-manager" element={withSuspense(<SectorManagerPage />)} />
        <Route path="/app/red-sea" element={withSuspense(<RedSeaCommandPage />)} />
        <Route element={<ProtectedRoute roles={['SECTOR_MANAGER', 'SECTOR_HEAD', 'IT_ADMIN', 'SECTOR_IT_MANAGER']} sectorCode="RED_SEA" />}>
          <Route path="/dashboard/sector/red-sea" element={withSuspense(<RedSeaPortalHome />)} />
          <Route path="/dashboard/sector/red-sea/it" element={withSuspense(<RedSeaItAdminPage />)} />
          <Route path="/dashboard/sector/red-sea/it/systems" element={withSuspense(<RedSeaItSystemsPage />)} />
          <Route path="/dashboard/sector/red-sea/it/assets" element={withSuspense(<RedSeaItAssetsPage />)} />
          <Route path="/dashboard/sector/red-sea/it/tickets" element={withSuspense(<RedSeaItTicketsPage />)} />
          <Route path="/dashboard/sector/red-sea/it/networks" element={withSuspense(<RedSeaItNetworksPage />)} />
          <Route path="/dashboard/sector/red-sea/it/reports" element={withSuspense(<RedSeaItReportsPage />)} />
          <Route path="/dashboard/sector/red-sea/points" element={withSuspense(<RedSeaPointsPage />)} />
          <Route path="/dashboard/sector/red-sea/port-health" element={withSuspense(<RedSeaPortHealthPage />)} />
          <Route path="/dashboard/sector/red-sea/airport-health" element={withSuspense(<RedSeaAirportHealthPage />)} />
          <Route path="/dashboard/sector/red-sea/food-safety" element={withSuspense(<RedSeaFoodSafetyPage />)} />
          <Route path="/dashboard/sector/red-sea/food-lab" element={withSuspense(<RedSeaFoodLabPage />)} />
          <Route path="/dashboard/sector/red-sea/food-lab/station/:stationId" element={withSuspense(<RedSeaStationPortalPage />)} />
          <Route path="/dashboard/sector/red-sea/vector-control" element={withSuspense(<RedSeaVectorControlPage />)} />
          <Route path="/dashboard/sector/red-sea/surveillance" element={withSuspense(<RedSeaSurveillancePage />)} />
          <Route path="/dashboard/sector/red-sea/staff" element={withSuspense(<RedSeaStaffPage />)} />
          <Route path="/dashboard/sector/red-sea/reports" element={withSuspense(<RedSeaReportsPage />)} />
          <Route path="/dashboard/sector/red-sea/content" element={withSuspense(<RedSeaContentPage />)} />
        </Route>
        <Route element={<ProtectedRoute roles={['SECTOR_MANAGER', 'SECTOR_HEAD', 'IT_ADMIN', 'SECTOR_IT_MANAGER']} sectorCode="KHARTOUM" />}>
          <Route path="/dashboard/sector/khartoum" element={withSuspense(<KhartoumPortalHome />)} />
          <Route path="/dashboard/sector/khartoum/content" element={withSuspense(<KhartoumContentPage />)} />
        </Route>
        <Route path="/app/food-director" element={withSuspense(<FoodDirectorPage />)} />
<Route path="/app/airport-director" element={withSuspense(<AirportDirectorPage />)} />
        <Route path="/app/sector-dashboard" element={withSuspense(<SectorHeadDashboardPage />)} />
        <Route element={<ProtectedRoute roles={['NATIONAL_IT_DIRECTOR']} />}>
          <Route path="/dashboard/national/it" element={withSuspense(<NationalItDashboardPage />)} />
          <Route path="/dashboard/national/it/systems" element={withSuspense(<NationalItSystemsPage />)} />
          <Route path="/dashboard/national/it/sectors-performance" element={withSuspense(<NationalItSectorsPage />)} />
        </Route>
      </Route>
      <Route path="/app/clerk-dashboard" element={<Navigate to="/food-safety/clerk/dashboard" replace />} />
      <Route path="/food-safety/clerk/dashboard" element={withSuspense(<ClerkDashboardPage />)} />
      <Route path="/food-safety/clerk" element={<Navigate to="/food-safety/clerk/dashboard" replace />} />
      <Route path="/app/accountant-dashboard" element={withSuspense(<AccountantDashboardPage />)} />
      <Route path="/app/finance" element={withSuspense(<NationalFinancePage />)} />
      <Route path="/app/inspector-dashboard" element={withSuspense(<InspectorDashboardPage />)} />
      <Route path="/app/station-dashboard" element={withSuspense(<StationManagerDashboardPage />)} />
      <Route path="/app/reception" element={withSuspense(<ReceptionLabPage />)} />
      <Route path="/app/airport-health" element={withSuspense(<AirportHealthPage />)} />
    </Route>
  </Routes>
);

export default AppRoutes;
