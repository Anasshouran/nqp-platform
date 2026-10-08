# AFYATNA MOBILE — PHASE 0
# SUDAPASS BOUNDARY AUDIT

## Document Status
**Status**: DRAFT  
**Date**: 2026-10-07  
**Version**: 0.1  
**Auditor**: Senior Principal Mobile Architect, Backend Architect, Security Architect, Product Architect, Technical Auditor

## Introduction

This comprehensive audit examines the SUDAPASS (Sudan National Digital Identity) integration boundary within the National Quarantine Platform (NQP) repository. SUDAPASS is treated as an external national digital identity provider, and this audit determines what integration exists, what is required, and what security boundaries must be established for the AFYATNA mobile application.

**Audit Scope:**
- SUDAPASS integration analysis
- OAuth/OIDC protocol compliance
- Authentication and authorization flows
- Identity and user provisioning
- Mobile deep-linking requirements
- Security and privacy boundaries

## 1. SUDAPASS Integration Analysis

### Current Integration Status: **MISSING**

#### Evidence of Missing Integration

**1. SUDAPASS Fields Removed**
- **File**: `backend/apps/accounts/migrations/0015_remove_user_identity_verified_and_more.py`
- **Lines**: 10-19
- **Evidence**: 
  ```python
  # Removed fields:
  # - User.identity_verified (help_text="التحقق من الهوية عبر سوداباس")
  # - User.sudapass_subject_id (unique, "معرف المواطن الموحّد من نظام سوداباس")
  # Migration date: 2026-09-13
  ```
- **Status**: SUDAPASS integration fields were present but have been removed

**2. Identity Provider Model Changes**
- **File**: `backend/apps/public/models.py:60-62`
- **Evidence**:
  ```python
  class IdentityProvider(models.TextChoices):
      NONE = 'NONE', 'لا يتطلب هوية'
      CREDENTIALS = 'CREDENTIALS', 'اسم مستخدم وكلمة مرور'
  # SUDAPASS option removed from enum
  ```
- **Status**: SUDAPASS was previously an option but has been removed

**3. Stale Documentation References**
- **File**: `docs/06_UI_UX/01_Public_Website/Services.md:33`
- **Evidence**: Maps government-services category to "سوداباس"
- **Status**: Documentation references SUDAPASS but implementation is absent

**4. UI Residue**
- **File**: `frontend/src/pages/profile/ProfilePage.tsx:568`
- **Evidence**: Hard-coded string "SUDAPASS" rendered under "تسجيل الدخول"
- **Status**: Static label with no data binding or functional flow

**5. No OAuth/OIDC Implementation**
- **Search Results**: 0 matches for "SUDAPASS", "sudapass", "SUDA_PASS" in backend code
- **Status**: No OAuth2/OIDC client implementation found

#### Summary of Missing Integration
- ❌ No SUDAPASS OAuth2/OIDC client
- ❌ No identity token validation
- ❌ No user provisioning from SUDAPASS
- ❌ No account linking functionality
- ❌ No mobile deep-linking support
- ❌ No QR authorization flow

---

## 2. OAuth/OIDC Protocol Analysis

### Current OAuth/OIDC Status: **MISSING**

#### Evidence of Missing OAuth/OIDC

**1. No OAuth2/OIDC Dependencies**
- **File**: `backend/requirements/base.txt`
- **Evidence**: No OAuth2/OIDC libraries (e.g., `authlib`, `python-social-auth`, `requests-oauthlib`)
- **Status**: No OAuth2/OIDC client implementation

**2. No Discovery/JWKS Endpoints**
- **Search**: No `/.well-known/openid-configuration`, `/.well-known/jwks.json` endpoints
- **Status**: No OpenID Connect discovery implementation

**3. No Token Validation**
- **Search**: No JWT validation for SUDAPASS tokens
- **Status**: No inbound token validation implementation

