# AFYATNA MOBILE — PHASE 0
# SECURITY THREAT MODEL

## Document Status
**Status**: DRAFT  
**Date**: 2026-10-07  
**Version**: 0.1  
**Auditor**: Senior Principal Mobile Architect, Backend Architect, Security Architect, Product Architect, Technical Auditor

## Introduction

This security threat model identifies potential threats to the AFYATNA | عافيتنا mobile application, analyzes their impact, and recommends mitigations. The model follows the STRIDE methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) and focuses on threats specific to mobile health applications in the context of the National Quarantine Platform (NQP).

## 1. Threat Actors

### 1.1 External Threat Actors
- **Malicious Traveler**: Attempts to gain unauthorized access, falsify health status, or bypass quarantine requirements
- **Compromised Device**: Device infected with malware or under attacker control
- **Stolen Device**: Physically stolen mobile device
- **Network Attacker**: Attacker on same Wi-Fi network or cellular network
- **Malicious Insider**: Authorized user who abuses privileges
- **Automated Attacker**: Bots or scripts attempting to scrape data or perform brute force attacks

### 1.2 Internal Threat Actors
- **Privileged User**: NQP staff with elevated access attempting to access unauthorized data
- **Service Account**: Compromised service account with excessive permissions
- **Third-Party Integrator**: External system with access attempting to exceed privileges

## 2. Assets and Threat Analysis

### 2.1 Authentication Assets

#### Asset: User Credentials (Username/Password/National ID)
- **Threat**: Credential Theft via Phishing, Malware, or Brute Force
- **Attack**: 
  - Phishing emails/SMS mimicking AFYATNA or SUDAPASS
  - Keylogger malware capturing credentials
  - Brute force attacks on weak passwords
  - Credential stuffing from other breaches
- **Impact**: 
  - Account takeover leading to identity theft
  - Unauthorized access to health data and travel information
  - Ability to submit false health declarations
  - Potential to generate fraudulent vaccination certificates
- **Existing Controls**:
  - Password complexity requirements (8+ characters)
  - Account lockout after 5 failed attempts (15 min lockout)
  - JWT-based authentication with short-lived tokens
  - National ID as alternative login factor
- **Missing Controls**:
  - Multi-factor authentication (MFA/biometrics)
  - Password breach detection (haveibeenpwned check)
  - Device binding for authentication
  - Phishing-resistant authentication (WebAuthn/FIDO2)
- **Recommendation**: **P0** - Implement MFA with biometric/factor options
- **Implementation Phase**: Phase 1

#### Asset: JWT Tokens (Access/Refresh)
- **Threat**: Token Theft via XSS, Token Replay, or Token Interception
- **Attack**:
  - Cross-site scripting (XSS) stealing tokens from localStorage
  - Man-in-the-middle (MITM) attacks on unencrypted connections
  - Token replay attacks (if no proper nonce/timestamp validation)
  - Token leakage via logs or error messages
- **Impact**:
  - Session hijacking leading to full account access
  - Ability to impersonate user and access all their data
  - Potential to modify health declarations or travel information
  - Ability to generate fraudulent requests on user's behalf
- **Existing Controls**:
  - Short access token lifetime (30 minutes)
  - Refresh token blacklisting on logout
  - HTTPS enforcement in production
  - HttpOnly cookie recommendation (not implemented - tokens in localStorage)
- **Missing Controls**:
  - Secure token storage (Keychain/Keystore instead of localStorage)
  - Refresh token rotation
  - Certificate pinning for critical endpoints
  - JWT nonce/jti validation to prevent replay
  - Short-lived refresh tokens with rotation
- **Recommendation**: **P0** - Implement secure token storage and rotation
- **Implementation Phase**: Phase 1

### 2.2 Health Data Assets

#### Asset: Vaccination Certificate Data
- **Threat**: Certificate Forgery or Unauthorized Access
- **Attack**:
  - Extracting QR code data and attempting to forge signatures
  - Brute force attacks on certificate numbers (sequential: AFY-VAC-000001)
  - Man-in-the-middle attacks to intercept certificate data
  - Exploiting optional signature validation in public endpoints
