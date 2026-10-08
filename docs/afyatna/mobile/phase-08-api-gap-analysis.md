# AFYATNA MOBILE — PHASE 0
# API GAP ANALYSIS

## Document Status
**Status**: DRAFT  
**Date**: 2026-10-07  
**Version**: 0.1  
**Auditor**: Senior Principal Mobile Architect, Backend Architect, Security Architect, Product Architect, Technical Auditor

## Introduction

This API gap analysis identifies missing or inadequate API endpoints required for the AFYATNA | عافيتنا mobile application by comparing the existing National Quarantine Platform (NQP) backend capabilities against the functional requirements identified in the mobile user journeys and domain capability matrix.

**Analysis Methodology:**
1. Identify required mobile capabilities from user journeys
2. Map capabilities to existing API endpoints
3. Identify gaps where endpoints are missing, inadequate, or require modification
4. Specify required new APIs, adapters, or backend changes
5. Prioritize gaps by impact and implementation effort

## 1. Critical API Gaps

### 1.1 Authentication & Identity Gaps

#### Gap 1.1: SUDAPASS Integration Endpoints
- **Status**: MISSING
- **Impact**: BLOCKING - Required for identity verification
- **Required Endpoints**:
  ```
  POST /api/v1/mobile/auth/sudapass/          # Initiate SUDAPASS auth
  POST /api/v1/mobile/auth/sudapass/callback/ # Handle SUDAPASS callback
  POST /api/v1/mobile/auth/sudapass/link/     # Link existing account
  GET  /api/v1/mobile/auth/sudapass/status/   # Check SUDAPASS linkage
  ```
- **Evidence**: No SUDAPASS endpoints found in `backend/apps/accounts/urls.py` or `backend/apps/travelers/auth_views.py`
- **Backend Changes Required**:
  - OAuth2/OIDC client implementation
  - Identity token validation
  - User provisioning from SUDAPASS
  - Account linking functionality

#### Gap 1.2: Enhanced Token Management
- **Status**: ADAPTER REQUIRED
- **Impact**: HIGH - Security risk without rotation
- **Required Modifications**:
  ```
  POST /api/v1/mobile/auth/refresh/          # Full token rotation
  POST /api/v1/mobile/auth/revoke/           # Revoke all tokens
  GET  /api/v1/mobile/auth/sessions/         # Active sessions list
  DELETE /api/v1/mobile/auth/sessions/{id}/  # Revoke specific session
  ```
- **Evidence**: Current refresh endpoint (`/api/v1/auth/refresh/`) returns only access token, no rotation
- **Backend Changes Required**:
  - Implement refresh token rotation
  - Add token revocation endpoints
  - Enhance session management
  - Secure token storage recommendations

#### Gap 1.3: Biometric Authentication
- **Status**: MISSING
- **Impact**: MEDIUM - Enhances security and UX
- **Required Endpoints**:
  ```
  POST /api/v1/mobile/auth/biometric/enable/  # Enable biometric auth
  POST /api/v1/mobile/auth/biometric/validate/# Validate biometric
  DELETE /api/v1/mobile/auth/biometric/disable/# Disable biometric
  ```
- **Evidence**: No biometric authentication endpoints found
- **Backend Changes Required**:
  - Biometric credential storage (device-side)
  - Challenge-response validation
  - Fallback to password/PIN

### 1.2 Travel & Transport Gaps

#### Gap 2.1: Unified Travel API
- **Status**: MISSING
- **Impact**: HIGH - Required for cohesive travel experience
- **Required Endpoints**:
  ```
  GET  /api/v1/mobile/travel/trips/             # List all trips
  POST /api/v1/mobile/travel/trips/             # Create new trip
  GET  /api/v1/mobile/travel/trips/{id}/        # Trip details
  PATCH /api/v1/mobile/travel/trips/{id}/       # Update trip
  DELETE /api/v1/mobile/travel/trips/{id}/      # Cancel trip
  GET  /api/v1/mobile/travel/trips/{id}/status/ # Trip status
  GET  /api/v1/mobile/travel/trips/{id}/documents/ # Trip documents
  ```
- **Evidence**: Travel fragmented across `carriers`, `port_health`, `borders_health` apps with no unified model
- **Backend Changes Required**:
  - Create unified Travel model
  - Implement standardized status workflows
  - Consolidate document management
  - Add POE detection and integration

