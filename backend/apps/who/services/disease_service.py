"""خدمة مزامنة الأمراض مع تصنيف ICD-11."""

from dataclasses import dataclass, field

from apps.laboratory.models import Disease
from apps.who.clients.base_client import WHOClientError
from apps.who.models import DiseaseMaster


ICD11_DEFAULT_RELEASES = ['1K20', '1A00', '1B00', '1C00', '1D00']


@dataclass
class SyncResult:
    synced: int = 0
    updated: int = 0
    skipped: int = 0
    errors: list[str] = field(default_factory=list)


def sync_diseases_from_icd11(client) -> SyncResult:
    """مزامنة الحقول المرجعية ICD-11 لكل مرض محلي نشط."""
    result = SyncResult()
    for disease in Disease.objects.filter(is_active=True):
        try:
            entity = client.find_by_name(disease.name_en or disease.name_ar)
        except (WHOClientError, Exception) as exc:  # noqa: BLE001
            result.errors.append(f'{disease}: {exc}')
            continue
        if not entity:
            result.skipped += 1
            continue
        master, created = DiseaseMaster.objects.update_or_create(
            disease=disease,
            defaults={
                'icd11_uri': entity.get('canonical_id', entity.get('id', '')),
            },
        )
        if created:
            result.synced += 1
        else:
            result.updated += 1
    return result