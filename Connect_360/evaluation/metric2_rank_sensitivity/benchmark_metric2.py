"""
Benchmark Metric 2: Score Sensitivity & Rank Inversion Analysis
Connect360 Research Paper Evaluation

Tests the ACTUAL production matching implementation in:
backend/shared/matching_service.py -> rank_workers(), calculate_final_score()

Evaluates the divergence between NORMAL_BOOKING_WEIGHTS and PRIORITY_BOOKING_WEIGHTS
on an identical candidate pool of N = 100 workers.
"""

import os
import sys
import math
import random
import csv
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors

# Ensure backend/shared is on the Python path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
SHARED_DIR = os.path.join(PROJECT_ROOT, "backend", "shared")
sys.path.insert(0, SHARED_DIR)

import matching_service as ms

# Output paths
OUTPUT_DIR = SCRIPT_DIR
RAW_CSV_PATH = os.path.join(OUTPUT_DIR, "metric2_raw_rank_inversion.csv")
SUMMARY_CSV_PATH = os.path.join(OUTPUT_DIR, "metric2_summary_correlation.csv")
GRAPH_PNG_PATH = os.path.join(OUTPUT_DIR, "metric2_rank_inversion.png")
ARTIFACT_DIR = r"C:\Users\rsdha\.gemini\antigravity\brain\c9bdcee0-3d64-4960-bab4-6b21a88441c4"

RANDOM_SEED = 42
N_WORKERS = 100


def generate_candidate_pool(n=N_WORKERS, seed=RANDOM_SEED):
    """
    Generate a realistic, heterogeneous candidate pool of n workers with
    varying distances (0.5 to 30 km), ratings (3.0 to 5.0), experience (1 to 15 yrs),
    and availability schedules.
    """
    rng = random.Random(seed)
    base_lat, base_lon = 13.0827, 80.2707  # Chennai
    
    services_list = [
        ("s1", "AC Repair"),
        ("s2", "Plumbing"),
        ("s3", "Electrical"),
        ("s4", "House Cleaning"),
    ]
    
    workers = []
    for i in range(n):
        # Distance distribution: spread across near (<5km), mid (5-15km), far (15-30km)
        if i < 30:
            distance_km = rng.uniform(0.8, 4.8)      # 30% near
        elif i < 70:
            distance_km = rng.uniform(5.2, 14.5)     # 40% mid-range
        else:
            distance_km = rng.uniform(15.5, 29.5)    # 30% far
            
        angle = rng.uniform(0, 2 * math.pi)
        delta_lat = (distance_km / 111.0) * math.cos(angle)
        delta_lon = (distance_km / (111.0 * math.cos(math.radians(base_lat)))) * math.sin(angle)
        
        # Ensure s1 is offered so they are all service-eligible
        num_services = rng.randint(1, 3)
        chosen_services = rng.sample(services_list, num_services)
        if ("s1", "AC Repair") not in chosen_services:
            chosen_services[0] = ("s1", "AC Repair")
            
        # Availability slots (scheduled request is Tuesday 10:30)
        avail_slots = []
        for dow in range(7):
            if rng.random() < 0.85:
                avail_slots.append({
                    "day_of_week": dow,
                    "start_time": "09:00" if rng.random() < 0.8 else "12:00",
                    "end_time": "18:00",
                    "is_available": True
                })
                
        worker = {
            "id": f"w_{i+1:03d}",
            "full_name": f"Worker {i+1}",
            "is_verified": rng.random() < 0.92,
            "is_available": rng.random() < 0.90,
            "rating_avg": round(rng.uniform(3.2, 5.0), 2),
            "rating_count": rng.randint(10, 300),
            "experience_years": rng.randint(1, 15),
            "hourly_rate": rng.randint(250, 750),
            "city": "chennai",
            "latitude": base_lat + delta_lat,
            "longitude": base_lon + delta_lon,
            "distance_km": round(distance_km, 2),
            "service_ids": [s[0] for s in chosen_services],
            "service_names": [s[1] for s in chosen_services],
            "availability": avail_slots,
            "completed_bookings": rng.randint(15, 250),
            "cancelled_bookings": rng.randint(0, 8),
        }
        workers.append(worker)
        
    return workers


def get_standard_request():
    return {
        "service_id": "s1",
        "service_name": "AC Repair",
        "scheduled_date": "2026-09-22",  # Tuesday -> dow 2
        "scheduled_time": "10:30",
        "duration_hours": 2,
        "city": "chennai",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "budget_min": 300,
        "budget_max": 1000,
    }


