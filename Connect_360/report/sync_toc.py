import os
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

with open(HTML_PATH, "r", encoding="utf-8") as f:
    html = f.read()

# Synchronize HTML TOC, Tables, and Figures
html_toc_updates = [
    # TOC
    ("<tr><td></td><td>1.4 PROPOSED SYSTEM</td><td style=\"text-align: right;\">3</td></tr>", "<tr><td></td><td>1.4 PROPOSED SYSTEM</td><td style=\"text-align: right;\">2</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;3.2.3 DATABASE / DATA REQUIREMENTS</td><td style=\"text-align: right;\">8</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;3.2.3 DATABASE / DATA REQUIREMENTS</td><td style=\"text-align: right;\">7</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;3.3.3 DATA FLOW DIAGRAM (LEVEL 0 &amp; LEVEL 1)</td><td style=\"text-align: right;\">9</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;3.3.3 DATA FLOW DIAGRAM (LEVEL 0 &amp; LEVEL 1)</td><td style=\"text-align: right;\">10</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;3.3.4 SEQUENCE DIAGRAM</td><td style=\"text-align: right;\">10</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;3.3.4 SEQUENCE DIAGRAM</td><td style=\"text-align: right;\">11</td></tr>"),
    ("<tr><td><strong>4</strong></td><td><strong>PROJECT DESCRIPTION</strong></td><td style=\"text-align: right;\"><strong>12</strong></td></tr>", "<tr><td><strong>4</strong></td><td><strong>PROJECT DESCRIPTION</strong></td><td style=\"text-align: right;\"><strong>13</strong></td></tr>"),
    ("<tr><td></td><td>4.1 METHODOLOGIES</td><td style=\"text-align: right;\">12</td></tr>", "<tr><td></td><td>4.1 METHODOLOGIES</td><td style=\"text-align: right;\">13</td></tr>"),
    ("<tr><td></td><td>4.2 MODULES</td><td style=\"text-align: right;\">12</td></tr>", "<tr><td></td><td>4.2 MODULES</td><td style=\"text-align: right;\">13</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.1 MODULE 1: AUTHENTICATION AND RBAC CONTROL</td><td style=\"text-align: right;\">12</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.1 MODULE 1: AUTHENTICATION AND RBAC CONTROL</td><td style=\"text-align: right;\">13</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.2 MODULE 2: WORKER PROFILE &amp; GEOSPATIAL REGISTRATION</td><td style=\"text-align: right;\">12</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.2 MODULE 2: WORKER PROFILE &amp; GEOSPATIAL REGISTRATION</td><td style=\"text-align: right;\">13</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.3 MODULE 3: INTELLIGENT MATCHING ENGINE</td><td style=\"text-align: right;\">12</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.3 MODULE 3: INTELLIGENT MATCHING ENGINE</td><td style=\"text-align: right;\">13</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.4 MODULE 4: TRANSACTIONAL PRIORITY DISPATCH</td><td style=\"text-align: right;\">13</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.4 MODULE 4: TRANSACTIONAL PRIORITY DISPATCH</td><td style=\"text-align: right;\">14</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.5 MODULE 5: HYBRID SPATIAL ROUTING &amp; LIVE TRACKING</td><td style=\"text-align: right;\">13</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.5 MODULE 5: HYBRID SPATIAL ROUTING &amp; LIVE TRACKING</td><td style=\"text-align: right;\">14</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.6 MODULE 6: CONVERSATIONAL AI ASSISTANT &amp; PII DEFENSE</td><td style=\"text-align: right;\">13</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.6 MODULE 6: CONVERSATIONAL AI ASSISTANT &amp; PII DEFENSE</td><td style=\"text-align: right;\">14</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.7 MODULE 7: PRIVACY-PRESERVING VIRTUAL TELEPHONY</td><td style=\"text-align: right;\">14</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.7 MODULE 7: PRIVACY-PRESERVING VIRTUAL TELEPHONY</td><td style=\"text-align: right;\">15</td></tr>"),
    ("<tr><td><strong>5</strong></td><td><strong>IMPLEMENTATION AND RESULT DISCUSSION</strong></td><td style=\"text-align: right;\"><strong>15</strong></td></tr>", "<tr><td><strong>5</strong></td><td><strong>IMPLEMENTATION AND RESULT DISCUSSION</strong></td><td style=\"text-align: right;\"><strong>16</strong></td></tr>"),
    ("<tr><td></td><td>5.1 IMPLEMENTATION RESULTS</td><td style=\"text-align: right;\">15</td></tr>", "<tr><td></td><td>5.1 IMPLEMENTATION RESULTS</td><td style=\"text-align: right;\">16</td></tr>"),
    ("<tr><td></td><td>5.2 EVALUATION AND PERFORMANCE ANALYSIS</td><td style=\"text-align: right;\">15</td></tr>", "<tr><td></td><td>5.2 EVALUATION AND PERFORMANCE ANALYSIS</td><td style=\"text-align: right;\">16</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;5.2.1 METRIC 1: MATCHING ALGORITHM EXECUTION LATENCY</td><td style=\"text-align: right;\">15</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;5.2.1 METRIC 1: MATCHING ALGORITHM EXECUTION LATENCY</td><td style=\"text-align: right;\">16</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;5.2.2 METRIC 2: MATCHING ENGINE RANK SENSITIVITY &amp; INVERSION</td><td style=\"text-align: right;\">16</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;5.2.2 METRIC 2: MATCHING ENGINE RANK SENSITIVITY &amp; INVERSION</td><td style=\"text-align: right;\">17</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;5.2.3 METRIC 3: TRANSACTIONAL CONCURRENCY &amp; RACE PREVENTION</td><td style=\"text-align: right;\">17</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;5.2.3 METRIC 3: TRANSACTIONAL CONCURRENCY &amp; RACE PREVENTION</td><td style=\"text-align: right;\">18</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;5.2.4 METRIC 4: ROAD DISTANCE VS. HAVERSINE DISPARITY</td><td style=\"text-align: right;\">18</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;5.2.4 METRIC 4: ROAD DISTANCE VS. HAVERSINE DISPARITY</td><td style=\"text-align: right;\">19</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;5.2.5 METRIC 5: AI ASSISTANT SAFETY &amp; PII REDACTION EFFICACY</td><td style=\"text-align: right;\">19</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;5.2.5 METRIC 5: AI ASSISTANT SAFETY &amp; PII REDACTION EFFICACY</td><td style=\"text-align: right;\">20</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;5.2.6 METRIC 6: STRUCTURED OUTPUT JSON SCHEMA CONFORMITY</td><td style=\"text-align: right;\">21</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;5.2.6 METRIC 6: STRUCTURED OUTPUT JSON SCHEMA CONFORMITY</td><td style=\"text-align: right;\">22</td></tr>"),
    ("<tr><td><strong>6</strong></td><td><strong>CONCLUSION AND FUTURE WORK</strong></td><td style=\"text-align: right;\"><strong>23</strong></td></tr>", "<tr><td><strong>6</strong></td><td><strong>CONCLUSION AND FUTURE WORK</strong></td><td style=\"text-align: right;\"><strong>24</strong></td></tr>"),
    ("<tr><td></td><td>6.1 CONCLUSION</td><td style=\"text-align: right;\">23</td></tr>", "<tr><td></td><td>6.1 CONCLUSION</td><td style=\"text-align: right;\">24</td></tr>"),
    ("<tr><td></td><td>6.2 FUTURE WORK</td><td style=\"text-align: right;\">23</td></tr>", "<tr><td></td><td>6.2 FUTURE WORK</td><td style=\"text-align: right;\">24</td></tr>"),
    ("<tr><td></td><td><strong>REFERENCES</strong></td><td style=\"text-align: right;\"><strong>25</strong></td></tr>", "<tr><td></td><td><strong>REFERENCES</strong></td><td style=\"text-align: right;\"><strong>26</strong></td></tr>"),

    # Tables
    ("<tr><td>Table 4.1</td><td>Multi-Criteria Weighting Configurations for Normal vs. Priority Booking</td><td style=\"text-align: right;\">13</td></tr>", "<tr><td>Table 4.1</td><td>Multi-Criteria Weighting Configurations for Normal vs. Priority Booking</td><td style=\"text-align: right;\">14</td></tr>"),
    ("<tr><td>Table 5.1</td><td>Matching Algorithm Execution Latency Across Candidate Pool Sizes</td><td style=\"text-align: right;\">15</td></tr>", "<tr><td>Table 5.1</td><td>Matching Algorithm Execution Latency Across Candidate Pool Sizes</td><td style=\"text-align: right;\">16</td></tr>"),
    ("<tr><td>Table 5.2</td><td>Rank Inversion &amp; Sensitivity Analysis Under Weight Reallocation</td><td style=\"text-align: right;\">16</td></tr>", "<tr><td>Table 5.2</td><td>Rank Inversion &amp; Sensitivity Analysis Under Weight Reallocation</td><td style=\"text-align: right;\">17</td></tr>"),
    ("<tr><td>Table 5.3</td><td>Transactional Concurrency &amp; Conflict Abort Latency Across Thread Loads</td><td style=\"text-align: right;\">18</td></tr>", "<tr><td>Table 5.3</td><td>Transactional Concurrency &amp; Conflict Abort Latency Across Thread Loads</td><td style=\"text-align: right;\">19</td></tr>"),
    ("<tr><td>Table 5.6</td><td>Structured Output Schema Conformity &amp; Urgency Classification Across Dimensions</td><td style=\"text-align: right;\">21</td></tr>", "<tr><td>Table 5.6</td><td>Structured Output Schema Conformity &amp; Urgency Classification Across Dimensions</td><td style=\"text-align: right;\">22</td></tr>"),

    # Figures
    ("<tr><td>Figure 3.4</td><td>Connect360 Data Flow Diagram (DFD Level 0 - Context Diagram)</td><td style=\"text-align: right;\">9</td></tr>", "<tr><td>Figure 3.4</td><td>Connect360 Data Flow Diagram (DFD Level 0 - Context Diagram)</td><td style=\"text-align: right;\">10</td></tr>"),
    ("<tr><td>Figure 3.5</td><td>Connect360 Data Flow Diagram (DFD Level 1 - Modular Decomposition)</td><td style=\"text-align: right;\">9</td></tr>", "<tr><td>Figure 3.5</td><td>Connect360 Data Flow Diagram (DFD Level 1 - Modular Decomposition)</td><td style=\"text-align: right;\">10</td></tr>"),
    ("<tr><td>Figure 3.6</td><td>Sequence Diagram: Priority Booking Atomic Acceptance &amp; Commit</td><td style=\"text-align: right;\">10</td></tr>", "<tr><td>Figure 3.6</td><td>Sequence Diagram: Priority Booking Atomic Acceptance &amp; Commit</td><td style=\"text-align: right;\">11</td></tr>"),
    ("<tr><td>Figure 5.1</td><td>Matching Algorithm Execution Latency vs. Candidate Pool Size</td><td style=\"text-align: right;\">16</td></tr>", "<tr><td>Figure 5.1</td><td>Matching Algorithm Execution Latency vs. Candidate Pool Size</td><td style=\"text-align: right;\">17</td></tr>"),
    ("<tr><td>Figure 5.2</td><td>Matching Engine Rank Sensitivity &amp; Inversion Analysis</td><td style=\"text-align: right;\">17</td></tr>", "<tr><td>Figure 5.2</td><td>Matching Engine Rank Sensitivity &amp; Inversion Analysis</td><td style=\"text-align: right;\">18</td></tr>"),
    ("<tr><td>Figure 5.3</td><td>Transactional Concurrency &amp; Race Condition Prevention</td><td style=\"text-align: right;\">18</td></tr>", "<tr><td>Figure 5.3</td><td>Transactional Concurrency &amp; Race Condition Prevention</td><td style=\"text-align: right;\">19</td></tr>"),
    ("<tr><td>Figure 5.4</td><td>Road Distance vs. Haversine Disparity &amp; Tortuosity Factor Distribution</td><td style=\"text-align: right;\">19</td></tr>", "<tr><td>Figure 5.4</td><td>Road Distance vs. Haversine Disparity &amp; Tortuosity Factor Distribution</td><td style=\"text-align: right;\">20</td></tr>"),
    ("<tr><td>Figure 5.6</td><td>Structured Output JSON Schema Conformity &amp; Urgency Classification</td><td style=\"text-align: right;\">22</td></tr>", "<tr><td>Figure 5.6</td><td>Structured Output JSON Schema Conformity &amp; Urgency Classification</td><td style=\"text-align: right;\">23</td></tr>")
]

