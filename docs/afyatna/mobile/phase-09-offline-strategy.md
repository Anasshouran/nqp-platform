# AFYATNA MOBILE — PHASE 0
# OFFLINE STRATEGY

## Document Status
**Status**: DRAFT  
**Date**: 2026-10-07  
**Version**: 0.1  
**Auditor**: Senior Principal Mobile Architect, Backend Architect, Security Architect, Product Architect, Technical Auditor

## Introduction

This offline strategy document defines the approach for handling unreliable connectivity at Points of Entry (POEs) and other locations where network access may be intermittent or unavailable. The strategy balances the need for offline functionality with security, privacy, and data consistency requirements.

**Offline Classification Framework:**
- **FULLY_OFFLINE** - Feature works completely offline with local data
- **CACHE_READ_ONLY** - Feature can display cached data but cannot modify
- **OFFLINE_QUEUE** - Feature queues actions for execution when online
- **ONLINE_ONLY** - Feature requires constant online connectivity

## 1. Current Offline Capabilities

### 1.1 Existing Offline Infrastructure

#### Frontend Service Worker
- **Location**: `frontend/public/sw.js`
- **Capabilities**: 
  - Caching of static assets (HTML, CSS, JS, images)
  - Runtime caching of API responses
  - Background sync for failed requests
  - Push notification delivery
- **Evidence**: Service worker registration in `frontend/src/components/VerifyTools.tsx:707-723`

#### IndexedDB Implementation
- **Location**: `frontend/src/utils/vectorOffline.ts`
- **Capabilities**:
  - Key-value storage for offline data
  - Request queuing for failed API calls
  - Background sync mechanisms
  - Event system for offline operation notifications
- **Evidence**: Custom events `vector:offline-queued`, `vector:offline-synced`

#### Current Limitations
- **No backend sync endpoints** - Frontend queues but no backend to process
- **No conflict resolution** - Simultaneous edits cause data loss
- **No encryption** - Offline data stored in plaintext
- **No selective sync** - All or nothing approach
- **No data validation** - Offline data not validated before sync

## 2. Feature Offline Classification

### 2.1 User Profile & Identity

#### Profile Data (Name, Email, Phone, National ID)
- **Classification**: CACHE_READ_ONLY
- **Reason**: Profile data changes infrequently, safe to cache for display
- **Offline Capabilities**:
  - View cached profile information
  - Display cached documents and certificates
  - Show cached travel history
- **Online Requirements**:
  - Profile updates (requires server validation)
  - Document uploads (requires server storage)
  - Identity verification (requires SUDAPASS validation)

#### Authentication & Sessions
- **Classification**: OFFLINE_QUEUE (with limitations)
- **Reason**: Can queue authentication attempts but cannot validate offline
- **Offline Capabilities**:
  - Queue login attempts for when online
  - Use cached JWT tokens (with expiration checking)
  - Maintain session state locally
- **Online Requirements**:
  - Initial authentication (requires server validation)
  - Token refresh (requires server)
  - SUDAPASS verification (requires server)
  - Session revocation (requires server)

### 2.2 Travel & Transport

#### Trip Information
- **Classification**: CACHE_READ_ONLY
- **Reason**: Trip details change infrequently once created
- **Offline Capabilities**:
  - View cached trip details
  - Display cached itinerary
  - Show cached booking information
- **Online Requirements**:
  - Create new trips (requires server validation)
  - Update trip details (requires server)
  - Cancel trips (requires server)
  - Check-in/boarding (requires server validation)

#### POE Information
- **Classification**: CACHE_READ_ONLY
- **Reason**: POE data changes infrequently (hours/days)
- **Offline Capabilities**:
  - View cached POE details
  - Display cached services and facilities
  - Show cached contact information
- **Online Requirements**:
  - Get real-time status (requires server)
  - Check wait times (requires server)
  - Report issues (requires server)

### 2.3 Health Requirements

#### Travel Requirements
- **Classification**: CACHE_READ_ONLY (with TTL)
- **Reason**: Requirements change infrequently (days/weeks)
- **Offline Capabilities**:
  - View cached requirements by destination
  - Display cached vaccination requirements
  - Show cached testing requirements
- **Online Requirements**:
  - Get latest requirements (requires server)
  - Check for updates (requires server)
  - Subscribe to changes (requires server)

#### Personalized Requirements
- **Classification**: OFFLINE_QUEUE
- **Reason**: Based on traveler profile which may change
- **Offline Capabilities**:
  - View cached personalized requirements
  - Display cached exemption status
