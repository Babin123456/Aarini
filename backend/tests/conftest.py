"""
Shared fixtures for Aarini backend integration tests.

All tests run in MOCK MODE (Firebase not initialized) so no external
services are required. The Flask test client is configured once per
session and reused across test modules.
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.pop("FIREBASE_SERVICE_ACCOUNT_JSON", None)
os.environ.pop("FIREBASE_CREDENTIALS_PATH", None)
os.environ["FLASK_ENV"] = "testing"


@pytest.fixture(scope="session")
def app():
    from middleware.rate_limit import limiter
    limiter.enabled = False

    from app import app as flask_app

    flask_app.config["TESTING"] = True
    return flask_app


@pytest.fixture(scope="session")
def client(app):
    return app.test_client()


@pytest.fixture()
def auth_headers():
    """Headers simulating an authenticated user in mock mode."""
    return {"Content-Type": "application/json", "X-User-Id": "test_user_001"}


@pytest.fixture()
def json_headers():
    """Unauthenticated JSON headers."""
    return {"Content-Type": "application/json"}
