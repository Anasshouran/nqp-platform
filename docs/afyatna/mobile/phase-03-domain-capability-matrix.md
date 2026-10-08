# AFYATNA MOBILE — PHASE 0
# DOMAIN CAPABILITY MATRIX

## Document Status
**Status**: DRAFT  
**Date**: 2026-10-07  
**Version**: 0.1  
**Auditor**: Senior Principal Mobile Architect, Backend Architect, Security Architect, Product Architect, Technical Auditor

## Introduction

This comprehensive domain capability matrix audits the National Quarantine Platform (NQP) repository against 26 critical domains required for the AFYATNA | عافيتنا mobile application. Each domain is classified based on actual code evidence and architectural analysis.

**Classification Legend:**
- **EXISTS_AND_REUSABLE** - Full capability exists and can be directly reused for mobile
- **EXISTS_BUT_REQUIRES_ADAPTER** - Capability exists but requires adapter layer for mobile consumption
- **EXISTS_BUT_INTERNAL_ONLY** - Capability exists but must not be exposed to mobile
- **PARTIAL** - Partial implementation exists with gaps or inconsistencies
- **MISSING** - No implementation found in the repository
- **UNKNOWN** - Insufficient evidence to determine capability status

## Domain Capability Matrix

| Domain | Status | Evidence | Mobile Suitability | Risk Level |
|--------|--------|----------|-------------------|------------|
| **A. Identity** | **EXISTS_BUT_REQUIRES_ADAPTER** | `backend/apps/accounts/models.py:83-143` | High (needs SUDAPASS) | Medium |
| **B. Traveler Profile** | **EXISTS_AND_REUSABLE** | `backend/apps/travelers/models.py:29-78`, `frontend/src/pages/traveler/` | High | Low |
| **C. Passport / Identity References** | **EXISTS_AND_REUSABLE** | `backend/apps/travelers/models.py:45-46`, `backend/apps/integration/views.py:509-531` | High | Low |
| **D. Travel** | **PARTIAL** | Fragmented across `carriers`, `port_health`, `borders_health` | Low (needs unification) | High |
| **E. Flights** | **EXISTS_AND_REUSABLE** | `backend/apps/carriers/models.py:263-336`, `backend/apps/public/views.py:689-710` | High | Low |
| **F. Ships / Maritime Travel** | **EXISTS_AND_REUSABLE** | `backend/apps/port_health/models.py:378-450`, `backend/apps/public/views.py:739-759` | High | Low |
| **G. Land-border Travel** | **EXISTS_AND_REUSABLE** | `backend/apps/borders_health/models.py:1155-1250`, `backend/apps/public/views.py:739-759` | High | Low |
| **H. Points of Entry** | **EXISTS_AND_REUSABLE** | `backend/apps/masterdata/models.py:49-96`, unified canonical model | High | Low |
| **I. Health Declarations** | **EXISTS_AND_REUSABLE** | `backend/apps/carriers/models.py:682-792`, `backend/apps/borders_health/models.py:1050-1120` | High | Low |
| **J. Health Screening** | **EXISTS_BUT_INTERNAL_ONLY** | `backend/apps/screening/models.py:45-80`, contains sensitive results | Low (internal only) | High |
| **K. Vaccination** | **EXISTS_AND_REUSABLE** | `backend/apps/vaccination/models.py:208-278`, complete lifecycle | High | Low |
| **L. Vaccination Certificates** | **EXISTS_AND_REUSABLE** | `backend/apps/vaccination/models.py:208-278`, QR verification | High | Low |
| **M. QR Verification** | **EXISTS_AND_REUSABLE** | `backend/apps/public/views.py:104-120`, `backend/apps/vaccination/views.py:497-563` | High | Low |
| **N. Health Requirements** | **PARTIAL** | `backend/apps/public/views.py:530-561`, uses HealthNotice proxy | Medium (needs dedicated model) | Medium |
| **O. Diseases** | **EXISTS_AND_REUSABLE** | `backend/apps/public/views.py:418-441`, disease information | High | Low |
| **P. Public Health Alerts** | **EXISTS_AND_REUSABLE** | `backend/apps/public/views.py:492-511`, `backend/apps/cms/views.py:453-457` | High | Low |
| **Q. Notifications** | **EXISTS_BUT_REQUIRES_ADAPTER** | `backend/apps/notifications/models.py:73-110`, web push only | Medium (needs mobile push) | Medium |
| **R. Emergency** | **EXISTS_BUT_INTERNAL_ONLY** | `backend/apps/emergency_eoc/models.py:45-120`, operational data | Low (public alerts only) | High |
| **S. Documents** | **EXISTS_AND_REUSABLE** | `backend/apps/travelers/models.py:80-102`, document upload | High | Low |
| **T. Appointments** | **MISSING** | No appointment system found | None | High |
| **U. Quarantine Decisions** | **EXISTS_BUT_INTERNAL_ONLY** | `backend/apps/risk_engine/models.py:45-80`, internal decisions | Low (status only) | High |
| **V. Referral** | **EXISTS_AND_REUSABLE** | `backend/apps/clinic/models.py:459-520`, referral system | High | Low |
| **W. Payments** | **MISSING** | No payment integration found | None | High |
| **X. Offline Synchronization** | **PARTIAL** | `frontend/src/utils/vectorOffline.ts`, basic offline capability | Medium (needs enhancement) | Medium |
| **Y. Audit** | **EXISTS_AND_REUSABLE** | `backend/apps/accounts/models.py:354-380`, comprehensive audit | High | Low |
| **Z. Privacy / Consent** | **PARTIAL** | Basic consent in registration, no comprehensive privacy management | Medium (needs enhancement) | High |

