from rest_framework import serializers
from django.utils.text import slugify

from .models import (
    Announcement,
    Circular,
    CmsDocument,
    DirectorProfile,
    FaqItem,
    MediaItem,
    NewsArticle,
    Page,
    SiteSetting,
    Slider,
)


class NewsArticleSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    sector = serializers.UUIDField(source='sector_id', read_only=True)

    class Meta:
        model = NewsArticle
        fields = [
            'id', 'title', 'title_en', 'slug', 'summary', 'content', 'category', 'image',
            'status', 'is_published', 'is_urgent', 'is_featured', 'keywords',
            'expires_at', 'published_at', 'author', 'reviewer', 'approver', 'sector',
        ]
        read_only_fields = ['id', 'published_at']

    def get_image(self, obj):
        return obj.image.url if obj.image else None


class CircularSerializer(serializers.ModelSerializer):
    attachment = serializers.SerializerMethodField()
    sector = serializers.UUIDField(source='sector_id', read_only=True)

    class Meta:
        model = Circular
        fields = [
            'id', 'title', 'body', 'category', 'priority',
            'status', 'reference_number', 'published_at',
            'author', 'reviewer', 'approver', 'attachment', 'sector',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'published_at']

    def get_attachment(self, obj):
        return obj.attachment.url if obj.attachment else None


class AnnouncementSerializer(serializers.ModelSerializer):
    sector = serializers.UUIDField(source='sector_id', read_only=True)

    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'title_en', 'slug', 'body', 'priority', 'audience',
            'start_at', 'end_at', 'status', 'is_published', 'published_at',
            'author', 'reviewer', 'approver', 'sector',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at', 'published_at']


class PageSerializer(serializers.ModelSerializer):
    sector = serializers.UUIDField(source='sector_id', read_only=True)

    class Meta:
        model = Page
        fields = ['id', 'slug', 'title', 'content', 'is_published', 'sector']
        read_only_fields = ['id']


class FaqItemSerializer(serializers.ModelSerializer):
    sector = serializers.UUIDField(source='sector_id', read_only=True)

    class Meta:
        model = FaqItem
        fields = ['id', 'question', 'answer', 'order', 'is_active', 'sector']
        read_only_fields = ['id']


class CmsDocumentSerializer(serializers.ModelSerializer):
    file_name = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()
    file_type = serializers.SerializerMethodField()
    sector = serializers.UUIDField(source='sector_id', read_only=True)

    class Meta:
        model = CmsDocument
        fields = ['id', 'title', 'description', 'category', 'file', 'is_active', 'file_name', 'file_size', 'file_type', 'sector']
        read_only_fields = ['id']

    def get_file_name(self, obj):
        return obj.file.name.rsplit('/', 1)[-1] if obj.file else None

    def get_file_size(self, obj):
        try:
            return obj.file.size if obj.file else None
        except (OSError, ValueError):
            return None

    def get_file_type(self, obj):
        name = self.get_file_name(obj)
        return name.rsplit('.', 1)[-1].upper() if name and '.' in name else None


class SliderSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    sector = serializers.UUIDField(source='sector_id', read_only=True)

    class Meta:
        model = Slider
        fields = [
            'id', 'title_ar', 'title_en', 'subtitle_ar', 'subtitle_en', 'image',
            'button_text', 'button_link', 'sort_order', 'is_active', 'sector',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_image(self, obj):
        return obj.image.url if obj.image else None


class MediaItemSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    sector = serializers.UUIDField(source='sector_id', read_only=True)

    class Meta:
        model = MediaItem
        fields = [
            'id', 'title', 'file', 'kind', 'mime_type', 'file_size', 'url', 'sector',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'mime_type', 'file_size']

    def get_url(self, obj):
        return obj.file.url if obj.file else None


class SiteSettingSerializer(serializers.ModelSerializer):
    sector = serializers.UUIDField(source='sector_id', read_only=True)

    class Meta:
        model = SiteSetting
        fields = ['id', 'key', 'value', 'sector']
        read_only_fields = ['id']


class DirectorProfileSerializer(serializers.ModelSerializer):
    photo = serializers.SerializerMethodField()
    sector_code = serializers.CharField(source='sector.code', read_only=True)
    sector_name = serializers.CharField(source='sector.name_ar', read_only=True)

    class Meta:
        model = DirectorProfile
        fields = [
            'id', 'sector', 'sector_code', 'sector_name', 'name_ar', 'name_en',
            'title', 'qualification',
            'specialization', 'summary', 'message', 'photo', 'is_active',
            'is_confirmed', 'confirmation_note',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_photo(self, obj):
        return obj.photo.url if obj.photo else None