- **Online Requirements**:
  - Calculate personalized requirements (requires server)
  - Apply exemptions (requires server validation)
  - Update based on profile changes (requires server)

### 2.4 Health Declaration

#### Declaration Forms
- **Classification**: OFFLINE_QUEUE
- **Reason**: Can collect data offline but requires server validation
- **Offline Capabilities**:
  - Complete declaration forms offline
  - Save declaration drafts locally
  - Attach documents (stored locally)
  - Queue submission for when online
- **Online Requirements**:
  - Validate declaration data (requires server)
  - Process submission (requires server)
  - Upload attachments (requires server)
  - Get review status (requires server)

#### Declaration Status
- **Classification**: CACHE_READ_ONLY
- **Reason**: Status changes infrequently (minutes/hours)
- **Offline Capabilities**:
  - View cached declaration status
  - Display cached review results
  - Show cached next steps
- **Online Requirements**:
  - Get real-time status (requires server)
  - Check for review completion (requires server)
  - Receive updates (requires server/push)

### 2.5 Vaccination & Certificates

#### Certificate Information
- **Classification**: CACHE_READ_ONLY
- **Reason**: Certificate details don't change after issuance
- **Offline Capabilities**:
  - View cached certificate details
  - Display cached vaccine information
  - Show cached validity dates
- **Online Requirements**:
  - Issue new certificates (requires server)
  - Revoke certificates (requires server)
  - Replace certificates (requires server)
  - Verify certificates (requires server for signature validation)

#### Certificate QR Codes
- **Classification**: FULLY_OFFLINE
- **Reason**: QR codes are static images with embedded data
- **Offline Capabilities**:
  - Display cached QR codes
  - Scan and validate QR codes (if signature validation available offline)
  - Share QR codes via messaging/apps
- **Online Requirements**:
  - Generate new QR codes (requires server)
  - Refresh QR codes (requires server)
  - Validate signatures (currently requires server - security gap)

### 2.6 Notifications

#### Notification Preferences
- **Classification**: CACHE_READ_ONLY
- **Reason**: Preferences change infrequently
- **Offline Capabilities**:
  - View cached notification preferences
  - Modify preferences locally (queued for sync)
  - Enable/disable notification types
- **Online Requirements**:
  - Save preferences (requires server)
  - Apply preference changes (requires server)
  - Sync with other devices (requires server)

#### Notification History
- **Classification**: CACHE_READ_ONLY
- **Reason': Historical notifications don't change
- **Offline Capabilities**:
  - View cached notification history
  - Display cached alert details
  - Show cached delivery status
- **Online Requirements**:
  - Get new notifications (requires server/push)
  - Mark as read (requires server)
  - Delete notifications (requires server)

#### Real-Time Alerts
- **Classification**: ONLINE_ONLY
- **Reason**: Requires immediate delivery for effectiveness
- **Offline Capabilities**:
  - Display cached alerts from last sync
  - Show alert age/staleness indicator
- **Online Requirements**:
  - Receive real-time alerts (requires server/push)
  - Get alert updates (requires server)
  - Acknowledge alerts (requires server)

### 2.7 Emergency Information

#### Emergency Contacts
- **Classification**: CACHE_READ_ONLY
- **Reason': Emergency contact data changes infrequently
- **Offline Capabilities**:
  - View cached emergency contacts
  - Initiate calls to cached contacts
  - Display cached relationship information
- **Online Requirements**:
  - Update emergency contacts (requires server)
  - Verify contact information (requires server)
  - Sync with other devices (requires server)

#### Emergency Procedures
- **Classification**: FULLY_OFFLINE
- **Reason': Emergency procedures are static reference information
- **Offline Capabilities**:
  - Display cached emergency procedures
  - Access cached first aid information
  - Show cached evacuation routes
- **Online Requirements**:
  - Get updated procedures (requires server)
  - Receive procedure updates (requires server)
  - Access interactive training (requires server)

### 2.8 Document Management

#### Document Viewing
- **Classification**: CACHE_READ_ONLY
- **Reason**: Documents are static once uploaded
- **Offline Capabilities**:
  - View cached documents
  - Display cached document metadata
  - Share cached documents via sharing intents
- **Online Requirements**:
  - Upload new documents (requires server)
  - Update existing documents (requires server)
  - Delete documents (requires server)
  - Validate document authenticity (requires server)

#### Document Upload
- **Classification**: OFFLINE_QUEUE
- **Reason**: Can collect file offline but requires server storage
- **Offline Capabilities**:
  - Select files for upload
  - Prepare upload metadata locally
  - Queue upload for when online
  - Display upload progress (simulated)
