try:
    from django.contrib.gis.db import models as gis_models
except Exception:
    gis_models = None

from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class MapLayerType(models.TextChoices):
    CASES = 'CASES', _('الحالات')
    OUTBREAKS = 'OUTBREAKS', _('التفشيات')
    ALERTS = 'ALERTS', _('الإنذارات')
    HEALTH_FACILITIES = 'HEALTH_FACILITIES', _('المنشآت الصحية')
    PORTS_OF_ENTRY = 'PORTS_OF_ENTRY', _('نقاط الدخول')
    LABORATORIES = 'LABORATORIES', _('المختبرات')
    VECTOR_FOCI = 'VECTOR_FOCI', _('بؤر النواقل')
    VECTOR_SURVEYS = 'VECTOR_SURVEYS', _('مسوحات النواقل')
    HEALTH_EVENTS = 'HEALTH_EVENTS', _('الأحداث الصحية')
    RISK_AREAS = 'RISK_AREAS', _('مناطق الخطورة')
    ADMIN_BOUNDARIES = 'ADMIN_BOUNDARIES', _('الحدود الإدارية')
    HEATMAP = 'HEATMAP', _('خريطة حرارية')
    CLUSTER = 'CLUSTER', _('تجمعات')


class MapFeatureType(models.TextChoices):
    POINT = 'POINT', _('نقطة')
    POLYGON = 'POLYGON', _('مضلع')
    LINE = 'LINE', _('خط')
    CIRCLE = 'CIRCLE', _('دائرة')
    HEATMAP = 'HEATMAP', _('حراري')


class SurveillanceMapLayer(BaseModel):
    """طبقة خريطة للترصد."""

    name_ar = models.CharField(max_length=200, verbose_name=_('الاسم بالعربية'))
    name_en = models.CharField(max_length=200, blank=True, verbose_name=_('الاسم بالإنجليزية'))
    layer_type = models.CharField(max_length=25, choices=MapLayerType.choices, verbose_name=_('نوع الطبقة'))
    layer_key = models.CharField(max_length=50, unique=True, verbose_name=_('مفتاح الطبقة'))

    # مصدر البيانات
    data_source = models.CharField(
        max_length=50,
        choices=[
            ('HEALTHCASE', _('حالات صحية')),
            ('OUTBREAK', _('تفشيات')),
            ('SURVEILLANCEALERT', _('إنذارات')),
            ('HEALTHFACILITY', _('منشآت صحية')),
            ('ENTRYPOINT', _('نقاط دخول')),
            ('LABORATORY', _('مختبرات')),
            ('VECTORFOCUS', _('بؤر نواقل')),
            ('VECTORSURVEY', _('مسوحات نواقل')),
            ('HEALTHEVENT', _('أحداث صحية')),
            ('SURVEILLANCELOCATION', _('مواقع ترصد')),
            ('CUSTOM_QUERY', _('استعلام مخصص')),
        ],
        verbose_name=_('مصدر البيانات'),
    )
    query_params = models.JSONField(default=dict, blank=True, verbose_name=_('معاملات الاستعلام'))

    # التنسيق
    style = models.JSONField(default=dict, blank=True, verbose_name=_('النمط'),
        help_text=_('مثال: {"color": "#ff0000", "radius": 8, "opacity": 0.8}'))
    min_zoom = models.PositiveSmallIntegerField(default=0, verbose_name=_('أقل تكبير'))
    max_zoom = models.PositiveSmallIntegerField(default=20, verbose_name=_('أكبر تكبير'))

    # التصفية
    default_filters = models.JSONField(default=dict, blank=True, verbose_name=_('الفلاتر الافتراضية'))
    available_filters = models.JSONField(default=list, blank=True, verbose_name=_('الفلاتر المتاحة'))

    # التفاعل
    is_clickable = models.BooleanField(default=True, verbose_name=_('قابل للنقر'))
    popup_template = models.TextField(blank=True, verbose_name=_('قالب النافذة المنبثقة'))
    popup_fields = models.JSONField(default=list, blank=True, verbose_name=_('حقول النافذة'))

    # التجميع
    clustering_enabled = models.BooleanField(default=True, verbose_name=_('التجميع مفعل'))
    cluster_min_points = models.PositiveIntegerField(default=5, verbose_name=_('أقل نقاط للتجميع'))
    cluster_radius = models.PositiveIntegerField(default=50, verbose_name=_('نصف قطر التجميع'))

    # العرض
    is_visible_by_default = models.BooleanField(default=True, verbose_name=_('مرئي افتراضياً'))
    display_order = models.PositiveIntegerField(default=0, verbose_name=_('ترتيب العرض'))
    group_name = models.CharField(max_length=100, blank=True, verbose_name=_('مجموعة الطبقة'))

    # الصلاحيات
    required_roles = models.JSONField(default=list, blank=True, verbose_name=_('الأدوار المطلوبة'))
    is_public = models.BooleanField(default=False, verbose_name=_('عام'))

    # الحالة
    is_active = models.BooleanField(default=True, verbose_name=_('نشط'))

    class Meta:
        ordering = ['group_name', 'display_order', 'name_ar']
        verbose_name = _('طبقة خريطة ترصد')
        verbose_name_plural = _('طبقات خرائط الترصد')

    def __str__(self):
        return f'{self.name_ar} ({self.layer_key})'

    def get_geojson(self, filters=None, bbox=None, user=None):
        """توليد GeoJSON للطبقة مع الفلاتر."""
        from apps.surveillance.services.gis_export import GISExportService
        return GISExportService.get_layer_geojson(self, filters, bbox, user)