**4. Outbound OAuth Only**
- **Evidence**: `backend/apps/who/clients/base_client.py:43` - OAuth2TokenProvider for WHO integration
- **Status**: Only outbound OAuth2 (client credentials), no inbound OAuth2/OIDC

#### Summary of Missing OAuth/OIDC
- ❌ No OAuth2/OIDC client implementation
- ❌ No OpenID Connect discovery
- ❌ No JWKS endpoint
- ❌ No token validation
- ❌ No authorization flow
- ❌ No refresh token handling

---

## 3. Authentication and Authorization Flows

### Current Authentication Status: **INTERNAL_ONLY**

#### Evidence of Current Authentication

**1. JWT Authentication**
- **File**: `backend/apps/accounts/views.py:52-64`
- **Evidence**: Standard JWT authentication with refresh tokens
- **Status**: Works internally but not with SUDAPASS

**2. National ID Support**
- **File**: `backend/apps/accounts/models.py:102-104`
- **Evidence**: `national_id` field used as login identifier
- **Status**: Can be adapted for SUDAPASS integration

**3. No SUDAPASS-Specific Authentication**
- **Search**: No SUDAPASS authentication endpoints
- **Status**: No integration with national identity system

#### Required Authentication Flow for SUDAPASS

```
1. Mobile App → SUDAPASS Mobile App (Deep Link)
   - Trigger: User selects "Login with SUDAPASS"
   - Action: Open SUDAPASS app with deep link

2. SUDAPASS App → Authorization Server
   - Protocol: OAuth2 Authorization Code Flow
   - Response: Authorization code + state

3. Mobile App → AFYATNA Backend
   - Endpoint: POST /api/v1/auth/sudapass/
   - Payload: Authorization code, redirect_uri, client_id
   - Action: Exchange code for tokens

4. AFYATNA Backend → SUDAPASS Token Endpoint
   - Protocol: OAuth2 Token Exchange
   - Response: Access token + ID token

5. AFYATNA Backend → SUDAPASS UserInfo Endpoint
   - Protocol: OIDC UserInfo
   - Response: User claims (name, email, national_id, etc.)

6. AFYATNA Backend → User Creation/Linking
   - Action: Create or link user account
   - Response: JWT tokens for AFYATNA
```

---

## 4. Identity and User Provisioning

### Current Identity Status: **PARTIAL**

#### Evidence of Current Identity

**1. User Model**
- **File**: `backend/apps/accounts/models.py:83-143`
- **Evidence**: User model with national_id support
- **Status**: Can be adapted for SUDAPASS subject_id

**2. No Identity Verification**
- **Evidence**: No identity verification endpoints or processes
- **Status**: No SUDAPASS identity verification

**3. No Account Linking**
- **Evidence**: No account linking functionality
- **Status**: No SUDAPASS account linking

#### Required Identity Features

**1. SUDAPASS Subject ID Storage**
```python
# Required field in User model
sudapass_subject_id = models.CharField(
    max_length=255,
    unique=True,
    null=True,
    help_text="معرف المواطن الموحّد من نظام سوداباس"
)
```

**2. Identity Verification Status**
```python
# Required field in User model
identity_verified = models.BooleanField(
    default=False,
    help_text="تم التحقق من الهوية عبر سوداباس"
)
```

**3. Account Linking**
```python
# Required functionality
def link_sudapass_account(user, sudapass_claims):
    """Link SUDAPASS account to existing user"""
    user.sudapass_subject_id = sudapass_claims['sub']
    user.identity_verified = True
    user.save()
```

**4. User Provisioning**
```python
# Required functionality
def provision_user_from_sudapass(sudapass_claims):
    """Create user from SUDAPASS claims"""
    user = User.objects.create(
        email=sudapass_claims['email'],
        national_id=sudapass_claims.get('national_id'),
        sudapass_subject_id=sudapass_claims['sub'],
        identity_verified=True,
        # Map other claims as needed
    )
    return user
```