---

## Detailed Domain Analysis

### A. Identity [EXISTS_BUT_REQUIRES_ADAPTER]

**Evidence:**
- `backend/apps/accounts/models.py:83-143` - User model with national_id support
- `backend/apps/accounts/views.py:52-64` - JWT authentication with refresh tokens
- `backend/apps/accounts/serializers.py:626-637` - `get_user_by_identifier` supports email/phone/national_id
- `backend/apps/accounts/migrations/0015_remove_user_identity_verified_and_more.py` - SUDAPASS fields removed

**Mobile Suitability:** High (needs SUDAPASS integration)
**Risk Level:** Medium (no SUDAPASS integration, national_id without uniqueness)

**Adapter Requirements:**
1. Implement SUDAPASS OAuth2/OIDC client
2. Add national_id uniqueness constraint
3. Implement MFA for mobile devices
4. Add device binding and biometric authentication

### B. Traveler Profile [EXISTS_AND_REUSABLE]

**Evidence:**
- `backend/apps/travelers/models.py:29-78` - Traveler model with comprehensive fields
- `backend/apps/travelers/views.py:64-360` - TravelerViewSet with self-service capabilities
- `frontend/src/pages/traveler/` - Complete traveler portal implementation

**Mobile Suitability:** High
**Risk Level:** Low

**Reusable Components:**
- Registration workflow with session binding
- Document upload and management
- Health declaration submission
- Status tracking and timeline
- QR code generation

### C. Passport / Identity References [EXISTS_AND_REUSABLE]

**Evidence:**
- `backend/apps/travelers/models.py:45-46` - passport_number field
- `backend/apps/integration/views.py:509-531` - Immigration verification endpoint
- `backend/apps/public/views.py:74-89` - Traveler lookup by passport

**Mobile Suitability:** High
**Risk Level:** Low

**Note:** Passport verification exists but may need rate limiting for mobile.

### D. Travel [PARTIAL]

**Evidence:**
- `backend/apps/carriers/models.py:263-336` - Flight model (air travel)
- `backend/apps/port_health/models.py:378-450` - Vessel model (maritime travel)
- `backend/apps/borders_health/models.py:1155-1250` - BorderCrossing model (land travel)
- No unified Travel model exists

**Mobile Suitability:** Low (fragmented)
**Risk Level:** High (data silos, inconsistent workflows)

