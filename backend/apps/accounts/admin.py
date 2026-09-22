from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Permission, Role, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ['email']
    list_display = ['email', 'full_name', 'role', 'is_active', 'is_staff', 'created_at']
    list_filter = ['is_active', 'is_staff', 'role']
    search_fields = ['email', 'full_name', 'phone', 'national_id']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('البيانات الشخصية', {'fields': ('full_name', 'phone', 'national_id', 'role')}),
        ('الصلاحيات', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions', 'extra_permissions'),
        }),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'full_name', 'phone', 'national_id', 'role', 'password1', 'password2'),
        }),
    )


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'name_ar', 'default_scope', 'permissions_count']
    list_filter = ['default_scope']
    search_fields = ['code', 'name', 'name_ar']
    filter_horizontal = ['permissions']

    def permissions_count(self, obj):
        return obj.permissions.count()

    permissions_count.short_description = 'عدد الصلاحيات'


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'resource', 'action']
    list_filter = ['resource', 'action']
    search_fields = ['code', 'name']