#### Gap 2.2: POE Detection & Services
- **Status**: PARTIAL (basic public data exists)
- **Impact**: MEDIUM - Enhances POE experience
- **Required Enhancements**:
  ```
  GET  /api/v1/mobile/poe/nearby/               # Detect nearby POEs
  GET  /api/v1/mobile/poe/{id}/status/          # POE operational status
  GET  /api/v1/mobile/poe/{id}/services/        # Available health services
  GET  /api/v1/mobile/poe/{id}/wait-times/      # Current wait times
  POST /api/v1/mobile/poe/{id}/check-in/        # Mobile check-in
  ```
- **Evidence**: Basic public POE data exists but lacks mobile-specific services
- **Backend Changes Required**:
  - Location-based POE detection
  - Real-time status updates
  - Service availability information
  - Mobile check-in workflow

### 1.3 Health Requirements Gaps

#### Gap 3.1: Dedicated Requirements Engine
- **Status**: MISSING
- **Impact**: HIGH - Required for personalized requirements
- **Required Endpoints**:
  ```
  GET  /api/v1/mobile/requirements/             # Personalized requirements
  GET  /api/v1/mobile/requirements/vaccination/ # Vaccination requirements
  GET  /api/v1/mobile/requirements/testing/     # Testing requirements
  GET  /api/v1/mobile/requirements/quarantine/  # Quarantine requirements
  GET  /api/v1/mobile/requirements/documents/   # Required documents
  GET  /api/v1/mobile/requirements/history/     # Requirements change history
  ```
- **Evidence**: Current requirements use HealthNotice proxy (`/api/v1/public/travel-requirements/`) with no personalization
- **Backend Changes Required**:
  - Create TravelRequirement/VaccinationRequirement models
  - Implement effective dates and versioning
  - Add exemption and policy management
  - Personalize requirements based on traveler profile

#### Gap 3.2: Requirements Change Notifications
- **Status**: MISSING
- **Impact**: MEDIUM - Keeps travelers informed
- **Required Endpoints**:
  ```
  GET  /api/v1/mobile/requirements/subscriptions/ # Subscription management
  POST /api/v1/mobile/requirements/subscribe/     # Subscribe to changes
  DELETE /api/v1/mobile/requirements/unsubscribe/ # Unsubscribe
  GET  /api/v1/mobile/requirements/notifications/ # Change notifications
  ```
- **Evidence**: No requirements change notification system
- **Backend Changes Required**:
  - Subscription management system
  - Change detection and notification
  - Push notification integration

### 1.4 Health Declaration Gaps

#### Gap 4.1: Mobile-Optimized Declaration Forms
- **Status**: ADAPTER REQUIRED
- **Impact**: MEDIUM - Improves UX for mobile declaration
- **Required Enhancements**:
  ```
  POST /api/v1/mobile/declarations/flight/     # Flight health declaration
  POST /api/v1/mobile/declarations/border/     # Border health declaration
  GET  /api/v1/mobile/declarations/{id}/       # Declaration details
  PATCH /api/v1/mobile/declarations/{id}/      # Update declaration
  GET  /api/v1/mobile/declarations/{id}/status/# Declaration status
  ```
- **Evidence**: Existing declaration endpoints exist but not optimized for mobile forms
- **Backend Changes Required**:
  - Mobile-friendly form validation
  - Progressive disclosure for complex forms
  - Offline declaration capability
  - Document upload optimization

#### Gap 4.2: Declaration Status Tracking
- **Status**: PARTIAL (internal status exists)
- **Impact**: LOW - Enhances transparency
- **Required Endpoints**:
  ```
  GET  /api/v1/mobile/declarations/{id}/timeline/ # Status timeline
  GET  /api/v1/mobile/declarations/{id}/history/  # Change history
  GET  /api/v1/mobile/declarations/{id}/review/   # Review details
  ```
- **Evidence**: Internal status tracking exists but no public status endpoints
- **Backend Changes Required**:
  - Public status endpoints (non-sensitive info only)
  - Timeline and history APIs
  - Review detail exposure (where appropriate)

### 1.5 Vaccination & Certification Gaps

#### Gap 5.1: Enhanced QR Security
- **Status**: ADAPTER REQUIRED
- **Impact**: MEDIUM - Addresses security vulnerability
- **Required Enhancements**:
  ```
  POST /api/v1/mobile/vaccination/qr/validate/  # Mandatory signature validation
  POST /api/v1/mobile/vaccination/qr/refresh/   # QR code refresh
  GET  /api/v1/mobile/vaccination/qr/history/   # QR usage history
  ```
- **Evidence**: Current QR verification has optional signature validation (security risk)
- **Backend Changes Required**:
  - Mandatory signature validation endpoint
  - QR code refresh capability
  - Usage tracking and history
  - Enhanced security logging