def compute_spearman_rho(ranks_x, ranks_y):
    """Compute Spearman's rank correlation coefficient."""
    rx = np.array(ranks_x, dtype=float)
    ry = np.array(ranks_y, dtype=float)
    return float(np.corrcoef(rx, ry)[0, 1])


def compute_kendall_tau(ranks_x, ranks_y):
    """Compute Kendall's Tau-b rank correlation coefficient."""
    n = len(ranks_x)
    concordant = 0
    discordant = 0
    for i in range(n):
        for j in range(i + 1, n):
            dx = ranks_x[i] - ranks_x[j]
            dy = ranks_y[i] - ranks_y[j]
            prod = dx * dy
            if prod > 0:
                concordant += 1
            elif prod < 0:
                discordant += 1
    total_pairs = n * (n - 1) / 2.0
    return (concordant - discordant) / total_pairs if total_pairs > 0 else 0.0


def run_experiment():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    request = get_standard_request()
    workers = generate_candidate_pool(N_WORKERS, seed=RANDOM_SEED)
    
    print("=" * 80)
    print("Connect360 Metric 2: Score Sensitivity & Rank Inversion Analysis")
    print(f"Target Module: {SHARED_DIR}/matching_service.py")
    print(f"Candidate Pool Size: {N_WORKERS} workers")
    print("=" * 80)
    
    # 1. Execute matching under NORMAL booking weights
    ranked_normal = ms.rank_workers(workers, request, weights=ms.NORMAL_BOOKING_WEIGHTS)
    normal_rank_map = {r["worker_id"]: idx + 1 for idx, r in enumerate(ranked_normal)}
    normal_score_map = {r["worker_id"]: r["score"] for r in ranked_normal}
    normal_reason_map = {r["worker_id"]: r["match_reason"] for r in ranked_normal}
    
    # 2. Execute matching under PRIORITY booking weights
    ranked_priority = ms.rank_workers(workers, request, weights=ms.PRIORITY_BOOKING_WEIGHTS)
    priority_rank_map = {r["worker_id"]: idx + 1 for idx, r in enumerate(ranked_priority)}
    priority_score_map = {r["worker_id"]: r["score"] for r in ranked_priority}
    priority_reason_map = {r["worker_id"]: r["match_reason"] for r in ranked_priority}
    
    # 3. Compile paired records
    records = []
    for w in workers:
        wid = w["id"]
        n_rank = normal_rank_map[wid]
        p_rank = priority_rank_map[wid]
        n_score = normal_score_map[wid]
        p_score = priority_score_map[wid]
        reason = priority_reason_map[wid]
        
        # Rank shift: positive means improved (higher rank / lower rank index) in Priority
        # E.g., Normal rank 40, Priority rank 10 -> promoted by 30 positions (shift = +30)
        rank_shift = n_rank - p_rank
        abs_shift = abs(rank_shift)
        
        records.append({
            "worker_id": wid,
            "full_name": w["full_name"],
            "distance_km": w["distance_km"],
            "rating_avg": w["rating_avg"],
            "experience_years": w["experience_years"],
            "is_verified": w["is_verified"],
            "is_available": w["is_available"],
            "normal_score": round(n_score, 4),
            "normal_rank": n_rank,
            "priority_score": round(p_score, 4),
            "priority_rank": p_rank,
            "rank_shift": rank_shift,
            "abs_rank_shift": abs_shift,
            "distance_score": reason.get("distance", 0.0),
            "trust_score": reason.get("trust", 0.0),
            "availability_score": reason.get("availability", 0.0),
            "service_score": reason.get("service", 0.0),
            "experience_score": reason.get("experience", 0.0),
            "reliability_score": reason.get("reliability", 0.0),
        })
        
    # Write Raw CSV
    print(f"Writing raw rank inversion data to {RAW_CSV_PATH}...")
    fieldnames = [
        "worker_id", "distance_km", "rating_avg", "experience_years", "is_verified",
        "is_available", "normal_score", "normal_rank", "priority_score", "priority_rank",
        "rank_shift", "abs_rank_shift", "distance_score", "trust_score",
        "availability_score", "service_score", "experience_score", "reliability_score"
    ]
    with open(RAW_CSV_PATH, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(records)
        
    # Compute Statistics: Overall and by Distance Tier
    normal_ranks = [r["normal_rank"] for r in records]
    priority_ranks = [r["priority_rank"] for r in records]
    
    overall_rho = compute_spearman_rho(normal_ranks, priority_ranks)
    overall_tau = compute_kendall_tau(normal_ranks, priority_ranks)
    mean_abs_shift = float(np.mean([r["abs_rank_shift"] for r in records]))
    max_shift = int(np.max([r["abs_rank_shift"] for r in records]))
    
    tiers = [
        ("Overall", lambda r: True),
        ("Near (<5 km)", lambda r: r["distance_km"] < 5.0),
        ("Mid-range (5-15 km)", lambda r: 5.0 <= r["distance_km"] <= 15.0),
        ("Far (>15 km)", lambda r: r["distance_km"] > 15.0),
    ]
    
    summary_rows = []
    print("\n--- Rank Inversion & Sensitivity Summary ---")
    print(f"{'Tier':<22} | {'Count':<5} | {'Spearman rho':<12} | {'Kendall tau':<12} | {'Mean |dRank|':<12} | {'Max |dRank|':<11} | {'Promoted':<8} | {'Demoted':<8}")
    print("-" * 105)
    
    for name, predicate in tiers:
        subset = [r for r in records if predicate(r)]
        count = len(subset)
        if count == 0:
            continue
            
        sub_n_ranks = [r["normal_rank"] for r in subset]
        sub_p_ranks = [r["priority_rank"] for r in subset]
        
        rho = compute_spearman_rho(sub_n_ranks, sub_p_ranks) if count > 1 else 1.0
        tau = compute_kendall_tau(sub_n_ranks, sub_p_ranks) if count > 1 else 1.0
        m_shift = float(np.mean([r["abs_rank_shift"] for r in subset]))
        mx_shift = int(np.max([r["abs_rank_shift"] for r in subset]))
        
        promoted = sum(1 for r in subset if r["rank_shift"] > 0)
        demoted = sum(1 for r in subset if r["rank_shift"] < 0)
        unchanged = sum(1 for r in subset if r["rank_shift"] == 0)
        
        summary_rows.append({
            "tier": name,
            "count": count,
            "spearman_rho": round(rho, 4),
            "kendall_tau": round(tau, 4),
            "mean_abs_rank_shift": round(m_shift, 2),
            "max_rank_shift": mx_shift,
            "pct_promoted": round((promoted / count) * 100, 1),
            "pct_demoted": round((demoted / count) * 100, 1),
            "pct_unchanged": round((unchanged / count) * 100, 1),
        })
        
        print(f"{name:<22} | {count:<5} | {rho:<12.4f} | {tau:<12.4f} | {m_shift:<12.2f} | {mx_shift:<11} | {promoted:<8} | {demoted:<8}")
        
    # Write Summary CSV
    print(f"\nWriting summary statistics to {SUMMARY_CSV_PATH}...")
    with open(SUMMARY_CSV_PATH, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "tier", "count", "spearman_rho", "kendall_tau", "mean_abs_rank_shift",
            "max_rank_shift", "pct_promoted", "pct_demoted", "pct_unchanged"
        ])
        writer.writeheader()
        writer.writerows(summary_rows)
        
    # Generate Publication-Quality Plot
    print(f"Generating publication plot at {GRAPH_PNG_PATH}...")
    plot_rank_inversion(records, overall_rho, overall_tau, GRAPH_PNG_PATH)
    
    # Mirror to artifact directory
    if os.path.isdir(ARTIFACT_DIR):
        import shutil
        shutil.copy(RAW_CSV_PATH, os.path.join(ARTIFACT_DIR, "metric2_raw_rank_inversion.csv"))
        shutil.copy(SUMMARY_CSV_PATH, os.path.join(ARTIFACT_DIR, "metric2_summary_correlation.csv"))
        shutil.copy(GRAPH_PNG_PATH, os.path.join(ARTIFACT_DIR, "metric2_rank_inversion.png"))
        print(f"Mirrored files to {ARTIFACT_DIR}")
        
    print("\nMetric 2 experiment completed successfully!")


