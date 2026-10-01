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

# 1. Update HTML
with open(HTML_PATH, "r", encoding="utf-8") as f:
    html = f.read()

# Replace TOC page numbers
toc_replacements = [
    # TOC
    ("<tr><td></td><td>1.2 OBJECTIVE</td><td style=\"text-align: right;\">3</td></tr>", "<tr><td></td><td>1.2 OBJECTIVE</td><td style=\"text-align: right;\">1</td></tr>"),
    ("<tr><td></td><td>1.3 EXISTING SYSTEM</td><td style=\"text-align: right;\">4</td></tr>", "<tr><td></td><td>1.3 EXISTING SYSTEM</td><td style=\"text-align: right;\">2</td></tr>"),
    ("<tr><td></td><td>1.4 PROPOSED SYSTEM</td><td style=\"text-align: right;\">6</td></tr>", "<tr><td></td><td>1.4 PROPOSED SYSTEM</td><td style=\"text-align: right;\">3</td></tr>"),
    ("<tr><td><strong>2</strong></td><td><strong>LITERATURE SURVEY</strong></td><td style=\"text-align: right;\"><strong>9</strong></td></tr>", "<tr><td><strong>2</strong></td><td><strong>LITERATURE SURVEY</strong></td><td style=\"text-align: right;\"><strong>4</strong></td></tr>"),
    ("<tr><td></td><td>2.1 LITERATURE REVIEW</td><td style=\"text-align: right;\">9</td></tr>", "<tr><td></td><td>2.1 LITERATURE REVIEW</td><td style=\"text-align: right;\">4</td></tr>"),
    ("<tr><td></td><td>2.2 COMPARISON AND DISCUSSION</td><td style=\"text-align: right;\">13</td></tr>", "<tr><td></td><td>2.2 COMPARISON AND DISCUSSION</td><td style=\"text-align: right;\">5</td></tr>"),
    ("<tr><td></td><td>2.3 CONCLUSION</td><td style=\"text-align: right;\">15</td></tr>", "<tr><td></td><td>2.3 CONCLUSION</td><td style=\"text-align: right;\">5</td></tr>"),
    ("<tr><td><strong>3</strong></td><td><strong>SYSTEM DESIGN</strong></td><td style=\"text-align: right;\"><strong>16</strong></td></tr>", "<tr><td><strong>3</strong></td><td><strong>SYSTEM DESIGN</strong></td><td style=\"text-align: right;\"><strong>6</strong></td></tr>"),
    ("<tr><td></td><td>3.1 SYSTEM ARCHITECTURE</td><td style=\"text-align: right;\">16</td></tr>", "<tr><td></td><td>3.1 SYSTEM ARCHITECTURE</td><td style=\"text-align: right;\">6</td></tr>"),
    ("<tr><td></td><td>3.2 SYSTEM REQUIREMENTS</td><td style=\"text-align: right;\">19</td></tr>", "<tr><td></td><td>3.2 SYSTEM REQUIREMENTS</td><td style=\"text-align: right;\">7</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;3.2.1 SOFTWARE REQUIREMENTS</td><td style=\"text-align: right;\">19</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;3.2.1 SOFTWARE REQUIREMENTS</td><td style=\"text-align: right;\">7</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;3.2.2 HARDWARE REQUIREMENTS</td><td style=\"text-align: right;\">20</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;3.2.2 HARDWARE REQUIREMENTS</td><td style=\"text-align: right;\">7</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;3.2.3 DATABASE / DATA REQUIREMENTS</td><td style=\"text-align: right;\">21</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;3.2.3 DATABASE / DATA REQUIREMENTS</td><td style=\"text-align: right;\">8</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;3.2.4 DEPLOYMENT AND SCALING</td><td style=\"text-align: right;\">23</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;3.2.4 DEPLOYMENT AND SCALING</td><td style=\"text-align: right;\">8</td></tr>"),
    ("<tr><td></td><td>3.3 SYSTEM DESIGN DIAGRAMS</td><td style=\"text-align: right;\">24</td></tr>", "<tr><td></td><td>3.3 SYSTEM DESIGN DIAGRAMS</td><td style=\"text-align: right;\">8</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;3.3.1 USE CASE DIAGRAM</td><td style=\"text-align: right;\">24</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;3.3.1 USE CASE DIAGRAM</td><td style=\"text-align: right;\">8</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;3.3.2 ACTIVITY DIAGRAM</td><td style=\"text-align: right;\">26</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;3.3.2 ACTIVITY DIAGRAM</td><td style=\"text-align: right;\">9</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;3.3.3 DATA FLOW DIAGRAM (LEVEL 0 &amp; LEVEL 1)</td><td style=\"text-align: right;\">28</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;3.3.3 DATA FLOW DIAGRAM (LEVEL 0 &amp; LEVEL 1)</td><td style=\"text-align: right;\">9</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;3.3.4 SEQUENCE DIAGRAM</td><td style=\"text-align: right;\">31</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;3.3.4 SEQUENCE DIAGRAM</td><td style=\"text-align: right;\">10</td></tr>"),
    ("<tr><td><strong>4</strong></td><td><strong>PROJECT DESCRIPTION</strong></td><td style=\"text-align: right;\"><strong>33</strong></td></tr>", "<tr><td><strong>4</strong></td><td><strong>PROJECT DESCRIPTION</strong></td><td style=\"text-align: right;\"><strong>12</strong></td></tr>"),
    ("<tr><td></td><td>4.1 METHODOLOGIES</td><td style=\"text-align: right;\">33</td></tr>", "<tr><td></td><td>4.1 METHODOLOGIES</td><td style=\"text-align: right;\">12</td></tr>"),
    ("<tr><td></td><td>4.2 MODULES</td><td style=\"text-align: right;\">35</td></tr>", "<tr><td></td><td>4.2 MODULES</td><td style=\"text-align: right;\">12</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.1 MODULE 1: AUTHENTICATION AND RBAC CONTROL</td><td style=\"text-align: right;\">35</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.1 MODULE 1: AUTHENTICATION AND RBAC CONTROL</td><td style=\"text-align: right;\">12</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.2 MODULE 2: WORKER PROFILE &amp; GEOSPATIAL REGISTRATION</td><td style=\"text-align: right;\">36</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.2 MODULE 2: WORKER PROFILE &amp; GEOSPATIAL REGISTRATION</td><td style=\"text-align: right;\">12</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.3 MODULE 3: INTELLIGENT MATCHING ENGINE</td><td style=\"text-align: right;\">37</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.3 MODULE 3: INTELLIGENT MATCHING ENGINE</td><td style=\"text-align: right;\">12</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.4 MODULE 4: TRANSACTIONAL PRIORITY DISPATCH</td><td style=\"text-align: right;\">38</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.4 MODULE 4: TRANSACTIONAL PRIORITY DISPATCH</td><td style=\"text-align: right;\">13</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.5 MODULE 5: HYBRID SPATIAL ROUTING &amp; LIVE TRACKING</td><td style=\"text-align: right;\">39</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.5 MODULE 5: HYBRID SPATIAL ROUTING &amp; LIVE TRACKING</td><td style=\"text-align: right;\">13</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.6 MODULE 6: CONVERSATIONAL AI ASSISTANT &amp; PII DEFENSE</td><td style=\"text-align: right;\">40</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.6 MODULE 6: CONVERSATIONAL AI ASSISTANT &amp; PII DEFENSE</td><td style=\"text-align: right;\">13</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.7 MODULE 7: PRIVACY-PRESERVING VIRTUAL TELEPHONY</td><td style=\"text-align: right;\">41</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;4.2.7 MODULE 7: PRIVACY-PRESERVING VIRTUAL TELEPHONY</td><td style=\"text-align: right;\">14</td></tr>"),
    ("<tr><td><strong>5</strong></td><td><strong>IMPLEMENTATION AND RESULT DISCUSSION</strong></td><td style=\"text-align: right;\"><strong>42</strong></td></tr>", "<tr><td><strong>5</strong></td><td><strong>IMPLEMENTATION AND RESULT DISCUSSION</strong></td><td style=\"text-align: right;\"><strong>15</strong></td></tr>"),
    ("<tr><td></td><td>5.1 IMPLEMENTATION RESULTS</td><td style=\"text-align: right;\">42</td></tr>", "<tr><td></td><td>5.1 IMPLEMENTATION RESULTS</td><td style=\"text-align: right;\">15</td></tr>"),
    ("<tr><td></td><td>5.2 EVALUATION AND PERFORMANCE ANALYSIS</td><td style=\"text-align: right;\">45</td></tr>", "<tr><td></td><td>5.2 EVALUATION AND PERFORMANCE ANALYSIS</td><td style=\"text-align: right;\">15</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;5.2.1 METRIC 1: MATCHING ALGORITHM EXECUTION LATENCY</td><td style=\"text-align: right;\">45</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;5.2.1 METRIC 1: MATCHING ALGORITHM EXECUTION LATENCY</td><td style=\"text-align: right;\">15</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;5.2.2 METRIC 2: MATCHING ENGINE RANK SENSITIVITY &amp; INVERSION</td><td style=\"text-align: right;\">49</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;5.2.2 METRIC 2: MATCHING ENGINE RANK SENSITIVITY &amp; INVERSION</td><td style=\"text-align: right;\">16</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;5.2.3 METRIC 3: TRANSACTIONAL CONCURRENCY &amp; RACE PREVENTION</td><td style=\"text-align: right;\">53</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;5.2.3 METRIC 3: TRANSACTIONAL CONCURRENCY &amp; RACE PREVENTION</td><td style=\"text-align: right;\">17</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;5.2.4 METRIC 4: ROAD DISTANCE VS. HAVERSINE DISPARITY</td><td style=\"text-align: right;\">57</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;5.2.4 METRIC 4: ROAD DISTANCE VS. HAVERSINE DISPARITY</td><td style=\"text-align: right;\">18</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;5.2.5 METRIC 5: AI ASSISTANT SAFETY &amp; PII REDACTION EFFICACY</td><td style=\"text-align: right;\">61</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;5.2.5 METRIC 5: AI ASSISTANT SAFETY &amp; PII REDACTION EFFICACY</td><td style=\"text-align: right;\">19</td></tr>"),
    ("<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;5.2.6 METRIC 6: STRUCTURED OUTPUT JSON SCHEMA CONFORMITY</td><td style=\"text-align: right;\">66</td></tr>", "<tr><td></td><td>&nbsp;&nbsp;&nbsp;&nbsp;5.2.6 METRIC 6: STRUCTURED OUTPUT JSON SCHEMA CONFORMITY</td><td style=\"text-align: right;\">21</td></tr>"),
    ("<tr><td><strong>6</strong></td><td><strong>CONCLUSION AND FUTURE WORK</strong></td><td style=\"text-align: right;\"><strong>70</strong></td></tr>", "<tr><td><strong>6</strong></td><td><strong>CONCLUSION AND FUTURE WORK</strong></td><td style=\"text-align: right;\"><strong>23</strong></td></tr>"),
    ("<tr><td></td><td>6.1 CONCLUSION</td><td style=\"text-align: right;\">70</td></tr>", "<tr><td></td><td>6.1 CONCLUSION</td><td style=\"text-align: right;\">23</td></tr>"),
    ("<tr><td></td><td>6.2 FUTURE WORK</td><td style=\"text-align: right;\">72</td></tr>", "<tr><td></td><td>6.2 FUTURE WORK</td><td style=\"text-align: right;\">23</td></tr>"),
    ("<tr><td></td><td><strong>REFERENCES</strong></td><td style=\"text-align: right;\"><strong>74</strong></td></tr>", "<tr><td></td><td><strong>REFERENCES</strong></td><td style=\"text-align: right;\"><strong>25</strong></td></tr>"),
    
    # List of Tables
    ("<tr><td>Table 2.1</td><td>Comparative Evaluation of Service Marketplace Architectures</td><td style=\"text-align: right;\">14</td></tr>", "<tr><td>Table 2.1</td><td>Comparative Evaluation of Service Marketplace Architectures</td><td style=\"text-align: right;\">5</td></tr>"),
    ("<tr><td>Table 3.1</td><td>Software Requirements of the Proposed Connect360 System</td><td style=\"text-align: right;\">19</td></tr>", "<tr><td>Table 3.1</td><td>Software Requirements of the Proposed Connect360 System</td><td style=\"text-align: right;\">7</td></tr>"),
    ("<tr><td>Table 3.2</td><td>Hardware Requirements of the Proposed Connect360 System</td><td style=\"text-align: right;\">20</td></tr>", "<tr><td>Table 3.2</td><td>Hardware Requirements of the Proposed Connect360 System</td><td style=\"text-align: right;\">7</td></tr>"),
    ("<tr><td>Table 3.3</td><td>Amazon DynamoDB Single-Table Schema Entities &amp; Index Design</td><td style=\"text-align: right;\">22</td></tr>", "<tr><td>Table 3.3</td><td>Amazon DynamoDB Single-Table Schema Entities &amp; Index Design</td><td style=\"text-align: right;\">8</td></tr>"),
    ("<tr><td>Table 4.1</td><td>Multi-Criteria Weighting Configurations for Normal vs. Priority Booking</td><td style=\"text-align: right;\">37</td></tr>", "<tr><td>Table 4.1</td><td>Multi-Criteria Weighting Configurations for Normal vs. Priority Booking</td><td style=\"text-align: right;\">13</td></tr>"),
    ("<tr><td>Table 5.1</td><td>Matching Algorithm Execution Latency Across Candidate Pool Sizes</td><td style=\"text-align: right;\">47</td></tr>", "<tr><td>Table 5.1</td><td>Matching Algorithm Execution Latency Across Candidate Pool Sizes</td><td style=\"text-align: right;\">15</td></tr>"),
    ("<tr><td>Table 5.2</td><td>Rank Inversion &amp; Sensitivity Analysis Under Weight Reallocation</td><td style=\"text-align: right;\">51</td></tr>", "<tr><td>Table 5.2</td><td>Rank Inversion &amp; Sensitivity Analysis Under Weight Reallocation</td><td style=\"text-align: right;\">16</td></tr>"),
    ("<tr><td>Table 5.3</td><td>Transactional Concurrency &amp; Conflict Abort Latency Across Thread Loads</td><td style=\"text-align: right;\">55</td></tr>", "<tr><td>Table 5.3</td><td>Transactional Concurrency &amp; Conflict Abort Latency Across Thread Loads</td><td style=\"text-align: right;\">18</td></tr>"),
    ("<tr><td>Table 5.4</td><td>Haversine vs. OSRM Road Distance Disparity Across Distance Tiers</td><td style=\"text-align: right;\">59</td></tr>", "<tr><td>Table 5.4</td><td>Haversine vs. OSRM Road Distance Disparity Across Distance Tiers</td><td style=\"text-align: right;\">19</td></tr>"),
    ("<tr><td>Table 5.5</td><td>AI Assistant Defensive PII Redaction Performance Across 10 Categories</td><td style=\"text-align: right;\">63</td></tr>", "<tr><td>Table 5.5</td><td>AI Assistant Defensive PII Redaction Performance Across 10 Categories</td><td style=\"text-align: right;\">20</td></tr>"),
    ("<tr><td>Table 5.6</td><td>Structured Output Schema Conformity &amp; Urgency Classification Across Dimensions</td><td style=\"text-align: right;\">67</td></tr>", "<tr><td>Table 5.6</td><td>Structured Output Schema Conformity &amp; Urgency Classification Across Dimensions</td><td style=\"text-align: right;\">21</td></tr>"),

    # List of Figures
    ("<tr><td>Figure 3.1</td><td>Connect360 Three-Tier Cloud &amp; Serverless System Architecture</td><td style=\"text-align: right;\">18</td></tr>", "<tr><td>Figure 3.1</td><td>Connect360 Three-Tier Cloud &amp; Serverless System Architecture</td><td style=\"text-align: right;\">6</td></tr>"),
    ("<tr><td>Figure 3.2</td><td>Connect360 Use Case Diagram</td><td style=\"text-align: right;\">25</td></tr>", "<tr><td>Figure 3.2</td><td>Connect360 Use Case Diagram</td><td style=\"text-align: right;\">8</td></tr>"),
    ("<tr><td>Figure 3.3</td><td>Connect360 Priority Booking Activity Diagram</td><td style=\"text-align: right;\">27</td></tr>", "<tr><td>Figure 3.3</td><td>Connect360 Priority Booking Activity Diagram</td><td style=\"text-align: right;\">9</td></tr>"),
    ("<tr><td>Figure 3.4</td><td>Connect360 Data Flow Diagram (DFD Level 0 - Context Diagram)</td><td style=\"text-align: right;\">29</td></tr>", "<tr><td>Figure 3.4</td><td>Connect360 Data Flow Diagram (DFD Level 0 - Context Diagram)</td><td style=\"text-align: right;\">9</td></tr>"),
    ("<tr><td>Figure 3.5</td><td>Connect360 Data Flow Diagram (DFD Level 1 - Modular Decomposition)</td><td style=\"text-align: right;\">30</td></tr>", "<tr><td>Figure 3.5</td><td>Connect360 Data Flow Diagram (DFD Level 1 - Modular Decomposition)</td><td style=\"text-align: right;\">9</td></tr>"),
    ("<tr><td>Figure 3.6</td><td>Sequence Diagram: Priority Booking Atomic Acceptance &amp; Commit</td><td style=\"text-align: right;\">32</td></tr>", "<tr><td>Figure 3.6</td><td>Sequence Diagram: Priority Booking Atomic Acceptance &amp; Commit</td><td style=\"text-align: right;\">10</td></tr>"),
    ("<tr><td>Figure 5.1</td><td>Matching Algorithm Execution Latency vs. Candidate Pool Size</td><td style=\"text-align: right;\">48</td></tr>", "<tr><td>Figure 5.1</td><td>Matching Algorithm Execution Latency vs. Candidate Pool Size</td><td style=\"text-align: right;\">16</td></tr>"),
    ("<tr><td>Figure 5.2</td><td>Matching Engine Rank Sensitivity &amp; Inversion Analysis</td><td style=\"text-align: right;\">52</td></tr>", "<tr><td>Figure 5.2</td><td>Matching Engine Rank Sensitivity &amp; Inversion Analysis</td><td style=\"text-align: right;\">17</td></tr>"),
    ("<tr><td>Figure 5.3</td><td>Transactional Concurrency &amp; Race Condition Prevention</td><td style=\"text-align: right;\">56</td></tr>", "<tr><td>Figure 5.3</td><td>Transactional Concurrency &amp; Race Condition Prevention</td><td style=\"text-align: right;\">18</td></tr>"),
    ("<tr><td>Figure 5.4</td><td>Road Distance vs. Haversine Disparity &amp; Tortuosity Factor Distribution</td><td style=\"text-align: right;\">60</td></tr>", "<tr><td>Figure 5.4</td><td>Road Distance vs. Haversine Disparity &amp; Tortuosity Factor Distribution</td><td style=\"text-align: right;\">19</td></tr>"),
    ("<tr><td>Figure 5.5</td><td>AI Assistant Safety &amp; Contact Redaction Efficacy (PII Defense)</td><td style=\"text-align: right;\">64</td></tr>", "<tr><td>Figure 5.5</td><td>AI Assistant Safety &amp; Contact Redaction Efficacy (PII Defense)</td><td style=\"text-align: right;\">21</td></tr>"),
    ("<tr><td>Figure 5.6</td><td>Structured Output JSON Schema Conformity &amp; Urgency Classification</td><td style=\"text-align: right;\">68</td></tr>", "<tr><td>Figure 5.6</td><td>Structured Output JSON Schema Conformity &amp; Urgency Classification</td><td style=\"text-align: right;\">22</td></tr>")
]

