"""سجل تغييرات حالة طلب النقل — سجل تدقيق للاعتماد والرفض."""

from django.db import models

from core.models.base import BaseModel

from apps.accounts.models import User

from .posting import PostingRequest


class PostingStatusLog(BaseModel):
    """قيد واحد في تاريخ حالة طلب نقل.

    يُكتب في كل انتقال حالة (إرسال/اعتماد/رفض/إلغاء) فيبقى الأثر
    القابل للتدقيق حتى لو تغيّر الطلب لاحقاً.
    """

    posting = models.ForeignKey(
        PostingRequest,
        on_delete=models.CASCADE,
        related_name='status_logs',
        verbose_name='طلب النقل',
    )
    from_status = models.CharField(
        max_length=20, blank=True, verbose_name='الحالة السابقة',
    )
    to_status = models.CharField(max_length=20, verbose_name='الحالة الجديدة')
    note = models.TextField(blank=True, verbose_name='ملاحظات')
    changed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='posting_status_logs',
        verbose_name='من قام بالتغيير',
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'سجل حالة طلب النقل'
        verbose_name_plural = 'سجل حالات طلبات النقل'

    def __str__(self):
        return f'{self.posting_id}: {self.from_status or "—"} → {self.to_status}'
