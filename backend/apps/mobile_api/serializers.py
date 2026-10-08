"""مُعرِّفات عقد الـ API للجوال (M1.3/M1.6).

هذه الـ serializers تعرّف **شكل العقد المستقبَل** فقط: تُستخدَم في مخطط
OpenAPI وفي اختبارات العقد. نقاط النهاية تُرجِع حالياً 501 ولا تُصنِّع أي
بيانات إنتاجية مُختلقة. أسماء المكوّنات هنا مرتبطة بسجل التصنيف في
``classification.py`` — إضافة حقل بلا تصنيف = فشل اختبار العقد.
"""

from __future__ import annotations

from rest_framework import serializers


class MobileErrorMessage(serializers.Serializer):
    code = serializers.CharField(help_text='رمز الخطأ المعتمد')
    ar = serializers.CharField(help_text='رسالة المستخدم بالعربية (لغة أساسية)')
    en = serializers.CharField(help_text='English message (secondary)')


class MobileErrorEnvelope(serializers.Serializer):
    status = serializers.CharField(default='error')
    data = serializers.JSONField(allow_null=True, default=None)
    message = MobileErrorMessage()


def _envelope(
    inner: type[serializers.Serializer], *, many: bool = True
) -> type[serializers.Serializer]:
    """غلاف نجاح: {status, data: inner|list[inner], message: null}."""

    class _Envelope(serializers.Serializer):
        status = serializers.CharField(default='success')
        data = inner(many=many, required=False, allow_null=True)
        message = serializers.CharField(allow_null=True, required=False, default=None)

    suffix = 'List' if many else 'Envelope'
    _Envelope.__name__ = inner.__name__.replace('Serializer', '') + suffix
    return _Envelope


class MobileAuthLoginResponseSerializer(serializers.Serializer):
    """M2: يُملأ من SUDAPASS OIDC (D-P0-1) + JWT انتقالي — رموز أمان حساسة."""

    access_token = serializers.CharField()
    refresh_token = serializers.CharField()
    expires_in = serializers.IntegerField()


class MobileAuthRefreshResponseSerializer(serializers.Serializer):
    access_token = serializers.CharField()
    expires_in = serializers.IntegerField()


class MobileProfileSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    full_name = serializers.CharField()
    email = serializers.EmailField(allow_blank=True)
    phone = serializers.CharField(allow_blank=True)
    national_id = serializers.CharField(allow_blank=True)
    user_type = serializers.CharField()


class MobileTripSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    destination = serializers.CharField(allow_blank=True)
    transport_mode = serializers.CharField()
    departure_date = serializers.DateField()
    return_date = serializers.DateField(allow_null=True)
    status = serializers.CharField()


class MobileRequirementSerializer(serializers.Serializer):
    """متطلب سفر/صحة للجوال — ينعكس حرفياً من HealthNotice بدون اختلاق.

    ``title_en`` يُترك فارغاً حين لا يتوفر مصدر إنجليزي (لا تُبتكر ترجمة).
    """

    code = serializers.CharField(help_text='معرّف المصدر (HealthNotice)')
    title_ar = serializers.CharField()
    title_en = serializers.CharField(required=False, allow_blank=True, default='')
    description_ar = serializers.CharField(required=False, allow_blank=True, default='')
    priority = serializers.CharField(required=False, allow_blank=True, default='')
    category = serializers.CharField(required=False, allow_blank=True, default='')
    effective_from = serializers.DateField(required=False, allow_null=True)
    effective_until = serializers.DateField(required=False, allow_null=True)
    published_at = serializers.DateTimeField(required=False, allow_null=True)


class MobileCertificateSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    certificate_number = serializers.CharField()
    vaccine_name = serializers.CharField()
    issued_at = serializers.DateTimeField()
    valid_until = serializers.DateField()
    status = serializers.CharField()


class MobileDeclarationSerializer(serializers.Serializer):
    """إسقاط إقرار المسافر الصحي — الحد الأدنى المعتمد، بلا حقول مخاطرة.

    risk_score/risk_level/… بيانات داخلية ممنوعة من الجوال (§8.3/§10).
    """

    id = serializers.UUIDField()
    status = serializers.CharField(required=False, allow_blank=True, default='')
    declared = serializers.BooleanField()
    symptoms = serializers.ListField(child=serializers.CharField(), required=False, default=[])
    submitted_at = serializers.DateTimeField(allow_null=True)


class MobileNotificationSerializer(serializers.Serializer):
    """إشعار مملوك للمستخدم — بلا نص داخلي/خطأ/مستلم (§8.6)."""

    id = serializers.UUIDField()
    channel = serializers.CharField()
    status = serializers.CharField()
    subject = serializers.CharField(allow_blank=True)
    is_read = serializers.BooleanField()
    read_at = serializers.DateTimeField(allow_null=True)
    sent_at = serializers.DateTimeField(allow_null=True)
    created_at = serializers.DateTimeField()


class MobileSyncStatusSerializer(serializers.Serializer):
    last_synced_at = serializers.DateTimeField(allow_null=True)
    pending_count = serializers.IntegerField()
    server_time = serializers.DateTimeField()
    server_version = serializers.CharField(required=False)
    contract_version = serializers.CharField(required=False)
    unread_notifications = serializers.IntegerField(required=False)


class MobileProfileEnvelope(_envelope(MobileProfileSerializer, many=False)):
    pass


class MobileNotificationList(_envelope(MobileNotificationSerializer)):
    pass


class MobileCertificateList(_envelope(MobileCertificateSerializer)):
    pass


class MobileTripList(_envelope(MobileTripSerializer)):
    pass


class MobileRequirementList(_envelope(MobileRequirementSerializer)):
    pass


class MobileCertificateList(_envelope(MobileCertificateSerializer)):
    pass


class MobileDeclarationList(_envelope(MobileDeclarationSerializer)):
    pass
