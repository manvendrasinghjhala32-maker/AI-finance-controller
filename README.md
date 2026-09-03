# 🏦 AI Finance Controller — Tactical Command Center

> **Autonomous Multi-Source Reconciliation & Financial Intelligence Platform**  
> Reconciles multi-source bank transactions, invoices, and payment records with auditable exception handling, dynamic tolerance controls, double-entry GL adjustment proposals, and AI-powered financial root-cause analysis.

---

## 📊 Benchmark Results

| Metric | Result |
|---|---:|
| Bank records processed | 160 |
| Duplicate records | 10 |
| Clean records evaluated | 150 |
| Throughput | ~1,000 records/sec |
| Correct classifications | 150/150 |
| Classification accuracy | 100% |
| Invoice linking accuracy | 100% |
| Clean matches | 110 |
| Amount mismatches | 15 |
| Date mismatches | 15 |
| Missing invoices | 10 |
| Clean match rate | 73.3% |

> **Understanding Match Rate vs. Classification Accuracy:**  
> The benchmark intentionally contains known real-world financial exceptions (amount variances, timing offsets, duplicate transmissions, and missing documentation). Therefore, the **clean match rate is 73.3% (110/150)**, while **classification accuracy (100%)** measures whether those exceptions were correctly identified and categorized. The reconciliation engine correctly classified all 150 evaluated records.

---

## 🔍 Independent Validation

To address the risk of self-referential benchmarking — where the same logic that
generates the test data also defines what counts as a "correct" match — the
reconciliation engine was additionally scored against a 40-record adversarial
dataset generated independently by a separate AI tool (Google Antigravity),
with no access to this project's source code or matching logic.

| Metric | Result |
|---|---:|
| Independent benchmark records | 40 |
| Correct classifications | 39/40 |
| Accuracy | 97.5% |

This dataset and its ground truth key are included at `data/antigravity test/`
for independent reproduction. The single miss involves a duplicate-transaction
edge case with an ambiguous ground-truth label.

---

## 🏛️ System Architecture

```text
Bank Transactions & Gateway Feeds
                ↓
  Data Ingestion & Normalization
  (Multi-tier Regex Scoring, Date & Currency Standardization)
                ↓
      Reconciliation Engine
        ├── Multi-Pass Reference Matching
        ├── Amount Validation (Parametric Tolerance)
        ├── Date Drift Validation (Parametric Tolerance)
        ├── RapidFuzz Merchant & Acronym Matching
        ├── Payment Gateway Validation
        └── Multi-Factor Duplicate Detection
                ↓
   Match / Exception Classification
                ↓
     AI Intelligence Layer (Google Gemini GenAI SDK)
        ├── Forensic Exception Explanations
        ├── Multi-Factor Risk Interpretation
        ├── Interactive Financial Copilot (Natural-Language Q&A)
        └── Executive Audit Summaries
                ↓
    Tactical Finance Command Hub
        ├── Real-Time Exception Investigation
        ├── 30-Day Scenario-Based Cash Forecasting
        └── Proposed Double-Entry Accounting Adjustments
                ↓
  Human-in-the-Loop Review & Resolution
```

### Core Architecture Principles
- **Deterministic & Auditable**: The core matching and classification logic is 100% deterministic and rule-based, ensuring every classification is reproducible and compliant with accounting standards.
- **Fuzzy Name Resolution**: RapidFuzz multi-ratio token matching resolves abbreviations, acronyms, and vendor entity aliases without guessing amounts or dates.
- **AI Forensic Layer**: Google Gemini GenAI SDK provides natural-language root-cause explanations, risk context, and copilot Q&A. Gemini does not replace deterministic matching; it explains and contextualizes exceptions for finance teams.
- **Human-in-the-Loop Control**: System workflow follows: **Detect → Explain → Propose → Human Review → Resolve**. Accounting adjustments are generated as proposals requiring human approval prior to general ledger posting.