**Adapter Requirements:**
1. Create unified Travel model
2. Standardize status workflows across transport modes
3. Implement cross-mode trip planning
4. Consolidate document management

### E. Flights [EXISTS_AND_REUSABLE]

**Evidence:**
- `backend/apps/carriers/models.py:263-336` - Flight model with status workflow
- `backend/apps/public/views.py:689-710` - Public flight status lookup
- `backend/apps/carriers/views.py:664-670` - Flight health events

**Mobile Suitability:** High
**Risk Level:** Low

**Note:** Public flight status is suitable for mobile consumption.

### F. Ships / Maritime Travel [EXISTS_AND_REUSABLE]

**Evidence:**
- `backend/apps/port_health/models.py:378-450` - Vessel and SanitationCertificate models
- `backend/apps/public/views.py:739-759` - Food shipment tracking (maritime)
- `backend/apps/port_health/views.py` - Port health operations

**Mobile Suitability:** High
**Risk Level:** Low

### G. Land-border Travel [EXISTS_AND_REUSABLE]

**Evidence:**
- `backend/apps/borders_health/models.py:1155-1250` - BorderCrossing model
- `backend/apps/borders_health/views.py` - Border health operations
- `backend/apps/public/views.py:739-759` - General tracking

**Mobile Suitability:** High
**Risk Level:** Low

### H. Points of Entry [EXISTS_AND_REUSABLE]

**Evidence:**
- `backend/apps/masterdata/models.py:49-96` - Canonical EntryPoint model
- `backend/apps/masterdata/views.py` - Unified POE management
- `backend/apps/airport_health/models.py:45-80` - AirportTerminal extends EntryPoint
- `backend/apps/port_health/models.py:378-450` - SeaPort extends EntryPoint

**Mobile Suitability:** High
**Risk Level:** Low

**Note:** Unified master data approach is excellent for mobile.

### I. Health Declarations [EXISTS_AND_REUSABLE]

**Evidence:**
- `backend/apps/carriers/models.py:682-792` - HealthDeclaration for flights
- `backend/apps/borders_health/models.py:1050-1120` - HealthDeclaration for borders
- `backend/apps/carriers/views.py:764-790` - Declaration submission workflow
- `backend/apps/borders_health/views.py` - Border declaration workflow

**Mobile Suitability:** High
**Risk Level:** Low

### J. Health Screening [EXISTS_BUT_INTERNAL_ONLY]

**Evidence:**
- `backend/apps/screening/models.py:45-80` - HealthScreening with sensitive results
- `backend/apps/screening/views.py:40-41` - QR scanning endpoint
- Contains individual health assessment data

**Mobile Suitability:** Low (internal only)
**Risk Level:** High (privacy concerns)

**Recommendation:** Only expose screening status to travelers, not detailed results.

### K. Vaccination [EXISTS_AND_REUSABLE]

**Evidence:**
- `backend/apps/vaccination/models.py:208-278` - Complete vaccination system
- `backend/apps/vaccination/services.py:164-296` - Issue/revoke/replace/reissue logic
- `backend/apps/vaccination/views.py:497-563` - Public verification

**Mobile Suitability:** High
**Risk Level:** Low

### L. Vaccination Certificates [EXISTS_AND_REUSABLE]

**Evidence:**
- `backend/apps/vaccination/models.py:208-278` - VaccinationCertificate model
- `backend/apps/vaccination/views.py:334-351` - QR generation endpoint
- `backend/apps/vaccination/views.py:497-563` - Public verification

**Mobile Suitability:** High
**Risk Level:** Low

### M. QR Verification [EXISTS_AND_REUSABLE]

**Evidence:**
- `backend/apps/public/views.py:104-120` - General QR verification
- `backend/apps/vaccination/views.py:497-563` - Certificate verification
- `backend/apps/travelers/views.py:259-314` - Traveler QR verification
- `frontend/src/components/VerifyTools.tsx` - Comprehensive verification tools

