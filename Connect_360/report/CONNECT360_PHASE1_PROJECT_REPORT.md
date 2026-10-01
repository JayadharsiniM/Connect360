# CONNECT360 - AN INTELLIGENT AND SECURE PLATFORM FOR SKILLED LABOUR BOOKING

## PHASE I REPORT

### Submitted by:
- **JAYADHARSINI M** (Reg No: `230701127`)
- **DHARSHINI R S** (Reg No: `230701076`)
- **ENIYA B A** (Reg No: `230701085`)
- **JAYAPRADHA P** (Reg No: `230701130`)

*in partial fulfillment for the award of the degree of*  
**BACHELOR OF ENGINEERING IN COMPUTER SCIENCE AND ENGINEERING**

**RAJALAKSHMI ENGINEERING COLLEGE, CHENNAI**  
**ANNA UNIVERSITY: CHENNAI 600 025**  
**MARCH 2026**

---

## ANNA UNIVERSITY: CHENNAI 600 025
### BONAFIDE CERTIFICATE

Certified that this project report titled **"CONNECT360 - AN INTELLIGENT AND SECURE PLATFORM FOR SKILLED LABOUR BOOKING"** is the bonafide work of **JAYADHARSINI M (230701127), DHARSHINI R S (230701076), ENIYA B A (230701085), and JAYAPRADHA P (230701130)** who carried out the project work under my supervision.

Certified further that to the best of my knowledge the work reported herein does not form part of any other thesis or dissertation on the basis of which a degree or award was conferred on an earlier occasion on this or any other candidate. This project actively addresses **United Nations Sustainable Development Goal 8 (Decent Work and Economic Growth)** and **Goal 9 (Industry, Innovation, and Infrastructure)**.

**HEAD OF THE DEPARTMENT**  
Dr. [TO BE PROVIDED]  
Professor, Department of CSE  
Rajalakshmi Engineering College  

**SUPERVISOR / PROJECT GUIDE**  
Ms. Divya M, Assistant Professor (CSE)  
Assistant / Associate Professor, Department of CSE  
Rajalakshmi Engineering College  

*Submitted for the Phase-I Project Viva-Voce Examination held on ____________ at Rajalakshmi Engineering College, Chennai.*

---

## ABSTRACT

The rapid expansion of urban centers has dramatically increased the demand for hyperlocal, on-demand home technical services encompassing electrical maintenance, plumbing installations, HVAC repairs, carpentry, painting, and appliance diagnostics. Conventional digital labor marketplaces remain plagued by systemic operational inefficiencies, including severe dispatch latencies, high platform disintermediation, race conditions resulting in double-booked technicians, opaque worker ranking heuristics, and the uninhibited exposure of personally identifiable information (PII). This project designs, implements, and empirically evaluates **Connect360**, an enterprise-grade, serverless on-demand home services marketplace that unifies multi-criteria candidate ranking, concurrency-safe atomic dispatch, conversational AI triage with deterministic PII filtering, hybrid spatial routing, and privacy-preserving virtual telephony.

Connect360 is engineered as a three-tier cloud application comprising a responsive React 18 single-page frontend, an asynchronous serverless backend orchestrated via Amazon Web Services (AWS) Lambda and API Gateway, and an optimized single-table Amazon DynamoDB datastore with Global Secondary Indexes. The platform introduces a dual-mode candidate matching engine that scores available technicians across spatial proximity, customer ratings, verified experience, and job completion history. To resolve urgent household crises, Connect360 features an instant *Priority Booking* subsystem governed by DynamoDB conditional expressions, completely eliminating concurrent assignment conflicts. Furthermore, an integrated conversational AI assistant provides multilingual natural language diagnosis and triage, backed by an air-gapped deterministic regex filter that redacts contact channels to prevent off-platform platform leakage while preserving vital operational pricing and postal tokens.

A comprehensive empirical evaluation of the production codebase was conducted across six core performance dimensions. The candidate matching engine demonstrated strict $O(N)$ linear scalability, processing a candidate pool of 5,000 workers in just $3.89\text{ ms}$ ($0.78\ \mu\text{s}$ per worker). Rank sensitivity analysis revealed a Spearman correlation of $\rho = 0.836$ and Kendall $\tau = 0.650$, validating that Priority Booking dynamically reallocates weight to promote $66.7\%$ of nearby workers. Concurrency stress tests across 9,400 simultaneous worker acceptance requests demonstrated zero double bookings ($0/9400$), with conflict fast-fail aborts executing in $0.024\text{--}0.052\text{ ms}$. Spatial routing analysis across 50 metropolitan routes revealed a mean road network tortuosity of $\tau = 1.285$, justifying Connect360's hybrid spatial architecture of utilizing in-memory Haversine distance ($0.03\text{ ms}$) for millisecond candidate ranking while reserving Open Source Routing Machine (OSRM) road polylines ($1036.9\text{ ms}$) for live client-side dispatch tracking. Finally, AI safety and structured output benchmarks established $99.20\%$ PII detection recall with sub-microsecond latency ($1.92\ \mu\text{s}$), alongside $100\%$ schema conformity and emergency urgency detection ($F_1 = 1.000$). These empirical findings confirm that Connect360 delivers an ultra-low latency, robust, and privacy-preserving architecture for next-generation urban labor platforms.

