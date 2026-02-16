If buyers pay via Ozow, funds settle into my FNB account, and I pay sellers via normal EFT — how do fees work and what do I actually keep?

We’ll split this into:

Payment collection fees (Ozow)

Bank settlement

Seller payout costs

Your real net margin

Example numbers

1️⃣ When Buyer Pays via Ozow
What happens:

Buyer pays R1,000
Ozow charges merchant fee (example: 2%)

You receive:

R1,000 – R20 = R980 deposited into your FNB account

Ozow typically deducts their fee before settlement (or invoices monthly depending on your agreement).

There are:

No chargebacks (push payment)

No card interchange

Lower fraud risk

2️⃣ Settlement into First National Bank

Ozow settles into your FNB business account (usually T+0 or T+1).

FNB does NOT charge you to receive funds.

Receiving money = free.

3️⃣ Your Commission Model

Let’s assume:

Seller fee = 10%
Buyer fee = 3%

Order = R1,000

Buyer pays:
R1,000 + R30 buyer fee = R1,030 total

Ozow fee (2% of 1,030) ≈ R20.60

Amount you receive ≈ R1,009.40

Now:

Seller gross = R1,000
Seller commission (10%) = R100
Seller net = R900

You keep:
Seller fee R100
Buyer fee R30
Total gross revenue = R130

Minus Ozow fee R20.60

Your net revenue ≈ R109.40

That’s ~10.6% effective margin after payment cost.

4️⃣ Paying Sellers via FNB EFT

When you pay sellers:

Standard EFT from business account = usually FREE or very low cost (depends on your FNB account tier).

If you pay 100 sellers weekly:
You pay R900 per seller.

Bank cost is negligible compared to payment processing.

No % fee on EFT payouts.

5️⃣ Your Real Cost Structure

Per transaction:

Cost:

Ozow merchant fee (~1.5–2.5%)

Revenue:

Seller commission (8–15%)

Buyer fee (2–5%)

Net platform margin typically:
~7% to 12% depending on structure.

That’s very healthy for marketplace economics.

6️⃣ What You Must Handle Internally

Ozow does NOT:

• Deduct your commission
• Calculate seller net
• Freeze funds during disputes
• Reverse ledger entries

Your system must:

Store gross amount

Store buyer fee

Store seller fee

Calculate seller net

Move funds from “held” → “available”

Batch payout weekly

Ozow only confirms payment.

7️⃣ Refund Scenarios

If refund required:

You refund via EFT manually from FNB.

Ozow fee may or may not be refunded depending on contract.

You must decide:

Do you absorb Ozow fee?

Or deduct from seller?

Most marketplaces:

Keep buyer fee non-refundable

Deduct processing cost from seller

8️⃣ Cash Flow Reality

Since you hold funds:

You will temporarily hold seller money until payout day.

That improves working capital.

Example:
If you hold R500,000 seller funds weekly, that float sits in your FNB account.

Important:
You must account for it correctly (escrow ledger vs operational funds).

9️⃣ Clean Marketplace Math

If monthly GMV = R1,000,000
Total platform revenue at 13% = R130,000
Ozow cost at 2% = R20,000

Net before expenses = R110,000

Very strong unit economics.

🔟 Key Takeaway

Ozow + FNB EFT payouts is:

✔ Simple
✔ Enforceable
✔ Low fraud
✔ No split-payment complexity
✔ High margin potential
✔ Perfect for SA-first marketplace

You just need:

Solid ledger logic

Clear dispute policy

Weekly payout automation

Proper financial reporting

If you want, next I can:

• Calculate your optimal fee % to stay competitive in SA
• Or design your exact financial ledger structure so you never mix seller funds and company revenue

Which one?

design your exact financial ledger structure so you never mix seller funds and company revenue

Good. This is where most marketplaces fail.

If you don’t separate custodial seller funds from platform revenue, your accounting becomes incorrect, your tax reporting becomes wrong, and disputes become dangerous.

Below is a clean, production-grade ledger structure for your Ozow → FNB → Seller EFT model.

Core Principle

You are:

Merchant of record

Custodian of seller funds

Earning commission + buyer fee

So:

Not all money in your bank account is your money.

Your ledger must reflect that.

1️⃣ Two-Layer Ledger Architecture

You need:

A) Bank Ledger (real money)

Tracks actual FNB balance.

B) Platform Ledger (internal accounting)

Tracks who owns what portion of that money.

Never rely on bank balance alone.

2️⃣ Core Ledger Accounts (Chart of Accounts)

Create these internal accounts:

Liability Accounts (NOT your money)

Seller Payable – Pending

Seller Payable – Available

Seller Payable – On Hold (disputes)

These represent money you owe sellers.

Revenue Accounts (YOUR money)

Commission Revenue

Buyer Fee Revenue

