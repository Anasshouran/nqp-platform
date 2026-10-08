# AFYATNA MOBILE — PHASE 0
# MOBILE USER JOURNEYS

## Document Status
**Status**: DRAFT  
**Date**: 2026-10-07  
**Version**: 0.1  
**Auditor**: Senior Principal Mobile Architect, Backend Architect, Security Architect, Product Architect, Technical Auditor

## Introduction

This document analyzes 15 critical user journeys for the AFYATNA | عافيتنا mobile application by examining the existing National Quarantine Platform (NQP) backend capabilities. Each journey is evaluated based on actual backend evidence to determine feasibility, requirements, and implementation considerations.

**Journey Classification:**
- **SUPPORTED** - Backend fully supports this journey
- **PARTIALLY_SUPPORTED** - Backend partially supports with gaps
- **NOT_SUPPORTED** - Backend does not support this journey
- **INTERNAL_ONLY** - Backend supports but must not be exposed to mobile

## 1. First-time User Journey

### Journey Overview
**User**: New traveler to Sudan  
**Trigger**: App download and first-time registration  
**Required Identity**: National ID + passport + personal details  
**Backend Support**: **SUPPORTED**

### Backend Evidence
- `backend/apps/travelers/models.py:29-78` - Traveler model with all required fields
- `backend/apps/travelers/views.py:64-360` - TravelerViewSet with registration endpoints
- `backend/apps/travelers/auth_views.py:30-87` - TravelerAuthViewSet for authentication
- `frontend/src/pages/traveler/register.tsx` - Complete registration UI

### API Dependencies
- `POST /api/v1/travelers/register/` - Pre-registration
- `POST /api/v1/travelers/auth/register/` - Account creation
- `POST /api/v1/travelers/auth/login/` - Authentication
- `POST /api/v1/notifications/device/` - Device registration

### Backend Requirements
- ✅ Complete registration workflow
- ✅ Document upload capabilities
- ✅ Session binding for anonymous users
- ✅ Profile management
- ✅ QR code generation

### Mobile Dependencies
- Device registration for notifications
- Camera access for document capture
- Location services for POE detection
- Secure storage for credentials

### Security Concerns
- National ID uniqueness not enforced
- No biometric authentication option
- Data minimization needs enhancement

### Completion State
**Status**: SUPPORTED  
**Risk Level**: Low  
**Gap**: No SUDAPASS integration for identity verification

---

## 2. Returning Traveler Journey

### Journey Overview
**User**: Traveler with existing account  
**Trigger**: App login after previous use  
**Required Identity**: SUDAPASS + JWT tokens  
**Backend Support**: **PARTIALLY_SUPPORTED**

### Backend Evidence
- `backend/apps/travelers/models.py:29-78` - Existing traveler profile
- `backend/apps/travelers/views.py:64-360` - Traveler dashboard and status tracking
- `backend/apps/accounts/views.py:52-64` - JWT authentication
- `backend/apps/travelers/views.py:259-314` - QR code management

### API Dependencies
- `POST /api/v1/auth/login/` - Authentication
- `GET /api/v1/travelers/me/` - Profile retrieval
- `GET /api/v1/travelers/dashboard/` - Status overview
- `GET /api/v1/travelers/timeline/` - Activity history

### Backend Requirements
- ✅ Existing profile management
- ✅ Status tracking
- ✅ Document management
- ❌ No SUDAPASS integration
- ❌ No persistent session management

### Mobile Dependencies
- Secure token storage
- Biometric authentication option
- Push notifications for status updates
- Offline access to critical documents

### Security Concerns
- JWT tokens stored in localStorage (XSS risk)
- No device binding for returning users
- Session timeout too short for mobile use

### Completion State
**Status**: PARTIALLY_SUPPORTED  
**Risk Level**: Medium  
**Gap**: SUDAPASS integration required for identity

---

## 3. SUDAPASS Authentication Journey

### Journey Overview
**User**: Traveler with national digital identity  
**Trigger**: Authentication via SUDAPASS  
**Required Identity**: SUDAPASS credentials  
**Backend Support**: **NOT_SUPPORTED**

