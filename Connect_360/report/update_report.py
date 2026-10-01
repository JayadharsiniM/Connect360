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
# 1. ENHANCED SVG VECTOR DIAGRAMS
# =============================================================================

# Enhanced Figure 3.2: Use Case Diagram
svg_usecase_enhanced = """
<svg width="740" height="560" viewBox="0 0 740 560" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:'Times New Roman', serif; margin:auto; display:block;">
  <rect x="5" y="5" width="730" height="550" fill="#fcfcfd" stroke="#333333" stroke-width="1.5" rx="6"/>
  <text x="370" y="26" font-size="13.5" font-weight="bold" text-anchor="middle" fill="#111111">Figure 3.2: Connect360 Detailed System Use Case Diagram</text>

  <!-- System Boundary -->
  <rect x="155" y="42" width="430" height="500" fill="#ffffff" stroke="#2b4c7e" stroke-width="1.3" stroke-dasharray="5,4" rx="5"/>
  <text x="370" y="60" font-size="11" font-weight="bold" text-anchor="middle" fill="#2b4c7e">Connect360 Platform Boundary</text>

  <!-- ACTOR 1: Customer (Left) -->
  <g transform="translate(65, 140)">
    <circle cx="0" cy="0" r="14" fill="#e8eef5" stroke="#2b4c7e" stroke-width="1.4"/>
    <line x1="0" y1="14" x2="0" y2="45" stroke="#2b4c7e" stroke-width="1.4"/>
    <line x1="-18" y1="26" x2="18" y2="26" stroke="#2b4c7e" stroke-width="1.4"/>
    <line x1="0" y1="45" x2="-14" y2="78" stroke="#2b4c7e" stroke-width="1.4"/>
    <line x1="0" y1="45" x2="14" y2="78" stroke="#2b4c7e" stroke-width="1.4"/>
    <text x="0" y="96" font-size="11" font-weight="bold" text-anchor="middle" fill="#2b4c7e">Customer</text>
    <text x="0" y="109" font-size="9" text-anchor="middle" fill="#555">(Mobile/Web User)</text>
  </g>

  <!-- ACTOR 2: Skilled Worker / Service Partner (Right) -->
  <g transform="translate(665, 140)">
    <circle cx="0" cy="0" r="14" fill="#fdf4e8" stroke="#b25e00" stroke-width="1.4"/>
    <line x1="0" y1="14" x2="0" y2="45" stroke="#b25e00" stroke-width="1.4"/>
    <line x1="-18" y1="26" x2="18" y2="26" stroke="#b25e00" stroke-width="1.4"/>
    <line x1="0" y1="45" x2="-14" y2="78" stroke="#b25e00" stroke-width="1.4"/>
    <line x1="0" y1="45" x2="14" y2="78" stroke="#b25e00" stroke-width="1.4"/>
    <text x="0" y="96" font-size="11" font-weight="bold" text-anchor="middle" fill="#b25e00">Skilled Worker</text>
    <text x="0" y="109" font-size="9" text-anchor="middle" fill="#555">(Service Partner)</text>
  </g>

  <!-- ACTOR 3: Administrator (Bottom Left) -->
  <g transform="translate(65, 410)">
    <circle cx="0" cy="0" r="13" fill="#f4eef7" stroke="#6b2c8a" stroke-width="1.4"/>
    <line x1="0" y1="13" x2="0" y2="40" stroke="#6b2c8a" stroke-width="1.4"/>
    <line x1="-16" y1="24" x2="16" y2="24" stroke="#6b2c8a" stroke-width="1.4"/>
    <line x1="0" y1="40" x2="-12" y2="70" stroke="#6b2c8a" stroke-width="1.4"/>
    <line x1="0" y1="40" x2="12" y2="70" stroke="#6b2c8a" stroke-width="1.4"/>
    <text x="0" y="86" font-size="10.5" font-weight="bold" text-anchor="middle" fill="#6b2c8a">Platform Admin</text>
  </g>

  <!-- USE CASES -->
  <!-- UC1: Register & Authenticate -->
  <g transform="translate(250, 85)">
    <ellipse cx="0" cy="0" rx="75" ry="16" fill="#f0f4f8" stroke="#2b4c7e" stroke-width="1.2"/>
    <text x="0" y="4" font-size="9.5" text-anchor="middle">Register &amp; Authenticate</text>
  </g>

  <!-- UC2: Manage Profile & Skills -->
  <g transform="translate(480, 85)">
    <ellipse cx="0" cy="0" rx="80" ry="16" fill="#fdf8f0" stroke="#b25e00" stroke-width="1.2"/>
    <text x="0" y="4" font-size="9.5" text-anchor="middle">Manage Profile &amp; Skills</text>
  </g>

  <!-- UC3: Consult AI Assistant for Triage -->
  <g transform="translate(260, 135)">
    <ellipse cx="0" cy="0" rx="85" ry="16" fill="#f0f4f8" stroke="#2b4c7e" stroke-width="1.2"/>
    <text x="0" y="4" font-size="9.5" text-anchor="middle">Consult AI Assistant (Triage)</text>
  </g>

  <!-- UC4: Filter Off-Platform PII -->
  <g transform="translate(480, 135)">
    <ellipse cx="0" cy="0" rx="80" ry="16" fill="#f2f8f2" stroke="#2e6930" stroke-width="1.2"/>
    <text x="0" y="4" font-size="9.5" text-anchor="middle">Deterministic PII Defense</text>
  </g>

  <!-- UC5: Browse & Search Workers -->
  <g transform="translate(260, 185)">
    <ellipse cx="0" cy="0" rx="85" ry="16" fill="#f0f4f8" stroke="#2b4c7e" stroke-width="1.2"/>
    <text x="0" y="4" font-size="9.5" text-anchor="middle">Browse &amp; Search Workers</text>
  </g>

  <!-- UC6: Multi-Criteria Candidate Ranking -->
  <g transform="translate(480, 185)">
    <ellipse cx="0" cy="0" rx="82" ry="16" fill="#fdf8f0" stroke="#b25e00" stroke-width="1.2"/>
    <text x="0" y="4" font-size="9.5" text-anchor="middle">Score &amp; Rank Candidates</text>
  </g>

  <!-- UC7: Request Priority Booking -->
  <g transform="translate(260, 240)">
    <ellipse cx="0" cy="0" rx="85" ry="17" fill="#fff5f5" stroke="#c53030" stroke-width="1.3"/>
    <text x="0" y="4" font-size="9.5" font-weight="bold" fill="#c53030" text-anchor="middle">Request Priority Booking</text>
  </g>

  <!-- UC8: Atomic Accept Priority Job -->
  <g transform="translate(480, 240)">
    <ellipse cx="0" cy="0" rx="85" ry="17" fill="#fff5f5" stroke="#c53030" stroke-width="1.3"/>
    <text x="0" y="4" font-size="9.5" font-weight="bold" fill="#c53030" text-anchor="middle">Atomic Accept Priority Job</text>
  </g>

  <!-- UC9: Track Live Route & ETA -->
  <g transform="translate(260, 295)">
    <ellipse cx="0" cy="0" rx="85" ry="16" fill="#f0f4f8" stroke="#2b4c7e" stroke-width="1.2"/>
    <text x="0" y="4" font-size="9.5" text-anchor="middle">Track Live Route &amp; ETA</text>
  </g>

  <!-- UC10: Masked Virtual Telephony -->
  <g transform="translate(480, 295)">
    <ellipse cx="0" cy="0" rx="80" ry="16" fill="#fdf8f0" stroke="#b25e00" stroke-width="1.2"/>
    <text x="0" y="4" font-size="9.5" text-anchor="middle">Virtual Masked Phone Call</text>
  </g>

  <!-- UC11: Complete Job & Verify OTP -->
  <g transform="translate(370, 355)">
    <ellipse cx="0" cy="0" rx="85" ry="16" fill="#fdf8f0" stroke="#b25e00" stroke-width="1.2"/>
    <text x="0" y="4" font-size="9.5" text-anchor="middle">Complete Job &amp; Verify OTP</text>
  </g>

  <!-- UC12: Submit Rating & Review -->
  <g transform="translate(260, 410)">
    <ellipse cx="0" cy="0" rx="80" ry="16" fill="#f0f4f8" stroke="#2b4c7e" stroke-width="1.2"/>
    <text x="0" y="4" font-size="9.5" text-anchor="middle">Submit Review &amp; Rating</text>
  </g>

  <!-- UC13: Verify Worker KYC & Skills -->
  <g transform="translate(480, 430)">
    <ellipse cx="0" cy="0" rx="80" ry="16" fill="#f4eef7" stroke="#6b2c8a" stroke-width="1.2"/>
    <text x="0" y="4" font-size="9.5" text-anchor="middle">Verify Worker KYC &amp; Skills</text>
  </g>

  <!-- UC14: Audit System & Disputes -->
  <g transform="translate(370, 490)">
    <ellipse cx="0" cy="0" rx="85" ry="16" fill="#f4eef7" stroke="#6b2c8a" stroke-width="1.2"/>
    <text x="0" y="4" font-size="9.5" text-anchor="middle">Audit Logs &amp; Dispute Triage</text>
  </g>

  <!-- LINES: Customer Associations -->
  <line x1="85" y1="165" x2="175" y2="85" stroke="#2b4c7e" stroke-width="1.1"/>
  <line x1="85" y1="170" x2="175" y2="135" stroke="#2b4c7e" stroke-width="1.1"/>
  <line x1="85" y1="175" x2="175" y2="185" stroke="#2b4c7e" stroke-width="1.1"/>
  <line x1="85" y1="180" x2="175" y2="240" stroke="#c53030" stroke-width="1.3"/>
  <line x1="85" y1="185" x2="175" y2="295" stroke="#2b4c7e" stroke-width="1.1"/>
  <line x1="85" y1="190" x2="400" y2="295" stroke="#2b4c7e" stroke-width="1.1"/>
  <line x1="85" y1="195" x2="285" y2="355" stroke="#2b4c7e" stroke-width="1.1"/>
  <line x1="85" y1="200" x2="180" y2="410" stroke="#2b4c7e" stroke-width="1.1"/>

  <!-- LINES: Worker Associations -->
  <line x1="645" y1="165" x2="325" y2="85" stroke="#b25e00" stroke-width="1.1"/>
  <line x1="645" y1="170" x2="560" y2="85" stroke="#b25e00" stroke-width="1.1"/>
  <line x1="645" y1="180" x2="565" y2="240" stroke="#c53030" stroke-width="1.3"/>
  <line x1="645" y1="185" x2="345" y2="295" stroke="#b25e00" stroke-width="1.1"/>
  <line x1="645" y1="190" x2="560" y2="295" stroke="#b25e00" stroke-width="1.1"/>
  <line x1="645" y1="195" x2="455" y2="355" stroke="#b25e00" stroke-width="1.1"/>

  <!-- LINES: Admin Associations -->
  <line x1="85" y1="440" x2="400" y2="430" stroke="#6b2c8a" stroke-width="1.1"/>
  <line x1="85" y1="450" x2="285" y2="490" stroke="#6b2c8a" stroke-width="1.1"/>

  <!-- <<include>> / <<extend>> relationships -->
  <!-- UC3 -> UC4 <<include>> -->
  <line x1="345" y1="135" x2="400" y2="135" stroke="#2e6930" stroke-width="1.1" stroke-dasharray="3,3"/>
  <text x="372" y="130" font-size="7.5" fill="#2e6930" font-weight="bold" text-anchor="middle">&lt;&lt;include&gt;&gt;</text>

  <!-- UC5 -> UC6 <<include>> -->
  <line x1="345" y1="185" x2="398" y2="185" stroke="#b25e00" stroke-width="1.1" stroke-dasharray="3,3"/>
  <text x="372" y="180" font-size="7.5" fill="#b25e00" font-weight="bold" text-anchor="middle">&lt;&lt;include&gt;&gt;</text>

  <!-- UC7 -> UC8 <<extend>> -->
  <line x1="345" y1="240" x2="395" y2="240" stroke="#c53030" stroke-width="1.2" stroke-dasharray="3,3"/>
  <text x="370" y="235" font-size="7.5" fill="#c53030" font-weight="bold" text-anchor="middle">&lt;&lt;extend&gt;&gt;</text>
</svg>
"""

