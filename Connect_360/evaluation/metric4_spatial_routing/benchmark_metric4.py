"""
Benchmark Metric 4: Road Distance vs. Haversine Disparity & Spatial Routing Performance
Connect360 Research Paper Evaluation

Evaluates the disparity between straight-line Haversine distance and real road network distance (OSRM)
as implemented in:
  - frontend/src/services/routingService.js -> getRoadRoute(), haversineDistance()
  - backend/shared/matching_service.py -> calculate_distance_score()

Measures:
  1. Road Distance (D_OSRM) vs. Haversine Distance (D_Haversine)
  2. Tortuosity Index (tau = D_OSRM / D_Haversine)
  3. Execution latency of in-memory Haversine vs. OSRM HTTP API
  4. Spatial scoring distortion in dispatch ranking
"""

import os
import sys
import time
import json
import math
import csv
import urllib.request
import urllib.error
import numpy as np
import matplotlib.pyplot as plt

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
SHARED_DIR = os.path.join(PROJECT_ROOT, "backend", "shared")
sys.path.insert(0, SHARED_DIR)

import matching_service as ms

OUTPUT_DIR = SCRIPT_DIR
RAW_CSV_PATH = os.path.join(OUTPUT_DIR, "metric4_raw_routing_disparity.csv")
SUMMARY_CSV_PATH = os.path.join(OUTPUT_DIR, "metric4_summary_routing.csv")
GRAPH_PNG_PATH = os.path.join(OUTPUT_DIR, "metric4_road_vs_haversine_disparity.png")
ARTIFACT_DIR = r"C:\Users\rsdha\.gemini\antigravity\brain\c9bdcee0-3d64-4960-bab4-6b21a88441c4"

# -----------------------------------------------------------------------------
# Spatial Dataset: 50 Real Geographic Waypoints in the Chennai Metropolitan Area
# Centered around the Chennai service hub (13.0827, 80.2707)
# -----------------------------------------------------------------------------
DEST_LAT, DEST_LON = 13.0827, 80.2707  # Chennai Central Hub

WAYPOINTS = [
    # Inner Urban Core (0 - 6 km)
    ("Egmore", 13.0784, 80.2608),
    ("Royapettah", 13.0538, 80.2625),
    ("Nungambakkam", 13.0604, 80.2376),
    ("Kilpauk", 13.0825, 80.2415),
    ("T. Nagar", 13.0418, 80.2341),
    ("Mylapore", 13.0368, 80.2676),
    ("Alwarpet", 13.0336, 80.2505),
    ("Kodambakkam", 13.0524, 80.2223),
    ("Anna Nagar East", 13.0878, 80.2184),
    ("Chetpet", 13.0694, 80.2425),
    ("Teynampet", 13.0405, 80.2502),
    ("Gopalapuram", 13.0505, 80.2541),
    
    # Mid-City & Commercial Corridors (6 - 12 km)
    ("Anna Nagar West", 13.0850, 80.1980),
    ("Vadapalani", 13.0500, 80.2120),
    ("Ashok Nagar", 13.0350, 80.2110),
    ("Saidapet", 13.0200, 80.2230),
    ("Guindy Industrial", 13.0067, 80.2030),
    ("Adyar", 13.0012, 80.2565),
    ("Besant Nagar", 12.9982, 80.2668),
    ("Koyambedu", 13.0694, 80.1948),
    ("Villivakkam", 13.1090, 80.2070),
    ("Perambur", 13.1095, 80.2420),
    ("Madhavaram", 13.1488, 80.2314),
    ("Kolathur", 13.1240, 80.2150),
    ("Kotturpuram", 13.0180, 80.2410),

    # Suburban Corridors (12 - 20 km)
    ("Velachery", 12.9750, 80.2210),
    ("Thiruvanmiyur", 12.9830, 80.2590),
    ("Porur", 13.0380, 80.1560),
    ("Ambattur", 13.1143, 80.1548),
    ("Alandur", 12.9975, 80.2005),
    ("Meenambakkam (Airport)", 12.9941, 80.1709),
    ("Pallavaram", 12.9675, 80.1491),
    ("Chromepet", 12.9516, 80.1462),
    ("Thoraipakkam (OMR)", 12.9416, 80.2362),
    ("Perungudi", 12.9654, 80.2461),
    ("Manali", 13.1667, 80.2667),
    ("Avadi", 13.1147, 80.1000),
    ("Poonamallee", 13.0489, 80.0934),
    ("Medavakkam", 12.9186, 80.1917),
    ("Nanmangalam", 12.9300, 80.1750),

    # Outer Peripheral / Satellite Hubs (20 - 35 km)
    ("Tambaram", 12.9249, 80.1000),
    ("Sholinganallur", 12.9010, 80.2279),
    ("Navalur (OMR)", 12.8458, 80.2267),
    ("Siruseri SIPCOT", 12.8250, 80.2170),
    ("Kelambakkam", 12.7878, 80.2200),
    ("Vandalur", 12.8920, 80.0820),
    ("Guduvanchery", 12.8439, 80.0631),
    ("Red Hills", 13.1970, 80.1980),
    ("Minjur", 13.2783, 80.2617),
    ("Sriperumbudur", 12.9700, 79.9400),
]


