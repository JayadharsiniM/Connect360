import os
import re
import io
import subprocess
from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

REPORT_DIR = os.path.abspath(os.path.dirname(__file__))
HTML_PATH = os.path.join(REPORT_DIR, "CONNECT360_PHASE1_PROJECT_REPORT.html")
MD_PATH = os.path.join(REPORT_DIR, "CONNECT360_PHASE1_PROJECT_REPORT.md")
TEMP_PDF_PATH = os.path.join(REPORT_DIR, "temp_report.pdf")
FINAL_PDF_PATH = os.path.join(REPORT_DIR, "CONNECT360_PHASE1_PROJECT_REPORT.pdf")
EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

# =============================================================================
# 1. UPDATE HTML REPORT
# =============================================================================
with open(HTML_PATH, "r", encoding="utf-8") as f:
    html = f.read()

# Update 1.2 Objective item for Telephony
old_obj = "<li><strong>Preserve Telephony Privacy via Virtual Number Masking:</strong> Integrate E.164-compliant phone normalization and virtual bridge session generation to ensure that customers and service partners communicate through ephemeral, masked channels without exposing private phone numbers.</li>"
new_obj = "<li><strong>Preserve Telephony Privacy via Phone Number Masking:</strong> Enforce strict phone number masking across all platform interfaces and transcripts. Enable secure direct calling via device dialers exclusively for active bookings, ensuring personal contact numbers are never rendered in plaintext or exposed to scraping.</li>"
html = html.replace(old_obj, new_obj)

# Update 1.4 Proposed System item for Telephony
old_prop = "<li><strong>E.164 Telephony Virtual Bridging:</strong> Supported by <code>Virtual Telephony Module</code>, phone numbers are standardized to international E.164 format and connected via ephemeral masked bridge channels, keeping personal numbers confidential and deterring off-platform leakage.</li>"
new_prop = "<li><strong>Phone Number Masking &amp; Secure Direct Calling:</strong> Supported by the <code>Virtual Telephony Module</code>, phone numbers are standardized to E.164 format and strictly masked across all UI views. Direct calling is enabled exclusively for active bookings via native device dialers, with the backend adapter prepared for cloud PBX virtual bridging in Phase-II.</li>"
html = html.replace(old_prop, new_prop)

# Update Table 2.1 Telephony Privacy row
old_t21 = "<td><strong>E.164 Normalized Masked Bridge</strong></td>"
new_t21 = "<td><strong>Masked Number Display &amp; Direct Calling (Phase-I) / Virtual Bridge (Phase-II)</strong></td>"
html = html.replace(old_t21, new_t21)

# Update Table 3.1 Telephony Integration row
old_t31 = "<tr><td>Telephony Integration</td><td>Twilio / Exotel Voice API</td><td>REST API, Virtual Number Masking</td></tr>"
new_t31 = "<tr><td>Telephony Integration</td><td>Direct-dial dialer + Twilio Voice Adapter</td><td>Phone Number Masking &amp; Direct Calling (Phase-I); Cloud PBX Bridge (Phase-II)</td></tr>"
html = html.replace(old_t31, new_t31)

# Update 4.2.7 Module 7
old_mod7 = """<h3 class="subsection-heading">4.2.7 Module 7: Privacy-Preserving Virtual Telephony</h3>
<p>Defined in <code>Virtual Telephony Module</code>, this module normalizes domestic and international phone numbers into E.164 format and interacts with telephony gateway APIs (Twilio/Exotel). When a customer or technician taps "Call Partner", the system initiates a masked bridge session, connecting both parties through a centralized virtual number while keeping their true telephone numbers completely confidential.</p>"""

new_mod7 = """<h3 class="subsection-heading">4.2.7 Module 7: Privacy-Preserving Telephony &amp; Phone Number Masking</h3>
<p>In the current Connect360 implementation, telephony privacy is preserved by strictly masking personal phone numbers across all user interfaces, worker cards, and chat transcripts. Rather than exposing raw contact numbers, the platform displays masked placeholders (e.g., <code>+91 XXXXX 12345</code>) to prevent casual contact harvesting and off-platform disintermediation. Direct calling is enabled exclusively for active bookings: when an authorized customer or assigned technician taps "Call Partner", the application invokes the device's native dialer via a secure <code>tel:</code> scheme. This ensures that counterparty phone numbers are never rendered in the web DOM or exposed to scraping. Furthermore, the backend <code>Virtual Telephony Module</code> implements E.164 normalization and isolates provider adapters, preparing the infrastructure for full two-way cloud virtual PBX proxy bridging (Twilio/Exotel) in Phase-II.</p>"""

