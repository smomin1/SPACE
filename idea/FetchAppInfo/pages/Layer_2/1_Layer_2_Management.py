import streamlit as st
import sqlite3
import json
import pandas as pd
import openpyxl

# CONFIG & PATHS 
DB_PATH = 'edtech_eval.db'
L2_REQ_FILE = "Layer_2_Requirements.xlsx"

st.set_page_config(page_title="Layer 2 Management", layout="wide")
st.title("Layer 2: Master Evaluation Management")
st.info("Edit existing evaluations or delete them. Editor names are only updated on the specific requirements they change.")

# DATABASE INITIALIZATION
def init_l2_master_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS layer2_master 
                 (app_name TEXT PRIMARY KEY, 
                  status TEXT DEFAULT 'Partial',
                  scores TEXT,
                  notes TEXT)''')
    conn.commit()
    conn.close()

init_l2_master_db()

# HELPER FUNCTIONS
def load_excel_requirements(file_path):
    try:
        wb = openpyxl.load_workbook(file_path)
        sheet = wb.active
        rows = list(sheet.iter_rows(values_only=True))
        header = rows[0]
        return [dict(zip(header, row)) for row in rows[1:] if row[0] is not None]
    except Exception as e:
        st.error(f"Could not load '{file_path}'. Error: {e}")
        return []

def get_all_l2_data():
    """Fetch all apps currently stored in Layer 2 master table."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.execute("SELECT app_name, status, scores, notes FROM layer2_master")
        rows = cursor.fetchall()
        conn.close()
        
        master_dict = {}
        for app, status, scores_json, notes in rows:
            master_dict[app] = {
                "status": status,
                "scores": json.loads(scores_json) if scores_json else {},
                "notes": notes if notes else ""
            }
        return master_dict
    except sqlite3.OperationalError:
        return {}

def delete_l2_evaluation(app_name):
    """Deletes an application's evaluation completely from Layer 2."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("DELETE FROM layer2_master WHERE app_name = ?", (app_name,))
    conn.commit()
    conn.close()

# LOAD DATA
reqs = load_excel_requirements(L2_REQ_FILE)
l2_master_data = get_all_l2_data()

# Only show apps that exist in the Layer 2 database
started_apps = list(l2_master_data.keys())

if not reqs:
    st.stop()

total_reqs = len(reqs)

# TOP SECTION: OVERVIEW TABLE 
st.subheader("Layer 2 Progress Overview")

if not started_apps:
    st.info("No Layer 2 evaluations have been started yet. Use the Layer 2 Evaluation Form to begin scoring an app.")
    st.stop()

table_data = []
for app in started_apps:
    app_data = l2_master_data[app]
    scored_count = len(app_data["scores"])
    total_score = sum(details["score"] for details in app_data["scores"].values())
    
    table_data.append({
        "Application": app,
        "Status": app_data["status"],
        "Progress": f"{scored_count} / {total_reqs} Reqs",
        "Total Score": total_score
    })

df_overview = pd.DataFrame(table_data)
st.dataframe(df_overview, use_container_width=True, hide_index=True)

st.divider()

# EDIT SECTION: FULL FORM 
st.subheader("Edit App Evaluation")

col1, col2, col3 = st.columns([2, 2, 1])
with col1:
    selected_app = st.selectbox(
        "Select Application to Edit", 
        options=started_apps,
        format_func=lambda x: f"{x} ({l2_master_data[x]['status']})"
    )
with col2:
    editor_name = st.text_input("Your Name (Editor)")
with col3:
    st.write("") 
    st.write("")
    with st.popover("Delete Evaluation"):
        st.warning(f"Are you sure you want to permanently delete **{selected_app}** from Layer 2?")
        if st.button("Confirm Delete", type="primary", use_container_width=True):
            delete_l2_evaluation(selected_app)
            st.success(f"Deleted {selected_app}!")
            st.rerun()

current_app_data = l2_master_data[selected_app]
existing_scores = current_app_data["scores"]

new_status = st.radio(
    "Evaluation Status", 
    options=["Partial", "Complete"], 
    index=0 if current_app_data["status"] == "Partial" else 1,
    horizontal=True
)

st.markdown("### Evaluation Rubric")

categories = sorted(list(set(r.get('Category', 'Uncategorized') for r in reqs)))
tabs = st.tabs(categories)

form_submissions = {}

for i, cat in enumerate(categories):
    with tabs[i]:
        cat_reqs = [r for r in reqs if r.get('Category', 'Uncategorized') == cat]
        
        for req in cat_reqs:
            rid = req.get('Req ID')
            desc = req.get('Requirement Description')
            priority = req.get('Priority', 'N/A')
            
            # Fetch existing score and evaluator if it exists
            req_history = existing_scores.get(rid, {})
            current_score = req_history.get("score", None)
            last_editor = req_history.get("evaluator", "Unscored")
            
            with st.container(border=True):
                st.markdown(f"**{rid}** ({priority} Priority) — *Last edited by: **{last_editor}***")
                st.write(desc)
                
                index = 0
                if current_score == 0: index = 1
                elif current_score == 1: index = 2
                elif current_score == 2: index = 3
                
                score_options = [
                    "Not Evaluated Yet",
                    "0 - No Evidence / Fails Requirement", 
                    "1 - Partial Support / Clunky UX", 
                    "2 - Full Support / Intuitive UX"
                ]
                
                choice = st.radio(
                    "Score:",
                    options=score_options,
                    index=index,
                    key=f"edit_{rid}",
                    horizontal=True,
                    label_visibility="collapsed"
                )
                
                if choice == "Not Evaluated Yet":
                    form_submissions[rid] = None
                else:
                    form_submissions[rid] = int(choice.split(" -")[0])

new_notes = st.text_area("Evaluation Notes", value=current_app_data["notes"], height=100)

#  SAVE LOGIC
if st.button("Save All Changes", type="primary", use_container_width=True):
    if not editor_name.strip():
        st.error("Please enter 'Your Name (Editor)' at the top before saving.")
    else:
        try:
            updated_scores_dict = existing_scores.copy()
            
            for rid, new_score in form_submissions.items():
                old_score = existing_scores.get(rid, {}).get("score", None)
                
                if new_score is None:
                    if rid in updated_scores_dict:
                        del updated_scores_dict[rid]
                else:
                    # Update editor name ONLY if the score was actually changed
                    if new_score != old_score:
                        updated_scores_dict[rid] = {
                            "score": new_score,
                            "evaluator": editor_name.strip()
                        }
            
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("""
                UPDATE layer2_master 
                SET status = ?, scores = ?, notes = ?
                WHERE app_name = ?
            """, (new_status, json.dumps(updated_scores_dict), new_notes, selected_app))
            
            conn.commit()
            conn.close()
            
            st.success(f"Changes saved for {selected_app}! (Status: {new_status})")
            st.rerun()
            
        except Exception as e:
            st.error(f"Database Error: {e}")