- **Online Requirements**:
  - Receive and store files (requires server)
  - Validate file type and size (requires server)
  - Scan for malware (requires server)
  - Store document metadata (requires server)

### 2.9 Health Screening (Traveler View)

#### Screening Status
- **Classification**: CACHE_READ_ONLY
- **Reason': Screening status changes infrequently (status updates)
- **Offline Capabilities**:
  - View cached screening status
  - Display cached next steps
  - Show cached referral information
- **Online Requirements**:
  - Get real-time screening status (requires server)
  - Check for completion (requires server)
  - Receive updates (requires server/push)

#### Screening Results (Detailed)
- **Classification**: ONLINE_ONLY
- **Reason': Contains sensitive health data that must not be stored locally
- **Offline Capabilities**:
  - None (must not store sensitive results offline)
- **Online Requirements**:
  - View detailed results (requires server)
  - Receive results (requires server)
  - Delete results after viewing (requires server)

## 3. Data Synchronization Strategy

### 3.1 Sync Triggers

#### Automatic Triggers
- **Network Change**: Sync when transitioning from offline to online
- **Time-Based**: Periodic sync every 15-30 minutes when online
- **Event-Based**: Sync after specific actions (declaration submission, document upload)
- **User-Initiated**: Manual sync via pull-to-refresh or sync button

#### Sync Priority
1. **Critical Actions**: Authentication, declaration submission, document upload
2. **High Priority**: Profile updates, preference changes, certificate issuance
3. **Medium Priority**: Data refresh, requirement updates, POE information
4. **Low Priority**: Analytics, logs, non-essential data

### 3.2 Conflict Resolution

#### Conflict Detection
- **Version Vectors**: Track data version using timestamps or counters
- **Hash Comparison**: Compare data hashes to detect changes
- **Field-Level Tracking**: Track changes at field level for fine-grained resolution

#### Resolution Strategies
1. **Server Wins**: Server data always takes precedence (for security-sensitive data)
2. **Merge**: Combine changes when possible (for non-conflicting fields)
3. **User Choice**: Present conflicts to user for resolution (for editable data)
4. **Timestamp-Based**: Most recent change wins (with clock synchronization)

#### Conflict Types
- **Create/Create**: Two users create same resource (resolve by timestamp)
- **Update/Update**: Same field modified by two users (use merge or user choice)
- **Delete/Update**: One user deletes while another updates (usually server wins)
- **Create/Delete**: Resource created then deleted (usually server wins)

### 3.3 Data Validation

#### Offline Validation
- **Format Validation**: Validate data types, lengths, formats
- **Range Validation**: Validate numeric ranges, dates, enumerations
- **Referential Validation**: Validate foreign key relationships (limited offline)
- **Business Rule Validation**: Validate business logic (simplified offline)

#### Online Validation
- **Complete Validation**: Full validation including server-side checks
- **Security Validation**: Authentication, authorization, encryption checks
- **Business Rule Validation**: Complete business logic validation
- **Data Integrity**: Referential integrity, constraint validation

### 3.4 Encryption at Rest

#### Encryption Strategy
- **AES-256-GCM**: Authenticated encryption for data at rest
- **Key Management**: 
  - Device-specific keys stored in Keychain (iOS)/Keystore (Android)
  - Keys derived from user PIN/biometric authentication
  - Key rotation on password/biometric change
- **Selective Encryption**: 
  - Encrypt IDENTITY and SENSITIVE_HEALTH data
  - Encrypt SECURITY_SENSITIVE data (QR tokens, signatures)
  - Do not encrypt PUBLIC data
  - Encrypt PERSONAL data based on sensitivity

#### Implementation
```javascript
// Example encryption workflow
class SecureStorage {
  async encrypt(data, key) {
    // AES-256-GCM encryption
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(data)
    );
    return { iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) };
  }

  async decrypt(encryptedData, key) {
    // AES-256-GCM decryption
    const iv = new Uint8Array(encryptedData.iv);
    const encrypted = new Uint8Array(encryptedData.data);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    return new TextDecoder().decode(decrypted);
  }
}
```

## 4. Implementation Recommendations

### 4.1 High Priority (P0)

#### 1. Backend Sync Endpoints
```python
# Required endpoints for offline synchronization
class MobileOfflineSyncViewSet(ViewSet):
    def sync(self, request):
        """Process offline changes and return server updates"""
        pass
    
    def status(self, request):
        """Get sync status and pending operations"""
        pass
    
    def validate(self, request):
        """Validate offline data before processing"""
        pass
    
    def conflicts(self, request):
        """Get conflict resolution options"""
        pass
```

