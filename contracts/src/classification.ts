/**
 * مستويات التصنيف المعممة (عقد المرحلة الأولى §14 / phase-06).
 *
 * القاعدة المُلزمة: INTERNAL لا يدخل استجابة/مخطط جوال أبداً.
 * هذا النسخة المتطابقة مع backend/apps/mobile_api/classification.py —
 * اختبار العقد الخادمي هو المرجع المعتمد لتطابق المجموعتين.
 */

export const CLASSIFICATION_LEVELS = [
  'PUBLIC',
  'PERSONAL',
  'SENSITIVE_HEALTH',
  'SECURITY_SENSITIVE',
  'INTERNAL',
] as const;

export type ClassificationLevel = (typeof CLASSIFICATION_LEVELS)[number];

/** حقول ممنوعة من الظهور في أي استجابة جوال (نفس قائمة الخادم). */
export const MOBILE_FORBIDDEN_FIELDS: ReadonlySet<string> = new Set([
  'risk_score',
  'risk_assessment',
  'risk_level',
  'screening_results',
  'health_screening',
  'kill_switch',
  'eoc_status',
  'api_key',
  'api_secret',
  'staff_notes',
  'internal_notes',
  'operator_notes',
  'employee_ssn',
  'password',
  'sudapass_subject_id',
  'passport_number',
  'passport_hash',
  'medical_history',
  'health_declaration',
  'declaration_contents',
  'certificate_signature',
  'verification_signature',
  'qr_token',
  'authorization',
]);

/** خريطة حقل المخطط -> مستوى التصنيف (تطابق الخادم، يُفحص في اختبارات العقد). */
export const MOBILE_FIELD_CLASSIFICATION: Readonly<Record<string, ClassificationLevel>> = {
  'MobileAuthLoginResponse.access_token': 'SECURITY_SENSITIVE',
  'MobileAuthLoginResponse.refresh_token': 'SECURITY_SENSITIVE',
  'MobileAuthLoginResponse.expires_in': 'PUBLIC',
  'MobileAuthRefreshResponse.access_token': 'SECURITY_SENSITIVE',
  'MobileAuthRefreshResponse.expires_in': 'PUBLIC',
  'MobileProfile.id': 'PERSONAL',
  'MobileProfile.full_name': 'PERSONAL',
  'MobileProfile.email': 'PERSONAL',
  'MobileProfile.phone': 'PERSONAL',
  'MobileProfile.national_id': 'PERSONAL',
  'MobileProfile.user_type': 'PUBLIC',
  'MobileTrip.id': 'PUBLIC',
  'MobileTrip.destination': 'PERSONAL',
  'MobileTrip.transport_mode': 'PUBLIC',
  'MobileTrip.departure_date': 'PERSONAL',
  'MobileTrip.return_date': 'PERSONAL',
  'MobileTrip.status': 'PUBLIC',
  'MobileRequirement.code': 'PUBLIC',
  'MobileRequirement.title_ar': 'PUBLIC',
  'MobileRequirement.title_en': 'PUBLIC',
  'MobileRequirement.description_ar': 'PUBLIC',
  'MobileRequirement.priority': 'PUBLIC',
  'MobileRequirement.category': 'PUBLIC',
  'MobileRequirement.effective_from': 'PUBLIC',
  'MobileRequirement.effective_until': 'PUBLIC',
  'MobileRequirement.published_at': 'PUBLIC',
  'MobileCertificate.id': 'PUBLIC',
  'MobileCertificate.certificate_number': 'SECURITY_SENSITIVE',
  'MobileCertificate.vaccine_name': 'SENSITIVE_HEALTH',
  'MobileCertificate.issued_at': 'SENSITIVE_HEALTH',
  'MobileCertificate.valid_until': 'SENSITIVE_HEALTH',
  'MobileCertificate.status': 'SENSITIVE_HEALTH',
  'MobileDeclaration.id': 'PUBLIC',
  'MobileDeclaration.status': 'SENSITIVE_HEALTH',
  'MobileDeclaration.declared': 'PUBLIC',
  'MobileDeclaration.symptoms': 'SENSITIVE_HEALTH',
  'MobileDeclaration.submitted_at': 'SENSITIVE_HEALTH',
  'MobileNotification.id': 'PUBLIC',
  'MobileNotification.channel': 'PUBLIC',
  'MobileNotification.status': 'PUBLIC',
  'MobileNotification.subject': 'SENSITIVE_HEALTH',
  'MobileNotification.is_read': 'PUBLIC',
  'MobileNotification.read_at': 'PUBLIC',
  'MobileNotification.sent_at': 'PUBLIC',
  'MobileNotification.created_at': 'PUBLIC',
  'MobileSyncStatus.last_synced_at': 'PUBLIC',
  'MobileSyncStatus.pending_count': 'PUBLIC',
  'MobileSyncStatus.server_time': 'PUBLIC',
  'MobileSyncStatus.server_version': 'PUBLIC',
  'MobileSyncStatus.contract_version': 'PUBLIC',
  'MobileSyncStatus.unread_notifications': 'PUBLIC',
  'MobileErrorMessage.code': 'PUBLIC',
  'MobileErrorMessage.ar': 'PUBLIC',
  'MobileErrorMessage.en': 'PUBLIC',
};

export function classificationOf(schemaField: string): ClassificationLevel | undefined {
  return MOBILE_FIELD_CLASSIFICATION[schemaField];
}

export function isForbiddenField(name: string): boolean {
  return MOBILE_FORBIDDEN_FIELDS.has(name);
}