---

## ACKNOWLEDGEMENT

We express our deepest gratitude to our respected Chairperson, **Dr. [TO BE PROVIDED]**, and our Vice Chairperson, **Mr. [TO BE PROVIDED]**, for their visionary guidance, continuous encouragement, and for providing state-of-the-art infrastructural and computing facilities to carry out this project work successfully.

We extend our sincere thanks to our Principal, **Dr. [TO BE PROVIDED]**, for providing an academically stimulating environment and the required institutional resources throughout the course of our undergraduate study.

We express our heartfelt gratitude to **Dr. [TO BE PROVIDED]**, Professor and Head of the Department of Computer Science and Engineering, for his/her inspiring leadership, constructive support, and valuable guidance during every stage of our Phase-I curriculum.

We are profoundly indebted to our esteemed Supervisor and Project Guide, **Ms. Divya M**, Assistant Professor (CSE), for his/her invaluable mentorship, insightful suggestions, critical technical reviews, and constant encouragement, which steered this research and implementation toward completion.

We also express our appreciation to the Phase-I Project Coordinators, **[TO BE PROVIDED]**, and all the faculty and non-teaching staff members of the Department of Computer Science and Engineering for their direct and indirect support.

Finally, we express our profound gratitude to our parents, family members, and friends for their enduring patience, moral support, and motivation throughout our academic journey.

---

## TABLE OF CONTENTS

| CHAPTER NO. | TITLE | PAGE NO. |
|:---:|---|:---:|
| | **ABSTRACT** | iii |
| | **ACKNOWLEDGEMENT** | iv |
| | **LIST OF TABLES** | vii |
| | **LIST OF FIGURES** | viii |
| | **LIST OF ABBREVIATIONS** | ix |
| **1** | **INTRODUCTION** | **1** |
| | 1.1 GENERAL | 1 |
| | 1.2 OBJECTIVE | 1 |
| | 1.3 EXISTING SYSTEM | 2 |
| | 1.4 PROPOSED SYSTEM | 2 |
| **2** | **LITERATURE SURVEY** | **4** |
| | 2.1 LITERATURE REVIEW | 4 |
| | 2.2 COMPARISON AND DISCUSSION | 5 |
| | 2.3 CONCLUSION | 5 |
| **3** | **SYSTEM DESIGN** | **6** |
| | 3.1 SYSTEM ARCHITECTURE | 6 |
| | 3.2 SYSTEM REQUIREMENTS | 7 |
| | &nbsp;&nbsp;&nbsp;&nbsp;3.2.1 SOFTWARE REQUIREMENTS | 7 |
| | &nbsp;&nbsp;&nbsp;&nbsp;3.2.2 HARDWARE REQUIREMENTS | 7 |
| | &nbsp;&nbsp;&nbsp;&nbsp;3.2.3 DATABASE / DATA REQUIREMENTS | 7 |
| | &nbsp;&nbsp;&nbsp;&nbsp;3.2.4 DEPLOYMENT AND SCALING | 8 |
| | 3.3 SYSTEM DESIGN DIAGRAMS | 8 |
| | &nbsp;&nbsp;&nbsp;&nbsp;3.3.1 USE CASE DIAGRAM | 8 |
| | &nbsp;&nbsp;&nbsp;&nbsp;3.3.2 ACTIVITY DIAGRAM | 9 |
| | &nbsp;&nbsp;&nbsp;&nbsp;3.3.3 DATA FLOW DIAGRAM (LEVEL 0 &amp; LEVEL 1) | 10 |
| | &nbsp;&nbsp;&nbsp;&nbsp;3.3.4 SEQUENCE DIAGRAM | 11 |
| **4** | **PROJECT DESCRIPTION** | **13** |
| | 4.1 METHODOLOGIES | 13 |
| | 4.2 MODULES | 13 |
| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.1 MODULE 1: AUTHENTICATION AND RBAC CONTROL | 13 |
| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.2 MODULE 2: WORKER PROFILE &amp; GEOSPATIAL REGISTRATION | 13 |
| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.3 MODULE 3: INTELLIGENT MATCHING ENGINE | 13 |
| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.4 MODULE 4: TRANSACTIONAL PRIORITY DISPATCH | 14 |
| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.5 MODULE 5: HYBRID SPATIAL ROUTING &amp; LIVE TRACKING | 14 |
| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.6 MODULE 6: CONVERSATIONAL AI ASSISTANT &amp; PII DEFENSE | 14 |
| | &nbsp;&nbsp;&nbsp;&nbsp;4.2.7 MODULE 7: PRIVACY-PRESERVING TELEPHONY & NUMBER MASKING | 15 |
| **5** | **IMPLEMENTATION AND RESULT DISCUSSION** | **16** |
| | 5.1 IMPLEMENTATION RESULTS | 16 |
| | 5.2 EVALUATION AND PERFORMANCE ANALYSIS | 16 |
| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.1 METRIC 1: MATCHING ALGORITHM EXECUTION LATENCY | 16 |
| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.2 METRIC 2: MATCHING ENGINE RANK SENSITIVITY &amp; INVERSION | 17 |
| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.3 METRIC 3: TRANSACTIONAL CONCURRENCY &amp; RACE PREVENTION | 18 |
| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.4 METRIC 4: ROAD DISTANCE VS. HAVERSINE DISPARITY | 19 |
| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.5 METRIC 5: AI ASSISTANT SAFETY &amp; PII REDACTION EFFICACY | 20 |
| | &nbsp;&nbsp;&nbsp;&nbsp;5.2.6 METRIC 6: STRUCTURED OUTPUT JSON SCHEMA CONFORMITY | 22 |
| **6** | **CONCLUSION AND FUTURE WORK** | **24** |
| | 6.1 CONCLUSION | 24 |
| | 6.2 FUTURE WORK | 24 |
| | **REFERENCES** | **26** |