# Enhanced Figure 3.3: Priority Booking Activity Diagram
svg_activity_enhanced = """
<svg width="740" height="600" viewBox="0 0 740 600" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:'Times New Roman', serif; margin:auto; display:block;">
  <rect x="5" y="5" width="730" height="590" fill="#fcfcfd" stroke="#333333" stroke-width="1.5" rx="6"/>
  <text x="370" y="26" font-size="13.5" font-weight="bold" text-anchor="middle" fill="#111111">Figure 3.3: Connect360 Priority Booking Detailed Activity Diagram (Swimlanes)</text>

  <!-- Swimlane 1: Customer -->
  <rect x="15" y="42" width="165" height="545" fill="#f7fafd" stroke="#2b4c7e" stroke-width="1.2"/>
  <text x="97" y="59" font-size="11" font-weight="bold" text-anchor="middle" fill="#2b4c7e">CUSTOMER</text>

  <!-- Swimlane 2: Dispatch Service -->
  <rect x="180" y="42" width="200" height="545" fill="#fffdf9" stroke="#b25e00" stroke-width="1.2"/>
  <text x="280" y="59" font-size="11" font-weight="bold" text-anchor="middle" fill="#b25e00">DISPATCH SERVICE</text>

  <!-- Swimlane 3: Amazon DynamoDB -->
  <rect x="380" y="42" width="180" height="545" fill="#f6faf6" stroke="#2e6930" stroke-width="1.2"/>
  <text x="470" y="59" font-size="11" font-weight="bold" text-anchor="middle" fill="#2e6930">AMAZON DYNAMODB</text>

  <!-- Swimlane 4: Candidate Workers -->
  <rect x="560" y="42" width="165" height="545" fill="#fffcf7" stroke="#8a4b08" stroke-width="1.2"/>
  <text x="642" y="59" font-size="11" font-weight="bold" text-anchor="middle" fill="#8a4b08">WORKERS POOL</text>

  <!-- Flow Elements -->
  <!-- 1. Start Node in Customer -->
  <circle cx="97" cy="85" r="11" fill="#2b4c7e"/>
  <line x1="97" y1="96" x2="97" y2="120" stroke="#333" stroke-width="1.2"/>

  <!-- Action: Customer selects priority service -->
  <rect x="25" y="120" width="145" height="42" fill="#ffffff" stroke="#2b4c7e" rx="4"/>
  <text x="97" y="137" font-size="9.5" font-weight="bold" text-anchor="middle">Select Emergency Service</text>
  <text x="97" y="151" font-size="8.5" text-anchor="middle" fill="#555">Capture GPS (Lat/Lon)</text>

  <line x1="170" y1="141" x2="200" y2="141" stroke="#333" stroke-width="1.2"/>

  <!-- Action: Dispatch Service scores candidates -->
  <rect x="200" y="120" width="160" height="42" fill="#ffffff" stroke="#b25e00" rx="4"/>
  <text x="280" y="137" font-size="9.5" font-weight="bold" text-anchor="middle">Execute Candidate Ranking</text>
  <text x="280" y="151" font-size="8.5" text-anchor="middle" fill="#555">Priority Weights (w_dist=0.55)</text>

  <line x1="360" y1="141" x2="400" y2="141" stroke="#333" stroke-width="1.2"/>

  <!-- Action: DynamoDB write pending booking -->
  <rect x="400" y="120" width="140" height="42" fill="#ffffff" stroke="#2e6930" rx="4"/>
  <text x="470" y="137" font-size="9.5" font-weight="bold" text-anchor="middle">PutItem: Pending State</text>
  <text x="470" y="151" font-size="8.5" text-anchor="middle" fill="#555">status = 'worker_pending'</text>

  <line x1="470" y1="162" x2="470" y2="185" stroke="#333" stroke-width="1.2"/>
  <line x1="470" y1="185" x2="280" y2="185" stroke="#333" stroke-width="1.2"/>
  <line x1="280" y1="185" x2="280" y2="205" stroke="#333" stroke-width="1.2"/>

  <!-- Action: Dispatch broadcasts alerts -->
  <rect x="200" y="205" width="160" height="38" fill="#ffffff" stroke="#b25e00" rx="4"/>
  <text x="280" y="221" font-size="9.5" font-weight="bold" text-anchor="middle">Broadcast Job Alert</text>
  <text x="280" y="234" font-size="8.5" text-anchor="middle" fill="#555">Push / WebSocket to Top N</text>

  <line x1="360" y1="224" x2="580" y2="224" stroke="#333" stroke-width="1.2"/>

  <!-- Action: Workers receive notification -->
  <rect x="580" y="205" width="130" height="38" fill="#ffffff" stroke="#8a4b08" rx="4"/>
  <text x="645" y="221" font-size="9.5" font-weight="bold" text-anchor="middle">Candidates Alerted</text>
  <text x="645" y="234" font-size="8.5" text-anchor="middle" fill="#555">Inspect Job &amp; Location</text>

  <!-- Concurrent Acceptance Fork -->
  <line x1="645" y1="243" x2="645" y2="270" stroke="#333" stroke-width="1.2"/>

  <rect x="580" y="270" width="130" height="48" fill="#fff5f5" stroke="#c53030" rx="4"/>
  <text x="645" y="286" font-size="9" font-weight="bold" fill="#c53030" text-anchor="middle">Concurrent Acceptance</text>
  <text x="645" y="299" font-size="8" text-anchor="middle" fill="#555">Worker 1 (t=0 ms)</text>
  <text x="645" y="311" font-size="8" text-anchor="middle" fill="#555">Worker 2 (t=+8 ms)</text>

  <line x1="580" y1="294" x2="520" y2="294" stroke="#333" stroke-width="1.2"/>

  <!-- Action: DynamoDB conditional update -->
  <rect x="395" y="275" width="150" height="42" fill="#ffffff" stroke="#2e6930" rx="4"/>
  <text x="470" y="291" font-size="9" font-weight="bold" text-anchor="middle">Execute Conditional Write</text>
  <text x="470" y="305" font-size="8" text-anchor="middle" fill="#555">attribute_not_exists(worker)</text>

  <line x1="470" y1="317" x2="470" y2="345" stroke="#333" stroke-width="1.2"/>

  <!-- Decision Diamond -->
  <polygon points="470,345 520,380 470,415 420,380" fill="#fff9f0" stroke="#b25e00" stroke-width="1.3"/>
  <text x="470" y="377" font-size="9" font-weight="bold" text-anchor="middle">Atomic Lock</text>
  <text x="470" y="389" font-size="8.5" text-anchor="middle">Granted?</text>

  <!-- Branch YES: Worker 1 wins -->
  <line x1="420" y1="380" x2="350" y2="380" stroke="#2e6930" stroke-width="1.3"/>
  <text x="385" y="373" font-size="8.5" font-weight="bold" fill="#2e6930">YES (W1)</text>

  <rect x="200" y="360" width="150" height="42" fill="#f2f8f2" stroke="#2e6930" rx="4"/>
  <text x="275" y="376" font-size="9.5" font-weight="bold" fill="#2e6930" text-anchor="middle">Status -> 'accepted' (W1)</text>
  <text x="275" y="390" font-size="8" text-anchor="middle" fill="#555">Resolve OSRM Road Polyline</text>

  <!-- Branch NO: Worker 2 loses -->
  <line x1="520" y1="380" x2="600" y2="380" stroke="#c53030" stroke-width="1.3"/>
  <text x="560" y="373" font-size="8.5" font-weight="bold" fill="#c53030">NO (W2)</text>

  <rect x="580" y="360" width="130" height="42" fill="#fde8e8" stroke="#c53030" rx="4"/>
  <text x="645" y="376" font-size="9" font-weight="bold" fill="#c53030" text-anchor="middle">HTTP 409 Conflict</text>
  <text x="645" y="390" font-size="8" text-anchor="middle" fill="#c53030">Job Taken -> Available</text>

  <line x1="645" y1="402" x2="645" y2="440" stroke="#c53030" stroke-width="1.2"/>
  <circle cx="645" cy="452" r="10" fill="#ffffff" stroke="#c53030" stroke-width="1.3"/>
  <circle cx="645" cy="452" r="6" fill="#c53030"/>
  <text x="645" y="474" font-size="8.5" text-anchor="middle" fill="#c53030">W2 Aborted</text>

  <!-- W1 flow continues to Customer & Dispatched -->
  <line x1="200" y1="380" x2="160" y2="380" stroke="#2e6930" stroke-width="1.2"/>
  <line x1="160" y1="380" x2="160" y2="440" stroke="#2e6930" stroke-width="1.2"/>
  <line x1="160" y1="440" x2="140" y2="440" stroke="#2e6930" stroke-width="1.2"/>

  <!-- Customer receives assigned worker -->
  <rect x="25" y="420" width="145" height="42" fill="#f2f8f2" stroke="#2e6930" rx="4"/>
  <text x="97" y="436" font-size="9.5" font-weight="bold" fill="#2e6930" text-anchor="middle">Worker Assigned Alert</text>
  <text x="97" y="450" font-size="8" text-anchor="middle" fill="#555">Render Map &amp; Live ETA</text>

  <line x1="97" y1="462" x2="97" y2="500" stroke="#2e6930" stroke-width="1.2"/>

  <!-- Customer End Node -->
  <circle cx="97" cy="515" r="12" fill="#ffffff" stroke="#2e6930" stroke-width="1.4"/>
  <circle cx="97" cy="515" r="7" fill="#2e6930"/>
  <text x="97" y="542" font-size="9.5" font-weight="bold" text-anchor="middle" fill="#2e6930">Job In Progress</text>
</svg>
"""

