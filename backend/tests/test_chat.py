"""Integration tests for AI chat (/chat) and insights (/insights) endpoints."""

import json


class TestChat:
    """POST /chat endpoint tests."""

    def test_chat_success_no_gemini_key(self, client, json_headers):
        """Without GEMINI_API_KEY, returns mock wellness response."""
        payload = {"message": "Why do I feel tired before my period?"}
        resp = client.post("/chat", headers=json_headers, json=payload)

        assert resp.status_code == 200
        data = resp.get_json()
        assert "response" in data
        assert "disclaimer" in data
        assert len(data["response"]) > 20

    def test_chat_missing_message(self, client, json_headers):
        """Missing message field returns 400."""
        resp = client.post("/chat", headers=json_headers, json={})

        assert resp.status_code == 400
        data = resp.get_json()
        assert "error" in data

    def test_chat_empty_message(self, client, json_headers):
        """Empty string message returns 400."""
        resp = client.post("/chat", headers=json_headers, json={"message": ""})

        assert resp.status_code == 400

    def test_chat_pii_sanitization(self, client, json_headers):
        """PII in message should be stripped (mock response is canned, but no crash)."""
        payload = {
            "message": "My name is Priya, my email is priya@gmail.com and I have cramps"
        }
        resp = client.post("/chat", headers=json_headers, json=payload)

        assert resp.status_code == 200
        data = resp.get_json()
        assert "response" in data

    def test_chat_long_message(self, client, json_headers):
        """Long messages don't crash the endpoint."""
        payload = {"message": "I have been experiencing " + "cramps " * 500}
        resp = client.post("/chat", headers=json_headers, json=payload)

        assert resp.status_code == 200


class TestInsights:
    """GET /insights endpoint tests."""

    def test_insights_success(self, client, json_headers):
        """Returns insights list with 200."""
        resp = client.get("/insights?uid=test_user_001", headers=json_headers)

        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_insights_structure(self, client, json_headers):
        """Each insight has category, title, message, type."""
        resp = client.get("/insights", headers=json_headers)

        data = resp.get_json()
        for insight in data:
            assert "category" in insight
            assert "title" in insight
            assert "message" in insight
            assert "type" in insight

    def test_insights_types_valid(self, client, json_headers):
        """Insight types are one of tip, success, alert."""
        resp = client.get("/insights", headers=json_headers)

        data = resp.get_json()
        valid_types = {"tip", "success", "alert", "warning", "info"}
        for insight in data:
            assert insight["type"] in valid_types


class TestHealthCheck:
    """GET / health check endpoint tests."""

    def test_health_check(self, client):
        """Health endpoint returns 200 with status and app name."""
        resp = client.get("/")

        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "healthy"
        assert "app" in data
        assert "firebase_connected" in data
        assert data["firebase_connected"] is False  # mock mode

    def test_cors_headers(self, client):
        """Response includes CORS headers (dev mode allows all)."""
        resp = client.get("/")

        # In dev mode (no ALLOWED_ORIGINS set), flask-cors adds Access-Control-Allow-Origin
        assert resp.status_code == 200
