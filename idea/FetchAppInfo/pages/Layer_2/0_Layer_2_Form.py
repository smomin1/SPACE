import streamlit as st
import sqlite3
import json
import openpyxl

#  CONFIG & PATHS 
DB_PATH = 'edtech_eval.db'
L2_REQ_FILE = "Layer_2_Requirements.xlsx"

st.set_page_config(page_title="Layer 2 Human Evaluation", layout="wide")
st.title("Layer 2: Tech & Pedagogical Review")
st.info("Collaborative Evaluation: Sections evaluated by other team members are marked as complete. Fully/ Paritally evaluated apps will disappear from the list.")

#  DATABASE INITIALIZATION 
def init_l2_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # Master table to hold all Layer 2 data
    c.execute('''CREATE TABLE IF NOT EXISTS layer2_master 
                 (app_name TEXT PRIMARY KEY, 
                  status TEXT DEFAULT 'Partial',
                  scores TEXT,
                  notes TEXT)''')
    conn.commit()
    conn.close()

init_l2_db()

#  HELPER FUNCTIONS 
def get_layer1_apps():
    """Fetch the list of apps that have passed Layer 1."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.execute("SELECT DISTINCT app_name FROM evaluations")
        apps = [row[0] for row in cursor.fetchall()]
        conn.close()
        return apps
    except sqlite3.OperationalError:
        return []

def load_excel_requirements(file_path):
    """Load the Layer 2 requirements."""
    try:
        wb = openpyxl.load_workbook(file_path)
        sheet = wb.active
        rows = list(sheet.iter_rows(values_only=True))
        header = rows[0]
        return [dict(zip(header, row)) for row in rows[1:] if row[0] is not None]
    except Exception as e:
        st.error(f"Could not load '{file_path}'. Error: {e}")
        st.stop()

def get_app_data(app_name):
    """Fetch existing scores and notes for a specific app from the master table."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.execute("SELECT scores, notes FROM layer2_master WHERE app_name=?", (app_name,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return json.loads(row[0]) if row[0] else {}, row[1] or ""
    return {}, ""

#  LOAD CORE DATA 
all_l1_apps = get_layer1_apps()
reqs = load_excel_requirements(L2_REQ_FILE)

if not all_l1_apps:
    st.warning("No applications found in the Layer 1 database. Please evaluate an app in Layer 1 first.")
    st.stop()

if not reqs:
    st.stop()

total_reqs = len(reqs)

# FILTER AVAILABLE APPS 
available_apps = []
for app in all_l1_apps:
    scores, _ = get_app_data(app)
    if len(scores) < total_reqs:
        available_apps.append(app)

if not available_apps:
    st.success("All applications have been fully evaluated in Layer 2! No further action required.")
    st.stop()

# EVALUATION FORM UI
with st.container(border=True):
    col1, col2 = st.columns(2)
    with col1:
        selected_app = st.selectbox("Select Application to Evaluate", options=available_apps)
    with col2:
        evaluator_name = st.text_input("Evaluator Name (Your Name)")

existing_scores, existing_notes = get_app_data(selected_app)
current_progress = len(existing_scores)

st.divider()
st.subheader(f"Evaluation Progress for {selected_app}")

categories = sorted(list(set(r.get('Category', 'Uncategorized') for r in reqs)))
tabs = st.tabs(categories)

form_data = {}
pending_evaluations = 0

for i, cat in enumerate(categories):
    with tabs[i]:
        cat_reqs = [r for r in reqs if r.get('Category', 'Uncategorized') == cat]
        
        for req in cat_reqs:
            rid = req.get('Req ID')
            desc = req.get('Requirement Description')
            priority = req.get('Priority', 'N/A')
            
            with st.container(border=True):
                st.markdown(f"**{rid}** ({priority} Priority)")
                st.write(desc)
                
                if rid in existing_scores:
                    past_eval = existing_scores[rid]
                    st.success(f"Evaluated by **{past_eval['evaluator']}** (Score: {past_eval['score']})")
                else:
                    pending_evaluations += 1
                    score_label = st.radio(
                        "Score:",
                        options=[
                            "0 - No Evidence / Fails Requirement", 
                            "1 - Partial Support / Clunky UX", 
                            "2 - Full Support / Intuitive UX"
                        ],
                        key=f"score_{rid}",
                        horizontal=True
                    )
                    form_data[rid] = int(score_label.split(" -")[0])

st.divider()
overall_notes = st.text_area("Notes for this session (Optional)", placeholder="Add any specific observations from your evaluation...")

# SUBMIT LOGIC
if pending_evaluations > 0:
    if st.button("Submit My Scores", type="primary", use_container_width=True):
        if not evaluator_name.strip():
            st.error("Please enter your name at the top before submitting.")
        else:
            try:
                # 1. Update existing scores dict with new form data
                for rid, score in form_data.items():
                    existing_scores[rid] = {"score": score, "evaluator": evaluator_name.strip()}
                
                # 2. Append notes safely
                new_notes = existing_notes
                if overall_notes.strip():
                    new_notes = f"{existing_notes}\n\n[{evaluator_name} Update]: {overall_notes}" if existing_notes else overall_notes
                
                # 3. Determine status
                status = "Partial"

                # 4. Save to DB 
                conn = sqlite3.connect(DB_PATH)
                c = conn.cursor()
                c.execute("""
                    INSERT OR REPLACE INTO layer2_master (app_name, status, scores, notes) 
                    VALUES (?, ?, ?, ?)
                """, (selected_app, status, json.dumps(existing_scores), new_notes))
                
                conn.commit()
                conn.close()
                
                st.success(f"Your scores for {selected_app} have been saved!")
                st.rerun()
                
            except Exception as e:
                st.error(f"Database error: {e}")
else:
    st.info("No remaining requirements to evaluate in this application.")