# Enhanced Figure 3.5: DFD Level 1 (Modular Decomposition)
svg_dfd1_enhanced = """
<svg width="740" height="580" viewBox="0 0 740 580" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:'Times New Roman', serif; margin:auto; display:block;">
  <rect x="5" y="5" width="730" height="570" fill="#fcfcfd" stroke="#333333" stroke-width="1.5" rx="6"/>
  <text x="370" y="26" font-size="13.5" font-weight="bold" text-anchor="middle" fill="#111111">Figure 3.5: Connect360 Data Flow Diagram (DFD Level 1 - Modular Decomposition)</text>

  <!-- External Entities -->
  <!-- Entity: Customer -->
  <rect x="25" y="60" width="115" height="55" fill="#e8eef5" stroke="#2b4c7e" stroke-width="1.4" rx="4"/>
  <text x="82" y="85" font-size="11" font-weight="bold" text-anchor="middle" fill="#2b4c7e">CUSTOMER</text>
  <text x="82" y="100" font-size="8.5" text-anchor="middle" fill="#555">(Web / Mobile)</text>

  <!-- Entity: Skilled Worker -->
  <rect x="600" y="60" width="115" height="55" fill="#fdf4e8" stroke="#b25e00" stroke-width="1.4" rx="4"/>
  <text x="657" y="85" font-size="11" font-weight="bold" text-anchor="middle" fill="#b25e00">SKILLED WORKER</text>
  <text x="657" y="100" font-size="8.5" text-anchor="middle" fill="#555">(Service Partner)</text>

  <!-- Entity: OSRM Routing Engine -->
  <rect x="25" y="470" width="125" height="50" fill="#f2f8f2" stroke="#2e6930" stroke-width="1.3" rx="4"/>
  <text x="87" y="493" font-size="10" font-weight="bold" text-anchor="middle" fill="#2e6930">OSRM Engine</text>
  <text x="87" y="507" font-size="8" text-anchor="middle" fill="#555">Road Geometry API</text>

  <!-- Entity: AI Service Provider -->
  <rect x="590" y="470" width="125" height="50" fill="#f2f8f2" stroke="#2e6930" stroke-width="1.3" rx="4"/>
  <text x="652" y="493" font-size="10" font-weight="bold" text-anchor="middle" fill="#2e6930">AI Provider</text>
  <text x="652" y="507" font-size="8" text-anchor="middle" fill="#555">Gemini / Bedrock LLM</text>

  <!-- PROCESSES (Numbered 1.0 through 6.0) -->
  <!-- Process 1.0: Authentication & Access Control -->
  <g transform="translate(230, 85)">
    <rect x="-65" y="-22" width="130" height="44" fill="#fff9f0" stroke="#b25e00" stroke-width="1.3" rx="5"/>
    <text x="0" y="-4" font-size="10" font-weight="bold" text-anchor="middle">1.0 Authentication</text>
    <text x="0" y="11" font-size="8.5" text-anchor="middle">&amp; RBAC Control</text>
  </g>

  <!-- Process 2.0: Profile & Geospatial Registration -->
  <g transform="translate(470, 85)">
    <rect x="-70" y="-22" width="140" height="44" fill="#fff9f0" stroke="#b25e00" stroke-width="1.3" rx="5"/>
    <text x="0" y="-4" font-size="10" font-weight="bold" text-anchor="middle">2.0 Worker Profile</text>
    <text x="0" y="11" font-size="8.5" text-anchor="middle">&amp; Geospatial Index</text>
  </g>

  <!-- Process 3.0: Intelligent Candidate Matching -->
  <g transform="translate(230, 200)">
    <rect x="-70" y="-24" width="140" height="48" fill="#fff9f0" stroke="#b25e00" stroke-width="1.3" rx="5"/>
    <text x="0" y="-6" font-size="10" font-weight="bold" text-anchor="middle">3.0 Candidate</text>
    <text x="0" y="8" font-size="8.5" text-anchor="middle">Matching Engine</text>
    <text x="0" y="19" font-size="7.5" text-anchor="middle" fill="#777">O(N) Multi-Criteria</text>
  </g>

  <!-- Process 4.0: Transactional Priority Dispatch -->
  <g transform="translate(470, 200)">
    <rect x="-70" y="-24" width="140" height="48" fill="#fff5f5" stroke="#c53030" stroke-width="1.3" rx="5"/>
    <text x="0" y="-6" font-size="10" font-weight="bold" fill="#c53030" text-anchor="middle">4.0 Priority Dispatch</text>
    <text x="0" y="8" font-size="8.5" text-anchor="middle">&amp; Atomic Locking</text>
    <text x="0" y="19" font-size="7.5" text-anchor="middle" fill="#777">DynamoDB Conditional</text>
  </g>

  <!-- Process 5.0: Spatial Routing & Live Tracking -->
  <g transform="translate(230, 320)">
    <rect x="-70" y="-22" width="140" height="44" fill="#fff9f0" stroke="#b25e00" stroke-width="1.3" rx="5"/>
    <text x="0" y="-4" font-size="10" font-weight="bold" text-anchor="middle">5.0 Spatial Routing</text>
    <text x="0" y="11" font-size="8.5" text-anchor="middle">&amp; Live ETA Tracking</text>
  </g>

  <!-- Process 6.0: Conversational AI & PII Redaction -->
  <g transform="translate(470, 320)">
    <rect x="-70" y="-22" width="140" height="44" fill="#fff9f0" stroke="#b25e00" stroke-width="1.3" rx="5"/>
    <text x="0" y="-4" font-size="10" font-weight="bold" text-anchor="middle">6.0 AI Triage &amp;</text>
    <text x="0" y="11" font-size="8.5" text-anchor="middle">PII Defense Filter</text>
  </g>

  <!-- DATA STORES -->
  <!-- D1: DynamoDB Single-Table -->
  <path d="M 270,415 L 470,415 M 270,455 L 470,455" stroke="#2e6930" stroke-width="2"/>
  <rect x="270" y="416" width="200" height="38" fill="#f4faf4" stroke="none"/>
  <text x="370" y="435" font-size="10" font-weight="bold" text-anchor="middle" fill="#2e6930">D1: DynamoDB Single-Table</text>
  <text x="370" y="448" font-size="8" text-anchor="middle" fill="#555">Users, Workers, Bookings, GSI1, GSI2</text>

  <!-- D2: OSRM Polyline Cache -->
  <path d="M 270,490 L 470,490 M 270,530 L 470,530" stroke="#2e6930" stroke-width="2"/>
  <rect x="270" y="491" width="200" height="38" fill="#f4faf4" stroke="none"/>
  <text x="370" y="510" font-size="10" font-weight="bold" text-anchor="middle" fill="#2e6930">D2: Road Polyline Cache</text>
  <text x="370" y="523" font-size="8" text-anchor="middle" fill="#555">In-Memory OSRM Routes</text>

  <!-- CONNECTING DATA FLOWS -->
  <!-- Customer to Auth -->
  <line x1="140" y1="80" x2="165" y2="80" stroke="#333" stroke-width="1.1"/>
  <text x="152" y="74" font-size="7.5" text-anchor="middle">Credentials</text>

  <!-- Worker to Profile -->
  <line x1="600" y1="80" x2="540" y2="80" stroke="#333" stroke-width="1.1"/>
  <text x="570" y="74" font-size="7.5" text-anchor="middle">Skills/Location</text>

  <!-- Auth to D1 -->
  <line x1="230" y1="107" x2="230" y2="150" stroke="#2e6930" stroke-width="1.1"/>
  <line x1="230" y1="150" x2="330" y2="150" stroke="#2e6930" stroke-width="1.1"/>
  <line x1="330" y1="150" x2="330" y2="415" stroke="#2e6930" stroke-width="1.1"/>

  <!-- Profile to D1 -->
  <line x1="470" y1="107" x2="470" y2="150" stroke="#2e6930" stroke-width="1.1"/>
  <line x1="470" y1="150" x2="410" y2="150" stroke="#2e6930" stroke-width="1.1"/>
  <line x1="410" y1="150" x2="410" y2="415" stroke="#2e6930" stroke-width="1.1"/>

  <!-- Customer to Matching (Search) -->
  <line x1="82" y1="115" x2="82" y2="200" stroke="#333" stroke-width="1.1"/>
  <line x1="82" y1="200" x2="160" y2="200" stroke="#333" stroke-width="1.1"/>
  <text x="120" y="193" font-size="7.5" text-anchor="middle">Search Filter</text>

  <!-- Matching to Priority Dispatch -->
  <line x1="300" y1="200" x2="400" y2="200" stroke="#c53030" stroke-width="1.2"/>
  <text x="350" y="193" font-size="7.5" font-weight="bold" fill="#c53030" text-anchor="middle">Ranked List</text>

  <!-- Priority Dispatch to Worker -->
  <line x1="540" y1="190" x2="657" y2="190" stroke="#333" stroke-width="1.1"/>
  <line x1="657" y1="190" x2="657" y2="115" stroke="#333" stroke-width="1.1"/>
  <text x="600" y="183" font-size="7.5" text-anchor="middle">Emergency Alert</text>

  <!-- Worker Acceptance to Priority Dispatch -->
  <line x1="640" y1="115" x2="640" y2="215" stroke="#c53030" stroke-width="1.2"/>
  <line x1="640" y1="215" x2="540" y2="215" stroke="#c53030" stroke-width="1.2"/>
  <text x="590" y="228" font-size="7.5" font-weight="bold" fill="#c53030" text-anchor="middle">Atomic Accept</text>

  <!-- Priority Dispatch to D1 (Conditional Write) -->
  <line x1="470" y1="224" x2="470" y2="415" stroke="#c53030" stroke-width="1.2"/>
  <text x="490" y="260" font-size="7.5" font-weight="bold" fill="#c53030">Conditional Lock</text>

  <!-- Routing Engine to OSRM -->
  <line x1="160" y1="330" x2="87" y2="330" stroke="#2e6930" stroke-width="1.1"/>
  <line x1="87" y1="330" x2="87" y2="470" stroke="#2e6930" stroke-width="1.1"/>
  <text x="125" y="323" font-size="7.5" text-anchor="middle">Coordinates</text>

  <!-- AI to Provider -->
  <line x1="540" y1="330" x2="652" y2="330" stroke="#2e6930" stroke-width="1.1"/>
  <line x1="652" y1="330" x2="652" y2="470" stroke="#2e6930" stroke-width="1.1"/>
  <text x="600" y="323" font-size="7.5" text-anchor="middle">Sanitized Prompt</text>
</svg>
"""

