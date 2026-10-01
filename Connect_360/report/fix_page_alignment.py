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

with open(HTML_PATH, "r", encoding="utf-8") as f:
    html = f.read()

# 1. REMOVE @bottom-center from CSS so Edge does NOT print conflicting page numbers!
old_page_css = """  @page {
    size: A4;
    margin-top: 1.0in;
    margin-bottom: 1.0in;
    margin-left: 1.25in;
    margin-right: 1.0in;
    @bottom-center {
      content: counter(page);
      font-family: "Times New Roman", Times, serif;
      font-size: 11pt;
    }
  }"""

new_page_css = """  @page {
    size: A4;
    margin-top: 1.0in;
    margin-bottom: 1.0in;
    margin-left: 1.25in;
    margin-right: 1.0in;
  }"""

html = html.replace(old_page_css, new_page_css)

# Also check for single-brace version
html = re.sub(r'@bottom-center\s*\{[^}]*\}', '', html)

# 2. ENHANCE TOC, LIST OF TABLES, AND LIST OF FIGURES CSS FOR PERFECT COLUMN ALIGNMENT
old_toc_css = """  table.toc-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
    font-size: 11pt;
    line-height: 1.6;
  }
  table.toc-table th, table.toc-table td {
    padding: 4px 6px;
    border: none;
  }
  table.toc-table th {
    border-bottom: 1.5px solid #000000;
  }"""

new_toc_css = """  table.toc-table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    margin-top: 15px;
    font-size: 11pt;
    line-height: 1.6;
  }
  table.toc-table th {
    border-bottom: 1.5px solid #000000;
    padding: 6px 0;
    font-weight: bold;
  }
  table.toc-table td {
    padding: 4px 0;
    vertical-align: bottom;
  }
  table.toc-table .col-num {
    width: 16%;
    text-align: left;
  }
  table.toc-table .col-title {
    width: 72%;
    text-align: left;
    padding-right: 12px;
  }
  table.toc-table .col-page {
    width: 12%;
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }"""

if old_toc_css in html:
    html = html.replace(old_toc_css, new_toc_css)
else:
    html = html.replace("table.toc-table {", new_toc_css + "\n  .old-toc {")

# 3. Add class names to the table rows in TOC, List of Tables, and List of Figures
def format_toc_row(m):
    c1, c2, c3 = m.group(1), m.group(2), m.group(3)
    return f'<tr><td class="col-num">{c1}</td><td class="col-title">{c2}</td><td class="col-page">{c3}</td></tr>'

# Format headers
html = html.replace(
    '<tr>\n    <th style="width: 15%; text-align: left;">CHAPTER NO.</th>\n    <th style="width: 70%; text-align: left;">TITLE</th>\n    <th style="width: 15%; text-align: right;">PAGE NO.</th>\n  </tr>',
    '<tr><th class="col-num">CHAPTER NO.</th><th class="col-title">TITLE</th><th class="col-page">PAGE NO.</th></tr>'
)
html = html.replace(
    '<tr>\n    <th style="width: 15%; text-align: left;">TABLE NO.</th>\n    <th style="width: 70%; text-align: left;">TABLE NAME</th>\n    <th style="width: 15%; text-align: right;">PAGE NO.</th>\n  </tr>',
    '<tr><th class="col-num">TABLE NO.</th><th class="col-title">TABLE NAME</th><th class="col-page">PAGE NO.</th></tr>'
)
html = html.replace(
    '<tr>\n    <th style="width: 15%; text-align: left;">FIGURE NO.</th>\n    <th style="width: 70%; text-align: left;">FIGURE NAME</th>\n    <th style="width: 15%; text-align: right;">PAGE NO.</th>\n  </tr>',
    '<tr><th class="col-num">FIGURE NO.</th><th class="col-title">FIGURE NAME</th><th class="col-page">PAGE NO.</th></tr>'
)

# Format rows
html = re.sub(
    r'<tr>\s*<td>(.*?)</td>\s*<td>(.*?)</td>\s*<td[^>]*>(.*?)</td>\s*</tr>',
    format_toc_row,
    html
)

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(html)
print("Updated HTML with perfect TOC column styling and removed @bottom-center CSS!")

# 4. Compile PDF via Edge
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

if not os.path.exists(TEMP_PDF_PATH):
    print("Error: temp PDF not generated!")
    exit(1)

# 5. Stamp Page Numbers (Exact text body center: X = 306.6 pt, Y = 36.0 pt)
print("Stamping official academic page numbers at exact text body center...")
reader = PdfReader(TEMP_PDF_PATH)
writer = PdfWriter()
roman_nums = ["ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"]

# Left margin is 1.25 in (90 pt), right margin is 1.0 in (72 pt)
# A4 width is 595.27 pt.
# Text body spans from x = 90.0 to x = 523.27 pt.
# Center of text body = (90.0 + 523.27) / 2 = 306.635 pt.
TEXT_BODY_CENTER_X = 306.635
BOTTOM_Y = 36.0 # 0.5 in from bottom edge

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
    can.drawCentredString(TEXT_BODY_CENTER_X, BOTTOM_Y, num_str)
    can.save()
    packet.seek(0)

    overlay = PdfReader(packet)
    page.merge_page(overlay.pages[0])
    writer.add_page(page)

# Save to UPDATED_PDF_PATH
with open(UPDATED_PDF_PATH, "wb") as f:
    writer.write(f)
print(f"Successfully saved to: {UPDATED_PDF_PATH}")

# Overwrite TARGET_PDF_PATH if possible
try:
    with open(TARGET_PDF_PATH, "wb") as f:
        writer.write(f)
    print(f"Successfully updated primary PDF: {TARGET_PDF_PATH}")
except PermissionError:
    print(f"Primary PDF is locked; changes saved to: {UPDATED_PDF_PATH}")

if os.path.exists(TEMP_PDF_PATH):
    os.remove(TEMP_PDF_PATH)

final_reader = PdfReader(UPDATED_PDF_PATH)
print(f"Total Pages: {len(final_reader.pages)}")
print(f"File Size: {os.path.getsize(UPDATED_PDF_PATH) / 1024.0:.2f} KB")