### Backend Evidence
- `backend/apps/accounts/models.py:102-104` - national_id field (no SUDAPASS integration)
- `backend/apps/accounts/migrations/0015_remove_user_identity_verified_and_more.py` - SUDAPASS fields removed
- `docs/06_UI_UX/01_Public_Website/Services.md:33` - Stale SUDAPASS reference
- No OAuth2/OIDC client implementation found

### API Dependencies
- `POST /api/v1/auth/sudapass/` - SUDAPASS authentication (missing)
- `POST /api/v1/auth/refresh/` - Token refresh
- `GET /api/v1/auth/me/` - User profile

### Backend Requirements
- ❌ SUDAPASS OAuth2/OIDC client
- ❌ Identity token validation
- ❌ User provisioning from SUDAPASS
- ❌ Account linking functionality

### Mobile Dependencies
- SUDAPASS mobile app integration
- Deep linking for authentication
- Secure credential storage
- Biometric fallback

### Security Concerns
- No SUDAPASS integration exists
- Identity verification not implemented
- No national ID uniqueness constraint

### Completion State
**Status**: NOT_SUPPORTED  
**Risk Level**: High  
**Gap**: Complete SUDAPASS integration required

---

## 4. Travel Preparation Journey

### Journey Overview
**User**: Traveler preparing for international travel  
**Trigger**: Need to understand entry requirements  
**Required Identity**: Destination country + travel dates  
**Backend Support**: **SUPPORTED**

### Backend Evidence
- `backend/apps/public/views.py:530-561` - TravelRequirementsViewSet
- `backend/apps/public/views.py:418-441` - PublicDiseaseViewSet
- `backend/apps/public/views.py:492-511` - PublicNoticeViewSet
- `backend/apps/masterdata/models.py:49-96` - EntryPoint model

### API Dependencies
- `GET /api/v1/public/travel-requirements/` - Entry requirements
- `GET /api/v1/public/diseases/` - Disease information
- `GET /api/v1/public/notices/` - Health alerts
- `GET /api/v1/public/countries/` - Country information

### Backend Requirements
- ✅ Travel requirements by destination
- ✅ Disease and alert information
- ✅ Country and POE data
- ❌ No personalized requirements based on traveler profile
- ❌ No vaccination status integration

### Mobile Dependencies
- Location-based POE detection
- Calendar integration for travel dates
- Push notifications for requirement changes
- Offline access to requirements

### Security Concerns
- Public information exposure
- No rate limiting on requirements lookup
- No personalized risk assessment

### Completion State
**Status**: SUPPORTED  
**Risk Level**: Low  
**Gap**: Personalized requirements based on traveler profile

---

## 5. Health Requirements Lookup Journey

### Journey Overview
**User**: Traveler checking health entry requirements  
**Trigger**: Need to know vaccination/testing requirements  
**Required Identity**: Destination country + nationality  
**Backend Support**: **PARTIALLY_SUPPORTED**

### Backend Evidence
- `backend/apps/public/views.py:530-561` - TravelRequirements uses HealthNotice proxy
- `backend/apps/food_quarantine/models.py` - Food quarantine requirements
- `backend/apps/vaccination/models.py:208-278` - Vaccination certificate system
- No dedicated TravelRequirement model found

### API Dependencies
- `GET /api/v1/public/travel-requirements/` - Requirements lookup
- `GET /api/v1/vaccination/public/verify/<code>/` - Certificate verification
- `GET /api/v1/public/diseases/` - Disease information

### Backend Requirements
- ✅ Basic requirements lookup
- ✅ Vaccination certificate verification
- ❌ No dedicated requirement models
- ❌ No effective dates or versioning
- ❌ No exemption or policy management

### Mobile Dependencies
- Requirement caching for offline use
- Integration with vaccination status
- Calendar for requirement deadlines
- Push notifications for requirement changes

### Security Concerns
- Requirements may be incomplete
- No personalized risk assessment
- Public access to all requirements

### Completion State
**Status**: PARTIALLY_SUPPORTED  
**Risk Level**: Medium  
**Gap**: Dedicated requirement models with versioning

---

