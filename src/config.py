import os
from pathlib import Path
from dotenv import load_dotenv

# --------------------------------------------------
# Load .env file
# --------------------------------------------------

load_dotenv()

# --------------------------------------------------
# Project paths
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).parent.parent

DATA_DIR = PROJECT_ROOT / "data"
MESSY_DATA_DIR = DATA_DIR / "messy"
ORIGINAL_DATA_DIR = DATA_DIR / "original"

# Input files (messy — what the agent processes)
BANK_TRANSACTIONS_FILE = MESSY_DATA_DIR / "bank_transactions.csv"
INVOICES_FILE = MESSY_DATA_DIR / "invoices.csv"
PAYMENTS_FILE = MESSY_DATA_DIR / "payments.csv"
GROUND_TRUTH_FILE = MESSY_DATA_DIR / "ground_truth.csv"

# Output directory
OUTPUT_DIR = PROJECT_ROOT / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

# --------------------------------------------------
# LLM configuration
# --------------------------------------------------

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
if GEMINI_MODEL in ("gemini-2.5-flash", "gemini-2.0-flash"):
    GEMINI_MODEL = "gemini-3.6-flash"

# --------------------------------------------------
# Reconciliation thresholds
# --------------------------------------------------

# Amount tolerance: differences <= this value are treated as a match
AMOUNT_TOLERANCE = int(os.getenv("AMOUNT_TOLERANCE", "0"))

# Date tolerance: differences <= this many days are treated as a match
DATE_TOLERANCE_DAYS = int(os.getenv("DATE_TOLERANCE_DAYS", "0"))

# Fuzzy match: merchant name similarity score threshold (0-100)
FUZZY_MATCH_THRESHOLD = int(os.getenv("FUZZY_MATCH_THRESHOLD", "60"))

# --------------------------------------------------
# Status constants
# --------------------------------------------------

STATUS_MATCH = "MATCH"
STATUS_AMOUNT_MISMATCH = "AMOUNT_MISMATCH"
STATUS_DATE_MISMATCH = "DATE_MISMATCH"
STATUS_MISSING_INVOICE = "MISSING_INVOICE"
STATUS_DUPLICATE = "DUPLICATE"
STATUS_MULTIPLE_MATCHES = "MULTIPLE_MATCHES"