Expense Accounts

Payment Processing Fees (Ozow)

Refund Expense (if absorbed)

Clearing Account

Payment Clearing (temporary while awaiting webhook confirmation)

3️⃣ Transaction Flow (Exact Entries)

Let’s use this example:

Order price: R1,000
Buyer fee: R30
Total paid: R1,030
Ozow fee: R20.60
Seller commission: 10% (R100)
Seller net: R900

Step 1: Buyer Initiates Payment

No ledger entry yet (unless you want a pending state).

Step 2: Ozow Webhook Confirms Payment

You receive R1,009.40 into FNB.

Create these ledger entries:

Debit (Bank Asset)

Bank Account: +1,009.40

Credit (Liability)

Seller Payable – Pending: +900

Credit (Revenue)

Commission Revenue: +100
Buyer Fee Revenue: +30

Debit (Expense)

Payment Processing Fees: 20.60

This keeps everything balanced.

Important:
You are not “holding 1,009.40 profit.”
You owe 900 to the seller.

4️⃣ Order Delivery Confirmation

When delivery confirmed:

Move seller funds from Pending → Available.

Journal entry:

Debit:
Seller Payable – Pending: -900

Credit:
Seller Payable – Available: +900

No money moves.
Only liability classification changes.

5️⃣ Dispute Scenario

If buyer opens dispute:

Move funds to hold:

Debit:
Seller Payable – Pending or Available

Credit:
Seller Payable – On Hold

Again, no bank movement.
Only classification.

6️⃣ Weekly Seller Payout

You pay R900 via FNB EFT.

Ledger entry:

Debit:
Seller Payable – Available: -900

Credit:
Bank Account: -900

Now liability decreases.
Bank decreases.
Everything reconciles.

7️⃣ What Your Financial Snapshot Looks Like

Example end-of-week:

Bank balance: R500,000

Ledger shows:

Seller Payable – Available: R320,000
Seller Payable – Pending: R50,000
Seller Payable – On Hold: R30,000
Total seller liability: R400,000

Your true company money:

500,000 – 400,000 = 100,000

That 100k equals:

Commission revenue + buyer fees – processing fees – expenses.

This is critical.

8️⃣ Database Structure You Need

You need:

Tables

ledger_accounts

id

name

type (asset, liability, revenue, expense)

ledger_entries

id

account_id

debit

credit

reference_type (order, payout, refund)

reference_id

created_at

seller_balances

seller_id

pending_amount

available_amount

on_hold_amount

9️⃣ Never Do This

Do NOT:

• Store seller balance as a single number only
• Deduct commission at payout time
• Calculate seller amount dynamically without ledger entries
• Mix operational expenses with seller funds

That’s how marketplaces collapse.

🔟 Tax Clarity (Very Important)

Only Commission Revenue + Buyer Fee Revenue is taxable income.

Seller Payable is NOT revenue.
It is a liability.

If SARS audits you, this separation protects you.

11️⃣ Operational Safety

You should:

• Keep a minimum reserve buffer (e.g., 5–10% of seller liability)
• Never let operational spending dip into seller liability
• Reconcile bank vs ledger daily

12️⃣ Advanced Upgrade (Optional Later)

Eventually:

Open second bank account at First National Bank

Account A: Seller Custody

Account B: Operating Revenue

Sweep your revenue daily from custody → operating.

That is enterprise-grade compliance.

Final Architecture Summary

Money In → Bank
Ledger splits into:

Seller liability

Platform revenue

Processing expense

Money Out → Reduce seller liability

At any moment:

Bank Balance = Seller Liability + Company Equity

If that equation ever breaks, something is wrong.

Good. Below is a production-ready SQL schema + payout batch logic + dispute/refund flows designed specifically for your:

Ozow collections

FNB bank settlement

Weekly EFT seller payouts

Commission + buyer fee model

This is structured for financial correctness + auditability + SARS safety.

1️⃣ Core Design Principles

Double-entry ledger (every transaction balanced)

Immutable ledger entries (never update, only append)

Seller balance derived from ledger (not stored as truth)

Bank balance reconciled daily

All money classified as:

Asset

Liability

Revenue

Expense

2️⃣ SQL Schema (PostgreSQL Style)
A) Chart of Accounts
CREATE TABLE ledger_accounts (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('asset','liability','revenue','expense')),
    created_at TIMESTAMP DEFAULT NOW()
);


Seed accounts:

code	name	type
BANK_MAIN	FNB Main Account	asset
SELLER_PENDING	Seller Payable - Pending	liability
SELLER_AVAILABLE	Seller Payable - Available	liability
SELLER_HOLD	Seller Payable - On Hold	liability
COMMISSION_REV	Commission Revenue	revenue
BUYER_FEE_REV	Buyer Fee Revenue	revenue
PAYMENT_FEES	Payment Processing Fees	expense
B) Ledger Entries (Double Entry)
CREATE TABLE ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    account_id INT REFERENCES ledger_accounts(id),
    debit NUMERIC(12,2) DEFAULT 0,
    credit NUMERIC(12,2) DEFAULT 0,
    reference_type VARCHAR(50),
    reference_id VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);