**Mobile Suitability:** High
**Risk Level:** Low

### N. Health Requirements [PARTIAL]

**Evidence:**
- `backend/apps/public/views.py:530-561` - TravelRequirements uses HealthNotice proxy
- `backend/apps/food_quarantine/models.py` - Food quarantine requirements
- No dedicated TravelRequirement/VaccinationRequirement models

**Mobile Suitability:** Medium (needs dedicated model)
**Risk Level:** Medium (incomplete requirements engine)

**Adapter Requirements:**
1. Create dedicated requirement models
2. Add effective dates and versioning
3. Implement destination-based requirements
4. Add exemption and policy management

### O. Diseases [EXISTS_AND_REUSABLE]

**Evidence:**
- `backend/apps/public/views.py:418-441` - Public disease information
- `backend/apps/surveillance/models.py` - Disease surveillance system
- `backend/apps/risk_engine/models.py` - Risk assessment for diseases

**Mobile Suitability:** High
**Risk Level:** Low

### P. Public Health Alerts [EXISTS_AND_REUSABLE]

**Evidence:**
- `backend/apps/public/views.py:492-511` - Public notices and alerts
- `backend/apps/cms/views.py:453-457` - Director profile with public alerts
- `backend/apps/emergency_eoc/models.py:45-120` - Emergency alerts (internal)

**Mobile Suitability:** High
**Risk Level:** Low

### Q. Notifications [EXISTS_BUT_REQUIRES_ADAPTER]

**Evidence:**
- `backend/apps/notifications/models.py:73-110` - DeviceToken and WebPushSubscription
- `backend/apps/notifications/views.py:100-110` - Notification endpoints
- `backend/apps/notifications/tasks.py` - Celery tasks for push delivery
- Web push only, no FCM/APNs integration

**Mobile Suitability:** Medium (needs mobile push)
**Risk Level:** Medium

**Adapter Requirements:**
1. Implement FCM/APNs integration
2. Add mobile-specific notification channels
3. Implement offline notification queuing
4. Add notification preferences for mobile

### R. Emergency [EXISTS_BUT_INTERNAL_ONLY]

**Evidence:**
- `backend/apps/emergency_eoc/models.py:45-120` - EmergencyAlert, KillSwitch
- `backend/apps/emergency_eoc/views.py` - Emergency operations center
- Contains sensitive operational intelligence

**Mobile Suitability:** Low (public alerts only)
**Risk Level:** High (operational security)

**Recommendation:** Only expose public alerts via CMS/public APIs.

### S. Documents [EXISTS_AND_REUSABLE]

**Evidence:**
- `backend/apps/travelers/models.py:80-102` - TravelerDocument model
- `backend/apps/carriers/models.py:800-850` - CarrierDocument model
- `frontend/src/pages/traveler/documents/` - Document upload interface

**Mobile Suitability:** High
**Risk Level:** Low

### T. Appointments [MISSING]

**Evidence:**
- No appointment system found in any app
- No appointment models or endpoints
- No appointment-related documentation

**Mobile Suitability:** None
**Risk Level:** High (critical gap)

### U. Quarantine Decisions [EXISTS_BUT_INTERNAL_ONLY]

**Evidence:**
- `backend/apps/risk_engine/models.py:45-80` - RiskAssessment with quarantine recommendations
- `backend/apps/risk_engine/views.py` - Internal risk assessment
- Contains internal decision logic

**Mobile Suitability:** Low (status only)
**Risk Level:** High (operational decisions)

**Recommendation:** Only expose quarantine status to travelers, not decision logic.

### V. Referral [EXISTS_AND_REUSABLE]

**Evidence:**
- `backend/apps/clinic/models.py:459-520` - HealthCertificate and referral system
- `backend/apps/clinic/views.py:639-641` - Public certificate verification
- `backend/apps/travelers/views.py:360-380` - Referral workflow

**Mobile Suitability:** High
**Risk Level:** Low

### W. Payments [MISSING]

**Evidence:**
- No payment integration found
- No payment models or endpoints
- No payment-related documentation