def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Great-circle distance in km matching routingService.js and matching_service.py.
    """
    r = 6371.0  # Earth radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def query_osrm_route(lat1, lon1, lat2, lon2):
    """
    Query real road routing via OSRM matching routingService.js:
    https://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}
    """
    url = f"https://router.project-osrm.org/route/v1/driving/{lon1:.6f},{lat1:.6f};{lon2:.6f},{lat2:.6f}?overview=false"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Connect360-Research-Evaluation/1.0"}
    )
    with urllib.request.urlopen(req, timeout=12) as response:
        data = json.loads(response.read().decode("utf-8"))
        if data.get("code") == "Ok" and data.get("routes"):
            route = data["routes"][0]
            distance_km = route["distance"] / 1000.0
            duration_min = max(1.0, round(route["duration"] / 60.0, 1))
            return distance_km, duration_min
    return None, None


def calculate_distance_score_from_km(dist_km):
    """
    Direct evaluation of Connect360's distance decay formula:
    ms.DISTANCE_FULL_SCORE_KM = 2.0
    ms.DISTANCE_ZERO_SCORE_KM = 25.0
    Score = 1.0 - (d - 2) / (25 - 2), clamped to [0.0, 1.0]
    """
    if dist_km <= ms.DISTANCE_FULL_SCORE_KM:
        return 1.0
    if dist_km >= ms.DISTANCE_ZERO_SCORE_KM:
        return 0.0
    score = 1.0 - (dist_km - ms.DISTANCE_FULL_SCORE_KM) / (ms.DISTANCE_ZERO_SCORE_KM - ms.DISTANCE_FULL_SCORE_KM)
    return round(float(ms._clamp01(score)), 4)


def run_benchmark():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print("=" * 80)
    print("Connect360 Metric 4: Road Distance vs. Haversine Disparity (Tortuosity Factor)")
    print("Target Implementations:")
    print("  - frontend/src/services/routingService.js (getRoadRoute, haversineDistance)")
    print("  - backend/shared/matching_service.py (calculate_distance_score)")
    print(f"Waypoints to evaluate: {len(WAYPOINTS)} real routes across Chennai metropolitan area")
    print("=" * 80)
    
    raw_records = []
    
    for idx, (name, o_lat, o_lon) in enumerate(WAYPOINTS, start=1):
        # 1. In-memory Haversine
        t0 = time.perf_counter_ns()
        d_hav = haversine_distance(o_lat, o_lon, DEST_LAT, DEST_LON)
        t1 = time.perf_counter_ns()
        hav_latency_ms = (t1 - t0) / 1_000_000.0
        
        # 2. OSRM Road Distance
        t2 = time.perf_counter_ns()
        try:
            d_osrm, dur_min = query_osrm_route(o_lat, o_lon, DEST_LAT, DEST_LON)
            t3 = time.perf_counter_ns()
            osrm_latency_ms = (t3 - t2) / 1_000_000.0
        except Exception as e:
            print(f"  [Warning] OSRM error for {name}: {e}. Retrying after 1s...")
            time.sleep(1.0)
            t2 = time.perf_counter_ns()
            d_osrm, dur_min = query_osrm_route(o_lat, o_lon, DEST_LAT, DEST_LON)
            t3 = time.perf_counter_ns()
            osrm_latency_ms = (t3 - t2) / 1_000_000.0
            
        if d_osrm is None:
            print(f"  [Error] Skipping {name}: could not resolve OSRM route.")
            continue
            
        # 3. Metrics computation
        tortuosity = d_osrm / d_hav if d_hav > 0 else 1.0
        abs_diff_km = d_osrm - d_hav
        
        score_hav = calculate_distance_score_from_km(d_hav)
        score_osrm = calculate_distance_score_from_km(d_osrm)
        score_distortion = abs(score_hav - score_osrm)
        
        raw_records.append({
            "route_id": f"R_{idx:02d}",
            "origin_name": name,
            "origin_lat": o_lat,
            "origin_lon": o_lon,
            "dest_lat": DEST_LAT,
            "dest_lon": DEST_LON,
            "haversine_km": round(d_hav, 2),
            "osrm_km": round(d_osrm, 2),
            "tortuosity": round(tortuosity, 4),
            "abs_diff_km": round(abs_diff_km, 2),
            "duration_min": dur_min,
            "haversine_latency_ms": round(hav_latency_ms, 4),
            "osrm_latency_ms": round(osrm_latency_ms, 2),
            "score_haversine": score_hav,
            "score_osrm": score_osrm,
            "score_distortion": round(score_distortion, 4)
        })
        
        print(f"[{idx:02d}/{len(WAYPOINTS)}] {name:<22} | Hav: {d_hav:5.2f} km | OSRM: {d_osrm:5.2f} km | Tau: {tortuosity:5.3f} | Diff: +{abs_diff_km:4.2f} km | OSRM Lat: {osrm_latency_ms:5.1f} ms")
        time.sleep(0.12)  # Polite delay to respect public OSRM rate limits
        
    # Write Raw CSV
    print(f"\nWriting raw measurements to {RAW_CSV_PATH} ({len(raw_records)} rows)...")
    with open(RAW_CSV_PATH, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "route_id", "origin_name", "origin_lat", "origin_lon", "dest_lat", "dest_lon",
            "haversine_km", "osrm_km", "tortuosity", "abs_diff_km", "duration_min",
            "haversine_latency_ms", "osrm_latency_ms", "score_haversine", "score_osrm", "score_distortion"
        ])
        writer.writeheader()
        writer.writerows(raw_records)
        
    # Categorize into Distance Brackets
    tiers = [
        ("Overall", lambda r: True),
        ("Inner Urban (<6 km)", lambda r: r["haversine_km"] < 6.0),
        ("Mid-City (6-12 km)", lambda r: 6.0 <= r["haversine_km"] <= 12.0),
        ("Suburban (12-20 km)", lambda r: 12.0 < r["haversine_km"] <= 20.0),
        ("Peripheral (>20 km)", lambda r: r["haversine_km"] > 20.0),
    ]
    
    summary_rows = []
    print("\n--- Spatial Routing & Tortuosity Summary ---")
    print(f"{'Tier':<22} | {'Count':<5} | {'Mean Hav (km)':<13} | {'Mean OSRM (km)':<14} | {'Mean Tau':<9} | {'Max Tau':<8} | {'Mean Diff':<10} | {'Mean Distortion':<15} | {'Mean OSRM Lat':<13}")
    print("-" * 125)
    
    for name, predicate in tiers:
        subset = [r for r in raw_records if predicate(r)]
        count = len(subset)
        if count == 0:
            continue
            
        mean_hav = float(np.mean([r["haversine_km"] for r in subset]))
        mean_osrm = float(np.mean([r["osrm_km"] for r in subset]))
        mean_tau = float(np.mean([r["tortuosity"] for r in subset]))
        max_tau = float(np.max([r["tortuosity"] for r in subset]))
        min_tau = float(np.min([r["tortuosity"] for r in subset]))
        mean_diff = float(np.mean([r["abs_diff_km"] for r in subset]))
        mean_distort = float(np.mean([r["score_distortion"] for r in subset]))
        mean_osrm_lat = float(np.mean([r["osrm_latency_ms"] for r in subset]))
        mean_hav_lat = float(np.mean([r["haversine_latency_ms"] for r in subset]))
        
        summary_rows.append({
            "tier": name,
            "count": count,
            "mean_haversine_km": round(mean_hav, 2),
            "mean_osrm_km": round(mean_osrm, 2),
            "mean_tortuosity": round(mean_tau, 4),
            "max_tortuosity": round(max_tau, 4),
            "min_tortuosity": round(min_tau, 4),
            "mean_diff_km": round(mean_diff, 2),
            "mean_score_distortion": round(mean_distort, 4),
            "mean_osrm_latency_ms": round(mean_osrm_lat, 2),
            "mean_haversine_latency_ms": round(mean_hav_lat, 4),
        })
        
        print(f"{name:<22} | {count:<5} | {mean_hav:<13.2f} | {mean_osrm:<14.2f} | {mean_tau:<9.3f} | {max_tau:<8.3f} | +{mean_diff:<9.2f} | {mean_distort:<15.4f} | {mean_osrm_lat:<10.1f} ms")
        
    # Write Summary CSV
    print(f"\nWriting summary measurements to {SUMMARY_CSV_PATH}...")
    with open(SUMMARY_CSV_PATH, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "tier", "count", "mean_haversine_km", "mean_osrm_km", "mean_tortuosity",
            "max_tortuosity", "min_tortuosity", "mean_diff_km", "mean_score_distortion",
            "mean_osrm_latency_ms", "mean_haversine_latency_ms"
        ])
        writer.writeheader()
        writer.writerows(summary_rows)
        
    # Generate Publication-Quality Graph
    print(f"Generating publication plot at {GRAPH_PNG_PATH}...")
    plot_spatial_routing_results(raw_records, summary_rows, GRAPH_PNG_PATH)
    
    # Mirror files to artifact directory
    if os.path.isdir(ARTIFACT_DIR):
        import shutil
        shutil.copy(RAW_CSV_PATH, os.path.join(ARTIFACT_DIR, "metric4_raw_routing_disparity.csv"))
        shutil.copy(SUMMARY_CSV_PATH, os.path.join(ARTIFACT_DIR, "metric4_summary_routing.csv"))
        shutil.copy(GRAPH_PNG_PATH, os.path.join(ARTIFACT_DIR, "metric4_road_vs_haversine_disparity.png"))
        print(f"Mirrored files to {ARTIFACT_DIR}")
        
    print("\nMetric 4 benchmark completed successfully!")


def plot_spatial_routing_results(records, summary_rows, output_path):
    plt.rcParams['font.family'] = 'DejaVu Sans'
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11.5, 5.0), dpi=300)
    
    hav = [r["haversine_km"] for r in records]
    osrm = [r["osrm_km"] for r in records]
    tau = [r["tortuosity"] for r in records]
    
    overall_summary = [s for s in summary_rows if s["tier"] == "Overall"][0]
    mean_tau = overall_summary["mean_tortuosity"]
    
    # Left Plot: Road Distance vs. Haversine Distance (Scatter + Regression)
    # y = x line (Euclidean straight-line ideal)
    max_d = math.ceil(max(max(hav), max(osrm))) + 3
    ax1.plot([0, max_d], [0, max_d], linestyle="--", color="#78909C", linewidth=1.5, label="Euclidean Ideal ($D_{road} = D_{hav}$, $\\tau=1.0$)", zorder=2)
    
    # Linear fit for tortuosity: D_road ~ tau * D_hav
    poly = np.polyfit(hav, osrm, 1)
    x_line = np.linspace(0, max_d, 100)
    y_line = np.polyval(poly, x_line)
    ax1.plot(x_line, y_line, color="#C62828", linewidth=1.8, label=f"Empirical Road Fit (Slope = {poly[0]:.2f})", zorder=3)
    
    scatter = ax1.scatter(hav, osrm, c=tau, cmap="YlOrRd", edgecolors="#263238", linewidth=0.6, s=55, alpha=0.9, zorder=4)
    cbar = plt.colorbar(scatter, ax=ax1, pad=0.03, aspect=25)
    cbar.set_label("Tortuosity Index ($\\tau = D_{OSRM} / D_{Hav}$)", fontsize=9.5, fontweight='semibold')
    
    # Annotate significant route divergence exemplars
    # Highest tortuosity exemplar
    max_tau_r = max(records, key=lambda r: r["tortuosity"])
    ax1.annotate(
        f"{max_tau_r['origin_name']}\n$\\tau = {max_tau_r['tortuosity']:.2f}$ (Hav: {max_tau_r['haversine_km']} km $\\to$ Road: {max_tau_r['osrm_km']} km)",
        xy=(max_tau_r["haversine_km"], max_tau_r["osrm_km"]),
        xytext=(max_tau_r["haversine_km"] - 12, max_tau_r["osrm_km"] + 3),
        arrowprops=dict(facecolor='#C62828', edgecolor='#B71C1C', arrowstyle='->', lw=1.3),
        fontsize=8.0, fontweight='semibold', color='#B71C1C',
        bbox=dict(boxstyle="round,pad=0.25", facecolor="#FFEBEE", edgecolor="#FFCDD2", alpha=0.95),
        zorder=6
    )
    
    ax1.set_title("OSRM Road Network Distance vs. Haversine Distance", fontsize=11.5, fontweight='bold', pad=10)
    ax1.set_xlabel("Straight-Line Haversine Distance ($D_{Hav}$ in $km$)", fontsize=10, fontweight='semibold')
    ax1.set_ylabel("Actual OSRM Road Distance ($D_{OSRM}$ in $km$)", fontsize=10, fontweight='semibold')
    ax1.set_xlim(0, max_d)
    ax1.set_ylim(0, max_d)
    ax1.grid(True, linestyle="--", alpha=0.55, color="#CFD8DC")
    ax1.legend(loc="upper left", frameon=True, facecolor="#FAFAFA", edgecolor="#CFD8DC", fontsize=8.5)
    
    # Right Plot: Tortuosity Index Distribution (Histogram + KDE-like overlay)
    bins = np.linspace(1.0, 1.8, 17)
    counts, edges, patches = ax2.hist(tau, bins=bins, color="#1976D2", edgecolor="#0D47A1", alpha=0.8, rwidth=0.85, zorder=3)
    
    # Highlight mean tortuosity
    ax2.axvline(mean_tau, color="#D32F2F", linestyle="-", linewidth=2.0, label=f"Mean Tortuosity $\\tau = {mean_tau:.3f}$", zorder=4)
    ax2.axvline(float(np.median(tau)), color="#388E3C", linestyle="--", linewidth=1.8, label=f"Median Tortuosity $\\tau = {float(np.median(tau)):.3f}$", zorder=4)
    
    ax2.set_title("Distribution of Empirical Tortuosity Index ($\\tau$)", fontsize=11.5, fontweight='bold', pad=10)
    ax2.set_xlabel("Tortuosity Ratio ($\\tau = D_{OSRM} / D_{Hav}$)", fontsize=10, fontweight='semibold')
    ax2.set_ylabel("Route Frequency (Count)", fontsize=10, fontweight='semibold')
    ax2.set_xlim(1.0, 1.8)
    ax2.grid(True, linestyle="--", alpha=0.55, color="#CFD8DC", axis="y")
    ax2.legend(loc="upper right", frameon=True, facecolor="#FAFAFA", edgecolor="#CFD8DC", fontsize=9.0)
    
    # Inset text box with key findings
    text_box = (
        f"Sample: 50 Real Routes\n"
        f"Mean Disparity: +{overall_summary['mean_diff_km']:.1f} km\n"
        f"Max Tortuosity: {overall_summary['max_tortuosity']:.3f}\n"
        f"Min Tortuosity: {overall_summary['min_tortuosity']:.3f}\n"
        f"OSRM Latency: {overall_summary['mean_osrm_latency_ms']:.1f} ms\n"
        f"Haversine Latency: <0.01 ms"
    )
    ax2.text(0.04, 0.95, text_box, transform=ax2.transAxes, verticalalignment='top',
             fontsize=8.5, family='monospace', bbox=dict(boxstyle='round,pad=0.4', facecolor='#F5F5F5', edgecolor='#B0BEC5', alpha=0.95))
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=300)
    plt.close()


if __name__ == "__main__":
    run_benchmark()