for old, new in toc_replacements:
    html = html.replace(old, new)

# Typography replacements in HTML for math and clean symbols
math_replacements = [
    (r"\$O\(N\)\$", "<i>O</i>(<i>N</i>)"),
    (r"\$F_1\s*=\s*1\.000\$", "<i>F</i><sub>1</sub> = 1.000"),
    (r"\$F_1\$", "<i>F</i><sub>1</sub>"),
    (r"\$\s*\\?rho\s*=\s*0\.836\$", "<i>&rho;</i> = 0.836"),
    (r"\$\s*\\?rho\s*=\s*([0-9\.]+)\$", r"<i>&rho;</i> = \1"),
    (r"\$\s*\\?tau\s*=\s*0\.650\$", "<i>&tau;</i> = 0.650"),
    (r"\$\s*\\?tau\s*=\s*1\.285\$", "<i>&tau;</i> = 1.285"),
    (r"\$\s*\\?tau\s*=\s*([0-9\.]+)\$", r"<i>&tau;</i> = \1"),
    (r"\$\s*\\?tau\s*=\s*D_\{?\s*\\?text\{network\}\s*\}?\s*/\s*D_\{?\s*\\?text\{Euclidean\}\s*\}?\$", "<i>&tau;</i> = <i>D</i><sub>network</sub> / <i>D</i><sub>Euclidean</sub>"),
    (r"\$\s*\\?tau\s*>\s*1\.0\$", "<i>&tau;</i> &gt; 1.0"),
    (r"\$\s*\\?tau\s*=\s*1\.0\$", "<i>&tau;</i> = 1.0"),
    (r"\$3\.89\\?\s*t?ext\{?\s*ms\}?\$", "3.89 ms"),
    (r"\$0\.78\\?\s*\\?\s*\\?mu\\?\s*t?ext\{?\s*s\}?\$", "0.78 &mu;s"),
    (r"\$1\.92\\?\s*\\?\s*\\?mu\\?\s*t?ext\{?\s*s\}?\$", "1.92 &mu;s"),
    (r"\$5\.97\\?\s*\\?\s*\\?mu\\?\s*t?ext\{?\s*s\}?\$", "5.97 &mu;s"),
    (r"\$0\.03\\?\s*t?ext\{?\s*ms\}?\$", "0.03 ms"),
    (r"\$0\.05\\?\s*t?ext\{?\s*ms\}?\$", "0.05 ms"),
    (r"\$1036\.9\\?\s*t?ext\{?\s*ms\}?\$", "1036.9 ms"),
    (r"\$0\.024\\?\s*t?ext\{?\s*--\}?0\.052\\?\s*t?ext\{?\s*ms\}?\$", "0.024&ndash;0.052 ms"),
    (r"\$0/9400\$", "0 / 9,400"),
    (r"\$99\.20\\?%\$", "99.20%"),
    (r"\$100\.0\\?%\$", "100.0%"),
    (r"\$100\\?%\$", "100%"),
    (r"\$66\.7\\?%\$", "66.7%"),
    (r"\$90\.84\\?%\$", "90.84%"),
    (r"\$94\.60\\?%\$", "94.60%"),
    (r"\$50\\?%\$", "50%"),
    (r"\$40\\?%\$", "40%"),
    (r"\$35\\?%\$", "35%"),
    (r"\$30\\?%\$", "30%"),
    (r"\$20\\?%\$", "20%"),
    (r"\$15\\?%\$", "15%"),
    (r"\$10\\?%\$", "10%"),
    (r"\$0\\?%\$", "0%"),
    (r"\$<\s*6\\?\s*t?ext\{?\s*km\}?\$", "&lt; 6 km"),
    (r"\$6\\?\s*t?ext\{?\s*--\}?12\\?\s*t?ext\{?\s*km\}?\$", "6&ndash;12 km"),
    (r"\$12\\?\s*t?ext\{?\s*--\}?25\\?\s*t?ext\{?\s*km\}?\$", "12&ndash;25 km"),
    (r"\$\+3\.41\\?\s*t?ext\{?\s*km\}?\$", "+3.41 km"),
    (r"\$28\.5\\?%\$", "28.5%"),
]

