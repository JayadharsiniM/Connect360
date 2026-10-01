"""
Benchmark Metric 1: Matching Algorithm Execution Latency vs Candidate Pool Size
Connect360 Research Paper Evaluation

Tests the ACTUAL production matching implementation in:
backend/shared/matching_service.py -> rank_workers()

Pool sizes: N = 10, 50, 100, 250, 500, 1000, 2500, 5000
Iterations per N: 1000
Weights tested: NORMAL_BOOKING_WEIGHTS and PRIORITY_BOOKING_WEIGHTS
"""

import os
import sys
import time
import csv
import random
import math
import numpy as np
import matplotlib.pyplot as plt

# Ensure backend/shared is on the Python path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
SHARED_DIR = os.path.join(PROJECT_ROOT, "backend", "shared")
sys.path.insert(0, SHARED_DIR)

import matching_service as ms

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
CANDIDATE_SIZES = [10, 50, 100, 250, 500, 1000, 2500, 5000]
ITERATIONS = 1000
RANDOM_SEED = 42

OUTPUT_DIR = SCRIPT_DIR
RAW_CSV_PATH = os.path.join(OUTPUT_DIR, "metric1_raw_latency.csv")
SUMMARY_CSV_PATH = os.path.join(OUTPUT_DIR, "metric1_summary_latency.csv")
GRAPH_PNG_PATH = os.path.join(OUTPUT_DIR, "metric1_matching_latency.png")

# Also copy to artifact directory if it exists
ARTIFACT_DIR = r"C:\Users\rsdha\.gemini\antigravity\brain\c9bdcee0-3d64-4960-bab4-6b21a88441c4"


def generate_candidate_pool(n, seed=RANDOM_SEED):
    """
    Generate a realistic, heterogeneous pool of n candidate workers compatible with
    matching_service.py schema and all component scorers.
    """
    rng = random.Random(seed)
    
    # Base location (Chennai center)
    base_lat, base_lon = 13.0827, 80.2707
    
    services_list = [
        ("s1", "AC Repair"),
        ("s2", "Plumbing"),
        ("s3", "Electrical"),
        ("s4", "House Cleaning"),
        ("s5", "Painting"),
        ("s6", "Carpentry"),
    ]
    
    workers = []
    for i in range(n):
        # Semi-randomize location within 0 - 35 km radius
        angle = rng.uniform(0, 2 * math.pi)
        distance_km = rng.uniform(0.5, 30.0)
        # Approximate 1 deg lat ~ 111 km, 1 deg lon ~ 111 * cos(lat) km
        delta_lat = (distance_km / 111.0) * math.cos(angle)
        delta_lon = (distance_km / (111.0 * math.cos(math.radians(base_lat)))) * math.sin(angle)
        
        # Service allocation (primary is s1 for 70% of workers to ensure match)
        num_services = rng.randint(1, 3)
        chosen_services = rng.sample(services_list, num_services)
        if rng.random() < 0.75:
            if ("s1", "AC Repair") not in chosen_services:
                chosen_services[0] = ("s1", "AC Repair")
        
        # Weekly availability schedule (Mon=1, Tue=2, etc.)
        avail_slots = []
        for dow in range(7):
            if rng.random() < 0.8:  # 80% available on any given day
                avail_slots.append({
                    "day_of_week": dow,
                    "start_time": f"{rng.randint(7, 10):02d}:00",
                    "end_time": f"{rng.randint(17, 21):02d}:00",
                    "is_available": True
                })
        
        worker = {
            "id": f"w_{i+1:05d}",
            "full_name": f"Worker {i+1}",
            "is_verified": rng.random() < 0.90,  # 90% verified
            "is_available": rng.random() < 0.85, # 85% currently active
            "rating_avg": round(rng.uniform(3.0, 5.0), 2),
            "rating_count": rng.randint(5, 250),
            "experience_years": rng.randint(1, 15),
            "hourly_rate": rng.randint(250, 800),
            "city": "chennai",
            "latitude": base_lat + delta_lat,
            "longitude": base_lon + delta_lon,
            "service_ids": [s[0] for s in chosen_services],
            "service_names": [s[1] for s in chosen_services],
            "availability": avail_slots,
            "completed_bookings": rng.randint(10, 200),
            "cancelled_bookings": rng.randint(0, 10),
        }
        workers.append(worker)
        
    return workers


def get_standard_request():
    """Customer booking request matching the schema expected by rank_workers()."""
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