#### 2. Encrypted Local Storage
- Implement AES-256-GCM encryption for sensitive data
- Use device-specific keys stored in secure hardware-backed storage
- Implement key rotation on authentication changes
- Encrypt IDENTITY, SENSITIVE_HEALTH, and SECURITY_SENSITIVE data

#### 3. Selective Data Synchronization
- Implement data categorization for sync priority
- Create endpoints for syncing specific data types
- Implement bandwidth optimization strategies
- Add cache invalidation based on data freshness

### 4.2 Medium Priority (P1)

#### 1. Conflict Resolution System
- Implement version vector tracking
- Create conflict detection algorithms
- Build user interface for conflict resolution
- Implement automatic resolution strategies where appropriate

#### 2. Background Sync Optimization
- Implement intelligent sync scheduling
- Add network condition awareness
- Implement exponential backoff for failed syncs
- Add sync bandwidth throttling

#### 3. Data Validation Framework
- Create shared validation schemas (offline/online)
- Implement format and range validation
- Add business rule validation (simplified offline)
- Implement data integrity checks

### 4.3 Low Priority (P2)

#### 1. Advanced Analytics
- Implement offline analytics collection
- Add privacy-preserving data aggregation
- Implement secure analytics transmission
- Add offline-to-online analytics sync

#### 2. Multi-Device Synchronization
- Implement cross-device sync conflict resolution
- Add device-specific data handling
- Implement synchronization state sharing
- Add preference and settings synchronization

#### 3. Offline-First Design
- Implement offline-first approach for applicable features
- Add optimistic UI updates
- Implement automatic retry mechanisms
- Add offline capability indicators

## 5. Security Considerations

### 5.1 Data Protection

#### Encryption Requirements
- **IDENTITY Data**: Must be encrypted at rest
- **SENSITIVE_HEALTH Data**: Must be encrypted at rest
- **SECURITY_SENSITIVE Data**: Must be encrypted at rest
- **PERSONAL Data**: Should be encrypted at rest based on sensitivity
- **PUBLIC Data**: May be unencrypted at rest

#### Key Management
- **Device-Bound Keys**: Keys tied to specific device hardware
- **User-Authenticated Keys**: Keys derived from user PIN/biometric
- **Key Rotation**: Keys rotated on password/biometric change
- **Secure Storage**: Keys stored in Keychain (iOS)/Keystore (Android)

### 5.2 Authentication & Authorization

#### Offline Authentication
- **Cached Tokens**: Use cached JWT tokens with expiration checking
- **Refresh Token Handling**: Queue refresh attempts for when online
- **Reauthentication**: Require reauthentication after token expiry
- **Biometric Fallback**: Use biometric authentication for sensitive operations

#### Authorization Enforcement
- **Local Caching**: Cache permissions locally with expiration
- **Server Validation**: Validate critical operations with server
- **Graceful Degradation**: Disable sensitive features when offline
- **Audit Logging**: Queue audit events for when online

### 5.3 Data Privacy

#### Data Minimization
- **Collect Only Necessary Data**: Store minimum required for offline operation
- **Purge Stale Data**: Remove data older than relevance period
- **Anonymize for Analytics**: Anonymize data before offline storage for analytics
- **Secure Deletion**: Cryptographically erase data when no longer needed

#### Consent Management
- **Store Consent Records**: Keep record of user consent for data collection
- **Respect Consent Boundaries**: Only store data user has consented to
- **Allow Consent Withdrawal**: Enable users to withdraw consent and delete data
- **Audit Consent Changes**: Log all consent changes for when online

## 6. Performance Considerations

### 6.1 Storage Management

#### Storage Limits
- **Per-App Limits**: Implement storage limits per application
- **Category-Based Limits**: Different limits for different data types
- **Automatic Cleanup**: Implement LRU (Least Recently Used) eviction
- **User Notification**: Warn users when approaching storage limits

#### Storage Optimization
- **Data Compression**: Compress data before encryption/storage
- **Duplicate Elimination**: Eliminate duplicate data storage
- **Format Optimization**: Use efficient data formats (Protocol Buffers, MessagePack)
- **Indexing**: Implement efficient querying/indexing for large datasets

### 6.2 Network Efficiency

#### Sync Optimization
- **Delta Sync**: Sync only changes since last sync
- **Compression**: Compress sync payloads
- **Batching**: Batch multiple operations in single sync
- **Prioritization**: Sync critical data first

#### Bandwidth Management
- **Adaptive Sync**: Adjust sync frequency based on network conditions
- **Offline Indication**: Show users when in offline mode
- **Sync Control**: Allow users to control sync behavior
- **Cost Awareness**: Respect user data plan limitations