## 6. Health Declaration Journey

### Journey Overview
**User**: Traveler submitting health declaration  
**Trigger**: Entry to Sudan or POE  
**Required Identity**: Traveler profile + health information  
**Backend Support**: **SUPPORTED**

### Backend Evidence
- `backend/apps/carriers/models.py:682-792` - HealthDeclaration for flights
- `backend/apps/borders_health/models.py:1050-1120` - HealthDeclaration for borders
- `backend/apps/carriers/views.py:764-790` - Declaration submission workflow
- `backend/apps/borders_health/views.py` - Border declaration workflow

### API Dependencies
- `POST /api/v1/carriers/health-declarations/` - Flight health declaration
- `POST /api/v1/borders-health/declarations/` - Border health declaration
- `POST /api/v1/travelers/declaration/` - General health declaration

### Backend Requirements
- ✅ Complete declaration workflow
- ✅ Status tracking and review
- ✅ Document upload support
- ✅ Audit trail for submissions

### Mobile Dependencies
- Camera for document capture
- Location services for POE detection
- Offline capability for unstable connectivity
- Push notifications for status updates

### Security Concerns
- Health data exposure in public APIs
- No data minimization for mobile
- No encryption for sensitive health information

### Completion State
**Status**: SUPPORTED  
**Risk Level**: Medium  
**Gap**: Health data encryption and minimization

---

## 7. Vaccination Certificate Journey

### Journey Overview
**User**: Traveler managing vaccination certificates  
**Trigger**: Need to show proof of vaccination  
**Required Identity**: Vaccination records + certificate number  
**Backend Support**: **SUPPORTED**

### Backend Evidence
- `backend/apps/vaccination/models.py:208-278` - VaccinationCertificate model
- `backend/apps/vaccination/services.py:164-296` - Certificate lifecycle management
- `backend/apps/vaccination/views.py:497-563` - Public verification
- `backend/apps/vaccination/views.py:334-351` - QR code generation

### API Dependencies
- `GET /api/v1/vaccination/certificates/` - Certificate list
- `POST /api/v1/vaccination/certificates/{id}/qr/` - QR generation
- `GET /api/v1/vaccination/public/verify/<code>/` - Verification
- `POST /api/v1/vaccination/certificates/{id}/revoke/` - Certificate management

### Backend Requirements
- ✅ Complete certificate lifecycle
- ✅ QR code generation and verification
- ✅ Audit trail for all operations
- ✅ Public verification endpoints

### Mobile Dependencies
- Camera for QR scanning
- Wallet integration for certificate storage
- Offline access to certificates
- Push notifications for certificate expiry

### Security Concerns
- QR signature verification optional in public endpoint
- No certificate revocation notification system
- No biometric protection for certificates

### Completion State
**Status**: SUPPORTED  
**Risk Level**: Low  
**Gap**: Enhanced QR security and wallet integration

---

## 8. QR Verification Journey

### Journey Overview
**User**: Traveler or official verifying QR codes  
**Trigger**: Need to validate authenticity  
**Required Identity**: QR code + signature validation  
**Backend Support**: **SUPPORTED**

### Backend Evidence
- `backend/apps/public/views.py:104-120` - VerifyQrView
- `backend/apps/vaccination/views.py:497-563` - PublicVaccinationVerifyView
- `backend/apps/travelers/views.py:259-314` - Traveler QR verification
- `frontend/src/components/VerifyTools.tsx` - Comprehensive verification tools

### API Dependencies
- `POST /api/v1/public/verify-qr/` - General QR verification
- `POST /api/v1/vaccination/public/verify/<code>/` - Certificate verification
- `POST /api/v1/public/verify-certificate/` - Certificate verification

### Backend Requirements
- ✅ Multiple verification endpoints
- ✅ QR payload validation
- ✅ Certificate verification
- ❌ Mandatory signature validation not enforced
- ❌ No rate limiting on verification endpoints

### Mobile Dependencies
- Camera for QR scanning
- Offline verification capability
- Verification history storage
- Push notifications for verification results

### Security Concerns
- QR signature verification optional (security risk)
- No rate limiting on public verification
- Verification results may contain sensitive data