for pat, repl in math_replacements:
    html = re.sub(pat, repl, html)

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(html)
print("Updated HTML report successfully!")

# 2. Update Markdown Report
with open(MD_PATH, "r", encoding="utf-8") as f:
    md = f.read()

md_replacements = [
    ("| | 1.2 OBJECTIVE | 3 |", "| | 1.2 OBJECTIVE | 1 |"),
    ("| | 1.3 EXISTING SYSTEM | 4 |", "| | 1.3 EXISTING SYSTEM | 2 |"),
    ("| | 1.4 PROPOSED SYSTEM | 6 |", "| | 1.4 PROPOSED SYSTEM | 3 |"),
    ("| **2** | **LITERATURE SURVEY** | **9** |", "| **2** | **LITERATURE SURVEY** | **4** |"),
    ("| | 2.1 LITERATURE REVIEW | 9 |", "| | 2.1 LITERATURE REVIEW | 4 |"),
    ("| | 2.2 COMPARISON AND DISCUSSION | 13 |", "| | 2.2 COMPARISON AND DISCUSSION | 5 |"),
    ("| | 2.3 CONCLUSION | 15 |", "| | 2.3 CONCLUSION | 5 |"),
    ("| **3** | **SYSTEM DESIGN** | **16** |", "| **3** | **SYSTEM DESIGN** | **6** |"),
    ("| | 3.1 SYSTEM ARCHITECTURE | 16 |", "| | 3.1 SYSTEM ARCHITECTURE | 6 |"),
    ("| | 3.2 SYSTEM REQUIREMENTS | 19 |", "| | 3.2 SYSTEM REQUIREMENTS | 7 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;3.2.1 SOFTWARE REQUIREMENTS | 19 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;3.2.1 SOFTWARE REQUIREMENTS | 7 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;3.2.2 HARDWARE REQUIREMENTS | 20 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;3.2.2 HARDWARE REQUIREMENTS | 7 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;3.2.3 DATABASE / DATA REQUIREMENTS | 21 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;3.2.3 DATABASE / DATA REQUIREMENTS | 8 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;3.2.4 DEPLOYMENT AND SCALING | 23 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;3.2.4 DEPLOYMENT AND SCALING | 8 |"),
    ("| | 3.3 SYSTEM DESIGN DIAGRAMS | 24 |", "| | 3.3 SYSTEM DESIGN DIAGRAMS | 8 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;3.3.1 USE CASE DIAGRAM | 24 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;3.3.1 USE CASE DIAGRAM | 8 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;3.3.2 ACTIVITY DIAGRAM | 26 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;3.3.2 ACTIVITY DIAGRAM | 9 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;3.3.3 DATA FLOW DIAGRAM (LEVEL 0 &amp; LEVEL 1) | 28 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;3.3.3 DATA FLOW DIAGRAM (LEVEL 0 &amp; LEVEL 1) | 9 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;3.3.4 SEQUENCE DIAGRAM | 31 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;3.3.4 SEQUENCE DIAGRAM | 10 |"),
    ("| **4** | **PROJECT DESCRIPTION** | **33** |", "| **4** | **PROJECT DESCRIPTION** | **12** |"),
    ("| | 4.1 METHODOLOGIES | 33 |", "| | 4.1 METHODOLOGIES | 12 |"),
    ("| | 4.2 MODULES | 35 |", "| | 4.2 MODULES | 12 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.1 MODULE 1: AUTHENTICATION AND RBAC CONTROL | 35 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.1 MODULE 1: AUTHENTICATION AND RBAC CONTROL | 12 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.2 MODULE 2: WORKER PROFILE &amp; GEOSPATIAL REGISTRATION | 36 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.2 MODULE 2: WORKER PROFILE &amp; GEOSPATIAL REGISTRATION | 12 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.3 MODULE 3: INTELLIGENT MATCHING ENGINE | 37 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.3 MODULE 3: INTELLIGENT MATCHING ENGINE | 12 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.4 MODULE 4: TRANSACTIONAL PRIORITY DISPATCH | 38 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.4 MODULE 4: TRANSACTIONAL PRIORITY DISPATCH | 13 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.5 MODULE 5: HYBRID SPATIAL ROUTING &amp; LIVE TRACKING | 39 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.5 MODULE 5: HYBRID SPATIAL ROUTING &amp; LIVE TRACKING | 13 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.6 MODULE 6: CONVERSATIONAL AI ASSISTANT &amp; PII DEFENSE | 40 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.6 MODULE 6: CONVERSATIONAL AI ASSISTANT &amp; PII DEFENSE | 13 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.7 MODULE 7: PRIVACY-PRESERVING VIRTUAL TELEPHONY | 41 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.7 MODULE 7: PRIVACY-PRESERVING VIRTUAL TELEPHONY | 14 |"),
    ("| **5** | **IMPLEMENTATION AND RESULT DISCUSSION** | **42** |", "| **5** | **IMPLEMENTATION AND RESULT DISCUSSION** | **15** |"),
    ("| | 5.1 IMPLEMENTATION RESULTS | 42 |", "| | 5.1 IMPLEMENTATION RESULTS | 15 |"),
    ("| | 5.2 EVALUATION AND PERFORMANCE ANALYSIS | 45 |", "| | 5.2 EVALUATION AND PERFORMANCE ANALYSIS | 15 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.1 METRIC 1: MATCHING ALGORITHM EXECUTION LATENCY | 45 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.1 METRIC 1: MATCHING ALGORITHM EXECUTION LATENCY | 15 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.2 METRIC 2: MATCHING ENGINE RANK SENSITIVITY &amp; INVERSION | 49 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.2 METRIC 2: MATCHING ENGINE RANK SENSITIVITY &amp; INVERSION | 16 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.3 METRIC 3: TRANSACTIONAL CONCURRENCY &amp; RACE PREVENTION | 53 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.3 METRIC 3: TRANSACTIONAL CONCURRENCY &amp; RACE PREVENTION | 17 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.4 METRIC 4: ROAD DISTANCE VS. HAVERSINE DISPARITY | 57 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.4 METRIC 4: ROAD DISTANCE VS. HAVERSINE DISPARITY | 18 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.5 METRIC 5: AI ASSISTANT SAFETY &amp; PII REDACTION EFFICACY | 61 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.5 METRIC 5: AI ASSISTANT SAFETY &amp; PII REDACTION EFFICACY | 19 |"),
    ("| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.6 METRIC 6: STRUCTURED OUTPUT JSON SCHEMA CONFORMITY | 66 |", "| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.6 METRIC 6: STRUCTURED OUTPUT JSON SCHEMA CONFORMITY | 21 |"),
    ("| **6** | **CONCLUSION AND FUTURE WORK** | **70** |", "| **6** | **CONCLUSION AND FUTURE WORK** | **23** |"),
    ("| | 6.1 CONCLUSION | 70 |", "| | 6.1 CONCLUSION | 23 |"),
    ("| | 6.2 FUTURE WORK | 72 |", "| | 6.2 FUTURE WORK | 23 |"),
    ("| | **REFERENCES** | **74** |", "| | **REFERENCES** | **25** |"),

    # Tables in MD
    ("| Table 2.1 | Comparative Evaluation of Service Marketplace Architectures | 14 |", "| Table 2.1 | Comparative Evaluation of Service Marketplace Architectures | 5 |"),
    ("| Table 3.1 | Software Requirements of the Proposed Connect360 System | 19 |", "| Table 3.1 | Software Requirements of the Proposed Connect360 System | 7 |"),
    ("| Table 3.2 | Hardware Requirements of the Proposed Connect360 System | 20 |", "| Table 3.2 | Hardware Requirements of the Proposed Connect360 System | 7 |"),
    ("| Table 3.3 | Amazon DynamoDB Single-Table Schema Entities &amp; Index Design | 22 |", "| Table 3.3 | Amazon DynamoDB Single-Table Schema Entities &amp; Index Design | 8 |"),
    ("| Table 4.1 | Multi-Criteria Weighting Configurations for Normal vs. Priority Booking | 37 |", "| Table 4.1 | Multi-Criteria Weighting Configurations for Normal vs. Priority Booking | 13 |"),
    ("| Table 5.1 | Matching Algorithm Execution Latency Across Candidate Pool Sizes | 47 |", "| Table 5.1 | Matching Algorithm Execution Latency Across Candidate Pool Sizes | 15 |"),
    ("| Table 5.2 | Rank Inversion &amp; Sensitivity Analysis Under Weight Reallocation | 51 |", "| Table 5.2 | Rank Inversion &amp; Sensitivity Analysis Under Weight Reallocation | 16 |"),
    ("| Table 5.3 | Transactional Concurrency &amp; Conflict Abort Latency Across Thread Loads | 55 |", "| Table 5.3 | Transactional Concurrency &amp; Conflict Abort Latency Across Thread Loads | 18 |"),
    ("| Table 5.4 | Haversine vs. OSRM Road Distance Disparity Across Distance Tiers | 59 |", "| Table 5.4 | Haversine vs. OSRM Road Distance Disparity Across Distance Tiers | 19 |"),
    ("| Table 5.5 | AI Assistant Defensive PII Redaction Performance Across 10 Categories | 63 |", "| Table 5.5 | AI Assistant Defensive PII Redaction Performance Across 10 Categories | 20 |"),
    ("| Table 5.6 | Structured Output Schema Conformity &amp; Urgency Classification Across Dimensions | 67 |", "| Table 5.6 | Structured Output Schema Conformity &amp; Urgency Classification Across Dimensions | 21 |"),

    # Figures in MD
    ("| Figure 3.1 | Connect360 Three-Tier Cloud &amp; Serverless System Architecture | 18 |", "| Figure 3.1 | Connect360 Three-Tier Cloud &amp; Serverless System Architecture | 6 |"),
    ("| Figure 3.2 | Connect360 Use Case Diagram | 25 |", "| Figure 3.2 | Connect360 Use Case Diagram | 8 |"),
    ("| Figure 3.3 | Connect360 Priority Booking Activity Diagram | 27 |", "| Figure 3.3 | Connect360 Priority Booking Activity Diagram | 9 |"),
    ("| Figure 3.4 | Connect360 Data Flow Diagram (DFD Level 0 - Context Diagram) | 29 |", "| Figure 3.4 | Connect360 Data Flow Diagram (DFD Level 0 - Context Diagram) | 9 |"),
    ("| Figure 3.5 | Connect360 Data Flow Diagram (DFD Level 1 - Modular Decomposition) | 30 |", "| Figure 3.5 | Connect360 Data Flow Diagram (DFD Level 1 - Modular Decomposition) | 9 |"),
    ("| Figure 3.6 | Sequence Diagram: Priority Booking Atomic Acceptance &amp; Commit | 32 |", "| Figure 3.6 | Sequence Diagram: Priority Booking Atomic Acceptance &amp; Commit | 10 |"),
    ("| Figure 5.1 | Matching Algorithm Execution Latency vs. Candidate Pool Size | 48 |", "| Figure 5.1 | Matching Algorithm Execution Latency vs. Candidate Pool Size | 16 |"),
    ("| Figure 5.2 | Matching Engine Rank Sensitivity &amp; Inversion Analysis | 52 |", "| Figure 5.2 | Matching Engine Rank Sensitivity &amp; Inversion Analysis | 17 |"),
    ("| Figure 5.3 | Transactional Concurrency &amp; Race Condition Prevention | 56 |", "| Figure 5.3 | Transactional Concurrency &amp; Race Condition Prevention | 18 |"),
    ("| Figure 5.4 | Road Distance vs. Haversine Disparity &amp; Tortuosity Factor Distribution | 60 |", "| Figure 5.4 | Road Distance vs. Haversine Disparity &amp; Tortuosity Factor Distribution | 19 |"),
    ("| Figure 5.5 | AI Assistant Safety &amp; Contact Redaction Efficacy (PII Defense) | 64 |", "| Figure 5.5 | AI Assistant Safety &amp; Contact Redaction Efficacy (PII Defense) | 21 |"),
    ("| Figure 5.6 | Structured Output JSON Schema Conformity &amp; Urgency Classification | 68 |", "| Figure 5.6 | Structured Output JSON Schema Conformity &amp; Urgency Classification | 22 |")
]

