"""كل ScopeType يجب أن يُعالَج في resolve_authorized_entry_points."""
import pytest
from apps.accounts.models import ScopeType


@pytest.mark.django_db
def test_all_scope_types_handled():
    """لا scope_type في ScopeType.choices يمر بصمت دون معالجة صريحة."""
    # هذا test structural — يُراجع يدوياً في M4-1
    # All types should be either:
    # - in SECTOR_LIKE_SCOPES
    # - or in ENTRY_POINT_SCOPES
    # - or handled explicitly (DEPARTMENT, STATION, STATE)
    # - or GLOBAL (special)
    from core.utils.scoping import SECTOR_LIKE_SCOPES, ENTRY_POINT_SCOPES
    
    handled = set(SECTOR_LIKE_SCOPES) | set(ENTRY_POINT_SCOPES) | {
        'GLOBAL', 'DEPARTMENT', 'STATION', 'STATE', 'COMPANY',
        'LOCALITY',  # M5-C-L: handled explicitly in resolve_authorized_entry_points
        # COMPANY handled via resolve_combined_scope_ids (separate path)
    }
    declared = set(ScopeType.values)
    
    unhandled = declared - handled
    assert not unhandled, (
        f'Scope types declared but not handled: {unhandled}. '
        f'If new scope added, handle in resolve_authorized_entry_points + add to this test.'
    )
