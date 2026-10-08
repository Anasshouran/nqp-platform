"""محوّلات المنظمات — كل محوّل يلتزم بـ``OrganizationAdapter``.

المحوّل هو المكان الوحيد المسموح فيه بمعرفة إعدادات منظمة بعينها.
"""

from .who import WHO_ORGANIZATION, WHOAdapter

__all__ = ['WHOAdapter', 'WHO_ORGANIZATION']
