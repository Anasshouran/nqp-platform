import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import BaseModel
from apps.organization.models import Sector


class FoodShipment(BaseModel):
    class ShipmentStatus(models.TextChoices):
        DRAFT = 'DRAFT', 'مسودة'
        RECEIVED = 'RECEIVED', 'تم الاستلام'
        FEES_DUE = 'FEES_DUE', 'مستحقة الرسوم'
        AWAITING_INSPECTION = 'AWAITING_INSPECTION', 'بانتظار التفتيش'
        UNDER_INSPECTION = 'UNDER_INSPECTION', 'قيد التفتيش'
        AWAITING_LAB_RESULTS = 'AWAITING_LAB_RESULTS', 'بانتظار النتائج'
        AWAITING_DECISION = 'AWAITING_DECISION', 'بانتظار القرار'
        RELEASED = 'RELEASED', 'تم الإفراج'
        CONDITIONAL_RELEASE = 'CONDITIONAL_RELEASE', 'إفراج مشروط'
        REJECTED = 'REJECTED', 'مرفوض'
        HOLD = 'HOLD', 'محجوزة'
        RE_EXPORT = 'RE_EXPORT', 'إعادة تصدير'
        DESTROYED = 'DESTROYED', 'إتلاف'

    class FinalDecision(models.TextChoices):
        COMPLIANT = 'COMPLIANT', 'يتم الإفراج'
        CONDITIONAL_RELEASE = 'CONDITIONAL_RELEASE', 'إفراج مشروط'
        PARTIAL_RELEASE = 'PARTIAL_RELEASE', 'إفراج جزئي'
        TEMPORARY_RELEASE = 'TEMPORARY_RELEASE', 'إفراج مؤقت'
        REJECTED = 'REJECTED', 'رفض الشحنة'
        HOLD = 'HOLD', 'حجز الشحنة'
        RE_EXPORT = 'RE_EXPORT', 'إعادة تصدير'
        TRANSFER = 'TRANSFER', 'تحويل الشحنة'
        DESTROY = 'DESTROY', 'إتلاف'

    class ShipmentType(models.TextChoices):
        IMPORT = 'IMPORT', 'وارد'
        EXPORT = 'EXPORT', 'صادر'

    class ReferralSource(models.TextChoices):
        LAND_BORDER_HEALTH = 'LAND_BORDER_HEALTH', 'نظام الحجر الصحي للمعابر الحدية'
        PORT_HEALTH = 'PORT_HEALTH', 'نظام الحجر الصحي للموانئ'
        AIRPORT_HEALTH = 'AIRPORT_HEALTH', 'نظام الحجر الصحي للمطارات'

    class MessageType(models.TextChoices):
        COMMERCIAL = 'COMMERCIAL', 'تجارية'
        RELIEF = 'RELIEF', 'إغاثة'
        EXEMPT = 'EXEMPT', 'إعفاء'

    manifest_number = models.CharField(max_length=50, unique=True, verbose_name='رقم البيان')
    port = models.ForeignKey(
        'masterdata.EntryPoint', on_delete=models.PROTECT, related_name='food_shipments', verbose_name='المنفذ'
    )
    supplier_name = models.CharField(max_length=255, verbose_name='اسم المورد')
    origin_country = models.CharField(max_length=100, verbose_name='دولة المنشأ')
    product_list = models.JSONField(default=list, blank=True, verbose_name='قائمة المنتجات')
    arrival_date = models.DateField(verbose_name='تاريخ الوصول')
    shipment_type = models.CharField(
        max_length=10, choices=ShipmentType.choices, default=ShipmentType.IMPORT, verbose_name='النوع'
    )
    customs_number = models.CharField(max_length=50, blank=True, verbose_name='الرقم الجمركي')
    certificate_no = models.CharField(max_length=50, blank=True, verbose_name='رقم شهادة الاعتماد')
    vessel_name = models.CharField(max_length=150, blank=True, verbose_name='اسم الباخرة')
    clearing_agent = models.CharField(max_length=150, blank=True, verbose_name='المخلّص الجمركي')
    exporter_name = models.CharField(max_length=255, blank=True, verbose_name='اسم المُصدِّر (للمصدر)')
    message_type = models.CharField(
        max_length=20, choices=MessageType.choices, default=MessageType.COMMERCIAL, verbose_name='نوع الرسالة'
    )
    loading_port = models.CharField(max_length=150, blank=True, verbose_name='ميناء الشحن')
    bill_of_lading = models.CharField(max_length=50, blank=True, verbose_name='رقم البوليصة')
    transport_data = models.JSONField(
        default=dict, blank=True, verbose_name='بيانات وسيلة النقل (AWB/شاحنة/معبر…)'
    )
    total_weight_kg = models.DecimalField(
        max_digits=14, decimal_places=2, default=0, verbose_name='الوزن الإجمالي (كغ)'
    )
    samples_required = models.PositiveIntegerField(default=0, verbose_name='عدد العينات المطلوبة')
    inspection_required = models.BooleanField(default=True, verbose_name='يلزم التفتيش')
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت إحالة الطلب')
    status = models.CharField(
        max_length=25, choices=ShipmentStatus.choices, default=ShipmentStatus.RECEIVED, verbose_name='الحالة'
    )
    assigned_inspector = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_food_shipments',
        verbose_name='المفتش المعيّن',
    )
    assigned_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت التعيين')
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recorded_food_shipments',
        verbose_name='الكاتب المسجّل',
    )
    final_decision = models.CharField(
        max_length=25, choices=FinalDecision.choices, blank=True, verbose_name='القرار النهائي'
    )
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='finalized_food_shipments',
        verbose_name='مُصدر القرار النهائي',
    )
    decided_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت القرار')
    decision_reason = models.TextField(blank=True, verbose_name='سبب القرار')
    fees_paid = models.BooleanField(default=False, verbose_name='الرسوم المسددة')
    referred_from = models.CharField(
        max_length=30, choices=ReferralSource.choices, blank=True, verbose_name='مصدر الإحالة'
    )
    referral_reference = models.CharField(max_length=100, blank=True, verbose_name='مرجع الإحالة')
    referred_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='referred_food_shipments',
        verbose_name='مُحيل الشحنة',
    )
    referred_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإحالة')

    class Meta:
        ordering = ['-arrival_date']
        verbose_name = 'شحنة غذائية'
        verbose_name_plural = 'الشحنات الغذائية'

    def __str__(self):
        return self.manifest_number


class FoodOrderItem(BaseModel):
    """صنف ضمن طلب/شحنة غذائية (اسم/ماركة/منشأ/وزن/عدد عبوات/نوع عبوة)."""

    shipment = models.ForeignKey(
        FoodShipment, on_delete=models.CASCADE, related_name='items', verbose_name='الشحنة'
    )
    product_name = models.CharField(max_length=255, verbose_name='اسم الصنف')
    brand = models.CharField(max_length=100, blank=True, verbose_name='الماركة')
    origin = models.CharField(max_length=100, blank=True, verbose_name='المنشأ')
    weight_kg = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='الوزن (كغ)')
    package_count = models.PositiveIntegerField(default=0, verbose_name='عدد العبوات')
    package_type = models.CharField(max_length=100, blank=True, verbose_name='نوع العبوة')

    class Meta:
        ordering = ['created_at']
        verbose_name = 'صنف طلب'
        verbose_name_plural = 'أصناف الطلبات'

    def __str__(self):
        return self.product_name


class ShipmentAttachment(BaseModel):
    """مستند مرفق بالشحنة (بيان جمركي، شهادة صحية، فاتورة، AWB/B/L…)."""

    class DocType(models.TextChoices):
        CUSTOMS = 'CUSTOMS', 'البيان الجمركي'
        HEALTH_CERT = 'HEALTH_CERT', 'الشهادة الصحية'
        ORIGIN_CERT = 'ORIGIN_CERT', 'شهادة المنشأ'
        INVOICE = 'INVOICE', 'الفاتورة'
        PACKING_LIST = 'PACKING_LIST', 'قائمة التعبئة'
        AWB_BL = 'AWB_BL', 'AWB / B/L'
        ANALYSIS_CERT = 'ANALYSIS_CERT', 'شهادة التحليل'
        OTHER = 'OTHER', 'مستند إضافي'

    class DocStatus(models.TextChoices):
        UPLOADED = 'UPLOADED', 'مرفوع'
        RECEIVED = 'RECEIVED', 'تم الاستلام'
        UNDER_REVIEW = 'UNDER_REVIEW', 'قيد المراجعة'
        ACCEPTED = 'ACCEPTED', 'مقبول'
        REJECTED = 'REJECTED', 'مرفوض'
        CORRECTION_REQUIRED = 'CORRECTION_REQUIRED', 'مطلوب تصحيح'

    shipment = models.ForeignKey(
        FoodShipment, on_delete=models.CASCADE, related_name='attachments', verbose_name='الشحنة'
    )
    doc_type = models.CharField(max_length=20, choices=DocType.choices, verbose_name='نوع المستند')
    file = models.FileField(upload_to='food_shipments/%Y/%m/', verbose_name='الملف')
    original_name = models.CharField(max_length=255, blank=True, verbose_name='اسم الملف الأصلي')
    status = models.CharField(
        max_length=24, choices=DocStatus.choices, default=DocStatus.UPLOADED, verbose_name='حالة المستند'
    )
    rejected_reason = models.TextField(blank=True, verbose_name='سبب الرفض/التصحيح')
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='shipment_attachments',
        verbose_name='رافع المستند',
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'مستند شحنة'
        verbose_name_plural = 'مستندات الشحنات'

    def __str__(self):
        return f'{self.get_doc_type_display()} — {self.shipment_id}'


class FoodShipmentEvent(BaseModel):
    """حدث ضمن التسلسل الزمني للطلب — يسجل مسار الشحنة منذ إنشائها حتى القرار.

    تكوّن هذه الأحداث «متابعة الطلب» (Request Timeline) التي يراها الكاتب
    والأدوار الأعلى، بتسلسل زمني مرتّب.
    """

    class Stage(models.TextChoices):
        CREATED = 'CREATED', 'تم إنشاء الطلب'
        DOCS_UPLOADED = 'DOCS_UPLOADED', 'تم رفع المستندات'
        DOCS_COMPLETE = 'DOCS_COMPLETE', 'اكتملت المستندات'
        SUBMITTED = 'SUBMITTED', 'تم إرسال الطلب'
        ADMIN_REVIEW = 'ADMIN_REVIEW', 'المراجعة الإدارية'
        REFERRED_TO_ACCOUNTANT = 'REFERRED_TO_ACCOUNTANT', 'تمت الإحالة للمحاسب'
        FEES_ASSESSED = 'FEES_ASSESSED', 'تم احتساب الرسوم'
        FEES_CONFIRMED = 'FEES_CONFIRMED', 'تم تأكيد الرسوم'
        REFERRED_TO_INSPECTOR = 'REFERRED_TO_INSPECTOR', 'تمت الإحالة للمفتش'
        INSPECTION = 'INSPECTION', 'التفتيش'
        SAMPLING = 'SAMPLING', 'أخذ العينات'
        LABORATORY = 'LABORATORY', 'المختبر'
        AWAITING_DECISION = 'AWAITING_DECISION', 'بانتظار القرار'
        DECISION = 'DECISION', 'القرار'
        RELEASED = 'RELEASED', 'تم الإفراج'
        REJECTED = 'REJECTED', 'مرفوض'
        CORRECTION = 'CORRECTION', 'مطلوب تصحيح'
        OTHER = 'OTHER', 'حدث آخر'

    shipment = models.ForeignKey(
        FoodShipment, on_delete=models.CASCADE, related_name='events', verbose_name='الشحنة'
    )
    stage = models.CharField(max_length=30, choices=Stage.choices, verbose_name='المرحلة')
    message = models.TextField(blank=True, verbose_name='الوصف')
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='shipment_events',
        verbose_name='المستخدم',
    )
    occurred_at = models.DateTimeField(default=timezone.now, verbose_name='وقت الحدث')

    class Meta:
        ordering = ['occurred_at', 'created_at']
        verbose_name = 'حدث طلب غذائي'
        verbose_name_plural = 'أحداث الطلبات الغذائية (التسلسل الزمني)'

    def __str__(self):
        return f'{self.shipment_id} — {self.get_stage_display()}'


class FoodFee(BaseModel):
    class FeeType(models.TextChoices):
        INSPECTION = 'INSPECTION', 'تفتيش'
        SAMPLE = 'SAMPLE', 'عينة'
        ANALYSIS = 'ANALYSIS', 'تحليل'
        CERTIFICATE = 'CERTIFICATE', 'شهادة'
        ADMIN = 'ADMIN', 'رسوم إدارية'

    name_ar = models.CharField(max_length=200, verbose_name='الاسم بالعربية')
    fee_type = models.CharField(max_length=20, choices=FeeType.choices, verbose_name='النوع')
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='المبلغ')
    unit = models.CharField(max_length=50, blank=True, verbose_name='الوحدة')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['fee_type', 'amount']
        verbose_name = 'بند رسوم'
        verbose_name_plural = 'بنود الرسوم'

    def __str__(self):
        return f'{self.name_ar} ({self.amount})'