# Enhanced Figure 3.6: Sequence Diagram (Priority Booking Atomic Acceptance & Commit)
svg_sequence_enhanced = """
<svg width="740" height="580" viewBox="0 0 740 580" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:'Times New Roman', serif; margin:auto; display:block;">
  <rect x="5" y="5" width="730" height="570" fill="#fcfcfd" stroke="#333333" stroke-width="1.5" rx="6"/>
  <text x="370" y="26" font-size="13.5" font-weight="bold" text-anchor="middle" fill="#111111">Figure 3.6: Sequence Diagram: Priority Booking Atomic Acceptance &amp; Concurrency Resolution</text>

  <!-- Lifeline Headers -->
  <!-- Customer -->
  <rect x="20" y="44" width="75" height="26" fill="#e8eef5" stroke="#2b4c7e" rx="3"/>
  <text x="57" y="61" font-size="9.5" font-weight="bold" text-anchor="middle">Customer</text>

  <!-- Client App -->
  <rect x="110" y="44" width="80" height="26" fill="#e8eef5" stroke="#2b4c7e" rx="3"/>
  <text x="150" y="61" font-size="9.5" font-weight="bold" text-anchor="middle">Client App</text>

  <!-- API Gateway -->
  <rect x="205" y="44" width="85" height="26" fill="#fff9f0" stroke="#b25e00" rx="3"/>
  <text x="247" y="61" font-size="9.5" font-weight="bold" text-anchor="middle">API Gateway</text>

  <!-- Dispatch Lambda -->
  <rect x="305" y="44" width="105" height="26" fill="#fff9f0" stroke="#b25e00" rx="3"/>
  <text x="357" y="61" font-size="9.5" font-weight="bold" text-anchor="middle">Dispatch Service</text>

  <!-- DynamoDB -->
  <rect x="425" y="44" width="95" height="26" fill="#f2f8f2" stroke="#2e6930" rx="3"/>
  <text x="472" y="61" font-size="9.5" font-weight="bold" text-anchor="middle">DynamoDB</text>

  <!-- Worker 1 -->
  <rect x="535" y="44" width="85" height="26" fill="#fdf4e8" stroke="#b25e00" rx="3"/>
  <text x="577" y="61" font-size="9.5" font-weight="bold" text-anchor="middle">Worker 1 (W1)</text>

  <!-- Worker 2 -->
  <rect x="635" y="44" width="85" height="26" fill="#fdf4e8" stroke="#b25e00" rx="3"/>
  <text x="677" y="61" font-size="9.5" font-weight="bold" text-anchor="middle">Worker 2 (W2)</text>

  <!-- Lifeline dashed lines -->
  <line x1="57" y1="70" x2="57" y2="550" stroke="#888" stroke-dasharray="4,4"/>
  <line x1="150" y1="70" x2="150" y2="550" stroke="#888" stroke-dasharray="4,4"/>
  <line x1="247" y1="70" x2="247" y2="550" stroke="#888" stroke-dasharray="4,4"/>
  <line x1="357" y1="70" x2="357" y2="550" stroke="#888" stroke-dasharray="4,4"/>
  <line x1="472" y1="70" x2="472" y2="550" stroke="#888" stroke-dasharray="4,4"/>
  <line x1="577" y1="70" x2="577" y2="550" stroke="#888" stroke-dasharray="4,4"/>
  <line x1="677" y1="70" x2="677" y2="550" stroke="#888" stroke-dasharray="4,4"/>

  <!-- Activation Boxes -->
  <rect x="53" y="90" width="8" height="420" fill="#c2d5ea" stroke="#2b4c7e"/>
  <rect x="146" y="95" width="8" height="410" fill="#c2d5ea" stroke="#2b4c7e"/>
  <rect x="243" y="105" width="8" height="390" fill="#ffe2b3" stroke="#b25e00"/>
  <rect x="353" y="115" width="8" height="375" fill="#ffe2b3" stroke="#b25e00"/>
  <rect x="468" y="145" width="8" height="300" fill="#cbe6cb" stroke="#2e6930"/>
  <rect x="573" y="200" width="8" height="230" fill="#ffe2b3" stroke="#b25e00"/>
  <rect x="673" y="210" width="8" height="190" fill="#ffe2b3" stroke="#b25e00"/>

  <!-- Messages -->
  <!-- 1. Customer -> App -->
  <line x1="61" y1="98" x2="146" y2="98" stroke="#2b4c7e" stroke-width="1.2"/>
  <polygon points="146,98 138,94 138,102" fill="#2b4c7e"/>
  <text x="103" y="93" font-size="8" text-anchor="middle">1: Request Priority (Lat/Lon)</text>

  <!-- 2. App -> API Gateway -->
  <line x1="154" y1="110" x2="243" y2="110" stroke="#2b4c7e" stroke-width="1.2"/>
  <polygon points="243,110 235,106 235,114" fill="#2b4c7e"/>
  <text x="198" y="105" font-size="8" text-anchor="middle">2: POST /bookings/priority</text>

  <!-- 3. Gateway -> Dispatch Lambda -->
  <line x1="251" y1="122" x2="353" y2="122" stroke="#b25e00" stroke-width="1.2"/>
  <polygon points="353,122 345,118 345,126" fill="#b25e00"/>
  <text x="302" y="117" font-size="8" text-anchor="middle">3: Invoke Dispatch</text>

  <!-- 4. Lambda scores candidates & writes to DynamoDB -->
  <line x1="361" y1="148" x2="468" y2="148" stroke="#2e6930" stroke-width="1.2"/>
  <polygon points="468,148 460,144 460,152" fill="#2e6930"/>
  <text x="414" y="142" font-size="8" text-anchor="middle">4: PutItem (status='worker_pending')</text>

  <!-- 5. DynamoDB confirms -->
  <line x1="468" y1="168" x2="361" y2="168" stroke="#2e6930" stroke-width="1.1" stroke-dasharray="3,3"/>
  <polygon points="361,168 369,164 369,172" fill="#2e6930"/>
  <text x="414" y="163" font-size="8" text-anchor="middle">5: 200 OK (Created)</text>

  <!-- 6. Lambda broadcasts to W1 & W2 -->
  <line x1="361" y1="190" x2="573" y2="190" stroke="#b25e00" stroke-width="1.2"/>
  <polygon points="573,190 565,186 565,194" fill="#b25e00"/>
  <text x="467" y="184" font-size="8" text-anchor="middle">6a: WebSocket Alert (W1)</text>

  <line x1="361" y1="205" x2="673" y2="205" stroke="#b25e00" stroke-width="1.2"/>
  <polygon points="673,205 665,201 665,209" fill="#b25e00"/>
  <text x="517" y="200" font-size="8" text-anchor="middle">6b: WebSocket Alert (W2)</text>

  <!-- 7. W1 accepts (t=0) -->
  <line x1="573" y1="230" x2="361" y2="230" stroke="#2e6930" stroke-width="1.3"/>
  <polygon points="361,230 369,226 369,234" fill="#2e6930"/>
  <text x="467" y="224" font-size="8" font-weight="bold" fill="#2e6930" text-anchor="middle">7: W1 Accepts (t=0 ms)</text>

  <!-- 8. W2 accepts concurrently (t=+8ms) -->
  <line x1="673" y1="248" x2="361" y2="248" stroke="#888" stroke-width="1.1" stroke-dasharray="3,3"/>
  <polygon points="361,248 369,244 369,252" fill="#888"/>
  <text x="517" y="243" font-size="8" fill="#555" text-anchor="middle">8: W2 Accepts Concurrent (t=+8 ms)</text>

  <!-- 9. Lambda executes conditional write for W1 -->
  <line x1="361" y1="270" x2="468" y2="270" stroke="#2e6930" stroke-width="1.3"/>
  <polygon points="468,270 460,266 460,274" fill="#2e6930"/>
  <text x="414" y="264" font-size="7.5" font-weight="bold" fill="#2e6930" text-anchor="middle">9: UpdateItem (Condition: worker_id null)</text>

  <!-- 10. DynamoDB commits W1 -->
  <line x1="468" y1="290" x2="361" y2="290" stroke="#2e6930" stroke-width="1.3"/>
  <polygon points="361,290 369,286 369,294" fill="#2e6930"/>
  <text x="414" y="285" font-size="8" font-weight="bold" fill="#2e6930" text-anchor="middle">10: Atomic Commit OK (W1 Assigned)</text>

  <!-- 11. Lambda executes conditional write for W2 -->
  <line x1="361" y1="315" x2="468" y2="315" stroke="#c53030" stroke-width="1.2"/>
  <polygon points="468,315 460,311 460,319" fill="#c53030"/>
  <text x="414" y="310" font-size="7.5" text-anchor="middle">11: UpdateItem for W2 (Same Condition)</text>

  <!-- 12. DynamoDB throws ConditionalCheckFailed for W2 -->
  <line x1="468" y1="335" x2="361" y2="335" stroke="#c53030" stroke-width="1.3" stroke-dasharray="3,3"/>
  <polygon points="361,335 369,331 369,339" fill="#c53030"/>
  <text x="414" y="330" font-size="8" font-weight="bold" fill="#c53030" text-anchor="middle">12: ConditionalCheckFailedException</text>

  <!-- 13. Lambda responds to W1 (Dispatched) -->
  <line x1="361" y1="365" x2="573" y2="365" stroke="#2e6930" stroke-width="1.3"/>
  <polygon points="573,365 565,361 565,369" fill="#2e6930"/>
  <text x="467" y="359" font-size="8" font-weight="bold" fill="#2e6930" text-anchor="middle">13: HTTP 200 Accepted (Dispatched + Route)</text>

  <!-- 14. Lambda responds to W2 (Conflict) -->
  <line x1="361" y1="390" x2="673" y2="390" stroke="#c53030" stroke-width="1.3"/>
  <polygon points="673,390 665,386 665,394" fill="#c53030"/>
  <text x="517" y="384" font-size="8" font-weight="bold" fill="#c53030" text-anchor="middle">14: HTTP 409 Conflict ('Job Already Taken')</text>

  <!-- 15. Lambda notifies Customer -->
  <line x1="353" y1="420" x2="251" y2="420" stroke="#2b4c7e" stroke-width="1.2"/>
  <polygon points="251,420 259,416 259,424" fill="#2b4c7e"/>
  <text x="302" y="414" font-size="8" text-anchor="middle">15: Worker Assigned Event</text>

  <line x1="243" y1="440" x2="154" y2="440" stroke="#2b4c7e" stroke-width="1.2"/>
  <polygon points="154,440 162,436 162,444" fill="#2b4c7e"/>
  <text x="198" y="434" font-size="8" text-anchor="middle">16: Live Status Update</text>

  <line x1="146" y1="460" x2="61" y2="460" stroke="#2b4c7e" stroke-width="1.2"/>
  <polygon points="61,460 69,456 69,464" fill="#2b4c7e"/>
  <text x="103" y="454" font-size="8" text-anchor="middle">17: Display W1 En Route + ETA</text>
</svg>
"""