---

## LIST OF TABLES

| TABLE NO. | TABLE NAME | PAGE NO. |
|:---:|---|:---:|
| Table 2.1 | Comparative Evaluation of Service Marketplace Architectures | 5 |
| Table 3.1 | Software Requirements of the Proposed Connect360 System | 7 |
| Table 3.2 | Hardware Requirements of the Proposed Connect360 System | 7 |
| Table 3.3 | Amazon DynamoDB Single-Table Schema Entities &amp; Index Design | 8 |
| Table 4.1 | Multi-Criteria Weighting Configurations for Normal vs. Priority Booking | 14 |
| Table 5.1 | Matching Algorithm Execution Latency Across Candidate Pool Sizes | 16 |
| Table 5.2 | Rank Inversion &amp; Sensitivity Analysis Under Weight Reallocation | 17 |
| Table 5.3 | Transactional Concurrency &amp; Conflict Abort Latency Across Thread Loads | 19 |
| Table 5.4 | Haversine vs. OSRM Road Distance Disparity Across Distance Tiers | 19 |
| Table 5.5 | AI Assistant Defensive PII Redaction Performance Across 10 Categories | 20 |
| Table 5.6 | Structured Output Schema Conformity &amp; Urgency Classification Across Dimensions | 22 |

---

## LIST OF FIGURES

| FIGURE NO. | FIGURE NAME | PAGE NO. |
|:---:|---|:---:|
| Figure 3.1 | Connect360 Three-Tier Cloud &amp; Serverless System Architecture | 6 |
| Figure 3.2 | Connect360 Use Case Diagram | 8 |
| Figure 3.3 | Connect360 Priority Booking Activity Diagram | 9 |
| Figure 3.4 | Connect360 Data Flow Diagram (DFD Level 0 - Context Diagram) | 10 |
| Figure 3.5 | Connect360 Data Flow Diagram (DFD Level 1 - Modular Decomposition) | 10 |
| Figure 3.6 | Sequence Diagram: Priority Booking Atomic Acceptance &amp; Commit | 11 |
| Figure 5.1 | Matching Algorithm Execution Latency vs. Candidate Pool Size | 17 |
| Figure 5.2 | Matching Engine Rank Sensitivity &amp; Inversion Analysis | 18 |
| Figure 5.3 | Transactional Concurrency &amp; Race Condition Prevention | 19 |
| Figure 5.4 | Road Distance vs. Haversine Disparity &amp; Tortuosity Factor Distribution | 20 |
| Figure 5.5 | AI Assistant Safety &amp; Contact Redaction Efficacy (PII Defense) | 21 |
| Figure 5.6 | Structured Output JSON Schema Conformity &amp; Urgency Classification | 23 |

---

## LIST OF ABBREVIATIONS

| ABBREVIATION | DESCRIPTION |
|---|---|
| **API** | Application Programming Interface |
| **AWS** | Amazon Web Services |
| **CDF** | Cumulative Distribution Function |
| **CDN** | Content Delivery Network |
| **CORS** | Cross-Origin Resource Sharing |
| **DDB** | Amazon DynamoDB |
| **DFD** | Data Flow Diagram |
| **E.164** | International Public Telecommunication Numbering Plan Format |
| **ETA** | Estimated Time of Arrival |
| **F1** | Harmonic Mean of Precision and Recall |
| **FN** | False Negative |
| **FP** | False Positive |
| **GSI** | Global Secondary Index |
| **HTTP** | Hypertext Transfer Protocol |
| **HTTPS** | Hypertext Transfer Protocol Secure |
| **HVAC** | Heating, Ventilation, and Air Conditioning |
| **IAM** | Identity and Access Management |
| **ISO** | International Organization for Standardization |
| **JSON** | JavaScript Object Notation |
| **JWT** | JSON Web Token |
| **LLM** | Large Language Model |
| **MCB** | Miniature Circuit Breaker |
| **OSRM** | Open Source Routing Machine |
| **P50 / P90 / P99** | 50th, 90th, and 99th Percentiles |
| **PII** | Personally Identifiable Information |
| **RBAC** | Role-Based Access Control |
| **REST** | Representational State Transfer |
| **SDG** | Sustainable Development Goal |
| **SPA** | Single Page Application |
| **TN** | True Negative |
| **TP** | True Positive |
| **UI / UX** | User Interface / User Experience |
| **UUID** | Universally Unique Identifier |
| **VPC** | Virtual Private Cloud |

---

# CHAPTER 1: INTRODUCTION