for old, new in md_replacements:
    md = md.replace(old, new)

with open(MD_PATH, "w", encoding="utf-8") as f:
    f.write(md)
print("Updated Markdown report successfully!")

# 3. Compile Temporary PDF via Edge (no headers/footers)
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

# 4. Stamp Page Numbers via ReportLab and pypdf
print("Stamping official academic page numbers...")
reader = PdfReader(TEMP_PDF_PATH)
writer = PdfWriter()
total_pages = len(reader.pages)

# Page number mapping:
# Sheet 1 (Index 0): Title Page -> No number
# Sheets 2-10 (Index 1-9): Preliminary pages -> 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'
# Sheets 11-35 (Index 10-34): Main chapters -> '1', '2', ..., '25'
roman_nums = ["ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"]

for idx, page in enumerate(reader.pages):
    if idx == 0:
        writer.add_page(page)
        continue

    if 1 <= idx <= 9:
        num_str = roman_nums[idx - 1]
    else:
        num_str = str((idx - 10) + 1)

    # Create overlay canvas
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=A4)
    can.setFont("Times-Roman", 11)
    # Bottom center: A4 width is 595.27 points. Y = 36 pt (0.5 inch from bottom)
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
print(f"Successfully generated final publication-grade academic PDF: {FINAL_PDF_PATH}")
print(f"Total Pages: {len(final_reader.pages)}")
print(f"File Size: {file_size_kb:.2f} KB")
