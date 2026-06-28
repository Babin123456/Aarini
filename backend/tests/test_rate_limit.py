"""
Tests for rate limiting middleware.

These tests use an ISOLATED app instance with rate limiting ENABLED.
They do NOT use the shared conftest fixtures (which disable the limiter).

Run: python -m pytest tests/test_rate_limit.py -v
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.pop("FIREBASE_SERVICE_ACCOUNT_JSON", None)
os.environ.pop("FIREBASE_CREDENTIALS_PATH", None)
os.environ.pop("GEMINI_API_KEY", None)

pytestmark = pytest.mark.skipif(
    "RATE_LIMIT_TESTS" not in os.environ,
    reason="Run with RATE_LIMIT_TESTS=1 pytest tests/test_rate_limit.py -v",
)


@pytest.fixture()
def limited_client(request):
    """
    Create a fresh test client with rate limiting ENABLED.
    Overrides any session-level limiter state.
    """
    os.environ["FLASK_ENV"] = "development"

    from middleware.rate_limit import limiter
    from app import app as flask_app

    prev_testing = flask_app.config.get("TESTING")
    flask_app.config["TESTING"] = False
    limiter.enabled = True

    try:
        limiter._storage.reset()
    except Exception:
        pass

    client = flask_app.test_client()
    yield client

    try:
        limiter._storage.reset()
    except Exception:
        pass
    limiter.enabled = False
    flask_app.config["TESTING"] = prev_testing if prev_testing is not None else True
    os.environ["FLASK_ENV"] = "testing"


class TestLoginRateLimit:
    """Login: 10 per minute per IP."""

    def test_login_allows_under_limit(self, limited_client):
        payload = {"email": "test@example.com", "password": "password123"}
        for _ in range(10):
            resp = limited_client.post("/login", json=payload)
            assert resp.status_code == 200

    def test_login_blocks_over_limit(self, limited_client):
        payload = {"email": "test@example.com", "password": "password123"}
        for _ in range(10):
            limited_client.post("/login", json=payload)
        resp = limited_client.post("/login", json=payload)
        assert resp.status_code == 429

    def test_429_has_retry_after_header(self, limited_client):
        payload = {"email": "test@example.com", "password": "password123"}
        for _ in range(11):
            resp = limited_client.post("/login", json=payload)
        assert resp.status_code == 429
        assert "Retry-After" in resp.headers

    def test_429_response_body_format(self, limited_client):
        payload = {"email": "test@example.com", "password": "password123"}
        for _ in range(11):
            resp = limited_client.post("/login", json=payload)
        data = resp.get_json()
        assert "error" in data
        assert "Too many requests" in data["error"]
        assert "retry_after" in data


class TestChatRateLimit:
    """Chat: 20 per minute per user."""

    def test_chat_allows_under_limit(self, limited_client):
        headers = {"Content-Type": "application/json", "X-User-Id": "rate_test_chat_user"}
        payload = {"message": "Hello"}
        for _ in range(20):
            resp = limited_client.post("/chat", json=payload, headers=headers)
            assert resp.status_code == 200

    def test_chat_blocks_over_limit(self, limited_client):
        headers = {"Content-Type": "application/json", "X-User-Id": "rate_test_chat_user2"}
        payload = {"message": "Hello"}
        for _ in range(20):
            limited_client.post("/chat", json=payload, headers=headers)
        resp = limited_client.post("/chat", json=payload, headers=headers)
        assert resp.status_code == 429

    def test_chat_limits_are_per_user(self, limited_client):
        """Two different users should each get their own 20/min quota."""
        payload = {"message": "Hello"}
        headers_a = {"Content-Type": "application/json", "X-User-Id": "user_isolation_a"}
        headers_b = {"Content-Type": "application/json", "X-User-Id": "user_isolation_b"}

        for _ in range(20):
            limited_client.post("/chat", json=payload, headers=headers_a)

        resp_a = limited_client.post("/chat", json=payload, headers=headers_a)
        assert resp_a.status_code == 429

        resp_b = limited_client.post("/chat", json=payload, headers=headers_b)
        assert resp_b.status_code == 200


class TestSignupRateLimit:
    """Signup: 5 per hour per IP."""

    def test_signup_blocks_over_limit(self, limited_client):
        for i in range(6):
            payload = {
                "name": f"User {i}",
                "email": f"user{i}@test.com",
                "password": "securepass123",
            }
            resp = limited_client.post("/signup", json=payload)
            if i < 5:
                assert resp.status_code == 201
            else:
                assert resp.status_code == 429


class TestDataEndpointRateLimit:
    """Add-cycle: 30 per minute per user."""

    def test_add_cycle_blocks_over_limit(self, limited_client):
        headers = {"Content-Type": "application/json", "X-User-Id": "rate_test_cycle_user"}
        for i in range(31):
            payload = {
                "startDate": f"2026-01-{str(i % 28 + 1).zfill(2)}",
                "endDate": f"2026-01-{str(min(i % 28 + 5, 28)).zfill(2)}",
            }
            resp = limited_client.post("/add-cycle", json=payload, headers=headers)
        assert resp.status_code == 429


class TestLimiterDisabledInTestMode:
    """Verify that the standard test suite (with limiter disabled) works."""

    def test_normal_tests_not_rate_limited(self):
        os.environ["FLASK_ENV"] = "testing"
        from middleware.rate_limit import limiter
        limiter.enabled = False

        from app import app as flask_app
        flask_app.config["TESTING"] = True
        client = flask_app.test_client()

        payload = {"email": "test@example.com", "password": "password123"}
        for _ in range(50):
            resp = client.post("/login", json=payload)
            assert resp.status_code == 200


class TestRetryAfterValues:
    """Verify Retry-After header contains correct duration per limit type."""

    def test_login_retry_after_is_60(self, limited_client):
        payload = {"email": "test@example.com", "password": "password123"}
        for _ in range(11):
            resp = limited_client.post("/login", json=payload)
        assert resp.headers["Retry-After"] == "60"

    def test_signup_retry_after_is_3600(self, limited_client):
        for i in range(6):
            payload = {
                "name": f"User {i}",
                "email": f"retry_user{i}@test.com",
                "password": "securepass123",
            }
            resp = limited_client.post("/signup", json=payload)
        assert resp.headers["Retry-After"] == "3600"


class TestDefaultLimit:
    """GET endpoints have 60/min default limit."""

    def test_health_check_has_default_limit(self, limited_client):
        for _ in range(60):
            resp = limited_client.get("/")
            assert resp.status_code == 200
        resp = limited_client.get("/")
        assert resp.status_code == 429