html = html.replace(old_mod7, new_mod7)

# Update 6.2 Future Work for Telephony
old_fw = "<li><strong>WebRTC In-App Audio Calling:</strong> Transition from carrier-based virtual number bridging to end-to-end encrypted WebRTC audio calls directly within the React web application, further reducing telephony operational costs.</li>"
new_fw = "<li><strong>Cloud PBX Virtual Bridging &amp; WebRTC Audio:</strong> Transition from Phase-I direct calling with UI number masking to automated two-way cloud virtual PBX proxy bridging (Twilio/Exotel) and in-app encrypted WebRTC voice calls, completely eliminating phone number exchange across the carrier network.</li>"
html = html.replace(old_fw, new_fw)

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(html)
print("Updated HTML report with accurate telephony masking & direct calling description!")

# =============================================================================
# 2. UPDATE MARKDOWN REPORT
# =============================================================================
with open(MD_PATH, "r", encoding="utf-8") as f:
    md = f.read()

md = md.replace(old_obj, new_obj)
md = md.replace(old_prop, new_prop)
md = md.replace(old_t21, new_t21)
md = md.replace(old_t31, new_t31)

old_mod7_md = """### 4.2.7 Module 7: Privacy-Preserving Virtual Telephony
Defined in `Virtual Telephony Module`, this module normalizes domestic and international phone numbers into E.164 format and interacts with telephony gateway APIs (Twilio/Exotel). When a customer or technician taps "Call Partner", the system initiates a masked bridge session, connecting both parties through a centralized virtual number while keeping their true telephone numbers completely confidential."""

new_mod7_md = """### 4.2.7 Module 7: Privacy-Preserving Telephony & Phone Number Masking
In the current Connect360 implementation, telephony privacy is preserved by strictly masking personal phone numbers across all user interfaces, worker cards, and chat transcripts. Rather than exposing raw contact numbers, the platform displays masked placeholders (e.g., `+91 XXXXX 12345`) to prevent casual contact harvesting and off-platform disintermediation. Direct calling is enabled exclusively for active bookings: when an authorized customer or assigned technician taps "Call Partner", the application invokes the device's native dialer via a secure `tel:` scheme. This ensures that counterparty phone numbers are never rendered in the web DOM or exposed to scraping. Furthermore, the backend `Virtual Telephony Module` implements E.164 normalization and isolates provider adapters, preparing the infrastructure for full two-way cloud virtual PBX proxy bridging (Twilio/Exotel) in Phase-II."""

md = md.replace(old_mod7_md, new_mod7_md)
md = md.replace(old_fw, new_fw)

with open(MD_PATH, "w", encoding="utf-8") as f:
    f.write(md)
print("Updated Markdown report successfully!")

# =============================================================================
# 3. RECOMPILE PDF VIA EDGE & STAMP OFFICIAL PAGE NUMBERS
# =============================================================================
print("Compiling raw PDF via Microsoft Edge headless...")
cmd = [
    EDGE_PATH,
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    f"--print-to-pdf={TEMP_PDF_PATH}",
    HTML_PATH
]
subprocess.run(cmd, capture_output=True, text=True)

print("Stamping official academic page numbers...")
reader = PdfReader(TEMP_PDF_PATH)
writer = PdfWriter()
roman_nums = ["ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"]

for idx, page in enumerate(reader.pages):
    if idx == 0:
        writer.add_page(page)
        continue

    if 1 <= idx <= 9:
        num_str = roman_nums[idx - 1]
    else:
        num_str = str((idx - 10) + 1)

    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=A4)
    can.setFont("Times-Roman", 11)
    can.drawCentredString(595.27 / 2.0, 36.0, num_str)
    can.save()
    packet.seek(0)

    overlay_reader = PdfReader(packet)
    page.merge_page(overlay_reader.pages[0])
    writer.add_page(page)

with open(FINAL_PDF_PATH, "wb") as f:
    writer.write(f)

if os.path.exists(TEMP_PDF_PATH):
    os.remove(TEMP_PDF_PATH)

final_reader = PdfReader(FINAL_PDF_PATH)
size_kb = os.path.getsize(FINAL_PDF_PATH) / 1024.0
print(f"Final Recompiled Academic PDF: {FINAL_PDF_PATH}")
print(f"Total Pages: {len(final_reader.pages)}")
print(f"File Size: {size_kb:.2f} KB")
