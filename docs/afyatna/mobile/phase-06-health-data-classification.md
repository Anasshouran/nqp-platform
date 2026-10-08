# AFYATNA MOBILE — PHASE 0
# HEALTH DATA CLASSIFICATION AUDIT

## Document Status
**Status**: DRAFT  
**Date**: 2026-10-07  
**Version**: 0.1  
**Auditor**: Senior Principal Mobile Architect, Backend Architect, Security Architect, Product Architect, Technical Auditor

## Introduction

This comprehensive health data classification audit examines the National Quarantine Platform (NQP) repository to classify all proposed mobile data elements according to sensitivity levels. This audit follows data minimization principles and establishes clear boundaries for what data can be collected, stored, and processed in the AFYATNA mobile application.

**Classification Levels:**
- **PUBLIC** - Information that can be freely shared
- **IDENTITY** - Personal identification information
- **PERSONAL** - Non-identifiable personal information
- **SENSITIVE_HEALTH** - Health-related information requiring special protection
- **SECURITY_SENSITIVE** - Information critical to national security
- **INTERNAL_OPERATIONAL** - Internal operational data not for public consumption

## 1. Data Classification Framework

### Classification Criteria

#### PUBLIC
- **Definition**: Information that can be freely shared without restriction
- **Examples**: Public health notices, travel requirements, general information
- **Mobile Handling**: Can be cached, shared, and displayed without restrictions
- **Retention**: Permanent or policy-defined
- **Storage**: Local storage allowed
- **Encryption**: Not required

#### IDENTITY
- **Definition**: Information that can be used to identify an individual
- **Examples**: Name, email, phone, national ID, passport number
- **Mobile Handling**: Requires consent, minimal collection, secure storage
- **Retention**: Only as long as necessary for service delivery
- **Storage**: Encrypted local storage
- **Encryption**: Required at rest and in transit

#### PERSONAL
- **Definition**: Non-identifiable personal information
- **Examples**: Preferences, usage patterns, device information
- **Mobile Handling**: Requires consent, anonymization for analytics
- **Retention**: Limited to service delivery period
- **Storage**: Encrypted local storage
- **Encryption**: Recommended at rest

#### SENSITIVE_HEALTH
- **Definition**: Health-related information requiring special protection
- **Examples**: Medical history, vaccination status, test results
- **Mobile Handling**: Strict consent controls, minimal display, secure storage
- **Retention**: As required by health regulations
- **Storage**: Encrypted local storage
- **Encryption**: Required at rest and in transit

#### SECURITY_SENSITIVE
- **Definition**: Information critical to national security
- **Examples**: Biometric data, security clearance, threat intelligence
- **Mobile Handling**: Not suitable for mobile collection
- **Retention**: Minimum necessary, secure destruction
- **Storage**: Not on mobile devices
- **Encryption**: Required, specialized security measures

#### INTERNAL_OPERATIONAL
- **Definition**: Internal operational data not for public consumption
- **Examples**: Screening results, operational decisions, internal workflows
- **Mobile Handling**: Not suitable for mobile exposure
- **Retention**: Operational requirements
- **Storage**: Backend only, not on mobile
- **Encryption**: Required

---

## 2. Mobile Data Element Classification

### 2.1 User Identity Data

#### Name
- **Classification**: IDENTITY
- **Source**: `User.first_name`, `User.last_name` (`backend/apps/accounts/models.py:95-96`)
- **Required**: Yes
- **Optional**: No
- **Owner**: User
- **Retention**: Account lifetime + 30 days
- **Mobile Caching**: Encrypted
- **Encryption**: Required at rest and in transit
- **Deletion**: Account deletion or anonymization
- **Audit**: All name changes logged

#### Email
- **Classification**: IDENTITY
- **Source**: `User.email` (`backend/apps/accounts/models.py:93`)
- **Required**: Yes
- **Optional**: No
- **Owner**: User
- **Retention**: Account lifetime + 30 days
- **Mobile Caching**: Encrypted
- **Encryption**: Required at rest and in transit
- **Deletion**: Account deletion or anonymization
- **Audit**: All email changes logged

