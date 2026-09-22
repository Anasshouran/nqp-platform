import logging
from django.db.models import Q
from django.utils import timezone
from django.conf import settings

from apps.surveillance.models.alert import SurveillanceAlert, AlertLevel, AlertStatus
from apps.surveillance.models.notification import (
    Notification, NotificationChannel, NotificationPriority,
    NotificationTemplate, NotificationPreference
)
from apps.surveillance.models.outbreak import Outbreak

logger = logging.getLogger(__name__)


class NotificationDispatchService:
    """خدمة إرسال الإشعارات عبر القنوات المتعددة."""

    @classmethod
    def dispatch_alert(cls, alert: SurveillanceAlert):
        """إرسال إشعار لكل المستخدمين المعنيين بالإنذار."""
        recipients = cls._get_alert_recipients(alert)
        template = cls._select_template(alert)

        for user in recipients:
            pref = NotificationPreference.objects.filter(user=user).first()
            channels = cls._effective_channels(pref, alert.level)

            for channel in channels:
                Notification.objects.create(
                    notification_type=Notification.AlertType.ALERT_NEW,
                    priority=cls._map_level(alert.level),
                    title=alert.title,
                    message=cls._build_message(alert, user),
                    data={
                        'alert_id': str(alert.id),
                        'alert_number': alert.alert_number,
                        'disease_name': alert.disease.name_ar if alert.disease else '',
                        'sector_name': alert.sector.name_ar if alert.sector else '',
                        'port_name': alert.port.name_ar if alert.port else '',
                    },
                    recipient=user,
                    recipient_role=cls._user_role(user),
                    sector=alert.sector,
                    locality=alert.locality,
                    is_broadcast=False,
                )

        alert.status = AlertStatus.NOTIFIED
        alert.notified_at = timezone.now()
        alert.save(update_fields=['status', 'notified_at'])

    @classmethod
    def dispatch_outbreak_notification(cls, outbreak: Outbreak, event: str):
        """إشعار بتفشي جديد أو تحديث."""
        recipients = cls._get_outbreak_recipients(outbreak)
        title_map = {
            'CREATED': f'تفشي جديد: {outbreak.name}',
            'UPDATED': f'تحديث تفشي: {outbreak.name}',
            'ESCALATED': f'تصعيد تفشي: {outbreak.name}',
            'RESOLVED': f'انتهاء تفشي: {outbreak.name}',
        }

        for user in recipients:
            Notification.objects.create(
                notification_type=Notification.AlertType.OUTBREAK_NEW,
                priority=NotificationPriority.HIGH if event == 'CREATED' else NotificationPriority.NORMAL,
                title=title_map.get(event, f' تحديث تفشي: {outbreak.name}'),
                message=f'المرض: {outbreak.disease.name_ar if outbreak.disease else "غير محدد"} | '
                        f'الحالات: {outbreak.total_cases} | الوفيات: {outbreak.deaths}',
                data={
                    'outbreak_id': str(outbreak.id),
                    'outbreak_number': outbreak.outbreak_number,
                    'event': event,
                },
                recipient=user,
                recipient_role=cls._user_role(user),
                sector=outbreak.sector,
                locality=outbreak.locality,
                is_broadcast=False,
            )

    @classmethod
    def dispatch_case_status_change(cls, case, old_status, new_status):
        """إشعار تغيير حالة الحالة."""
        if case.assigned_to:
            Notification.objects.create(
                notification_type=Notification.AlertType.CASE_STATUS_CHANGE,
                priority=NotificationPriority.NORMAL,
                title=f'تغيير حالة: {case.case_number}',
                message=f'من {old_status} إلى {new_status}',
                data={
                    'case_id': str(case.id),
                    'case_number': case.case_number,
                    'old_status': old_status,
                    'new_status': new_status,
                },
                recipient=case.assigned_to,
                sector=case.sector,
                locality=case.locality,
                is_broadcast=False,
            )

    @classmethod
    def dispatch_daily_summary(cls, sector=None):
        """ملخص يومي للètre."""
        from django.db.models import Count, Q
        from apps.surveillance.models.case import HealthCase, CaseClassification

        today = timezone.localdate()
        qs = HealthCase.objects.filter(reported_date=today)
        if sector:
            qs = qs.filter(sector=sector)

        stats = qs.aggregate(
            total=Count('id'),
            suspected=Count('id', filter=Q(case_type=CaseClassification.SUSPECTED)),
            confirmed=Count('id', filter=Q(case_type=CaseClassification.CONFIRMED)),
            rejected=Count('id', filter=Q(workflow_state='REJECTED')),
        )

        message = (
            f'ملخص يومي - {today}\n'
            f'إجمالي الحالات: {stats["total"]}\n'
            f'مشتبه: {stats["suspected"]}\n'
            f'مؤكد: {stats["confirmed"]}\n'
            f'مرفوض: {stats["rejected"]}'
        )

        from apps.accounts.models import User
        recipients = User.objects.filter(is_active=True)
        if sector:
            recipients = recipients.filter(sector=sector)

        for user in recipients:
            Notification.objects.create(
                notification_type=Notification.AlertType.DAILY_REPORT,
                priority=NotificationPriority.LOW,
                title=f'ملخص ترصد يومي - {today}',
                message=message,
                data={'stats': stats, 'date': today.isoformat()},
                recipient=user,
                recipient_role=cls._user_role(user),
                is_broadcast=True,
            )

    # ---- Helpers ----

    @classmethod
    def _get_alert_recipients(cls, alert):
        from apps.accounts.models import User
        qs = User.objects.filter(is_active=True, is_superuser=False)
        if alert.sector:
            qs = qs.filter(
                Q(sector=alert.sector) | Q(role__code__in=['NATIONAL_DIRECTOR', 'EPIDEMIOLOGIST'])
            )
        if alert.level in [AlertLevel.LEVEL_3, AlertLevel.LEVEL_4]:
            qs = qs.filter(role__code__in=['NATIONAL_DIRECTOR', 'EPIDEMIOLOGIST', 'SECTOR_MANAGER'])
        return list(set(qs))

    @classmethod
    def _get_outbreak_recipients(cls, outbreak):
        from apps.accounts.models import User
        qs = User.objects.filter(is_active=True)
        if outbreak.sector:
            qs = qs.filter(
                Q(sector=outbreak.sector) | Q(role__code__in=['NATIONAL_DIRECTOR', 'EPIDEMIOLOGIST'])
            )
        return list(set(qs))

    @classmethod
    def _effective_channels(cls, pref, level):
        if pref:
            channels = list(pref.channels or [])
            if level in [AlertLevel.LEVEL_3, AlertLevel.LEVEL_4]:
                channels.append(NotificationChannel.SMS.value)
                channels.append(NotificationChannel.EMAIL.value)
            return channels
        defaults = {AlertLevel.LEVEL_1: [NotificationChannel.IN_APP],
                    AlertLevel.LEVEL_2: [NotificationChannel.IN_APP],
                    AlertLevel.LEVEL_3: [NotificationChannel.IN_APP, NotificationChannel.SMS],
                    AlertLevel.LEVEL_4: [NotificationChannel.IN_APP, NotificationChannel.SMS, NotificationChannel.EMAIL]}
        return [c.value for c in defaults.get(level, [NotificationChannel.IN_APP])]

    @classmethod
    def _select_template(cls, alert):
        return NotificationTemplate.objects.filter(
            alert_type=alert.alert_type, is_active=True
        ).first()

    @classmethod
    def _build_message(cls, alert, user):
        name = getattr(user, 'first_name', '') or user.username
        return f'مرحباً {name},\n\n{alert.title}\n\n{alert.description}\n\n' \
               f'عدد الحالات المرتبطة: {alert.case_count}\n' \
               f'المستوى: {alert.get_level_display()}'

    @classmethod
    def _map_level(cls, level):
        from apps.surveillance.models.alert import AlertLevel
        return {
            AlertLevel.LEVEL_1: NotificationPriority.LOW,
            AlertLevel.LEVEL_2: NotificationPriority.NORMAL,
            AlertLevel.LEVEL_3: NotificationPriority.HIGH,
            AlertLevel.LEVEL_4: NotificationPriority.URGENT,
        }.get(level, NotificationPriority.NORMAL)

    @classmethod
    def _user_role(cls, user):
        role = getattr(user, 'role', '')
        return role or ''

    # ============================================
    # حزمة الإرسال للكائنات الفردية (تستخدمها الـ Signals)
    # ============================================

    @classmethod
    def _create_notification(cls, user, ntype, priority, title, message,
                             action_url='', obj=None, channels=None):
        if not user:
            return None
        return Notification.objects.create(
            notification_type=ntype,
            priority=priority,
            title=title,
            message=message,
            action_url=action_url,
            recipient=user,
            recipient_role=cls._user_role(user),
            channels=channels or [NotificationChannel.IN_APP.value],
        )

    @classmethod
    def dispatch_case_registered(cls, case):
        """إشعار بتسجيل حالة جديدة."""
        from apps.surveillance.models.notification import NotificationType
        if case.assigned_to:
            cls._create_notification(
                case.assigned_to,
                NotificationType.CASE_REGISTERED,
                NotificationPriority.HIGH,
                f'حالة جديدة: {case.case_number}',
                f'المرض: {case.disease.name_ar if case.disease else "غير محدد"} | '
                f'التصنيف: {case.get_case_type_display()}',
                action_url=f'/surveillance/cases/{case.id}/',
            )
        if case.reported_by and case.reported_by != case.assigned_to:
            cls._create_notification(
                case.reported_by,
                NotificationType.CASE_REGISTERED,
                NotificationPriority.NORMAL,
                f'تم تسجيل الحالة {case.case_number}',
                'تم تسجيل الحالة بنجاح.',
                action_url=f'/surveillance/cases/{case.id}/',
            )

    @classmethod
    def dispatch_case_confirmed(cls, case):
        """إشعار بتأكيد حالة."""
        from apps.surveillance.models.notification import NotificationType
        if case.assigned_to:
            cls._create_notification(
                case.assigned_to,
                NotificationType.CASE_CONFIRMED,
                NotificationPriority.URGENT if case.disease and case.disease.is_public_health_emergency else NotificationPriority.HIGH,
                f'تأكيد حالة: {case.case_number}',
                f'تم تأكيد الحالة للمرض {case.disease.name_ar if case.disease else "غير محدد"} مخبرياً.',
                action_url=f'/surveillance/cases/{case.id}/',
            )

    @classmethod
    def dispatch_contact_added(cls, contact):
        """إشعار بإضافة مخالط."""
        from apps.surveillance.models.notification import NotificationType
        if contact.assigned_to:
            cls._create_notification(
                contact.assigned_to,
                NotificationType.CONTACT_ADDED,
                NotificationPriority.NORMAL,
                f'مخالط جديد: {contact.contact_number}',
                f'{contact.person_name} أُضيف كمخالط للحالة {contact.index_case.case_number}.',
                action_url=f'/surveillance/contacts/{contact.id}/',
            )
        if contact.index_case.assigned_to and contact.index_case.assigned_to != contact.assigned_to:
            cls._create_notification(
                contact.index_case.assigned_to,
                NotificationType.CONTACT_ADDED,
                NotificationPriority.NORMAL,
                f'مخالط جديد للحالة {contact.index_case.case_number}',
                f'تم إضافة {contact.person_name} كمخالط.',
                action_url=f'/surveillance/contacts/{contact.id}/',
            )

    @classmethod
    def dispatch_contact_symptomatic(cls, followup):
        """إشعار بمخالط تظهر عليه أعراض."""
        from apps.surveillance.models.notification import NotificationType
        contact = followup.contact
        if contact.assigned_to:
            cls._create_notification(
                contact.assigned_to,
                NotificationType.CONTACT_SYMPTOMATIC,
                NotificationPriority.URGENT,
                f'مخالط بأعراض: {contact.contact_number}',
                f'{contact.person_name} تظهر عليه أعراض بتاريخ {followup.check_date}.\n'
                f'الأعراض: {", ".join(followup.symptoms or [])}',
                action_url=f'/surveillance/contacts/{contact.id}/',
            )
        if contact.index_case.assigned_to:
            cls._create_notification(
                contact.index_case.assigned_to,
                NotificationType.CONTACT_SYMPTOMATIC,
                NotificationPriority.HIGH,
                f'مخالط بأعراض للحالة {contact.index_case.case_number}',
                contact.person_name,
                action_url=f'/surveillance/contacts/{contact.id}/',
            )

    @classmethod
    def dispatch_contact_converted(cls, followup):
        """إشعار بتحول مخالط إلى حالة."""
        from apps.surveillance.models.notification import NotificationType
        contact = followup.contact
        if contact.assigned_to:
            cls._create_notification(
                contact.assigned_to,
                NotificationType.CONTACT_CONVERTED,
                NotificationPriority.URGENT,
                f'تحول مخالط لحالة: {contact.contact_number}',
                f'تحول {contact.person_name} إلى حالة {followup.converted_case.case_number if followup.converted_case else "جديدة"}.',
                action_url=f'/surveillance/contacts/{contact.id}/',
            )

    @classmethod
    def dispatch_specimen_collected(cls, specimen):
        """إشعار بمجموعة عينة."""
        from apps.surveillance.models.notification import NotificationType
        from apps.surveillance.models.notification import NotificationChannel
        case = specimen.case
        targets = []
        if specimen.collected_by:
            targets.append(specimen.collected_by)
        if case and case.assigned_to:
            targets.append(case.assigned_to)
        for t in set(user for user in targets if user):
            cls._create_notification(
                t,
                NotificationType.SPECIMEN_COLLECTED,
                NotificationPriority.NORMAL,
                f'عينة مجمعة: {specimen.specimen_number}',
                f'عينة {specimen.get_specimen_type_display()} للحالة {case.case_number}.',
                action_url=f'/surveillance/specimens/{specimen.id}/',
            )

    @classmethod
    def dispatch_lab_result_positive(cls, lab_result_detail):
        """إشعار بنتيجة مختبر إيجابية."""
        from apps.surveillance.models.notification import NotificationType
        case = lab_result_detail.specimen.case
        recipients = set()
        if case and case.assigned_to:
            recipients.add(case.assigned_to)
        if lab_result_detail.entered_by:
            recipients.add(lab_result_detail.entered_by)
        for r in recipients:
            cls._create_notification(
                r,
                NotificationType.LAB_RESULT_POSITIVE,
                NotificationPriority.URGENT,
                f'نتيجة إيجابية: {lab_result_detail.specimen.specimen_number}',
                f'{lab_result_detail.test_name} إيجابية للمرض '
                f'{lab_result_detail.disease.name_ar if lab_result_detail.disease else "غير محدد"}.',
                action_url=f'/surveillance/specimens/{lab_result_detail.specimen.id}/',
            )

    @classmethod
    def dispatch_lab_result_critical(cls, lab_result_detail):
        """إشعار بنتيجة مختبر حرجة."""
        from apps.surveillance.models.notification import NotificationType
        case = lab_result_detail.specimen.case
        for admin in getattr(lab_result_detail, 'critical_notified_to', []):
            cls._create_notification(
                admin,
                NotificationType.LAB_RESULT_CRITICAL,
                NotificationPriority.CRITICAL,
                f'نتيجة حرجة: {lab_result_detail.specimen.specimen_number}',
                f'كشف {lab_result_detail.test_name} حالة حرجة للمرض '
                f'{lab_result_detail.disease.name_ar if lab_result_detail.disease else ""}.',
            )
        if case and case.assigned_to:
            cls._create_notification(
                case.assigned_to,
                NotificationType.LAB_RESULT_CRITICAL,
                NotificationPriority.CRITICAL,
                f'نتيجة حرجة للحالة {case.case_number}',
                lab_result_detail.interpretation or lab_result_detail.result_value,
                action_url=f'/surveillance/specimens/{lab_result_detail.specimen.id}/',
            )

    @classmethod
    def dispatch_alert_generated(cls, alert):
        """إشعار بإنذار جديد."""
        from apps.surveillance.models.notification import NotificationType
        for recipient in cls._get_alert_recipients(alert):
            cls._create_notification(
                recipient,
                NotificationType.ALERT_GENERATED,
                cls._map_level(alert.level),
                alert.title,
                alert.description,
                action_url=f'/surveillance/alerts/{alert.id}/',
                obj=alert,
            )

    @classmethod
    def dispatch_alert_status_changed(cls, alert):
        """إشعار بتغيير حالة إنذار."""
        from apps.surveillance.models.notification import NotificationType
        old = getattr(alert, '_old_status', None)
        ntype = {
            'ACKNOWLEDGED': NotificationType.ALERT_ACKNOWLEDGED,
            'ESCALATED': NotificationType.ALERT_ESCALATED,
            'CLOSED': NotificationType.ALERT_CLOSED,
        }.get(alert.status)

        if ntype and alert.assigned_to:
            cls._create_notification(
                alert.assigned_to,
                ntype,
                NotificationPriority.NORMAL if alert.status != 'ESCALATED' else NotificationPriority.URGENT,
                f'{alert.alert_number} - {alert.get_status_display()}',
                f'تغيرت حالة الإنذار من {old or "بدون"} إلى {alert.get_status_display()}.',
                action_url=f'/surveillance/alerts/{alert.id}/',
            )

    @classmethod
    def dispatch_outbreak_confirmed(cls, outbreak):
        """إشعار بتفشي مؤكد."""
        from apps.surveillance.models.notification import NotificationType, NotificationPriority
        for recipient in cls._get_outbreak_recipients(outbreak):
            cls._create_notification(
                recipient,
                NotificationType.OUTBREAK_CONFIRMED,
                NotificationPriority.URGENT,
                f'تفشي مؤكد: {outbreak.name}',
                f'تفشي {outbreak.disease.name_ar if outbreak.disease else ""} | '
                f'الحالات: {outbreak.total_cases} | الوفيات: {outbreak.deaths}',
                action_url=f'/surveillance/outbreaks/{outbreak.id}/',
            )

    @classmethod
    def dispatch_outbreak_status_changed(cls, outbreak):
        """إشعار بتغيير حالة تفشي."""
        from apps.surveillance.models.notification import NotificationType, NotificationPriority
        old = getattr(outbreak, '_old_status', None)
        ntype = {
            'CONTROLLED': NotificationType.OUTBREAK_CONTROLLED,
            'CLOSED': NotificationType.OUTBREAK_CLOSED,
        }.get(outbreak.status)

        if ntype and outbreak.response_coordinator:
            cls._create_notification(
                outbreak.response_coordinator,
                ntype,
                NotificationPriority.NORMAL,
                f'{outbreak.get_status_display()}: {outbreak.name}',
                f'تغيرت حالة التفشي من {old or "بدون"} إلى {outbreak.get_status_display()}.',
                action_url=f'/surveillance/outbreaks/{outbreak.id}/',
            )

    @classmethod
    def dispatch_event_reported(cls, event):
        """إشعار بحدث مبلغ عنه."""
        from apps.surveillance.models.notification import NotificationType, NotificationPriority
        recipients = cls._get_event_recipients(event)
        for recipient in recipients:
            cls._create_notification(
                recipient,
                NotificationType.EVENT_REPORTED,
                NotificationPriority.HIGH if event.priority in ('HIGH', 'CRITICAL') else NotificationPriority.NORMAL,
                f'حدث جديد: {event.title}',
                event.description,
                action_url=f'/surveillance/events/{event.id}/',
            )

    @classmethod
    def dispatch_event_status_changed(cls, event):
        """إشعار بتغيير حالة حدث."""
        from apps.surveillance.models.notification import NotificationType, NotificationPriority
        from apps.surveillance.models.event import HealthEventStatus
        if event.status == HealthEventStatus.VERIFIED and event.reported_by:
            cls._create_notification(
                event.reported_by,
                NotificationType.EVENT_VERIFIED,
                NotificationPriority.NORMAL,
                f'تم التحقق من الحدث: {event.title}',
                'تم التحقق من صحة البلاغ.',
                action_url=f'/surveillance/events/{event.id}/',
            )

    @classmethod
    def _get_event_recipients(cls, event):
        from apps.accounts.models import User
        qs = User.objects.filter(is_active=True, is_superuser=False)
        if event.sector:
            qs = qs.filter(
                Q(sector=event.sector) | Q(role__code__in=['NATIONAL_DIRECTOR', 'EPIDEMIOLOGIST'])
            )
        return list(set(qs))