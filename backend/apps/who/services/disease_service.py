"""خدمة مزامنة ICD-11 — تنسيق العملية فقط، بلا أي وصول للشبكة.

الفصل الصريح:
  * orchestration هنا: ترتيب_adapter ومتابعة النتائج (ما نكتبه، ومتى نكتبه).
  * transport في ``apps.who.clients``: بناء الرابط والمصادقة وإرسال الطلب.

Phase 0: لا تُستدعى المزامنة فعلياً، وتُرفض قبل أي كتابة إذا لم يكن العميل
مهيّأً للإرسال.
"""

from dataclasses import dataclass, field

from apps.laboratory.models import Disease
from apps.who.clients.base_client import WHOClientError
from apps.who.models import DiseaseMaster


@dataclass
class SyncResult:
    synced: int = 0
    updated: int = 0
    skipped: int = 0
    errors: list[str] = field(default_factory=list)


def assert_sync_allowed(client) -> None:
    """يمنع أي كتابة قبل التأكد من صلاحية الإرسال.

    يسبق حلقة المزامنة كي لا تُكتب سجلات جزئية اعتماداً على عميل غير مهيّأ.
    """
    if not getattr(client, 'is_enabled', True):
        raise WHOClientError(
            'المزامنة مع ICD-11 معطّلة أو غير مهيّأة — لم تُنفَّذ أي كتابة. '
            'راجع WHO_ENABLED و WHO_ICD_CLIENT_ID / WHO_ICD_CLIENT_SECRET.'
        )


def sync_diseases_from_icd11(client) -> SyncResult:
    """مزامنة الحقول المرجعية ICD-11 لكل مرض محلي نشط.

    ``client`` مسؤول عن النقل؛ هذه الدالة لا تفتح اتصالاً ولا تبني رابطاً.
    """
    assert_sync_allowed(client)
    result = SyncResult()
    for disease in Disease.objects.filter(is_active=True):
        try:
            entity = client.find_by_name(disease.name_en or disease.name_ar)
        except Exception as exc:  # noqa: BLE001 - أي فشل خارجي يُسجَّل كخطأ في هذه الحالة
            result.errors.append(f'{disease}: {exc}')
            continue
        if not entity:
            result.skipped += 1
            continue
        master, created = DiseaseMaster.objects.update_or_create(
            disease=disease,
            defaults={
                # ICD-11 API v2 ردّ JSON-LD: معرّف الكيان في ``@id``.
                # لا ``id`` ولا ``canonical_id`` في ردّ ``entity`` — الاعتماد
                # عليهما كان يكتب ``icd11_uri`` فارغاً لكل مرض. (``id`` موجود
                # في نتائج ``search`` فقط، وهي بنية مختلفة.)
                'icd11_uri': entity.get('@id') or entity.get('canonical_id') or entity.get('id') or '',
            },
        )
        if created:
            result.synced += 1
        else:
            result.updated += 1
    return result