**Mobile Suitability:** None
**Risk Level:** High (critical gap)

### X. Offline Synchronization [PARTIAL]

**Evidence:**
- `frontend/src/utils/vectorOffline.ts` - IndexedDB implementation
- `frontend/public/sw.js` - Service worker for offline caching
- Basic offline data storage and request queuing

**Mobile Suitability:** Medium (needs enhancement)
**Risk Level:** Medium

**Adapter Requirements:**
1. Implement conflict resolution for offline edits
2. Add retry mechanisms for failed syncs
3. Implement offline data encryption
4. Add offline data validation

### Y. Audit [EXISTS_AND_REUSABLE]

**Evidence:**
- `backend/apps/accounts/models.py:354-380` - PermissionAudit model
- `backend/apps/vaccination/models.py:311-330` - VaccinationAuditLog model
- `backend/apps/travelers/models.py:104-126` - TravelerStatusLog model
- Comprehensive audit trails across all operations

**Mobile Suitability:** High
**Risk Level:** Low

### Z. Privacy / Consent [PARTIAL]

**Evidence:**
- Basic consent in registration process
- `User.is_mfa_enabled` field but no enforcement
- No comprehensive privacy management system
- No data minimization policies

**Mobile Suitability:** Medium (needs enhancement)
**Risk Level:** High (privacy compliance)

**Adapter Requirements:**
1. Implement comprehensive consent management
2. Add data minimization for mobile
3. Implement privacy controls for health data
4. Add data retention policies

---

## Summary Analysis

### High-Reuse Domains (9/26)
- Traveler Profile
- Passport/Identity References
- Flights
- Ships/Maritime Travel
- Land-border Travel
- Points of Entry
- Health Declarations
- Vaccination
- Vaccination Certificates
- QR Verification
- Diseases
- Public Health Alerts
- Documents
- Referral
- Audit

### Adapter-Required Domains (4/26)
- Identity (needs SUDAPASS)
- Health Requirements (needs dedicated model)
- Notifications (needs mobile push)
- Offline Synchronization (needs enhancement)

### Internal-Only Domains (3/26)
- Health Screening
- Emergency (operational data)
- Quarantine Decisions

### Critical Gaps (4/26)
- Travel (fragmented)
- Health Requirements (incomplete)
- Appointments (missing)
- Payments (missing)

### Partial Domains (6/26)
- Identity (no SUDAPASS)
- Health Requirements (notice-based proxy)
- Notifications (web push only)
- Offline Synchronization (basic)
- Privacy/Consent (basic)
- Emergency (public alerts only)

## Recommendations

### Immediate Actions (P0)
1. **Implement SUDAPASS integration** for Identity domain
2. **Create unified Travel model** to resolve fragmentation
3. **Implement dedicated requirement models** for Health Requirements
4. **Add mobile push notifications** for Notifications domain

### Phase 1 (P1)
1. **Enhance offline synchronization** with conflict resolution
2. **Implement comprehensive privacy management**
3. **Add appointment system** for critical workflows
4. **Integrate payment system** for fees and services

### Future Considerations (P2/P3)
1. **Biometric authentication** for enhanced security
2. **Advanced offline capabilities** for POE scenarios
3. **Location-based services** for POE integration
4. **Advanced analytics** for usage optimization

---

## Evidence Standard

All classifications are based on actual code evidence:
- `[FOUND]` - requirement/artifact exists and is implemented in code
- `[PARTIAL]` - exists but incomplete, inconsistent with docs, or weakened
- `[MISSING]` - searched for, not present anywhere in the repo
- `[INTERNAL]` - internal-only mechanism (backend service, seed command, test, helper)
- `[REUSABLE]` - existing capability can be adapted for mobile use
- `[ADAPTER]` - existing capability requires adapter layer for mobile

---

*This domain capability matrix provides a comprehensive analysis of the NQP platform's capabilities for mobile application development. All findings are evidence-based and form the foundation for subsequent architecture decisions.*