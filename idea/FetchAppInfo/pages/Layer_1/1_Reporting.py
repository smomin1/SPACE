import streamlit as st
import sqlite3
import json
import openpyxl

#  CONFIG & PATHS 
DB_PATH = 'edtech_eval.db'
REQ_FILE = "Requirements.xlsx"

st.set_page_config(page_title="Reporting & Rankings", layout="wide")
st.title("Reporting & Rankings")

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

#  DATA LOADING 
conn = sqlite3.connect(DB_PATH)
try:
    cursor = conn.execute("SELECT app_name, metadata, scores FROM evaluations")
    rows = cursor.fetchall()
except sqlite3.OperationalError:
    st.warning("Database not found. Please add a platform on the main page first.")
    st.stop()
finally:
    conn.close()

req_map = load_excel_requirements(REQ_FILE)

if not rows:
    st.warning("No evaluations found in the database.")
    st.stop()

#  DATA PROCESSING 
processed_data = []
all_grades = set()
all_cats = sorted(list(set(r['Category'] for r in req_map if r.get('Category'))))
# Extract unique priorities (High, Medium, Low) from the Excel
all_priorities = sorted(list(set(r['Priority'] for r in req_map if r.get('Priority'))), reverse=True)

for name, meta_str, score_str in rows:
    try:
        meta = json.loads(meta_str)
        scores = json.loads(score_str)
        grades = meta.get('Grade_Levels', [])
        if isinstance(grades, list):
            for g in grades:
                all_grades.add(g)
        
        processed_data.append({
            "Name": name,
            "Grades": grades,
            "Scores": scores,
            "Meta": meta
        })
    except Exception as e:
        st.error(f"Error parsing data for {name}: {e}")

#  SIDEBAR FILTERS 
st.sidebar.header("Filter & Rank")

# 1. Grade Filter
selected_grades = st.sidebar.multiselect("Filter by Grade(s)", sorted(list(all_grades)))

# 2. Fluency Filter
ALLOWED_FLUENCY = ["Pre-beginner(No Background)", "Beginner", "Intermediate", "Advanced/Fluent"]
selected_fluency = st.sidebar.multiselect("Filter by Fluency", ALLOWED_FLUENCY)

# 3. Priority Filter (NEW)
selected_priorities = st.sidebar.multiselect("Requirement Priority", all_priorities, default=all_priorities)

# 4. Category Selector
selected_cat = st.sidebar.selectbox("Rank by Category", ["Total Score"] + all_cats)

#  FILTERING & RANKING LOGIC 
report_list = []

for app in processed_data:
    # 1. Grade Filtering
    if selected_grades and not any(g in app['Grades'] for g in selected_grades):
        continue
            
    # 2. Fluency Filtering 
    app_fluencies = app['Meta'].get('Fluency_Levels', []) # Look for the list
    if selected_fluency:
        # If the user selected "Intermediate", show apps that have "Intermediate" in their list
        if not any(f in app_fluencies for f in selected_fluency):
            continue

    # Calculate Score based on Priority and Category
    try:
        # Get Req IDs that match the selected priorities
        valid_req_ids = [r['Req ID'] for r in req_map if r['Priority'] in selected_priorities]
        
        if selected_cat == "Total Score":
            # Sum scores only if they are in the selected priority list
            display_score = sum(app['Scores'].get(rid, 0) for rid in valid_req_ids)
        else:
            # Sum scores only if they match the category AND the priority
            cat_ids = [r['Req ID'] for r in req_map if r['Category'] == selected_cat and r['Priority'] in selected_priorities]
            display_score = sum(app['Scores'].get(rid, 0) for rid in cat_ids)
    except Exception:
        display_score = 0

    report_list.append({
        "Platform": app['Name'],
        "Score": display_score,
        "Audience": app['Meta'].get('Target_Audience'),
        "Fluency": ", ".join(app_fluencies) if app_fluencies else "N/A", 
    })

report_list = sorted(report_list, key=lambda x: x['Score'], reverse=True)

#  DASHBOARD UI 
if report_list:
    col1, col2 = st.columns([3, 2])
    with col1:
        st.subheader(f"Rankings: {selected_cat}")
        st.table(report_list)
    with col2:
        st.subheader("Score Comparison")
        chart_dict = {x['Platform']: x['Score'] for x in report_list}
        st.bar_chart(chart_dict)
else:
    st.info("No platforms match the selected filters.")