---

## 5. Mobile Deep-Linking Requirements

### Current Deep-Linking Status: **MISSING**

#### Evidence of Missing Deep-Linking

**1. No Deep-Link Implementation**
- **Search**: No `deep_link`, `deeplink`, `universal link`, `applink` found
- **Status**: No mobile deep-linking support

**2. No App Store Integration**
- **Search**: No `assetlinks.json`, `apple-app-site-association` found
- **Status**: No Android/iOS app integration

**3. No SUDAPASS Mobile App References**
- **Search**: No SUDAPASS mobile app integration
- **Status**: No SUDAPASS mobile app support

#### Required Deep-Linking Implementation

**1. Android Deep-Link**
```xml
<!-- AndroidManifest.xml -->
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="sudapass" android:host="auth" />
</intent-filter>
```

**2. iOS Universal Link**
```json
// apple-app-site-association
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.afyatna.app",
        "paths": ["/sudapass/*"]
      }
    ]
  }
}
```

**3. SUDAPASS Deep-Link Format**
```
sudapass://auth?client_id=afyatna&response_type=code&redirect_uri=afyatna://auth&state=xyz&scope=openid+profile
```

**4. Redirect URI Handling**
```python
# Required endpoint
def sudapass_callback(request):
    """Handle SUDAPASS deep-link callback"""
    code = request.GET.get('code')
    state = request.GET.get('state')
    # Exchange code for tokens
    # Create/link user account
    # Return AFYATNA JWT tokens
```

---

## 6. QR Authorization Flow

### Current QR Authorization Status: **MISSING**

#### Evidence of Missing QR Authorization

**1. No QR Authorization Implementation**
- **Search**: No QR authorization flow found
- **Status**: No SUDAPASS QR authorization

**2. Existing QR Verification**
- **Evidence**: `backend/apps/public/views.py:104-120` - QR verification for documents
- **Status**: QR exists but not for authorization

#### Required QR Authorization Flow

**1. QR Generation**
```python
def generate_sudapass_qr(user):
    """Generate QR code for SUDAPASS authorization"""
    qr_data = {
        'user_id': user.id,
        'timestamp': timezone.now().isoformat(),
        'nonce': uuid.uuid4(),
        'action': 'sudapass_auth'
    }
    signature = sign_payload(qr_data)
    return {
        'qr_data': qr_data,
        'signature': signature,
        'expires_at': timezone.now() + timedelta(minutes=5)
    }
```

**2. QR Scanning and Validation**
```python
def validate_sudapass_qr(qr_data, signature):
    """Validate QR code for SUDAPASS authorization"""
    if not verify_signature(qr_data, signature):
        raise InvalidQRSignature()
    
    if qr_data['expires_at'] < timezone.now():
        raise QRExpired()
    
    # Proceed with SUDAPASS authorization
```

---

## 7. Security and Privacy Boundaries

### Current Security Status: **PARTIAL**

#### Evidence of Current Security

**1. JWT Security**
- **File**: `backend/nqp_backend/settings.py:222-233`
- **Evidence**: JWT configuration with configurable lifetimes
- **Status**: Good but needs SUDAPASS integration

**2. No SUDAPASS Security**
- **Evidence**: No SUDAPASS-specific security measures
- **Status**: Missing critical security boundaries

#### Required Security Boundaries

### SUDAPASS OWNS:
- **Identity Verification**: National identity verification and validation
- **Authentication Credentials**: SUDAPASS username/password and biometric data
- **Identity Claims**: Subject ID, national ID, name, email, etc.
- **Token Security**: OAuth2/OIDC token generation and validation
- **Mobile App Security**: SUDAPASS mobile app security and updates

### AFYATNA OWNS:
- **User Account Management**: User profile, preferences, and settings
- **Application Security**: AFYATNA app security and updates
- **Data Storage**: Local data storage and caching
- **Session Management**: AFYATNA session management
- **Application Logic**: Business logic and workflows