# =============================================================================
# 2. UPDATE HTML REPORT
# =============================================================================
with open(HTML_PATH, "r", encoding="utf-8") as f:
    html = f.read()

# Replace Title
old_title_exact = "CONNECT360: ON-DEMAND HYPERLOCAL HOME SERVICES MARKETPLACE WITH REAL-TIME WORKER DISPATCH, AI-DRIVEN TRIAGE, AND PRIVACY-PRESERVING TELEPHONY"
new_title_exact = "CONNECT360 - AN INTELLIGENT AND SECURE PLATFORM FOR SKILLED LABOUR BOOKING"

html = html.replace(old_title_exact, new_title_exact)
html = html.replace("<title>Connect360 Phase-I Project Report</title>", f"<title>{new_title_exact}</title>")

# Replace Team Members & Supervisor
# In Title Page:
old_team_html = """  <p>
    <strong>DHARSHINI R S</strong> (230701076)<br>
    <strong>JAYADHARSINI M</strong> ([TO BE PROVIDED])<br>
    <strong>SURYA NIRANJAN S</strong> ([TO BE PROVIDED])<br>
    <strong>PRASHAANT V</strong> ([TO BE PROVIDED])
  </p>"""

new_team_html = """  <p>
    <strong>JAYADHARSINI M</strong> (230701127)<br>
    <strong>DHARSHINI R S</strong> (230701076)<br>
    <strong>ENIYA B A</strong> (230701085)<br>
    <strong>JAYAPRADHA P</strong> (230701130)
  </p>"""