class MapFeature(BaseModel):
    """معلم على الخريطة - يمكن أن يكون حالة، تفشي، بؤرة، إلخ."""

    layer = models.ForeignKey(
        SurveillanceMapLayer, on_delete=models.CASCADE, related_name='features', verbose_name=_('الطبقة')
    )

    # الهوية
    feature_id = models.CharField(max_length=100, verbose_name=_('معرف المعلم'))
    feature_type = models.CharField(max_length=15, choices=MapFeatureType.choices, verbose_name=_('نوع المعلم'))

    # الهندسة
    geometry = (
        gis_models.GeometryField(srid=4326, geography=True, verbose_name=_('الهندسة'))
        if gis_models is not None
        else models.JSONField(verbose_name=_('الهندسة (JSON)'))
    )

    # الخصائص
    properties = models.JSONField(default=dict, blank=True, verbose_name=_('الخصائص'))
    label = models.CharField(max_length=300, blank=True, verbose_name=_('التسمية'))
    description = models.TextField(blank=True, verbose_name=_('الوصف'))

    # التنسيق (يتجاوز نمط الطبقة)
    style_override = models.JSONField(default=dict, blank=True, verbose_name=_('نمط مخصص'))

    # البيانات المرجعية
    content_type = models.ForeignKey(
        'contenttypes.ContentType', on_delete=models.SET_NULL, null=True, blank=True,
        verbose_name=_('نوع المحتوى'),
    )
    object_id = models.UUIDField(null=True, blank=True, verbose_name=_('معرف الكائن'))

    # وقت البيانات
    data_timestamp = models.DateTimeField(null=True, blank=True, verbose_name=_('وقت البيانات'))
    is_realtime = models.BooleanField(default=False, verbose_name=_('في الوقت الحقيقي'))

    class Meta:
        ordering = ['-data_timestamp']
        verbose_name = _('معلم خريطة')
        verbose_name_plural = _('معالم الخريطة')
        indexes = [
            models.Index(fields=['layer', 'feature_id']),
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['data_timestamp']),
        ]

    def __str__(self):
        return f'{self.layer.name_ar} - {self.label or self.feature_id}'