def plot_rank_inversion(records, rho, tau, output_path):
    plt.rcParams['font.family'] = 'DejaVu Sans'
    fig, ax = plt.subplots(figsize=(8.5, 6.5), dpi=300)
    
    x = [r["normal_rank"] for r in records]
    y = [r["priority_rank"] for r in records]
    distances = [r["distance_km"] for r in records]
    
    # Color map based on distance (Continuous Viridis reversed: Yellow=Near, Dark Blue=Far)
    cmap = plt.cm.get_cmap("viridis_r")
    norm = mcolors.Normalize(vmin=min(distances), vmax=max(distances))
    
    # Diagonal reference line: y = x (Zero Rank Inversion)
    ax.plot([1, N_WORKERS], [1, N_WORKERS], linestyle="--", color="#546E7A", linewidth=1.5,
            label=f"Zero Inversion Baseline ($y=x$)\nOverall Spearman $\\rho = {rho:.3f}$, Kendall $\\tau = {tau:.3f}$", zorder=2)
    
    # Scatter plot
    scatter = ax.scatter(x, y, c=distances, cmap=cmap, norm=norm, s=55, edgecolor="#263238", linewidth=0.7, alpha=0.9, zorder=4)
    
    # Colorbar
    cbar = plt.colorbar(scatter, ax=ax, pad=0.03, aspect=25)
    cbar.set_label("Worker Distance from Customer ($km$)", fontsize=10.5, fontweight='semibold', labelpad=8)
    cbar.ax.tick_params(labelsize=9.5)
    
    # Annotate significant exemplars to visually explain the rank inversion mechanism
    # Find a proximal worker with big promotion (low Normal rank, high Priority rank)
    promoted_candidates = sorted([r for r in records if r["distance_km"] < 5.0], key=lambda r: r["rank_shift"], reverse=True)
    if promoted_candidates:
        p = promoted_candidates[0]
        ax.annotate(
            f"Proximal Worker ({p['distance_km']} km, {p['rating_avg']}★)\nNormal #{p['normal_rank']} → Priority #{p['priority_rank']} (+{p['rank_shift']})",
            xy=(p["normal_rank"], p["priority_rank"]),
            xytext=(p["normal_rank"] + 8, p["priority_rank"] - 12),
            arrowprops=dict(facecolor='#2E7D32', edgecolor='#1B5E20', arrowstyle='->', lw=1.5),
            fontsize=8.5, fontweight='semibold', color='#1B5E20',
            bbox=dict(boxstyle="round,pad=0.3", facecolor="#E8F5E9", edgecolor="#A5D6A7", alpha=0.95),
            zorder=6
        )
        
    # Find a distant high-trust worker with big demotion (high Normal rank, low Priority rank)
    demoted_candidates = sorted([r for r in records if r["distance_km"] > 20.0 and r["rating_avg"] >= 4.7], key=lambda r: r["rank_shift"])
    if demoted_candidates:
        d = demoted_candidates[0]
        ax.annotate(
            f"Distant High-Trust Worker ({d['distance_km']} km, {d['rating_avg']}★)\nNormal #{d['normal_rank']} → Priority #{d['priority_rank']} ({d['rank_shift']})",
            xy=(d["normal_rank"], d["priority_rank"]),
            xytext=(d["normal_rank"] - 25, d["priority_rank"] + 12),
            arrowprops=dict(facecolor='#C62828', edgecolor='#B71C1C', arrowstyle='->', lw=1.5),
            fontsize=8.5, fontweight='semibold', color='#B71C1C',
            bbox=dict(boxstyle="round,pad=0.3", facecolor="#FFEBEE", edgecolor="#EF9A9A", alpha=0.95),
            zorder=6
        )
        
    # Formatting
    ax.set_title("Matching Engine Rank Sensitivity & Inversion Analysis\n(Normal vs. Priority Booking Configurations)", fontsize=13, fontweight='bold', pad=14)
    ax.set_xlabel("Normal Booking Rank (1 = Top Match, Scheduled Focus)", fontsize=11, fontweight='semibold', labelpad=8)
    ax.set_ylabel("Priority Booking Rank (1 = Top Match, Urgent Focus)", fontsize=11, fontweight='semibold', labelpad=8)
    
    ax.set_xlim(0, N_WORKERS + 3)
    ax.set_ylim(0, N_WORKERS + 3)
    
    ax.set_xticks([1, 10, 25, 50, 75, 100])
    ax.set_yticks([1, 10, 25, 50, 75, 100])
    
    # Invert axes so rank 1 (best) is at bottom-left or top-left?
    # In ranking plots, rank 1 is typically placed at the origin (1,1)
    ax.grid(True, linestyle="--", alpha=0.55, color="#CFD8DC")
    ax.legend(loc="lower right", frameon=True, facecolor="#FAFAFA", edgecolor="#CFD8DC", fontsize=9.5)
    
    # Shaded regions: Upper triangle = Demoted in Priority; Lower triangle = Promoted in Priority
    ax.text(12, 85, "Demoted in Priority\n(Priority Rank > Normal Rank)", fontsize=9, color="#78909C", style="italic")
    ax.text(60, 15, "Promoted in Priority\n(Priority Rank < Normal Rank)", fontsize=9, color="#78909C", style="italic")
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=300)
    plt.close()


if __name__ == "__main__":
    run_experiment()