## 1.1 GENERAL
In modern metropolitan economies, the rapid pace of urbanization, dual-income households, and dense residential infrastructure have created an unprecedented reliance on on-demand home maintenance and repair services. Routine domestic operations frequently require specialized technical interventions spanning electrical diagnostics, plumbing repairs, carpentry, HVAC servicing, masonry, and consumer appliance troubleshooting. Historically, urban residents secured these domestic services through informal word-of-mouth networks, fragmented local trade directories, or roadside contractor hubs. However, these traditional mechanisms suffer from pervasive structural deficiencies: consumers endure unpredictable pricing, lack transparent quality guarantees, face substantial delays in securing qualified labor during emergencies, and have no institutional mechanisms for background verification or dispute resolution. Conversely, independent blue-collar service professionals operate in highly precarious economic conditions, characterized by severe revenue volatility, restricted geographic discovery, and extortionate intermediary commissions.

The emergence of digital on-demand labor platforms over the past decade sought to formalize this ecosystem through centralized booking platforms. However, existing market offerings exhibit critical architectural and economic bottlenecks. Dominant corporate aggregators operate as centralized rent-seeking intermediaries, extracting between $20\%$ to $35\%$ of technician billings while imposing rigid dispatch quotas. Furthermore, existing platforms often exhibit opaque algorithmic dispatch, wherein work assignments are dictated by black-box metrics rather than transparent spatial proximity, professional competency, and verified historical completion rates. When domestic emergencies arise—such as an active pipe rupture or an electrical short-circuit—conventional manual browsing mechanisms force distressed homeowners through multi-step scheduling workflows, resulting in dispatch delays ranging from hours to days.

In parallel, the operational realities of peer-to-peer service marketplaces introduce acute architectural challenges in cloud engineering. A critical vulnerability in decentralized marketplaces is *platform disintermediation*, wherein customers and service providers exchange personal telephone numbers or email addresses through messaging interfaces to bypass platform fees for subsequent jobs. This practice not only destabilizes platform revenue but also strips consumers of insurance coverage and background-check safeguards. Additionally, high-contention dispatch models are prone to severe concurrency race conditions: when an urgent service job is broadcast to nearby technicians, simultaneous acceptance requests frequently cause double bookings or database deadlocks unless guarded by strict atomic transaction primitives.

To overcome these systemic challenges, **Connect360** is conceptualized and implemented as an enterprise-grade, serverless on-demand home services platform. Connect360 integrates multi-criteria worker ranking, atomic concurrency-safe dispatch, conversational AI triage with deterministic PII filtering, hybrid spatial routing, and privacy-preserving virtual telephony into a unified, ultra-low-latency architecture.

## 1.2 OBJECTIVE
The primary objective of this project is to architect, build, and empirically benchmark an enterprise-grade, transparent, and privacy-preserving hyperlocal service marketplace. Specifically, Connect360 aims to:
- **Formulate an $O(N)$ Multi-Criteria Matching Engine:** Develop an ultra-low-latency scoring algorithm that dynamically evaluates candidate service professionals across spatial distance, verified ratings, experience tier, and historical completion rates, supporting both standard browsing and rapid-dispatch configurations.
- **Eliminate Concurrency Race Conditions via Serverless Atomic Commits:** Design an optimistic concurrency control protocol utilizing Amazon DynamoDB conditional expressions to guarantee zero double bookings ($0\%$ conflict rate) during high-contention Priority Booking broadcasts.
- **Implement an Air-Gapped Multi-Tier AI Safety Architecture:** Build a conversational AI assistant capable of natural language service triage and slot filling, fortified by a deterministic post-generation regular expression barrier that intercepts contact channels (phone numbers and emails) to prevent platform disintermediation without degrading operational tokens (prices and postal codes).
- **Establish a Hybrid Spatial Routing Framework:** Resolve the computational trade-off between straight-line Euclidean distance and physical road networks by utilizing millisecond-scale Haversine calculations for candidate pool ranking while reserving full Open Source Routing Machine (OSRM) road polylines for live client-side dispatch navigation.
- **Preserve Telephony Privacy via Virtual Number Masking:** Integrate E.164-compliant phone normalization and virtual bridge session generation to ensure that customers and service partners communicate through ephemeral, masked channels without exposing private phone numbers.
- **Conduct Rigorous Empirical Benchmarking:** Evaluate the production implementation across latency, correlation, concurrency, spatial disparity, redaction precision/recall, and schema conformity using high-resolution hardware timers, generating reproducible research-grade datasets.