html = html.replace(old_team_html, new_team_html)

# In Bonafide Certificate:
old_cert_team = "DHARSHINI R S (230701076), JAYADHARSINI M ([TO BE PROVIDED]), SURYA NIRANJAN S ([TO BE PROVIDED]), and PRASHAANT V ([TO BE PROVIDED])"
new_cert_team = "JAYADHARSINI M (230701127), DHARSHINI R S (230701076), ENIYA B A (230701085), and JAYAPRADHA P (230701130)"
html = html.replace(old_cert_team, new_cert_team)

# Supervisor in Bonafide Certificate:
old_guide_block = """    <td style="width: 50%; text-align: right;">
      <strong>SUPERVISOR / PROJECT GUIDE</strong><br>
      [TO BE PROVIDED]<br>
      Assistant / Associate Professor<br>
      Department of Computer Science and Engineering<br>
      Rajalakshmi Engineering College<br>
      Thandalam, Chennai - 602 105
    </td>"""

new_guide_block = """    <td style="width: 50%; text-align: right;">
      <strong>SUPERVISOR / PROJECT GUIDE</strong><br>
      Ms. Divya M<br>
      Assistant Professor (CSE)<br>
      Department of Computer Science and Engineering<br>
      Rajalakshmi Engineering College<br>
      Thandalam, Chennai - 602 105
    </td>"""
