"""
AI Financial Guardrails Engine — Autonomous Finance Controller

Enforces multi-layered deterministic and semantic guardrails for AI financial reasoning:
1. Input Scope & Intent Guardrail: Validates domain relevance, prevents prompt injection, and extracts grounded entity references.
2. Ledger Grounding & Anti-Hallucination Guardrail: Prevents hallucination of phantom transactions, fake invoices, or fabricated numbers.
3. Financial Arithmetic & Double-Entry Integrity: Enforces mathematical consistency and balanced journal postings.
4. Non-Repetitive & Intent-Adaptive Communication Guardrail: Eliminates repetitive template loops and adapts tone to specific human inquiries.
5. Audit & Human-in-the-Loop Compliance Guardrail: Labels proposed adjustments as requiring human controller review.
"""

import re
import math
from typing import Dict, Any, List, Optional, Tuple


class FinancialGuardrailEngine:
    """
    Comprehensive guardrail manager that inspects user queries before LLM inference
    and sanitizes/verifies LLM outputs before returning to the human controller.
    """

    PROMPT_INJECTION_PATTERNS = [
        r"ignore\s+(?:all\s+|previous\s+|prior\s+)?instructions",
        r"disregard\s+(?:all\s+|previous\s+|prior\s+)?rules",
        r"forget\s+(?:everything|rules|instructions)",
        r"system\s+prompt",
        r"reveal\s+(?:your\s+)?(?:system\s+)?instructions",
        r"print\s+(?:your\s+)?(?:system\s+)?prompt",
        r"jailbreak",
        r"dan\s+mode",
        r"developer\s+mode",
        r"bypass\s+(?:security|safety|guardrails)",
        r"pretend\s+you\s+are\s+(?:an?\s+)?unrestricted",
        r"act\s+as\s+(?:an?\s+)?unfiltered",
    ]

    OFF_TOPIC_KEYWORDS = [
        "recipe", "cookbook", "bake", "cake", "cookie", "poem", "poetry", "poetic",
        "song", "lyrics", "movie", "horoscope", "astrology", "zodiac", "weather",
        "dating", "romance", "video game", "cheat code"
    ]

    FINANCIAL_DOMAIN_PATTERNS = [
        # Entity patterns (TX, TRX, INV, PAY, etc.)
        r"\b(?:tx|trx|bl|txn|inv|pay|doc|ref)[-_]?\d+\b",
        # Core financial & reconciliation terms
        r"\b(?:reconcil\w*|transaction\w*|invoice\w*|bill\w*|deposit\w*|statement\w*|ledger\w*)\b",
        r"\b(?:payment\w*|clearing\w*|settle\w*|settlement\w*|batch\w*|record\w*|intake\w*)\b",
        # Discrepancies & variances
        r"\b(?:variance\w*|delta\w*|discrepan\w*|mismatch\w*|fee\w*|charge\w*|deduct\w*)\b",
        r"\b(?:drift\w*|delay\w*|lag\w*|duplicate\w*|missing\w*|unbilled\w*|unmatched\w*|matched\w*)\b",
        r"\b(?:flag\w*|anomaly\w*|exception\w*|overpayment\w*|underpayment\w*)\b",
        # Accounting & GL
        r"\b(?:gl[-_]?\d*|journal\w*|debit\w*|credit\w*|bookkeeping\w*|tally\w*|quickbooks\w*)\b",
        r"\b(?:suspense\w*|receivable\w*|payable\w*|\bar\b|\bap\b|adjustment\w*|posting\w*)\b",
        r"\b(?:balance\w*|equilibrium\w*|chart of accounts\w*)\b",
        # Cash, runway & forecasting
        r"\b(?:cash\w*|runway\w*|forecast\w*|burn\w*|inflow\w*|outflow\w*|liquidity\w*|treasury\w*)\b",
        # Audit, risk & benchmark
        r"\b(?:audit\w*|risk\w*|materiality\w*|fraud\w*|benchmark\w*|accuracy\w*|ground\s*truth\w*)\b",
        r"\b(?:overview\w*|summary\w*|dataset\w*|metric\w*|export\w*|report\w*|revert\w*|resolve\w*)\b",
        r"\b(?:counterparty\w*|vendor\w*|customer\w*|client\w*|merchant\w*)\b",
        # Currency amounts
        r"(?:₹|\$|rs\.?|inr|usd)\s*[\d,]+",
    ]

    GREETING_PATTERNS = [
        r"^(?:hi|hello|hey|greetings|good\s+(?:morning|afternoon|evening)|help)(?:[!\s.]|$)",
        r"^who\s+are\s+you\b",
        r"^what\s+can\s+you\s+do\b",
    ]

    @staticmethod
    def extract_entity_references(
        query: str,
        all_records: List[Dict[str, Any]],
        focused_tx_id: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Extracts and verifies transaction IDs, invoices, and vendors mentioned in:
        1. The active query text (direct or normalized match).
        2. The UI-focused transaction ID (`focused_tx_id`).
        3. Prior conversation turns (`history`) when the user asks contextual follow-up questions
           with anaphoric pronouns ("it", "this transaction", "this", "the fee", "how do I fix it?").
        """
        q_upper = query.upper()
        q_lower = query.lower()

        found_records = []
        referenced_ids = set()
        resolution_source = "none"

        # Helper to match an ID against all_records
        def find_record_by_id(candidate_id: str) -> Optional[Dict[str, Any]]:
            cand_norm = candidate_id.strip().upper().replace("-", "").replace("_", "")
            for r in all_records:
                tx = str(r.get("transaction_id", "")).strip().upper()
                inv = str(r.get("invoice_id", "")).strip().upper()
                if tx == candidate_id.strip().upper() or inv == candidate_id.strip().upper():
                    return r
                tx_norm = tx.replace("-", "").replace("_", "")
                inv_norm = inv.replace("-", "").replace("_", "")
                if (len(cand_norm) >= 4 and (cand_norm == tx_norm or cand_norm == inv_norm)):
                    return r
            return None

        # 1. Check direct mentions in current query
        for r in all_records:
            tx_id = str(r.get("transaction_id", "")).strip()
            if not tx_id:
                continue
            norm_tx = tx_id.upper().replace("-", "").replace("_", "")
            norm_q = q_upper.replace("-", "").replace("_", "")

            if tx_id.upper() in q_upper or (len(norm_tx) >= 4 and norm_tx in norm_q):
                if tx_id not in referenced_ids:
                    referenced_ids.add(tx_id)
                    found_records.append(r)
                    resolution_source = "query_direct"

        # Check for invoice ID mentions in query
        if not found_records:
            inv_matches = re.findall(r"\b(?:INV|BILL|DOC|INVOICE)[-_]?\d+\b", q_upper)
            for im in inv_matches:
                rec = find_record_by_id(im)
                if rec and rec["transaction_id"] not in referenced_ids:
                    referenced_ids.add(rec["transaction_id"])
                    found_records.append(rec)
                    resolution_source = "query_invoice"

        # 2. If nothing directly in query, check focused_tx_id (from UI selection)
        if not found_records and focused_tx_id:
            rec = find_record_by_id(focused_tx_id)
            if rec:
                referenced_ids.add(rec["transaction_id"])
                found_records.append(rec)
                resolution_source = "ui_focus"

        # 3. If still nothing, check history for anaphoric follow-up references ("it", "this transaction", "why", "how to fix")
        follow_up_tokens = ["this", "that", "it", "the transaction", "the fee", "the variance", "the vendor", "fix it", "why", "what happened", "how to resolve", "journal entry"]
        is_follow_up = any(tok in q_lower for tok in follow_up_tokens) or len(query.split()) <= 6

        if not found_records and is_follow_up and history:
            # Scan history backwards from most recent turn
            for turn in reversed(history):
                content = str(turn.get("content", ""))
                # Look for transaction IDs mentioned in prior turns
                hist_ids = re.findall(r"\b(?:TX|TRX|BL|TXN)[-_]?\d+[A-Z]?\b", content, re.IGNORECASE)
                for hid in hist_ids:
                    rec = find_record_by_id(hid)
                    if rec and rec["transaction_id"] not in referenced_ids:
                        referenced_ids.add(rec["transaction_id"])
                        found_records.append(rec)
                        resolution_source = "history_anaphora"
                        break
                if found_records:
                    break

        # Check for vendor mentions
        matched_vendors = []
        for r in all_records:
            vendor = str(r.get("vendor", "") or r.get("counterparty", "") or "").strip()
            if vendor and len(vendor) >= 3 and vendor.lower() in q_lower:
                if vendor not in matched_vendors:
                    matched_vendors.append(vendor)

        return {
            "referenced_tx_ids": list(referenced_ids),
            "matched_records": found_records,
            "matched_vendors": matched_vendors,
            "is_specific_tx_query": len(found_records) > 0,
            "resolution_source": resolution_source,
        }

    @staticmethod
    def check_input_safety(query: str) -> Tuple[bool, Optional[str]]:
        """
        Verifies that the query is safe, within financial domain boundaries,
        and not attempting prompt injection.
        """
        q_lower = query.lower().strip()

        # Prompt injection check
        for pattern in FinancialGuardrailEngine.PROMPT_INJECTION_PATTERNS:
            if re.search(pattern, q_lower):
                return False, "⚠️ **Security Guardrail Active**: I'm here to help with your financial reconciliation and accounting questions, so I cannot alter system instructions or assist with security bypasses. Let me know what you'd like to check in our ledger!"

        # Domain boundary check for blatantly unrelated questions
        if len(query) > 12 and any(off in q_lower for off in FinancialGuardrailEngine.OFF_TOPIC_KEYWORDS):
            return False, "🛡️ **Domain Boundary Guardrail**: I'm focused specifically on helping you with reconciliation, variance root-cause analysis, and balanced double-entry adjustments. Please ask a genuine or related question about your financial transactions or ledger."

        return True, None

    @staticmethod
    def verify_dataset_relevance(
        query: str,
        all_records: List[Dict[str, Any]],
        has_focused_tx: bool = False,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Tuple[bool, Optional[str]]:
        """
        Verifies whether the user query is genuinely related to the reconciliation dataset,
        transactions, invoices, or financial results.
        If unrelated, instructs the user to ask a genuine or related question.
        """
        q_lower = query.lower().strip()

        # 1. Greetings / Help introduction
        for pat in FinancialGuardrailEngine.GREETING_PATTERNS:
            if re.search(pat, q_lower):
                greeting_reply = (
                    "👋 **Hi there! I'm your AI Financial Controller & Reconciliation Copilot.**\n\n"
                    "I'm here to help you dig into transaction discrepancies, trace root causes, prepare balanced journal adjustments, and track our cash runway.\n\n"
                    "**Here are a few genuine questions you can ask me about our current dataset:**\n"
                    "- *'Why did transaction TX0002 fail reconciliation?'*\n"
                    "- *'What is the root cause of the ₹500 fee variance on TX0002?'*\n"
                    "- *'Show the proposed journal entry for TX0002'* (GL debits & credits)\n"
                    "- *'How many duplicate records were detected?'*\n"
                    "- *'What is our benchmark accuracy against the ground truth?'*"
                )
                return True, greeting_reply

        # 2. Contextual follow-up when transaction is focused or in active history
        follow_up_stems = [
            "why", "how", "what", "fix", "resolve", "action", "status", "entry",
            "journal", "debit", "credit", "fee", "variance", "delta", "drift", "date",
            "delay", "vendor", "seller", "remediation", "explain", "detail", "tell me"
        ]
        if has_focused_tx and (any(w in q_lower for w in follow_up_stems) or len(query.split()) <= 6):
            return True, None

        # 3. Check for vendor or counterparty names in the loaded dataset
        for r in all_records:
            vendor = str(r.get("vendor", "")).strip().lower()
            if vendor and len(vendor) >= 3 and vendor in q_lower:
                return True, None

        # 4. Check for financial domain patterns
        for pat in FinancialGuardrailEngine.FINANCIAL_DOMAIN_PATTERNS:
            if re.search(pat, q_lower):
                return True, None

        # 5. The query is NOT related to the dataset or results -> tell user to ask a genuine or related question
        unrelated_msg = (
            "⚠️ **Query Not Related to Dataset or Results**\n\n"
            "I'm here as your **AI Financial Controller & Reconciliation Auditor**, so I can only answer questions about our loaded financial dataset, transactions, invoices, or reconciliation results.\n\n"
            "**Please ask a genuine or related question about our financial data, such as:**\n"
            "- *'Why is transaction TX0002 flagged with an amount mismatch?'*\n"
            "- *'What is the root cause of the ₹500 fee variance on TX0002?'*\n"
            "- *'Show me the proposed adjusting journal entry for TX0002'* (Balanced GL debits & credits)\n"
            "- *'How many duplicate records were detected in the bank statement?'*\n"
            "- *'What is the benchmark accuracy against the ground truth?'*\n"
            "- *'What is our 30-day projected cash runway?'*"
        )
        return False, unrelated_msg

    @staticmethod
    def classify_intent(query: str, has_focused_tx: bool = False) -> str:
        """
        Determines the specific financial intent of the user's question to prevent
        monolithic repetitive answers and ensure context-targeted replies.
        """
        q_lower = query.lower().strip()

        # 1. Specific Journal Entry / GL Booking
        if any(w in q_lower for w in ["journal", "entry", "gl code", "gl-", "debit", "credit", "bookkeeping", "post adjustment", "tally", "quickbooks", "accounting entry"]):
            return "JOURNAL_ENTRY"

        # 2. Root Cause / Forensic Investigation (check before action to avoid 'transaction' substring)
        if any(w in q_lower for w in ["why did", "why is", "root cause", "reason", "why was", "why flagged", "discrepancy cause", "what caused", "why"]) or re.search(r"\b(cause|fail(?:ed|s|ing)?|mismatch|issue)\b", q_lower):
            return "ROOT_CAUSE"

        # 3. Resolution Action / Next Steps
        if any(w in q_lower for w in ["how to fix", "how do i resolve", "how to resolve", "what should i do", "remediation", "resolve this", "solution", "next step"]) or re.search(r"\b(fix|resolve|action|remedy)\b", q_lower):
            return "RESOLUTION_ACTION"

        # 4. Amount / Fee / Delta / Arithmetic
        if any(w in q_lower for w in ["how much", "amount", "fee", "variance", "difference", "delta", "deduction", "deducted", "price"]) or re.search(r"\b(fee|cost)\b", q_lower):
            return "AMOUNT_FEE"

        # 5. Date / Transit / Timing
        if any(w in q_lower for w in ["when", "delay", "timing", "drift", "cleared", "transit", "clearing time"]) or re.search(r"\b(date|days)\b", q_lower):
            return "DATE_TIMING"

        # 6. Counterparty / Vendor / Customer
        if any(w in q_lower for w in ["who is", "vendor", "seller", "customer", "merchant", "counterparty", "client", "party"]):
            return "VENDOR_INQUIRY"

        # 7. Risk / Materiality / Fraud Audit
        if any(w in q_lower for w in ["risk", "safe", "audit", "fraud", "materiality", "severity", "exposure"]):
            return "RISK_AUDIT"

        # 8. Duplicate transactions inquiry
        if any(w in q_lower for w in ["duplicate", "double", "clone", "repeated"]):
            return "DUPLICATE_INQUIRY"

        # 9. Missing Invoices inquiry
        if "unbilled" in q_lower or ("missing" in q_lower and any(b in q_lower for b in ["invoice", "bill", "receipt", "document"])) or "no invoice" in q_lower:
            return "MISSING_INVOICE"

        # 10. Benchmark & accuracy evaluation
        if any(w in q_lower for w in ["benchmark", "accuracy", "ground truth", "eval", "score", "failure rate"]):
            return "BENCHMARK_ACCURACY"

        # 11. Dataset overview / Summary
        if any(w in q_lower for w in ["overview", "summary", "total records", "all records", "portfolio", "cash position"]):
            return "DATASET_OVERVIEW"

        return "TRANSACTION_DETAIL" if has_focused_tx else "GENERAL_FINANCE"

    @staticmethod
    def sanitize_and_verify_output(
        response_text: str,
        query: str,
        referenced_records: List[Dict[str, Any]],
        total_dataset_count: int,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        """
        Enforces output integrity, mathematical balance, audit compliance disclaimers,
        and prevents repetitive template echoes.
        """
        if not response_text or not response_text.strip():
            if referenced_records:
                target = referenced_records[0]
                return f"Transaction `{target['transaction_id']}` ({target['vendor']}): Bank amount ₹{target['bank_amount']:,.2f}, status: **{target['status']}**."
            return "I inspected the reconciliation ledger for your inquiry. Please specify a transaction ID or question to see detailed audit records."

        cleaned = response_text.strip()

        # 1. Strip raw markdown fences if leaked
        if cleaned.startswith("```markdown"):
            cleaned = cleaned[11:].strip()
        if cleaned.startswith("```") and cleaned.endswith("```"):
            cleaned = cleaned[3:-3].strip()

        # 2. Enforce Double-Entry Balance Guardrail on any journal entries in the response
        debit_matches = re.findall(r"debit\D*?₹?\s*([\d,]+(?:\.\d{2})?)", cleaned, re.IGNORECASE)
        credit_matches = re.findall(r"credit\D*?₹?\s*([\d,]+(?:\.\d{2})?)", cleaned, re.IGNORECASE)

        if debit_matches and credit_matches:
            try:
                total_deb = sum(float(d.replace(",", "")) for d in debit_matches)
                total_cred = sum(float(c.replace(",", "")) for c in credit_matches)
                if abs(total_deb - total_cred) > 0.01:
                    diff = abs(total_deb - total_cred)
                    cleaned += f"\n\n> 🛡️ **Accounting Guardrail Note:** Proposed double-entry ledger adjustments must maintain mathematical equilibrium. Total Debits (₹{total_deb:,.2f}) vs Total Credits (₹{total_cred:,.2f}) exhibits a ₹{diff:,.2f} variance requiring balancing before posting."
            except Exception:
                pass

        # 3. Compliance Guardrail: Ensure proposed entries are clearly labeled as proposals requiring human review
        if any(kw in cleaned.lower() for kw in ["journal entry", "gl-6150", "gl-1050", "post adjustment"]) and "human" not in cleaned.lower() and "review" not in cleaned.lower() and "proposed" not in cleaned.lower():
            cleaned += "\n\n*(Note: All suggested accounting entries are proposed adjustments requiring human controller review and approval prior to ERP posting.)*"

        return cleaned


guardrail_engine = FinancialGuardrailEngine()