class QuarantineFee(BaseModel):
    """بند من تعرفة رسوم الكرنتينة (2025) — بفئتين (جنيه/دولار) ومصنّف حسب القسم."""

    class Category(models.TextChoices):
        SHIP_INSPECTION = 'SHIP_INSPECTION', 'رسوم التفتيش الصحي للبواخر'
        HEALTH_SERVICES = 'HEALTH_SERVICES', 'الخدمات الصحية'
        VACCINATION = 'VACCINATION', 'التطعيمات'
        MEDICAL_FITNESS = 'MEDICAL_FITNESS', 'اللياقة الطبية'
        PEST_CONTROL = 'PEST_CONTROL', 'التفتيش والمكافحة'
        CERTIFICATE = 'CERTIFICATE', 'الشهادات'
        VIOLATION = 'VIOLATION', 'المخالفات'
        FOOD_IMPORT = 'FOOD_IMPORT', 'المواد الغذائية الواردة'
        FOOD_EXPORT = 'FOOD_EXPORT', 'المواد الغذائية الصادرة'
        UNLOADING = 'UNLOADING', 'رسوم الإنزالات'
        MICRO_TEST = 'MICRO_TEST', 'الفحوصات الميكروبية'
        CHEMICAL_TEST = 'CHEMICAL_TEST', 'الفحوصات الكيميائية'

    category = models.CharField(
        max_length=30, choices=Category.choices, verbose_name='القسم'
    )
    name_ar = models.CharField(max_length=250, verbose_name='الاسم بالعربية')
    amount_sdg = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True, verbose_name='الجنيه (SDG)'
    )
    amount_usd = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True, verbose_name='الدولار (USD)'
    )
    currency_note = models.CharField(max_length=50, blank=True, verbose_name='ملاحظة عملة')
    code = models.CharField(max_length=20, blank=True, verbose_name='الكود')
    order = models.PositiveIntegerField(default=0, verbose_name='الترتيب')
    year = models.PositiveIntegerField(default=2025, verbose_name='السنة')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['year', 'category', 'order', 'id']
        verbose_name = 'بند تعرفة الكرنتينة'
        verbose_name_plural = 'تعرفة رسوم الكرنتينة'

    def __str__(self):
        return f'{self.name_ar} ({self.year})'


class FoodInvoice(BaseModel):
    class PaymentStatus(models.TextChoices):
        PENDING = 'PENDING', 'معلقة'
        PAID = 'PAID', 'مدفوعة'

    class PaymentMethod(models.TextChoices):
        CASH = 'CASH', 'نقدي'
        BANK_CARD = 'BANK_CARD', 'شبكة بنكية'
        BANK_TRANSFER = 'BANK_TRANSFER', 'تحويل بنكي'
        ELECTRONIC = 'ELECTRONIC', 'إلكتروني'

    shipment = models.OneToOneField(
        FoodShipment, on_delete=models.CASCADE, related_name='invoice', verbose_name='الشحنة'
    )
    invoice_number = models.CharField(max_length=50, unique=True, verbose_name='رقم الفاتورة')
    items = models.JSONField(default=list, verbose_name='بنود الفاتورة')
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, verbose_name='الإجمالي')
    status = models.CharField(
        max_length=10, choices=PaymentStatus.choices, default=PaymentStatus.PENDING, verbose_name='الحالة'
    )
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='issued_food_invoices',
        verbose_name='الكاتب/المحاسب المُصدر',
    )
    issued_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الإصدار')
    receipt_number = models.CharField(max_length=50, blank=True, verbose_name='رقم الإيصال')
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        blank=True,
        verbose_name='طريقة الدفع',
    )
    paid_notes = models.TextField(blank=True, verbose_name='ملاحظات التحصيل')
    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='collected_food_payments',
        verbose_name='المحاسب المستلم',
    )
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الدفع')
    payment_reference = models.CharField(max_length=100, blank=True, verbose_name='مرجع الدفع')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'فاتورة رسوم'
        verbose_name_plural = 'فواتير الرسوم'

    def __str__(self):
        return self.invoice_number


class FoodInspection(BaseModel):
    class Decision(models.TextChoices):
        COMPLIANT = 'COMPLIANT', 'مطابق'
        NON_COMPLIANT = 'NON_COMPLIANT', 'غير مطابق'
        NEEDS_ANALYSIS = 'NEEDS_ANALYSIS', 'يحتاج تحليل'

    shipment = models.OneToOneField(
        FoodShipment, on_delete=models.CASCADE, related_name='inspection', verbose_name='الشحنة'
    )
    inspector = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='food_inspections',
        verbose_name='المفتش',
    )
    production_date = models.DateField(null=True, blank=True, verbose_name='تاريخ الإنتاج')
    expiry_date = models.DateField(null=True, blank=True, verbose_name='تاريخ الانتهاء')
    temperature = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, verbose_name='الحرارة')
    container_condition = models.CharField(max_length=100, blank=True, verbose_name='حالة الماعون')
    container_status = models.CharField(max_length=150, blank=True, verbose_name='حالة الحاوية')
    batch_number = models.CharField(max_length=100, blank=True, verbose_name='رقم التشغيلة')
    package_condition = models.CharField(max_length=150, blank=True, verbose_name='حالة العبوات')
    damaged_weight = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='الوزن التالف')
    sound_weight = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='الوزن السليم')
    damaged_count = models.PositiveIntegerField(default=0, verbose_name='عدد العبوات التالفة')
    sound_count = models.PositiveIntegerField(default=0, verbose_name='عدد العبوات السليمة')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    inspection_notes = models.JSONField(default=dict, blank=True, verbose_name='ملاحظات التفتيش')
    decision = models.CharField(max_length=20, choices=Decision.choices, verbose_name='القرار')
    inspected_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت التفتيش')

    class SupervisorStatus(models.TextChoices):
        PENDING = 'PENDING', 'بانتظار مراجعة رئيس القسم'
        APPROVED = 'APPROVED', 'معتمد من رئيس القسم'
        RETURNED = 'RETURNED', 'مُرجع لإعادة التفتيش'

    supervisor_status = models.CharField(
        max_length=20,
        choices=SupervisorStatus.choices,
        default=SupervisorStatus.PENDING,
        verbose_name='حالة مراجعة المشرف',
    )
    supervisor_notes = models.TextField(blank=True, verbose_name='ملاحظات إشرافية')
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='food_inspections_reviewed',
        verbose_name='المراجع',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت المراجعة')

    class Meta:
        verbose_name = 'تفتيش غذائي'
        verbose_name_plural = 'التفتيش الغذائي'

    def __str__(self):
        return f'{self.shipment.manifest_number} - {self.decision}'


class SampleSource(BaseModel):
    """مصدر العينة — كيان مستقل (المطار، الموانئ، التفتيش الميداني، ...)."""

    code = models.CharField(max_length=50, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=200, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=200, blank=True, verbose_name='الاسم بالإنجليزية')
    description = models.TextField(blank=True, verbose_name='الوصف')
    order = models.PositiveIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['order', 'name_ar']
        verbose_name = 'مصدر عينة'
        verbose_name_plural = 'مصادر العينات'

    def __str__(self):
        return self.name_ar


class ReferenceSample(BaseModel):
    """سجل العينات المرجعية — لا تدخل دورة التحليل العادية."""

    class Status(models.TextChoices):
        STORED = 'STORED', 'مخزنة'
        RETRIEVED = 'RETRIEVED', 'تم الرجوع إليها'
        DISCARDED = 'DISCARDED', 'أُعدمت'

    ref_number = models.CharField(max_length=50, unique=True, verbose_name='الرقم المرجعي')
    original_sample = models.ForeignKey(
        'FoodSample', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reference_copies', verbose_name='العينة الأصلية',
    )
    quantity = models.CharField(max_length=60, blank=True, verbose_name='كمية العينة')
    retention_reason = models.CharField(max_length=200, blank=True, verbose_name='سبب الحفظ')
    storage_temperature = models.CharField(max_length=40, blank=True, verbose_name='درجة الحفظ')
    retention_duration = models.CharField(max_length=60, blank=True, verbose_name='مدة الاحتفاظ')
    source = models.ForeignKey(
        SampleSource, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reference_samples', verbose_name='المصدر',
    )
    product_name = models.CharField(max_length=200, verbose_name='اسم المادة / العينة')
    origin = models.CharField(max_length=200, blank=True, verbose_name='المنشأ / الدفعة')
    storage_location = models.CharField(max_length=120, blank=True, verbose_name='موقع التخزين')
    coding = models.CharField(max_length=120, blank=True, verbose_name='الترميز')
    seal_number = models.CharField(max_length=120, blank=True, verbose_name='رقم الختم')
    condition_on_arrival = models.CharField(max_length=200, blank=True, verbose_name='حالة العينة عند الاستلام')
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='received_reference_samples', verbose_name='موظف الاستلام',
    )
    received_at = models.DateTimeField(default=timezone.now, verbose_name='وقت الاستلام')
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.STORED, verbose_name='الحالة',
    )
    retrieved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='retrieved_reference_samples', verbose_name='الموظف الذي رجع إليها',
    )
    retrieved_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الرجوع')
    remarks = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-received_at']
        verbose_name = 'عينة مرجعية'
        verbose_name_plural = 'العينات المرجعية'

    def __str__(self):
        return self.ref_number

    def save(self, *args, **kwargs):
        if not self.ref_number:
            self.ref_number = f'FCR-{timezone.now().year}-{uuid.uuid4().hex[:6].upper()}'
        super().save(*args, **kwargs)