- **Impact**:
  - Creation of fraudulent vaccination certificates
  - False proof of vaccination leading to disease spread
  - Loss of trust in vaccination system
  - Potential legal liability for false certifications
- **Existing Controls**:
  - HMAC-SHA256 signatures using SECRET_KEY
  - 30/hour throttling on verification endpoints
  - Minimal PII in public verification responses
  - Sequential certificate numbers with throttling
- **Missing Controls**:
  - Mandatory signature validation in all verification endpoints
  - Non-sequential or randomized certificate numbers
  - Certificate transparency/logging for audit
  - QR code expiration and refresh mechanism
  - Rate limiting differentiation between verification types
- **Recommendation**: **P0** - Implement mandatory signature validation
- **Implementation Phase**: Phase 1

#### Asset: Health Declaration Data
- **Threat**: Health Data Exploitation or False Declarations
- **Attack**:
  - Interception of health declaration data in transit
  - Modification of declaration data to hide symptoms
  - Creation of false declarations with fabricated symptoms
  - Access to historical health declarations for profiling
- **Impact**:
  - Infected individuals entering Sudan undetected
  - False negative declarations leading to outbreaks
  - Privacy violations through health data exploitation
  - Loss of public trust in health screening system
- **Existing Controls**:
  - JWT authentication for declaration submission
  - Role-based access control (health workers only can review)
  - Audit trail for all declaration submissions
  - Encryption in transit (HTTPS)
- **Missing Controls**:
  - End-to-end encryption for sensitive health fields
  - Declaration data minimization (only collect necessary fields)
  - Consent-specific data usage restrictions
  - Automated anomaly detection for suspicious patterns
  - Data retention limits for health declarations
- **Recommendation**: **P1** - Implement health data minimization and encryption
- **Implementation Phase**: Phase 1

#### Asset: Screening Results (Detailed)
- **Threat**: Sensitive Health Data Exposure
- **Attack**:
  - Access to detailed screening results containing vitals, symptoms
  - Correlation of screening data with personal identity
  - Use of health data for discrimination or profiling
  - Sale of health data on black markets
- **Impact**:
  - Severe privacy violations for individuals
  - Potential discrimination based on health status
  - Loss of trust in health screening system
  - Legal and regulatory violations (health data protection)
- **Existing Controls**:
  - Screening results classified as INTERNAL_OPERATIONAL
  - No public endpoints for detailed screening results
  - Role-based access control for health workers only
  - Audit trail for all screening access
- **Missing Controls**:
  - Automatic data purging after required retention period
  - Data masking/anonymization for analytics use
  - Strict access logging with anomaly detection
  - Encryption at rest for screening data
  - Data minimization for screening collection
- **Recommendation**: **P0** - Ensure screening results never exposed to mobile
- **Implementation Phase**: Phase 0 (design constraint)

### 2.3 Transaction and Operational Assets

#### Asset: QR Codes (for verification)
- **Threat**: QR Code Replay or Forgery
- **Attack**:
  - Capturing QR code from legitimate user and replaying it
  - Generating fake QR codes with valid-looking data
  - Exploiting optional signature validation
  - Using outdated/expired QR codes
- **Impact**:
  - Unauthorized access using stolen identity
  - Bypassing health checks with fake credentials
  - Undermining trust in verification system
  - Potential for disease spread through false negatives
- **Existing Controls**:
  - QR codes contain signed payloads with HMAC-SHA256
  - 90-day validity period for traveler QR codes
  - Timestamp-based expiration in QR payloads
  - Device binding in QR payloads (traveler ID)
- **Missing Controls**:
  - Mandatory signature validation in all QR verification
  - One-time use QR codes for sensitive operations
  - Geolocation binding in QR codes (where appropriate)
  - QR code revocation list/checking mechanism
  - Visual authentication elements in QR display
- **Recommendation**: **P0** - Implement mandatory QR signature validation
- **Implementation Phase**: Phase 1

#### Asset: Device Identifiers
- **Threat**: Device Tracking or Fingerprinting
- **Attack**:
  - Collection of device identifiers (IMEI, Android ID, IDFA)
  - Browser fingerprinting for web tracking
  - Correlation of device data across sessions
  - Creation of behavioral profiles for tracking