for old, new in html_toc_updates:
    html = html.replace(old, new)

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(html)

# Synchronize Markdown TOC, Tables, and Figures
with open(MD_PATH, "r", encoding="utf-8") as f:
    md = f.read()

md_toc_updates = [
    ("| | 1.4 PROPOSED SYSTEM | 3 |", "| | 1.4 PROPOSED SYSTEM | 2 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;3.2.3 DATABASE / DATA REQUIREMENTS | 8 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;3.2.3 DATABASE / DATA REQUIREMENTS | 7 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;3.3.3 DATA FLOW DIAGRAM (LEVEL 0 &amp; LEVEL 1) | 9 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;3.3.3 DATA FLOW DIAGRAM (LEVEL 0 &amp; LEVEL 1) | 10 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;3.3.4 SEQUENCE DIAGRAM | 10 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;3.3.4 SEQUENCE DIAGRAM | 11 |"),
    ("| **4** | **PROJECT DESCRIPTION** | **12** |", "| **4** | **PROJECT DESCRIPTION** | **13** |"),
    ("| | 4.1 METHODOLOGIES | 12 |", "| | 4.1 METHODOLOGIES | 13 |"),
    ("| | 4.2 MODULES | 12 |", "| | 4.2 MODULES | 13 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.1 MODULE 1: AUTHENTICATION AND RBAC CONTROL | 12 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.1 MODULE 1: AUTHENTICATION AND RBAC CONTROL | 13 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.2 MODULE 2: WORKER PROFILE &amp; GEOSPATIAL REGISTRATION | 12 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.2 MODULE 2: WORKER PROFILE &amp; GEOSPATIAL REGISTRATION | 13 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.3 MODULE 3: INTELLIGENT MATCHING ENGINE | 12 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.3 MODULE 3: INTELLIGENT MATCHING ENGINE | 13 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.4 MODULE 4: TRANSACTIONAL PRIORITY DISPATCH | 13 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.4 MODULE 4: TRANSACTIONAL PRIORITY DISPATCH | 14 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.5 MODULE 5: HYBRID SPATIAL ROUTING &amp; LIVE TRACKING | 13 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.5 MODULE 5: HYBRID SPATIAL ROUTING &amp; LIVE TRACKING | 14 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.6 MODULE 6: CONVERSATIONAL AI ASSISTANT &amp; PII DEFENSE | 13 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.6 MODULE 6: CONVERSATIONAL AI ASSISTANT &amp; PII DEFENSE | 14 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.7 MODULE 7: PRIVACY-PRESERVING VIRTUAL TELEPHONY | 14 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.7 MODULE 7: PRIVACY-PRESERVING VIRTUAL TELEPHONY | 15 |"),
    ("| **5** | **IMPLEMENTATION AND RESULT DISCUSSION** | **15** |", "| **5** | **IMPLEMENTATION AND RESULT DISCUSSION** | **16** |"),
    ("| | 5.1 IMPLEMENTATION RESULTS | 15 |", "| | 5.1 IMPLEMENTATION RESULTS | 16 |"),
    ("| | 5.2 EVALUATION AND PERFORMANCE ANALYSIS | 15 |", "| | 5.2 EVALUATION AND PERFORMANCE ANALYSIS | 16 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.1 METRIC 1: MATCHING ALGORITHM EXECUTION LATENCY | 15 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.1 METRIC 1: MATCHING ALGORITHM EXECUTION LATENCY | 16 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.2 METRIC 2: MATCHING ENGINE RANK SENSITIVITY &amp; INVERSION | 16 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.2 METRIC 2: MATCHING ENGINE RANK SENSITIVITY &amp; INVERSION | 17 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.3 METRIC 3: TRANSACTIONAL CONCURRENCY &amp; RACE PREVENTION | 17 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.3 METRIC 3: TRANSACTIONAL CONCURRENCY &amp; RACE PREVENTION | 18 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.4 METRIC 4: ROAD DISTANCE VS. HAVERSINE DISPARITY | 18 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.4 METRIC 4: ROAD DISTANCE VS. HAVERSINE DISPARITY | 19 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.5 METRIC 5: AI ASSISTANT SAFETY &amp; PII REDACTION EFFICACY | 19 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.5 METRIC 5: AI ASSISTANT SAFETY &amp; PII REDACTION EFFICACY | 20 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.6 METRIC 6: STRUCTURED OUTPUT JSON SCHEMA CONFORMITY | 21 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.6 METRIC 6: STRUCTURED OUTPUT JSON SCHEMA CONFORMITY | 22 |"),
    ("| **6** | **CONCLUSION AND FUTURE WORK** | **23** |", "| **6** | **CONCLUSION AND FUTURE WORK** | **24** |"),
    ("| | 6.1 CONCLUSION | 23 |", "| | 6.1 CONCLUSION | 24 |"),
    ("| | 6.2 FUTURE WORK | 23 |", "| | 6.2 FUTURE WORK | 24 |"),
    ("| | **REFERENCES** | **25** |", "| | **REFERENCES** | **26** |"),

    # Tables
    ("| Table 4.1 | Multi-Criteria Weighting Configurations for Normal vs. Priority Booking | 13 |", "| Table 4.1 | Multi-Criteria Weighting Configurations for Normal vs. Priority Booking | 14 |"),
    ("| Table 5.1 | Matching Algorithm Execution Latency Across Candidate Pool Sizes | 15 |", "| Table 5.1 | Matching Algorithm Execution Latency Across Candidate Pool Sizes | 16 |"),
    ("| Table 5.2 | Rank Inversion &amp; Sensitivity Analysis Under Weight Reallocation | 16 |", "| Table 5.2 | Rank Inversion &amp; Sensitivity Analysis Under Weight Reallocation | 17 |"),
    ("| Table 5.3 | Transactional Concurrency &amp; Conflict Abort Latency Across Thread Loads | 18 |", "| Table 5.3 | Transactional Concurrency &amp; Conflict Abort Latency Across Thread Loads | 19 |"),
    ("| Table 5.6 | Structured Output Schema Conformity &amp; Urgency Classification Across Dimensions | 21 |", "| Table 5.6 | Structured Output Schema Conformity &amp; Urgency Classification Across Dimensions | 22 |"),

    # Figures
    ("| Figure 3.4 | Connect360 Data Flow Diagram (DFD Level 0 - Context Diagram) | 9 |", "| Figure 3.4 | Connect360 Data Flow Diagram (DFD Level 0 - Context Diagram) | 10 |"),
    ("| Figure 3.5 | Connect360 Data Flow Diagram (DFD Level 1 - Modular Decomposition) | 9 |", "| Figure 3.5 | Connect360 Data Flow Diagram (DFD Level 1 - Modular Decomposition) | 10 |"),
    ("| Figure 3.6 | Sequence Diagram: Priority Booking Atomic Acceptance &amp; Commit | 10 |", "| Figure 3.6 | Sequence Diagram: Priority Booking Atomic Acceptance &amp; Commit | 11 |"),
    ("| Figure 5.1 | Matching Algorithm Execution Latency vs. Candidate Pool Size | 16 |", "| Figure 5.1 | Matching Algorithm Execution Latency vs. Candidate Pool Size | 17 |"),
    ("| Figure 5.2 | Matching Engine Rank Sensitivity &amp; Inversion Analysis | 17 |", "| Figure 5.2 | Matching Engine Rank Sensitivity &amp; Inversion Analysis | 18 |"),
    ("| Figure 5.3 | Transactional Concurrency &amp; Race Condition Prevention | 18 |", "| Figure 5.3 | Transactional Concurrency &amp; Race Condition Prevention | 19 |"),
    ("| Figure 5.4 | Road Distance vs. Haversine Disparity &amp; Tortuosity Factor Distribution | 19 |", "| Figure 5.4 | Road Distance vs. Haversine Disparity &amp; Tortuosity Factor Distribution | 20 |"),
    ("| Figure 5.6 | Structured Output JSON Schema Conformity &amp; Urgency Classification | 22 |", "| Figure 5.6 | Structured Output JSON Schema Conformity &amp; Urgency Classification | 23 |")
]

for old, new in md_toc_updates:
    md = md.replace(old, new)

with open(MD_PATH, "w", encoding="utf-8") as f:
    f.write(md)

print("Synchronized TOC in HTML and Markdown!")

# Compile and stamp PDF
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

    overlay_reader = PdfReader(packet)
    page.merge_page(overlay_reader.pages[0])
    writer.add_page(page)

with open(FINAL_PDF_PATH, "wb") as f:
    writer.write(f)

if os.path.exists(TEMP_PDF_PATH):
    os.remove(TEMP_PDF_PATH)

final_reader = PdfReader(FINAL_PDF_PATH)
file_size_kb = os.path.getsize(FINAL_PDF_PATH) / 1024.0
print(f"Final Synchronized Academic PDF: {FINAL_PDF_PATH}")
print(f"Total Pages: {len(final_reader.pages)}")
print(f"File Size: {file_size_kb:.2f} KB")