html = html.replace(old_guide_block, new_guide_block)

# Acknowledgement Supervisor:
html = html.replace("Project Guide, <strong>[TO BE PROVIDED]</strong>", "Project Guide, <strong>Ms. Divya M</strong>, Assistant Professor (CSE)")
html = html.replace("Chairperson, <strong>Dr. [TO BE PROVIDED]</strong>", "Chairperson, <strong>Dr. (Mrs.) Thangam Meganathan</strong>")
html = html.replace("Vice Chairperson, <strong>Mr. [TO BE PROVIDED]</strong>", "Vice Chairperson, <strong>Mr. Abhay Shankar Meganathan</strong>")

# Acknowledgement Signatures at end of acknowledgement:
old_ack_sig = """  DHARSHINI R S (230701076)<br>
  JAYADHARSINI M ([TO BE PROVIDED])<br>
  SURYA NIRANJAN S ([TO BE PROVIDED])<br>
  PRASHAANT V ([TO BE PROVIDED])"""

new_ack_sig = """  JAYADHARSINI M (230701127)<br>
  DHARSHINI R S (230701076)<br>
  ENIYA B A (230701085)<br>
  JAYAPRADHA P (230701130)"""
html = html.replace(old_ack_sig, new_ack_sig)

# Replace SVG diagrams with enhanced versions
# Regex replace the 4 SVGs in HTML
html = re.sub(r'<svg width="720" height="380" viewBox="0 0 720 380"[^>]*>.*?Figure 3.2: Connect360 Use Case Diagram.*?</svg>', svg_usecase_enhanced, html, flags=re.DOTALL)
html = re.sub(r'<svg width="720" height="390" viewBox="0 0 720 390"[^>]*>.*?Figure 3.3: Connect360 Priority Booking Activity Diagram.*?</svg>', svg_activity_enhanced, html, flags=re.DOTALL)
html = re.sub(r'<svg width="720" height="380" viewBox="0 0 720 380"[^>]*>.*?Figure 3.5: Connect360 Data Flow Diagram \(DFD Level 1.*?/svg>', svg_dfd1_enhanced, html, flags=re.DOTALL)
html = re.sub(r'<svg width="720" height="380" viewBox="0 0 720 380"[^>]*>.*?Figure 3.6: Sequence Diagram: Priority Booking Atomic Acceptance.*?/svg>', svg_sequence_enhanced, html, flags=re.DOTALL)

# =============================================================================
# 3. CLEAN UP MATHEMATICAL FORMULAS & SYMBOLS (NO RANDOM/BROKEN CODES)
# =============================================================================

# Clean up equation block in 4.2.3:
broken_math_block_pattern = r"Defined in [^,]+, this module executes the candidate ranking[\s\S]*?engine dynamically shifts weights based on booking mode\."

clean_math_block = """The <strong>Candidate Matching Engine</strong> executes the multi-criteria candidate ranking algorithm. The system retrieves all verified, available technicians within a specified service domain and computes a composite score <i>S</i> &isin; [0, 1] across four normalized sub-scores:

<div style="text-align: center; margin: 16px 0; font-size: 11.5pt; font-weight: bold; background: #fdfdfd; padding: 10px; border: 1px solid #e0e0e0; border-radius: 4px;">
  <i>S</i> = (<i>w</i><sub>dist</sub> &times; <i>S</i><sub>dist</sub>) + 
            (<i>w</i><sub>rating</sub> &times; <i>S</i><sub>rating</sub>) + 
            (<i>w</i><sub>exp</sub> &times; <i>S</i><sub>exp</sub>) + 
            (<i>w</i><sub>comp</sub> &times; <i>S</i><sub>comp</sub>)
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(4.1)
</div>

<p>where each individual component is bounded between 0 and 1 according to the following mathematical formulations:</p>

<div style="text-align: center; margin: 10px 0; font-size: 10.5pt;">
  <i>S</i><sub>dist</sub> = max(0, 1 &minus; <i>d</i> / <i>d</i><sub>max</sub>)
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(4.2)
</div>
<div style="text-align: center; margin: 10px 0; font-size: 10.5pt;">
  <i>S</i><sub>rating</sub> = (<i>R</i> &minus; 1) / 4
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(4.3)
</div>
<div style="text-align: center; margin: 10px 0; font-size: 10.5pt;">
  <i>S</i><sub>exp</sub> = min(1, <i>E</i> / <i>E</i><sub>max</sub>)
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(4.4)
</div>
<div style="text-align: center; margin: 10px 0; font-size: 10.5pt;">
  <i>S</i><sub>comp</sub> = min(1, <i>C</i> / <i>C</i><sub>max</sub>)
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(4.5)
</div>

<p>In these equations, <i>d</i> denotes the spatial Euclidean distance in kilometers between the customer and the technician with a maximum threshold <i>d</i><sub>max</sub> = 15 km; <i>R</i> &isin; [1, 5] denotes the worker's average customer review rating; <i>E</i> denotes verified industry experience in years with a ceiling of <i>E</i><sub>max</sub> = 10 years; and <i>C</i> represents the count of successfully completed service jobs on the platform capped at <i>C</i><sub>max</sub> = 100 jobs. As presented in Table 4.1, the engine dynamically shifts weights based on the booking mode (Normal vs. Priority Booking).</p>"""

html = re.sub(broken_math_block_pattern, clean_math_block, html)

# Also check for tortuosity formula in Chapter 5:
html = re.sub(
    r"\$\s*\\?tau\s*=\s*D_\{?\s*t?ext\{network\}\s*\}?\s*/\s*D_\{?\s*t?ext\{Euclidean\}\s*\}?\$",
    "<i>&tau;</i> = <i>D</i><sub>network</sub> / <i>D</i><sub>Euclidean</sub>",
    html
)