### NQP OWNS:
- **Health Data**: Vaccination records, health declarations, screening results
- **Travel Data**: Travel history, documents, and status
- **Audit Logs**: All user activity and system logs
- **API Security**: API security and rate limiting
- **Data Privacy**: Data privacy and compliance

#### Security Requirements

**1. Token Security**
```python
# Required: SUDAPASS token validation
def validate_sudapass_token(access_token):
    """Validate SUDAPASS access token"""
    # Validate token signature
    # Validate token expiration
    # Validate token claims
    # Validate token scope
    return validated_claims
```

**2. Data Minimization**
```python
# Required: Only request necessary claims
SUDAPASS_REQUIRED_CLAIMS = [
    'sub',          # Subject ID
    'name',         # Full name
    'email',        # Email address
    'national_id'   # National ID
]
```

**3. Secure Storage**
```python
# Required: Secure token storage
class SecureTokenStorage:
    def __init__(self):
        self.keychain = Keychain()  # iOS
        self.keystore = KeyStore()  # Android
    
    def store_token(self, token):
        """Store token securely"""
        self.keychain.set('sudapass_token', token)
    
    def get_token(self):
        """Get token securely"""
        return self.keychain.get('sudapass_token')
```

**4. Privacy Protection**
```python
# Required: Privacy compliance
class PrivacyManager:
    def __init__(self):
        self.consent_manager = ConsentManager()
        self.data_minimizer = DataMinimizer()
    
    def handle_sudapass_data(self, claims):
        """Handle SUDAPASS data with privacy protection"""
        # Get user consent
        # Minimize data collection
        # Store securely
        # Log usage
```

---

## 8. Implementation Requirements

### P0 - BLOCKING REQUIREMENTS

**1. SUDAPASS OAuth2/OIDC Client**
```python
# Required: OAuth2/OIDC client implementation
class SUDAPASSOAuth2Client:
    def __init__(self):
        self.client_id = settings.SUDAPASS_CLIENT_ID
        self.client_secret = settings.SUDAPASS_CLIENT_SECRET
        self.token_url = settings.SUDAPASS_TOKEN_URL
        self.userinfo_url = settings.SUDAPASS_USERINFO_URL
    
    def authorize(self, code):
        """Exchange authorization code for tokens"""
        pass
    
    def get_user_info(self, access_token):
        """Get user information from SUDAPASS"""
        pass
```

**2. Deep-Linking Implementation**
```python
# Required: Deep-linking endpoints
def sudapass_auth(request):
    """Initiate SUDAPASS authentication"""
    pass

def sudapass_callback(request):
    """Handle SUDAPASS callback"""
    pass
```

**3. Identity Management**
```python
# Required: Identity management
def link_sudapass_account(user, sudapass_claims):
    """Link SUDAPASS account"""
    pass

def provision_user_from_sudapass(sudapass_claims):
    """Provision user from SUDAPASS"""
    pass
```

### P1 - REQUIRED FOR MVP

**1. Enhanced Security**
```python
# Required: Enhanced security measures
class SUDAPASSecurityManager:
    def __init__(self):
        self.token_validator = TokenValidator()
        self.claims_validator = ClaimsValidator()
        self.consent_manager = ConsentManager()
    
    def validate_authentication(self, request):
        """Validate SUDAPASS authentication"""
        pass
```

**2. Mobile Integration**
```python
# Required: Mobile integration
class MobileIntegrationManager:
    def __init__(self):
        self.deep_link_manager = DeepLinkManager()
        self.qr_manager = QRManager()
        self.push_manager = PushManager()
    
    def handle_deep_link(self, url):
        """Handle deep-link URL"""
        pass
```