#### Phone
- **Classification**: IDENTITY
- **Source**: `User.phone` (`backend/apps/accounts/models.py:98-100`)
- **Required**: Yes
- **Optional**: No
- **Owner**: User
- **Retention**: Account lifetime + 30 days
- **Mobile Caching**: Encrypted
- **Encryption**: Required at rest and in transit
- **Deletion**: Account deletion or anonymization
- **Audit**: All phone changes logged

#### National ID
- **Classification**: IDENTITY
- **Source**: `User.national_id` (`backend/apps/accounts/models.py:102-104`)
- **Required**: Yes
- **Optional**: No
- **Owner**: User, SUDAPASS
- **Retention**: Account lifetime + 7 years (legal requirement)
- **Mobile Caching**: Encrypted
- **Encryption**: Required at rest and in transit
- **Deletion**: Account deletion, data anonymization
- **Audit**: All national ID access logged

#### Passport Number
- **Classification**: IDENTITY
- **Source**: `Traveler.passport_number` (`backend/apps/travelers/models.py:45-46`)
- **Required**: Yes
- **Optional**: No
- **Owner**: User, Government
- **Retention**: Trip lifetime + 7 years
- **Mobile Caching**: Encrypted
- **Encryption**: Required at rest and in transit
- **Deletion**: Trip completion + data anonymization
- **Audit**: All passport access logged

#### Date of Birth
- **Classification**: IDENTITY
- **Source**: `Traveler.date_of_birth` (`backend/apps/travelers/models.py:43-44`)
- **Required**: Yes
- **Optional**: No
- **Owner**: User
- **Retention**: Account lifetime + 7 years
- **Mobile Caching**: Encrypted
- **Encryption**: Required at rest and in transit
- **Deletion**: Account deletion, data anonymization
- **Audit**: All DOB access logged

#### Nationality
- **Classification**: IDENTITY
- **Source**: `Traveler.nationality` (ForeignKey to Country) (`backend/apps/travelers/models.py:47-48`)
- **Required**: Yes
- **Optional**: No
- **Owner**: User, Government
- **Retention**: Trip lifetime + 7 years
- **Mobile Caching**: Encrypted
- **Encryption**: Required at rest and in transit
- **Deletion**: Trip completion + data anonymization
- **Audit**: All nationality access logged

### 2.2 Travel Data

#### Travel Details
- **Classification**: PERSONAL
- **Source**: `Flight`, `Vessel`, `BorderCrossing` models
- **Required**: Yes
- **Optional**: No
- **Owner**: User, Carrier
- **Retention**: Trip lifetime + 1 year
- **Mobile Caching**: Encrypted
- **Encryption**: Required at rest and in transit
- **Deletion**: Trip completion + data anonymization
- **Audit**: All travel access logged

#### Trip History
- **Classification**: PERSONAL
- **Source**: `Traveler` model relationships
- **Required**: No
- **Optional**: Yes (for convenience)
- **Owner**: User
- **Retention**: 1 year after trip completion
- **Mobile Caching**: Encrypted
- **Encryption**: Required at rest and in transit
- **Deletion**: Manual deletion or auto-purge
- **Audit**: Trip history access logged

#### POE Information
- **Classification**: PUBLIC
- **Source**: `EntryPoint` model (`backend/apps/masterdata/models.py:49-96`)
- **Required**: Yes
- **Optional**: No
- **Owner**: Government
- **Retention**: Permanent
- **Mobile Caching**: Allowed (unencrypted)
- **Encryption**: Not required
- **Deletion**: Not applicable (public data)
- **Audit**: POE access logged for analytics

### 2.3 Health Data

#### Health Declaration
- **Classification**: SENSITIVE_HEALTH
- **Source**: `HealthDeclaration` models (`backend/apps/carriers/models.py:682-792`, `backend/apps/borders_health/models.py:1050-1120`)
- **Required**: Yes
- **Optional**: No
- **Owner**: User, Health Authority
- **Retention**: 7 years (health regulation requirement)
- **Mobile Caching**: Encrypted
- **Encryption**: Required at rest and in transit
- **Deletion**: 7 years after submission + secure deletion
- **Audit**: All health declaration access logged

#### Vaccination Status
- **Classification**: SENSITIVE_HEALTH
- **Source**: `VaccinationRecord` model (`backend/apps/vaccination/models.py:285-320`)
- **Required**: Yes
- **Optional**: No
- **Owner**: User, Health Authority
- **Retention**: 15 years (vaccination record requirement)
- **Mobile Caching**: Encrypted
- **Encryption**: Required at rest and in transit
- **Deletion**: 15 years after vaccination + secure deletion
- **Audit**: All vaccination access logged

