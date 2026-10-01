import os
import subprocess
import io
from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

REPORT_DIR = os.path.abspath(os.path.dirname(__file__))
HTML_PATH = os.path.join(REPORT_DIR, "CONNECT360_PHASE1_PROJECT_REPORT.html")
MD_PATH = os.path.join(REPORT_DIR, "CONNECT360_PHASE1_PROJECT_REPORT.md")
TEMP_PDF_PATH = os.path.join(REPORT_DIR, "temp_report.pdf")
FINAL_PDF_PATH = os.path.join(REPORT_DIR, "CONNECT360_PHASE1_PROJECT_REPORT.pdf")
EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

with open(HTML_PATH, "r", encoding="utf-8") as f:
    html = f.read()

# 1. Update Title Page Student Table
old_student_table = """  <table class="student-table">
    <tr><td>DHARSHINI R S</td><td>230701076</td></tr>
    <tr><td>JAYADHARSINI M</td><td>[TO BE PROVIDED]</td></tr>
    <tr><td>SURYA NIRANJAN S</td><td>[TO BE PROVIDED]</td></tr>
    <tr><td>PRASHAANT V</td><td>[TO BE PROVIDED]</td></tr>
  </table>"""

new_student_table = """  <table class="student-table">
    <tr><td>JAYADHARSINI M</td><td>230701127</td></tr>
    <tr><td>DHARSHINI R S</td><td>230701076</td></tr>
    <tr><td>ENIYA B A</td><td>230701085</td></tr>
    <tr><td>JAYAPRADHA P</td><td>230701130</td></tr>
  </table>"""

html = html.replace(old_student_table, new_student_table)

# 2. Update Certificate Supervisor Block
old_cert_supervisor = """        <strong>[TO BE PROVIDED]</strong><br>
        SUPERVISOR / PROJECT GUIDE<br>
        Assistant Professor / Associate Professor,<br>
        Department of Computer Science &amp; Engg.,<br>
        Rajalakshmi Engineering College,<br>
        Thandalam, Chennai - 602 105."""

new_cert_supervisor = """        <strong>Ms. Divya M</strong><br>
        SUPERVISOR / PROJECT GUIDE<br>
        Assistant Professor (CSE),<br>
        Department of Computer Science &amp; Engg.,<br>
        Rajalakshmi Engineering College,<br>
        Thandalam, Chennai - 602 105."""

html = html.replace(old_cert_supervisor, new_cert_supervisor)

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(html)
print("Updated HTML with correct Title Page student table and Certificate supervisor!")

# 3. Compile PDF via Edge
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

# 4. Stamp Academic Page Numbers
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
