import os
import io
import subprocess
from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

REPORT_DIR = os.path.abspath(os.path.dirname(__file__))
HTML_PATH = os.path.join(REPORT_DIR, "CONNECT360_PHASE1_PROJECT_REPORT.html")
TEMP_PDF_PATH = os.path.join(REPORT_DIR, "temp_report.pdf")
TARGET_PDF_PATH = os.path.join(REPORT_DIR, "CONNECT360_PHASE1_PROJECT_REPORT.pdf")
UPDATED_PDF_PATH = os.path.join(REPORT_DIR, "CONNECT360_PHASE1_PROJECT_REPORT_UPDATED.pdf")
EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

print("Compiling raw PDF via Microsoft Edge headless...")
cmd = [
    EDGE_PATH,
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    f"--print-to-pdf={TEMP_PDF_PATH}",
    HTML_PATH
]
res = subprocess.run(cmd, capture_output=True, text=True)

if not os.path.exists(TEMP_PDF_PATH):
    print(f"Error: Edge failed to generate temp PDF: {res.stderr}")
    exit(1)

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

    overlay = PdfReader(packet)
    page.merge_page(overlay.pages[0])
    writer.add_page(page)

# Always save to UPDATED_PDF_PATH
with open(UPDATED_PDF_PATH, "wb") as f:
    writer.write(f)
print(f"Successfully saved stamped PDF to: {UPDATED_PDF_PATH}")

# Try overwriting TARGET_PDF_PATH
try:
    with open(TARGET_PDF_PATH, "wb") as f:
        writer.write(f)
    print(f"Successfully updated primary PDF: {TARGET_PDF_PATH}")
except PermissionError:
    print(f"Note: Primary PDF ({TARGET_PDF_PATH}) is currently locked by a PDF reader. Accessible at {UPDATED_PDF_PATH}.")

if os.path.exists(TEMP_PDF_PATH):
    os.remove(TEMP_PDF_PATH)

final_reader = PdfReader(UPDATED_PDF_PATH)
print(f"Total Pages: {len(final_reader.pages)}")
print(f"File Size: {os.path.getsize(UPDATED_PDF_PATH) / 1024.0:.2f} KB")