class FoodSample(BaseModel):
    class LifecycleStatus(models.TextChoices):
        RECEIVED = 'RECEIVED', 'تم الاستلام'
        COORDINATED = 'COORDINATED', 'تم التنسيق'
        ASSIGNED = 'ASSIGNED', 'أُسندت للقسم'
        UNDER_TESTING = 'UNDER_TESTING', 'قيد التحليل'
        READY_FOR_APPROVAL = 'READY_FOR_APPROVAL', 'جاهزة للاعتماد'
        APPROVED = 'APPROVED', 'معتمدة'
        DISPATCHED = 'DISPATCHED', 'أُرسلت النتائج'
        COMPLETED = 'COMPLETED', 'مكتملة'
        REJECTED = 'REJECTED', 'مرفوضة'

    class Classification(models.TextChoices):
        REFERENCE = 'REFERENCE', 'مرجعية'
        ANALYSIS = 'ANALYSIS', 'للتحليل'

    class CollectionStatus(models.TextChoices):
        PENDING = 'PENDING', 'غير محصّل'
        PAID = 'PAID', 'محصّل'
        EXEMPT = 'EXEMPT', 'معفاة'

    class LabBench(models.TextChoices):
        MICROBIOLOGY = 'MICROBIOLOGY', 'الأحياء الدقيقة'
        CHEMISTRY = 'CHEMISTRY', 'الكيمياء'
        TOXICOLOGY = 'TOXICOLOGY', 'السموم'
        MOLECULAR = 'MOLECULAR', 'الجزيئي'

    class ApprovalStatus(models.TextChoices):
        PENDING = 'PENDING', 'قيد الاعتماد'
        APPROVED = 'APPROVED', 'معتمد'

    class ReceptionStatus(models.TextChoices):
        RECEIVED = 'RECEIVED', 'تم الاستلام'
        ACCEPTED = 'ACCEPTED', 'مقبولة'
        CONDITIONALLY_ACCEPTED = 'CONDITIONALLY_ACCEPTED', 'قبول مشروط'
        REJECTED = 'REJECTED', 'مرفوضة (الاستلام)'

    class SamplingReason(models.TextChoices):
        ROUTINE = 'ROUTINE', 'روتيني'
        SUSPECTED = 'SUSPECTED', 'اشتباه فساد'
        FIRST_ENTRY = 'FIRST_ENTRY', 'أول ورود'

    class Priority(models.TextChoices):
        LOW = 'LOW', 'منخفضة'
        NORMAL = 'NORMAL', 'عادية'
        HIGH = 'HIGH', 'عالية'
        URGENT = 'URGENT', 'عاجلة'

    inspection = models.ForeignKey(
        FoodInspection, on_delete=models.SET_NULL, null=True, blank=True, related_name='samples', verbose_name='التفتيش'
    )
    source = models.ForeignKey(
        SampleSource, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='food_samples', verbose_name='مصدر العينة',
    )
    classification = models.CharField(
        max_length=20, choices=Classification.choices, default=Classification.ANALYSIS, verbose_name='التصنيف'
    )
    requesting_department = models.CharField(max_length=200, blank=True, verbose_name='الجهة الطالبة')
    sample_barcode = models.CharField(max_length=50, unique=True, verbose_name='باركود العينة')
    sample_number = models.CharField(max_length=50, unique=True, blank=True, verbose_name='الرقم المرجعي')
    sample_type = models.CharField(max_length=30, verbose_name='نوع العينة')
    analysis_request_number = models.CharField(max_length=60, blank=True, verbose_name='رقم طلب التحليل')
    station = models.CharField(max_length=120, blank=True, verbose_name='الموقع / المحطة')
    inspector_name = models.CharField(max_length=120, blank=True, verbose_name='اسم المفتش')
    brand = models.CharField(max_length=120, blank=True, verbose_name='العلامة التجارية')
    origin_country = models.CharField(max_length=80, blank=True, verbose_name='بلد المنشأ')
    batch_number = models.CharField(max_length=80, blank=True, verbose_name='رقم التشغيلة Batch')
    production_date = models.DateField(null=True, blank=True, verbose_name='تاريخ الإنتاج')
    expiry_date = models.DateField(null=True, blank=True, verbose_name='تاريخ الانتهاء')
    quantity = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True, verbose_name='الكمية')
    quantity_unit = models.CharField(max_length=20, blank=True, verbose_name='وحدة الكمية')
    units_count = models.PositiveIntegerField(null=True, blank=True, verbose_name='عدد الوحدات')
    packaging_type = models.CharField(max_length=80, blank=True, verbose_name='نوع العبوة')
    packaging_condition = models.CharField(max_length=40, blank=True, verbose_name='حالة العبوة')
    temperature = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, verbose_name='درجة الحرارة °C')
    sampling_reason = models.CharField(
        max_length=20, choices=SamplingReason.choices, default=SamplingReason.ROUTINE, verbose_name='سبب أخذ العينة'
    )
    priority = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.NORMAL, verbose_name='أولوية التحليل'
    )
    priority_updated_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت آخر تحديث للأولوية')
    priority_updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='prioritized_food_samples',
        verbose_name='محدّث الأولوية',
    )
    bench = models.CharField(
        max_length=20, choices=LabBench.choices, default=LabBench.MICROBIOLOGY, verbose_name='قسم المختبر'
    )
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='received_food_samples',
        verbose_name='موظف الاستقبال',
    )
    received_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الاستلام')
    coordinator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='coordinated_food_samples',
        verbose_name='منسّق عينات المختبر',
    )
    department_head = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='headed_food_samples',
        verbose_name='رئيس القسم',
    )
    analyst = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='analyzed_food_samples',
        verbose_name='المحلل',
    )
    status = models.CharField(
        max_length=20, choices=LifecycleStatus.choices, default=LifecycleStatus.RECEIVED, verbose_name='الحالة'
    )
    approval_status = models.CharField(
        max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.PENDING, verbose_name='حالة الاعتماد'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_food_samples',
        verbose_name='المعتمد',
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الاعتماد')
    collection_status = models.CharField(
        max_length=20, choices=CollectionStatus.choices, default=CollectionStatus.PENDING, verbose_name='حالة التحصيل'
    )
    fee_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='رسوم التحليل')
    dispatched_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dispatched_food_samples',
        verbose_name='موظف الإرسال',
    )
    dispatched_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإرسال')
    dispatch_notes = models.TextField(blank=True, verbose_name='ملاحظات الإرسال')
    reported_to_food_safety = models.BooleanField(default=False, verbose_name='أُرسلت نتائجها لنظام الرقابة الغذائية')
    reception_status = models.CharField(
        max_length=30,
        choices=ReceptionStatus.choices,
        default=ReceptionStatus.RECEIVED,
        verbose_name='حالة الاستلام',
    )
    reception_note = models.TextField(blank=True, verbose_name='ملاحظة قرار الاستلام')
    reception_decision_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='decided_food_sample_reception',
        verbose_name='مُصدِّر قرار الاستلام',
    )
    reception_decision_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت قرار الاستلام')
    rejection_reason = models.CharField(max_length=120, blank=True, verbose_name='سبب الرفض')
    reception_checklist = models.JSONField(default=dict, blank=True, verbose_name='قائمة فحص القبول')
    sector = models.ForeignKey(
        Sector,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='food_samples',
        verbose_name='القطاع',
        help_text='القطاع الإداري المرتبط بالعينة (بوابة القطاع المعملية)',
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'عينة غذائية'
        verbose_name_plural = 'العينات الغذائية'

    def __str__(self):
        return self.sample_number or self.sample_barcode

    def save(self, *args, **kwargs):
        if self.sector_id is None and self.inspection_id:
            food_inspection = FoodInspection.objects.select_related(
                'shipment__port__sector'
            ).filter(pk=self.inspection_id).first()
            if food_inspection and food_inspection.shipment and food_inspection.shipment.port_id:
                self.sector_id = food_inspection.shipment.port.sector_id
        if not self.sample_number:
            year = timezone.now().year
            prefix = (self.sector.code if self.sector else 'NAT')
            seq = FoodSample.objects.filter(
                sector=self.sector, sample_number__icontains=f'-{year}-'
            ).count() + 1
            self.sample_number = f'NQP-{prefix}-{year}-{seq:06d}'
        super().save(*args, **kwargs)


class ChainOfCustody(BaseModel):
    """سجل سلسلة حيازة العينة — كل انتقال/استلام للعينة بين الأقسام."""

    sample = models.ForeignKey(
        FoodSample, on_delete=models.CASCADE, related_name='custody_events', verbose_name='العينة'
    )
    from_department = models.CharField(max_length=120, blank=False, verbose_name='من (القسم)')
    to_department = models.CharField(max_length=120, blank=False, verbose_name='إلى (القسم)')
    transferred_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transferred_samples',
        verbose_name='الموظف الناقل',
    )
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='plus_acknowledged',
        verbose_name='الموظف المستلم',
    )
    transferred_at = models.DateTimeField(default=timezone.now, verbose_name='وقت النقل')
    received_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الاستلام')
    condition = models.CharField(max_length=200, blank=True, verbose_name='حالة العينة')
    seal_number = models.CharField(max_length=120, blank=True, verbose_name='رقم الختم')
    remarks = models.TextField(blank=True, verbose_name='ملاحظات')
    is_received = models.BooleanField(default=False, verbose_name='تم الاستلام')

    class Meta:
        ordering = ['-transferred_at']
        verbose_name = 'حدث حيازة'
        verbose_name_plural = 'سلسلة حيازة العينات'

    def __str__(self):
        return f'{self.sample.sample_number} — {self.from_department} ← {self.to_department}'


class SampleInvoice(BaseModel):
    """فاتورة رسوم تحليل عينة — بنود من معاملات التحليل مع أسعارها."""

    class PaymentStatus(models.TextChoices):
        PENDING = 'PENDING', 'معلقة'
        PAID = 'PAID', 'مدفوعة'
        EXEMPT = 'EXEMPT', 'معفاة'

    sample = models.OneToOneField(
        FoodSample, on_delete=models.CASCADE, related_name='lab_invoice', verbose_name='العينة'
    )
    invoice_number = models.CharField(max_length=50, unique=True, verbose_name='رقم الفاتورة')
    items = models.JSONField(default=list, blank=True, verbose_name='بنود الفاتورة')
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='الإجمالي')
    currency = models.CharField(max_length=10, default='SDG', verbose_name='العملة')
    status = models.CharField(
        max_length=10, choices=PaymentStatus.choices, default=PaymentStatus.PENDING, verbose_name='الحالة'
    )
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='issued_sample_invoices',
        verbose_name='مُصدِر الفاتورة',
    )
    issued_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الإصدار')
    receipt_number = models.CharField(max_length=50, blank=True, verbose_name='رقم الإيصال')
    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='collected_sample_payments',
        verbose_name='المحصل',
    )
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الدفع')
    payment_reference = models.CharField(max_length=100, blank=True, verbose_name='مرجع الدفع')
    exemption_reason = models.TextField(blank=True, verbose_name='سبب الإعفاء')
    exempted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='exempted_sample_fees',
        verbose_name='موظف الإعفاء',
    )
    exempted_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإعفاء')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'فاتورة تحليل عينة'
        verbose_name_plural = 'فواتير تحليل العينات'

    def __str__(self):
        return self.invoice_number


class LabParameter(BaseModel):
    class LabBench(models.TextChoices):
        MICROBIOLOGY = 'MICROBIOLOGY', 'الأحياء الدقيقة'
        CHEMISTRY = 'CHEMISTRY', 'الكيمياء'
        TOXICOLOGY = 'TOXICOLOGY', 'السموم'
        MOLECULAR = 'MOLECULAR', 'الجزيئي'

    code = models.CharField(max_length=50, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=200, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=200, verbose_name='الاسم بالإنجليزية')
    bench = models.CharField(
        max_length=20, choices=LabBench.choices, default=LabBench.MICROBIOLOGY, verbose_name='المختبر'
    )
    unit = models.CharField(max_length=50, blank=True, verbose_name='الوحدة')
    method = models.CharField(max_length=255, blank=True, verbose_name='الطريقة')
    reference_limit = models.CharField(max_length=100, blank=True, verbose_name='الحد المرجعي')
    detection_limit = models.CharField(max_length=100, blank=True, verbose_name='حد الكشف')
    price = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, verbose_name='سعر التحليل'
    )
    sla_min_days = models.PositiveIntegerField(default=1, verbose_name='الحد الأدنى للإنهاء (يوم)')
    sla_max_days = models.PositiveIntegerField(default=5, verbose_name='الحد الأقصى للإنهاء (يوم)')
    order = models.PositiveIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['bench', 'order', 'code']
        verbose_name = 'معامل تحليل'
        verbose_name_plural = 'معاملات التحليل'

    def __str__(self):
        return f'{self.code} - {self.name_ar}'


class SampleTest(BaseModel):
    class TestStatus(models.TextChoices):
        PENDING = 'PENDING', 'قيد الانتظار'
        IN_PROGRESS = 'IN_PROGRESS', 'قيد التنفيذ'
        DRAFT = 'DRAFT', 'مسودة'
        SUBMITTED = 'SUBMITTED', 'مُرسلة للمراجعة'
        REVIEWED = 'REVIEWED', 'راجعها رئيس القسم'
        APPROVED = 'APPROVED', 'اعتمدها مدير المختبر'
        COMPLETED = 'COMPLETED', 'مكتمل'
        RETEST = 'RETEST', 'إعادة فحص'

    RESULT_ENTERED = frozenset({
        TestStatus.SUBMITTED, TestStatus.REVIEWED, TestStatus.APPROVED, TestStatus.COMPLETED,
    })

    class Decision(models.TextChoices):
        PENDING = 'PENDING', 'غير محسوم'
        COMPLIANT = 'COMPLIANT', 'مطابق'
        NON_COMPLIANT = 'NON_COMPLIANT', 'غير مطابق'
        INCONCLUSIVE = 'INCONCLUSIVE', 'غير حاسم'
        NOT_APPLICABLE = 'NOT_APPLICABLE', 'لا ينطبق'

    sample = models.ForeignKey(
        FoodSample, on_delete=models.CASCADE, related_name='tests', verbose_name='العينة'
    )
    parameter = models.ForeignKey(
        LabParameter, on_delete=models.PROTECT, related_name='sample_tests', verbose_name='المعامل'
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_lab_tests',
        verbose_name='مسؤول التنفيذ',
    )
    status = models.CharField(
        max_length=20, choices=TestStatus.choices, default=TestStatus.PENDING, verbose_name='الحالة'
    )
    result_value = models.FloatField(null=True, blank=True, verbose_name='قيمة النتيجة')
    result_text = models.CharField(max_length=100, blank=True, verbose_name='النتيجة النصية')
    unit = models.CharField(max_length=50, blank=True, verbose_name='الوحدة')
    reference_limit = models.CharField(max_length=100, blank=True, verbose_name='الحد المرجعي')
    method_used = models.CharField(max_length=255, blank=True, verbose_name='طريقة الاختبار')
    device_used = models.CharField(max_length=255, blank=True, verbose_name='الجهاز المستخدم')
    reagent_lot = models.CharField(max_length=120, blank=True, verbose_name='رقم تشغيلة الكاشف')
    material_used = models.ForeignKey(
        'MaterialCatalog', on_delete=models.SET_NULL, null=True, blank=True, related_name='tests', verbose_name='المادة المستخدمة'
    )
    material_lot_used = models.ForeignKey(
        'MaterialLot', on_delete=models.SET_NULL, null=True, blank=True, related_name='tests', verbose_name='تشغيلة المادة المستخدمة'
    )
    solution_used = models.ForeignKey(
        'Solution', on_delete=models.SET_NULL, null=True, blank=True, related_name='tests', verbose_name='المحلول المستخدم'
    )
    decision = models.CharField(
        max_length=20, choices=Decision.choices, default=Decision.PENDING, verbose_name='القرار'
    )
    version = models.PositiveIntegerField(default=1, verbose_name='الإصدار')
    entered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='entered_food_results',
        verbose_name='مدخل النتيجة',
    )
    entered_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإدخال')
    started_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت البدء')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإنجاز')
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_lab_tests',
        verbose_name='رئيس القسم المراجِع',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت المراجعة')
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_lab_tests',
        verbose_name='مدير المختبر المُعتمِد',
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الاعتماد')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class QcStatus(models.TextChoices):
        PENDING = 'PENDING', 'بانتظار المراجعة'
        PASSED = 'PASSED', 'مطابق'
        FAILED = 'FAILED', 'غير مطابق'

    qc_status = models.CharField(
        max_length=10, choices=QcStatus.choices, default=QcStatus.PENDING, verbose_name='مراجعة الجودة'
    )
    qc_notes = models.TextField(blank=True, verbose_name='ملاحظات مراجعة الجودة')
    qc_reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='qc_reviewed_lab_tests',
        verbose_name='مراجِع الجودة',
    )
    qc_reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت مراجعة الجودة')
    micro_limit = models.ForeignKey(
        'MicrobiologicalLimit',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tests',
        verbose_name='حد المواصفة الميكروبيولوجية',
    )
    spec_snapshot = models.JSONField(default=dict, blank=True, verbose_name='لقطة المواصفة المعتمدة وقت التحليل')
    applied_standard = models.ForeignKey(
        'Standard', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='tests', verbose_name='المواصفة المطبقة',
    )
    applied_standard_version = models.ForeignKey(
        'StandardVersion', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='tests', verbose_name='نسخة المواصفة المطبقة',
    )
    applied_requirement = models.ForeignKey(
        'StandardRequirement', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='tests', verbose_name='المتطلب المطبق',
    )
    applied_method = models.ForeignKey(
        'AnalyticalMethod', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='tests', verbose_name='طريقة التحليل المطبقة',
    )
    evaluation = models.CharField(
        max_length=20,
        choices=Decision.choices,
        blank=True,
        verbose_name='التقييم الآلي',
        help_text='قرار محرك التقييم الآلي وفق المواصفة (n/c/m/M)',
    )
    evaluation_reason = models.TextField(blank=True, verbose_name='سبب التقييم الآلي')
    evaluated_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت التقييم الآلي')

    class Meta:
        ordering = ['created_at']
        verbose_name = 'فحص مخبري'
        verbose_name_plural = 'الفحوصات المخبرية'
        constraints = [
            models.UniqueConstraint(
                fields=['sample', 'parameter'], name='unique_sample_parameter_test'
            ),
        ]

    def __str__(self):
        return f'{self.sample.sample_number} - {self.parameter.code}'

    def sla_due_at(self):
        return self.created_at + timedelta(days=self.parameter.sla_max_days)

    def is_finalized(self):
        return self.status in self.RESULT_ENTERED