- **Impact**:
  - User tracking across services and sessions
  - Profiling based on device and usage patterns
  - Potential for targeted attacks based on device vulnerability
  - Loss of anonymity for sensitive health operations
- **Existing Controls**:
  - Limited device information collection (platform only)
  - No persistent device identifiers collected by default
  - App Store/Play Store policies limiting identifier use
- **Missing Controls**:
  - Explicit prohibition of device fingerprinting
  - Regular rotation of any temporary device identifiers
  - Privacy-preserving analytics (no individual tracking)
  - Clear data minimization policy for device data
  - User controls to limit data collection
- **Recommendation**: **P1** - Implement strict device data minimization
- **Implementation Phase**: Phase 1

### 2.4 System and Infrastructure Assets

#### Asset: API Endpoints
- **Threat**: API Abuse, Enumeration, or Exploitation
- **Attack**:
  - Brute force attacks on endpoints (password reset, OTP)
  - Enumeration of user IDs through sequential access
  - Rate limit evasion through distributed attacks
  - Exploitation of business logic flaws
  - Injection attacks (SQL, NoXML, etc.)
- **Impact**:
  - Service disruption through resource exhaustion
  - Data exposure through enumeration attacks
  - Account takeover through brute force or logic flaws
  - Potential for data manipulation or corruption
- **Existing Controls**:
  - Global rate limiting (anon 100/min, user 1000/hour)
  - Endpoint-specific throttling for sensitive operations
  - Input validation through Django forms and DRF serializers
  - SQL injection protection through Django ORM
  - Comprehensive audit logging
- **Missing Controls**:
  - Adaptive rate limiting based on behavior
  - Account enumeration protection (consistent error messages)
  - Request size and depth limiting
  - Regular security testing (SAST/DAST)
  - Web Application Firewall (WAF) for common attacks
- **Recommendation**: **P1** - Implement enhanced API security controls
- **Implementation Phase**: Phase 1

#### Asset: Push Notifications
- **Threat**: Notification Abuse or Spam
- **Attack**:
  - Sending excessive notifications to cause distraction or battery drain
  - Sending misleading or false health information
  - Exploiting notification systems for phishing
  - Bombarding users with notifications to disable them
- **Impact**:
  - Battery drain and performance degradation
  - User disabling notifications and missing critical alerts
  - Phishing attempts through fake notification content
  - Loss of trust in notification system
- **Existing Controls**:
  - User opt-in for notifications
  - Preference management for notification types
  - Rate limiting on notification sending
  - Content validation for notification templates
- **Missing Controls**:
  - Per-user rate limiting on notifications
  - Content verification for user-generated notifications
  - Opt-out mechanisms for specific notification types
  - Notification history and audit trail
  - Spam detection and filtering mechanisms
- **Recommendation**: **P2** - Implement notification abuse protections
- **Implementation Phase**: Phase 2

## 3. Attack Trees

### 3.1 Account Takeover Attack Tree

```
Goal: Gain unauthorized access to user account
├── Credential Theft
│   ├── Phishing Attack
│   │   ├── Create fake login page
│   │   ├── Send deceptive SMS/email
│   │   └── Capture entered credentials
│   ├── Malware Attack
│   │   ├── Infect device with keylogger
│   │   ├── Capture keystrokes
│   │   └── Transmit credentials to attacker
│   └── Brute Force Attack
│       ├── Target weak passwords
│       ├── Automated login attempts
│       └── Success with common passwords
├── Token Theft
│   ├── XSS Attack
│   │   ├── Inject malicious script
│   │   ├── Steal tokens from localStorage
│   │   └── Send tokens to attacker
│   ├── MITM Attack
│   │   ├── Intercept unencrypted traffic
│   │   ├── Extract tokens from requests
│   │   └── Use tokens for API calls
│   └── Token Replay
│       ├── Capture valid token
│       │   └── Replay within validity window
│       └── Gain temporary access
└── Session Fixation
    ├── Set known session ID
    │   └── Trick user into using it
    ├── User logs in with fixed session
    │   └── Attacker uses known session
    └── Gain access to user session
```

### 3.2 Health Data Exfiltration Attack Tree