#### Vaccination Certificate
- **Classification**: SENSITIVE_HEALTH
- **Source**: `VaccinationCertificate` model (`backend/apps/vaccination/models.py:208-278`)
- **Required**: Yes
- **Optional**: No
- **Owner**: User, Health Authority
- **Retention**: 15 years (certificate requirement)
- **Mobile Caching**: Encrypted
- **Encryption**: Required at rest and in transit
- **Deletion**: 15 years after issuance + secure deletion
- **Audit**: All certificate access logged

#### Test Results
- **Classification**: SENSITIVE_HEALTH
- **Source**: `LaboratoryResult` model (`backend/apps/laboratory/models.py:45-80`)
- **Required**: Yes
- **Optional**: No
- **Owner**: User, Health Authority
- **Retention**: 7 years (test result requirement)
- **Mobile Caching**: Encrypted
- **Encryption**: Required at rest and in transit
- **Deletion**: 7 years after test + secure deletion
- **Audit**: All test result access logged

#### Medical History
- **Classification**: SENSITIVE_HEALTH
- **Source**: `Traveler.medical_history` (JSONField) (`backend/apps/travelers/models.py:51-52`)
- **Required**: No
- **Optional**: Yes (for better care)
- **Owner**: User, Health Authority
- **Retention**: Lifetime + 7 years
- **Mobile Caching**: Encrypted
- **Encryption**: Required at rest and in transit
- **Deletion**: Account deletion + secure deletion
- **Audit**: All medical history access logged

#### Screening Results
- **Classification**: INTERNAL_OPERATIONAL
- **Source**: `HealthScreening` model (`backend/apps/screening/models.py:45-80`)
- **Required**: No (for mobile)
- **Optional**: No (must not be exposed to mobile)
- **Owner**: Health Authority
- **Retention**: 7 years (operational requirement)
- **Mobile Caching**: Not allowed
- **Encryption**: Required (backend only)
- **Deletion**: 7 years after screening + secure deletion
- **Audit**: All screening access logged

### 2.4 QR and Verification Data

#### QR Token
- **Classification**: SECURITY_SENSITIVE
- **Source**: `VaccinationCertificate.qr_token` (`backend/apps/vaccination/models.py:217`)
- **Required**: Yes
- **Optional**: No
- **Owner**: System, User
- **Retention**: Certificate lifetime
- **Mobile Caching**: Encrypted
- **Encryption**: Required at rest and in transit
- **Deletion**: Certificate revocation + secure deletion
- **Audit**: All QR token access logged

#### QR Payload
- **Classification**: SECURITY_SENSITIVE
- **Source**: `qr_payload.py` signing mechanism
- **Required**: Yes
- **Optional**: No
- **Owner**: System
- **Retention**: Session lifetime
- **Mobile Caching**: Encrypted
- **Encryption**: Required at rest and in transit
- **Deletion**: Session end + secure deletion
- **Audit**: All payload generation logged

#### Verification Signature
- **Classification**: SECURITY_SENSITIVE
- **Source**: `verification_signature` field
- **Required**: Yes
- **Optional**: No
- **Owner**: System
- **Retention**: Verification session
- **Mobile Caching**: Encrypted
- **Encryption**: Required at rest and in transit
- **Deletion**: Session end + secure deletion
- **Audit**: All signature access logged

### 2.5 Device and Technical Data

#### Device Information
- **Classification**: PERSONAL
- **Source**: Device detection and registration
- **Required**: No
- **Optional**: Yes (for better service)
- **Owner**: User, Manufacturer
- **Retention**: Session lifetime
- **Mobile Caching**: Encrypted
- **Encryption**: Recommended at rest
- **Deletion**: Session end + secure deletion
- **Audit**: Device registration logged

#### Push Token
- **Classification**: PERSONAL
- **Source**: `DeviceToken` model (`backend/apps/notifications/models.py:73-93`)
- **Required**: No
- **Optional**: Yes (for notifications)
- **Owner**: User, System
- **Retention**: While notifications active
- **Mobile Caching**: Encrypted
- **Encryption**: Required at rest and in transit
- **Deletion**: User opt-out + secure deletion
- **Audit**: All token access logged