class SampleTestRevision(BaseModel):
    """نسخة قديمة من نتيجة محرَّرة بعد اعتمادها — لا تُحذف أبداً."""

    test = models.ForeignKey(
        SampleTest, on_delete=models.CASCADE, related_name='revisions', verbose_name='الفحص'
    )
    version = models.PositiveIntegerField(verbose_name='الإصدار السابق')
    snapshot = models.JSONField(default=dict, blank=True, verbose_name='لقطة القيم القديمة')
    reason = models.TextField(blank=True, verbose_name='سبب التعديل')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_test_revisions',
        verbose_name='مُصدِّر التعديل',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت التعديل')

    class Meta:
        ordering = ['-version']
        verbose_name = 'نسخة نتيجة'
        verbose_name_plural = 'نسخ النتائج'

    def __str__(self):
        return f'{self.test} v{self.version}'


class AnalysisCertificate(BaseModel):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'مسودة'
        ISSUED = 'ISSUED', 'صادر'

    class Decision(models.TextChoices):
        COMPLIANT = 'COMPLIANT', 'مطابق'
        NON_COMPLIANT = 'NON_COMPLIANT', 'غير مطابق'

    sample = models.OneToOneField(
        FoodSample, on_delete=models.CASCADE, related_name='certificate', verbose_name='العينة'
    )
    certificate_number = models.CharField(max_length=50, unique=True, verbose_name='رقم الشهادة')
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='issued_analysis_certificates',
        verbose_name='المُصدر',
    )
    issued_at = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ الإصدار')
    decision = models.CharField(max_length=20, choices=Decision.choices, verbose_name='القرار')
    summary = models.JSONField(default=dict, blank=True, verbose_name='ملخص النتائج')
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.DRAFT, verbose_name='الحالة'
    )

    class Meta:
        ordering = ['-issued_at']
        verbose_name = 'شهادة تحليل'
        verbose_name_plural = 'شهادات التحليل'

    def __str__(self):
        return self.certificate_number


class FoodReleaseCertificate(BaseModel):
    shipment = models.OneToOneField(
        FoodShipment, on_delete=models.CASCADE, related_name='release_certificate', verbose_name='الشحنة'
    )
    certificate_number = models.CharField(max_length=50, unique=True, verbose_name='رقم الشهادة')
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='food_certificates',
        verbose_name='المُصدر',
    )
    issue_date = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ الإصدار')
    certificate_data = models.JSONField(default=dict, blank=True, verbose_name='بيانات الشهادة')

    class Meta:
        verbose_name = 'شهادة إفراج غذائي'
        verbose_name_plural = 'شهادات الإفراج الغذائي'

    def __str__(self):
        return self.certificate_number


class FoodDecisionCertificate(BaseModel):
    class CertificateType(models.TextChoices):
        RELEASED = 'RELEASED', 'شهادة الإفراج'
        CONDITIONAL_RELEASE = 'CONDITIONAL_RELEASE', 'شهادة إفراج مشروط'
        REJECTED = 'REJECTED', 'شهادة الرفض'
        HOLD = 'HOLD', 'شهادة الحجز'
        RE_EXPORT = 'RE_EXPORT', 'شهادة إعادة التصدير'
        DESTROY = 'DESTROY', 'شهادة الإتلاف'

    class CertificateStatus(models.TextChoices):
        DRAFT = 'DRAFT', 'مسودة'
        ISSUED = 'ISSUED', 'صادرة'

    shipment = models.ForeignKey(
        FoodShipment, on_delete=models.CASCADE, related_name='decision_certificates', verbose_name='الشحنة'
    )
    certificate_number = models.CharField(max_length=50, unique=True, verbose_name='رقم الشهادة')
    certificate_type = models.CharField(
        max_length=25, choices=CertificateType.choices, verbose_name='نوع الشهادة'
    )
    status = models.CharField(
        max_length=10, choices=CertificateStatus.choices, default=CertificateStatus.ISSUED, verbose_name='الحالة'
    )
    decision = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='issued_shipment_decision_certificates',
        verbose_name='المُصدر',
    )
    issued_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الإصدار')
    reason = models.TextField(blank=True, verbose_name='السبب')
    certificate_data = models.JSONField(default=dict, blank=True, verbose_name='بيانات الشهادة')

    class Meta:
        ordering = ['-issued_at']
        verbose_name = 'شهادة قرار نهائي'
        verbose_name_plural = 'شهادات القرار النهائي'

    def __str__(self):
        return self.certificate_number


class SamplingPolicy(BaseModel):
    """سياسة أخذ العينات التلقائية حسب نوع الشحنة والوزن (أو حسب الصنف الرسمي)."""

    class ShipmentScope(models.TextChoices):
        IMPORT = 'IMPORT', 'وارد'
        EXPORT = 'EXPORT', 'صادر'
        BOTH = 'BOTH', 'كلاهما'

    class Benchmark(models.TextChoices):
        WEIGHT = 'WEIGHT', 'بالوزن'
        PACKAGES = 'PACKAGES', 'بعدد العبوات'

    class RiskGroup(models.TextChoices):
        R1 = 'R1', 'المجموعة الأولى (خطورة عالية — 100%)'
        R2 = 'R2', 'المجموعة الثانية (خطورة متوسطة — 75%)'
        R3 = 'R3', 'المجموعة الثالثة (خطورة منخفضة — 25%)'

    name_ar = models.CharField(max_length=200, verbose_name='الاسم')
    scope = models.CharField(
        max_length=20, choices=ShipmentScope.choices, default=ShipmentScope.BOTH, verbose_name='نطاق الشحنة'
    )
    benchmark = models.CharField(
        max_length=20, choices=Benchmark.choices, default=Benchmark.WEIGHT, verbose_name='الأساس'
    )
    threshold = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name='الحد الأدنى')
    samples_per_unit = models.DecimalField(max_digits=10, decimal_places=2, default=1, verbose_name='عدد عينات لكل وحدة')
    max_samples = models.PositiveIntegerField(default=5, verbose_name='الحد الأقصى للعينات')
    default_reason = models.CharField(
        max_length=20, choices=FoodSample.SamplingReason.choices,
        default=FoodSample.SamplingReason.ROUTINE, verbose_name='السبب الافتراضي',
    )

    product_key = models.CharField(max_length=300, blank=True, verbose_name='اسم الصنف (للمطابقة الرسمية)')
    package_size = models.CharField(max_length=100, blank=True, verbose_name='حجم العبوة')
    risk_group = models.CharField(
        max_length=2, choices=RiskGroup.choices, blank=True, verbose_name='مجموعة المخاطر'
    )
    rate_pct = models.PositiveIntegerField(default=0, verbose_name='نسبة سحب الرسائل (100/75/25)')
    quantity = models.CharField(max_length=30, blank=True, verbose_name='كمية العينة (نص)')
    quantity_num = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, verbose_name='عدد وحدات العينة')
    sampling_conditions = models.TextField(blank=True, verbose_name='شروط السحب')

    order = models.PositiveIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['order', 'threshold']
        verbose_name = 'سياسة عينات'
        verbose_name_plural = 'سياسات العينات'

    def __str__(self):
        return self.name_ar


class FoodProduct(BaseModel):
    """صنف رقابة الأغذية (من القائمة الرسمية للأصناف) — مصدر الحقيقة للمنتجات."""

    code = models.CharField(max_length=40, blank=True, default='', verbose_name='الكود')
    name_ar = models.CharField(max_length=300, unique=True, verbose_name='اسم الصنف')
    name_en = models.CharField(max_length=200, blank=True, verbose_name='الاسم بالإنجليزية')
    category = models.CharField(max_length=200, blank=True, verbose_name='التصنيف الرئيسي')
    subcategory = models.CharField(max_length=200, blank=True, verbose_name='التصنيف الفرعي')
    risk_group = models.CharField(
        max_length=2, choices=SamplingPolicy.RiskGroup.choices,
        blank=True, verbose_name='مجموعة المخاطر',
    )
    reference_quantity = models.CharField(max_length=30, blank=True, verbose_name='كمية العينة المرجعية')
    micro_category = models.ForeignKey(
        'ProductCategory', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='products', verbose_name='الفئة الميكروبيولوجية',
    )
    order = models.PositiveIntegerField(default=0, verbose_name='الترتيب')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['category', 'name_ar']
        verbose_name = 'صنف (سجل)'
        verbose_name_plural = 'قائمة الأصناف'

    def __str__(self):
        return self.name_ar


class ClearingAgent(BaseModel):
    """مخلّص جمركي (سجل)."""

    code = models.CharField(max_length=50, blank=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=255, verbose_name='الاسم')
    license_no = models.CharField(max_length=100, blank=True, verbose_name='رقم الترخيص')
    contact = models.CharField(max_length=255, blank=True, verbose_name='بيانات الاتصال')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['name_ar']
        verbose_name = 'مخلّص جمركي (سجل)'
        verbose_name_plural = 'قائمة المخلّصين'

    def __str__(self):
        return self.name_ar


class Supplier(BaseModel):
    """مورّد (سجل)."""

    code = models.CharField(max_length=50, blank=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=255, verbose_name='الاسم')
    contact = models.CharField(max_length=255, blank=True, verbose_name='بيانات الاتصال')
    country = models.ForeignKey(
        'travelers.Country', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='food_suppliers', verbose_name='الدولة',
    )
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['name_ar']
        verbose_name = 'مورّد (سجل)'
        verbose_name_plural = 'قائمة المورّدين'

    def __str__(self):
        return self.name_ar


class Exporter(BaseModel):
    """مصدّر (سجل)."""

    code = models.CharField(max_length=50, blank=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=255, verbose_name='الاسم')
    contact = models.CharField(max_length=255, blank=True, verbose_name='بيانات الاتصال')
    country = models.ForeignKey(
        'travelers.Country', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='food_exporters', verbose_name='الدولة',
    )
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['name_ar']
        verbose_name = 'مصدّر (سجل)'
        verbose_name_plural = 'قائمة المصدّرين'

    def __str__(self):
        return self.name_ar


