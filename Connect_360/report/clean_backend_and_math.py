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
TARGET_PDF_PATH = os.path.join(REPORT_DIR, "CONNECT360_PHASE1_PROJECT_REPORT.pdf")
UPDATED_PDF_PATH = os.path.join(REPORT_DIR, "CONNECT360_PHASE1_PROJECT_REPORT_UPDATED.pdf")
EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

# 1. Update HTML
with open(HTML_PATH, "r", encoding="utf-8") as f:
    html = f.read()

# Fix backend attribute expressions in HTML
backend_replacements = [
    (r"\(<code>attribute_exists\(booking_id\) AND #s = :pending</code>\)", "(requiring that the booking exists and remains in a pending unassigned state)"),
    (r"ConditionExpression=\"attribute_exists\(booking_id\) AND #status = :pending\"", "ConditionExpression=\"booking_exists AND status_is_pending\""),
    (r"<code>_strip_contact_details\(\)</code>", "deterministic contact redaction filter"),
    (r"\(_strip_contact_details\(\)\)", "(deterministic contact redaction filter)"),
    (r"<code>Candidate Matching Engine</code>\s*&rarr;\s*<code>rank_workers\(\)</code>", "Candidate Matching Engine"),
    (r"<code>Candidate Matching Engine</code>\s*\$\\?nightarrow\$\s*<code>rank_workers\(\)</code>", "Candidate Matching Engine"),
    (r"<code>rank_workers\(\)</code>", "candidate ranking algorithm"),
    (r"Defined in Candidate Matching Engine,", "In the Candidate Matching Engine,"),
    (r"Implemented in Priority Dispatch Handler,", "In the Priority Dispatch Handler,"),
    (r"Defined in Conversational AI Assistant Module and Assistant Knowledge Base,", "In the Conversational AI Assistant Module,"),
    (r"\(Client Spatial Routing Service\)", ""),
]

for pat, repl in backend_replacements:
    html = re.sub(pat, repl, html)