def run_benchmark():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    request = get_standard_request()
    
    weight_configs = [
        ("NORMAL", ms.NORMAL_BOOKING_WEIGHTS),
        ("PRIORITY", ms.PRIORITY_BOOKING_WEIGHTS),
    ]
    
    print("=" * 80)
    print("Connect360 Metric 1 Benchmark: Matching Latency vs Candidate Pool Size")
    print(f"Target Function: matching_service.rank_workers() in {SHARED_DIR}")
    print(f"Candidate Sizes: {CANDIDATE_SIZES}")
    print(f"Iterations per Size: {ITERATIONS}")
    print("=" * 80)
    
    raw_records = []
    summary_records = []
    
    # Pre-generate max pool to slice sub-pools consistently
    print("Generating max candidate pool (N=5000)...")
    max_pool = generate_candidate_pool(max(CANDIDATE_SIZES), seed=RANDOM_SEED)
    print("Candidate generation complete.")
    
    for booking_type, weights in weight_configs:
        print(f"\n--- Testing Booking Type: {booking_type} ---")
        
        for n in CANDIDATE_SIZES:
            pool = max_pool[:n]
            
            # Warm-up (5 runs to avoid bytecode / JIT / cache anomalies)
            for _ in range(5):
                _ = ms.rank_workers(pool, request, weights=weights)
            
            latencies_ms = []
            
            # Measurement loop - purely measuring rank_workers execution
            for it in range(1, ITERATIONS + 1):
                t_start = time.perf_counter_ns()
                _ = ms.rank_workers(pool, request, weights=weights)
                t_end = time.perf_counter_ns()
                
                duration_ms = (t_end - t_start) / 1_000_000.0
                latencies_ms.append(duration_ms)
                
                raw_records.append({
                    "candidate_pool_size": n,
                    "booking_type": booking_type,
                    "iteration": it,
                    "execution_time_ms": duration_ms
                })
            
            # Compute statistics
            arr = np.array(latencies_ms)
            p50 = float(np.percentile(arr, 50))
            p90 = float(np.percentile(arr, 90))
            p99 = float(np.percentile(arr, 99))
            mean = float(np.mean(arr))
            std_dev = float(np.std(arr, ddof=1))
            
            summary_records.append({
                "candidate_pool_size": n,
                "booking_type": booking_type,
                "p50_ms": round(p50, 4),
                "p90_ms": round(p90, 4),
                "p99_ms": round(p99, 4),
                "mean_ms": round(mean, 4),
                "std_dev_ms": round(std_dev, 4)
            })
            
            print(f"N = {n:4d} | Mean: {mean:7.4f} ms | P50: {p50:7.4f} ms | P90: {p90:7.4f} ms | P99: {p99:7.4f} ms | Std: {std_dev:7.4f} ms")
            
    # Write Raw CSV
    print(f"\nWriting raw measurements to {RAW_CSV_PATH} ({len(raw_records)} rows)...")
    with open(RAW_CSV_PATH, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["candidate_pool_size", "booking_type", "iteration", "execution_time_ms"])
        writer.writeheader()
        writer.writerows(raw_records)
        
    # Write Summary CSV
    print(f"Writing summary measurements to {SUMMARY_CSV_PATH}...")
    with open(SUMMARY_CSV_PATH, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["candidate_pool_size", "booking_type", "p50_ms", "p90_ms", "p99_ms", "mean_ms", "std_dev_ms"])
        writer.writeheader()
        writer.writerows(summary_records)
        
    # Generate Publication-Quality Graph
    print(f"Generating publication-quality graph at {GRAPH_PNG_PATH}...")
    plot_graph(summary_records, GRAPH_PNG_PATH)
    
    # Copy to artifact directory if available
    if os.path.isdir(ARTIFACT_DIR):
        import shutil
        try:
            shutil.copy(RAW_CSV_PATH, os.path.join(ARTIFACT_DIR, "metric1_raw_latency.csv"))
            shutil.copy(SUMMARY_CSV_PATH, os.path.join(ARTIFACT_DIR, "metric1_summary_latency.csv"))
            shutil.copy(GRAPH_PNG_PATH, os.path.join(ARTIFACT_DIR, "metric1_matching_latency.png"))
            print(f"Artifacts successfully copied to {ARTIFACT_DIR}")
        except Exception as e:
            print(f"Could not copy to artifact dir: {e}")
            
    print("\nBenchmark completed successfully!")


def plot_graph(summary_records, output_path):
    plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")
    
    fig, ax = plt.subplots(figsize=(8, 5.5), dpi=300)
    
    normal_data = [r for r in summary_records if r["booking_type"] == "NORMAL"]
    priority_data = [r for r in summary_records if r["booking_type"] == "PRIORITY"]
    
    x_normal = [r["candidate_pool_size"] for r in normal_data]
    mean_normal = [r["mean_ms"] for r in normal_data]
    p50_normal = [r["p50_ms"] for r in normal_data]
    p99_normal = [r["p99_ms"] for r in normal_data]
    
    x_priority = [r["candidate_pool_size"] for r in priority_data]
    mean_priority = [r["mean_ms"] for r in priority_data]
    p50_priority = [r["p50_ms"] for r in priority_data]
    p99_priority = [r["p99_ms"] for r in priority_data]
    
    # Plot Mean Latency lines with error bars (p99)
    ax.plot(x_normal, mean_normal, marker="o", color="#0058BE", linewidth=2.2, label="Normal Booking (Mean)", zorder=4)
    ax.plot(x_normal, p99_normal, linestyle="--", color="#7BAAF7", linewidth=1.4, label="Normal Booking (P99)", zorder=3)
    
    ax.plot(x_priority, mean_priority, marker="s", color="#D9381E", linewidth=2.2, label="Priority Booking (Mean)", zorder=4)
    ax.plot(x_priority, p99_priority, linestyle=":", color="#F28B82", linewidth=1.4, label="Priority Booking (P99)", zorder=3)
    
    ax.set_title("Worker Matching Algorithm Latency vs. Candidate Pool Size\n(Connect360 Matching Engine)", fontsize=13, fontweight="bold", pad=12)
    ax.set_xlabel("Candidate Pool Size ($N$ workers)", fontsize=11, fontweight="semibold")
    ax.set_ylabel("Execution Latency ($ms$)", fontsize=11, fontweight="semibold")
    
    ax.set_xticks(CANDIDATE_SIZES)
    ax.set_xticklabels([str(n) for n in CANDIDATE_SIZES], rotation=35, ha="right", fontsize=9.5)
    ax.tick_params(axis="both", which="major", labelsize=9.5)
    
    ax.grid(True, linestyle="--", alpha=0.6)
    ax.legend(frameon=True, facecolor="white", edgecolor="#cccccc", fontsize=9.5, loc="upper left")
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=300)
    plt.close()


if __name__ == "__main__":
    run_benchmark()
