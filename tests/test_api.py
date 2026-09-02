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