## 1.3 EXISTING SYSTEM
Conventional on-demand home services platforms and traditional dispatch mechanisms are characterized by several structural, architectural, and operational limitations:
- **Centralized and Opaque Dispatch Heuristics:** Existing platforms (e.g., Urban Company, TaskRabbit, Angie's List) employ proprietary, centralized dispatch algorithms that prioritize platform margin optimization over geographic proximity or fair worker distribution. Independent service partners have no visibility into ranking criteria, leading to algorithmic disenfranchisement.
- **Vulnerability to Concurrency Race Conditions:** In conventional relational database implementations using row-level locking or optimistic timestamps without strict conditional atomic updates, high-contention broadcasts frequently suffer from race conditions. When multiple service technicians tap "Accept" on a high-value emergency booking within milliseconds, systems either experience database deadlocks, sluggish response times, or catastrophic double bookings.
- **Severe Platform Disintermediation & Unsanitized Chat Interfaces:** Most modern service platforms incorporate chat interfaces powered by standard rule-based bots or large language models. However, these systems lack air-gapped deterministic output sanitization. Users easily circumvent platform fees by sharing obfuscated phone numbers or email addresses, exposing the platform to massive revenue leakage and exposing users to unvetted safety risks.
- **Computational Inefficiencies in Spatial Routing:** Conventional systems either rely naively on straight-line Euclidean distance (ignoring urban topological barriers such as rivers, railway lines, and restricted highways) or incur massive computational and financial overhead by invoking paid commercial mapping APIs (e.g., Google Maps Distance Matrix) for every candidate in a large worker pool.
- **Direct Telephony Exposure:** In many localized trade directories and marketplace apps, customer and technician phone numbers are exposed directly in plain text, leading to unwanted marketing calls, harassment, and off-platform cash transactions.

## 1.4 PROPOSED SYSTEM
The proposed **Connect360** architecture directly resolves the limitations of existing systems through a modular, serverless cloud implementation. The core innovations of Connect360 include:
- **Dual-Mode Linear Ranking Engine:** Defined in `Candidate Matching Engine`, the algorithm executes in strict $O(N)$ time. In *Normal Booking*, candidate workers are ranked with heavy emphasis on reputation ($40\%$ rating, $35\%$ distance). In *Priority Booking*, the weights dynamically shift toward spatial immediacy ($50\%$ distance, $20\%$ rating), ensuring that urgent crises are assigned to the closest verified professional.
- **Transactional Concurrency Lock:** Implemented in `Priority Dispatch Handler`, the system leverages Amazon DynamoDB's native conditional writes (`attribute_exists(booking_id) AND #s = :pending`). When a job is accepted, the winning technician's commit succeeds atomically, while all concurrent attempts immediately fail with `ConditionalCheckFailedException` (HTTP 409 Conflict) in under $0.05\text{ ms}$, mathematically guaranteeing zero double bookings.
- **Multi-Tier AI Safety & Defensive Redaction:** Defined in `Conversational AI Assistant Module` and `Assistant Knowledge Base`, Connect360 combines system prompt behavioral bounds with upstream context isolation and a deterministic post-generation regex filter (`deterministic contact redaction filter`). The filter intercepts standard, prefixed, and international phone numbers and email addresses ($99.20\%$ recall) while preserving domestic service prices, technical dimensions, and 6-digit postal PIN codes.
- **Hybrid Spatial Routing Engine:** Connect360 implements a dual spatial strategy. Candidate ranking executes in sub-millisecond time ($0.03\text{ ms}$) via in-memory Haversine calculations. Once dispatched, the client-side routing service (`Client Spatial Routing Service`) asynchronously queries a high-performance Open Source Routing Machine (OSRM) engine to render accurate road network polylines and physical ETAs, accommodating urban road tortuosity (tortuosity factor $	au = 1.285$).
- **E.164 Telephony Virtual Bridging:** Supported by `Virtual Telephony Module`, phone numbers are standardized to international E.164 format and connected via ephemeral masked bridge sessions, completely shielding personal contact details from both parties.

---

# CHAPTER 2: LITERATURE SURVEY

## 2.1 LITERATURE REVIEW
The development of Connect360 synthesizes foundational research across dynamic bipartite matching, serverless transaction concurrency, spatial road network modeling, and conversational AI safety.

**1. Dynamic Bipartite Matching and On-Demand Dispatch:**  
Agatz et al. (2012) established foundational optimization models for dynamic ride-sharing and on-demand dispatch, demonstrating that greedy nearest-neighbor heuristics often lead to spatial sub-optimality compared to batch matching. Bertsimas et al. (2019) expanded this framework to high-frequency urban platforms, proving that linear multi-criteria objective functions combining spatial distance, worker reliability, and historical fulfillment achieve near-optimal customer satisfaction while maintaining polynomial-time tractability. Connect360 builds upon these insights by implementing an explicit $O(N)$ multi-criteria scoring algorithm that dynamically adjusts weight vectors between standard quality-centric browsing and emergency proximity-centric dispatch.

**2. Transactional Concurrency in Distributed NoSQL Systems:**  
DeCandia et al. (2007) introduced Amazon Dynamo, highlighting the trade-offs between high availability, eventual consistency, and transactional guarantees in distributed datastores. Sivasubramanian (2012) detailed the evolution of Amazon DynamoDB, emphasizing single-digit millisecond performance at scale through partitioned hash-key indexing. Bailis et al. (2014) analyzed highly available transactions, demonstrating that conditional state transitions (such as compare-and-swap) provide linearizable safety guarantees for individual entity records without requiring distributed lock managers. Connect360 applies these principles by using DynamoDB conditional write expressions to achieve atomic worker assignment during concurrent priority booking broadcasts.

**3. Spatial Routing, Road Network Topology, and Tortuosity:**  
Luxen and Vetter (2011) designed the Open Source Routing Machine (OSRM), demonstrating that contraction hierarchies enable millisecond-level shortest-path queries across continental road networks. Barthélemy (2011) provided rigorous mathematical formulations of spatial network tortuosity, defined as the ratio of physical network distance to Euclidean distance ($\tau = D_{\text{network}} / D_{\text{Euclidean}}$), showing that dense urban street grids exhibit characteristic tortuosity factors ranging between $1.2$ and $1.4$. Connect360 validates this topological phenomenon empirically across Chennai's road network, confirming that Haversine distance underestimates physical travel by $28.5\%$ and establishing a hybrid architecture that balances computational speed with routing fidelity.

**4. Conversational AI Safety and Defensive PII Redaction:**  
Weidinger et al. (2021) surveyed ethical and social risks associated with large language models, identifying unintended memorization and private data leakage as primary safety vulnerabilities. Carlini et al. (2021) demonstrated that neural language models can be prompted to extract training PII and reflect user-supplied sensitive data. Lison et al. (2021) analyzed named entity recognition (NER) for privacy-preserving text sanitization, noting that while deep learning models achieve high semantic recall, deterministic regular expression post-processors offer crucial guarantees of sub-millisecond execution latency and zero catastrophic forgetting. Connect360 operationalizes a defense-in-depth framework combining prompt-level boundaries with an air-gapped regular expression post-processor.

## 2.2 COMPARISON AND DISCUSSION
Table 2.1 presents a structured comparative analysis benchmarking Connect360 against existing commercial and academic service marketplace systems.

**Table 2.1: Comparative Evaluation of Service Marketplace Architectures**
- **Urban Company:** Centralized black-box dispatch, batch intervals (2–15 mins), centralized queue, commercial map APIs, static decision tree bot, delayed chat moderation, virtual number bridge.
- **TaskRabbit:** Manual profile browsing, asynchronous dispatch (hours), calendar reservation, static postal code radius, basic keyword search, keyword filtering, direct phone sharing.
- **Traditional Relational Dispatch:** Nearest available SQL query, relational lock contention (50–500 ms), row-level locking, Euclidean distance only, keyword search, no PII redaction, direct phone sharing.
- **Connect360 (Proposed):** Transparent dual-mode $O(N)$ multi-criteria ranking, sub-4 ms dispatch latency, DynamoDB conditional atomic writes ($0\%$ double bookings), hybrid spatial routing (Haversine $0.03\text{ ms}$ + OSRM), LLM triage with strict JSON schema conformity, air-gapped regex post-filter ($99.20\%$ recall, $1.92\ \mu\text{s}$), and E.164 normalization with ephemeral masked bridging.

## 2.3 CONCLUSION
The literature survey and comparative analysis reveal that while individual components—such as bipartite matching, distributed databases, spatial routing engines, and language models—have matured independently, existing commercial systems fail to integrate them into a cohesive, low-latency, and privacy-preserving architecture. Connect360 bridges this gap by demonstrating that a serverless architecture combining DynamoDB conditional writes, dual-mode multi-criteria ranking, hybrid spatial routing, and air-gapped regex filtering can deliver an ultra-responsive, secure, and equitable marketplace ecosystem.

---

# CHAPTER 3: SYSTEM DESIGN

## 3.1 SYSTEM ARCHITECTURE
Connect360 is engineered as a decoupled, cloud-native three-tier architecture comprising:
1. **Client Tier (React 18 SPA):** Customer Portal, Worker Dashboard, Admin Management, and client-side routing/auth services.
2. **Serverless Compute Tier (AWS Lambda & API Gateway):** `connect360-bookings`, `connect360-workers`, `connect360-assistant`, `connect360-auth`, and `Virtual Telephony Subsystem`.
3. **Data and External Services Tier:** Amazon DynamoDB (single-table schema with GSI1 and GSI2), Amazon Cognito User Pools, OSRM routing engine, foundation LLM providers, and Twilio/Exotel virtual telephony bridges.

*(Refer to Figure 3.1 in the HTML/PDF report for the complete architecture diagram).*

## 3.2 SYSTEM REQUIREMENTS
- **Software Requirements:** React 18.3+, Vite 5.0+, Node.js 20.x, Python 3.12/3.13, AWS Lambda, Amazon API Gateway, Amazon DynamoDB, Amazon Cognito, OSRM Engine, Gemini 1.5 Flash, Twilio/Exotel.
- **Hardware Requirements:** Client: 1.5 GHz Dual-Core processor, 2 GB RAM (mobile) / 4 GB (desktop). Serverless compute: AWS Lambda 256–512 MB per function.
- **Database Requirements:** Amazon DynamoDB Single-Table Schema with composite primary keys (`PK`, `SK`) and two GSIs (`GSI1` for service types and `GSI2` for Cognito user mappings).
- **Deployment and Scaling:** AWS SAM deployment, CloudFront CDN edge distribution, auto-scaling on-demand capacity.

## 3.3 SYSTEM DESIGN DIAGRAMS
- **Use Case Diagram (Figure 3.2):** Details interactions of Customer and Service Partner across authentication, priority booking, atomic job acceptance, live route tracking, AI chat, and masked calling.
- **Activity Diagram (Figure 3.3):** Illustrates the priority booking workflow, from customer initiation, $O(N)$ candidate ranking, pending booking broadcast, conditional check evaluation, to live route tracking.
- **Data Flow Diagrams (Figure 3.4 Level 0 & Figure 3.5 Level 1):** Detail data flows between external entities, core marketplace processes, and DynamoDB data stores.
- **Sequence Diagram (Figure 3.6):** Depicts the message interchange sequence during concurrent priority booking acceptance, illustrating atomic commit for winning worker W1 and conflict abort (HTTP 409) for concurrent worker W2.

---

# CHAPTER 4: PROJECT DESCRIPTION

## 4.1 METHODOLOGIES
Connect360 incorporates stateless serverless compute, single-table NoSQL modeling, multi-attribute utility theory for score weighting, and a defense-in-depth safety paradigm for conversational AI.

## 4.2 MODULES
- **Module 1: Authentication and RBAC Control:** Manages Cognito JWT validation, claim extraction, and role enforcement (`customer`, `worker`, `admin`).
- **Module 2: Worker Profile & Geospatial Registration:** Manages technician registration, service categories, hourly rates, verification credentials, coordinates, and availability states.
- **Module 3: Intelligent Matching Engine:** Computes composite worker scores $S = w_d \cdot S_{\text{dist}} + w_r \cdot S_{\text{rating}} + w_e \cdot S_{\text{exp}} + w_c \cdot S_{\text{comp}}$ in $O(N)$ linear time.
- **Module 4: Transactional Priority Dispatch:** Manages the priority booking lifecycle, enforcing DynamoDB conditional writes to guarantee zero double bookings.
- **Module 5: Hybrid Spatial Routing & Live Tracking:** Employs in-memory Haversine distance for millisecond candidate ranking and OSRM road polylines for live dispatch navigation.
- **Module 6: Conversational AI Assistant & PII Defense:** Provides multilingual triage with strict JSON schema compliance and air-gapped regex redaction (`deterministic contact redaction filter`).
- **Module 7: Privacy-Preserving Virtual Telephony:** Formats phone numbers to international E.164 standard and bridges calls via ephemeral masked sessions.

---

# CHAPTER 5: IMPLEMENTATION AND RESULT DISCUSSION

## 5.1 IMPLEMENTATION RESULTS
The Connect360 platform was implemented and deployed in a serverless testbed. The system incorporates over 3,000 lines of Python backend microservices and a responsive React 18 frontend.

## 5.2 EVALUATION AND PERFORMANCE ANALYSIS

### 5.2.1 Metric 1: Matching Algorithm Execution Latency vs. Candidate Pool Size
- **Tested Implementation:** `Candidate Matching Engine` -> `candidate ranking algorithm`.
- **Parameters:** Candidate pool sizes $N \in [10, 5000]$, 1,000 iterations per size, Normal vs. Priority weights (16,000 runs total).
- **Key Results:** Linear $O(N)$ scalability. Mean latency ranges from $0.007\text{ ms}$ ($N=10$) to $3.894\text{ ms}$ ($N=5000$). For typical urban pools ($N=500$), latency is just $0.384\text{ ms}$ ($P99 = 0.741\text{ ms}$).
- *(Refer to Table 5.1 and Figure 5.1).*

### 5.2.2 Metric 2: Matching Engine Rank Sensitivity and Inversion Analysis
- **Tested Implementation:** `Candidate Matching Engine` -> `calculate_final_score()`.
- **Parameters:** Fixed pool of $N = 100$ workers across near, mid, and far distance tiers.
- **Key Results:** Spearman correlation $\rho = 0.836$, Kendall $\tau = 0.650$. Weight reallocation promotes $66.7\%$ of near workers (mean shift $+6.47$ ranks) and demotes $70.0\%$ of far workers (mean shift $-6.67$ ranks).
- *(Refer to Table 5.2 and Figure 5.2).*

### 5.2.3 Metric 3: Transactional Concurrency and Race Condition Prevention
- **Tested Implementation:** `Priority Dispatch Handler` -> `worker_accept_priority()`.
- **Parameters:** Contention levels $C \in [1, 100]$ concurrent threads, 50 trials per level (9,400 total requests).
- **Key Results:** Exactly 1 winner per trial across all contention levels. **Zero double bookings ($0/9400$)**. Conflict aborts execute in $0.024\text{--}0.052\text{ ms}$, enabling immediate worker recovery.
- *(Refer to Table 5.3 and Figure 5.3).*

### 5.2.4 Metric 4: Road Distance vs. Haversine Disparity (Tortuosity Factor)
- **Tested Implementation:** `Client Spatial Routing Service` (OSRM) and `Candidate Matching Engine` (Haversine).
- **Parameters:** 50 real metropolitan route waypoints in Chennai.
- **Key Results:** Mean road tortuosity $\tau = 1.285$ ($28.5\%$ longer road distance than Euclidean; $+3.41\text{ km}$ disparity). Haversine evaluates in $0.03\text{ ms}$ vs. OSRM in $1036.9\text{ ms}$, validating Connect360's hybrid spatial architecture.
- *(Refer to Table 5.4 and Figure 5.4).*

### 5.2.5 Metric 5: AI Assistant Safety & Contact Redaction Efficacy (PII Defense)
- **Tested Implementation:** `Conversational AI Assistant Module` -> `deterministic contact redaction filter`.
- **Parameters:** Balanced corpus of 500 test cases across 10 categories (250 PII vs. 250 Benign), 50,000 timing iterations.
- **Key Results:** $99.20\%$ Detection Recall ($248/250$ PII caught), $90.84\%$ Precision, $94.60\%$ Accuracy, $1.92\ \mu\text{s}$ latency. $100\%$ preservation of service prices and 6-digit postal PIN codes.
- *(Refer to Table 5.5 and Figure 5.5).*

### 5.2.6 Metric 6: Structured Output JSON Schema Conformity & Urgency Classification
- **Tested Implementation:** `AI Provider Interface Subsystem` (parser) and `Conversational AI Assistant Module` (dispatch).
- **Parameters:** 500 benchmark cases across 5 functional dimensions, 50,000 timing iterations.
- **Key Results:** $100.0\%$ Schema Conformity, $100.0\%$ Format Resilience (raw JSON, markdown fences, plain text), $100.0\%$ Precision and Recall on emergency detection ($F_1 = 1.000$), $100\%$ confirmation invariant enforcement, $5.97\ \mu\text{s}$ latency.
- *(Refer to Table 5.6 and Figure 5.6).*

---

# CHAPTER 6: CONCLUSION AND FUTURE WORK

## 6.1 CONCLUSION
Connect360 successfully resolves the critical latency, concurrency, privacy, and dispatch challenges of on-demand home service marketplaces. The empirical results confirm:
1. $O(N)$ candidate ranking latency ($3.89\text{ ms}$ for 5,000 workers).
2. Dynamic rank inversion favoring proximate workers during emergencies ($66.7\%$ promoted).
3. Zero double bookings ($0/9400$) via DynamoDB conditional writes with microsecond conflict aborts.
4. Validation of hybrid spatial routing accommodating urban road tortuosity (tortuosity factor $	au = 1.285$).
5. Sub-microsecond PII defense ($99.20\%$ recall, $1.92\ \mu\text{s}$) preserving domestic operational tokens.
6. Flawless structured JSON schema conformity ($100\%$) and emergency urgency detection ($F_1 = 1.000$).

## 6.2 FUTURE WORK
Phase-II will focus on:
- Machine learning dynamic weight calibration based on real-time traffic and elasticity.
- VPC-hosted private OSRM cluster deployment, reducing road routing latency to under $20\text{ ms}$.
- Multi-tier urgency classification (Low, Medium, High, Critical).
- In-app WebRTC audio calling.
- Completing Metrics 7 through 10.

---

# REFERENCES

1. N. Agatz, A. Erera, M. Savelsbergh, and X. Wang, "Optimization for dynamic ride-sharing: A review," *European Journal of Operational Research*, vol. 223, no. 2, pp. 295–303, 2012.
2. D. Bertsimas, P. Jaillet, and S. Martin, "Online vehicle routing: The value of future information," *Operations Research*, vol. 67, no. 2, pp. 434–451, 2019.
3. G. DeCandia, D. Hastorun, M. Jampani, G. Kakulapati, A. Lakshman, A. Pilchin, S. Sivasubramanian, P. Vosshall, and W. Vogels, "Dynamo: Amazon's highly available key-value store," in *Proc. 21st ACM SIGOPS Symposium on Operating Systems Principles (SOSP)*, 2007, pp. 205–220.
4. S. Sivasubramanian, "Amazon DynamoDB: A seamless, scalable, cloud database service," in *Proc. ACM SIGMOD International Conference on Management of Data*, 2012, pp. 729–730.
5. P. Bailis, A. Davidson, A. Fekete, A. Ghodsi, J. M. Hellerstein, and I. Stoica, "Highly available transactions: Virtues and limitations," in *Proc. VLDB Endowment*, vol. 7, no. 3, pp. 181–192, 2014.
6. D. Luxen and C. Vetter, "Real-time routing with OpenStreetMap data," in *Proc. 19th ACM SIGSPATIAL International Conference on Advances in Geographic Information Systems*, 2011, pp. 513–516.
7. M. Barthélemy, "Spatial networks," *Physics Reports*, vol. 499, no. 1–3, pp. 1–101, 2011.
8. L. Weidinger, J. Mellor, M. Rauh, C. Griffin, J. Uesato, P. Huang, M. Cheng, M. Glaese, B. Balle, A. Kasirzadeh, and Z. Kenton, "Ethical and social risks of harm from Language Models," *arXiv preprint arXiv:2112.04359*, 2021.
9. N. Carlini, F. Tramer, E. Wallace, M. Jagielski, I. Herbert, M. Lee, A. Roberts, T. Brown, D. Song, U. Erlingsson, and A. Oprea, "Extracting training data from large language models," in *Proc. 30th USENIX Security Symposium*, 2021, pp. 2633–2650.
10. P. Lison, I. Pilán, D. Sánchez, M. Batet, and L. Øvrelid, "Anonymisation models for text data: State of the art, challenges and future directions," in *Proc. 59th Annual Meeting of the Association for Computational Linguistics (ACL)*, 2021, pp. 4188–4203.
11. J. Dean and S. Ghemawat, "MapReduce: Simplified data processing on large clusters," *Communications of the ACM*, vol. 51, no. 1, pp. 107–113, 2008.
12. M. Armbrust, A. Fox, R. Griffith, A. D. Joseph, R. Katz, A. Konwinski, G. Lee, D. Patterson, A. Rabkin, I. Stoica, and M. Zaharia, "A view of cloud computing," *Communications of the ACM*, vol. 53, no. 4, pp. 50–58, 2010.
