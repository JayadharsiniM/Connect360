"""
Generate Publication-Quality Final Graph for Metric 1
Connect360 Research Paper Evaluation

Reads existing measured data from metric1_summary_latency.csv.
Uses a logarithmic X-axis to cleanly display candidate pool sizes spanning 10 to 5000.
"""

import os
import csv
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SUMMARY_CSV = os.path.join(SCRIPT_DIR, "metric1_summary_latency.csv")
OUTPUT_PNG = os.path.join(SCRIPT_DIR, "metric1_matching_latency_final.png")
ARTIFACT_DIR = r"C:\Users\rsdha\.gemini\antigravity\brain\c9bdcee0-3d64-4960-bab4-6b21a88441c4"

# Read data from existing summary CSV
summary_records = []
with open(SUMMARY_CSV, mode="r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        summary_records.append({
            "candidate_pool_size": int(row["candidate_pool_size"]),
            "booking_type": row["booking_type"],
            "p50_ms": float(row["p50_ms"]),
            "p90_ms": float(row["p90_ms"]),
            "p99_ms": float(row["p99_ms"]),
            "mean_ms": float(row["mean_ms"]),
            "std_dev_ms": float(row["std_dev_ms"])
        })

normal_data = [r for r in summary_records if r["booking_type"] == "NORMAL"]
priority_data = [r for r in summary_records if r["booking_type"] == "PRIORITY"]

candidate_sizes = [r["candidate_pool_size"] for r in normal_data]

x_normal = [r["candidate_pool_size"] for r in normal_data]
mean_normal = [r["mean_ms"] for r in normal_data]
p99_normal = [r["p99_ms"] for r in normal_data]

x_priority = [r["candidate_pool_size"] for r in priority_data]
mean_priority = [r["mean_ms"] for r in priority_data]
p99_priority = [r["p99_ms"] for r in priority_data]

# Styling
plt.rcParams['font.family'] = 'DejaVu Sans'
fig, ax = plt.subplots(figsize=(8.5, 5.2), dpi=300)

# Set logarithmic scale for X-axis
ax.set_xscale('log')

# Plot Series
# Normal Booking: Royal Blue
ax.plot(x_normal, mean_normal, marker='o', markersize=6, color='#0D47A1', linewidth=2.2, label='Normal Booking (Mean)', zorder=4)
ax.plot(x_normal, p99_normal, marker='^', markersize=5, linestyle='--', color='#42A5F5', linewidth=1.6, label='Normal Booking (P99)', zorder=3)

# Priority Booking: Crimson / Dark Orange
ax.plot(x_priority, mean_priority, marker='s', markersize=6, color='#B71C1C', linewidth=2.2, label='Priority Booking (Mean)', zorder=4)
ax.plot(x_priority, p99_priority, marker='v', markersize=5, linestyle=':', color='#EF5350', linewidth=1.6, label='Priority Booking (P99)', zorder=3)

# Title and Labels
ax.set_title("Matching Algorithm Execution Latency vs. Candidate Pool Size\n(Connect360 Dispatch Engine)", fontsize=13, fontweight='bold', pad=14)
ax.set_xlabel("Candidate Pool Size ($N$ workers, log scale)", fontsize=11, fontweight='semibold', labelpad=8)
ax.set_ylabel("Execution Latency ($ms$)", fontsize=11, fontweight='semibold', labelpad=8)

# Configure Logarithmic X-axis ticks and labels clearly
ax.set_xticks(candidate_sizes)
ax.get_xaxis().set_major_formatter(ticker.ScalarFormatter())
ax.set_xticklabels([str(n) for n in candidate_sizes], fontsize=10)
ax.minorticks_off()  # Turn off minor ticks to avoid visual clutter

# Limits and Margins
ax.set_xlim(8, 6200)
ax.set_ylim(-10, 920)

# Grid
ax.grid(True, which="major", linestyle="--", linewidth=0.7, alpha=0.6, color="#B0BEC5")

# Legend with academic box styling
ax.legend(frameon=True, facecolor='#FAFAFA', edgecolor='#CFD8DC', framealpha=0.95, fontsize=10, loc='upper left')

# Fine-tune layout
plt.tight_layout()

# Save final figure
plt.savefig(OUTPUT_PNG, dpi=300)
plt.close()
print(f"Final figure successfully generated at: {OUTPUT_PNG}")

# Mirror to artifact directory
if os.path.isdir(ARTIFACT_DIR):
    import shutil
    dest = os.path.join(ARTIFACT_DIR, "metric1_matching_latency_final.png")
    shutil.copy(OUTPUT_PNG, dest)
    print(f"Mirrored to artifact directory: {dest}")
