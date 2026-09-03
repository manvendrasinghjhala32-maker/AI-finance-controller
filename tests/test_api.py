"""
Unit & Integration Tests for AI Finance Controller FastAPI Backend
"""

import pytest
from fastapi.testclient import TestClient
from api import app, store

client = TestClient(app)


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


def test_chat_copilot():
    response = client.post("/api/chat", json={
        "message": "Which merchants have the highest amount variance and how should we recover it?"
    })
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert len(data["reply"]) > 10


def test_gl_entries_endpoint():
    response = client.get("/api/gl-entries")
    assert response.status_code == 200
    entries = response.json()
    assert len(entries) > 0
    first_je = entries[0]
    assert "Journal_ID" in first_je
    assert "Account_Code" in first_je
    assert "Debit (₹)" in first_je
    assert "Credit (₹)" in first_je


def test_forecast_endpoint():
    response = client.get("/api/forecast")
    assert response.status_code == 200
    forecast = response.json()
    assert len(forecast) == 30
    assert forecast[0]["Day"] == 1
    assert forecast[-1]["Day"] == 30


def test_export_endpoints():
    for rtype in ["reconciliation", "exceptions", "duplicates", "gl_entries", "forecast"]:
        res = client.get(f"/api/export/{rtype}")
        assert res.status_code == 200
        assert "text/csv" in res.headers["content-type"]


def test_export_adjustments_endpoint():
    # Ensure a resolved item exists
    tx_id = "TX0002"
    client.post("/api/resolve", json={
        "transaction_id": tx_id,
        "action": "post_fee_adjustment",
        "note": "Fee variance booked to GL-6150",
    })

    res = client.get("/api/export/adjustments")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    content = res.text
    assert "transaction_id" in content
    assert "resolution_action" in content
    assert "TX0002" in content
    assert "post_fee_adjustment" in content


def test_reconcile_dynamic_tolerances_impact():
    """Verify that changing tolerances in API actually changes classification counts."""
    # Set tight tolerances
    res_tight = client.post("/api/reconcile", json={
        "amount_tolerance": 0,
        "date_tolerance": 0,
        "fuzzy_threshold": 95,
    })
    assert res_tight.status_code == 200
    tight_matched = res_tight.json()["summary"]["matched_count"]

    # Set loose tolerances
    res_loose = client.post("/api/reconcile", json={
        "amount_tolerance": 1000,
        "date_tolerance": 10,
        "fuzzy_threshold": 50,
    })
    assert res_loose.status_code == 200
    loose_matched = res_loose.json()["summary"]["matched_count"]

    assert loose_matched > tight_matched, f"Loose tolerance matches ({loose_matched}) should exceed tight ({tight_matched})"

    # Reset back to default benchmark tolerances
    client.post("/api/reconcile", json={
        "amount_tolerance": 50,
        "date_tolerance": 2,
        "fuzzy_threshold": 60,
    })