### 6.3 User Experience

#### Responsiveness
- **Immediate Feedback**: Provide immediate UI feedback for offline actions
- **Progress Indicators**: Show progress for long-running offline operations
- **Error Handling**: Graceful handling of offline errors
- **Recovery Mechanisms**: Easy recovery from offline errors

#### Transparency
- **Online/Offline Indicators**: Clear indication of connectivity status
- **Stale Data Indicators**: Indicate when data may be stale
- **Sync Status**: Show sync progress and pending operations
- **Conflict Notification**: Notify users of conflicts requiring resolution

## 7. Implementation Roadmap

### Phase 1 (P0 - Critical Infrastructure)
1. **Backend Sync Endpoints** - Create `/api/v1/mobile/offline/` endpoints
2. **Encrypted Local Storage** - Implement AES-256-GCM encryption
3. **Basic Sync Framework** - Create sync status and queue management
4. **Authentication Offline** - Implement cached token handling

### Phase 2 (P1 - Core Functionality)
1. **Conflict Resolution System** - Implement detection and resolution
2. **Selective Data Synchronization** - Create categorized sync endpoints
3. **Data Validation Framework** - Create shared validation schemas
4. **Background Sync Optimization** - Implement intelligent scheduling

### Phase 3 (P2 - Enhanced Features)
1. **Advanced Analytics** - Implement offline analytics collection
2. **Multi-Device Synchronization** - Add cross-device sync capabilities
3. **Offline-First Design** - Implement offline-first approach for applicable features
4. **User Experience Enhancements** - Improve offline UX indicators

## 8. Risk Assessment

### High-Risk Areas
1. **Data Encryption Failure** - Could lead to sensitive data exposure
   - **Mitigation**: Use established encryption libraries, thorough testing
   
2. **Sync Conflict Resolution Failure** - Could lead to data loss or corruption
   - **Mitigation**: Implement thorough testing, use proven strategies
   
3. **Authentication Bypass** - Could lead to unauthorized access
   - **Mitigation**: Implement proper token validation, server-side checks

### Medium-Risk Areas
1. **Storage Exhaustion** - Could lead to app crashes or data loss
   - **Mitigation**: Implement storage limits, automatic cleanup
   
2. **Network Handling Failure** - Could lead to battery drain or data usage issues
   - **Mitigation**: Implement adaptive sync, network condition awareness
   
3. **Privacy Violations** - Could lead to regulatory compliance issues
   - **Mitigation**: Implement data minimization, consent management

### Low-Risk Areas
1. **Performance Degradation** - Could lead to poor user experience
   - **Mitigation**: Implement caching, optimization, performance testing
   
2. **Feature Limitations** - Could lead to reduced functionality offline
   - **Mitigation**: Prioritize critical features, clear communication
   
3. **Implementation Complexity** - Could lead to development delays
   - **Mitigation**: Phased implementation, clear requirements, modular design

## 9. Conclusion

The offline strategy provides a comprehensive approach to handling unreliable connectivity at Points of Entry and other locations. By implementing encrypted local storage, selective synchronization, conflict resolution, and proper security controls, AFYATNA can provide a robust offline experience while maintaining data integrity and user privacy.

**Key Principles:**
1. **Security First**: Encrypt sensitive data, validate all inputs, enforce authorization
2. **Data Minimization**: Store only what's necessary, purge stale data
3. **User Control**: Give users visibility and control over sync behavior
4. **Graceful Degradation**: Provide useful functionality even when offline
5. **Conflict Awareness**: Detect and resolve conflicts appropriately
6. **Performance Optimized**: Efficient storage, transmission, and processing

**Recommendation**: Implement the offline strategy in phases, starting with critical infrastructure (backend endpoints, encryption) then progressing to core functionality and enhanced features.

---

## Evidence Standard

All recommendations are based on analysis of existing capabilities and identified gaps:
- `[FOUND]` - requirement/artifact exists and is implemented in code
- `[PARTIAL]` - exists but incomplete, inconsistent with docs, or weakened
- `[MISSING]` - searched for, not present anywhere in the repo
- `[INTERNAL]` - internal-only mechanism (backend service, seed command, test, helper)
- `[REUSABLE]` - existing capability can be adapted for mobile use
- `[ADAPTER]` - existing capability requires adapter layer for mobile
- `[REQUIRED]` - must be implemented for mobile functionality

---

*This offline strategy document provides a comprehensive approach to handling unreliable connectivity for the AFYATNA mobile application. All findings and recommendations are evidence-based and form the foundation for offline implementation planning.*