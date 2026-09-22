import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.db_admin.models import (
    Backup,
    Database,
    DbAlert,
    DbPermission,
    DbRole,
    DbSchema,
    DbSetting,
    DbUser,
    MaintenanceJob,
    ReplicationNode,
    RestoreHistory,
    SecurityPolicy,
)

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def officer(api_client, grant_permissions):
    user = User.objects.create_user(
        email='dbadmin@nqp.gov.sd', password='StrongPass123!', full_name='مدير قواعد البيانات'
    )
    grant_permissions(
        user,
        codes=('db_admin:view', 'db_admin:add', 'db_admin:edit', 'db_admin:delete'),
    )
    login = api_client.post(
        '/api/v1/auth/login/',
        {'email': user.email, 'password': 'StrongPass123!'},
        format='json',
    )
    token = login.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return user


@pytest.fixture
def database(db):
    return Database.objects.create(
        name='test_db', db_type='POSTGRESQL', version='15.4', status='ONLINE', size_mb=100.0
    )


@pytest.fixture
def db_role(db):
    return DbRole.objects.create(
        code='DB_TEST', name='Test Role', name_ar='دور اختبار', can_login=True
    )


def test_dashboard_overview(api_client, officer, database):
    DbUser.objects.create(username='reader', full_name='Reader', db_role=None)
    DbAlert.objects.create(
        database=database, alert_type='STORAGE', severity='CRITICAL',
        title='مخزون منخفض', status='NEW',
    )
    response = api_client.get('/api/v1/dbadmin/dashboard/overview/')
    assert response.status_code == 200
    data = response.json()['data']
    assert data['database_count'] >= 1
    assert data['online_count'] >= 1
    assert data['critical_alerts'] >= 1
    assert data['db_user_count'] >= 1


def test_list_databases(api_client, officer, database):
    response = api_client.get('/api/v1/dbadmin/databases/')
    assert response.status_code == 200
    payload = response.json()['data']
    assert payload['count'] == 1
    assert payload['results'][0]['name'] == 'test_db'


def test_create_database(api_client, officer):
    response = api_client.post(
        '/api/v1/dbadmin/databases/',
        {'name': 'created_db', 'db_type': 'POSTGRESQL', 'version': '16'},
        format='json',
    )
    assert response.status_code == 201
    assert response.json()['data']['name'] == 'created_db'
    assert Database.objects.filter(name='created_db').exists()


def test_create_schema(api_client, officer, database):
    response = api_client.post(
        '/api/v1/dbadmin/schemas/',
        {'database': str(database.id), 'name': 'analytics', 'object_count': 5},
        format='json',
    )
    assert response.status_code == 201
    assert response.json()['data']['database_name'] == 'test_db'


def test_list_schemas_filtered(api_client, officer, database):
    DbSchema.objects.create(database=database, name='public', object_count=10)
    DbSchema.objects.create(database=database, name='clinical', object_count=3)
    response = api_client.get('/api/v1/dbadmin/schemas/?database=%s' % database.id)
    assert response.json()['data']['count'] == 2
    filtered = api_client.get('/api/v1/dbadmin/schemas/?name=public')
    assert filtered.json()['data']['count'] == 1


def test_create_db_user_with_role(api_client, officer, db_role):
    response = api_client.post(
        '/api/v1/dbadmin/users/',
        {'username': 'appuser', 'full_name': 'App User', 'db_role': 'DB_TEST'},
        format='json',
    )
    assert response.status_code == 201
    data = response.json()['data']
    assert data['role_code'] == 'DB_TEST'
    assert DbUser.objects.filter(username='appuser').exists()


def test_create_backup_and_restore(api_client, officer, database):
    create = api_client.post(
        '/api/v1/dbadmin/backups/',
        {'database': str(database.id), 'backup_type': 'FULL', 'storage': 'REMOTE'},
        format='json',
    )
    assert create.status_code == 201
    backup_id = create.json()['data']['id']

    restore = api_client.post(
        f'/api/v1/dbadmin/backups/{backup_id}/restore/',
        {'target_database': 'restored_db'},
        format='json',
    )
    assert restore.status_code == 201
    assert restore.json()['data']['target_database'] == 'restored_db'
    assert RestoreHistory.objects.count() == 1

    restores = api_client.get('/api/v1/dbadmin/restores/')
    assert restores.json()['data']['count'] == 1


