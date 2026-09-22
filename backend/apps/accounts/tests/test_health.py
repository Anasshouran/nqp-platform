from django.test import Client


def test_health_endpoint_returns_ok():
    res = Client().get('/api/v1/health/')
    assert res.status_code == 200
    assert res.json()['status'] == 'ok'