### Completion State
**Status**: SUPPORTED  
**Risk Level**: Medium  
**Gap**: Mandatory signature validation and rate limiting

---

## 9. Arrival at Airport Journey

### Journey Overview
**User**: Traveler arriving at Sudan airport  
**Trigger**: Airport arrival and health screening  
**Required Identity**: Traveler profile + flight details  
**Backend Support**: **PARTIALLY_SUPPORTED**

### Backend Evidence
- `backend/apps/airport_health/models.py:45-80` - AirportTerminal and screening
- `backend/apps/carriers/models.py:263-336` - Flight model
- `backend/apps/public/views.py:689-710` - Public flight status
- `backend/apps/screening/models.py:45-80` - HealthScreening (internal only)

### API Dependencies
- `GET /api/v1/public/flights/` - Flight status lookup
- `POST /api/v1/travelers/qr-code/verify/` - QR verification
- `GET /api/v1/travelers/status/` - Screening status
- `POST /api/v1/notifications/device/` - Device registration

### Backend Requirements
- ✅ Flight status information
- ✅ QR code verification
- ❌ No public screening status endpoints
- ❌ No POE-specific workflows
- ❌ No location-based services

### Mobile Dependencies
- GPS for POE detection
- Bluetooth for contact tracing
- Offline capability for unstable connectivity
- Push notifications for status updates

### Security Concerns
- Screening results not exposed to travelers
- No location privacy protection
- No contact tracing integration

### Completion State
**Status**: PARTIALLY_SUPPORTED  
**Risk Level**: Medium  
**Gap**: Public screening status and POE workflows

---

## 10. Arrival at Seaport Journey

### Journey Overview
**User**: Traveler arriving at Sudan seaport  
**Trigger**: Seaport arrival and health screening  
**Required Identity**: Traveler profile + vessel details  
**Backend Support**: **PARTIALLY_SUPPORTED**

### Backend Evidence
- `backend/apps/port_health/models.py:378-450` - SeaPort and vessel models
- `backend/apps/public/views.py:739-759` - Food shipment tracking
- `backend/apps/port_health/views.py` - Port health operations
- `backend/apps/screening/models.py:45-80` - HealthScreening (internal only)

### API Dependencies
- `GET /api/v1/public/food/shipments/lookup/` - Vessel tracking
- `POST /api/v1/travelers/qr-code/verify/` - QR verification
- `GET /api/v1/travelers/status/` - Screening status

### Backend Requirements
- ✅ Vessel tracking information
- ✅ QR code verification
- ❌ No public screening status endpoints
- ❌ No maritime-specific workflows
- ❌ No location-based services

### Mobile Dependencies
- GPS for POE detection
- Maritime-specific notifications
- Offline capability for connectivity issues
- Push notifications for status updates

### Security Concerns
- Screening results not exposed to travelers
- No maritime-specific security measures
- No vessel integration with mobile

### Completion State
**Status**: PARTIALLY_SUPPORTED  
**Risk Level**: Medium  
**Gap**: Public screening status and maritime workflows

---

## 11. Arrival at Land Border Journey

### Journey Overview
**User**: Traveler arriving at Sudan land border  
**Trigger**: Border crossing and health screening  
**Required Identity**: Traveler profile + vehicle details  
**Backend Support**: **PARTIALLY_SUPPORTED**

### Backend Evidence
- `backend/apps/borders_health/models.py:1155-1250` - BorderCrossing model
- `backend/apps/public/views.py:739-759` - General tracking
- `backend/apps/borders_health/views.py` - Border health operations
- `backend/apps/screening/models.py:45-80` - HealthScreening (internal only)

### API Dependencies
- `GET /api/v1/public/tracking/` - Border crossing status
- `POST /api/v1/travelers/qr-code/verify/` - QR verification
- `GET /api/v1/travelers/status/` - Screening status

### Backend Requirements
- ✅ Border crossing information
- ✅ QR code verification
- ❌ No public screening status endpoints
- ❌ No land border-specific workflows
- ❌ No location-based services