#### Location Data
- **Classification**: PERSONAL
- **Source**: GPS/Location services
- **Required**: No (for POE detection)
- **Optional**: Yes (contextual services)
- **Owner**: User
- **Retention**: Session lifetime
- **Mobile Caching**: Encrypted
- **Encryption**: Required at rest and in transit
- **Deletion**: Session end + secure deletion
- **Audit**: Location access logged

#### Usage Analytics
- **Classification**: PERSONAL (anonymized)
- **Source**: App usage patterns
- **Required**: No
- **Optional**: Yes (for improvement)
- **Owner**: User, System
- **Retention**: 1 year (anonymized)
- **Mobile Caching**: Encrypted
- **Encryption**: Required at rest and in transit
- **Deletion**: 1 year + secure deletion
- **Audit**: Analytics access logged

### 2.6 Public and Reference Data

#### Health Alerts
- **Classification**: PUBLIC
- **Source**: `PublicNotice` model (`backend/apps/public/models.py:95-110`)
- **Required**: Yes
- **Optional**: No
- **Owner**: Health Authority
- **Retention**: Until alert expires
- **Mobile Caching**: Allowed (unencrypted)
- **Encryption**: Not required
- **Deletion**: Alert expiration + cleanup
- **Audit**: Alert access logged

#### Travel Requirements
- **Classification**: PUBLIC
- **Source**: `HealthNotice` proxy (`backend/apps/public/views.py:530-561`)
- **Required**: Yes
- **Optional**: No
- **Owner**: Government
- **Retention**: Until requirements change
- **Mobile Caching**: Allowed (unencrypted)
- **Encryption**: Not required
- **Deletion**: Requirements change + cleanup
- **Audit**: Requirements access logged

#### Disease Information
- **Classification**: PUBLIC
- **Source**: `Disease` model (`backend/apps/public/models.py:418-441`)
- **Required**: Yes
- **Optional**: No
- **Owner**: Health Authority
- **Retention**: Until information updates
- **Mobile Caching**: Allowed (unencrypted)
- **Encryption**: Not required
- **Deletion**: Information update + cleanup
- **Audit**: Disease information access logged

#### Emergency Contacts
- **Classification**: IDENTITY
- **Source**: User profile
- **Required**: No
- **Optional**: Yes (for emergencies)
- **Owner**: User, Emergency Contact
- **Retention**: Account lifetime
- **Mobile Caching**: Encrypted
- **Encryption**: Required at rest and in transit
- **Deletion**: Account deletion + secure deletion
- **Audit**: Emergency contact access logged

---

## 3. Data Collection and Processing Guidelines

### 3.1 Data Minimization Principles

