"""تصنيف بيانات الـ API المخصّص للجوال — أساس عقد التصنيف (M1.6).

القاعدة المُلزمة (عقد المرحلة الأولى §14):

    INTERNAL data must never accidentally enter a mobile response.

كل حقل يظهر في مخطط ``/api/v1/mobile/`` يجب أن يملك مدخلاً معتمداً هنا،
ومستوى ``INTERNAL`` ممنوع من الظهور في أي استجابة أو مخطط جوال.
"""

from __future__ import annotations

CLASSIFICATION_LEVELS = (
    'PUBLIC',
    'PERSONAL',
    'SENSITIVE_HEALTH',
    'SECURITY_SENSITIVE',
    'INTERNAL',
)

# أغراض معتمدة (approved purpose) لحقول SENSITIVE_HEALTH في مساحة الجوال (§10):
# - MobileCertificate.{vaccine_name,issued_at,valid_until,status}: عرض شهادات المسافر نفسه.
# - MobileDeclaration.{status,symptoms,submitted_at}: عرض إقرار المسافر نفسه (بدون مخاطرة داخلية).
# - MobileNotification.subject: عنوان إشعار المستخدم نفسه (ازفق نص/مستلم داخلي).
SENSITIVE_HEALTH_FIELD_PURPOSES: dict[tuple[str, str], str] = {
    ('MobileCertificate', 'vaccine_name'): 'عرض شهادة التطعيم المسجلة للمسافر نفسه',
    ('MobileCertificate', 'issued_at'): 'عرض توقيت إصدار شهادة المسافر نفسه',
    ('MobileCertificate', 'valid_until'): 'عرض سريان شهادة المسافر نفسه',
    ('MobileCertificate', 'status'): 'عرض حالة شهادة المسافر نفسه',
    ('MobileDeclaration', 'status'): 'عرض حالة إقرار المسافر الصحي نفسه',
    ('MobileDeclaration', 'symptoms'): 'عرض أعراض إقرار المسافر الصحي نفسه',
    ('MobileDeclaration', 'submitted_at'): 'عرض توقيت إقرار المسافر الصحي نفسه',
    ('MobileNotification', 'subject'): 'عنوان إشعار المستخدم نفسه (بدون نص/مستلم داخلي)',
}

# خريطة (مسار الاستجابة داخل المخطط، اسم الحقل) -> مستوى التصنيف.
# تُقرأ اختبارات العقد من هذه الخريطة حرفياً: أي حقل غائب منها = فشل.
MOBILE_RESPONSE_FIELDS: dict[tuple[str, str], str] = {
    # --- auth ---
    ('MobileAuthLoginResponse', 'access_token'): 'SECURITY_SENSITIVE',
    ('MobileAuthLoginResponse', 'refresh_token'): 'SECURITY_SENSITIVE',
    ('MobileAuthLoginResponse', 'expires_in'): 'PUBLIC',
    ('MobileAuthRefreshResponse', 'access_token'): 'SECURITY_SENSITIVE',
    ('MobileAuthRefreshResponse', 'expires_in'): 'PUBLIC',
    # --- profile ---
    ('MobileProfile', 'id'): 'PERSONAL',
    ('MobileProfile', 'full_name'): 'PERSONAL',
    ('MobileProfile', 'email'): 'PERSONAL',
    ('MobileProfile', 'phone'): 'PERSONAL',
    ('MobileProfile', 'national_id'): 'PERSONAL',
    ('MobileProfile', 'user_type'): 'PUBLIC',
    # --- trips ---
    ('MobileTrip', 'id'): 'PUBLIC',
    ('MobileTrip', 'destination'): 'PERSONAL',
    ('MobileTrip', 'transport_mode'): 'PUBLIC',
    ('MobileTrip', 'departure_date'): 'PERSONAL',
    ('MobileTrip', 'return_date'): 'PERSONAL',
    ('MobileTrip', 'status'): 'PUBLIC',
    # --- requirements ---
    ('MobileRequirement', 'code'): 'PUBLIC',
    ('MobileRequirement', 'title_ar'): 'PUBLIC',
    ('MobileRequirement', 'title_en'): 'PUBLIC',
    ('MobileRequirement', 'description_ar'): 'PUBLIC',
    ('MobileRequirement', 'priority'): 'PUBLIC',
    ('MobileRequirement', 'category'): 'PUBLIC',
    ('MobileRequirement', 'effective_from'): 'PUBLIC',
    ('MobileRequirement', 'effective_until'): 'PUBLIC',
    ('MobileRequirement', 'published_at'): 'PUBLIC',
    # --- certificates ---
    ('MobileCertificate', 'id'): 'PUBLIC',
    ('MobileCertificate', 'certificate_number'): 'SECURITY_SENSITIVE',
    ('MobileCertificate', 'vaccine_name'): 'SENSITIVE_HEALTH',
    ('MobileCertificate', 'issued_at'): 'SENSITIVE_HEALTH',
    ('MobileCertificate', 'valid_until'): 'SENSITIVE_HEALTH',
    ('MobileCertificate', 'status'): 'SENSITIVE_HEALTH',
    # --- declarations ---
    ('MobileDeclaration', 'id'): 'PUBLIC',
    ('MobileDeclaration', 'status'): 'SENSITIVE_HEALTH',
    ('MobileDeclaration', 'declared'): 'PUBLIC',
    ('MobileDeclaration', 'symptoms'): 'SENSITIVE_HEALTH',
    ('MobileDeclaration', 'submitted_at'): 'SENSITIVE_HEALTH',
    # --- notifications (مملوكة للمستخدم) ---
    ('MobileNotification', 'id'): 'PUBLIC',
    ('MobileNotification', 'channel'): 'PUBLIC',
    ('MobileNotification', 'status'): 'PUBLIC',
    ('MobileNotification', 'subject'): 'SENSITIVE_HEALTH',
    ('MobileNotification', 'is_read'): 'PUBLIC',
    ('MobileNotification', 'read_at'): 'PUBLIC',
    ('MobileNotification', 'sent_at'): 'PUBLIC',
    ('MobileNotification', 'created_at'): 'PUBLIC',
    # --- غلاف الخطأ (بنية العقد العامة) ---
    ('MobileErrorMessage', 'code'): 'PUBLIC',
    ('MobileErrorMessage', 'ar'): 'PUBLIC',
    ('MobileErrorMessage', 'en'): 'PUBLIC',
    # --- sync ---
    ('MobileSyncStatus', 'last_synced_at'): 'PUBLIC',
    ('MobileSyncStatus', 'pending_count'): 'PUBLIC',
    ('MobileSyncStatus', 'server_time'): 'PUBLIC',
    ('MobileSyncStatus', 'server_version'): 'PUBLIC',
    ('MobileSyncStatus', 'contract_version'): 'PUBLIC',
    ('MobileSyncStatus', 'unread_notifications'): 'PUBLIC',
}

# أسماء حقول محفوظة لـ INTERNAL ومحظورة في أي مخطط/استجابة جوال.
# (قائمة الحظر تُستخدم كدفاع ثانٍ حتى لو لم تُصنَّف الحقول في الخريطة أعلاه.)
MOBILE_FORBIDDEN_FIELDS: frozenset[str] = frozenset({
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
})


def classification_of(schema_name: str, field: str) -> str | None:
    """يعيد مستوى التصنيف المعتمد لحقل في مخطط معيّن، أو ``None`` إن لم يكن مُسجّلاً."""
    return MOBILE_RESPONSE_FIELDS.get((schema_name, field))
