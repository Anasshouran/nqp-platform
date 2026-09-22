from django.contrib import admin

from .models import (
    EntryPoint,
    HealthFacility,
    Section,
    SectionMember,
    Sector,
    State,
    Station,
    Terminal,
)


@admin.register(Sector)
class SectorAdmin(admin.ModelAdmin):
    list_display = ('code', 'name_ar', 'color', 'order', 'is_active')
    search_fields = ('code', 'name_ar')


@admin.register(State)
class StateAdmin(admin.ModelAdmin):
    list_display = ('code', 'name_ar', 'sector', 'order', 'is_active')
    list_filter = ('sector',)
    search_fields = ('code', 'name_ar')


@admin.register(EntryPoint)
class EntryPointAdmin(admin.ModelAdmin):
    list_display = ('code', 'name_ar', 'kind', 'state', 'sector', 'locality', 'is_active')
    list_filter = ('kind', 'state')
    search_fields = ('code', 'name_ar')


@admin.register(HealthFacility)
class HealthFacilityAdmin(admin.ModelAdmin):
    list_display = ('code', 'name_ar', 'kind', 'locality', 'sector', 'entry_point', 'is_active')
    list_filter = ('kind', 'sector', 'locality')
    search_fields = ('code', 'name_ar', 'name_en', 'location')


@admin.register(Terminal)
class TerminalAdmin(admin.ModelAdmin):
    list_display = ('code', 'name_ar', 'entry_point', 'is_active')
    list_filter = ('entry_point',)
    search_fields = ('code', 'name_ar')


@admin.register(Station)
class StationAdmin(admin.ModelAdmin):
    list_display = ('code', 'name_ar', 'terminal', 'entry_point', 'is_active')
    search_fields = ('code', 'name_ar')


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ('code', 'name_ar', 'station', 'is_active')
    search_fields = ('code', 'name_ar')


@admin.register(SectionMember)
class SectionMemberAdmin(admin.ModelAdmin):
    list_display = ('user', 'section', 'role_label', 'is_active')
    list_filter = ('section',)
    search_fields = ('user__email', 'section__name_ar')