# Metric 4 Evaluation Summary: Road Distance vs. Haversine Disparity (Tortuosity Factor) & Spatial Routing Performance

## 1. Objective
Metric 4 evaluates the spatial accuracy, geometric disparity, and execution latency trade-offs between straight-line (Haversine) distance calculations and actual turn-by-turn road network routing (Open Source Routing Machine - OSRM) implemented in Connect360.

**Relevance to Connect360:**  
In an on-demand home services marketplace, spatial dispatch and real-time worker tracking are critical operational features:
1. **Dispatch Accuracy:** The matching engine (`matching_service.py`) uses geographic distance to score worker proximity. If Euclidean/Haversine distance underestimates actual travel distance due to road detours, rivers, or one-way street grids, worker arrival times and dispatch rankings become distorted.
2. **Real-Time Tracking & ETA:** During active jobs (`in_progress`), the customer tracking view (`LiveTrackingMap.jsx` and `routingService.js`) fetches real road geometry and travel duration to render live vehicle routes.
3. **Latency vs. Accuracy Trade-Off:** While in-memory Haversine distance is instantaneous ($<0.05\text{ ms}$), external road routing introduces network latency ($500\text{--}1500\text{ ms}$). This experiment quantifies the exact empirical divergence (**Tortuosity Index** $\tau = \frac{D_{\text{OSRM}}}{D_{\text{Haversine}}}$) to evaluate whether Haversine approximation is justifiable during initial candidate ranking.

---

