# AI Finance Controller

> **AI-Assisted Multi-Source Financial Reconciliation & Exception Management**  
> An AI-assisted finance operations system that automates multi-source reconciliation, identifies exceptions, helps finance teams resolve them, and produces an auditable record of the resolution.

**Live Deployment:** [https://ai-finance-controller-ten.vercel.app/](https://ai-finance-controller-ten.vercel.app/)

---

## 🎯 Overview

This project addresses the core financial operations challenge:

> **"Build an agent that closes one finance-ops loop across a 50+ record batch of synthetic data, reporting its match rate and the exceptions it could not resolve."**

### The Finance-Ops Loop Closed
In standard accounting and treasury operations, closing the accounts receivable and accounts payable ledger requires continuous reconciliation across multiple decoupled records. The **AI Finance Controller** automates this entire loop:

1. **Multi-Source Ingestion & Normalization**: Ingests bank transaction feeds, billing invoices, and payment gateway settlements in varied formats and column schemas.
2. **Deterministic Reconciliation**: Evaluates multi-pass reference matching, normalized string alignment, parametric amount tolerances, date transit windows, and vendor name fuzzy similarity.
3. **Automated Exception Detection**: Separates verified matches from discrepancies, isolating duplicates and categorizing mismatches.
4. **Post-Reconciliation Benchmark Evaluation**: Evaluates predicted matching and classification against ground-truth keys *after* reconciliation is complete without leaking ground-truth labels during prediction.
5. **AI Root-Cause Diagnosis & Natural-Language Q&A**: Employs Google Gemini to analyze exception patterns, formulate forensic root-cause explanations, synthesize executive summaries, and answer ad-hoc controller queries.
6. **Human-in-the-Loop Resolution**: Provides finance controllers with actionable resolution workflows (e.g., booking fee adjustments, accepting timing offsets, dispatching billing inquiries) without silently mutating source data.
7. **Audit-Ready Export**: Generates exportable CSV audit logs, balanced double-entry General Ledger (GL) adjustments, and 30-day liquidity forecasts.

---

## ⚠️ Problem

Manual reconciliation remains one of the largest operational bottlenecks in finance teams:
- **Disparate Data Sources**: Data originates from distinct systems—core banking statements, internal invoicing ledgers, and third-party payment gateways—each with different schema conventions and export structures.
- **Data Inconsistencies**: Financial records frequently exhibit minor amount variances (bank interchange fees, early payment discounts), date offsets (weekend processing delays, clearing transit times), reference typos, and merchant description variations (e.g., *"Amazon Pay India Pvt Ltd"* vs. *"AMZN PAY"*).
- **Duplicate Records**: Batch resubmissions and network retry storms introduce duplicate entries that distort cash visibility if not isolated.
- **Manual Investigation Overhead**: Finance controllers spend hours manually investigating unmatched deposits to determine why an invoice was not linked.
- **Auditability & Accuracy Requirements**: Finance operations require 100% deterministic, reproducible matching logic and an auditable trail for every exception resolution.

---

## 💡 Solution

The system implements an end-to-end, auditable workflow separating deterministic classification from AI advisory intelligence:

```text
Bank Feed CSV + Invoice Ledger CSV + Payment Gateway CSV
                           │
                           ▼
               Data Validation & Ingestion
                           │
                           ▼
         Deterministic Reconciliation Engine
  (Multi-pass reference matching, RapidFuzz vendor scoring,
            parametric amount & date tolerances)
                           │
                           ▼
          Match / Exception Classification
     ├── MATCH (Cleanly reconciled records)
     ├── AMOUNT_MISMATCH (Fee or discount variance)
     ├── DATE_MISMATCH (Transit / timing delay)
     ├── MISSING_INVOICE (Unbilled cash deposit)
     └── DUPLICATE (Isolated duplicate transaction)
                           │
                           ▼
            Benchmark Ground-Truth Evaluation
       (Post-reconciliation scoring & verification)
                           │
                           ▼
       AI Intelligence Layer (Google Gemini / GenAI SDK)
  (Forensic root-cause diagnosis, executive summaries, Q&A)
                           │
                           ▼
         Human-in-the-Loop Review & Resolution
  (Post fee adjustment, accept date drift, request AP invoice)
                           │
                           ▼
       Audit-Ready Resolution Export & GL Journals
```

> **Deterministic Core + AI Advisory Intelligence:**  
> The financial matching, deduplication, and exception classification logic is **100% deterministic and rule-based**, guaranteeing reproducible, mathematically auditable outcomes. Google Gemini operates as an **advisory intelligence layer**, generating human-readable forensic explanations, executive briefs, and natural-language financial Q&A.

---

## ✨ Key Features

| Capability | Description |
|---|---|
| **Multi-Source Reconciliation** | Concurrently matches bank feeds, billing ledger invoices, and payment gateway records. |
| **Duplicate Detection** | Automatically detects and isolates duplicate transactions by `(reference, amount, date)` and batch identifiers. |
| **Merchant Similarity Matching** | RapidFuzz multi-ratio token scoring and acronym expansion (e.g., *"SBI"* $\leftrightarrow$ *"State Bank of India"*) with corporate entity normalization. |
| **Amount Mismatch Detection** | Identifies fee deductions, early payment discounts, and currency variances exceeding parametric thresholds. |
| **Date Mismatch Detection** | Detects calendar drift between bank value dates and invoice issue dates outside configured tolerance windows. |
| **Missing Invoice Detection** | Identifies unbilled cash deposits and links gateway settlement status for triage. |
| **Ground-Truth Benchmark Evaluation** | Built-in evaluator scoring classification accuracy and invoice linkage accuracy against ground truth. |
| **Record-Level Audit Trail** | Full tracking of match reasons, amount deltas, date deltas, and merchant similarity scores for every record. |
| **AI Exception Explanations** | Google Gemini provides forensic root-cause analysis and recommended accounting remediation paths. |
| **AI Financial Q&A** | Interactive Co-Pilot allowing controllers to ask natural-language questions about transactions, summaries, forecasts, and journal entries. |
| **Executive Summaries** | AI-generated executive briefs detailing operational match efficiency, material risk, and liquidity exposure. |
| **30-Day Liquidity Forecasting** | Forward cash flow projections across Base, Conservative, and Optimistic scenarios accounting for clearing cycles. |
| **Human-in-the-Loop Resolution** | Actionable resolution interface enabling controllers to apply and record remediation decisions. |
| **Non-Destructive Overrides** | Resolutions are stored in a distinct override state; raw source files are never silently overwritten. |
| **CSV Audit & GL Export** | One-click export for reconciliation reports, exception reports, duplicate logs, resolution audit trails, and balanced double-entry GL journals. |
| **Runtime Throughput Measurement** | Real-time tracking of reconciliation engine processing speed (records/second and elapsed execution time). |

---

## 📊 Benchmark & Evaluation

The benchmark dataset rigorously tests the engine against real-world finance edge cases. Ground truth data is evaluated **strictly after reconciliation** and is never supplied to the reconciliation engine during prediction.

### Main Synthetic Benchmark (160 Records)

| Metric | Result |
|---|---:|
| **Bank records processed** | **160** |
| **Duplicate records detected & isolated** | **10** |
| **Ground-truth records evaluated** | **150** |
| **Clean matches (`MATCH`)** | **110** |
| **Amount mismatches (`AMOUNT_MISMATCH`)** | **15** |
| **Date mismatches (`DATE_MISMATCH`)** | **15** |
| **Missing invoices (`MISSING_INVOICE`)** | **10** |
| **Clean match rate** | **73.3%** (110 / 150) |
| **Classification accuracy** | **100.0%** (150 / 150) |
| **Invoice ID linkage accuracy** | **100.0%** (150 / 150) |

> **Understanding Match Rate vs. Classification Accuracy:**  
> The benchmark dataset intentionally contains known financial exceptions (amount variances, timing offsets, duplicate transmissions, and missing documentation). Therefore, the **clean match rate is 73.3% (110/150)**, while the **classification accuracy is 100.0% (150/150)** because the engine correctly identified, categorized, and isolated every single clean match and exception.

### Independent Adversarial Validation Dataset (40 Records)

To address the risk of self-referential benchmarking—where the same assumptions that generate test data define what counts as a match—the engine was scored against a 40-record adversarial dataset generated independently at `data/antigravity test/` with no access to the matching code:

| Metric | Result |
|---|---:|
| **Independent benchmark records** | **40** |
| **Correct classifications** | **39 / 40** |
| **Classification accuracy** | **97.5%** |

*(The two benchmark scores represent separate evaluations and are not combined into a single composite metric.)*

---

## 🔍 Exception Categories

The system adheres to an honest disclosure model: unresolved discrepancies are surfaced and categorized rather than forced into false matches.

- **`MATCH`**: Reconciled successfully across reference, amount, and date within active tolerance thresholds.
- **`AMOUNT_MISMATCH`**: Matching invoice exists, but the bank transaction amount differs (e.g., payment gateway interchange fees, early payment discounts, tax deductions).
- **`DATE_MISMATCH`**: Matching invoice exists, but transaction posting date exceeds the configured transit window (e.g., weekend clearing delay, multi-day wire transit).
- **`MISSING_INVOICE`**: Bank deposit received with no corresponding billing invoice in the ledger (unbilled customer deposit or unapplied cash intake).
- **`DUPLICATE`**: Duplicate transaction detected by identical `(reference, amount, date)` or batch marker; isolated immediately to prevent double-counting cash.

> **Honest Exception Reporting:**  
> The system explicitly reports unresolved and exception cases instead of hiding them, fulfilling the challenge requirement for a clear, auditable exception register.

---

## ⚡ Throughput

The backend API instruments high-precision execution timing for the core reconciliation engine:
- **Engine Processing Time**: ~0.005 – 0.015 seconds for a 160-record batch.
- **Reconciliation Engine Throughput**: **~1,000+ records/second** on standard hardware.

> **Scope Note:**  
> This throughput metric measures the deterministic reconciliation processing stage (data normalization, duplicate detection, multi-pass matching, and RapidFuzz scoring). It does not claim to measure full end-to-end network latency, file upload transfer time, or external LLM API roundtrip duration.

---

## ⚙️ Reconciliation Logic

The deterministic reconciliation engine executes across 8 structured steps:

1. **Duplicate Detection**: First-pass scan detecting explicit duplicate markers (`_DUP`) and matching exact tuples of `(reference, amount, date)` with differing transaction IDs, isolating them before invoice matching.
2. **Direct Reference Matching**: Exact key matching between transaction reference codes and invoice references or primary invoice IDs.
3. **Normalized Canonical Reference Matching**: Aligns references by stripping non-alphanumeric punctuation and trimming leading zeros (e.g., `INV-00092` $\leftrightarrow$ `INV92`).
4. **Composite Multi-Field Fallback**: If reference matching fails, evaluates candidates with matching amounts (within tolerance), high merchant description similarity, and date proximity within a 14-day window.
5. **Parametric Amount Tolerance**: Evaluates $| \text{Bank Amount} - \text{Invoice Amount} | \le \text{Amount Tolerance}$ (default: ₹0).
6. **Parametric Date Tolerance**: Evaluates $| \text{Bank Date} - \text{Invoice Date} | \le \text{Date Tolerance Days}$ (default: 0 days).
7. **RapidFuzz Merchant Similarity**: Token sort and token set fuzzy scoring with acronym expansion (e.g., *"HDFC"* $\leftrightarrow$ *"Housing Development Finance Corporation"*) and corporate stop-word stripping (*Corp, Ltd, Pvt, LLC*).
8. **Exception Classification & Payment Cross-Validation**: Assigns final classification status and annotates gateway settlement status (`settled` vs. `pending`).

---

## 🤖 AI Intelligence Layer

The platform integrates the **Google GenAI SDK** (powered by Gemini models such as `gemini-3.5-flash`) as an advisory intelligence layer:

- **Forensic Exception Explanations**: Generates contextual explanations diagnosing whether an amount mismatch stems from gateway fees, merchant discounts, or tax variances, accompanied by recommended GL postings.
- **Executive Summaries**: Synthesizes high-level management briefs analyzing total financial variance exposure, unbilled cash risk, and accounting priorities.
- **Natural-Language Financial Q&A**: Powers an interactive Co-Pilot responding to questions regarding individual transactions, macro reconciliation summaries, cash forecasts, and journal entries.
- **Deterministic Fallback Engine**: If `GOOGLE_API_KEY` is not configured or external API connectivity is unavailable, the application seamlessly activates built-in deterministic fallback logic for all summaries and explanations without crashing.

---

## 🛡️ Human-in-the-Loop Resolution Workflow

The resolution module provides an auditable, non-destructive workflow for finance teams:

```text
Flagged Exception ──► Controller Inspection ──► Select Action ──► Record in State Store ──► Export Audit Log
```

1. **Review**: The controller inspects flagged exception details, confidence scores, and AI root-cause diagnostics.
2. **Action Selection**: The controller selects a structured remediation action:
   - `post_fee_adjustment`: Proposes an adjusting entry to GL-6150 (Bank & Gateway Fees).
   - `accept_date_drift`: Acknowledges normal transit timing and reclassifies Accounts Receivable.
   - `request_bill_ap`: Routes unbilled cash to Suspense (GL-2250) and generates an AP billing request.
   - `manual_override`: Records custom controller documentation and notes.
3. **Non-Destructive Storage**: Resolution overrides are tracked in a dedicated session state layer. **Original source CSV data is never silently modified or overwritten.**
4. **Audit Trail Export**: The complete resolution log—containing transaction IDs, original amounts, deltas, applied actions, notes, and timestamps—is exportable as a standalone audit CSV.

---

## 🏛️ System Architecture

```text
                    React 18 + Tailwind CSS Frontend
                                   │
                                   │ REST API (JSON / Multipart)
                                   ▼
                       FastAPI Backend (api.py)
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        ▼                          ▼                          ▼
 Universal Ingestion      Reconciliation Engine       AI Intelligence
(CSV / TSV / Excel)       ├── Duplicate Detection    (Google Gemini SDK)
├── Bank Feeds            ├── Multi-Pass Matching    ├── Root-Cause Diagnosis
├── Billing Invoices      ├── Tolerance Controls     ├── Executive Summaries
└── Gateway Settlements   └── Ground Truth Eval      └── Financial Q&A
        │                          │                          │
        └──────────────────────────┼──────────────────────────┘
                                   │
                                   ▼
                      Resolution & Reporting Hub
        ├── Non-Destructive Resolution State Store
        ├── Balanced Double-Entry GL Journal Generation
        ├── 30-Day Scenario-Based Liquidity Forecasting
        └── CSV Export Hub (Reconciliation, Exceptions, GL, Audit)
```

---

## 💻 Technology Stack

- **Frontend**: React 18, Vite 6, Tailwind CSS 3, Lucide React icons
- **Backend**: Python 3.10+, FastAPI, Uvicorn, Pydantic v2, Python-Multipart
- **Data & Matching Engine**: Pandas, RapidFuzz
- **AI Intelligence**: Google GenAI SDK (`google-genai`), Gemini 3.5 Flash
- **Testing**: Pytest, FastAPI TestClient
- **Environment Management**: python-dotenv
- **Deployment**: Vercel (Frontend), FastAPI / Uvicorn (Backend)

---

## 📁 Project Structure

```text
AI-finance-controller/
├── api.py                  # FastAPI application, REST endpoints, and session management
├── main.py                 # CLI entrypoint for running reconciliation and terminal reports
├── requirements.txt        # Python dependency manifest
├── README.md               # Project documentation and benchmark report
├── src/
│   ├── __init__.py         # Package initialization
│   ├── agent.py            # Gemini AI integration, risk scoring, GL generation & forecasting
│   ├── config.py           # Configuration constants, tolerances, and environment settings
│   ├── guardrails.py       # Data validation, integrity checks, and bounds enforcement
│   ├── ingestion.py        # Universal tabular ingestion, column mapping, date/currency parsers
│   ├── models.py           # Pydantic data schemas (BankTransaction, Invoice, Payment, Result)
│   ├── reconciler.py       # Deterministic matching engine, deduplication, and accuracy scoring
│   └── reporter.py         # CSV report generators and console summary formatters
├── frontend/
│   ├── package.json        # Frontend dependencies and npm scripts
│   ├── vite.config.js      # Vite build configuration
│   ├── tailwind.config.js  # Tailwind CSS styling configuration
│   └── src/
│       ├── App.jsx         # Main application shell and tab routing
│       └── components/     # UI modules (Command Center, Upload, Benchmark, GL, Forecast, etc.)
├── data/                   # Benchmark and validation datasets
│   ├── dataset 1/          # Primary synthetic benchmark (160 bank records, 140 invoices)
│   ├── antigravity test/   # Independent 40-record validation benchmark
│   ├── holdout/            # Holdout test files for edge-case verification
│   └── wrong format/       # Non-standard schema and header test datasets
├── output/                 # Generated reconciliation, exception, and duplicate CSV reports
└── tests/                  # Pytest automated test suite (reconciliation, API, ingestion, agent)
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher (for frontend development/building)

### 1. Clone & Set Up Environment

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

### 2. Configure Environment Variables (Optional)

```bash
# Create .env from template
cp .env.example .env
```
Add your Google Gemini API key to `.env` to enable live AI features:
```env
GOOGLE_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-3.5-flash
```
*(Note: If `GOOGLE_API_KEY` is not provided, the application runs fully with local deterministic fallback logic and complete reconciliation capabilities.)*

### 3. Run the Application

#### Option A: Production Web App (Single Command)
```bash
# Build frontend assets and launch FastAPI server
cd frontend && npm install && npm run build && cd ..
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

---

## 🧪 Testing

The repository contains unit and integration tests covering reconciliation logic, tolerance controls, data ingestion, API routes, and agent fallbacks:

```bash
# Run the complete test suite
pytest tests/ -v
```

### Key Test Coverage:
- `tests/test_reconciler.py`: Validates 100% benchmark classification accuracy, duplicate detection, RapidFuzz scoring, holdout benchmarks, and runtime tolerance adjustments.
- `tests/test_ingestion.py`: Verifies multi-format tabular ingestion, date parsing, and schema normalization.
- `tests/test_api.py`: Tests FastAPI endpoints, session caching, and resolution overrides.
- `tests/test_agent.py`: Verifies risk calculation, balanced double-entry GL journal balancing ($\Sigma\text{Debits} = \Sigma\text{Credits}$), cash forecasting, and offline AI fallback behavior.
- `tests/test_reporter.py`: Tests CSV report generation and cash position computation.

---

## 📋 Example Operational Walkthrough

1. **Upload Files**: Upload bank statements, invoices, and optional payment settlement CSVs via the web interface or load the built-in demo dataset.
2. **Run Reconciliation**: The engine processes all records, calculating match rates, variance totals, and isolating duplicates.
3. **Review Exceptions**: Inspect flagged items across dedicated exception tabs (`Amount Mismatch`, `Date Drift`, `Missing Invoice`, `Duplicates`).
4. **Inspect Discrepancies**: Review side-by-side mathematical deltas, confidence scores, and vendor similarity metrics.
5. **Consult AI Co-Pilot**: Request AI explanations for specific transactions or review the executive summary.
6. **Apply Resolutions**: Choose resolution actions (e.g., booking fee adjustments or accepting timing drift).
7. **Export Audit Reports**: Download reconciliation summaries, exception logs, GL journal adjustments, and resolution audit records in CSV format.

---

## 📌 Scope & Limitations

- **Synthetic Financial Data**: Benchmark tests use synthetic multi-source financial datasets designed to simulate real-world variance and edge cases.
- **Deterministic Reconciliation**: Financial matching relies strictly on deterministic rules, normalized references, and RapidFuzz scoring; Gemini does not make arbitrary match classifications.
- **Advisory AI Layer**: AI-generated root-cause explanations and journal suggestions are advisory; final ledger adjustments require human approval.
- **Non-Destructive Storage**: Exception resolutions do not physically overwrite raw input files.
- **Throughput Boundary**: Throughput metrics measure core reconciliation engine compute time rather than end-to-end network latency.
- **Core Banking Rails**: Direct live connections to banking APIs or enterprise ERP systems are outside the current prototype scope.

---

## 🔮 Future Improvements

- [ ] Persistent production database (PostgreSQL with SQLAlchemy / Alembic migrations).
- [ ] Enterprise Role-Based Access Control (RBAC) and SSO/SAML authentication.
- [ ] Direct bidirectional ERP connectors (QuickBooks Online, NetSuite, SAP, Xero).
- [ ] Automated scheduled reconciliation via background cron jobs.
- [ ] Multi-currency conversion with real-time FX rate integration.

---

## 🏁 Conclusion

The **AI Finance Controller** delivers an automated, transparent, and auditable solution to finance operations:

$$\text{Automated Reconciliation} + \text{Measurable Accuracy} + \text{Honest Exceptions} + \text{Human Resolution} + \text{Auditability} + \text{AI Assistance}$$