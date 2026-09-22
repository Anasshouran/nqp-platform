from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import User as NqpUser
from apps.food_quarantine.models import (
    CpaRecord,
    LabEquipment,
    NonConformity,
    QCRecord,
    Reagent,
    SampleTest,
)


class Command(BaseCommand):
    help = 'بيانات تجريبية لواجهة الجودة: سجلات QC، كواشف، عدم مطابقة، CAPA'

    def handle(self, *args, **options):
        qa = NqpUser.objects.filter(email='qa.officer@nqp.sd').first()
        analyst = NqpUser.objects.filter(email='micro.analyst@nqp.sd').first() or qa
        now = timezone.now()

        tests = list(SampleTest.objects.all()[:10])

        qc_created = 0
        for i, label in enumerate([
            ('MICROBIOLOGY', 'Salmonella'),
            ('MICROBIOLOGY', 'E.coli'),
            ('CHEMISTRY', 'Moisture'),
        ], start=1):
            if QCRecord.objects.filter(control_type__icontains=label[1]).exists():
                continue
            QCRecord.objects.create(
                bench=label[0],
                test=tests[i - 1] if i <= len(tests) else None,
                control_type=f'QC Control — {label[1]}',
                lot_number=f'LOT-QC-{i:02d}',
                status=QCRecord.Status.PASSED,
                severity=QCRecord.Severity.MINOR,
                result_value=round(90 + i, 1),
                expected_value=100,
                tolerance=10,
                qc_notes='مطابق ضمن الحدود المسموحة',
                reviewed_by=qa,
                reviewed_at=now - timezone.timedelta(days=i),
            )
            qc_created += 1

        reagents = [
            ('وسط زراعة سالامونيلا', 'Salmonella Media', 'MICROBIOLOGY', 'LOT-MED-001', 90, 'jar', Reagent.Status.AVAILABLE),
            ('كاشف كيمياء تحليلي', 'Analytical Reagent', 'CHEMISTRY', 'LOT-REA-005', 5, 'box', Reagent.Status.LOW),
            ('ضابط مرجعي منتهي', 'Expired Control', 'MICROBIOLOGY', 'LOT-CTL-009', 0, 'vial', Reagent.Status.EXPIRED),
        ]
        reagent_created = 0
        for name_ar, name_en, bench, lot, qty, unit, status in reagents:
            if Reagent.objects.filter(lot_number=lot).exists():
                continue
            Reagent.objects.create(
                name_ar=name_ar,
                name_en=name_en,
                bench=bench,
                lot_number=lot,
                expiry_date=(now - timezone.timedelta(days=20)).date() if status == Reagent.Status.EXPIRED
                else (now + timezone.timedelta(days=45)).date(),
                quantity=qty,
                unit=unit,
                status=status,
                supplier='مورد مختبرات معتمد',
            )
            reagent_created += 1

        ncs = [
            ('SAMPLE', 'MICROBIOLOGY', NonConformity.Severity.MAJOR, 'تأخر استلام عينة عن الموعد المحدد', 'SMP-LATE-001'),
            ('QC', 'MICROBIOLOGY', NonConformity.Severity.CRITICAL, 'فشل ضابط جودة في دفعة سالامونيلا', 'QC-2026-0003'),
            ('REAGENT', 'CHEMISTRY', NonConformity.Severity.MINOR, 'كاشف وصلت صلاحيته دون استبدال', 'REA-EXP-002'),
        ]
        nc_created = 0
        for nctype, bench, sev, title, ref in ncs:
            if NonConformity.objects.filter(reference_number=ref).exists():
                continue
            nc = NonConformity.objects.create(
                nc_type=nctype,
                bench=bench,
                severity=sev,
                status=NonConformity.Status.OPEN,
                title=title,
                description='انحراف عن الإجراء المعتمد يتطلب تحقيقاً',
                reference_number=ref,
                capa_required=(nctype == 'QC'),
                reported_by=qa,
            )
            nc_created += 1
            if nctype == 'QC':
                CpaRecord.objects.create(
                    non_conformity=nc,
                    title='CAPA — فشل ضابط الجودة',
                    root_cause='احتمال تلوث الوسط الزراعي',
                    corrective_action='إعادة المعايرة ومراجعة دفعة الوسط',
                    preventive_action='مراجعة سياسة تخزين الأوساط',
                    responsible_user=analyst,
                    due_date=(now + timezone.timedelta(days=14)).date(),
                    status=CpaRecord.Status.OPEN,
                )

        self.stdout.write(self.style.SUCCESS(
            f'اكتمل التجهيز التجريبي للجودة: {qc_created} QC، {reagent_created} كواشف، {nc_created} عدم مطابقة'
        ))