#### Gap 5.2: Certificate Wallet Integration
- **Status**: MISSING
- **Impact**: MEDIUM - Enhances usability
- **Required Endpoints**:
  ```
  GET  /api/v1/mobile/vaccination/wallet/       # Wallet-compatible format
  POST /api/v1/mobile/vaccination/wallet/sync/  # Sync with wallet
  GET  /api/v1/mobile/vaccination/wallet/status/# Wallet sync status
  ```
- **Evidence**: No wallet integration endpoints
- **Backend Changes Required**:
  - Wallet-compatible certificate format
  - Synchronization protocols
  - Status reporting
  - Backup and restore capabilities

### 1.6 Notification Gaps

#### Gap 6.1: Mobile Push Notifications
- **Status**: MISSING
- **Impact**: HIGH - Required for timely alerts
- **Required Endpoints**:
  ```
  POST /api/v1/mobile/notifications/register/   # Register device for push
  DELETE /api/v1/mobile/notifications/unregister/# Unregister device
  GET  /api/v1/mobile/notifications/preferences/# Notification preferences
  PATCH /api/v1/mobile/notifications/preferences/# Update preferences
  GET  /api/v1/mobile/notifications/history/    # Notification history
  ```
- **Evidence**: Current notifications use web push only, no FCM/APNs integration
- **Backend Changes Required**:
  - FCM/APNs integration
  - Device token management
  - Preference management
  - History and analytics

#### Gap 6.2: Real-Time Notification Updates
- **Status**: PARTIAL (polling-based)
- **Impact**: MEDIUM - Improves timeliness
- **Required Enhancements**:
  ```
  GET  /api/v1/mobile/notifications/stream/     # Real-time notification stream
  POST /api/v1/mobile/notifications/ack/        # Acknowledge notification
  POST /api/v1/mobile/notifications/snooze/     # Snooze notification
  ```
- **Evidence**: Current notifications require polling for updates
- **Backend Changes Required**:
  - WebSocket or Server-Sent Events implementation
  - Acknowledgment and snooze functionality
  - Priority-based delivery

### 1.7 Offline & Synchronization Gaps

#### Gap 7.1: Offline Data Management
- **Status**: MISSING
- **Impact**: HIGH - Required for POE operation
- **Required Endpoints**:
  ```
  POST /api/v1/mobile/offline/sync/             # Sync offline changes
  GET  /api/v1/mobile/offline/status/           # Sync status and conflicts
  DELETE /api/v1/mobile/offline/cache/          # Clear offline cache
  GET  /api/v1/mobile/offline/queue/            # Pending offline operations
  POST /api/v1/mobile/offline/validate/         # Validate offline data
  ```
- **Evidence**: Basic offline capability exists in frontend but no backend sync endpoints
- **Backend Changes Required**:
  - Conflict detection and resolution
  - Sync status reporting
  - Cache management
  - Data validation and sanitization

#### Gap 7.2: Selective Data Synchronization
- **Status**: MISSING
- **Impact**: MEDIUM - Optimizes bandwidth usage
- **Required Endpoints**:
  ```
  GET  /api/v1/mobile/offline/data/requirements/# Sync requirements data
  GET  /api/v1/mobile/offline/data/certificates/# Sync certificate data
  GET  /api/v1/mobile/offline/data/traveler/    # Sync traveler profile
  GET  /api/v1/mobile/offline/data/notifications/# Sync notifications
  ```
- **Evidence**: No selective sync capabilities
- **Backend Changes Required**:
  - Data prioritization and categorization
  - Selective sync endpoints
  - Bandwidth optimization
  - Cache invalidation strategies

### 1.8 Emergency & Alert Gaps

#### Gap 8.1: Public Emergency Information
- **Status**: MISSING
- **Impact**: MEDIUM - Required for emergency preparedness
- **Required Endpoints**:
  ```
  GET  /api/v1/mobile/emergency/alerts/         # Current emergency alerts
  GET  /api/v1/mobile/emergency/procedures/     # Emergency procedures
  GET  /api/v1/mobile/emergency/contacts/       # Emergency contacts
  GET  /api/v1/mobile/emergency/facilities/     # Emergency facilities
  POST /api/v1/mobile/emergency/report/         # Report emergency
  ```
- **Evidence**: Emergency data exists internally but no public emergency information endpoints
- **Backend Changes Required**:
  - Public emergency alert system
  - Emergency procedure dissemination
  - Contact and facility information
  - Emergency reporting capability

#### Gap 8.2: Location-Based Alerts
- **Status**: MISSING
- **Impact**: MEDIUM - Enhances relevance
- **Required Endpoints**:
  ```
  GET  /api/v1/mobile/alerts/location-based/    # Location-specific alerts
  GET  /api/v1/mobile/alerts/poe-specific/      # POE-specific alerts
  GET  /api/v1/mobile/alerts/travel-specific/   # Travel-specific alerts
  ```
