from django.contrib import admin

from .models import Announcement, Circular, CmsDocument, DirectorProfile, FaqItem, MediaItem, NewsArticle, Page, SiteSetting, Slider


@admin.register(NewsArticle)
class NewsArticleAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'status', 'is_published', 'sector', 'published_at']
    list_filter = ['category', 'status', 'is_published', 'sector']
    search_fields = ['title', 'author']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(Circular)
class CircularAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'priority', 'status', 'sector', 'published_at']
    list_filter = ['category', 'priority', 'status', 'sector']
    search_fields = ['title', 'body', 'reference_number']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ['title', 'priority', 'status', 'is_published', 'start_at', 'end_at', 'sector']
    list_filter = ['priority', 'status', 'is_published', 'sector']
    search_fields = ['title', 'body']


@admin.register(DirectorProfile)
class DirectorProfileAdmin(admin.ModelAdmin):
    list_display = ['name_ar', 'title', 'sector', 'is_active']
    list_filter = ['is_active', 'sector']
    search_fields = ['name_ar', 'title']


@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    list_display = ['slug', 'title', 'is_published', 'sector']
    list_filter = ['is_published', 'sector']
    search_fields = ['slug', 'title']


@admin.register(FaqItem)
class FaqItemAdmin(admin.ModelAdmin):
    list_display = ['question', 'order', 'is_active', 'sector']
    list_filter = ['is_active', 'sector']


@admin.register(CmsDocument)
class CmsDocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'is_active', 'sector']
    list_filter = ['category', 'is_active', 'sector']
    search_fields = ['title']


@admin.register(Slider)
class SliderAdmin(admin.ModelAdmin):
    list_display = ['title_ar', 'sort_order', 'is_active', 'sector']
    list_filter = ['is_active', 'sector']
    search_fields = ['title_ar', 'title_en']


@admin.register(MediaItem)
class MediaItemAdmin(admin.ModelAdmin):
    list_display = ['title', 'kind', 'file_size', 'sector', 'created_at']
    list_filter = ['kind', 'sector']


@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    list_display = ['key', 'sector']
    list_filter = ['sector']
    search_fields = ['key']
