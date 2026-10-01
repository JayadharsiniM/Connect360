"""
Connect360 - Phase-I Academic Project Report Generator
Rajalakshmi Engineering College / Anna University, Chennai
Department of Computer Science and Engineering

This script generates:
1. CONNECT360_PHASE1_PROJECT_REPORT.md (Complete academic markdown)
2. CONNECT360_PHASE1_PROJECT_REPORT.html (Publication-quality, self-contained HTML with embedded base64 figures, formal typography, and print CSS)
3. CONNECT360_PHASE1_PROJECT_REPORT.pdf (Compiled via headless Microsoft Edge)
"""

import os
import sys
import base64
import subprocess
from pypdf import PdfReader

REPORT_DIR = os.path.abspath(os.path.dirname(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(REPORT_DIR, ".."))
EVAL_DIR = os.path.join(PROJECT_ROOT, "evaluation")

def image_to_base64(path):
    if not os.path.exists(path):
        print(f"Warning: Image path not found: {path}")
        return ""
    with open(path, "rb") as f:
        data = f.read()
    ext = os.path.splitext(path)[1].lower().replace(".", "")
    mime = "image/png" if ext == "png" else ("image/jpeg" if ext in ("jpg", "jpeg") else "image/svg+xml")
    return f"data:{mime};base64,{base64.b64encode(data).decode('utf-8')}"

# Load Metric Figures
fig1_path = os.path.join(EVAL_DIR, "metric1_matching_latency", "metric1_matching_latency_final.png")
fig2_path = os.path.join(EVAL_DIR, "metric2_rank_sensitivity", "metric2_rank_inversion.png")
fig3_path = os.path.join(EVAL_DIR, "metric3_concurrency", "metric3_transactional_concurrency.png")
fig4_path = os.path.join(EVAL_DIR, "metric4_spatial_routing", "metric4_road_vs_haversine_disparity.png")
fig5_path = os.path.join(EVAL_DIR, "metric5_ai_safety", "metric5_confusion_matrix_and_performance.png")
fig6_path = os.path.join(EVAL_DIR, "metric6_structured_output", "metric6_structured_output_performance.png")

fig1_b64 = image_to_base64(fig1_path)
fig2_b64 = image_to_base64(fig2_path)
fig3_b64 = image_to_base64(fig3_path)
fig4_b64 = image_to_base64(fig4_path)
fig5_b64 = image_to_base64(fig5_path)
fig6_b64 = image_to_base64(fig6_path)

# SVG System Design Diagrams
svg_architecture = """
<svg width="720" height="400" viewBox="0 0 720 400" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:'Times New Roman', serif; margin:auto; display:block;">
  <rect x="5" y="5" width="710" height="390" fill="#fcfcfc" stroke="#333333" stroke-width="1.5" rx="5"/>
  <text x="360" y="28" font-size="14" font-weight="bold" text-anchor="middle" fill="#111111">Figure 3.1: Connect360 Three-Tier Cloud &amp; Serverless System Architecture</text>
  
  <!-- Client Tier -->
  <rect x="25" y="45" width="195" height="335" fill="#f0f4f8" stroke="#2b4c7e" stroke-width="1.5" rx="4"/>
  <text x="122" y="68" font-size="12" font-weight="bold" text-anchor="middle" fill="#2b4c7e">CLIENT TIER (React 18)</text>
  <rect x="35" y="85" width="175" height="48" fill="#ffffff" stroke="#2b4c7e" rx="3"/>
  <text x="122" y="105" font-size="11" font-weight="bold" text-anchor="middle">Customer Portal</text>
  <text x="122" y="122" font-size="9.5" text-anchor="middle" fill="#555">Browse, Priority Book, Chat</text>
  
  <rect x="35" y="145" width="175" height="48" fill="#ffffff" stroke="#2b4c7e" rx="3"/>
  <text x="122" y="165" font-size="11" font-weight="bold" text-anchor="middle">Worker Dashboard</text>
  <text x="122" y="182" font-size="9.5" text-anchor="middle" fill="#555">Accept Job, Status, Map Route</text>
  
  <rect x="35" y="205" width="175" height="48" fill="#ffffff" stroke="#2b4c7e" rx="3"/>
  <text x="122" y="225" font-size="11" font-weight="bold" text-anchor="middle">Admin Management</text>
  <text x="122" y="242" font-size="9.5" text-anchor="middle" fill="#555">Verifications, Disputes, Audit</text>

  <rect x="35" y="265" width="175" height="100" fill="#ffffff" stroke="#2b4c7e" rx="3"/>
  <text x="122" y="285" font-size="11" font-weight="bold" text-anchor="middle">Client Services Layer</text>
  <text x="122" y="303" font-size="9.5" text-anchor="middle" fill="#555">- routingService.js (OSRM)</text>
  <text x="122" y="319" font-size="9.5" text-anchor="middle" fill="#555">- authService.js (Cognito JWT)</text>
  <text x="122" y="335" font-size="9.5" text-anchor="middle" fill="#555">- socket / polling bridge</text>
  <text x="122" y="351" font-size="9.5" text-anchor="middle" fill="#555">- state management</text>

  <!-- Cloud / Serverless Tier -->
  <rect x="250" y="45" width="240" height="335" fill="#fdf8f0" stroke="#b25e00" stroke-width="1.5" rx="4"/>
  <text x="370" y="68" font-size="12" font-weight="bold" text-anchor="middle" fill="#b25e00">SERVERLESS COMPUTE (AWS)</text>
  
  <rect x="260" y="85" width="220" height="38" fill="#ffffff" stroke="#b25e00" rx="3"/>
  <text x="370" y="108" font-size="11" font-weight="bold" text-anchor="middle">Amazon API Gateway (REST)</text>
  
  <rect x="260" y="132" width="220" height="42" fill="#ffffff" stroke="#b25e00" rx="3"/>
  <text x="370" y="149" font-size="10.5" font-weight="bold" text-anchor="middle">connect360-bookings Lambda</text>
  <text x="370" y="164" font-size="9" text-anchor="middle" fill="#555">priority_handler.py (Atomic Locks)</text>

  <rect x="260" y="182" width="220" height="42" fill="#ffffff" stroke="#b25e00" rx="3"/>
  <text x="370" y="199" font-size="10.5" font-weight="bold" text-anchor="middle">connect360-workers Lambda</text>
  <text x="370" y="214" font-size="9" text-anchor="middle" fill="#555">matching_service.py (O(N) Engine)</text>

  <rect x="260" y="232" width="220" height="42" fill="#ffffff" stroke="#b25e00" rx="3"/>
  <text x="370" y="249" font-size="10.5" font-weight="bold" text-anchor="middle">connect360-assistant Lambda</text>
  <text x="370" y="264" font-size="9" text-anchor="middle" fill="#555">PII Defense + Intent Parser</text>

  <rect x="260" y="282" width="220" height="42" fill="#ffffff" stroke="#b25e00" rx="3"/>
  <text x="370" y="299" font-size="10.5" font-weight="bold" text-anchor="middle">connect360-auth Lambda</text>
  <text x="370" y="314" font-size="9" text-anchor="middle" fill="#555">Cognito Claims + RBAC Validation</text>

  <rect x="260" y="332" width="220" height="35" fill="#ffffff" stroke="#b25e00" rx="3"/>
  <text x="370" y="352" font-size="10" font-weight="bold" text-anchor="middle">calling_provider.py (Virtual Bridge)</text>

  <!-- Data & External Tier -->
  <rect x="515" y="45" width="180" height="335" fill="#f2f8f2" stroke="#2e6930" stroke-width="1.5" rx="4"/>
  <text x="605" y="68" font-size="12" font-weight="bold" text-anchor="middle" fill="#2e6930">DATA &amp; EXTERNAL</text>
  
  <rect x="525" y="85" width="160" height="75" fill="#ffffff" stroke="#2e6930" rx="3"/>
  <text x="605" y="105" font-size="10.5" font-weight="bold" text-anchor="middle">Amazon DynamoDB</text>
  <text x="605" y="122" font-size="9" text-anchor="middle" fill="#555">- Single-Table Schema</text>
  <text x="605" y="136" font-size="9" text-anchor="middle" fill="#555">- GSI1 (Service Type)</text>
  <text x="605" y="150" font-size="9" text-anchor="middle" fill="#555">- GSI2 (Cognito Sub)</text>

  <rect x="525" y="170" width="160" height="42" fill="#ffffff" stroke="#2e6930" rx="3"/>
  <text x="605" y="188" font-size="10.5" font-weight="bold" text-anchor="middle">Amazon Cognito</text>
  <text x="605" y="202" font-size="9" text-anchor="middle" fill="#555">User Pools &amp; JWT</text>

  <rect x="525" y="222" width="160" height="42" fill="#ffffff" stroke="#2e6930" rx="3"/>
  <text x="605" y="240" font-size="10.5" font-weight="bold" text-anchor="middle">OSRM Engine</text>
  <text x="605" y="254" font-size="9" text-anchor="middle" fill="#555">Road Routing &amp; Geometry</text>

  <rect x="525" y="274" width="160" height="42" fill="#ffffff" stroke="#2e6930" rx="3"/>
  <text x="605" y="292" font-size="10.5" font-weight="bold" text-anchor="middle">Gemini / Bedrock LLM</text>
  <text x="605" y="306" font-size="9" text-anchor="middle" fill="#555">Conversational Triage</text>

  <rect x="525" y="326" width="160" height="40" fill="#ffffff" stroke="#2e6930" rx="3"/>
  <text x="605" y="344" font-size="10" font-weight="bold" text-anchor="middle">Twilio / Exotel Bridge</text>
  <text x="605" y="357" font-size="9" text-anchor="middle" fill="#555">Virtual Masked Calls</text>

  <!-- Connectors -->
  <line x1="220" y1="104" x2="260" y2="104" stroke="#333333" stroke-width="1.3"/>
  <line x1="480" y1="120" x2="525" y2="120" stroke="#333333" stroke-width="1.3"/>
  <line x1="480" y1="200" x2="525" y2="135" stroke="#333333" stroke-width="1.3"/>
  <line x1="480" y1="250" x2="525" y2="295" stroke="#333333" stroke-width="1.3"/>
  <line x1="480" y1="350" x2="525" y2="350" stroke="#333333" stroke-width="1.3"/>
</svg>
"""

svg_usecase = """
<svg width="720" height="380" viewBox="0 0 720 380" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:'Times New Roman', serif; margin:auto; display:block;">
  <rect x="5" y="5" width="710" height="370" fill="#fdfdfd" stroke="#333333" stroke-width="1.5" rx="5"/>
  <text x="360" y="28" font-size="14" font-weight="bold" text-anchor="middle" fill="#111111">Figure 3.2: Connect360 Use Case Diagram</text>

  <!-- Customer Actor -->
  <circle cx="75" cy="115" r="14" fill="#e8eef5" stroke="#2b4c7e" stroke-width="1.3"/>
  <line x1="75" y1="129" x2="75" y2="160" stroke="#2b4c7e" stroke-width="1.3"/>
  <line x1="55" y1="142" x2="95" y2="142" stroke="#2b4c7e" stroke-width="1.3"/>
  <line x1="75" y1="160" x2="60" y2="195" stroke="#2b4c7e" stroke-width="1.3"/>
  <line x1="75" y1="160" x2="90" y2="195" stroke="#2b4c7e" stroke-width="1.3"/>
  <text x="75" y="215" font-size="11.5" font-weight="bold" text-anchor="middle">Customer</text>

  <!-- Service Partner Actor -->
  <circle cx="645" cy="115" r="14" fill="#fdf4e8" stroke="#b25e00" stroke-width="1.3"/>
  <line x1="645" y1="129" x2="645" y2="160" stroke="#b25e00" stroke-width="1.3"/>
  <line x1="625" y1="142" x2="665" y2="142" stroke="#b25e00" stroke-width="1.3"/>
  <line x1="645" y1="160" x2="630" y2="195" stroke="#b25e00" stroke-width="1.3"/>
  <line x1="645" y1="160" x2="660" y2="195" stroke="#b25e00" stroke-width="1.3"/>
  <text x="645" y="215" font-size="11.5" font-weight="bold" text-anchor="middle">Service Partner</text>

  <!-- Boundary -->
  <rect x="160" y="45" width="400" height="315" fill="#f7f9fa" stroke="#444444" stroke-width="1.2" stroke-dasharray="4,4" rx="4"/>
  <text x="360" y="65" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#444444">Connect360 System Boundary</text>

  <!-- Use Cases -->
  <ellipse cx="360" cy="92" rx="95" ry="17" fill="#ffffff" stroke="#2b4c7e" stroke-width="1.2"/>
  <text x="360" y="96" font-size="10.5" text-anchor="middle">Register &amp; Authenticate</text>

  <ellipse cx="360" cy="136" rx="95" ry="17" fill="#ffffff" stroke="#2b4c7e" stroke-width="1.2"/>
  <text x="360" y="140" font-size="10.5" text-anchor="middle">Initiate Priority Booking</text>

  <ellipse cx="360" cy="180" rx="95" ry="17" fill="#ffffff" stroke="#2b4c7e" stroke-width="1.2"/>
  <text x="360" y="184" font-size="10.5" text-anchor="middle">Atomic Accept Priority Job</text>

  <ellipse cx="360" cy="224" rx="95" ry="17" fill="#ffffff" stroke="#2b4c7e" stroke-width="1.2"/>
  <text x="360" y="228" font-size="10.5" text-anchor="middle">Track Route &amp; Live ETA</text>

  <ellipse cx="360" cy="268" rx="95" ry="17" fill="#ffffff" stroke="#2b4c7e" stroke-width="1.2"/>
  <text x="360" y="272" font-size="10.5" text-anchor="middle">Consult AI Assistant</text>

  <ellipse cx="360" cy="312" rx="95" ry="17" fill="#ffffff" stroke="#2b4c7e" stroke-width="1.2"/>
  <text x="360" y="316" font-size="10.5" text-anchor="middle">Masked Virtual Telephony</text>

  <!-- Lines -->
  <line x1="105" y1="140" x2="265" y2="92" stroke="#666" stroke-width="1"/>
  <line x1="105" y1="148" x2="265" y2="136" stroke="#666" stroke-width="1"/>
  <line x1="105" y1="156" x2="265" y2="224" stroke="#666" stroke-width="1"/>
  <line x1="105" y1="164" x2="265" y2="268" stroke="#666" stroke-width="1"/>
  <line x1="105" y1="172" x2="265" y2="312" stroke="#666" stroke-width="1"/>

  <line x1="615" y1="140" x2="455" y2="92" stroke="#666" stroke-width="1"/>
  <line x1="615" y1="148" x2="455" y2="180" stroke="#666" stroke-width="1"/>
  <line x1="615" y1="156" x2="455" y2="224" stroke="#666" stroke-width="1"/>
  <line x1="615" y1="164" x2="455" y2="268" stroke="#666" stroke-width="1"/>
  <line x1="615" y1="172" x2="455" y2="312" stroke="#666" stroke-width="1"/>
</svg>
"""

svg_activity = """
<svg width="720" height="390" viewBox="0 0 720 390" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:'Times New Roman', serif; margin:auto; display:block;">
  <rect x="5" y="5" width="710" height="380" fill="#fdfdfd" stroke="#333333" stroke-width="1.5" rx="5"/>
  <text x="360" y="28" font-size="14" font-weight="bold" text-anchor="middle" fill="#111111">Figure 3.3: Connect360 Priority Booking Activity Diagram</text>

  <!-- Start Node -->
  <circle cx="60" cy="80" r="12" fill="#2b4c7e"/>
  <text x="60" y="110" font-size="10" text-anchor="middle">Customer Starts</text>

  <!-- Action 1 -->
  <rect x="115" y="60" width="120" height="40" fill="#e8eef5" stroke="#2b4c7e" rx="4"/>
  <text x="175" y="78" font-size="10" font-weight="bold" text-anchor="middle">Request Priority</text>
  <text x="175" y="92" font-size="9" text-anchor="middle">Service &amp; Location</text>

  <!-- Action 2 -->
  <rect x="270" y="60" width="130" height="40" fill="#fdf8f0" stroke="#b25e00" rx="4"/>
  <text x="335" y="78" font-size="10" font-weight="bold" text-anchor="middle">Execute rank_workers()</text>
  <text x="335" y="92" font-size="9" text-anchor="middle">O(N) Priority Weights</text>

  <!-- Action 3 -->
  <rect x="435" y="60" width="125" height="40" fill="#fdf8f0" stroke="#b25e00" rx="4"/>
  <text x="497" y="78" font-size="10" font-weight="bold" text-anchor="middle">Write Pending Booking</text>
  <text x="497" y="92" font-size="9" text-anchor="middle">Broadcast to Candidates</text>

  <!-- Action 4 -->
  <rect x="590" y="60" width="110" height="40" fill="#fdf4e8" stroke="#b25e00" rx="4"/>
  <text x="645" y="78" font-size="10" font-weight="bold" text-anchor="middle">Worker Receives</text>
  <text x="645" y="92" font-size="9" text-anchor="middle">Accept Notification</text>

  <!-- Decision Diamond -->
  <polygon points="645,150 695,190 645,230 595,190" fill="#fff7e6" stroke="#b25e00" stroke-width="1.3"/>
  <text x="645" y="188" font-size="9.5" font-weight="bold" text-anchor="middle">Conditional</text>
  <text x="645" y="200" font-size="9" text-anchor="middle">Check?</text>

  <!-- Path Success -->
  <rect x="390" y="170" width="150" height="40" fill="#f2f8f2" stroke="#2e6930" rx="4"/>
  <text x="465" y="188" font-size="10" font-weight="bold" text-anchor="middle">Atomic Update: worker_id</text>
  <text x="465" y="202" font-size="9" text-anchor="middle">Status -> accepted (200 OK)</text>

  <!-- Path Fail -->
  <rect x="575" y="280" width="140" height="38" fill="#fde8e8" stroke="#d62728" rx="4"/>
  <text x="645" y="298" font-size="10" font-weight="bold" text-anchor="middle" fill="#d62728">Abort (409 Conflict)</text>
  <text x="645" y="310" font-size="8.5" text-anchor="middle" fill="#d62728">Job Already Taken</text>

  <!-- Action 5: Live Route Tracking -->
  <rect x="180" y="170" width="160" height="40" fill="#f2f8f2" stroke="#2e6930" rx="4"/>
  <text x="260" y="188" font-size="10" font-weight="bold" text-anchor="middle">Resolve OSRM Road Route</text>
  <text x="260" y="202" font-size="9" text-anchor="middle">Live Polyline &amp; ETA to Client</text>

  <!-- End Node -->
  <circle cx="60" cy="190" r="14" fill="#ffffff" stroke="#2e6930" stroke-width="1.5"/>
  <circle cx="60" cy="190" r="8" fill="#2e6930"/>
  <text x="60" y="222" font-size="10" text-anchor="middle">Dispatched</text>

  <!-- Flow Arrows -->
  <line x1="72" y1="80" x2="115" y2="80" stroke="#333" stroke-width="1.2"/>
  <line x1="235" y1="80" x2="270" y2="80" stroke="#333" stroke-width="1.2"/>
  <line x1="400" y1="80" x2="435" y2="80" stroke="#333" stroke-width="1.2"/>
  <line x1="560" y1="80" x2="590" y2="80" stroke="#333" stroke-width="1.2"/>
  <line x1="645" y1="100" x2="645" y2="150" stroke="#333" stroke-width="1.2"/>
  <line x1="595" y1="190" x2="540" y2="190" stroke="#2e6930" stroke-width="1.2"/>
  <text x="568" y="183" font-size="9" fill="#2e6930" font-weight="bold">First</text>

  <line x1="645" y1="230" x2="645" y2="280" stroke="#d62728" stroke-width="1.2"/>
  <text x="650" y="255" font-size="9" fill="#d62728" font-weight="bold">Concurrent Loss</text>

  <line x1="390" y1="190" x2="340" y2="190" stroke="#333" stroke-width="1.2"/>
  <line x1="180" y1="190" x2="74" y2="190" stroke="#333" stroke-width="1.2"/>
</svg>
"""

svg_dfd = """
<svg width="720" height="380" viewBox="0 0 720 380" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:'Times New Roman', serif; margin:auto; display:block;">
  <rect x="5" y="5" width="710" height="370" fill="#fdfdfd" stroke="#333333" stroke-width="1.5" rx="5"/>
  <text x="360" y="28" font-size="14" font-weight="bold" text-anchor="middle" fill="#111111">Figure 3.4: Connect360 Data Flow Diagram (DFD Level 0 - Context Diagram)</text>

  <!-- External Entity: Customer -->
  <rect x="30" y="140" width="130" height="80" fill="#e8eef5" stroke="#2b4c7e" stroke-width="1.5" rx="3"/>
  <text x="95" y="175" font-size="12" font-weight="bold" text-anchor="middle">CUSTOMER</text>
  <text x="95" y="195" font-size="9.5" text-anchor="middle" fill="#555">(Mobile/Web User)</text>

  <!-- Central Process: Connect360 System -->
  <circle cx="360" cy="180" r="70" fill="#fff9f0" stroke="#b25e00" stroke-width="1.8"/>
  <text x="360" y="170" font-size="13" font-weight="bold" text-anchor="middle" fill="#b25e00">0.0</text>
  <text x="360" y="188" font-size="12" font-weight="bold" text-anchor="middle">Connect360</text>
  <text x="360" y="202" font-size="10" text-anchor="middle">Marketplace Core</text>

  <!-- External Entity: Worker -->
  <rect x="560" y="140" width="130" height="80" fill="#fdf4e8" stroke="#b25e00" stroke-width="1.5" rx="3"/>
  <text x="625" y="175" font-size="12" font-weight="bold" text-anchor="middle">SERVICE</text>
  <text x="625" y="190" font-size="12" font-weight="bold" text-anchor="middle">PARTNER</text>

  <!-- External Entity: OSRM Routing -->
  <rect x="180" y="285" width="120" height="55" fill="#f2f8f2" stroke="#2e6930" stroke-width="1.3" rx="3"/>
  <text x="240" y="310" font-size="10.5" font-weight="bold" text-anchor="middle">OSRM Engine</text>
  <text x="240" y="325" font-size="9" text-anchor="middle" fill="#555">(Road Geometry)</text>

  <!-- External Entity: AI Provider -->
  <rect x="420" y="285" width="120" height="55" fill="#f2f8f2" stroke="#2e6930" stroke-width="1.3" rx="3"/>
  <text x="480" y="310" font-size="10.5" font-weight="bold" text-anchor="middle">AI Provider</text>
  <text x="480" y="325" font-size="9" text-anchor="middle" fill="#555">(Gemini/Bedrock)</text>

  <!-- Flows Customer <-> System -->
  <line x1="160" y1="160" x2="290" y2="160" stroke="#333" stroke-width="1.2"/>
  <text x="225" y="152" font-size="8.5" text-anchor="middle">Booking Req, Chat, Coords</text>

  <line x1="290" y1="195" x2="160" y2="195" stroke="#333" stroke-width="1.2"/>
  <text x="225" y="208" font-size="8.5" text-anchor="middle">Worker Profile, ETA, Redacted Chat</text>

  <!-- Flows System <-> Worker -->
  <line x1="430" y1="160" x2="560" y2="160" stroke="#333" stroke-width="1.2"/>
  <text x="495" y="152" font-size="8.5" text-anchor="middle">Priority Alerts, Job Notes</text>

  <line x1="560" y1="195" x2="430" y2="195" stroke="#333" stroke-width="1.2"/>
  <text x="495" y="208" font-size="8.5" text-anchor="middle">Atomic Accept, Location Updates</text>

  <!-- Flows System <-> OSRM & AI -->
  <line x1="320" y1="240" x2="260" y2="285" stroke="#666" stroke-width="1.2"/>
  <text x="270" y="260" font-size="8" text-anchor="middle">Waypoints</text>

  <line x1="400" y1="240" x2="460" y2="285" stroke="#666" stroke-width="1.2"/>
  <text x="450" y="260" font-size="8" text-anchor="middle">Sanitized Prompt</text>
</svg>
"""

svg_dfd1 = """
<svg width="720" height="380" viewBox="0 0 720 380" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:'Times New Roman', serif; margin:auto; display:block;">
  <rect x="5" y="5" width="710" height="370" fill="#fdfdfd" stroke="#333333" stroke-width="1.5" rx="5"/>
  <text x="360" y="28" font-size="14" font-weight="bold" text-anchor="middle" fill="#111111">Figure 3.5: Connect360 Data Flow Diagram (DFD Level 1 - Modular Decomposition)</text>

  <!-- Processes -->
  <rect x="40" y="60" width="130" height="50" fill="#fff9f0" stroke="#b25e00" rx="4"/>
  <text x="105" y="80" font-size="10.5" font-weight="bold" text-anchor="middle">1.0 Authentication</text>
  <text x="105" y="96" font-size="9" text-anchor="middle">&amp; RBAC Control</text>

  <rect x="230" y="60" width="140" height="50" fill="#fff9f0" stroke="#b25e00" rx="4"/>
  <text x="300" y="80" font-size="10.5" font-weight="bold" text-anchor="middle">2.0 Intelligent Matching</text>
  <text x="300" y="96" font-size="9" text-anchor="middle">&amp; Candidate Ranking</text>

  <rect x="430" y="60" width="130" height="50" fill="#fff9f0" stroke="#b25e00" rx="4"/>
  <text x="495" y="80" font-size="10.5" font-weight="bold" text-anchor="middle">3.0 Priority Booking</text>
  <text x="495" y="96" font-size="9" text-anchor="middle">&amp; Atomic Dispatch</text>

  <rect x="130" y="160" width="140" height="50" fill="#fff9f0" stroke="#b25e00" rx="4"/>
  <text x="200" y="180" font-size="10.5" font-weight="bold" text-anchor="middle">4.0 AI Assistant &amp;</text>
  <text x="200" y="196" font-size="9" text-anchor="middle">PII Redaction Defense</text>

  <rect x="330" y="160" width="140" height="50" fill="#fff9f0" stroke="#b25e00" rx="4"/>
  <text x="400" y="180" font-size="10.5" font-weight="bold" text-anchor="middle">5.0 Spatial Routing</text>
  <text x="400" y="196" font-size="9" text-anchor="middle">&amp; Live ETA Tracking</text>

  <rect x="530" y="160" width="130" height="50" fill="#fff9f0" stroke="#b25e00" rx="4"/>
  <text x="595" y="180" font-size="10.5" font-weight="bold" text-anchor="middle">6.0 Masked Virtual</text>
  <text x="595" y="196" font-size="9" text-anchor="middle">Telephony Bridge</text>

  <!-- Data Stores -->
  <path d="M 180,270 L 320,270 M 180,310 L 320,310" stroke="#2e6930" stroke-width="2"/>
  <text x="250" y="295" font-size="11" font-weight="bold" text-anchor="middle" fill="#2e6930">D1: DynamoDB (Single-Table)</text>

  <path d="M 400,270 L 540,270 M 400,310 L 540,310" stroke="#2e6930" stroke-width="2"/>
  <text x="470" y="295" font-size="11" font-weight="bold" text-anchor="middle" fill="#2e6930">D2: OSRM Road Cache</text>

  <!-- Connectors -->
  <line x1="170" y1="85" x2="230" y2="85" stroke="#333" stroke-width="1.2"/>
  <line x1="370" y1="85" x2="430" y2="85" stroke="#333" stroke-width="1.2"/>
  <line x1="300" y1="110" x2="260" y2="270" stroke="#2e6930" stroke-width="1.2"/>
  <line x1="495" y1="110" x2="310" y2="270" stroke="#2e6930" stroke-width="1.2"/>
  <line x1="200" y1="210" x2="240" y2="270" stroke="#2e6930" stroke-width="1.2"/>
  <line x1="400" y1="210" x2="450" y2="270" stroke="#2e6930" stroke-width="1.2"/>
</svg>
"""

svg_sequence = """
<svg width="720" height="380" viewBox="0 0 720 380" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:'Times New Roman', serif; margin:auto; display:block;">
  <rect x="5" y="5" width="710" height="370" fill="#fcfcfc" stroke="#333333" stroke-width="1.5" rx="5"/>
  <text x="360" y="28" font-size="14" font-weight="bold" text-anchor="middle" fill="#111111">Figure 3.6: Sequence Diagram: Priority Booking Atomic Acceptance</text>

  <!-- Lifeline Headers -->
  <rect x="35" y="48" width="95" height="28" fill="#e8eef5" stroke="#2b4c7e" rx="3"/>
  <text x="82" y="66" font-size="10.5" font-weight="bold" text-anchor="middle">Customer</text>

  <rect x="175" y="48" width="105" height="28" fill="#fdf8f0" stroke="#b25e00" rx="3"/>
  <text x="227" y="66" font-size="10.5" font-weight="bold" text-anchor="middle">API Gateway</text>

  <rect x="320" y="48" width="125" height="28" fill="#fdf8f0" stroke="#b25e00" rx="3"/>
  <text x="382" y="66" font-size="10.5" font-weight="bold" text-anchor="middle">priority_handler</text>

  <rect x="490" y="48" width="95" height="28" fill="#f2f8f2" stroke="#2e6930" rx="3"/>
  <text x="537" y="66" font-size="10.5" font-weight="bold" text-anchor="middle">DynamoDB</text>

  <rect x="610" y="48" width="95" height="28" fill="#fdf4e8" stroke="#b25e00" rx="3"/>
  <text x="657" y="66" font-size="10.5" font-weight="bold" text-anchor="middle">Workers (W1, W2)</text>

  <!-- Lifelines -->
  <line x1="82" y1="76" x2="82" y2="355" stroke="#888" stroke-dasharray="4,4"/>
  <line x1="227" y1="76" x2="227" y2="355" stroke="#888" stroke-dasharray="4,4"/>
  <line x1="382" y1="76" x2="382" y2="355" stroke="#888" stroke-dasharray="4,4"/>
  <line x1="537" y1="76" x2="537" y2="355" stroke="#888" stroke-dasharray="4,4"/>
  <line x1="657" y1="76" x2="657" y2="355" stroke="#888" stroke-dasharray="4,4"/>

  <!-- Messages -->
  <line x1="82" y1="100" x2="227" y2="100" stroke="#2b4c7e" stroke-width="1.2"/>
  <text x="154" y="95" font-size="9" text-anchor="middle">POST /bookings/priority</text>

  <line x1="227" y1="115" x2="382" y2="115" stroke="#b25e00" stroke-width="1.2"/>
  <text x="304" y="110" font-size="9" text-anchor="middle">create_priority_booking()</text>

  <line x1="382" y1="135" x2="537" y2="135" stroke="#2e6930" stroke-width="1.2"/>
  <text x="459" y="130" font-size="9" text-anchor="middle">put_item(status='worker_pending')</text>

  <line x1="382" y1="165" x2="657" y2="165" stroke="#b25e00" stroke-width="1.2"/>
  <text x="519" y="160" font-size="9" text-anchor="middle">Broadcast Job Alert (WebSocket/Push)</text>

  <line x1="657" y1="195" x2="382" y2="195" stroke="#2e6930" stroke-width="1.2"/>
  <text x="519" y="190" font-size="8.5" text-anchor="middle" fill="#2e6930">W1: accept_priority(id)</text>

  <line x1="657" y1="215" x2="382" y2="215" stroke="#888" stroke-width="1.2" stroke-dasharray="2,2"/>
  <text x="519" y="210" font-size="8.5" text-anchor="middle" fill="#888">W2: accept_priority(id) [Concurrent]</text>

  <line x1="382" y1="240" x2="537" y2="240" stroke="#2e6930" stroke-width="1.2"/>
  <text x="459" y="235" font-size="8.5" text-anchor="middle">update_item(Condition: status='worker_pending')</text>

  <line x1="537" y1="265" x2="382" y2="265" stroke="#2e6930" stroke-width="1.2"/>
  <text x="459" y="260" font-size="8.5" text-anchor="middle" fill="#2e6930">W1: 200 OK (Committed)</text>

  <line x1="537" y1="285" x2="382" y2="285" stroke="#d62728" stroke-width="1.2" stroke-dasharray="2,2"/>
  <text x="459" y="280" font-size="8.5" text-anchor="middle" fill="#d62728">W2: ConditionalCheckFailed (409)</text>

  <line x1="382" y1="310" x2="657" y2="310" stroke="#2e6930" stroke-width="1.2"/>
  <text x="519" y="305" font-size="8.5" text-anchor="middle" fill="#2e6930">W1: 200 Accepted (Dispatched)</text>

  <line x1="382" y1="328" x2="657" y2="328" stroke="#d62728" stroke-width="1.2"/>
  <text x="519" y="323" font-size="8.5" text-anchor="middle" fill="#d62728">W2: 409 Conflict ('Job already accepted')</text>

  <line x1="382" y1="348" x2="82" y2="348" stroke="#2b4c7e" stroke-width="1.2"/>
  <text x="232" y="343" font-size="8.5" text-anchor="middle" fill="#2b4c7e">Notify Customer: Worker Assigned</text>
</svg>
"""

print("Writing full report...")