# Clean all remaining dollar sign expressions in HTML
dollar_replacements = [
    (r"\$\s*\\?tau\s*=\s*1\.285\s*\$", "<i>&tau;</i> = 1.285"),
    (r"\$\s*\\?tau\s*=\s*0\.650\s*\$", "<i>&tau;</i> = 0.650"),
    (r"\$\s*\\?tau\s*=\s*1\.623\s*\$", "<i>&tau;</i> = 1.623"),
    (r"\$\s*\\?tau\s*=\s*D_\{?\s*t?ext\{OSRM\}\s*\}?\s*/\s*D_\{?\s*t?ext\{Hav\}\s*\}?\s*\$", "<i>&tau;</i> = <i>D</i><sub>OSRM</sub> / <i>D</i><sub>Hav</sub>"),
    (r"\$\s*\\?tau\s*=\s*D_\{?\s*t?ext\{network\}\s*\}?\s*/\s*D_\{?\s*t?ext\{Euclidean\}\s*\}?\s*\$", "<i>&tau;</i> = <i>D</i><sub>network</sub> / <i>D</i><sub>Euclidean</sub>"),
    (r"\$\s*\\?tau\s*\$", "<i>&tau;</i>"),
    (r"\$\s*\\?n?rho\s*=\s*0\.836\s*\$", "<i>&rho;</i> = 0.836"),
    (r"\$\s*\\?n?rho\s*\$", "<i>&rho;</i>"),
    (r"\$\s*w_d\s*=\s*0\.35,\s*w_r\s*=\s*0\.40\s*\$", "<i>w</i><sub>d</sub> = 0.35, <i>w</i><sub>r</sub> = 0.40"),
    (r"\$\s*w_d\s*=\s*0\.50,\s*w_r\s*=\s*0\.20\s*\$", "<i>w</i><sub>d</sub> = 0.50, <i>w</i><sub>r</sub> = 0.20"),
    (r"\$\s*\(?\s*w_d\s*\)?\s*\$", "(<i>w</i><sub>d</sub>)"),
    (r"\$\s*\(?\s*w_r\s*\)?\s*\$", "(<i>w</i><sub>r</sub>)"),
    (r"\$\s*\(?\s*w_e\s*\)?\s*\$", "(<i>w</i><sub>e</sub>)"),
    (r"\$\s*\(?\s*w_c\s*\)?\s*\$", "(<i>w</i><sub>c</sub>)"),
    (r"\$\s*1\.2\s*t?ext\{?\s*seconds\}?\s*\$", "1.2 seconds"),
    (r"\$\s*1\.2\s*\$", "1.2"),
    (r"\$\s*1\.4\s*\$", "1.4"),
    (r"\$\s*3\.894\s*t?ms\s*\$", "3.894 ms"),
    (r"\$\s*1\.919\s*&mu;s\s*\$", "1.919 &mu;s"),
    (r"\$\s*5\.973\s*&mu;s\s*\$", "5.973 &mu;s"),
    (r"\$\s*8\s*&ndash;\s*15\s*t?ms\s*\$", "8&ndash;15 ms"),
    (r"\$\s*10\s*&ndash;\s*25\s*t?ms\s*\$", "10&ndash;25 ms"),
    (r"\$\s*5\s*&ndash;\s*12\s*t?km\s*\$", "5&ndash;12 km"),
    (r"\$\s*12\s*&ndash;\s*20\s*t?km\s*\$", "12&ndash;20 km"),
    (r"\$\s*<\s*5\s*t?km\s*\$", "&lt; 5 km"),
    (r"\$\s*25\s*t?km\s*\$", "25 km"),
    (r"\$\s*0\.4\s*t?ms\s*\$", "0.4 ms"),
    (r"\$\s*20\s*t?ms\s*\$", "20 ms"),
    (r"\$\s*70\.0\\?%\s*\$", "70.0%"),
    (r"\$\s*\+5\.7\\?%\s*\$", "+5.7%"),
    (r"\$\s*0\.00\\?%\s*\$", "0.00%"),
    (r"\$\s*0\.80\\?%\s*\$", "0.80%"),
    (r"\$\s*\+7\.8\s*t?km\s*\$", "+7.8 km"),
    (r"\$\s*9,400\s*\$", "9,400"),
    (r"\$\s*1,000\s*\$", "1,000"),
    (r"\$\s*16,000\s*\$", "16,000"),
    (r"\$\s*248/250\s*\$", "248/250"),
    (r"\$\s*-28\s*\$", "-28"),
    (r"\$\s*\+26\s*\$", "+26"),
    (r"\$\s*0\s*\$", "0"),
    (r"\$\s*C\s*\\in\s*\[1,\s*100\]\s*\$", "<i>C</i> &isin; [1, 100]"),
    (r"\$\s*C\s*\\in\s*\[10,\s*500\]\s*\$", "<i>C</i> &isin; [10, 500]"),
    (r"\$\s*C\s*\\in\s*\\\{1,\s*2,\s*5,\s*10,\s*20,\s*50,\s*100\\\}\s*\$", "<i>C</i> &isin; {1, 2, 5, 10, 20, 50, 100}"),
    (r"\$\s*E\s*\\in\s*\[1,\s*20\]\s*\$", "<i>E</i> &isin; [1, 20]"),
    (r"\$\s*N\s*=\s*100\s*\$", "<i>N</i> = 100"),
    (r"\$\s*N\s*=\s*5,000\s*\$", "<i>N</i> = 5,000"),
    (r"\$\s*N\s*\\in\s*\[10,\s*5000\]\s*\$", "<i>N</i> &isin; [10, 5000]"),
    (r"\$\s*N\s*\\in\s*\\\{10,\s*50,\s*100,\s*250,\s*500,\s*1000,\s*2500,\s*5000\\\}\s*\$", "<i>N</i> &isin; {10, 50, 100, 250, 500, 1000, 2500, 5000}"),
    (r"\$\s*R\s*\\in\s*\[3\.0,\s*5\.0\]\s*\$", "<i>R</i> &isin; [3.0, 5.0]"),
    (r"\$\s*\\Delta\s*t?ext\{Rank\}\s*<\s*0\s*\$", "&Delta;Rank &lt; 0"),
    (r"\$\s*\\Delta\s*t?ext\{Rank\}\s*>\s*0\s*\$", "&Delta;Rank &gt; 0"),
    (r"\$\s*\\Delta\s*t?ext\{Rank\}\s*=\s*t?ext\{Rank\}_\{?\s*t?ext\{Normal\}\s*\}?\s*-\s*t?ext\{Rank\}_\{?\s*t?ext\{Priority\}\s*\}?\s*\$", "&Delta;Rank = Rank<sub>Normal</sub> &minus; Rank<sub>Priority</sub>"),
    (r"\$\s*\\Delta\s*t?ext\{Rank\}\s*\$", "&Delta;Rank"),
    (r"\$\s*\\Delta\s*S\s*\$", "&Delta;<i>S</i>"),
    (r"\$\s*\\?nightarrow\s*\$", "&rarr;"),
    (r"\(\$\s*au\s*=\s*1\.285\s*\$\)", "(tortuosity factor <i>&tau;</i> = 1.285)"),
    (r"\(\$\s*\\?tau\s*=\s*1\.285\s*\$\)", "(tortuosity factor <i>&tau;</i> = 1.285)"),
]

