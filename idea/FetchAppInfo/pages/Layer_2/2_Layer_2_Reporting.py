import streamlit as st
import sqlite3
import json
import openpyxl

# CONFIG & PATHS
DB_PATH = 'edtech_eval.db'
L2_REQ_FILE = "Layer_2_Requirements.xlsx"

st.set_page_config(page_title="Layer 2 Rankings", layout="wide")
st.title("Layer 2: Reporting & Rankings")

# HELPER FUNCTIONS
def load_excel_requirements(file_path):
    try:
        wb = openpyxl.load_workbook(file_path)
        sheet = wb.active
        rows = list(sheet.iter_rows(values_only=True))
        header = rows[0]
        return [dict(zip(header, row)) for row in rows[1:] if row[0] is not None]
    except Exception as e:
        st.error(f"Error loading Excel file: {e}")
        return []

# DATA LOADING
conn = sqlite3.connect(DB_PATH)
try:
    # Pulling from the Layer 2 Master table
    cursor = conn.execute("SELECT app_name, status, scores FROM layer2_master")
    rows = cursor.fetchall()
except sqlite3.OperationalError:
    st.warning("Database not found or Layer 2 has not been started yet.")
    st.stop()
finally:
    conn.close()

req_map = load_excel_requirements(L2_REQ_FILE)

if not rows:
    st.warning("No Layer 2 evaluations found in the database.")
    st.stop()

# DATA PROCESSING
processed_data = []
all_cats = sorted(list(set(r.get('Category', 'Uncategorized') for r in req_map if r.get('Category'))))
all_priorities = sorted(list(set(r.get('Priority', 'N/A') for r in req_map if r.get('Priority'))), reverse=True)

for name, status, score_str in rows:
    try:
        scores = json.loads(score_str) if score_str else {}
        
        # Extract the unique evaluators who worked on this app
        evaluators = set()
        for rid, details in scores.items():
            if isinstance(details, dict) and "evaluator" in details:
                evaluators.add(details["evaluator"])

        processed_data.append({
            "Name": name,
            "Status": status,
            "Scores": scores,
            "Evaluators": list(evaluators)
        })
    except Exception as e:
        st.error(f"Error parsing data for {name}: {e}")

# SIDEBAR FILTERS
st.sidebar.header("Filter & Rank (Layer 2)")

# 1. Status Filter
selected_status = st.sidebar.multiselect("Evaluation Status", ["Partial", "Complete"], default=["Partial", "Complete"])

# 2. Priority Filter
selected_priorities = st.sidebar.multiselect("Requirement Priority", all_priorities, default=all_priorities)

# 3. Category Selector
selected_cat = st.sidebar.selectbox("Rank by Category", ["Total Score"] + all_cats)

# FILTERING & RANKING LOGIC
report_list = []

for app in processed_data:
    # 1. Status Filtering
    if selected_status and app['Status'] not in selected_status:
        continue

    # Calculate Score based on Priority and Category
    try:
        valid_req_ids = [r['Req ID'] for r in req_map if r.get('Priority') in selected_priorities]
        
        if selected_cat == "Total Score":
            display_score = sum(app['Scores'].get(rid, {}).get("score", 0) for rid in valid_req_ids)
        else:
            cat_ids = [r['Req ID'] for r in req_map if r.get('Category') == selected_cat and r.get('Priority') in selected_priorities]
            display_score = sum(app['Scores'].get(rid, {}).get("score", 0) for rid in cat_ids)
    except Exception:
        display_score = 0

    report_list.append({
        "Platform": app['Name'],
        "Score": display_score,
        "Status": app['Status'],
        "Evaluators": ", ".join(app['Evaluators']) if app['Evaluators'] else "None"
    })

# Sort Highest to Lowest
report_list = sorted(report_list, key=lambda x: x['Score'], reverse=True)

# DASHBOARD UI
if report_list:
    col1, col2 = st.columns([3, 2])
    with col1:
        st.subheader(f"Rankings: {selected_cat}")
        st.dataframe(report_list, use_container_width=True, hide_index=True)
    with col2:
        st.subheader("Score Comparison")
        chart_dict = {x['Platform']: x['Score'] for x in report_list}
        st.bar_chart(chart_dict)
else:
    st.info("No platforms match the selected filters.")