### Mobile Dependencies
- GPS for POE detection
- Border-specific notifications
- Offline capability for connectivity issues
- Push notifications for status updates

### Security Concerns
- Screening results not exposed to travelers
- No border-specific security measures
- No vehicle integration with mobile

### Completion State
**Status**: PARTIALLY_SUPPORTED  
**Risk Level**: Medium  
**Gap**: Public screening status and border workflows

---

## 12. Health Screening Journey

### Journey Overview
**User**: Traveler undergoing health screening  
**Trigger**: Health assessment at POE  
**Required Identity**: Traveler profile + screening results  
**Backend Support**: **INTERNAL_ONLY**

### Backend Evidence
- `backend/apps/screening/models.py:45-80` - HealthScreening with sensitive results
- `backend/apps/screening/views.py:40-41` - QR scanning endpoint
- Contains individual health assessment data

### API Dependencies
- `POST /api/v1/screening/screenings/` - Screening submission (internal only)
- `POST /api/v1/screening/scan-qr/` - QR scanning (internal only)

### Backend Requirements
- ✅ Complete screening workflow
- ❌ Must not be exposed to mobile (contains sensitive health data)
- ❌ No public screening status endpoints

### Mobile Dependencies
- Camera for QR scanning
- Location services for POE detection
- Secure storage for screening results
- Push notifications for screening status

### Security Concerns
- Health data exposure risk
- No data minimization for mobile
- No encryption for sensitive screening data

### Completion State
**Status**: INTERNAL_ONLY  
**Risk Level**: High  
**Gap**: Only screening status should be exposed to travelers

---

## 13. Public Health Alert Journey

### Journey Overview
**User**: Traveler receiving public health alerts  
**Trigger**: Health emergency or outbreak  
**Required Identity**: Push notification subscription  
**Backend Support**: **SUPPORTED**

### Backend Evidence
- `backend/apps/public/views.py:492-511` - PublicNoticeViewSet
- `backend/apps/cms/views.py:453-457` - Announcement system
- `backend/apps/emergency_eoc/models.py:45-120` - EmergencyAlert (internal only)
- `backend/apps/notifications/models.py:73-110` - Notification system

### API Dependencies
- `GET /api/v1/public/notices/` - Health notices and alerts
- `POST /api/v1/notifications/subscribe/` - Push notification subscription
- `GET /api/v1/notifications/unread-count/` - Alert count

### Backend Requirements
- ✅ Public health notices system
- ✅ Push notification infrastructure
- ❌ No emergency alert public endpoints
- ❌ No location-based alert targeting
- ❌ No alert priority management

### Mobile Dependencies
- Push notification delivery
- Alert categorization and filtering
- Offline access to alert history
- Push notification preferences

### Security Concerns
- Public access to all alerts
- No alert authentication or authorization
- No alert rate limiting

### Completion State
**Status**: SUPPORTED  
**Risk Level**: Low  
**Gap**: Enhanced alert targeting and priority management

---

## 14. Emergency Information Journey

### Journey Overview
**User**: Traveler needing emergency information  
**Trigger**: Health emergency or crisis  
**Required Identity**: Emergency contact information  
**Backend Support**: **PARTIALLY_SUPPORTED**

### Backend Evidence
- `backend/apps/emergency_eoc/models.py:45-120` - EmergencyAlert (internal only)
- `backend/apps/public/views.py:492-511` - Public notices
- `backend/apps/cms/views.py:453-457` - Director profile with emergency info
- `backend/apps/travelers/models.py:29-78` - Traveler profile with emergency contact

### API Dependencies
- `GET /api/v1/public/notices/` - Emergency notices
- `GET /api/v1/public/emergency/` - Emergency information (missing)
- `POST /api/v1/travelers/emergency-contact/` - Emergency contact (missing)

### Backend Requirements
- ✅ Basic emergency notices
- ❌ No dedicated emergency information endpoints
- ❌ No emergency contact management
- ❌ No emergency hotline integration

### Mobile Dependencies
- Emergency call integration
- Location sharing for emergency services
- Push notifications for emergency alerts
- Offline emergency information access

### Security Concerns
- Emergency information not properly structured
- No emergency authentication system
- No location privacy protection

