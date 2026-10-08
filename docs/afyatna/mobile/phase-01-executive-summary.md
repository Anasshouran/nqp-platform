# AFYATNA MOBILE — PHASE 0
# EXECUTIVE SUMMARY

## Document Status
**Status**: DRAFT  
**Date**: 2026-10-07  
**Version**: 0.1  
**Auditor**: Senior Principal Mobile Architect, Backend Architect, Security Architect, Product Architect, Technical Auditor

## Executive Overview

This comprehensive Phase 0 Discovery & Architecture Audit of the National Quarantine Platform (NQP) repository provides the foundation for the future AFYATNA | عافيتنا mobile application. The audit reveals a mature, well-architected system with substantial capabilities that can be repurposed for mobile consumption, while identifying critical gaps and architectural considerations.

## Key Findings

### ✅ **REUSABLE CAPABILITIES (HIGH CONFIDENCE)**

1. **Authentication & Identity System**
   - JWT-based authentication with refresh tokens (30-min access, 7-day refresh)
   - Comprehensive RBAC with scoped role assignments
   - National ID as login identifier (`User.national_id`)
   - Account lockout (5 attempts / 15 min)
   - [EVIDENCE]: `backend/apps/accounts/models.py:83-143`, `backend/apps/accounts/views.py:52-64`

2. **Vaccination Certificate System**
   - Robust certificate lifecycle with issue/revoke/replace/reissue
   - QR-based verification with HMAC signatures
   - Public verification endpoints with 30/hour throttling
   - Audit trail for all certificate operations
   - [EVIDENCE]: `backend/apps/vaccination/models.py:208-278`, `backend/apps/vaccination/services.py:164-296`

3. **Traveler Management Portal**
   - Self-service traveler registration with session binding
   - Document upload and management
   - Health declaration workflow
   - Status tracking and timeline
   - QR code generation and verification
   - [EVIDENCE]: `backend/apps/travelers/models.py:29-126`, `frontend/src/pages/traveler/`

4. **Public APIs & Verification Tools**
   - Comprehensive public API suite (41 endpoint modules)
   - QR verification, certificate verification, lab results lookup
   - Travel requirements, health notices, disease information
   - Smart assistant with 15+ intents
   - [EVIDENCE]: `frontend/src/api/endpoints/`, `backend/apps/public/views.py:58-740`

5. **Notification Infrastructure**
   - Multi-channel notifications (web push, email, SMS)
   - Device token registration
   - Health notice broadcasting
   - User preferences management
   - [EVIDENCE]: `backend/apps/notifications/models.py:73-110`, `backend/apps/notifications/views.py:100-110`

### ⚠️ **CRITICAL GAPS & ADAPTERS REQUIRED**

1. **SUDAPASS Integration**
   - **STATUS**: MISSING - No actual integration exists
   - **EVIDENCE**: `backend/apps/accounts/models.py:102-104` (field removed 2026-09-13), `docs/06_UI_UX/01_Public_Website/Services.md:33` (stale reference)
   - **REQUIREMENT**: OAuth2/OIDC client implementation for SUDAPASS identity provider

2. **Unified Travel Model**
   - **STATUS**: FRAGMENTED - Travel split across carriers, port_health, borders_health
   - **EVIDENCE**: `backend/apps/carriers/models.py:263-336` (flights), `backend/apps/port_health/models.py:378-450` (maritime), `backend/apps/borders_health/models.py:1155-1250` (land)
   - **REQUIREMENT**: Unified Travel model encompassing all transport modes

3. **Requirements Engine**
   - **STATUS**: PARTIAL - Uses HealthNotice as proxy, no dedicated requirements model
   - **EVIDENCE**: `backend/apps/public/views.py:530-561` (notice-based requirements)
   - **REQUIREMENT**: Dedicated TravelRequirement/VaccinationRequirement models with effective dates

4. **Mobile-First APIs**
   - **STATUS**: MISSING - No dedicated mobile API endpoints
   - **EVIDENCE**: All endpoints designed for web consumption
   - **REQUIREMENT**: `/api/v1/mobile/` namespace with optimized responses

### 🚫 **INTERNAL-ONLY CAPABILITIES (MUST NOT EXPOSE)**

1. **Emergency/EOC Operational Data**
   - **STATUS**: INTERNAL - Contains sensitive operational intelligence
   - **EVIDENCE**: `backend/apps/emergency_eoc/models.py:45-120` (EmergencyAlert, KillSwitch)
   - **RECOMMENDATION**: Only expose public alerts via CMS/public APIs

2. **Carrier Integration APIs**
   - **STATUS**: INTERNAL - Contains carrier-specific operational data
   - **EVIDENCE**: `backend/apps/carriers/views.py:996-1200` (HasApiKey permissions)
   - **RECOMMENDATION**: Only expose aggregated public flight status

