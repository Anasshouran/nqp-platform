"""تحقق من تناسق علاقات HealthFacility (قراءة فقط).

يفحص كل HealthFacility ويُبلّغ عن:
- locality.sector ≠ facility.sector
- entry_point.sector ≠ facility.sector
- locality.sector ≠ entry_point.sector
- نسب التغطية: locality/sector/entry_point null

Exit code: 0 = لا تناقضات، 1 = وُجدت تناقضات.
لا يكتب شيئاً، لا يعدّل شيئاً.
"""

from django.core.management.base import BaseCommand

from apps.masterdata.models import HealthFacility


class Command(BaseCommand):
    help = "تحقق من تناسق علاقات HealthFacility (قراءة فقط)"

    def handle(self, *args, **options):
        mismatched_locality_sector = 0
        mismatched_entrypoint_sector = 0
        mismatched_locality_entrypoint = 0
        examples = []

        null_locality = 0
        null_sector = 0
        null_entrypoint = 0
        total = 0

        qs = (
            HealthFacility.objects
            .select_related("locality__sector", "sector", "entry_point__sector")
            .order_by("id")
        )

        for facility in qs.iterator(chunk_size=500):
            total += 1

            if facility.locality_id is None:
                null_locality += 1
            if facility.sector_id is None:
                null_sector += 1
            if facility.entry_point_id is None:
                null_entrypoint += 1

            # 1. locality.sector vs facility.sector
            if (
                facility.locality_id is not None
                and facility.locality.sector_id is not None
                and facility.sector_id is not None
                and facility.locality.sector_id != facility.sector_id
            ):
                mismatched_locality_sector += 1
                if len(examples) < 5:
                    examples.append(
                        f"locality/sector mismatch: facility {facility.code} "
                        f"(sector={facility.sector_id}) locality {facility.locality.code} "
                        f"(sector={facility.locality.sector_id})"
                    )

            # 2. entry_point.sector vs facility.sector
            if (
                facility.entry_point_id is not None
                and facility.entry_point.sector_id is not None
                and facility.sector_id is not None
                and facility.entry_point.sector_id != facility.sector_id
            ):
                mismatched_entrypoint_sector += 1

            # 3. locality.sector vs entry_point.sector
            if (
                facility.locality_id is not None
                and facility.entry_point_id is not None
                and facility.locality.sector_id is not None
                and facility.entry_point.sector_id is not None
                and facility.locality.sector_id != facility.entry_point.sector_id
            ):
                mismatched_locality_entrypoint += 1

        total_mismatches = (
            mismatched_locality_sector
            + mismatched_entrypoint_sector
            + mismatched_locality_entrypoint
        )

        self.stdout.write(f"Total HealthFacilities checked: {total}")
        self.stdout.write(
            f"  locality IS NULL:      {null_locality} ({self._pct(null_locality, total)})"
        )
        self.stdout.write(
            f"  sector IS NULL:        {null_sector} ({self._pct(null_sector, total)})"
        )
        self.stdout.write(
            f"  entry_point IS NULL:   {null_entrypoint} ({self._pct(null_entrypoint, total)})"
        )
        self.stdout.write("")
        self.stdout.write(f"Mismatches:")
        self.stdout.write(f"  locality.sector != facility.sector:       {mismatched_locality_sector}")
        self.stdout.write(f"  entry_point.sector != facility.sector:   {mismatched_entrypoint_sector}")
        self.stdout.write(f"  locality.sector != entry_point.sector:   {mismatched_locality_entrypoint}")
        self.stdout.write("")
        if examples:
            self.stdout.write("Examples:")
            for ex in examples:
                self.stdout.write(f"  - {ex}")

        if total_mismatches > 0:
            raise SystemExit(1)
        raise SystemExit(0)

    def _pct(self, n, total):
        if total == 0:
            return "0%"
        return f"{n / total * 100:.1f}%"
