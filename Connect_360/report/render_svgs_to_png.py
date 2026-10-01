import os
import re
import subprocess
from PIL import Image, ImageChops

REPORT_DIR = os.path.abspath(os.path.dirname(__file__))
DIAGRAMS_DIR = os.path.join(REPORT_DIR, "diagrams_png")
os.makedirs(DIAGRAMS_DIR, exist_ok=True)

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

# Import SVGs from update_report and generate_report
import sys
sys.path.append(REPORT_DIR)
import generate_report
import update_report

svgs = {
    "fig3_1_architecture.png": (generate_report.svg_architecture, 1100, 650),
    "fig3_2_usecase.png": (update_report.svg_usecase_enhanced, 1150, 900),
    "fig3_3_activity.png": (update_report.svg_activity_enhanced, 1150, 950),
    "fig3_4_dfd_context.png": (generate_report.svg_dfd, 1100, 620),
    "fig3_5_dfd_modular.png": (update_report.svg_dfd1_enhanced, 1150, 920),
    "fig3_6_sequence.png": (update_report.svg_sequence_enhanced, 1150, 920),
}

def trim_whitespace(im):
    bg = Image.new(im.mode, im.size, (255, 255, 255))
    diff = ImageChops.difference(im, bg)
    diff = ImageChops.add(diff, diff, 2.0, -100)
    bbox = diff.getbbox()
    if bbox:
        # Add a 15px margin
        w, h = im.size
        margin = 15
        bbox = (
            max(0, bbox[0] - margin),
            max(0, bbox[1] - margin),
            min(w, bbox[2] + margin),
            min(h, bbox[3] + margin)
        )
        return im.crop(bbox)
    return im

for filename, (svg_content, win_w, win_h) in svgs.items():
    temp_html = os.path.join(DIAGRAMS_DIR, "temp.html")
    temp_png = os.path.join(DIAGRAMS_DIR, "raw_" + filename)
    final_png = os.path.join(DIAGRAMS_DIR, filename)

    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0;
    padding: 20px;
    background: #ffffff;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: 'Times New Roman', serif;
  }}
  svg {{
    transform: scale(1.4);
    transform-origin: top left;
  }}
</style>
</head>
<body>
  {svg_content.strip()}
</body>
</html>"""

    with open(temp_html, "w", encoding="utf-8") as f:
        f.write(html_content)

    # Use 1.5x larger window to capture scaled up crisp vector rendering
    scale_w = int(win_w * 1.4) + 60
    scale_h = int(win_h * 1.4) + 60

    cmd = [
        EDGE_PATH,
        "--headless",
        "--disable-gpu",
        "--force-device-scale-factor=1.5",
        f"--window-size={scale_w},{scale_h}",
        f"--screenshot={temp_png}",
        temp_html
    ]

    subprocess.run(cmd, check=True, capture_output=True)

    # Trim and save
    im = Image.open(temp_png).convert("RGB")
    trimmed = trim_whitespace(im)
    trimmed.save(final_png, quality=95)

    if os.path.exists(temp_png):
        os.remove(temp_png)
    if os.path.exists(temp_html):
        os.remove(temp_html)

    print(f"Rendered {filename}: {trimmed.size[0]}x{trimmed.size[1]} ({os.path.getsize(final_png)} bytes)")

print("All SVGs successfully converted to crisp PNGs!")
