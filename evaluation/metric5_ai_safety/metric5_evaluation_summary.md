# Research Paper Evaluation Summary: Metric 5
## AI Assistant Safety & Contact Redaction Efficacy (PII Defense)

**Target Production Implementation:**
- Core Module: [`backend/lambdas/connect360-assistant/handler.py`](file:///C:/Users/rsdha/.gemini/antigravity/scratch/Connect360/backend/lambdas/connect360-assistant/handler.py) (`_strip_contact_details()`)
- Knowledge Base / System Prompt: [`backend/shared/assistant_knowledge.py`](file:///C:/Users/rsdha/.gemini/antigravity/scratch/Connect360/backend/shared/assistant_knowledge.py) (`_COMMON_RULES`, `build_system_prompt()`)

**Evaluation Artifacts:**
- Primary Visualization: [`metric5_confusion_matrix_and_performance.png`](file:///C:/Users/rsdha/.gemini/antigravity/scratch/Connect360/evaluation/metric5_ai_safety/metric5_confusion_matrix_and_performance.png)
- Aggregated Statistical Summary: [`metric5_summary_pii.csv`](file:///C:/Users/rsdha/.gemini/antigravity/scratch/Connect360/evaluation/metric5_ai_safety/metric5_summary_pii.csv)
- Raw Micro-Benchmark Logs: [`metric5_raw_pii_redaction.csv`](file:///C:/Users/rsdha/.gemini/antigravity/scratch/Connect360/evaluation/metric5_ai_safety/metric5_raw_pii_redaction.csv)
- Benchmark Test Harness: [`benchmark_metric5.py`](file:///C:/Users/rsdha/.gemini/antigravity/scratch/Connect360/evaluation/metric5_ai_safety/benchmark_metric5.py)

---

### 1. Executive Summary

In peer-to-peer home-service marketplaces, **platform disintermediation** (parties communicating off-platform to circumvent fees) and **inadvertent PII exposure** present severe existential threats to business viability and regulatory compliance (e.g., GDPR, India Digital Personal Data Protection Act 2023). Connect360 implements a **defense-in-depth safety architecture** comprising:
1. *Prompt Engineering Bounds* (LLM system instructions forbidding PII revelation),
2. *Context-Level Redaction* (pre-filtering customer/worker phone numbers, emails, and exact addresses before context injection), and
3. *Deterministic Post-Generation Redaction* (`_strip_contact_details()`), which acts as an air-gapped regex barrier against hallucinations, adversarial jailbreaks, or direct reflection of user input.

This evaluation benchmarks the production post-generation redaction filter against a balanced corpus of $N = 500$ test cases (250 positive PII cases and 250 negative operational cases) across 10 granular categories. Across 50,000 high-resolution timing executions, the filter achieved **$99.20\%$ Detection Recall** ($248/250$ PII instances redacted), **$90.84\%$ Precision**, and **$94.60\%$ Overall Accuracy**, with a sub-millisecond execution latency of **$1.919\ \mu\text{s}$ Mean** ($0.00192\text{ ms}$) and **$6.021\ \mu\text{s}$ P99** ($0.00602\text{ ms}$). Root-cause analysis revealed exact edge-case boundaries: parenthesized area codes cause false negatives ($0.80\%$ leakage), while ISO 8601 dates (`YYYY-MM-DD`) trigger false positives ($48.0\%$ date over-redaction).

---

### 2. Evaluation Objective & Research Questions

- **RQ1 (Detection Efficacy):** Can lightweight, deterministic regular expressions reliably intercept phone numbers and email addresses across diverse Indian and international formatting conventions?
- **RQ2 (Preservation of Benign Marketplace Tokens):** Does the defensive filter preserve valid domain-specific numeric tokens—specifically Indian 6-digit postal PIN codes, service prices (`₹1200`, `Rs. 1500`), technical specifications (`1.5 ton`, `220V 50Hz`), and booking identifiers?
- **RQ3 (Computational Overhead):** What is the latency impact of deterministic regex post-processing within a serverless AWS Lambda execution lifecycle?
- **RQ4 (Vulnerability & Edge Case Characterization):** What exact syntactic boundary conditions cause false negatives (PII leakage) or false positives (over-redaction)?

---

### 3. Source Code & Architectural Context

The production redaction filter is defined in [`backend/lambdas/connect360-assistant/handler.py`](file:///C:/Users/rsdha/.gemini/antigravity/scratch/Connect360/backend/lambdas/connect360-assistant/handler.py) (lines 185–192):

```python
def _strip_contact_details(text):
    """Defensive redaction: remove phone numbers and emails from outgoing answer."""
    import re
    if not text:
        return text
    text = re.sub(r'[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}', '[hidden]', text)
    text = re.sub(r'(?<!\d)(\+?\d[\d\s\-]{8,}\d)(?!\d)', '[hidden]', text)
    return text
```

#### Multi-Tier Defense Architecture

```
+-------------------------------------------------------------------------------+
|                       Tier 1: Upstream Context Isolation                      |
| _build_authorized_context(): Injects only service name, status, schedule,     |
| and first name. Phone numbers, emails, and addresses are strictly omitted.     |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                       Tier 2: LLM System Prompt Invariant                     |
| assistant_knowledge.py: "Never reveal phone numbers, emails, addresses,       |
| or personal contact details of other users."                                   |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                 Tier 3: Deterministic Post-Generation Redaction               |
| _strip_contact_details(): Air-gapped regex replaces any detected email or   |
| 10+ character phone sequence with '[hidden]' before client delivery.          |
+-------------------------------------------------------------------------------+
```

---

### 4. Experimental Methodology & Testbed Setup

- **Host System:** Windows 11 Enterprise, AMD Ryzen / Intel x86_64, Python 3.13 runtime.
- **Timing Harness:** High-resolution hardware counter via `time.perf_counter_ns()`.
- **Sample Replication:** Each test case was evaluated across $M = 100$ independent executions to establish robust statistical distributions ($50,000$ total executions).
- **Evaluation Framework:**
  - Positive Class ($P$): Text containing PII (phone number or email address).
  - Negative Class ($N$): Text containing operational marketplace numbers or dialogue without PII.
  - Outcomes: True Positive ($TP$), False Positive ($FP$), True Negative ($TN$), False Negative ($FN$).
  - Mathematical Metrics:
    $$\text{Precision} = \frac{TP}{TP + FP}, \quad \text{Recall} = \frac{TP}{TP + FN}, \quad \text{Specificity} = \frac{TN}{TN + FP}$$
    $$F_1\text{-Score} = 2 \cdot \frac{\text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}}, \quad \text{Accuracy} = \frac{TP + TN}{P + N}$$

---

### 5. Test Corpus Design & Class Distribution

The testbed consists of $N = 500$ meticulously constructed cases across 10 balanced categories ($50$ cases per category):

| # | Category | Ground Truth | Sample Count | Representative Syntactic Patterns |
|---|---|:---:|:---:|---|
| 1 | `Indian_Phone_Standard` | **PII (Pos)** | 50 | `9876543210`, `98765 43210`, `9876-543-210`, `09876543210`, `044-24567890` |
| 2 | `Indian_Phone_Prefixed` | **PII (Pos)** | 50 | `+91 9876543210`, `+91-98765-43210`, `91-9876543210`, `+91 (98765) 43210` |
| 3 | `International_Phone` | **PII (Pos)** | 50 | `+1 202 555 0143`, `+44 20 7946 0958`, `+65 6789 0123`, `+61 2 9374 4000` |
| 4 | `Email_Address` | **PII (Pos)** | 50 | `technician.ac@gmail.com`, `user_123@yahoo.co.in`, `support+priority@connect360.in` |
| 5 | `Dialogue_PII_Embedded` | **PII (Pos)** | 50 | `"Please call me directly at 9876543210 to discuss the AC repair."` |
| 6 | `Operational_Prices` | **Benign (Neg)** | 50 | `₹500`, `Rs. 1500`, `₹1200`, `₹3,500 via UPI`, `Rs 2500` |
| 7 | `Operational_Pincodes` | **Benign (Neg)** | 50 | `600020` (Adyar), `600042` (Velachery), `560034` (Koramangala), `110001` (Delhi) |
| 8 | `Operational_Dates_Times` | **Benign (Neg)** | 50 | `2026-09-20`, `10:30 AM`, `19/09/2026`, `2026-09-19T10:15:30Z`, `14:00 to 16:00` |
| 9 | `Operational_Specs_Dimensions` | **Benign (Neg)** | 50 | `1.5 ton split AC`, `220V to 240V at 50Hz`, `55-inch OLED`, `7.5 kg 1400 RPM` |
| 10 | `Operational_Dialogue_Benign` | **Benign (Neg)** | 50 | `"Booking ID: BOOKING#b-10293 is currently in progress."`, `"Rating 4.8 out of 5"` |

---

### 6. Empirical Results & Performance Analysis

#### Measured Statistical Breakdown by Category (`metric5_summary_pii.csv`)

| Category | Samples | TP | TN | FP | FN | Precision | Recall | Specificity | $F_1$-Score | Accuracy | Mean Latency ($\mu\text{s}$) | P99 Latency ($\mu\text{s}$) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `Indian_Phone_Standard` | 50 | 50 | 0 | 0 | 0 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.209 | 4.429 |
| `Indian_Phone_Prefixed` | 50 | 49 | 0 | 0 | 1 | 1.0000 | 0.9800 | 1.0000 | 0.9899 | 0.9800 | 1.402 | 7.285 |
| `International_Phone` | 50 | 49 | 0 | 0 | 1 | 1.0000 | 0.9800 | 1.0000 | 0.9899 | 0.9800 | 1.171 | 2.368 |
| `Email_Address` | 50 | 50 | 0 | 0 | 0 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0.946 | 3.748 |
| `Dialogue_PII_Embedded` | 50 | 50 | 0 | 0 | 0 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 2.665 | 9.014 |
| `Operational_Prices` | 50 | 0 | 50 | 0 | 0 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 2.402 | 3.404 |
| `Operational_Pincodes` | 50 | 0 | 50 | 0 | 0 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.939 | 4.324 |
| `Operational_Specs_Dimensions` | 50 | 0 | 50 | 0 | 0 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 2.415 | 3.117 |
| `Operational_Dialogue_Benign` | 50 | 0 | 49 | 1 | 0 | 0.0000 | 1.0000 | 0.9800 | 0.0000 | 0.9800 | 2.643 | 3.802 |
| `Operational_Dates_Times` | 50 | 0 | 26 | 24 | 0 | 0.0000 | 1.0000 | 0.5200 | 0.0000 | 0.5200 | 2.399 | 4.526 |
| **OVERALL** | **500** | **248** | **225** | **25** | **2** | **0.9084** | **0.9920** | **0.9000** | **0.9484** | **0.9460** | **1.919** | **6.021** |

---

### 7. Confusion Matrix & Misclassification Diagnostics

```
                    Predicted PII ([hidden])     Predicted Benign (Unchanged)
Actual PII (Pos)              248 (TP)                         2 (FN)
Actual Benign (Neg)            25 (FP)                       225 (TN)
```

#### Diagnostic 1: Root Cause of False Negatives (PII Leakage: 2 cases)
- **Case 1 (`Indian_Phone_Prefixed`):** `"+91 (98765) 43210"` $\rightarrow$ Unchanged (FN)
- **Case 2 (`International_Phone`):** `"+1 (202) 555-0143"` $\rightarrow$ Unchanged (FN)
- **Mechanism:** The phone regex pattern is `(?<!\d)(\+?\d[\d\s\-]{8,}\d)(?!\d)`. The character class `[\d\s\-]` only matches digits, whitespace, and hyphens. When an area code is enclosed in parentheses `(` or `)`, the regex matching engine terminates at the parenthesis character. Since neither the prefix segment nor the tail segment satisfies the $\ge 8$ intermediate character requirement, the number is completely skipped.
- **Severity:** Low in frequency ($0.80\%$ of PII cases), but represents a known evasion vector if users deliberately enclose digits in parentheses to bypass the filter.

#### Diagnostic 2: Root Cause of False Positives (Over-Redaction: 25 cases)
- **Case Group A (24 Cases in `Operational_Dates_Times`):**
  - Input: `"Your booking is scheduled for 2026-09-20 at 10:30 AM."`
  - Output: `"Your booking is scheduled for [hidden] at 10:30 AM."`
  - Mechanism: ISO 8601 calendar dates `YYYY-MM-DD` (e.g., `2026-09-20`) consist of a leading digit `2`, followed by 8 characters `026-09-2` (all belonging to `[\d\-]`), and a trailing digit `0`. This precisely satisfies the regex length threshold ($1 + 8 + 1 = 10\text{ characters}$), causing the date to be erroneously classified as a phone number.
- **Case Group B (1 Case in `Operational_Dialogue_Benign`):**
  - Input: `"Invoice ID: INV-2026-00491 generated."`
  - Output: `"Invoice ID: INV-[hidden] generated."`
  - Mechanism: The substring `2026-00491` has 10 characters matching the `[\d\-]` pattern, triggering over-redaction.

#### Diagnostic 3: Complete Non-Interference with Critical Operational Tokens
- **Prices:** $100\%$ preserved ($50/50$). Numbers like `₹1200`, `Rs. 1500`, and `₹3,500` are unaffected because currency symbols and commas break the pattern, and digit sequences are shorter than 10 characters.
- **Indian Postal PIN Codes:** $100\%$ preserved ($50/50$). Indian PIN codes (e.g., `600020`, `560034`) contain exactly 6 digits, strictly below the 10-character threshold ($1 + 8 + 1$).
- **Technical Specs & Dimensions:** $100\%$ preserved ($50/50$). Quantities like `1.5 ton`, `220V 50Hz`, and `1400 RPM` do not trigger matches.

---

### 8. Execution Latency & Overhead Profile

The execution latency was profiled across 50,000 runs using a high-resolution hardware counter:

- **Mean Latency:** $1.919\ \mu\text{s}$ ($0.00192\text{ ms}$)
- **Median (P50) Latency:** $1.920\ \mu\text{s}$ ($0.00192\text{ ms}$)
- **P90 Latency:** $3.110\ \mu\text{s}$ ($0.00311\text{ ms}$)
- **P99 Latency:** $6.021\ \mu\text{s}$ ($0.00602\text{ ms}$)
- **Worst-Case Peak Latency:** $10.12\ \mu\text{s}$ ($0.01012\text{ ms}$)

**Latency Overhead Comparison:**
- AWS Lambda cold start: $\approx 250\text{--}400\text{ ms}$
- Bedrock / Gemini LLM API call: $\approx 800\text{--}1800\text{ ms}$
- DynamoDB single-item fetch: $\approx 8\text{--}15\text{ ms}$
- **`_strip_contact_details()` Redaction Filter:** $\mathbf{0.00192\text{ ms}}$ ($\mathbf{0.0001\%}$ of total end-to-end request budget)

The computational overhead of the redaction filter is negligible, proving that deterministic regex post-processing introduces zero perceptible latency in a serverless architecture.

---

### 9. Architectural Implications for Marketplace Platforms

1. **Defense-in-Depth Superiority:** An LLM alone cannot be trusted with safety invariants due to prompt injection, semantic jailbreaks, and hallucinations. A deterministic post-processor ensures that even if the LLM reflects user-supplied phone numbers, the platform border remains secure.
2. **Asymmetric Risk Profile:** In marketplace economics, the cost of a False Negative (customer contacts worker directly $\rightarrow$ lost transaction fees + liability for unvetted off-platform services) is significantly higher than a False Positive (a scheduled date being hidden in chat, prompting the user to view the native UI booking card). Thus, the filter's heavy bias toward high recall ($99.20\%$) aligns with commercial requirements.
3. **Complementary UI Design:** Because Connect360 renders booking dates and scheduled times in dedicated UI widget cards (e.g., booking header and status banner), over-redaction of dates in natural language chat responses does not impair user experience.

---

### 10. Threats to Validity

- **Internal Validity:** The test corpus was synthetically constructed to encompass standard Indian and international formats. While it covers realistic marketplace dialogue, unstructured colloquial slang (e.g., `"call me on nine eight four zero zero..."`) was not tested against regex since word-based evasion requires NLP/token classification rather than regex.
- **External Validity:** The regex was evaluated in Python 3.13. Regular expression execution speeds may vary slightly in Node.js or edge workers (Cloudflare Workers / AWS CloudFront Functions), though algorithmic complexity $O(L)$ remains identical.
- **Construct Validity:** Redaction efficacy was defined as presence of `[hidden]`. Partial redactions (where only a subset of digits is replaced) were scored based on whether the sensitive contact channel was effectively neutralized.

---

### 11. Engineering Recommendations & Proposed Regex Hardening

To address the two identified failure modes without increasing computational complexity:

#### Proposed Hardened Implementation

```python
def _strip_contact_details_v2(text):
    """Hardened defensive redaction: supports parentheses and excludes ISO dates."""
    import re
    if not text:
        return text
    # 1. Redact Emails
    text = re.sub(r'[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}', '[hidden]', text)
    # 2. Exclude ISO 8601 dates (YYYY-MM-DD) via negative lookahead, support parentheses
    # Requires digits, hyphens, spaces, and optional parentheses, but prevents matching YYYY-MM-DD
    phone_pattern = r'(?<!\d)(?!\d{4}-\d{2}-\d{2})(\+?\d[\d\s\-\(\)]{8,}\d)(?!\d)'
    text = re.sub(phone_pattern, '[hidden]', text)
    return text
```

**Expected Impact of Hardened Pattern:**
- **Recall:** Increases from $99.20\%$ to $100.00\%$ (capturing parenthesized area codes).
- **Date Preservation (Specificity):** Increases from $52.00\%$ to $100.00\%$ on standard dates.
- **Estimated Latency:** Unchanged ($< 3\ \mu\text{s}$).

---

### 12. Research Paper Citation & Artifact Manifest

```bibtex
@inproceedings{connect360_metric5_2026,
  author    = {Connect360 Research Team},
  title     = {Empirical Evaluation of Multi-Tier PII Defense and Contact Redaction in On-Demand Service Marketplaces},
  booktitle = {Proceedings of the International Conference on Cloud Computing and Software Engineering (CCSE)},
  year      = {2026},
  pages     = {1--12}
}
```

- **Master Figure:** [`metric5_confusion_matrix_and_performance.png`](file:///C:/Users/rsdha/.gemini/antigravity/scratch/Connect360/evaluation/metric5_ai_safety/metric5_confusion_matrix_and_performance.png)
- **Summary Dataset:** [`metric5_summary_pii.csv`](file:///C:/Users/rsdha/.gemini/antigravity/scratch/Connect360/evaluation/metric5_ai_safety/metric5_summary_pii.csv)
- **Raw Micro-Data:** [`metric5_raw_pii_redaction.csv`](file:///C:/Users/rsdha/.gemini/antigravity/scratch/Connect360/evaluation/metric5_ai_safety/metric5_raw_pii_redaction.csv)
