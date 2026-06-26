"""Integration tests for account management endpoints (/delete-account)."""


class TestDeleteAccount:
    """DELETE /delete-account endpoint tests."""

    def test_delete_account_success(self, client, auth_headers):
        """Confirmed deletion returns 200 with deleted collections."""
        resp = client.delete(
            "/delete-account", headers=auth_headers, json={"confirm": True}
        )

        assert resp.status_code == 200
        data = resp.get_json()
        assert "message" in data
        assert "deleted" in data["message"].lower()
        assert "deletedCollections" in data
        assert "cycles" in data["deletedCollections"]

    def test_delete_account_without_confirmation(self, client, auth_headers):
        """Missing confirm field returns 400."""
        resp = client.delete("/delete-account", headers=auth_headers, json={})

        assert resp.status_code == 400
        data = resp.get_json()
        assert "error" in data
        assert "confirm" in data["error"].lower()

    def test_delete_account_confirm_false(self, client, auth_headers):
        """confirm: false returns 400."""
        resp = client.delete(
            "/delete-account", headers=auth_headers, json={"confirm": False}
        )

        assert resp.status_code == 400

    def test_delete_account_no_body(self, client, auth_headers):
        """No request body returns 400."""
        resp = client.delete("/delete-account", headers=auth_headers)

        assert resp.status_code == 400
