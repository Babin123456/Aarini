"""
Tests for cycle and symptom CRUD (edit/delete) endpoints.
"""


class TestUpdateCycle:
    """PUT /cycles/:id"""

    def test_update_cycle_success(self, client, auth_headers):
        create = client.post("/add-cycle", json={
            "startDate": "2026-03-01",
            "endDate": "2026-03-05",
        }, headers=auth_headers)
        assert create.status_code == 201
        cycle_id = create.get_json()["cycle"]["id"]

        resp = client.put(f"/cycles/{cycle_id}", json={
            "startDate": "2026-03-02",
            "endDate": "2026-03-06",
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert "prediction" in data
        assert data["cycle"]["startDate"] == "2026-03-02"

    def test_update_cycle_not_found(self, client, auth_headers):
        resp = client.put("/cycles/nonexistent_id", json={
            "startDate": "2026-03-01",
            "endDate": "2026-03-05",
        }, headers=auth_headers)
        assert resp.status_code == 404

    def test_update_cycle_invalid_dates(self, client, auth_headers):
        create = client.post("/add-cycle", json={
            "startDate": "2026-03-10",
            "endDate": "2026-03-14",
        }, headers=auth_headers)
        cycle_id = create.get_json()["cycle"]["id"]

        resp = client.put(f"/cycles/{cycle_id}", json={
            "startDate": "2026-03-14",
            "endDate": "2026-03-10",
        }, headers=auth_headers)
        assert resp.status_code == 400
        assert "endDate cannot be before startDate" in resp.get_json()["error"]

    def test_update_cycle_too_long(self, client, auth_headers):
        create = client.post("/add-cycle", json={
            "startDate": "2026-04-01",
            "endDate": "2026-04-05",
        }, headers=auth_headers)
        cycle_id = create.get_json()["cycle"]["id"]

        resp = client.put(f"/cycles/{cycle_id}", json={
            "startDate": "2026-04-01",
            "endDate": "2026-04-30",
        }, headers=auth_headers)
        assert resp.status_code == 400
        assert "14 days" in resp.get_json()["error"]


class TestDeleteCycle:
    """DELETE /cycles/:id"""

    def test_delete_cycle_success(self, client, auth_headers):
        create = client.post("/add-cycle", json={
            "startDate": "2026-05-01",
            "endDate": "2026-05-05",
        }, headers=auth_headers)
        cycle_id = create.get_json()["cycle"]["id"]

        resp = client.delete(f"/cycles/{cycle_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert "prediction" in resp.get_json()

    def test_delete_cycle_not_found(self, client, auth_headers):
        resp = client.delete("/cycles/nonexistent_id", headers=auth_headers)
        assert resp.status_code == 404

    def test_delete_cycle_removes_from_list(self, client, auth_headers):
        create = client.post("/add-cycle", json={
            "startDate": "2026-06-01",
            "endDate": "2026-06-05",
        }, headers=auth_headers)
        cycle_id = create.get_json()["cycle"]["id"]

        client.delete(f"/cycles/{cycle_id}", headers=auth_headers)
        cycles_resp = client.get("/cycles", headers=auth_headers)
        cycle_ids = [c["id"] for c in cycles_resp.get_json()["cycles"]]
        assert cycle_id not in cycle_ids


class TestUpdateSymptom:
    """PUT /symptoms/:id"""

    def test_update_symptom_success(self, client, auth_headers):
        from app import mock_symptoms
        uid = "test_user_001"
        mock_symptoms[uid] = [{"id": "sym_1", "type": "Cramps", "severity": "Low", "date": "2026-05-20"}]

        resp = client.put("/symptoms/sym_1", json={
            "type": "Headache",
            "severity": "High",
            "date": "2026-05-21",
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["symptom"]["type"] == "Headache"
        assert data["symptom"]["severity"] == "High"

    def test_update_symptom_not_found(self, client, auth_headers):
        resp = client.put("/symptoms/nonexistent_id", json={
            "type": "Headache",
            "severity": "High",
            "date": "2026-05-21",
        }, headers=auth_headers)
        assert resp.status_code == 404

    def test_update_symptom_missing_fields(self, client, auth_headers):
        resp = client.put("/symptoms/sym_1", json={
            "type": "Headache",
        }, headers=auth_headers)
        assert resp.status_code == 400


class TestDeleteSymptom:
    """DELETE /symptoms/:id"""

    def test_delete_symptom_success(self, client, auth_headers):
        from app import mock_symptoms
        uid = "test_user_001"
        mock_symptoms[uid] = [{"id": "sym_del_1", "type": "Bloating", "severity": "Medium", "date": "2026-05-22"}]

        resp = client.delete("/symptoms/sym_del_1", headers=auth_headers)
        assert resp.status_code == 200

    def test_delete_symptom_not_found(self, client, auth_headers):
        resp = client.delete("/symptoms/nonexistent_id", headers=auth_headers)
        assert resp.status_code == 404

    def test_delete_symptom_removes_entry(self, client, auth_headers):
        from app import mock_symptoms
        uid = "test_user_001"
        mock_symptoms[uid] = [
            {"id": "sym_keep", "type": "Fatigue", "severity": "Low", "date": "2026-05-23"},
            {"id": "sym_remove", "type": "Acne", "severity": "High", "date": "2026-05-24"},
        ]

        client.delete("/symptoms/sym_remove", headers=auth_headers)
        remaining_ids = [s["id"] for s in mock_symptoms[uid]]
        assert "sym_remove" not in remaining_ids
        assert "sym_keep" in remaining_ids