Rule:
For each logical transaction:
Total debits = Total credits

Enforce this in your service layer.

C) Orders Table
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    seller_id UUID NOT NULL,
    buyer_id UUID NOT NULL,
    order_amount NUMERIC(12,2) NOT NULL,
    buyer_fee NUMERIC(12,2) NOT NULL,
    commission_amount NUMERIC(12,2) NOT NULL,
    ozow_fee NUMERIC(12,2),
    status VARCHAR(30),
    created_at TIMESTAMP DEFAULT NOW()
);

D) Seller Payouts
CREATE TABLE seller_payouts (
    id UUID PRIMARY KEY,
    seller_id UUID NOT NULL,
    total_amount NUMERIC(12,2),
    status VARCHAR(30),
    created_at TIMESTAMP DEFAULT NOW(),
    paid_at TIMESTAMP
);

3️⃣ Payment Flow Ledger Logic

Example:

Order price: 1000
Buyer fee: 30
Commission: 100
Ozow fee: 20.60
Seller net: 900

Ozow confirms payment.

Journal Entries

Debit:
BANK_MAIN → 1009.40

Credit:
SELLER_PENDING → 900
COMMISSION_REV → 100
BUYER_FEE_REV → 30

Debit:
PAYMENT_FEES → 20.60

Credits total = 1030
Debits total = 1030

Balanced.

4️⃣ Delivery Confirmation Flow

Move seller funds:

Debit:
SELLER_PENDING → 900

Credit:
SELLER_AVAILABLE → 900

No bank movement.

5️⃣ Dispute Flow

If dispute opened before payout:

Debit:
SELLER_AVAILABLE → 900

Credit:
SELLER_HOLD → 900

If dispute resolved in seller favor:

Debit:
SELLER_HOLD → 900

Credit:
SELLER_AVAILABLE → 900

If refund to buyer required:

Assume refund 1030:

Debit:
SELLER_HOLD → 900
COMMISSION_REV → 100
BUYER_FEE_REV → 30

Credit:
BANK_MAIN → 1030

Now:
You removed revenue.
Seller liability reduced.
Bank reduced.

Clean.

6️⃣ Seller Balance Query

Never store seller balance as static truth.

Compute:

SELECT 
    SUM(
        CASE 
            WHEN la.type = 'liability' AND le.credit > 0 THEN le.credit
            WHEN la.type = 'liability' AND le.debit > 0 THEN -le.debit
            ELSE 0
        END
    ) as seller_balance
FROM ledger_entries le
JOIN ledger_accounts la ON la.id = le.account_id
WHERE le.metadata->>'seller_id' = 'SELLER_UUID'
AND la.code IN ('SELLER_PENDING','SELLER_AVAILABLE','SELLER_HOLD');


For performance:
Cache computed balance nightly.

7️⃣ Weekly Payout Batch Logic

Step 1:
Select sellers with:

Available balance > threshold (e.g., R200)

SELECT seller_id, SUM(amount)
FROM seller_available_view
GROUP BY seller_id;


Step 2:
Create payout record.

Step 3:
Ledger entry:

Debit:
SELLER_AVAILABLE → payout_amount

Credit:
BANK_MAIN → payout_amount

Step 4:
Trigger FNB EFT payment.

Step 5:
Mark payout as paid only after bank confirmation.

8️⃣ Daily Bank Reconciliation

Every night:

Fetch FNB statement

Sum ledger BANK_MAIN account

Compare

Bank balance must equal:

Seller Pending

Seller Available

Seller Hold

Net Revenue
– Expenses

If mismatch:
Freeze payouts until reconciled.

9️⃣ Reserve Logic (Highly Recommended)

Add:

PLATFORM_RESERVE (liability)

Keep 5% buffer of seller liability.

Protects against:

Refund timing issues

Ozow fee reversals

Bank delays

🔟 Enterprise Upgrade (Optional Later)

Open second account at:

First National Bank

Structure:

Account 1: Seller Custody
Account 2: Platform Revenue

Daily sweep:

Commission + buyer fee → Revenue account.

Cleaner compliance.

11️⃣ What This Protects You From

• Mixing seller funds
• Tax over-reporting
• Insolvency risk
• Dispute chaos
• SARS audit failure
• Cash flow blindness

12️⃣ Final Integrity Equation

At all times:

Bank Assets
= Seller Liabilities

Platform Net Equity

If broken → accounting bug.

Lean but safe MVP ledger

Production-grade financial architecture