### Completion State
**Status**: PARTIALLY_SUPPORTED  
**Risk Level**: Medium  
**Gap**: Dedicated emergency information system

---

## 15. Offline Operation at POE Journey

### Journey Overview
**User**: Traveler at POE with unreliable connectivity  
**Trigger**: Need to operate without internet  
**Required Identity**: Cached data + offline capabilities  
**Backend Support**: **PARTIALLY_SUPPORTED**

### Backend Evidence
- `frontend/src/utils/vectorOffline.ts` - IndexedDB implementation
- `frontend/public/sw.js` - Service worker for offline caching
- `backend/apps/travelers/models.py:29-78` - Traveler profile (can be cached)
- `backend/apps/vaccination/models.py:208-278` - Vaccination certificates (can be cached)

### API Dependencies
- Local storage for cached data
- Background sync for offline operations
- Offline QR verification
- Offline document management

### Backend Requirements
- ✅ Basic offline data storage
- ❌ No offline sync endpoints
- ❌ No offline conflict resolution
- ❌ No offline data encryption
- ❌ No offline validation

### Mobile Dependencies
- IndexedDB for offline storage
- Service worker for caching
- Background sync mechanisms
- Offline data validation

### Security Concerns
- Offline data not encrypted
- No offline authentication
- No offline data privacy protection
- No offline data expiration

### Completion State
**Status**: PARTIALLY_SUPPORTED  
**Risk Level**: High  
**Gap**: Comprehensive offline strategy with encryption and sync

---

## Summary Analysis

### Supported Journeys (6/15)
- First-time User
- Travel Preparation
- Health Requirements Lookup
- Health Declaration
- Vaccination Certificate
- QR Verification
- Public Health Alert

### Partially Supported Journeys (5/15)
- Returning Traveler (needs SUDAPASS)
- Health Requirements Lookup (needs dedicated models)
- Arrival at Airport (needs public screening status)
- Arrival at Seaport (needs public screening status)
- Arrival at Land Border (needs public screening status)
- Emergency Information (needs dedicated system)
- Offline Operation (needs enhancement)

### Not Supported Journeys (1/15)
- SUDAPASS Authentication (complete integration required)

### Internal Only Journeys (1/15)
- Health Screening (must not be exposed to mobile)

### Critical Gaps
1. **SUDAPASS Integration** - Required for identity and returning user journeys
2. **Public Screening Status** - Required for all POE arrival journeys
3. **Offline Strategy** - Required for POE operation with unreliable connectivity
4. **Dedicated Requirement Models** - Required for personalized health requirements

### Implementation Priority

#### P0 - BLOCKING
1. SUDAPASS Authentication Journey
2. Public Screening Status for all POE arrivals
3. Offline Operation enhancement

#### P1 - REQUIRED FOR MVP
1. Returning Traveler Journey enhancement
2. Health Requirements Lookup improvement
3. Emergency Information system
4. Offline data encryption and sync

#### P2 - IMPORTANT
1. Enhanced QR Verification security
2. Location-based services for POE
3. Push notification optimization
4. Mobile-specific data minimization

#### P3 - FUTURE
1. Biometric authentication integration
2. Advanced offline capabilities
3. Contact tracing integration
4. Emergency call integration

---

## Evidence Standard

All journey classifications are based on actual backend evidence:
- `[FOUND]` - requirement/artifact exists and is implemented in code
- `[PARTIAL]` - exists but incomplete, inconsistent with docs, or weakened
- `[MISSING]` - searched for, not present anywhere in the repo
- `[INTERNAL]` - internal-only mechanism (backend service, seed command, test, helper)
- `[SUPPORTED]` - backend fully supports this journey
- `[PARTIALLY_SUPPORTED]` - backend partially supports with gaps
- `[NOT_SUPPORTED]` - backend does not support this journey
- `[INTERNAL_ONLY]` - backend supports but must not be exposed to mobile

---

*This mobile user journeys analysis provides a comprehensive evaluation of the NQP platform's capabilities for supporting critical mobile application workflows. All findings are evidence-based and form the foundation for implementation planning.*