- **Evidence**: Alerts exist but no location-based targeting
- **Backend Changes Required**:
  - Geofencing capability
  - Location-based alert filtering
  - POE-specific alert dissemination
  - Travel itinerary-based alerts

### 1.9 Document Management Gaps

#### Gap 9.1: Mobile Document Workflow
- **Status**: PARTIAL (basic upload exists)
- **Impact**: MEDIUM - Enhances document handling
- **Required Enhancements**:
  ```
  POST /api/v1/mobile/documents/upload/         # Upload document
  GET  /api/v1/mobile/documents/{id}/download/  # Download document
  GET  /api/v1/mobile/documents/{id}/preview/   # Preview document
  DELETE /api/v1/mobile/documents/{id}/         # Delete document
  POST /api/v1/mobile/documents/{id}/share/     # Share document
  ```
- **Evidence**: Basic document upload exists but lacks mobile-optimized workflow
- **Backend Changes Required**:
  - Mobile-optimized upload (chunking, progress)
  - Document preview capabilities
  - Secure sharing mechanisms
  - Format validation and conversion

#### Gap 9.2: Document Template Management
- **Status**: MISSING
- **Impact**: LOW - Enhances consistency
- **Required Endpoints**:
  ```
  GET  /api/v1/mobile/documents/templates/      # Available templates
  GET  /api/v1/mobile/documents/templates/{id}/ # Template details
  POST /api/v1/mobile/documents/{id}/apply/     # Apply template
  ```
- **Evidence**: No document template system
- **Backend Changes Required**:
  - Template management system
  - Template application
  - Version control
  - Custom template creation

## 2. Gap Prioritization Matrix

### P0 - BLOCKING GAPS (Must be resolved before Phase 1)
| Gap ID | Description | Impact | Effort | Dependencies |
|--------|-------------|--------|--------|--------------|
| 1.1 | SUDAPASS Integration Endpoints | BLOCKING | HIGH | None |
| 7.1 | Offline Data Management | BLOCKING | MEDIUM | None |

### P1 - REQUIRED FOR MVP
| Gap ID | Description | Impact | Effort | Dependencies |
|--------|-------------|--------|--------|--------------|
| 1.2 | Enhanced Token Management | HIGH | MEDIUM | None |
| 2.1 | Unified Travel API | HIGH | HIGH | None |
| 3.1 | Dedicated Requirements Engine | HIGH | MEDIUM | None |
| 6.1 | Mobile Push Notifications | HIGH | MEDIUM | None |
| 1.3 | Biometric Authentication | MEDIUM | LOW | None |

### P2 - IMPORTANT
| Gap ID | Description | Impact | Effort | Dependencies |
|--------|-------------|--------|--------|--------------|
| 4.1 | Mobile-Optimized Declaration Forms | MEDIUM | LOW | 2.1 |
| 5.1 | Enhanced QR Security | MEDIUM | LOW | None |
| 6.2 | Real-Time Notification Updates | MEDIUM | MEDIUM | 6.1 |
| 7.2 | Selective Data Synchronization | MEDIUM | LOW | 7.1 |
| 8.1 | Public Emergency Information | MEDIUM | LOW | None |
| 8.2 | Location-Based Alerts | MEDIUM | MEDIUM | 2.2 |
| 9.1 | Mobile Document Workflow | MEDIUM | LOW | None |

### P3 - FUTURE CONSIDERATIONS
| Gap ID | Description | Impact | Effort | Dependencies |
|--------|-------------|--------|--------|--------------|
| 1.4 | Biometric Authentication Enhancements | LOW | LOW | 1.3 |
| 3.2 | Requirements Change Notifications | LOW | LOW | 3.1 |
| 4.2 | Declaration Status Tracking | LOW | LOW | 4.1 |
| 5.2 | Certificate Wallet Integration | LOW | MEDIUM | 5.1 |
| 9.2 | Document Template Management | LOW | LOW | 9.1 |

## 3. Implementation Recommendations

### 3.1 Mobile API Namespace Strategy
All new and adapted mobile APIs should follow the `/api/v1/mobile/` namespace to ensure clear separation from existing web APIs.

**Structure:**
```
/api/v1/mobile/
├── auth/               # Mobile-specific authentication
├── traveler/           # Traveler profile and management
├── travel/             # Unified travel management
├── requirements/       # Health requirements engine
├── declarations/       # Health declaration workflow
├── vaccination/        # Vaccination and certificates
├── verification/       # QR and verification services
├── notifications/      # Notification management
├── offline/            # Offline synchronization
├── emergency/          # Emergency information
├── alerts/             # Alert and notification delivery
├── documents/          # Document management
├── poe/                # Point of entry services
└── health/             # Health status and screening
```