for pat, repl in dollar_replacements:
    html = re.sub(pat, repl, html)

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(html)
print("Updated HTML report cleanly!")

# 2. Update Markdown
with open(MD_PATH, "r", encoding="utf-8") as f:
    md = f.read()

md_replacements = [
    (r"\(attribute_exists\(booking_id\) AND #s = :pending\)", "(requiring that the booking exists and remains in a pending unassigned state)"),
    (r"ConditionExpression=\"attribute_exists\(booking_id\) AND #status = :pending\"", "ConditionExpression=\"booking_exists AND status_is_pending\""),
    (r"_strip_contact_details\(\)", "deterministic contact redaction filter"),
    (r"rank_workers\(\)", "candidate ranking algorithm"),
    (r"\(\$ au = 1\.285\$\)", "(tortuosity factor $\\tau = 1.285$)"),
    (r"\(\$\\tau = 1\.285\$\)", "(tortuosity factor $\\tau = 1.285$)"),
    (r"Defined in Candidate Matching Engine,", "In the Candidate Matching Engine,"),
    (r"Implemented in Priority Dispatch Handler,", "In the Priority Dispatch Handler,"),
    (r"Defined in Conversational AI Assistant Module and Assistant Knowledge Base,", "In the Conversational AI Assistant Module,"),
    (r"\(Client Spatial Routing Service\)", ""),
]

for pat, repl in md_replacements:
    md = re.sub(pat, repl, md)

with open(MD_PATH, "w", encoding="utf-8") as f:
    f.write(md)
print("Updated Markdown report cleanly!")

# 3. Recompile PDF via Edge
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

    overlay = PdfReader(packet)
    page.merge_page(overlay.pages[0])
    writer.add_page(page)

with open(UPDATED_PDF_PATH, "wb") as f:
    writer.write(f)

try:
    with open(TARGET_PDF_PATH, "wb") as f:
        writer.write(f)
    print(f"Updated primary PDF: {TARGET_PDF_PATH}")
except PermissionError:
    print(f"Primary PDF locked; accessible via {UPDATED_PDF_PATH}")

if os.path.exists(TEMP_PDF_PATH):
    os.remove(TEMP_PDF_PATH)

print("PDF recompiled successfully!")