```
Goal: Exploit or expose sensitive health data
├── Data Interception
│   ├── Network Eavesdropping
│   │   ├── Target unencrypted connections
│   │   ├── Capture health data in transit
│   │   └── Use or sell health data
│   └── Malware Attack
│       ├── Infect device with spyware
│       │   ├── Monitor health app usage
│       │   ├── Extract health data from memory
│       │   └── Exfiltrate data to attacker
└── Data Access
    ├── Insufficient Authorization
    │   ├── Exploit role confusion
    │   ├── Access health data without proper role
    │   └── Use or sell accessed data
    ├── Data Leakage
    │   ├── Find exposed endpoints
    │   ├── Access health data through bugs
    │   └── Expose health data publicly
    └── Insecure Storage
        ├── Access device storage
        │   ├── Find unencrypted health data
        │   └── Extract and use health data
```

### 3.3 Service Disruption Attack Tree

```
Goal: Deny service to legitimate users
├── Resource Exhaustion
│   ├── Network Flooding
│   │   ├── Overwhelm with traffic
│   │   ├── Consume bandwidth/resources
│   │   └── Prevent legitimate access
│   └── Application Exhaustion
│       ├── Exploit expensive operations
│       │   ├── Trigger resource-intensive API calls
│       │   ├── Consume server resources
│       │   └── Cause timeouts/failures
│       └── Memory Exhaustion
│           ├── Trigger memory leaks
│           │   ├── Consume available memory
│           │   └── Cause crashes/OOM kills
└── Authentication Blocking
    ├── Credential Stuffing
    │   ├── Use breached credentials
    │   ├── Attempt logins across accounts
    │   ├── Trigger account lockouts
    │   └── Prevent legitimate logins
    └── Token Exhaustion
        ├── Exhaust valid tokens
        │   ├── Generate/collect many tokens
        │   ├── Overwhelm validation systems
        │   └── Prevent token usage
```

## 4. Risk Assessment Matrix

