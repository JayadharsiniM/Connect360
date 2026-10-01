import os

report_path = os.path.join(os.path.dirname(__file__), "generate_full_report.py")

with open(report_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Replace the start of html_template
code = code.replace('html_template = f"""', 'html_template_raw = """', 1)

# 2. Replace the SVG and Fig variables in html_template
code = code.replace('{svg_architecture}', '__SVG_ARCHITECTURE__')
code = code.replace('{svg_usecase}', '__SVG_USECASE__')
code = code.replace('{svg_activity}', '__SVG_ACTIVITY__')
code = code.replace('{svg_dfd}', '__SVG_DFD__')
code = code.replace('{svg_dfd1}', '__SVG_DFD1__')
code = code.replace('{svg_sequence}', '__SVG_SEQUENCE__')

code = code.replace('{fig1_b64}', '__FIG1_B64__')
code = code.replace('{fig2_b64}', '__FIG2_B64__')
code = code.replace('{fig3_b64}', '__FIG3_B64__')
code = code.replace('{fig4_b64}', '__FIG4_B64__')
code = code.replace('{fig5_b64}', '__FIG5_B64__')
code = code.replace('{fig6_b64}', '__FIG6_B64__')

# Split before md_template
parts = code.split('md_template = f"""')
if len(parts) == 2:
    html_part, md_part = parts[0], parts[1]
    html_part = html_part.replace('{{', '{').replace('}}', '}')

    replacement_code = '''
html_template = html_template_raw
for placeholder, val in [
    ("__FIG1_B64__", fig1_b64),
    ("__FIG2_B64__", fig2_b64),
    ("__FIG3_B64__", fig3_b64),
    ("__FIG4_B64__", fig4_b64),
    ("__FIG5_B64__", fig5_b64),
    ("__FIG6_B64__", fig6_b64),
    ("__SVG_ARCHITECTURE__", svg_architecture),
    ("__SVG_USECASE__", svg_usecase),
    ("__SVG_ACTIVITY__", svg_activity),
    ("__SVG_DFD__", svg_dfd),
    ("__SVG_DFD1__", svg_dfd1),
    ("__SVG_SEQUENCE__", svg_sequence)
]:
    html_template = html_template.replace(placeholder, val)
'''
    html_part = html_part.replace(
        'html_out_path = os.path.join(REPORT_DIR, "CONNECT360_PHASE1_PROJECT_REPORT.html")',
        replacement_code + '\nhtml_out_path = os.path.join(REPORT_DIR, "CONNECT360_PHASE1_PROJECT_REPORT.html")'
    )

    md_part = md_part.replace('{{', '{').replace('}}', '}')
    new_code = html_part + 'md_template = """' + md_part

    with open(report_path, "w", encoding="utf-8") as f:
        f.write(new_code)
    print("Successfully transformed report/generate_full_report.py!")
else:
    print("Error: Could not find md_template = f\"\"\" split point.")