---

## ⚡ Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+ (for frontend development)

### 1. Setup Environment
```bash
# Clone the repository
git clone https://github.com/manvendrasinghjhala32-maker/AI-finance-controller.git
cd AI-finance-controller

# Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Configure Environment (Optional for AI features)
```bash
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY if using Gemini features:
# GOOGLE_API_KEY=your_api_key_here
```
> *Note: If `GOOGLE_API_KEY` is not provided, the application runs fully with local deterministic fallback logic and complete reconciliation capabilities.*

### 3. Build & Run Application

#### Option A: Production Web App (Single Command)
```bash
# Install frontend dependencies and build assets
cd frontend && npm install && npm run build && cd ..

# Launch production FastAPI server hosting the React Command Center
python api.py
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

#### Option B: Development Mode (Hot-Reloading)
```bash
# Terminal 1: Backend API Engine
python api.py

# Terminal 2: React Frontend (Vite)
cd frontend
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

#### Option C: CLI Audit Report
```bash
python main.py
```

### 4. Run Automated Test Suite
```bash
pytest tests/ -v
```

---

## 🖥️ Command Center Modules

1. **Reconciliation Overview & Exception Ledger**:
   - Multi-factor confidence match scores (0–100%) and risk level categorizations.
   - Granular exception filtering (`All Exceptions`, `Amount Mismatch`, `Date Drift`, `Missing Invoice`, `Duplicates`, `Resolved`).
   - Detailed side-by-side transaction vs. invoice comparison math.
2. **Dynamic Tolerance Controls**:
   - Runtime configuration for amount tolerance (₹), date drift tolerance (days), and fuzzy threshold (%).
   - Instantly updates matching behavior across all uploaded datasets.
3. **Ground-Truth Benchmark Evaluation**:
   - Independent verification dashboard comparing reconciliation predictions against ground-truth keys.
   - Explicitly displays Classification Accuracy (Status) and Invoice ID Linkage Accuracy as separate metrics.
4. **Proposed Accounting Journal Entries**:
   - Balanced double-entry adjustments for fee variances, timing differences, and clearing accounts.
   - Human-in-the-loop review interface with single-click CSV export for QuickBooks, Zoho, Tally, or NetSuite.
5. **30-Day Scenario-Based Cash Forecast**:
   - Projected cash flow trajectories (Base, Conservative, Optimistic) using historical transaction payment patterns and scenario assumptions.
6. **AI Finance Copilot**:
   - Cross-table natural language Q&A, variance drilldowns, and executive audit summaries powered by the Google Gemini GenAI SDK.

---

## ⚠️ Limitations & Project Boundaries

- **Synthetic Financial Data**: Benchmark tests use synthetic multi-source financial datasets designed to rigorously simulate real-world variance and edge cases.
- **Deterministic Reconciliation**: Financial matching relies strictly on deterministic rules, normalized references, and RapidFuzz token scoring for auditability. Gemini does not make arbitrary status determinations.
- **Scenario-Based Forecasting**: The 30-day liquidity projections use historical transaction timing patterns and deterministic scenario models rather than black-box machine learning models.
- **Proposed Accounting Entries**: Generated general ledger journal entries are proposed adjustments requiring human review and approval before final posting.
- **Integration Scope**: This repository demonstrates the core intelligence, ingestion, and reconciliation engine; direct live API connections to core banking rails or production ERP systems are out of scope.

---

## 🛠️ Technology Stack

- **Backend**: FastAPI, Uvicorn, Pydantic v2, Python-Multipart
- **Data & Reconciliation Engine**: Pandas, RapidFuzz
- **AI Intelligence**: Google Gemini GenAI SDK (`google-genai` / `google-generativeai`)
- **Frontend**: React 18, Vite 6, Tailwind CSS 3, Lucide React icons
- **Testing**: Pytest, FastAPI TestClient