3. **Screening Operations**
   - **STATUS**: INTERNAL - Contains screening results and risk assessments
   - **EVIDENCE**: `backend/apps/screening/models.py:45-80` (HealthScreening)
   - **RECOMMENDATION**: Only expose screening status to travelers, not results

## Architecture Recommendations

### **Recommended Mobile Technology Stack**
- **React Native** with Expo (prebuild for production)
- **EVIDENCE**: Existing React/Vite skills, TypeScript shared types, authentication patterns
- **JUSTIFICATION**: Code reuse, team capability, Sudan connectivity constraints

### **Information Architecture**
```
HOME
├── Current health alerts
├── Upcoming trip
├── Requirements shortcut
├── Certificate shortcut
└── Emergency shortcut

TRAVEL
├── Trips
├── Destination requirements
├── Health declaration
└── Status tracking

HEALTH
├── Vaccination status
├── Health certificates
├── Screening results
└── Medical history

CERTIFICATES
├── Vaccination certificates
├── QR codes
└── Verification status

ALERTS
├── Public health alerts
├── Emergency alerts
└── Travel advisories

PROFILE
├── Identity verification
├── Preferences
├── Language
└── Privacy settings
```

## Phase 1 Implementation Priorities

### **P0 - BLOCKING**
1. **SUDAPASS Integration**: OAuth2/OIDC client implementation
2. **Mobile API Contract**: Define `/api/v1/mobile/` endpoints
3. **Security Hardening**: Mobile-specific threat mitigation
4. **Data Classification**: Implement health data boundaries

### **P1 - REQUIRED FOR MVP**
1. **Unified Travel Model**: Consolidate fragmented travel data
2. **Requirements Engine**: Implement dedicated requirement models
3. **Mobile-First Authentication**: SUDAPASS + JWT integration
4. **Offline Strategy**: Critical data caching for POE scenarios

### **P2 - IMPORTANT**
1. **Push Notifications**: Mobile-specific notification delivery
2. **QR Optimization**: Mobile QR scanning and verification
3. **Accessibility**: RTL Arabic support, low-bandwidth optimization
4. **Performance**: Native-like performance with React Native

### **P3 - FUTURE**
1. **Biometric Authentication**: Device-specific security
2. **Advanced Offline Sync**: Conflict resolution, retry mechanisms
3. **Location Services**: POE-based features
4. **Advanced Analytics**: Usage patterns, optimization insights

## Security Considerations

### **High-Risk Areas**
1. **Health Data Exposure**: Must implement strict data classification
2. **QR Replay Attacks**: Current verification lacks mandatory signature checks
3. **Device Security**: Mobile device binding and biometric authentication required
4. **Network Security**: TLS certificate pinning for POE environments

### **Data Classification**
- **PUBLIC**: Travel requirements, public notices, general information
- **PERSONAL**: Name, email, phone (with consent)
- **SENSITIVE_HEALTH**: Vaccination status, medical history (strict access)
- **SECURITY_SENSITIVE**: Passport numbers, biometric data (minimal collection)

## No-Go Conditions for Phase 1

1. **No trustworthy authentication boundary** without SUDAPASS integration
2. **Missing authorization** for mobile-specific data access
3. **Unsafe health-data exposure** in public APIs
4. **Insecure QR verification** without mandatory signature validation
5. **Undefined data ownership** and privacy boundaries
6. **Cross-user access risk** in fragmented travel models

## Conclusion

The NQP platform provides an excellent foundation for AFYATNA mobile with substantial reusable capabilities. The critical path forward involves SUDAPASS integration, mobile API design, and security hardening. The fragmented travel model and requirements engine require architectural consolidation before mobile implementation can proceed safely.

**RECOMMENDATION**: Proceed with Phase 1 implementation with the identified P0 blockers addressed first.

---

## Evidence Standard

Every important conclusion includes evidence:
- `[FOUND]` - requirement/artifact exists and is implemented in code
- `[PARTIAL]` - exists but incomplete, inconsistent with docs, or weakened  
- `[MISSING]` - searched for, not present anywhere in the repo
- `[INTERNAL]` - internal-only mechanism (backend service, seed command, test, helper)
- `[REUSABLE]` - existing capability can be adapted for mobile use
- `[ADAPTER]` - existing capability requires adapter layer for mobile

## Next Steps

1. Address P0 blockers (SUDAPASS integration, mobile API contract)
2. Define Phase 1 implementation contract with acceptance criteria
3. Establish security and privacy boundaries
4. Begin mobile technology stack evaluation and prototyping

---

*This executive summary is based on comprehensive repository audit with evidence-based findings. All conclusions are backed by actual code inspection and documentation analysis.*