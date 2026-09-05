"""
Unit & Integration Tests for AI Finance Controller FastAPI Backend
"""

import pytest
from fastapi.testclient import TestClient
from api import app, store

client = TestClient(app)


@pytest.fixture(autouse=True)
def mock_gemini(monkeypatch):
    def fake_generate(contents, config=None):
        return "Simulated AI Analysis and Diagnosis."
    monkeypatch.setattr("src.agent.generate_gemini_content", fake_generate)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "gemini_active" in data
    assert "model" in data


def test_get_dashboard_data():
    # Initial state when empty
    init_res = client.get("/api/data")
    assert init_res.status_code == 200

    # Load demo dataset
    demo_res = client.post("/api/load-demo")
    assert demo_res.status_code == 200

    response = client.get("/api/data")
    assert response.status_code == 200
    data = response.json()

    # Check Summary
    summary = data["summary"]
    assert summary["total_records"] == 160
    assert summary["matched_count"] == 110
    assert summary["exceptions_count"] == 40
    assert summary["duplicate_count"] == 10
    assert summary["match_rate"] > 70.0
    assert "cash_position" in summary
    assert "elapsed_seconds" in summary
    assert "records_per_second" in summary
    assert summary["records_per_second"] > 0

    # Check Records
    records = data["records"]
    assert len(records) == 160

    # Verify first record fields
    first = records[0]
    assert "transaction_id" in first
    assert "status" in first
    assert "confidence_score" in first
    assert "risk_level" in first
    assert "risk_score" in first
    assert "explanation" in first

    # Check Recent Insights
    assert len(data["recent_insights"]) > 0


def test_reconcile_tolerances():
    response = client.post("/api/reconcile", json={
        "amount_tolerance": 50,
        "date_tolerance": 2,
        "fuzzy_threshold": 60,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["summary"]["tolerances"]["amount_tolerance"] == 50
    assert data["summary"]["tolerances"]["date_tolerance"] == 2


def test_resolve_transaction():
    # Pick a known exception TX ID
    tx_id = "TX0002"
    response = client.post("/api/resolve", json={
        "transaction_id": tx_id,
        "action": "post_fee_adjustment",
        "note": "Fee variance booked to GL-6150",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["transaction_id"] == tx_id

    # Verify reflected in dashboard data
    get_res = client.get("/api/data")
    records = get_res.json()["records"]
    resolved_rec = next((r for r in records if r["transaction_id"] == tx_id), None)
    assert resolved_rec is not None
    assert resolved_rec["is_resolved"] is True


def test_ask_transaction_endpoint():
    # 1. Valid transaction explanation
    res = client.post("/api/ask/transaction/TX0002")
    assert res.status_code == 200
    data = res.json()
    assert data["transaction_id"] == "TX0002"
    assert "reply" in data
    assert len(data["reply"]) > 10
    assert "timestamp" in data

    # 2. Non-existent transaction returns 404
    res_404 = client.post("/api/ask/transaction/TX-NONEXISTENT-9999")
    assert res_404.status_code == 404
    detail = res_404.json()["detail"].lower()
    assert "does not exist" in detail or "not found" in detail


def test_ask_summary_endpoint():
    res = client.post("/api/ask/summary")
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert len(data["reply"]) > 10
    assert "timestamp" in data


def test_ask_forecast_endpoint():
    res = client.post("/api/ask/forecast")
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert len(data["reply"]) > 10
    assert "timestamp" in data


def test_ask_journal_endpoint():
    # 1. Valid journal entry explanation
    res_gl = client.get("/api/gl-entries")
    assert res_gl.status_code == 200
    entries = res_gl.json()
    first_j_id = entries[0]["Journal_ID"]

    res = client.post(f"/api/ask/journal/{first_j_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["entry_id"] == first_j_id
    assert "reply" in data
    assert len(data["reply"]) > 10
    assert "timestamp" in data

    # 2. Non-existent journal entry returns 404
    res_404 = client.post("/api/ask/journal/JE-NONEXISTENT-9999")
    assert res_404.status_code == 404
    assert "not found" in res_404.json()["detail"].lower()