class Brand(BaseModel):
    """ماركة منتج (سجل)."""

    code = models.CharField(max_length=50, blank=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=255, verbose_name='الاسم')
    manufacturer = models.CharField(max_length=255, blank=True, verbose_name='الشركة المصنّعة')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['name_ar']
        verbose_name = 'ماركة (سجل)'
        verbose_name_plural = 'قائمة الماركات'

    def __str__(self):
        return self.name_ar


class Conveyance(BaseModel):
    """وِعاء/وسيلة نقل الشحنة (سجل المواعين)."""

    class ConveyanceType(models.TextChoices):
        SHIP = 'SHIP', 'باخرة'
        TRUCK = 'TRUCK', 'شاحنة'
        REFRIGERATED_TRUCK = 'REFRIGERATED_TRUCK', 'براد'
        RAILCART = 'RAILCART', 'عربة قطار'
        PLANE = 'PLANE', 'طائرة شحن'
        CONTAINER = 'CONTAINER', 'حاوية'
        TANKER = 'TANKER', 'تنكر'
        OTHER = 'OTHER', 'أخرى'

    name = models.CharField(max_length=255, verbose_name='الاسم/الوصف')
    conveyance_type = models.CharField(
        max_length=25, choices=ConveyanceType.choices, default=ConveyanceType.OTHER, verbose_name='النوع'
    )
    registration_no = models.CharField(max_length=100, blank=True, verbose_name='رقم التسجيل')
    capacity = models.CharField(max_length=100, blank=True, verbose_name='السعة')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['conveyance_type', 'name']
        verbose_name = 'وِعاء (سجل)'
        verbose_name_plural = 'قائمة المواعين'

    def __str__(self):
        return f'{self.name} ({self.get_conveyance_type_display()})'


class PackageType(BaseModel):
    """نوع العبوة (قائمة مرجعية)."""

    order = models.PositiveIntegerField(default=0, verbose_name='الترتيب')
    name_ar = models.CharField(max_length=100, unique=True, verbose_name='نوع العبوة')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['order']
        verbose_name = 'نوع عبوة'
        verbose_name_plural = 'أنواع العبوات'

    def __str__(self):
        return self.name_ar


# ============================================================
#  النظام الوطني للمواصفات الميكروبيولوجية (National Microbiological Standards)
#  Single Source of Truth: Product → Category → Specification → Version → Limit (n/c/m/M)
#  → Test → Unit Results → Automatic Evaluation → Compliance Decision
# ============================================================


class Microorganism(BaseModel):
    """كتالوج الكائنات الدقيقة — Salmonella، E.coli، الخ."""

    class DetectionType(models.TextChoices):
        PRESENCE_ABSENCE = 'PRESENCE_ABSENCE', 'حضور/غياب'
        QUANTITATIVE = 'QUANTITATIVE', 'كمّي'

    code = models.CharField(max_length=40, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=150, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=150, blank=True, verbose_name='الاسم بالإنجليزية')
    scientific_name = models.CharField(max_length=200, blank=True, verbose_name='الاسم العلمي')
    category = models.CharField(max_length=100, blank=True, verbose_name='التصنيف')
    detection_type = models.CharField(
        max_length=20, choices=DetectionType.choices, default=DetectionType.QUANTITATIVE,
        verbose_name='نوع الكشف',
    )
    default_unit = models.CharField(max_length=40, blank=True, verbose_name='الوحدة الافتراضية')
    order = models.PositiveIntegerField(default=0, verbose_name='الترتيب')
    active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['order', 'code']
        verbose_name = 'كائن دقيق'
        verbose_name_plural = 'الكائنات الدقيقة'

    def __str__(self):
        return f'{self.code} - {self.name_ar}'


class ProductCategory(BaseModel):
    """فئة الغذاء (ألبان، لحوم، أغذية جافة، ...)."""

    code = models.CharField(max_length=40, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=150, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=150, blank=True, verbose_name='الاسم بالإنجليزية')
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children',
        verbose_name='الفئة الأم',
    )
    description = models.TextField(blank=True, verbose_name='الوصف')
    order = models.PositiveIntegerField(default=0, verbose_name='الترتيب')
    active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['order', 'code']
        verbose_name = 'فئة غذائية'
        verbose_name_plural = 'الفئات الغذائية'

    def __str__(self):
        return f'{self.code} - {self.name_ar}'


class TestMethod(BaseModel):
    """طريقة اختبار معتمدة — المرجع القياسي، حد الكشف، وحدود الكمّية."""

    code = models.CharField(max_length=40, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=150, verbose_name='الاسم بالعربية')
    name_en = models.CharField(max_length=150, blank=True, verbose_name='الاسم بالإنجليزية')
    reference_standard = models.CharField(max_length=200, blank=True, verbose_name='المرجع القياسي')
    detection_limit = models.CharField(max_length=100, blank=True, verbose_name='حد الكشف')
    unit = models.CharField(max_length=40, blank=True, verbose_name='الوحدة')
    sample_quantity = models.CharField(max_length=100, blank=True, verbose_name='كمية العينة')
    incubation_parameters = models.CharField(max_length=255, blank=True, verbose_name='شروط الحضانة/المعالجة')
    active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['code']
        verbose_name = 'طريقة اختبار'
        verbose_name_plural = 'طرق الاختبار'

    def __str__(self):
        return f'{self.code} - {self.name_ar}'


class MicrobiologicalSpecification(BaseModel):
    """مواصفة الحدود الميكروبيولوجية — كتالوج مركزي قابل للتحكم بالإصدارات."""

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'مسودة'
        ACTIVE = 'ACTIVE', 'فعالة'
        ARCHIVED = 'ARCHIVED', 'مؤرشفة'

    code = models.CharField(max_length=40, unique=True, verbose_name='رمز المواصفة')
    name_ar = models.CharField(max_length=200, verbose_name='اسم المواصفة')
    name_en = models.CharField(max_length=200, blank=True, verbose_name='الاسم بالإنجليزية')
    product_category = models.ForeignKey(
        ProductCategory, on_delete=models.PROTECT, related_name='specifications',
        null=True, blank=True, verbose_name='فئة الغذاء',
    )
    product = models.ForeignKey(
        FoodProduct, on_delete=models.PROTECT, related_name='specifications',
        null=True, blank=True, verbose_name='المنتج',
    )
    reference = models.TextField(blank=True, verbose_name='المرجع التشريعي/الفني')
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.DRAFT, verbose_name='الحالة'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_micro_specs', verbose_name='المُعتمِد',
    )
    approval_date = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ الاعتماد')

    class Meta:
        ordering = ['code']
        verbose_name = 'مواصفة ميكروبيولوجية'
        verbose_name_plural = 'المواصفات الميكروبيولوجية'

    def __str__(self):
        return f'{self.code} - {self.name_ar}'

    def applicable_version(self, at=None):
        """الإصدار الساري في تاريخ معين (افتراضياً الآن)."""
        at = at or timezone.now().date()
        version = (
            self.versions.filter(effective_from__lte=at)
            .filter(models.Q(effective_to__isnull=True) | models.Q(effective_to__gte=at))
            .order_by('-version')
            .first()
        )
        return version


class SpecificationVersion(BaseModel):
    """نسخة من المواصفة — تُحفظ النُسَخ ولا تُعدَّل (تثبيت المرجع الزمني)."""

    specification = models.ForeignKey(
        MicrobiologicalSpecification, on_delete=models.CASCADE, related_name='versions',
        verbose_name='المواصفة',
    )
    version = models.PositiveIntegerField(verbose_name='رقم الإصدار')
    effective_from = models.DateField(verbose_name='تاريخ السريان')
    effective_to = models.DateField(null=True, blank=True, verbose_name='تاريخ الانتهاء')
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_spec_versions', verbose_name='المُعتمِد',
    )
    approval_date = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ الاعتماد')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-version']
        constraints = [
            models.UniqueConstraint(fields=['specification', 'version'], name='unique_spec_version'),
        ]
        verbose_name = 'نسخة مواصفة'
        verbose_name_plural = 'نسخ المواصفات'

    def __str__(self):
        return f'{self.specification.code} v{self.version}'

    def label(self):
        return f'{self.specification.name_ar} — الإصدار {self.version} (سارٍ من {self.effective_from})'


class MicrobiologicalLimit(BaseModel):
    """حدود n/c/m/M لكائن دقيق وطريقة ضمن نسخة مواصفة — قابلة للتهيئة عبر rule_json."""

    class Plan(models.TextChoices):
        TWO_CLASS = 'TWO_CLASS', 'خطة من فئتين (2-Class)'
        THREE_CLASS = 'THREE_CLASS', 'خطة من ثلاث فئات (3-Class)'
        PRESENCE_ABSENCE = 'PRESENCE_ABSENCE', 'حضور/غياب'

    version = models.ForeignKey(
        SpecificationVersion, on_delete=models.CASCADE, related_name='limits', verbose_name='نسخة المواصفة'
    )
    microorganism = models.ForeignKey(
        Microorganism, on_delete=models.PROTECT, related_name='limits', verbose_name='الكائن الدقيق'
    )
    test_method = models.ForeignKey(
        TestMethod, on_delete=models.PROTECT, related_name='limits',
        null=True, blank=True, verbose_name='طريقة الاختبار',
    )
    unit = models.CharField(max_length=40, blank=True, verbose_name='وحدة القياس')
    n = models.PositiveIntegerField(default=5, verbose_name='n — عدد وحدات العينة')
    c = models.PositiveIntegerField(default=0, verbose_name='c — الحد الأقصى للوحدات بين m و M')
    m = models.DecimalField(
        max_digits=20, decimal_places=6, null=True, blank=True,
        db_column='m_limit', verbose_name='m — الحد المقبول'
    )
    M = models.DecimalField(
        max_digits=20, decimal_places=6, null=True, blank=True,
        db_column='Mmax', verbose_name='M — الحد الأقصى'
    )
    plan = models.CharField(
        max_length=20, choices=Plan.choices, default=Plan.THREE_CLASS, verbose_name='نوع الخطة'
    )
    rule_json = models.JSONField(default=dict, blank=True, verbose_name='قواعد قابلة للتهيئة')
    active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['-version__version', 'microorganism__code']
        verbose_name = 'حد ميكروبيولوجي'
        verbose_name_plural = 'الحدود الميكروبيولوجية'

    def __str__(self):
        return f'{self.version} — {self.microorganism.code} (n={self.n}, c={self.c}, m={self.m}, M={self.M})'

    def rule(self):
        """قاعدة التقييم: خطة + عوامل المقارنة، قابلة للتهيئة عبر rule_json."""
        defaults = {
            'plan': self.plan,
            'm_op': 'gt',   # القيمة تعتبر «بين m و M» إذا كانت > m
            'M_op': 'gt',   # القيمة تعتبر «فوق M» إذا كانت > M
        }
        return {**defaults, **self.rule_json}


class SampleUnitResult(BaseModel):
    """نتيجة وحدة عينة واحدة ضمن خطة أخذ العينات (وحدات n)."""

    class Qualifier(models.TextChoices):
        POSITIVE = 'POSITIVE', 'موجبة'
        NEGATIVE = 'NEGATIVE', 'سالبة'
        TENTATIVE = 'TENTATIVE', 'مشكوك فيها'

    test = models.ForeignKey(
        SampleTest, on_delete=models.CASCADE, related_name='unit_results', verbose_name='الفحص'
    )
    unit_number = models.PositiveIntegerField(verbose_name='رقم الوحدة')
    result_value = models.DecimalField(
        max_digits=20, decimal_places=6, null=True, blank=True, verbose_name='القيمة'
    )
    qualifier = models.CharField(
        max_length=20, choices=Qualifier.choices, blank=True, verbose_name='النوعية'
    )
    result_unit = models.CharField(max_length=40, blank=True, verbose_name='الوحدة')
    entered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='entered_unit_results', verbose_name='المُدخل',
    )
    entered_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الإدخال')

    class Meta:
        ordering = ['unit_number']
        constraints = [
            models.UniqueConstraint(fields=['test', 'unit_number'], name='unique_test_unit'),
        ]
        verbose_name = 'نتيجة وحدة عينة'
        verbose_name_plural = 'نتائج وحدات العينة'

    def __str__(self):
        value = self.qualifier or self.result_value or '—'
        return f'{self.test} — الوحدة {self.unit_number}: {value}'