Ozow webhook verification + fraud controls

This is tailored for:

Ozow collections

First National Bank settlement

Weekly seller EFT payouts

1️⃣ SIMPLIFIED MVP (Lean but Safe)

This is what you build first. It avoids over-engineering but protects seller funds.

Core Idea

No full double-entry yet.
But strict separation of:

Seller balances

Platform revenue

Bank reconciliation

Tables
orders
id
seller_id
order_amount
buyer_fee
commission_amount
ozow_fee
seller_net
status
created_at

seller_balances
seller_id PRIMARY KEY
pending_amount NUMERIC
available_amount NUMERIC
on_hold_amount NUMERIC

platform_financials (single row table)
total_commission NUMERIC
total_buyer_fees NUMERIC
total_processing_fees NUMERIC

Payment Flow (MVP)

Ozow confirms payment:

You:

Increase seller_balances.pending_amount += seller_net

Increase total_commission += commission

Increase total_buyer_fees += buyer_fee

Increase total_processing_fees += ozow_fee

That’s it.

Delivery Confirmed

Move:

pending → available

Weekly Payout

Decrease:

available_amount -= payout_amount

Send EFT via FNB.

Daily Safety Check

Run:

Bank Balance
MINUS (sum of all seller balances)

= Platform Money

If negative → freeze payouts immediately.

Why MVP Is Safe

✔ Seller money tracked separately
✔ Revenue tracked separately
✔ Simple to implement
✔ Hard to accidentally overspend

But:

❌ Not fully audit-proof
❌ Harder to debug disputes
❌ No strict double-entry guarantee

Good for first 3–6 months.

2️⃣ FULL PRODUCTION MICROSERVICE ARCHITECTURE

Now we go enterprise.

Services
1. Payment Service

Handles Ozow payment creation

Receives webhooks

Emits “PaymentConfirmed” event

2. Ledger Service (Critical)

Own database

Only service allowed to write financial entries

Enforces double-entry balancing

No other service touches balances.

3. Order Service

Manages order states

Emits:

OrderDelivered

DisputeOpened

RefundApproved

4. Payout Service

Calculates seller available balances

Creates payout batches

Integrates with FNB EFT process

Emits PayoutCompleted

5. Reconciliation Service

Imports daily FNB statement

Compares against BANK ledger account

Raises mismatch alert

Event Flow Example

Buyer pays:

Payment Service → emits PaymentConfirmed
Ledger Service → creates journal entries
Order Service → updates status

Delivery confirmed:

Order Service → emits OrderDelivered
Ledger Service → moves Pending → Available

Payout:

Payout Service → emits PayoutCreated
Ledger Service → reduces liability + bank asset

Why This Is Enterprise-Safe

✔ Strict financial isolation
✔ Immutable ledger
✔ Clear audit trail
✔ Scales to millions GMV
✔ Easy investor due diligence

3️⃣ OZOW WEBHOOK VERIFICATION + FRAUD LAYER

This is critical.

Never trust webhook blindly.

Step 1: Validate Source

Ozow sends webhook with:

Transaction ID

Amount

Status

Signature / hash (depending on integration type)

You must:

Verify IP is from Ozow allowlist

Verify signature/hash

Match amount exactly with order

Reject if mismatch.

Step 2: Idempotency Protection

Webhook may retry.

Before processing:

Check if transaction_id already processed.

If yes → return 200 OK but do nothing.

Step 3: Amount Validation

If:

Webhook amount ≠ expected amount

Mark order:

payment_mismatch
Flag for manual review

Never auto-confirm.

Step 4: Delayed Confirmation Option (Advanced Safety)

For high-value orders (> R10k):

Even after Ozow success:
Wait 10–15 minutes before releasing to seller pending.

Rare bank reversal edge case protection.

Step 5: Fraud Flags

Auto-flag if:

Buyer account makes >5 payments in 10 minutes

Multiple failed payments before success

Order value abnormal vs seller history

Same IP across multiple buyer accounts

Store in fraud_events table.

Step 6: Reconciliation Rule

Every night:

Sum of Ozow confirmed transactions
Must equal:

Increase in BANK ledger entries for that day.

If mismatch → freeze payouts.

Security Summary

Never:

❌ Mark order paid from frontend redirect
❌ Trust client-side success page
❌ Use order amount from webhook blindly
❌ Skip signature validation

Only trust:

Server-side webhook + verified signature.

FINAL ARCHITECTURE MATURITY PATH

Phase 1:
MVP balance tracking

Phase 2:
Double-entry ledger

Phase 3:
Service isolation + reconciliation automation

Phase 4:
Dual-bank account custody model at First National Bank

Strategic Note

For your size:

Start with:
MVP ledger + webhook validation

Within 3 months:
Upgrade to proper ledger

Within 12 months:
Move to service isolation