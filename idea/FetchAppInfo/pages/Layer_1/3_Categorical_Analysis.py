import streamlit as st
import sqlite3
import json
import openpyxl

#  CONFIG 
DB_PATH = 'edtech_eval.db'
REQ_FILE = "Requirements.xlsx"

st.set_page_config(page_title="Categorical Analysis", layout="wide")
st.title("Categorical Analysis")

def load_excel_requirements(file_path):
    try:
        wb = openpyxl.load_workbook(file_path)
        sheet = wb.active
        rows = list(sheet.iter_rows(values_only=True))
        header = rows[0]
        return [dict(zip(header, row)) for row in rows[1:] if row[0]]
    except Exception as e:
        st.error(f"Error loading Excel: {e}")
        return []

#  DATA LOADING 
conn = sqlite3.connect(DB_PATH)
try:
    cursor = conn.execute("SELECT app_name, scores FROM evaluations")
    db_rows = cursor.fetchall()
finally:
    conn.close()

req_list = load_excel_requirements(REQ_FILE)

if not db_rows or not req_list:
    st.warning("Ensure you have evaluated platforms and Requirements.xlsx is present.")
    st.stop()

#  PRE-PROCESS CATEGORIES 
cat_max_scores = {}
for req in req_list:
    cat = req.get('Category')
    if cat:
        cat_max_scores[cat] = cat_max_scores.get(cat, 0) + 2

#  SORT APPS BY TOTAL SCORE 
app_totals = []
for name, score_json in db_rows:
    scores = json.loads(score_json)
    total_score = sum(scores.values())
    app_totals.append((name, total_score))

# Sort list by score descending
app_totals.sort(key=lambda x: x[1], reverse=True)
sorted_app_names = [x[0] for x in app_totals]

#  UI: SELECT APPS 
st.sidebar.header("Comparison Settings")
selected_apps = st.sidebar.multiselect(
    "Select Apps (Max 3)", 
    options=sorted_app_names, 
    default=sorted_app_names[:1], # Defaults to the highest scoring app
    max_selections=3
)

if not selected_apps:
    st.info("Please select at least one app in the sidebar.")
    st.stop()

#  CALCULATE CATEGORICAL PERFORMANCE 
def get_cat_performance(app_name):
    app_data = next(row for row in db_rows if row[0] == app_name)
    scores = json.loads(app_data[1])
    
    cat_results = {}
    for req in req_list:
        cat = req.get('Category')
        rid = req.get('Req ID')
        if cat and rid:
            score = scores.get(rid, 0)
            cat_results[cat] = cat_results.get(cat, 0) + score
    
    final_stats = {}
    for cat, total in cat_results.items():
        max_possible = cat_max_scores.get(cat, 1)
        final_stats[cat] = round((total / max_possible) * 100, 1)
    return final_stats

#  DASHBOARD LAYOUT 
if len(selected_apps) == 1:
    app_name = selected_apps[0]
    stats = get_cat_performance(app_name)
    
    st.subheader(f"Platform Profile: {app_name}")
    col1, col2 = st.columns([1, 2])
    
    with col1:
        st.write("**Category Competency (%)**")
        st.table(list(stats.items()))
        
    with col2:
        st.bar_chart(stats)

else:
    # comparison for 2 or 3 apps
    st.subheader(f"Comparison: {' vs '.join(selected_apps)}")
    
    all_performances = {name: get_cat_performance(name) for name in selected_apps}
    
    comparison_data = []
    for cat in cat_max_scores.keys():
        row = {"Category": cat}
        for name in selected_apps:
            row[name] = all_performances[name].get(cat, 0)
        comparison_data.append(row)
    
    st.bar_chart(
        data=comparison_data, 
        x="Category", 
        y=selected_apps, 
        stack=False
    )

st.divider()
st.caption("Note: Percentages represent the platform's competency relative to the maximum possible points in each category.")