class ResultEvaluation(BaseModel):
    """سجل تدقيق دائم لقرار التقييم الآلي وفق المواصفة السارية."""

    class Decision(models.TextChoices):
        COMPLIANT = 'COMPLIANT', 'مطابق'
        NON_COMPLIANT = 'NON_COMPLIANT', 'غير مطابق'
        INCONCLUSIVE = 'INCONCLUSIVE', 'غير حاسم'

    test = models.ForeignKey(
        SampleTest, on_delete=models.CASCADE, related_name='evaluations', verbose_name='الفحص'
    )
    limit = models.ForeignKey(
        MicrobiologicalLimit, on_delete=models.PROTECT, related_name='evaluations',
        null=True, blank=True, verbose_name='الحد المطبق',
    )
    spec_version = models.ForeignKey(
        SpecificationVersion, on_delete=models.PROTECT, related_name='evaluations',
        null=True, blank=True, verbose_name='نسخة المواصفة المطبقة',
    )
    decision = models.CharField(
        max_length=20, choices=Decision.choices, verbose_name='القرار'
    )
    reason = models.TextField(blank=True, verbose_name='السبب')
    details = models.JSONField(default=dict, blank=True, verbose_name='تفاصيل التقييم')
    engine_version = models.CharField(max_length=40, blank=True, verbose_name='نسخة المحرك')
    evaluated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='ran_micro_evaluations', verbose_name='مُنفّذ التقييم',
    )
    evaluated_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت التقييم')

    class Meta:
        ordering = ['-evaluated_at']
        verbose_name = 'تقييم آلي'
        verbose_name_plural = 'التقييمات الآلية'

    def __str__(self):
        return f'{self.test} — {self.decision}'


class LabEquipment(BaseModel):
    """جهاز معملي داخل قسم المختبر — مراقبة الجاهزية والمعايرة."""

    class EquipmentStatus(models.TextChoices):
        OPERATIONAL = 'OPERATIONAL', 'تشغيلية'
        UNDER_MAINTENANCE = 'UNDER_MAINTENANCE', 'قيد الصيانة'
        OUT_OF_SERVICE = 'OUT_OF_SERVICE', 'خارج الخدمة'

    name_ar = models.CharField(max_length=255, verbose_name='اسم الجهاز (عربي)')
    name_en = models.CharField(max_length=255, blank=True, verbose_name='اسم الجهاز (إنجليزي)')
    model_number = models.CharField(max_length=120, blank=True, verbose_name='رقم الموديل')
    bench = models.CharField(
        max_length=20,
        choices=FoodSample.LabBench.choices,
        default=FoodSample.LabBench.CHEMISTRY,
        verbose_name='قسم المختبر',
    )
    status = models.CharField(
        max_length=20, choices=EquipmentStatus.choices, default=EquipmentStatus.OPERATIONAL, verbose_name='الحالة'
    )
    last_calibrated = models.DateField(null=True, blank=True, verbose_name='آخر معايرة')
    next_calibration_due = models.DateField(null=True, blank=True, verbose_name='موعد المعايرة القادم')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registered_lab_equipment',
        verbose_name='مُسجِّل الجهاز',
    )

    class Meta:
        ordering = ['bench', 'name_ar']
        verbose_name = 'جهاز معملي'
        verbose_name_plural = 'الأجهزة المختبرية'

    def __str__(self):
        return self.name_ar

    @property
    def calibration_overdue(self):
        if not self.next_calibration_due:
            return False
        return self.next_calibration_due < timezone.now().date()


class QCRecord(BaseModel):
    """سجل مراجعة الجودة (QC) لكل دفعة/فحص — يرصد مطابقة العمل للضوابط."""

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'قيد المراجعة'
        PASSED = 'PASSED', 'مطابق'
        FAILED = 'FAILED', 'غير مطابق'

    class Severity(models.TextChoices):
        MINOR = 'MINOR', 'طفيف'
        MAJOR = 'MAJOR', 'جوهري'
        CRITICAL = 'CRITICAL', 'حرج'

    qc_number = models.CharField(max_length=60, unique=True, blank=True, verbose_name='رقم سجل الجودة')
    bench = models.CharField(
        max_length=20,
        choices=FoodSample.LabBench.choices,
        default=FoodSample.LabBench.MICROBIOLOGY,
        verbose_name='القسم',
    )
    test = models.ForeignKey(
        SampleTest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='qc_records',
        verbose_name='الفحص المرتبط',
    )
    control_type = models.CharField(max_length=120, verbose_name='نوع الضابط/العينة الضابطة')
    lot_number = models.CharField(max_length=120, blank=True, verbose_name='رقم التشغيلة')
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING, verbose_name='الحالة')
    severity = models.CharField(
        max_length=10, choices=Severity.choices, default=Severity.MINOR, verbose_name='الخطورة'
    )
    result_value = models.FloatField(null=True, blank=True, verbose_name='قيمة نتيجة الضابط')
    expected_value = models.FloatField(null=True, blank=True, verbose_name='القيمة المتوقعة')
    tolerance = models.FloatField(null=True, blank=True, verbose_name='حد التسامح')
    qc_notes = models.TextField(blank=True, verbose_name='ملاحظات')
    affected_tests = models.ManyToManyField(
        SampleTest, blank=True, related_name='affected_qc_records', verbose_name='النتائج المتأثرة'
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='qc_records_reviewed',
        verbose_name='مراجِع الجودة',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت المراجعة')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'سجل مراجعة الجودة'
        verbose_name_plural = 'سجلات مراجعة الجودة (QC)'

    def __str__(self):
        return self.qc_number or str(self.id)

    def save(self, *args, **kwargs):
        if not self.qc_number:
            self.qc_number = f'QC-{timezone.now().year}-{uuid.uuid4().hex[:4].upper()}'
        super().save(*args, **kwargs)


class Reagent(BaseModel):
    """كاشف/وسط مخبري — مراقبة الصلاحية والكمية وعدم استخدام المنتهي (نموذج قديم يُحتفظ به للتوافق)."""

    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'متوفر'
        LOW = 'LOW', 'كمية منخفضة'
        EXPIRED = 'EXPIRED', 'منتهي الصلاحية'
        DISPOSED = 'DISPOSED', 'تم التخلص'

    name_ar = models.CharField(max_length=255, verbose_name='اسم الكاشف (عربي)')
    name_en = models.CharField(max_length=255, blank=True, verbose_name='اسم الكاشف (إنجليزي)')
    bench = models.CharField(
        max_length=20,
        choices=FoodSample.LabBench.choices,
        default=FoodSample.LabBench.MICROBIOLOGY,
        verbose_name='القسم',
    )
    lot_number = models.CharField(max_length=120, blank=True, verbose_name='رقم التشغيلة')
    expiry_date = models.DateField(null=True, blank=True, verbose_name='تاريخ انتهاء الصلاحية')
    quantity = models.PositiveIntegerField(default=0, verbose_name='الكمية المتاحة')
    unit = models.CharField(max_length=40, blank=True, verbose_name='الوحدة')
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.AVAILABLE, verbose_name='الحالة'
    )
    supplier = models.CharField(max_length=255, blank=True, verbose_name='المورد')
    certificate_ref = models.CharField(max_length=120, blank=True, verbose_name='مرجع شهادة التحليل')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['name_ar']
        verbose_name = 'كاشف'
        verbose_name_plural = 'الكوافش'

    def __str__(self):
        return self.name_ar

    @property
    def is_expired(self):
        return bool(self.expiry_date and self.expiry_date < timezone.now().date())


class StorageLocation(BaseModel):
    """موقع تخزين — تسلسل هرمي: مخزن → غرفة → خزانة → رف."""

    class LocationType(models.TextChoices):
        STORE = 'STORE', 'مخزن'
        ROOM = 'ROOM', 'غرفة'
        CABINET = 'CABINET', 'خزانة'
        SHELF = 'SHELF', 'رف'

    name = models.CharField(max_length=255, verbose_name='الاسم')
    location_type = models.CharField(max_length=20, choices=LocationType.choices, default=LocationType.ROOM, verbose_name='النوع')
    parent = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True, related_name='children', verbose_name='الموقع الأب'
    )
    temperature = models.CharField(max_length=80, blank=True, verbose_name='درجة الحرارة')
    humidity = models.CharField(max_length=80, blank=True, verbose_name='الرطوبة')
    light_protection = models.BooleanField(default=False, verbose_name='حماية من الضوء')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['location_type', 'name']
        verbose_name = 'موقع تخزين'
        verbose_name_plural = 'مواقع التخزين'

    def __str__(self):
        return f'{self.get_location_type_display()} — {self.name}'


class MaterialCatalog(BaseModel):
    """كتالوج المواد — كاشف/محلول/مادة قياسية/وسط زرعي/كيميائية/مستهلك/مادة مرجعية معتمدة."""

    class MaterialType(models.TextChoices):
        REAGENT = 'REAGENT', 'كاشف'
        SOLUTION = 'SOLUTION', 'محلول'
        REFERENCE_STANDARD = 'REFERENCE_STANDARD', 'مادة قياسية مرجعية'
        CULTURE_MEDIA = 'CULTURE_MEDIA', 'وسط زرعي'
        CHEMICAL = 'CHEMICAL', 'مادة كيميائية'
        CONSUMABLE = 'CONSUMABLE', 'مستهلك'
        CRM = 'CRM', 'مادة مرجعية معتمدة'

    class Grade(models.TextChoices):
        ANALYTICAL = 'ANALYTICAL', 'درجة تحليلية'
        HPLC = 'HPLC', 'HPLC'
        REAGENT_GRADE = 'REAGENT_GRADE', 'درجة كاشف'
        TECHNICAL = 'TECHNICAL', 'درجة تقنية'
        PHARMACEUTICAL = 'PHARMACEUTICAL', 'درجة دوائية'
        MICROBIOLOGICAL = 'MICROBIOLOGICAL', 'درجة ميكروبيولوجية'
        OTHER = 'OTHER', 'أخرى'

    class HazardClass(models.TextChoices):
        NONE = 'NONE', 'غير خطرة'
        TOXIC = 'TOXIC', 'سامة'
        CORROSIVE = 'CORROSIVE', 'آكلة'
        FLAMMABLE = 'FLAMMABLE', 'قابلة للاشتعال'
        OXIDIZER = 'OXIDIZER', 'مؤكسدة'
        IRRITANT = 'IRRITANT', 'مهيجة'
        OTHER = 'OTHER', 'أخرى'

    name_ar = models.CharField(max_length=255, verbose_name='اسم المادة (عربي)')
    name_en = models.CharField(max_length=255, blank=True, verbose_name='اسم المادة (إنجليزي)')
    material_type = models.CharField(max_length=30, choices=MaterialType.choices, default=MaterialType.REAGENT, verbose_name='نوع المادة')
    bench = models.CharField(
        max_length=20,
        choices=FoodSample.LabBench.choices,
        default=FoodSample.LabBench.CHEMISTRY,
        verbose_name='القسم',
    )
    manufacturer = models.CharField(max_length=255, blank=True, verbose_name='الشركة المصنعة')
    catalog_number = models.CharField(max_length=120, blank=True, verbose_name='رقم الكتالوج')
    cas_number = models.CharField(max_length=60, blank=True, verbose_name='رقم CAS')
    grade = models.CharField(max_length=20, choices=Grade.choices, default=Grade.ANALYTICAL, verbose_name='الدرجة')
    unit = models.CharField(max_length=40, default='g', verbose_name='وحدة القياس')
    min_stock = models.FloatField(default=0, verbose_name='الحد الأدنى للمخزون')
    reorder_level = models.FloatField(default=0, verbose_name='مستوى إعادة الطلب')
    max_stock = models.FloatField(default=0, verbose_name='الحد الأقصى للمخزون')
    hazard_class = models.CharField(max_length=20, choices=HazardClass.choices, default=HazardClass.NONE, verbose_name='تصنيف الخطر')
    default_storage = models.ForeignKey(
        StorageLocation, on_delete=models.SET_NULL, null=True, blank=True, related_name='materials', verbose_name='موقع التخزين الافتراضي'
    )
    notes = models.TextField(blank=True, verbose_name='ملاحظات')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_materials', verbose_name='مُسجِّل المادة'
    )

    class Meta:
        ordering = ['name_ar']
        verbose_name = 'مادة'
        verbose_name_plural = 'كتالوج المواد'

    def __str__(self):
        return self.name_ar