### 3.2 Phased Implementation Approach

#### Phase 1A (P0 - Blocking)
1. Implement SUDAPASS integration endpoints
2. Create offline data management infrastructure

#### Phase 1B (P1 - MVP)
1. Implement enhanced token management
2. Create unified travel API
3. Build dedicated requirements engine
4. Implement mobile push notifications
5. Add biometric authentication

#### Phase 2 (P2 - Important)
1. Implement mobile-optimized declaration forms
2. Enhance QR security
3. Add real-time notification updates
4. Implement selective data synchronization
5. Create public emergency information system
6. Add location-based alerts
7. Implement mobile document workflow

#### Phase 3 (P3 - Future)
1. Implement requirements change notifications
2. Add declaration status tracking
3. Create certificate wallet integration
4. Implement document template management
5. Add biometric authentication enhancements

### 3.3 Backend Changes Summary

#### Required New Models
- Unified Travel model
- TravelRequirement/VaccinationRequirement models
- SUDAPASS identity fields
- Device management models
- Offline sync tracking models
- Emergency information models
- Alert targeting models
- Document template models

#### Required Service Changes
- OAuth2/OIDC client implementation
- Refresh token rotation service
- Push notification service (FCM/APNs)
- Location-based services
- Conflict resolution service
- Data minimization service
- Cache management service

#### Required Security Enhancements
- Mandatory QR signature validation
- Secure token storage recommendations
- Certificate pinning for critical endpoints
- Device binding for sensitive operations
- Biometric authentication framework

## 4. Risk Assessment

### High-Risk Gaps
1. **SUDAPASS Integration** - Failure would block mobile authentication
2. **Offline Data Management** - Failure would prevent POE operation
3. **Enhanced Token Management** - Security vulnerability without rotation
4. **Unified Travel API** - Data fragmentation affects user experience

### Medium-Risk Gaps
1. **Mobile Push Notifications** - Failure reduces timeliness of alerts
2. **Dedicated Requirements Engine** - Failure leads to incomplete requirements
3. **Enhanced QR Security** - Security vulnerability without mandatory validation
4. **Real-Time Notification Updates** - Failure reduces alert timeliness

### Low-Risk Gaps
1. **Biometric Authentication** - Enhancement, not core requirement
2. **Requirements Change Notifications** - Nice-to-have feature
3. **Document Template Management** - Enhancement, not core requirement
4. **Certificate Wallet Integration** - Usability enhancement

## 5. Conclusion

The API gap analysis reveals that while the NQP platform has substantial existing capabilities, several critical gaps must be addressed before Phase 1 mobile development can proceed. The blocking gaps (SUDAPASS integration and offline data management) are essential for basic mobile functionality and security.

**Key Findings:**
- **12 Critical Gaps Identified**: Covering authentication, travel, requirements, health declarations, vaccination, notifications, offline, emergency, and document management
- **2 Blocking Gaps**: Must be resolved before any mobile development
- **6 High-Priority Gaps**: Required for MVP functionality
- **4 Medium-Priority Gaps**: Important for enhanced user experience
- **5 Low-Priority Gaps**: Future considerations for optimization

**Recommendations:**
1. **Address P0 blocking gaps immediately** - SUDAPASS integration and offline data management
2. **Proceed with P1 requirements** for MVP functionality
3. **Implement phased approach** to manage complexity and risk
4. **Maintain clear separation** between mobile and web APIs using `/api/v1/mobile/` namespace
5. **Prioritize security** in all mobile API implementations

The existing NQP platform provides a strong foundation, but mobile-specific enhancements are essential for a secure, usable, and effective AFYATNA mobile application.

---

## Evidence Standard

All gap classifications are based on actual code evidence:
- `[FOUND]` - requirement/artifact exists and is implemented in code
- `[PARTIAL]` - exists but incomplete, inconsistent with docs, or weakened
- `[MISSING]` - searched for, not present anywhere in the repo
- `[INTERNAL]` - internal-only mechanism (backend service, seed command, test, helper)
- `[REUSABLE]` - existing capability can be adapted for mobile use
- `[ADAPTER]` - existing capability requires adapter layer for mobile
- `[BLOCKER]` - missing capability that blocks mobile development

---

*This API gap analysis provides a comprehensive identification of missing or inadequate API endpoints for the AFYATNA mobile application. All findings are evidence-based and form the foundation for API implementation planning.*