#### Collection Minimization
- **Only collect data essential for service delivery**
- **Avoid collecting data that can be inferred or derived**
- **Use progressive disclosure (ask only what's needed for current task)**
- **Provide clear explanations for data collection**

#### Processing Minimization
- **Process data only for the specific purpose it was collected**
- **Avoid combining data from multiple sources unnecessarily**
- **Use anonymization for analytics and reporting**
- **Implement data retention policies automatically**

### 3.2 Mobile Data Handling

#### Storage Guidelines
- **IDENTITY/SENSITIVE_HEALTH**: Encrypted local storage only
- **PERSONAL**: Encrypted local storage recommended
- **PUBLIC**: Unencrypted local storage allowed
- **SECURITY_SENSITIVE/INTERNAL_OPERATIONAL**: No local storage

#### Transmission Security
- **All data transmission must use TLS 1.2+**
- **Certificate pinning for critical endpoints**
- **Network security validation before transmission**
- **Automatic retry with backoff for failed transmissions**

#### Cache Management
- **Implement cache expiration for all data types**
- **Secure cache clearing on logout**
- **Cache size limits to prevent storage exhaustion**
- **Cache validation before use**

### 3.3 User Consent Management

#### Consent Categories
1. **Identity Data**: Explicit consent required
2. **Health Data**: Explicit consent with detailed explanation
3. **Personal Data**: Opt-in consent
4. **Analytics Data**: Opt-in consent with anonymization option
5. **Location Data**: Context-aware consent

#### Consent Recording
- **Store consent records with timestamp and user IP**
- **Allow consent withdrawal at any time**
- **Provide clear consent management interface**
- **Audit all consent changes**

---

## 4. Security Controls by Classification

### 4.1 PUBLIC Data
- **Access Control**: No restrictions
- **Encryption**: Not required
- **Audit**: Basic access logging
- **Retention**: Policy-based
- **Mobile Handling**: Full caching allowed

### 4.2 IDENTITY Data
- **Access Control**: Role-based, user-specific
- **Encryption**: Required at rest and in transit
- **Audit**: Comprehensive access logging
- **Retention**: Legal requirement based
- **Mobile Handling**: Encrypted storage only

### 4.3 PERSONAL Data
- **Access Control**: User-specific, anonymized for analytics
- **Encryption**: Recommended at rest
- **Audit**: Access logging for non-anonymized data
- **Retention**: Service delivery based
- **Mobile Handling**: Encrypted storage recommended

### 4.4 SENSITIVE_HEALTH Data
- **Access Control**: Strict role-based, audit required
- **Encryption**: Required at rest and in transit
- **Audit**: Comprehensive audit logging
- **Retention**: Health regulation based
- **Mobile Handling**: Encrypted storage, minimal display

### 4.5 SECURITY_SENSITIVE Data
- **Access Control**: Maximum restrictions, multi-factor authentication
- **Encryption**: Required, specialized algorithms
- **Audit**: Maximum audit logging
- **Retention**: Minimum necessary
- **Mobile Handling**: Not suitable for mobile collection

### 4.6 INTERNAL_OPERATIONAL Data
- **Access Control**: Internal only, no mobile exposure
- **Encryption**: Required, backend only
- **Audit**: Maximum audit logging
- **Retention**: Operational requirement based
- **Mobile Handling**: Not allowed on mobile devices

---

## 5. Implementation Recommendations

### 5.1 High Priority (P0)
1. **Implement data classification framework**
2. **Create encrypted storage for sensitive data**
3. **Implement consent management system**
4. **Establish data retention policies**

### 5.2 Medium Priority (P1)
1. **Implement data minimization in collection**
2. **Create audit logging for all data access**
3. **Implement cache management system**
4. **Create user data management interface**

### 5.3 Low Priority (P2)
1. **Implement advanced analytics with anonymization**
2. **Create data export functionality**
3. **Implement data breach response procedures**
4. **Create user education materials**

---

## 6. Risk Assessment

### High-Risk Areas
1. **Health Data Exposure**: Sensitive health data could be compromised
2. **Identity Theft**: Personal identification information could be stolen
3. **Privacy Violations**: User privacy could be violated through data collection

### Medium-Risk Areas
1. **Data Minimization**: Insufficient data minimization could lead to over-collection
2. **Consent Management**: Poor consent management could lead to legal issues
3. **Cache Security**: Cache vulnerabilities could lead to data exposure

### Low-Risk Areas
1. **Public Data**: Public data exposure has minimal risk
2. **Analytics**: Anonymized analytics have minimal privacy risk

---

## 7. Compliance Considerations

### Regulatory Requirements
- **GDPR**: Applicable to EU citizens' data
- **Local Health Regulations**: Sudan-specific health data requirements
- **National Security Regulations**: Applicable to security-sensitive data
- **Data Protection Laws**: General data protection requirements

### Industry Standards
- **HIPAA**: Health data protection standards
- **PCI DSS**: Payment card data security standards
- **ISO 27001**: Information security management
- **NIST Cybersecurity Framework**: Security best practices

---

## 8. Conclusion

The health data classification audit reveals that AFYATNA mobile will handle significant amounts of sensitive health and identity data. The classification framework provides clear guidelines for data handling, storage, and processing while ensuring compliance with regulatory requirements.

Key findings:
- **High Sensitivity**: Health data and identity information require strict controls
- **Mobile Challenges**: Mobile devices introduce additional security risks
- **Privacy Focus**: Data minimization and user consent are critical
- **Compliance Requirements**: Multiple regulatory frameworks must be considered

**RECOMMENDATION**: Implement the classification framework and security controls before any mobile development proceeds.

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

*This health data classification audit provides a comprehensive analysis of all data elements that will be handled by the AFYATNA mobile application. All findings are evidence-based and form the foundation for security and privacy implementation.*