class MaterialLot(BaseModel):
    """تشغيلة/شحنة كاشف — الأهم وظيفياً: كل عبء له صلاحية وكمية وحالة."""

    class LotStatus(models.TextChoices):
        VALID = 'VALID', 'صالح'
        EXPIRING_SOON = 'EXPIRING_SOON', 'ينتهي قريباً'
        EXPIRED = 'EXPIRED', 'منتهي'
        BLOCKED = 'BLOCKED', 'محظور'
        DISPOSED = 'DISPOSED', 'تم التخلص'

    material = models.ForeignKey(MaterialCatalog, on_delete=models.CASCADE, related_name='lots', verbose_name='المادة')
    lot_number = models.CharField(max_length=120, verbose_name='رقم التشغيلة')
    batch_number = models.CharField(max_length=120, blank=True, verbose_name='رقم الدفعة')
    manufacturing_date = models.DateField(null=True, blank=True, verbose_name='تاريخ التصنيع')
    expiry_date = models.DateField(null=True, blank=True, verbose_name='تاريخ انتهاء الصلاحية')
    quantity = models.FloatField(default=0, verbose_name='الكمية المتاحة')
    unit = models.CharField(max_length=40, blank=True, verbose_name='الوحدة')
    storage = models.ForeignKey(
        StorageLocation, on_delete=models.SET_NULL, null=True, blank=True, related_name='lots', verbose_name='موقع التخزين'
    )
    supplier = models.CharField(max_length=255, blank=True, verbose_name='المورد')
    certificate_ref = models.CharField(max_length=120, blank=True, verbose_name='مرجع شهادة التحليل')
    received_date = models.DateField(null=True, blank=True, verbose_name='تاريخ الاستلام')
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='received_material_lots', verbose_name='المستلِم'
    )
    status = models.CharField(max_length=20, choices=LotStatus.choices, default=LotStatus.VALID, verbose_name='الحالة')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['expiry_date']
        verbose_name = 'تشغيلة مادة'
        verbose_name_plural = 'تشغيلات المواد'

    def __str__(self):
        return f'{self.material.name_ar} — {self.lot_number}'

    @property
    def is_expired(self):
        return bool(self.expiry_date and self.expiry_date < timezone.now().date())

    @property
    def days_to_expiry(self):
        if not self.expiry_date:
            return None
        return (self.expiry_date - timezone.now().date()).days

    def compute_status(self):
        today = timezone.now().date()
        if self.status in (self.LotStatus.DISPOSED, self.LotStatus.BLOCKED):
            return
        if self.expiry_date and self.expiry_date < today:
            self.status = self.LotStatus.EXPIRED
        elif self.expiry_date and self.expiry_date <= today + timedelta(days=30):
            self.status = self.LotStatus.EXPIRING_SOON
        else:
            self.status = self.LotStatus.VALID

    def save(self, *args, **kwargs):
        self.compute_status()
        super().save(*args, **kwargs)


class Solution(BaseModel):
    """محلول معملي — تحضير وتحقق، لا يُعتمد مباشرة بعد التحضير."""

    class SolutionStatus(models.TextChoices):
        PREPARED = 'PREPARED', 'مُحضَّر'
        PENDING_VERIFICATION = 'PENDING_VERIFICATION', 'بانتظار التحقق'
        APPROVED = 'APPROVED', 'معتمد'
        REJECTED = 'REJECTED', 'مرفوض'
        EXPIRED = 'EXPIRED', 'منتهي'
        DISPOSED = 'DISPOSED', 'تم التخلص'

    name = models.CharField(max_length=255, verbose_name='اسم المحلول')
    material = models.ForeignKey(
        MaterialCatalog, on_delete=models.PROTECT, related_name='solutions', verbose_name='المادة الأساسية', null=True, blank=True
    )
    concentration = models.CharField(max_length=60, blank=True, verbose_name='التركيز')
    solvent = models.CharField(max_length=120, blank=True, verbose_name='المذيب')
    final_volume = models.FloatField(null=True, blank=True, verbose_name='الحجم النهائي')
    volume_unit = models.CharField(max_length=20, default='mL', verbose_name='وحدة الحجم')
    source_lot = models.ForeignKey(
        MaterialLot, on_delete=models.SET_NULL, null=True, blank=True, related_name='solutions', verbose_name='المادة المصدرية'
    )
    batch_number = models.CharField(max_length=120, blank=True, verbose_name='رقم الدفعة')
    preparation_date = models.DateField(verbose_name='تاريخ التحضير')
    expiry_date = models.DateField(null=True, blank=True, verbose_name='تاريخ انتهاء الصلاحية')
    prepared_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='prepared_solutions', verbose_name='المُحضِّر'
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_solutions', verbose_name='المراجِع'
    )
    verified_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت التحقق')
    verified_notes = models.TextField(blank=True, verbose_name='ملاحظات التحقق')
    storage = models.ForeignKey(
        StorageLocation, on_delete=models.SET_NULL, null=True, blank=True, related_name='solutions', verbose_name='موقع التخزين'
    )
    status = models.CharField(max_length=25, choices=SolutionStatus.choices, default=SolutionStatus.PREPARED, verbose_name='الحالة')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-preparation_date']
        verbose_name = 'محلول'
        verbose_name_plural = 'المحاليل'

    def __str__(self):
        return f'{self.name} — {self.batch_number or ""}'

    @property
    def is_expired(self):
        return bool(self.expiry_date and self.expiry_date < timezone.now().date())


class MaterialIssue(BaseModel):
    """صرف/استهلاك مادة — صرف للمحلل مرتبط بالعينة والفحص والطريقة."""

    class IssueType(models.TextChoices):
        ISSUE = 'ISSUE', 'صرف'
        CONSUMPTION = 'CONSUMPTION', 'استهلاك'
        RETURN = 'RETURN', 'إرجاع'

    material = models.ForeignKey(MaterialCatalog, on_delete=models.CASCADE, related_name='issues', verbose_name='المادة')
    lot = models.ForeignKey(MaterialLot, on_delete=models.SET_NULL, null=True, blank=True, related_name='issues', verbose_name='التشغيلة')
    solution = models.ForeignKey(Solution, on_delete=models.SET_NULL, null=True, blank=True, related_name='issues', verbose_name='المحلول')
    test = models.ForeignKey(
        SampleTest, on_delete=models.SET_NULL, null=True, blank=True, related_name='material_issues', verbose_name='الفحص المرتبط'
    )
    sample = models.ForeignKey(
        FoodSample, on_delete=models.SET_NULL, null=True, blank=True, related_name='material_issues', verbose_name='العينة'
    )
    issue_type = models.CharField(max_length=15, choices=IssueType.choices, default=IssueType.ISSUE, verbose_name='النوع')
    quantity_used = models.FloatField(default=0, verbose_name='الكمية')
    unit = models.CharField(max_length=40, blank=True, verbose_name='الوحدة')
    purpose = models.CharField(max_length=255, blank=True, verbose_name='الغرض')
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='issued_materials', verbose_name='المصروف بواسطة'
    )
    issued_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الصرف')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-issued_at']
        verbose_name = 'صرف مادة'
        verbose_name_plural = 'صرف المواد والاستهلاك'

    def __str__(self):
        return f'{self.material.name_ar} — {self.quantity_used} {self.unit}'

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new and self.lot and self.issue_type in (MaterialIssue.IssueType.ISSUE, MaterialIssue.IssueType.CONSUMPTION):
            self.lot.quantity = max(0, (self.lot.quantity or 0) - self.quantity_used)
            self.lot.save(update_fields=['quantity', 'updated_at'])


class DisposalRequest(BaseModel):
    """طلب التخلص من مادة — لا حذف مباشر: طلب → اعتماد → تخلص."""

    class DisposalStatus(models.TextChoices):
        PENDING = 'PENDING', 'بانتظار الاعتماد'
        APPROVED = 'APPROVED', 'معتمد'
        DISPOSED = 'DISPOSED', 'تم التخلص'
        REJECTED = 'REJECTED', 'مرفوض'

    material = models.ForeignKey(MaterialCatalog, on_delete=models.CASCADE, related_name='disposals', verbose_name='المادة')
    lot = models.ForeignKey(MaterialLot, on_delete=models.SET_NULL, null=True, blank=True, related_name='disposals', verbose_name='التشغيلة')
    solution = models.ForeignKey(Solution, on_delete=models.SET_NULL, null=True, blank=True, related_name='disposals', verbose_name='المحلول')
    quantity = models.FloatField(default=0, verbose_name='الكمية')
    unit = models.CharField(max_length=40, blank=True, verbose_name='الوحدة')
    reason = models.CharField(max_length=255, blank=True, verbose_name='السبب')
    detail = models.TextField(blank=True, verbose_name='التفاصيل')
    status = models.CharField(max_length=15, choices=DisposalStatus.choices, default=DisposalStatus.PENDING, verbose_name='الحالة')
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='disposal_requests', verbose_name='مقدّم الطلب'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_disposals', verbose_name='المعتمِد'
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الاعتماد')
    disposed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت التخلص')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'طلب تخلص'
        verbose_name_plural = 'طلبات التخلص'

    def __str__(self):
        return f'تخلص — {self.material.name_ar} ({self.get_status_display()})'


class NonConformity(BaseModel):
    """عدم مطابقة — وحدة مركزية ترصد الانحرافات وتفتح CAPA."""

    class NcType(models.TextChoices):
        SAMPLE = 'SAMPLE', 'عينة'
        TEST = 'TEST', 'اختبار'
        QC = 'QC', 'جودة'
        EQUIPMENT = 'EQUIPMENT', 'جهاز'
        REAGENT = 'REAGENT', 'كاشف'
        METHOD = 'METHOD', 'طريقة'
        PERSONNEL = 'PERSONNEL', 'موظف'
        DOCUMENTATION = 'DOCUMENTATION', 'توثيق'
        RESULT = 'RESULT', 'نتيجة'
        SLA = 'SLA', 'التزام زمني'

    class Severity(models.TextChoices):
        MINOR = 'MINOR', 'طفيف'
        MAJOR = 'MAJOR', 'جوهري'
        CRITICAL = 'CRITICAL', 'حرج'

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'مفتوحة'
        UNDER_INVESTIGATION = 'UNDER_INVESTIGATION', 'قيد التحقيق'
        AWAITING_CAPA = 'AWAITING_CAPA', 'بانتظار CAPA'
        CLOSED = 'CLOSED', 'مغلقة'

    nc_number = models.CharField(max_length=60, unique=True, blank=True, verbose_name='رقم عدم المطابقة')
    nc_type = models.CharField(max_length=20, choices=NcType.choices, default=NcType.TEST, verbose_name='النوع')
    bench = models.CharField(
        max_length=20,
        choices=FoodSample.LabBench.choices,
        default=FoodSample.LabBench.MICROBIOLOGY,
        verbose_name='القسم',
    )
    severity = models.CharField(
        max_length=10, choices=Severity.choices, default=Severity.MINOR, verbose_name='الخطورة'
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN, verbose_name='الحالة')
    title = models.CharField(max_length=255, verbose_name='العنوان')
    description = models.TextField(blank=True, verbose_name='الوصف')
    reference_type = models.CharField(max_length=40, blank=True, verbose_name='نوع المرجع')
    reference_number = models.CharField(max_length=120, blank=True, verbose_name='رقم المرجع')
    root_cause = models.TextField(blank=True, verbose_name='التحليل الجذري')
    capa_required = models.BooleanField(default=False, verbose_name='يتطلب CAPA')
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reported_nonconformities',
        verbose_name='مُبلِّغ',
    )
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإغلاق')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'عدم مطابقة'
        verbose_name_plural = 'عدم المطابقة'

    def __str__(self):
        return self.nc_number or str(self.id)

    def save(self, *args, **kwargs):
        if not self.nc_number:
            self.nc_number = f'NC-{timezone.now().year}-{uuid.uuid4().hex[:4].upper()}'
        super().save(*args, **kwargs)


class CpaRecord(BaseModel):
    """CAPA — الإجراء التصحيحي والوقائي المرتبط بعدم المطابقة."""

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'مفتوحة'
        IN_PROGRESS = 'IN_PROGRESS', 'قيد التنفيذ'
        VERIFICATION = 'VERIFICATION', 'قيد التحقق'
        CLOSED = 'CLOSED', 'مغلقة'

    non_conformity = models.ForeignKey(
        NonConformity, on_delete=models.CASCADE, related_name='capa_records', verbose_name='عدم المطابقة'
    )
    title = models.CharField(max_length=255, verbose_name='العنوان')
    root_cause = models.TextField(blank=True, verbose_name='التحليل الجذري')
    corrective_action = models.TextField(blank=True, verbose_name='الإجراء التصحيحي')
    preventive_action = models.TextField(blank=True, verbose_name='الإجراء الوقائي')
    responsible_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='responsible_capa',
        verbose_name='المسؤول',
    )
    due_date = models.DateField(null=True, blank=True, verbose_name='تاريخ الاستحقاق')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN, verbose_name='الحالة')
    verification_notes = models.TextField(blank=True, verbose_name='ملاحظات التحقق')
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name='وقت الإغلاق')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'سجل CAPA'
        verbose_name_plural = 'سجلات CAPA'

    def __str__(self):
        return self.title


class AuditLog(BaseModel):
    """سجل تدقيق — تتبّع فوري لأي فعل على أي كائن (من لا يفعل ماذا ومتى)."""

    class Action(models.TextChoices):
        CREATE = 'CREATE', 'إنشاء'
        UPDATE = 'UPDATE', 'تعديل'
        DELETE = 'DELETE', 'حذف'
        REVIEW = 'REVIEW', 'مراجعة'
        APPROVE = 'APPROVE', 'اعتماد'
        REJECT = 'REJECT', 'رفض'
        ASSIGN = 'ASSIGN', 'إسناد'
        QC = 'QC', 'مراجعة جودة'
        CAPA = 'CAPA', 'إجراء تصحيحي'
        LOGIN = 'LOGIN', 'دخول'
        LOGOUT = 'LOGOUT', 'خروج'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        verbose_name='المستخدم',
    )
    action = models.CharField(max_length=20, choices=Action.choices, verbose_name='الفعل')
    object_type = models.CharField(max_length=60, verbose_name='نوع الكائن')
    object_id = models.CharField(max_length=80, blank=True, verbose_name='معرّف الكائن')
    object_label = models.CharField(max_length=255, blank=True, verbose_name='وصف الكائن')
    detail = models.JSONField(default=dict, blank=True, verbose_name='تفاصيل')
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='عنوان IP')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='وقت الحدث')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'سجل تدقيق'
        verbose_name_plural = 'سجل التدقيق (Audit Trail)'

    def __str__(self):
        return f'{self.user} — {self.action} {self.object_type}'


