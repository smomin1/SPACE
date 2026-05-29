import streamlit as st
import sqlite3
import json
import pandas as pd
import openpyxl

# CONFIG & PATHS
DB_PATH = 'edtech_eval.db'
L2_REQ_FILE = "Layer_2_Requirements.xlsx"

st.set_page_config(page_title="Compare Layers", layout="wide")
st.title("Compare Layers: AI vs. Human Validation")
st.info("Analyze the Difference between the automated Layer 1 AI scan and the verified Layer 2 human evaluation.")

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

def get_l2_apps():
    """Fetch the list of apps that have a Layer 2 record."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.execute("SELECT app_name FROM layer2_master")
        apps = [row[0] for row in cursor.fetchall()]
        conn.close()
        return apps
    except sqlite3.OperationalError:
        return []

def get_comparison_data(app_name):
    """Fetch Layer 1 AI scores and Layer 2 Human scores for a specific app."""
    conn = sqlite3.connect(DB_PATH)
    
    cursor1 = conn.execute("SELECT scores FROM evaluations WHERE app_name=?", (app_name,))
    row1 = cursor1.fetchone()
    l1_scores = json.loads(row1[0]) if row1 and row1[0] else {}
    
    cursor2 = conn.execute("SELECT scores FROM layer2_master WHERE app_name=?", (app_name,))
    row2 = cursor2.fetchone()
    l2_data = json.loads(row2[0]) if row2 and row2[0] else {}
    l2_scores = {k: v.get("score", 0) for k, v in l2_data.items()}
    
    conn.close()
    return l1_scores, l2_scores

# LOAD DATA 
l2_apps = get_l2_apps()
reqs = load_excel_requirements(L2_REQ_FILE)

if not l2_apps:
    st.warning("No Layer 2 evaluations found. Complete an evaluation in Layer 2 first.")
    st.stop()

if not reqs:
    st.stop()

# APP SELECTION
selected_app = st.selectbox("Select Application to Compare", options=l2_apps)
l1_scores, l2_scores = get_comparison_data(selected_app)

# DATA PROCESSING 
table_data = []
category_totals = {}

for req in reqs:
    rid = req.get('Req ID')
    desc = req.get('Requirement Description')
    cat = req.get('Category', 'Uncategorized')
    
    s1 = l1_scores.get(rid, 0)
    s2 = l2_scores.get(rid, 0)
    difference = s2 - s1
    
    table_data.append({
        "Req ID": rid,
        "Category": cat,
        "Description": desc,
        "Layer 1 (AI)": s1,
        "Layer 2 (Human)": s2,
        "Difference": difference
    })
    
    if cat not in category_totals:
        category_totals[cat] = {"Layer 1 (AI)": 0, "Layer 2 (Human)": 0}
    category_totals[cat]["Layer 1 (AI)"] += s1
    category_totals[cat]["Layer 2 (Human)"] += s2

# Create DataFrames
df_table = pd.DataFrame(table_data)

graph_data = []
for cat, totals in category_totals.items():
    graph_data.append({
        "Category": cat,
        "Layer 1 (AI)": totals["Layer 1 (AI)"],
        "Layer 2 (Human)": totals["Layer 2 (Human)"]
    })
df_graph = pd.DataFrame(graph_data).set_index("Category")

# METRICS & GRAPH 
st.divider()

# Calculate Top-Level Metrics
total_l1 = int(df_graph["Layer 1 (AI)"].sum())
total_l2 = int(df_graph["Layer 2 (Human)"].sum())
total_difference = total_l2 - total_l1

col1, col2, col3 = st.columns(3)
with col1:
    st.metric("Layer 1 (AI Score)", total_l1)
with col2:
    st.metric("Layer 2 (Human Score)", total_l2)
with col3:
    st.metric("Total Difference", total_difference, delta=total_difference)

st.markdown("### Category Performance Comparison")
st.bar_chart(df_graph)

st.divider()

# EXCEL-STYLE TABLE WITH FILTERS 
st.markdown("### Granular Score Breakdown")
st.caption("A positive difference (Green) means the AI underestimated the app. A negative difference (Red) means the AI overestimated the app.")

# Table Filters Layout
col_f1, col_f2 = st.columns(2)
with col_f1:
    all_table_cats = sorted(df_table["Category"].unique().tolist())
    selected_table_cats = st.multiselect("Filter by Category", options=all_table_cats, default=all_table_cats)

with col_f2:
    difference_filter = st.selectbox(
        "Filter by Difference", 
        options=[
            "Show All Requirements", 
            "Show ONLY Discrepancies (Difference ≠ 0)", 
            "Show AI Overscores / Hallucinations (Red)", 
            "Show AI Underscores / Missed Features (Green)"
        ]
    )

# Apply the table filters
filtered_df = df_table[df_table["Category"].isin(selected_table_cats)].copy()

if difference_filter == "Show ONLY Discrepancies (Difference ≠ 0)":
    filtered_df = filtered_df[filtered_df["Difference"] != 0]
elif difference_filter == "Show AI Overscores / Hallucinations (Red)":
    filtered_df = filtered_df[filtered_df["Difference"] < 0]
elif difference_filter == "Show AI Underscores / Missed Features (Green)":
    filtered_df = filtered_df[filtered_df["Difference"] > 0]

# Custom styling function to color code the Difference column in the dataframe
def color_difference(val):
    if val > 0:
        return 'color: #00C851; font-weight: bold'
        return 'color: #ff4444; font-weight: bold'
    return 'color: gray'

# Apply the style and render the filtered dataframe
styled_df = filtered_df.style.map(color_difference, subset=['Difference'])
st.dataframe(styled_df, use_container_width=True, hide_index=True)