def test_backup_actions_require_auth(api_client, database):
    Backup.objects.create(database=database, backup_type='FULL', status='COMPLETED')
    response = api_client.get('/api/v1/dbadmin/databases/')
    assert response.status_code == 401


def test_replication_failover(api_client, officer, database):
    node = ReplicationNode.objects.create(
        database=database, name='standby', node_type='STANDBY',
        host='10.0.0.5', status='ACTIVE', replication_lag_seconds=30,
    )
    response = api_client.post(f'/api/v1/dbadmin/replication/{node.id}/failover/')
    assert response.status_code == 200
    database.refresh_from_db()
    assert database.status == 'DEGRADED'


def test_maintenance_job_run(api_client, officer, database):
    job = MaintenanceJob.objects.create(
        database=database, name='تنظيف', job_type='VACUUM',
        frequency='WEEKLY', status='SCHEDULED',
    )
    response = api_client.post(f'/api/v1/dbadmin/maintenance/{job.id}/run/')
    assert response.status_code == 200
    job.refresh_from_db()
    assert job.status == 'COMPLETED'
    assert job.last_run_at is not None


def test_alert_acknowledge_and_resolve(api_client, officer, database):
    alert = DbAlert.objects.create(
        database=database, alert_type='STORAGE', severity='HIGH',
        title='مساحة', status='NEW',
    )
    ack = api_client.post(f'/api/v1/dbadmin/alerts/{alert.id}/acknowledge/')
    assert ack.status_code == 200
    alert.refresh_from_db()
    assert alert.status == 'ACKNOWLEDGED'
    assert alert.acknowledged_by == officer

    resolve = api_client.post(f'/api/v1/dbadmin/alerts/{alert.id}/resolve/')
    assert resolve.status_code == 200
    alert.refresh_from_db()
    assert alert.status == 'RESOLVED'


def test_performance_and_queries_endpoints(api_client, officer, database):
    perf = api_client.get('/api/v1/dbadmin/performance/latest/')
    assert perf.status_code == 200
    assert isinstance(perf.json()['data'], list)

    slow = api_client.get('/api/v1/dbadmin/queries/slow/')
    assert slow.status_code == 200
    assert isinstance(slow.json()['data'], list)


def test_settings_list_and_security_policy(api_client, officer):
    DbSetting.objects.create(key='retention_days', value='30', label='احتفاظ', group='BACKUP')
    SecurityPolicy.objects.create(name='سياسة الأمن', ssl_enabled=True)

    settings = api_client.get('/api/v1/dbadmin/settings/')
    assert settings.json()['data']['count'] == 1

    policies = api_client.get('/api/v1/dbadmin/security-policies/')
    assert policies.json()['data']['count'] == 1
    assert policies.json()['data']['results'][0]['ssl_enabled'] is True


def test_db_permissions_list(api_client, officer, database, db_role):
    DbPermission.objects.create(
        db_role=db_role, database=database, table_name='travelers', action='SELECT', granted=True
    )
    response = api_client.get('/api/v1/dbadmin/permissions/')
    assert response.status_code == 200
    payload = response.json()['data']
    assert payload['count'] == 1
    assert payload['results'][0]['role_code'] == 'DB_TEST'
    assert payload['results'][0]['database_name'] == 'test_db'
    assert payload['results'][0]['action'] == 'SELECT'


def test_disaster_recovery_plan_test(api_client, officer):
    from apps.db_admin.models import DisasterRecoveryPlan

    plan = DisasterRecoveryPlan.objects.create(
        name='خطة تعافي', recovery_time_objective=4, recovery_point_objective=24,
    )
    response = api_client.post(f'/api/v1/dbadmin/disaster-recovery/{plan.id}/test/')
    assert response.status_code == 200
    plan.refresh_from_db()
    assert plan.status == 'IN_TEST'
    assert plan.tested_at is not None