# ============================================================
#  وحدة المواصفات والمعايير المرجعية (Standards & Compliance)
# ============================================================


class Standard(BaseModel):
    """مواصفة/معيار مرجعي من مصدر معتمد — SSMO، GSO، Codex، ISO، AOAC، أو مرجع آخر."""

    class Source(models.TextChoices):
        SSMO = 'SSMO', 'المواصفة السودانية SSMO'
        GSO = 'GSO', 'المواصفة الخليجية GSO'
        CODEX = 'CODEX', 'Codex Alimentarius'
        ISO = 'ISO', 'ISO'
        AOAC = 'AOAC', 'AOAC'
        OTHER = 'OTHER', 'مرجع آخر معتمد'

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'مسودة'
        ACTIVE = 'ACTIVE', 'فعالة'
        ARCHIVED = 'ARCHIVED', 'مؤرشفة'

    code = models.CharField(max_length=60, unique=True, verbose_name='رقم المواصفة')
    title_ar = models.CharField(max_length=300, verbose_name='العنوان (عربي)')
    title_en = models.CharField(max_length=300, blank=True, verbose_name='العنوان (إنجليزي)')
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.SSMO, verbose_name='المصدر')
    country = models.CharField(max_length=80, blank=True, verbose_name='الدولة/الجهة')
    document_reference = models.CharField(max_length=200, blank=True, verbose_name='المرجع الوثائقي')
    product = models.ForeignKey(
        FoodProduct, on_delete=models.PROTECT, related_name='standards',
        null=True, blank=True, verbose_name='المنتج',
    )
    product_category = models.ForeignKey(
        ProductCategory, on_delete=models.PROTECT, related_name='standards',
        null=True, blank=True, verbose_name='فئة الغذاء',
    )
    mandatory = models.BooleanField(default=True, verbose_name='إلزامية')
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT, verbose_name='الحالة'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_standards', verbose_name='المُعتمِد',
    )
    approval_date = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ الاعتماد')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['source', 'code']
        verbose_name = 'مواصفة/معيار'
        verbose_name_plural = 'المواصفات والمعايير'

    def __str__(self):
        return f'{self.get_source_display()} — {self.code} ({self.title_ar})'

    def applicable_version(self, at=None):
        """الإصدار الساري في تاريخ معيّن (افتراضياً الآن)."""
        at = at or timezone.now().date()
        return (
            self.versions.filter(effective_from__lte=at)
            .filter(models.Q(effective_to__isnull=True) | models.Q(effective_to__gte=at))
            .order_by('-version')
            .first()
        )


class StandardVersion(BaseModel):
    """نسخة مواصفة سارية — تُحفظ النُسَخ ولا تُعدَّل (تثبيت المرجع الزمني للشهادات)."""

    standard = models.ForeignKey(
        Standard, on_delete=models.CASCADE, related_name='versions', verbose_name='المواصفة'
    )
    version = models.CharField(max_length=30, verbose_name='رقم/سنة الإصدار')
    effective_from = models.DateField(verbose_name='تاريخ السريان')
    effective_to = models.DateField(null=True, blank=True, verbose_name='تاريخ الانتهاء')
    issue_date = models.DateField(null=True, blank=True, verbose_name='تاريخ الإصدار')
    document_reference = models.CharField(max_length=200, blank=True, verbose_name='المرجع الوثائقي للنسخة')
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_standard_versions', verbose_name='المُعتمِد',
    )
    approval_date = models.DateTimeField(null=True, blank=True, verbose_name='تاريخ الاعتماد')
    notes = models.TextField(blank=True, verbose_name='ملاحظات')

    class Meta:
        ordering = ['-effective_from']
        constraints = [
            models.UniqueConstraint(fields=['standard', 'version'], name='unique_standard_version'),
        ]
        verbose_name = 'نسخة مواصفة'
        verbose_name_plural = 'نسخ المواصفات'

    def __str__(self):
        return f'{self.standard.code} ({self.version})'

    def label(self):
        return f'{self.standard.title_ar} — {self.version} (سارٍ من {self.effective_from})'


class AnalyticalMethod(BaseModel):
    """طريقة تحليلية معتمدة — المصدر (ISO/AOAC/...)، النسخة، المصفوفة، LOD/LOQ وحالة الاعتماد."""

    class Source(models.TextChoices):
        ISO = 'ISO', 'ISO'
        AOAC = 'AOAC', 'AOAC'
        CODEX = 'CODEX', 'Codex'
        SSMO = 'SSMO', 'SSMO'
        OTHER = 'OTHER', 'مرجع آخر معتمد'

    class ValidationStatus(models.TextChoices):
        VALIDATED = 'VALIDATED', 'مُصدَّق عليها (Validated)'
        VERIFIED = 'VERIFIED', 'تم التحقق منها (Verified)'
        PERFORMANCE_TESTED = 'PERFORMANCE_TESTED', 'مختبرة الأداء (PTM)'
        PENDING = 'PENDING', 'قيد الاعتماد'
        INVALID = 'INVALID', 'غير صالحة'

    code = models.CharField(max_length=60, unique=True, verbose_name='رقم الطريقة')
    name_ar = models.CharField(max_length=250, verbose_name='الاسم (عربي)')
    name_en = models.CharField(max_length=250, blank=True, verbose_name='الاسم (إنجليزي)')
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.AOAC, verbose_name='المصدر')
    version = models.CharField(max_length=40, blank=True, verbose_name='النسخة')
    matrix = models.CharField(max_length=200, blank=True, verbose_name='المصفوفة/المجال')
    applicable_organism = models.CharField(max_length=200, blank=True, verbose_name='الكائنات المطبقة')
    lod = models.CharField(max_length=100, blank=True, verbose_name='حد الكشف LOD')
    loq = models.CharField(max_length=100, blank=True, verbose_name='حد الكمية LOQ')
    unit = models.CharField(max_length=40, blank=True, verbose_name='الوحدة')
    validation_status = models.CharField(
        max_length=30, choices=ValidationStatus.choices, default=ValidationStatus.VALIDATED,
        verbose_name='حالة الاعتماد',
    )
    reference_standard = models.CharField(max_length=200, blank=True, verbose_name='المرجع')
    active = models.BooleanField(default=True, verbose_name='نشطة')

    class Meta:
        ordering = ['source', 'code']
        verbose_name = 'طريقة تحليلية'
        verbose_name_plural = 'الطرق التحليلية'

    def __str__(self):
        return f'{self.code} — {self.name_ar} ({self.get_source_display()})'


class StandardRequirement(BaseModel):
    """متطلب ضمن نسخة مواصفة — حد كيميائي (min/max) أو خطة ميكروبيولوجية (n/c/m/M)."""

    class LimitType(models.TextChoices):
        MAXIMUM = 'MAXIMUM', 'حد أقصى (≤)'
        MINIMUM = 'MINIMUM', 'حد أدنى (≥)'
        RANGE = 'RANGE', 'مدى (بين)'
        SPECIFIED = 'SPECIFIED', 'قيمة محددة'
        PRESENCE_ABSENCE = 'PRESENCE_ABSENCE', 'حضور/غياب'

    class Plan(models.TextChoices):
        TWO_CLASS = 'TWO_CLASS', 'خطة من فئتين (2-Class)'
        THREE_CLASS = 'THREE_CLASS', 'خطة من ثلاث فئات (3-Class)'
        PRESENCE_ABSENCE = 'PRESENCE_ABSENCE', 'حضور/غياب'

    version = models.ForeignKey(
        StandardVersion, on_delete=models.CASCADE, related_name='requirements', verbose_name='نسخة المواصفة'
    )
    parameter = models.ForeignKey(
        LabParameter, on_delete=models.PROTECT, related_name='standard_requirements',
        null=True, blank=True, verbose_name='المعامل/التحليل',
    )
    microorganism = models.ForeignKey(
        Microorganism, on_delete=models.PROTECT, related_name='standard_requirements',
        null=True, blank=True, verbose_name='الكائن الدقيق',
    )
    method = models.ForeignKey(
        AnalyticalMethod, on_delete=models.PROTECT, related_name='requirements',
        null=True, blank=True, verbose_name='طريقة التحليل',
    )
    limit_type = models.CharField(
        max_length=30, choices=LimitType.choices, default=LimitType.MAXIMUM, verbose_name='نوع الحد'
    )
    min_value = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True, verbose_name='الحد الأدنى')
    max_value = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True, verbose_name='الحد الأقصى')
    unit = models.CharField(max_length=50, blank=True, verbose_name='الوحدة')
    # خطة أخذ العينات الميكروبيولوجية
    n = models.PositiveIntegerField(default=5, verbose_name='n — عدد وحدات العينة')
    c = models.PositiveIntegerField(default=0, verbose_name='c — الحد الأقصى للوحدات بين m و M')
    m = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True,
                            db_column='m_limit', verbose_name='m — الحد المقبول')
    M = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True,
                            db_column='Mmax', verbose_name='M — الحد الأقصى')
    plan = models.CharField(
        max_length=30, choices=Plan.choices, default=Plan.THREE_CLASS, verbose_name='نوع الخطة'
    )
    rule_json = models.JSONField(default=dict, blank=True, verbose_name='قواعد قابلة للتهيئة')
    active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        ordering = ['version__effective_from', 'parameter__code', 'microorganism__code']
        verbose_name = 'متطلب مواصفة'
        verbose_name_plural = 'متطلبات المواصفات'

    def __str__(self):
        target = self.parameter.name_ar if self.parameter else (self.microorganism.code if self.microorganism else '—')
        return f'{self.version} — {target} ({self.limit_type})'

    def rule(self):
        defaults = {
            'limit_type': self.limit_type,
            'plan': self.plan,
            'm_op': 'gt',
            'M_op': 'gt',
        }
        return {**defaults, **self.rule_json}

    def label(self):
        if self.limit_type == self.LimitType.MAXIMUM:
            return f'≤ {self.max_value} {self.unit}'
        if self.limit_type == self.LimitType.MINIMUM:
            return f'≥ {self.min_value} {self.unit}'
        if self.limit_type == self.LimitType.RANGE:
            return f'{self.min_value} – {self.max_value} {self.unit}'
        if self.limit_type == self.LimitType.SPECIFIED:
            return f'= {self.min_value} {self.unit}'
        if self.limit_type == self.LimitType.PRESENCE_ABSENCE:
            return f'حضور/غياب (n={self.n}, c={self.c})'
        return f'n={self.n}, c={self.c}, m={self.m}, M={self.M} {self.unit}'


class RegulatoryRule(BaseModel):
    """قاعدة تطبيق تنظيمية — تحدد أولوية المصادر (SSMO > قرار تنظيمي > GSO > Codex) بدون hard-code."""

    class SourceType(models.TextChoices):
        NATIONAL_LAW = 'NATIONAL_LAW', 'قانون/تشريع وطني'
        SUDANESE_STANDARD = 'SUDANESE_STANDARD', 'مواصفة سودانية'
        REGULATORY_DECISION = 'REGULATORY_DECISION', 'قرار تنظيمي/سياسة'
        CONTRACT_DESTINATION = 'CONTRACT_DESTINATION', 'اشتراط تعاقدي/بلد المقصد'
        GSO_REFERENCE = 'GSO_REFERENCE', 'مرجع GSO معتمد'
        CODEX_REFERENCE = 'CODEX_REFERENCE', 'مرجع Codex'

    code = models.CharField(max_length=60, unique=True, verbose_name='الكود')
    name_ar = models.CharField(max_length=200, verbose_name='الاسم (عربي)')
    description = models.TextField(blank=True, verbose_name='الوصف')
    priority = models.PositiveIntegerField(default=10, verbose_name='ترتيب الأولوية')
    source_type = models.CharField(
        max_length=40, choices=SourceType.choices, default=SourceType.SUDANESE_STANDARD,
        verbose_name='نوع المرجع',
    )
    is_active = models.BooleanField(default=True, verbose_name='فعالة')

    class Meta:
        ordering = ['priority', 'code']
        verbose_name = 'قاعدة تطبيق تنظيمية'
        verbose_name_plural = 'قواعد التطبيق التنظيمية'

    def __str__(self):
        return f'{self.priority}. {self.name_ar}'