# Clean any remaining LaTeX symbols or unrendered math in HTML
cleanups = [
    (r"\$S\s*\\in\s*\[0,\s*1\]\$", "<i>S</i> &isin; [0, 1]"),
    (r"\$d_\{?\s*t?ext\{max\}\s*\}?\s*=\s*15\\?\s*t?ext\{?\s*km\}?\$", "<i>d</i><sub>max</sub> = 15 km"),
    (r"\$d_\{?\s*t?ext\{max\}\s*\}?\$", "<i>d</i><sub>max</sub>"),
    (r"\$E_\{?\s*t?ext\{max\}\s*\}?\s*=\s*10\\?\s*t?ext\{?\s*years\}?\$", "<i>E</i><sub>max</sub> = 10 years"),
    (r"\$E_\{?\s*t?ext\{max\}\s*\}?\$", "<i>E</i><sub>max</sub>"),
    (r"\$C_\{?\s*t?ext\{max\}\s*\}?\s*=\s*100\\?\s*t?ext\{?\s*jobs\}?\$", "<i>C</i><sub>max</sub> = 100 jobs"),
    (r"\$C_\{?\s*t?ext\{max\}\s*\}?\$", "<i>C</i><sub>max</sub>"),
    (r"\$R\s*\\in\s*\[1,\s*5\]\$", "<i>R</i> &isin; [1, 5]"),
    (r"\$d\$", "<i>d</i>"),
    (r"\$R\$", "<i>R</i>"),
    (r"\$E\$", "<i>E</i>"),
    (r"\$C\$", "<i>C</i>"),
    (r"\$S\$", "<i>S</i>"),
    (r"\$N\s*=\s*500\$", "<i>N</i> = 500"),
    (r"\$N\s*=\s*5000\$", "<i>N</i> = 5,000"),
    (r"\$N\$", "<i>N</i>"),
    (r"\$\\rho\$", "<i>&rho;</i>"),
    (r"\$\\tau\$", "<i>&tau;</i>"),
    (r"\$\\mu\s*t?ext\{?\s*s\}?\$", "&mu;s"),
    (r"\\mu\s*t?ext\{?\s*s\}?", "&mu;s"),
    (r"t?ext\{?\s*ms\}?", "ms"),
    (r"t?ext\{?\s*km\}?", "km"),
    (r"t?ext\{?\s*--\}?", "&ndash;"),
    (r"\\mu s", "&mu;s"),
    (r"\$\\mu\$s", "&mu;s"),
    (r"\$\\mu\$", "&mu;"),
]

for pat, repl in cleanups:
    html = re.sub(pat, repl, html)

# =============================================================================
# 4. REMOVE ALL SOURCE CODE FILE PATHS (REPORT COMPLIANCE)
# =============================================================================
path_replacements = [
    ("backend/lambdas/connect360-assistant/handler.py", "Conversational AI Assistant Module"),
    ("backend/lambdas/connect360-bookings/priority_handler.py", "Priority Dispatch Handler"),
    ("backend/shared/auth_helpers.py", "Authentication & Authorization Service"),
    ("backend/shared/calling_provider.py", "Virtual Telephony Module"),
    ("backend/shared/matching_service.py", "Candidate Matching Engine"),
    ("backend/shared/ai_provider.py", "AI Provider Interface Subsystem"),
    ("backend/shared/assistant_knowledge.py", "Assistant Knowledge Base Subsystem"),
    ("frontend/src/services/routingService.js", "Client Spatial Routing Service"),
    ("frontend/src/services/authService.js", "Client Authentication Service"),
    ("connect360-assistant/handler.py", "Conversational AI Assistant Module"),
    ("priority_handler.py", "Priority Dispatch Handler"),
    ("matching_service.py", "Candidate Matching Engine"),
    ("calling_provider.py", "Virtual Telephony Subsystem"),
    ("routingService.js", "Spatial Routing Service"),
    ("authService.js", "Client Authentication Module"),
    ("ai_provider.py", "AI Provider Interface"),
    ("assistant_knowledge.py", "Assistant Knowledge Base"),
]

for old_path, new_name in path_replacements:
    html = html.replace(old_path, new_name)

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(html)
print("Updated and cleaned HTML report successfully!")

# =============================================================================
# 5. UPDATE MARKDOWN REPORT
# =============================================================================
with open(MD_PATH, "r", encoding="utf-8") as f:
    md = f.read()

md = md.replace(old_title_exact, new_title_exact)

old_md_team = """- **DHARSHINI R S** (Reg No: `230701076`)
- **JAYADHARSINI M** (Reg No: `[TO BE PROVIDED]`)
- **SURYA NIRANJAN S** (Reg No: `[TO BE PROVIDED]`)
- **PRASHAANT V** (Reg No: `[TO BE PROVIDED]`)"""

new_md_team = """- **JAYADHARSINI M** (Reg No: `230701127`)
- **DHARSHINI R S** (Reg No: `230701076`)
- **ENIYA B A** (Reg No: `230701085`)
- **JAYAPRADHA P** (Reg No: `230701130`)"""
md = md.replace(old_md_team, new_md_team)

md = md.replace(old_cert_team, new_cert_team)
md = md.replace("SUPERVISOR / PROJECT GUIDE**  \n[TO BE PROVIDED]", "SUPERVISOR / PROJECT GUIDE**  \nMs. Divya M, Assistant Professor (CSE)")
md = md.replace("Supervisor and Project Guide, **[TO BE PROVIDED]**", "Supervisor and Project Guide, **Ms. Divya M**, Assistant Professor (CSE)")

clean_md_math = """The **Candidate Matching Engine** executes the multi-criteria candidate ranking algorithm. The system retrieves all verified, available technicians within a specified service domain and computes a composite score $S \\in [0, 1]$ across four normalized sub-scores:

$$S = (w_{\\text{dist}} \\times S_{\\text{dist}}) + (w_{\\text{rating}} \\times S_{\\text{rating}}) + (w_{\\text{exp}} \\times S_{\\text{exp}}) + (w_{\\text{comp}} \\times S_{\\text{comp}}) \\tag{4.1}$$

where each individual component is bounded between 0 and 1 according to the following mathematical formulations:

$$S_{\\text{dist}} = \\max(0, 1 - d / d_{\\text{max}}) \\tag{4.2}$$
$$S_{\\text{rating}} = (R - 1) / 4 \\tag{4.3}$$
$$S_{\\text{exp}} = \\min(1, E / E_{\\text{max}}) \\tag{4.4}$$
$$S_{\\text{comp}} = \\min(1, C / C_{\\text{max}}) \\tag{4.5}$$

In these equations, $d$ denotes the spatial Euclidean distance in kilometers between the customer and the technician with a maximum threshold $d_{\\text{max}} = 15\\text{ km}$; $R \\in [1, 5]$ denotes the worker's average customer review rating; $E$ denotes verified industry experience in years with a ceiling of $E_{\\text{max}} = 10\\text{ years}$; and $C$ represents the count of successfully completed service jobs on the platform capped at $C_{\\text{max}} = 100\\text{ jobs}$. As presented in Table 4.1, the engine dynamically shifts weights based on the booking mode (Normal vs. Priority Booking)."""

md = re.sub(broken_math_block_pattern, lambda m: clean_md_math, md)

for old_path, new_name in path_replacements:
    md = md.replace(old_path, new_name)

with open(MD_PATH, "w", encoding="utf-8") as f:
    f.write(md)
print("Updated and cleaned Markdown report successfully!")

# =============================================================================
# 6. COMPILE RAW PDF VIA EDGE & STAMP OFFICIAL PAGE NUMBERS
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
res = subprocess.run(cmd, capture_output=True, text=True)
if not os.path.exists(TEMP_PDF_PATH):
    print(f"Error compiling raw PDF: {res.stderr}")
    exit(1)

print("Stamping official academic page numbers...")
reader = PdfReader(TEMP_PDF_PATH)
writer = PdfWriter()
total_pages = len(reader.pages)
print(f"Total Pages in raw PDF: {total_pages}")

roman_nums = ["ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"]

for idx, page in enumerate(reader.pages):
    if idx == 0:
        # Title page: no number
        writer.add_page(page)
        continue

    if 1 <= idx <= 9:
        num_str = roman_nums[idx - 1]
    else:
        # Arabic numbering starting at Chapter 1 as 1
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
print(f"Successfully generated updated academic PDF: {FINAL_PDF_PATH}")
print(f"Total Pages: {len(final_reader.pages)}")
print(f"File Size: {file_size_kb:.2f} KB")