| Threat | Asset | Likelihood | Impact | Risk Level | Mitigation Priority |
|--------|-------|------------|--------|------------|---------------------|
| Credential Theft via Phishing | User Credentials | Medium | High | High | P0 |
| Token Theft via XSS/LocalStorage | JWT Tokens | High | High | High | P0 |
| Certificate Forgery via Optional Validation | Vaccination Certificate | Medium | High | High | P0 |
| Health Data Exfiltration | Health Declaration | Low | Very High | Medium | P1 |
| Screening Result Exposure | Screening Results | Low | Very High | Medium | P0 (design) |
| QR Code Replay/Forgery | QR Codes | Medium | High | High | P0 |
| API Enumeration/Abuse | API Endpoints | High | Medium | Medium | P1 |
| Notification Abuse/Spam | Push Notifications | Medium | Low | Low | P2 |
| Device Tracking/Fingerprinting | Device Identifiers | Medium | Medium | Medium | P1 |
| Credential Stuffing via Brute Force | Authentication System | High | Medium | Medium | P1 |
| Man-in-the-Middle Attacks | Network Traffic | Low | High | Medium | P0 |
| Session Hijacking | User Sessions | Medium | High | High | P0 |
| Data Tampering | Health Declarations | Low | High | Medium | P1 |
| Privilege Escalation | User Roles | Low | High | Medium | P1 |
| Social Engineering | User Trust | Medium | Medium | Medium | P1 |
| Supply Chain Attack | Dependencies | Low | Very High | Low | P2 |
| Physical Device Theft | Stolen Device | Medium | High | High | P0 |
```

## 5. Security Controls by Threat Category

### 5.1 Authentication and Session Security

#### P0 Controls (Implement Immediately)
- **Secure Token Storage**: Replace localStorage with Keychain (iOS)/Keystore (Android)
- **Mandatory Signature Validation**: Require signature validation in all QR/verification endpoints
- **Certificate Pinning**: Implement for critical API endpoints (SUDAPASS, verification services)
- **Biometric Authentication**: Add TouchID/FaceID/Fingerprint as authentication factor
- **Session Management**: Implement proper session invalidation on password change/logout
- **Account Lockout Enhancement**: Progressive delays + CAPTCHA after repeated failures

#### P1 Controls (Implement for MVP)
- **Multi-Factor Authentication**: TOTP or push-based MFA as secondary factor
- **Refresh Token Rotation**: Implement refresh token rotation with old token invalidation
- **JWT Nonce Validation**: Add jti claims to prevent replay attacks
- **Adaptive Rate Limiting**: Behavior-based rate limiting for authentication endpoints
- **Phishing Resistance**: Implement WebAuthn/FIDO2 for phishing-resistant authentication
- **Security Headers**: Implement CSP, HSTS, X-Frame-Options, etc.

### 5.2 Data Protection and Privacy

#### P0 Controls (Implement Immediately)
- **Data Encryption at Rest**: AES-256-GCM for sensitive data (IDENTITY, SENSITIVE_HEALTH)
- **Health Data Minimization**: Collect only necessary health data fields
- **Screening Data Isolation**: Ensure detailed screening results never stored/mobile
- **PII Minimization in APIs**: Continue minimizing PII in public responses
- **Consent Management**: Implement granular consent for data collection/use

#### P1 Controls (Implement for MVP)
- **End-to-End Encryption**: For sensitive health data in transit (optional)
- **Data Anonymization**: For analytics and research use
- **Automatic Data Purging**: Based on retention requirements
- **Access Logging Enhancement**: Detailed access logs with anomaly detection
- **Data Classification Enforcement**: Automated tagging and handling based on classification
- **Secure Deletion**: Cryptographic erasure when data no longer needed

### 5.3 Application and Network Security

#### P0 Controls (Implement Immediately)
- **Input Validation**: Strict validation on all inputs (client and server)
- **Output Encoding**: Proper encoding to prevent XSS
- **CSRF Protection**: Implement for state-changing operations
- **Secure Defaults**: Fail-secure defaults for all security decisions
- **Security Testing**: Regular SAST/DAST scanning

#### P1 Controls (Implement for MVP)
- **Web Application Firewall**: WAF for common attack patterns
- **Security Monitoring**: Real-time security event monitoring and alerting
- **Penetration Testing**: Regular third-party penetration testing
- **Security Training**: Ongoing security training for developers
- **Incident Response Plan**: Formalized incident response procedures
- **Dependency Scanning**: Regular vulnerability scanning of dependencies

### 5.4 Mobile-Specific Security

#### P0 Controls (Implement Immediately)
- **Jailbreak/Root Detection**: Detect and respond to compromised devices
- **Screen Protection**: Prevent screenshots of sensitive information
- **Clipboard Protection**: Clear sensitive data from clipboard
- **Background App Protection**: Prevent data leakage in app switcher/recents
- **Network Security**: Reject connections to untrusted/certificates

#### P1 Controls (Implement for MVP)
- **App Integrity Checking**: Detect tampering with application binary
- **Debugger Detection**: Detect and respond to debugging attempts
- **Emulator Detection**: Detect and respond to running in emulator
- **Secure Keyboard**: Use secure keyboard for password/PIN entry
- **Secure Storage Selection**: Use platform-appropriate secure storage

## 6. Security Implementation Roadmap

### Phase 0 (Immediate - Design Constraints)
- Ensure screening results are never exposed to mobile (INTERNAL_OPERATIONAL)
- Design data minimization principles into all mobile features
- Plan for secure token storage instead of localStorage
- Architecture for mandatory signature validation in verification
- Plan for certificate pinning implementation

### Phase 1 (P0/P1 - Critical Security)
**Month 1-2:**
- Implement secure token storage (Keychain/Keystore)
- Implement mandatory signature validation in all verification endpoints
- Add biometric authentication support (TouchID/FaceID/Fingerprint)
- Implement certificate pinning for critical endpoints
- Enhance account lockout with progressive delays and CAPTCHA

**Month 3-4:**
- Implement refresh token rotation with old token invalidation
- Add JWT nonce validation to prevent replay attacks
- Implement end-to-end encryption for sensitive health data (where feasible)
- Add adaptive rate limiting for authentication endpoints
- Implement WebAuthn/FIDO2 for phishing-resistant authentication

### Phase 2 (P2 - Important Enhancements)
**Month 5-6:**
- Implement Web Application Firewall (WAF)
- Add security monitoring and alerting
- Implement advanced consent management system
- Add jailbreak/root detection and response
- Implement secure keyboard for sensitive input

**Month 7-8:**
- Add automated security testing (SAST/DAST) to CI/CD
- Implement dependency vulnerability scanning
- Add application integrity checking
- Implement detailed access logging with anomaly detection
- Create incident response plan and run tabletop exercises

### Phase 3 (P3 - Future Considerations)
- Implement advanced anomaly detection for fraud prevention
- Add behavioral biometrics for continuous authentication
- Implement secure enclave usage for cryptographic operations
- Add post-quantum cryptography preparation
- Implement zero-trust architecture principles
- Add formal verification for critical security components

## 7. Security Testing and Validation

### 7.1 Testing Methodology
- **Threat Modeling**: Regular threat modeling sessions for new features
- **Penetration Testing**: Quarterly external penetration testing
- **Vulnerability Scanning**: Weekly automated vulnerability scanning
- **Code Review**: Security-focused code review for all changes
- **Red Team/Blue Team**: Periodic adversarial testing exercises
- **Bug Bounty Program**: Public bug bounty for responsible disclosure

### 7.2 Validation Criteria
- **Authentication**: All authentication paths resist credential stuffing and brute force
- **Authorization**: All API endpoints enforce proper role-based access control
- **Data Protection**: All sensitive data encrypted at rest and in transit
- **Session Management**: All sessions properly invalidated on logout/password change
- **Input Validation**: All inputs properly validated to prevent injection
- **Output Encoding**: All outputs properly encoded to prevent XSS
- **Error Handling**: Error messages do not leak sensitive information
- **Logging**: All security-relevant events logged with sufficient detail
- **Secrets Management**: No secrets hardcoded in code or configuration

### 7.3 Compliance Verification
- **GDPR Compliance**: Data subject rights, breach notification, privacy by design
- **Health Data Regulations**: Compliance with Sudan health data protection laws
- **National Security**: Compliance with national security requirements for health data
- **Industry Standards**: Alignment with ISO 27001, NIST CSF, OWASP ASVS
- **Platform Guidelines**: Compliance with iOS/Android security guidelines

## 8. Conclusion

This security threat model identifies critical threats to the AFYATNA mobile application and provides a prioritized roadmap for mitigating those threats. The model emphasizes that security must be built into the application from the beginning rather than added as an afterthought.

**Key Principles:**
1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Users and systems have only necessary permissions
3. **Fail Secure**: Default to secure state when errors occur
4. **Economy of Mechanism**: Simple, small, and easy-to-verify designs
5. **Complete Mediation**: Every access to resources must be checked for authority
6. **Open Design**: Security should not depend on secrecy of design
7. **Psychological Acceptability**: Security measures should not make the system overly difficult to use

**Implementation Priority:**
- **P0 (Immediate)**: Secure token storage, mandatory signature validation, certificate pinning, biometric auth
- **P1 (MVP)**: MFA, refresh token rotation, JWT nonce validation, adaptive rate limiting, WAF
- **P2 (Enhanced)**: Advanced monitoring, consent management, jailbreak detection, security testing integration
- **P3 (Future)**: Anomaly detection, behavioral biometrics, secure enclaves, post-quantum readiness

By following this threat model and implementing the recommended controls in the prioritized phases, AFYATNA can provide a secure, trustworthy mobile experience for travelers while protecting sensitive health data and maintaining the integrity of the national quarantine platform.

---

## Evidence Standard

All threat identifications and control recommendations are based on:
- Analysis of existing NQP codebase and architecture
- Industry-standard threat modeling methodologies (STRIDE, PASTA)
- Mobile security best practices (OWASP Mobile Top 10, MASVS)
- Health application security requirements (HIPAA-inspired principles)
- Actual vulnerabilities identified in the code audit (localStorage tokens, optional signature validation, etc.)
- Regulatory considerations for health data protection

---

*This security threat model provides a comprehensive analysis of threats to the AFYATNA mobile application and provides a prioritized roadmap for implementing necessary security controls. All findings and recommendations are evidence-based and form the foundation for security implementation planning.*