## 2. Implementation Tested
- **Frontend Routing Service:** [`frontend/src/services/routingService.js`](file:///C:/Users/rsdha/.gemini/antigravity/scratch/Connect360/frontend/src/services/routingService.js)
  - `getRoadRoute(originLat, originLng, destLat, destLng)`: Queries OSRM driving profile (`/route/v1/driving/`).
  - `haversineDistance(lat1, lon1, lat2, lon2)`: In-memory spherical trigonometry distance calculation ($R = 6371\text{ km}$).
- **Backend Matching Distance Scorer:** [`backend/shared/matching_service.py`](file:///C:/Users/rsdha/.gemini/antigravity/scratch/Connect360/backend/shared/matching_service.py)
  - `calculate_distance_score(worker, request)`: Piecewise linear decay scoring from $2\text{ km}$ ($1.0$) to $25\text{ km}$ ($0.0$).

---

## 3. Experimental Setup
- **Spatial Dataset:**  
  $N = 50$ real geographic waypoints across the Chennai metropolitan area, representing customer-to-worker dispatch corridors spanning four urban density zones:
  - **Inner Urban Core ($< 6\text{ km}$):** 11 routes (e.g., Egmore, Royapettah, Nungambakkam, Mylapore, T. Nagar).
  - **Mid-City Commercial Corridors ($6\text{--}12\text{ km}$):** 16 routes (e.g., Vadapalani, Saidapet, Adyar, Besant Nagar, Koyambedu).
  - **Suburban Radial Corridors ($12\text{--}20\text{ km}$):** 13 routes (e.g., Velachery, Porur, Ambattur, Chromepet, Thoraipakkam OMR).
  - **Peripheral / Satellite Hubs ($> 20\text{ km}$):** 10 routes (e.g., Tambaram, Sholinganallur, Siruseri, Vandalur, Sriperumbudur).
- **Measurement Methodology:**  
  - For each waypoint, both straight-line Haversine distance ($D_{\text{Hav}}$) and real OSRM road distance ($D_{\text{OSRM}}$) were computed to the central service hub ($13.0827, 80.2707$).
  - High-resolution timing was measured using `time.perf_counter_ns()`.
  - The impact on matching score was evaluated by computing the difference between distance scores under Haversine vs. OSRM: $\Delta \text{Score} = |\text{Score}_{\text{OSRM}} - \text{Score}_{\text{Hav}}|$.

---

## 4. Metrics Collected
- **Straight-Line Haversine Distance ($D_{\text{Hav}}$, $km$)**
- **Actual OSRM Road Distance ($D_{\text{OSRM}}$, $km$)**
- **Tortuosity Index ($\tau = \frac{D_{\text{OSRM}}}{D_{\text{Hav}}}$)**
- **Absolute Distance Disparity ($\Delta D = D_{\text{OSRM}} - D_{\text{Hav}}$, $km$)**
- **Spatial Distance Score Distortion ($\Delta \text{Score} \in [0.0, 1.0]$)**
- **Haversine Execution Latency ($ms$)**
- **OSRM API Round-Trip Latency ($ms$)**

---

## 5. Actual Results

The values below are the exact experimental measurements recorded in [`metric4_summary_routing.csv`](file:///C:/Users/rsdha/.gemini/antigravity/scratch/Connect360/evaluation/metric4_spatial_routing/metric4_summary_routing.csv):

| Urban Density Tier | Route Count | Mean Haversine ($km$) | Mean OSRM Road ($km$) | Mean Tortuosity ($\tau$) | Max Tortuosity ($\tau$) | Min Tortuosity ($\tau$) | Mean Distance Disparity ($km$) | Mean Score Distortion ($\Delta \text{Score}$) | Mean OSRM Latency ($ms$) | Mean Haversine Latency ($ms$) |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Overall** | 50 | 13.34 | 16.75 | **1.2848** | **1.6230** | 1.0753 | **+3.41** | **0.1020** | 1036.94 | 0.0296 |
| **Inner Urban ($< 6\text{ km}$)** | 11 | 4.15 | 5.68 | **1.3651** | 1.6230 | 1.1595 | +1.54 | 0.0651 | 957.16 | 0.0304 |
| **Mid-City ($6\text{--}12\text{ km}$)** | 16 | 8.41 | 10.85 | **1.2835** | 1.4887 | 1.1696 | +2.44 | 0.1059 | 1342.03 | 0.0273 |
| **Suburban ($12\text{--}20\text{ km}$)** | 13 | 15.94 | 19.82 | **1.2470** | 1.3710 | 1.0993 | +3.88 | 0.1655 | 853.86 | 0.0364 |
| **Peripheral ($> 20\text{ km}$)** | 10 | 27.96 | 34.40 | **1.2474** | 1.4867 | 1.0753 | +6.44 | 0.0537 | 874.58 | 0.0234 |

---

## 6. Figure Explanation
- **Figure File:** [`metric4_road_vs_haversine_disparity.png`](file:///C:/Users/rsdha/.gemini/antigravity/scratch/Connect360/evaluation/metric4_spatial_routing/metric4_road_vs_haversine_disparity.png)
- **Left Subplot (Road Distance vs. Haversine Distance):**
  - **X-Axis:** Straight-Line Haversine Distance ($D_{\text{Hav}}$ in $km$).
  - **Y-Axis:** Actual OSRM Road Distance ($D_{\text{OSRM}}$ in $km$).
  - **Grey Dashed Line ($y=x$):** Euclidean Ideal ($\tau = 1.0$). Points lying above this line indicate detours imposed by the physical road network.
  - **Red Solid Line:** Empirical linear fit ($D_{\text{OSRM}} \approx 1.17 \times D_{\text{Hav}}$).
  - **Color Gradient (Colorbar):** Continuous heatmap of the Tortuosity Index $\tau$ (from light yellow $\tau \approx 1.1$ to dark red $\tau \ge 1.6$).
  - **Annotated Exemplar:** Royapettah ($\tau = 1.623$, $D_{\text{Hav}} = 3.33\text{ km} \to D_{\text{OSRM}} = 5.41\text{ km}$, a $+2.08\text{ km}$ road penalty).
- **Right Subplot (Distribution of Empirical Tortuosity Index):**
  - **X-Axis:** Tortuosity Ratio ($\tau = D_{\text{OSRM}} / D_{\text{Hav}}$).
  - **Y-Axis:** Route Frequency (Count of waypoints in each bin).
  - **Red Solid Line:** Mean Tortuosity ($\tau = 1.285$).
  - **Green Dashed Line:** Median Tortuosity ($\tau = 1.272$).
  - **Inset Summary Box:** Recaps sample size ($50$), mean disparity ($+3.4\text{ km}$), latency comparison ($1036.9\text{ ms}$ vs. $<0.05\text{ ms}$).

---

## 7. Observed Trends
1. **Consistent Road Network Expansion ($\tau = 1.285$):**  
   Across all 50 real metropolitan routes, road network distance is on average **$28.5\%$ longer** than straight-line distance, with an overall mean disparity of **$+3.41\text{ km}$**.
2. **Higher Tortuosity in Dense Urban Cores:**  
   The highest tortuosity occurs in the **Inner Urban Core ($< 6\text{ km}$)**, where mean $\tau$ reaches **$1.3651$** (scaling up to **$1.6230$** in congested sectors like Royapettah). This is caused by dense urban barriers, one-way street grids, and railway/canal crossings that force circuitous vehicle travel.
3. **Suburban Spatial Distortion Peak:**  
   The highest distance score distortion ($\Delta \text{Score} = 0.1655$ out of $1.0$) occurs in the **Suburban zone ($12\text{--}20\text{ km}$)**, where straight-line distance averages $15.94\text{ km}$ while road distance averages $19.82\text{ km}$ ($+3.88\text{ km}$ disparity). In this zone, workers close to the $25\text{ km}$ zero-score boundary are severely mis-scored if straight-line distance is used.
4. **Latency Trade-Off ($~35,000\times$ Difference):**  
   - In-memory Haversine calculation executes in **$0.0296\text{ ms}$** ($<0.05\text{ ms}$).
   - OSRM HTTP API routing requires a mean of **$1036.94\text{ ms}$** ($~1.04\text{ s}$).
   - This proves that querying an external road router for hundreds of candidate workers during initial ranking is computationally infeasible within interactive API budgets (<100 ms).

---

## 8. Discussion
The empirical findings justify Connect360's **two-tier spatial architecture**:
1. **Tier 1 (Candidate Ranking in Lambda):** The matching engine uses in-memory Haversine distance. While Haversine underestimates travel distance by an average factor of $\tau = 1.285$, its sub-millisecond execution allows ranking 1,000 workers in $<30\text{ ms}$ (Metric 1).
2. **Tier 2 (Post-Match Tracking & Navigation in Frontend):** Once a booking is confirmed and transitions to `in_progress`, the system invokes OSRM via `routingService.js` to render exact turn-by-turn road geometry and accurate driving ETAs on `LiveTrackingMap.jsx`.

---

## 9. Limitations
- **Public OSRM Demo Server:** OSRM latency ($1036.9\text{ ms}$) reflects public demo server response times over public internet; a self-hosted OSRM instance deployed in the same AWS VPC would reduce latency to approximately 10–30 ms.
- **Geographic Scope:** Evaluated across the Chennai metropolitan area. Cities with distinct topological barriers (e.g., river peninsulas or mountainous terrain) may exhibit higher average tortuosity ($\tau > 1.4$).

---

## 10. Research-Paper-Ready Paragraph
> Figure 4 evaluates the spatial disparity and computational trade-offs between straight-line (Haversine) distance and physical road network routing (OSRM) across 50 representative dispatch routes in the Chennai metropolitan area. The empirical results reveal a mean tortuosity index of $\tau = 1.285$ (median $\tau = 1.272$, maximum $\tau = 1.623$), indicating that actual driving distances are on average $28.5\%$ longer than Euclidean estimates, with an average distance underestimation of $+3.41\text{ km}$. Tortuosity is highest in the inner urban core ($< 6\text{ km}$, mean $\tau = 1.365$), driven by dense grid constraints and infrastructure crossings. In suburban corridors ($12\text{--}20\text{ km}$), road distance disparities average $+3.88\text{ km}$, introducing an average distance score distortion of $0.1655$ on a normalized $[0, 1]$ scale. However, execution latency measurements reveal that while in-memory Haversine distance evaluates in $0.03\text{ ms}$, external OSRM route resolution requires a mean of $1036.9\text{ ms}$. These findings validate Connect360's hybrid spatial architecture: utilizing lightweight Haversine distance for millisecond-scale candidate ranking in serverless compute, while reserving full OSRM road geometry for the post-dispatch live tracking interface.

---

## 11. Figure Caption
> **Figure 4.** Spatial routing evaluation comparing straight-line Haversine distance ($D_{\text{Hav}}$) to actual OSRM road network distance ($D_{\text{OSRM}}$) across 50 metropolitan routes, showing (left) road distance expansion against the Euclidean baseline ($y=x$) with linear regression fit, and (right) the empirical distribution of the tortuosity index ($\tau = D_{\text{OSRM}} / D_{\text{Hav}}$).

---

## 12. Generated Artifacts
- **Benchmark Script:** [`evaluation/metric4_spatial_routing/benchmark_metric4.py`](file:///C:/Users/rsdha/.gemini/antigravity/scratch/Connect360/evaluation/metric4_spatial_routing/benchmark_metric4.py)
- **Raw Measurements CSV:** [`evaluation/metric4_spatial_routing/metric4_raw_routing_disparity.csv`](file:///C:/Users/rsdha/.gemini/antigravity/scratch/Connect360/evaluation/metric4_spatial_routing/metric4_raw_routing_disparity.csv) (50 rows)
- **Summary Statistics CSV:** [`evaluation/metric4_spatial_routing/metric4_summary_routing.csv`](file:///C:/Users/rsdha/.gemini/antigravity/scratch/Connect360/evaluation/metric4_spatial_routing/metric4_summary_routing.csv)
- **Publication Figure:** [`evaluation/metric4_spatial_routing/metric4_road_vs_haversine_disparity.png`](file:///C:/Users/rsdha/.gemini/antigravity/scratch/Connect360/evaluation/metric4_spatial_routing/metric4_road_vs_haversine_disparity.png)