class MapViewState(BaseModel):
    """حالة عرض الخريطة المحفوظة للمستخدم."""

    user = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, related_name='map_view_states', verbose_name=_('المستخدم')
    )
    name = models.CharField(max_length=200, verbose_name=_('الاسم'))
    is_default = models.BooleanField(default=False, verbose_name=_('افتراضي'))

    # حالة الخريطة
    center_lat = models.DecimalField(max_digits=10, decimal_places=7, verbose_name=_('خط عرض المركز'))
    center_lng = models.DecimalField(max_digits=10, decimal_places=7, verbose_name=_('خط طول المركز'))
    zoom = models.PositiveSmallIntegerField(default=6, verbose_name=_('مستوى التكبير'))
    bearing = models.DecimalField(max_digits=6, decimal_places=2, default=0, verbose_name=_('الدوران'))
    pitch = models.DecimalField(max_digits=6, decimal_places=2, default=0, verbose_name=_('الميل'))

    # الطبقات المفعلة
    active_layers = models.JSONField(default=list, blank=True, verbose_name=_('الطبقات المفعلة'))
    layer_opacity = models.JSONField(default=dict, blank=True, verbose_name=_('شفافية الطبقات'))
    layer_filters = models.JSONField(default=dict, blank=True, verbose_name=_('فلاتر الطبقات'))

    # الفلاتر العامة
    date_from = models.DateField(null=True, blank=True, verbose_name=_('من تاريخ'))
    date_to = models.DateField(null=True, blank=True, verbose_name=_('إلى تاريخ'))
    diseases = models.JSONField(default=list, blank=True, verbose_name=_('الأمراض'))
    sectors = models.JSONField(default=list, blank=True, verbose_name=_('القطاعات'))
    case_types = models.JSONField(default=list, blank=True, verbose_name=_('أنواع الحالات'))
    alert_levels = models.JSONField(default=list, blank=True, verbose_name=_('مستويات الإنذار'))

    # التصدير
    last_accessed = models.DateTimeField(auto_now=True, verbose_name=_('آخر وصول'))

    class Meta:
        ordering = ['-is_default', '-last_accessed']
        verbose_name = _('حالة عرض خريطة')
        verbose_name_plural = _('حالات عرض الخرائط')

    def __str__(self):
        return f'{self.user} - {self.name}'


class SpatialAnalysis(BaseModel):
    """تحليل مكاني محفوظ."""

    class AnalysisType(models.TextChoices):
        CLUSTER_DETECTION = 'CLUSTER_DETECTION', _('كشف التجمعات (Kulldorff)')
        HOTSPOT = 'HOTSPOT', _('البؤر الساخنة (Getis-Ord Gi*)')
        SPATIAL_AUTOCORRELATION = 'SPATIAL_AUTOCORRELATION', _('الارتباط الذاتي المكاني (Moran\'s I)')
        PROXIMITY = 'PROXIMITY', _('تحليل القرب')
        DENSITY = 'DENSITY', _('تحليل الكثافة')
        SPATIOTEMPORAL = 'SPATIOTEMPORAL', _('مكاني/زماني')

    name = models.CharField(max_length=200, verbose_name=_('الاسم'))
    analysis_type = models.CharField(max_length=30, choices=AnalysisType.choices, verbose_name=_('نوع التحليل'))

    # المعاملات
    parameters = models.JSONField(default=dict, blank=True, verbose_name=_('المعاملات'))
    input_layers = models.JSONField(default=list, blank=True, verbose_name=_('طبقات الإدخال'))
    date_from = models.DateField(null=True, blank=True, verbose_name=_('من تاريخ'))
    date_to = models.DateField(null=True, blank=True, verbose_name=_('إلى تاريخ'))
    diseases = models.JSONField(default=list, blank=True, verbose_name=_('الأمراض'))
    spatial_extent = (
        gis_models.PolygonField(srid=4326, null=True, blank=True, verbose_name=_('النطاق المكاني'))
        if gis_models is not None
        else models.JSONField(null=True, blank=True, verbose_name=_('النطاق المكاني (JSON)'))
    )

    # النتائج
    result_geojson = models.JSONField(default=dict, blank=True, verbose_name=_('النتيجة (GeoJSON)'))
    statistics = models.JSONField(default=dict, blank=True, verbose_name=_('الإحصائيات'))
    significant_clusters = models.JSONField(default=list, blank=True, verbose_name=_('التجمعات ذات الدلالة'))
    p_value_threshold = models.DecimalField(max_digits=5, decimal_places=4, default=0.05, verbose_name=_('عتبة P-value'))

    # التنفيذ
    executed_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='spatial_analyses', verbose_name=_('نفذها'),
    )
    executed_at = models.DateTimeField(auto_now_add=True, verbose_name=_('وقت التنفيذ'))
    execution_time_seconds = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, verbose_name=_('وقت التنفيذ (ثانية)'))
    status = models.CharField(
        max_length=20,
        choices=[
            ('PENDING', _('معلق')),
            ('RUNNING', _('قيد التشغيل')),
            ('COMPLETED', _('مكتمل')),
            ('FAILED', _('فشل')),
        ],
        default='PENDING',
        verbose_name=_('الحالة'),
    )
    error_message = models.TextField(blank=True, verbose_name=_('رسالة الخطأ'))

    class Meta:
        ordering = ['-executed_at']
        verbose_name = _('تحليل مكاني')
        verbose_name_plural = _('التحليلات المكانية')

    def __str__(self):
        return f'{self.name} ({self.get_analysis_type_display()})'