**3. Privacy Compliance**
```python
# Required: Privacy compliance
class PrivacyCompliance:
    def __init__(self):
        self.consent_manager = ConsentManager()
        self.data_minimizer = DataMinimizer()
        self.audit_logger = AuditLogger()
    
    def handle_user_data(self, data, purpose):
        """Handle user data with privacy compliance"""
        pass
```

### P2 - IMPORTANT

**1. Advanced Features**
```python
# Required: Advanced features
class SUDAPASSAdvancedFeatures:
    def __init__(self):
        self.biometric_manager = BiometricManager()
        self.offline_manager = OfflineManager()
        self.analytics_manager = AnalyticsManager()
    
    def handle_biometric_auth(self, user):
        """Handle biometric authentication"""
        pass
```

---

## 9. Risk Assessment

### High-Risk Areas

**1. Identity Theft**
- **Risk**: SUDAPASS credentials could be stolen
- **Mitigation**: Implement proper token validation and secure storage
- **Status**: **HIGH RISK** - No current mitigation

**2. Data Breach**
- **Risk**: SUDAPASS data could be exposed
- **Mitigation**: Implement data minimization and encryption
- **Status**: **HIGH RISK** - No current mitigation

**3. Account Takeover**
- **Risk**: Malicious actors could take over accounts
- **Mitigation**: Implement proper authentication and authorization
- **Status**: **HIGH RISK** - No current mitigation

### Medium-Risk Areas

**1. Privacy Violations**
- **Risk**: User privacy could be violated
- **Mitigation**: Implement proper consent and data minimization
- **Status**: **MEDIUM RISK** - Partial mitigation

**2. Service Disruption**
- **Risk**: SUDAPASS service could be unavailable
- **Mitigation**: Implement fallback authentication
- **Status**: **MEDIUM RISK** - No current mitigation

### Low-Risk Areas

**1. User Experience**
- **Risk**: Poor user experience with SUDAPASS integration
- **Mitigation**: Implement proper deep-linking and error handling
- **Status**: **LOW RISK** - Can be addressed during implementation

---

## 10. Recommendations

### Immediate Actions (P0)
1. **Implement SUDAPASS OAuth2/OIDC client**
2. **Create deep-linking infrastructure**
3. **Implement identity management**
4. **Establish security boundaries**

### Phase 1 (P1)
1. **Enhance security measures**
2. **Implement mobile integration**
3. **Ensure privacy compliance**
4. **Create fallback authentication**

### Future Considerations (P2/P3)
1. **Implement advanced features**
2. **Create monitoring and analytics**
3. **Implement offline capabilities**
4. **Create user education materials**

---

## 11. Conclusion

The SUDAPASS integration boundary audit reveals that **no actual SUDAPASS integration exists** in the current NQP repository. While there are historical references and some infrastructure that could be adapted, a complete OAuth2/OIDC client implementation, deep-linking infrastructure, and identity management system must be built from scratch.

The integration is **critical** for AFYATNA mobile as it provides the national identity verification foundation required for the application. Without SUDAPASS integration, the mobile application cannot properly authenticate users or verify their identity, which is a fundamental requirement for a national quarantine platform.

**RECOMMENDATION**: SUDAPASS integration is a **P0 blocking requirement** and must be implemented before any mobile development can proceed.

---

## Evidence Standard

All findings are based on actual code evidence:
- `[FOUND]` - requirement/artifact exists and is implemented in code
- `[PARTIAL]` - exists but incomplete, inconsistent with docs, or weakened
- `[MISSING]` - searched for, not present anywhere in the repo
- `[INTERNAL]` - internal-only mechanism (backend service, seed command, test, helper)
- `[REUSABLE]` - existing capability can be adapted for mobile use
- `[ADAPTER]` - existing capability requires adapter layer for mobile

---

*This SUDAPASS boundary audit provides a comprehensive analysis of the current state and required implementation for SUDAPASS integration in the AFYATNA mobile application. All findings are evidence-based and form the foundation for implementation planning.*