from pydantic import BaseModel
from datetime import date
from typing import Optional


class BankTransaction(BaseModel):
    """A single row from bank_transactions.csv"""
    transaction_id: str
    date: date
    description: str
    amount: float
    reference: str


class Invoice(BaseModel):
    """A single row from invoices.csv"""
    invoice_id: str
    date: date
    customer: str
    amount: float
    invoice_reference: str


class Payment(BaseModel):
    """A single row from payments.csv"""
    payment_id: str
    date: date
    merchant: str
    amount: float
    reference: str
    status: str


class ReconciliationResult(BaseModel):
    """The output for one bank transaction after reconciliation"""
    transaction_id: str
    invoice_id: Optional[str] = None
    payment_id: Optional[str] = None
    status: str
    amount_delta: Optional[float] = None
    date_delta_days: Optional[int] = None
    merchant_match_score: Optional[float] = None
    payment_status: Optional[str] = None
    reason: Optional[str] = None
