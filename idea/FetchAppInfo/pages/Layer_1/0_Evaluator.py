import streamlit as st
import sqlite3
import json
import openpyxl
from groq import Groq

#DATABASE & CONFIG
client = Groq(api_key=st.secrets["GROQ_API_KEY"])
DB_PATH = 'edtech_eval.db'
REQ_FILE = "Requirements.xlsx" 

#  STRICT TAXONOMIES 
ALLOWED_GRADES = ["K", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "High School", "Adult"]
ALLOWED_FLUENCY = ["Pre-beginner(No Background)", "Beginner", "Intermediate", "Advanced/Fluent"]
ALLOWED_AUDIENCES = ["Students", "Teachers", "Parents", "Corporate", "General Learners"]
ALLOWED_CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"]

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS evaluations 
                 (id INTEGER PRIMARY KEY, app_name TEXT, url TEXT, 
                  metadata TEXT, scores TEXT)''')
    conn.commit()
    conn.close()

def get_app_list():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.execute("SELECT app_name, url FROM evaluations")
    data = cursor.fetchall()
    conn.close()
    return data

def load_excel_requirements(file_path):
    wb = openpyxl.load_workbook(file_path)
    sheet = wb.active
    rows = list(sheet.iter_rows(values_only=True))
    header = rows[0]
    return [dict(zip(header, row)) for row in rows[1:] if row[0] is not None]

init_db()

st.set_page_config(page_title="EdTech Platform Evaluator", layout="wide")
st.title("EdTech Platform Evaluator")
st.info("""
###  Disclaimer

**About This Tool**
This application is the Layer 1 Automated Filter for Model 2.0 shortlisting pipeline. Developed by the Research and Innovation Team on April 15, 2026, it utilizes a Large Language Model (GROQ) to cross-reference educational platforms against our internal 90-point technical and pedagogical rubric.

**Pre-Evaluation Requirement: The ELL Rule**
Before adding a new platform to this database, you **must manually verify** that the application is designed for or heavily supports English Language Learners (ELL). Feeding general-education platforms into this evaluator significantly increases the risk of AI hallucination, where the system will forcefully misinterpret generic teaching features as specialized ELL scaffolding.

**System Limitations & The Margin of Error**
This tool acts as an objective, evidence-based web auditor, which means it inherits the following limitations:
* **The Web-Dependency Constraint:** The system assigns scores strictly based on what a vendor publishes online. If a feature is not publicly documented on their site, in technical whitepapers, or in public reviews, it receives a 0.
* **Under-Scoring:** Platforms with highly complex sitemaps, features hidden behind a login, or poor marketing transparency will receive a low score. 
* **Over-Scoring:** Conversely, the AI may occasionally interpret vague, optimistic marketing language as definitive proof of a feature. 
* **Variance:** Manual validation has shown that these factors create almost ±10 point margin of error compared to a manual human audit. 

**Strategic Usage**
Because of these limitations, this tool **does not dictate final procurement decisions**. It is designed to generate a data-backed probability ranking. High-scoring applications, along with specific platforms recommended directly by our educators, will advance to **Layer 2**. In Layer 2, the Pedagogical and Technical teams will conduct vendor demos and hands-on trials to verify institutional fit, data privacy compliance, and actual pedagogical value.
""")
# ADD NEW PLATFORM
with st.expander("Add New Platform", expanded=True):
    col1, col2 = st.columns(2)
    with col1:
        app_name = st.text_input("Platform Name")
    with col2:
        app_url = st.text_input("Website URL")
    
    if st.button("Run Evaluation"):
        if app_name and app_url:
            try:
                reqs = load_excel_requirements(REQ_FILE)
                results = {"Scores": {}}
                
                with st.status("Evaluating with AI...") as status:
                    meta_prompt = fmeta_prompt = f"""
                ROLE:
                You are an Investigative EdTech Analyst specializing in competitive intelligence. 

                OBJECTIVE:
                Conduct a multi-source, deep-dive audit of the platform **{app_name}** ({app_url}) to accurately map it to our internal classification framework.

                INVESTIGATIVE PROTOCOL:
                1.Targeted Web Search: Do NOT rely solely on the provided URL. Perform an active web search for "**{app_name}**" to find:
                - Independent pedagogical reviews 
                - Recent news, press releases, or funding announcements that clarify their current market focus.
                - App Store/Play Store metadata and user reviews to confirm actual user demographics and use cases.
                2. Fact-Checking & Triangulation: Cross-reference the marketing claims found on {app_url} with external evidence found during your search. If claims conflict, prioritize the most recent third-party evidence.
                3. Evidence-Based Inference: Analyze content complexity, technical requirements, and UI design to determine the most likely classifications if explicit data is missing from the public domain.
               
                Allowed Categories (USTRICT TAXONOMYse ONLY these values)
                - **Grades:** {', '.join(ALLOWED_GRADES)}
                - **Audiences:** {', '.join(ALLOWED_AUDIENCES)}
                - **Fluency Levels:** {', '.join(ALLOWED_FLUENCY)}

                ### CONSTRAINTS
                - **Multi-Label Classification:** Select ALL values that apply across the platform's different modules.
                - **Output Integrity:** Return ONLY a valid JSON object. No reasoning, no markdown headers, and no extra text.

                ### DATA MAPPING
                - **Target_Audience:** Identify every stakeholder group targeted. Return as a single comma-separated string.
                - **Fluency_Levels:** Identify the supported English proficiency levels. Return as a list of strings.
                - **Grade_Levels:** Identify the supported educational grade levels. Return as a list of strings.

                ### OUTPUT FORMAT:
                {{
                    "Target_Audience": str,
                    "Fluency_Levels": list,
                    "Grade_Levels": list
                }}
                """

                    res = client.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=[
                            {
                                "role": "system",
                                "content": "You are a highly precise EdTech classification engine. You strictly follow allowed category constraints and always return valid JSON."
                            },
                            {"role": "user", "content": meta_prompt}
                        ],
                        response_format={"type": "json_object"}
                    )
                    results.update(json.loads(res.choices[0].message.content))
                    
                    #  Category Chunking
                    categories = list(set(r['Category'] for r in reqs if r.get('Category')))

                    for cat in categories:
                        status.update(label=f"Scoring Category: {cat}...")
                        cat_reqs = [r for r in reqs if r['Category'] == cat]
                        req_str = "\n".join([f"{r['Req ID']}: {r['Requirement Description']}" for r in cat_reqs])
                        
                        scoring_prompt = fchunk_prompt = f"""
                        ROLE:
                        You are an expert EdTech Product Auditor specializing in Technical Feature Verification.

                        OBJECTIVE:
                        Perform a deep-dive evaluation of the platform **{app_name}** ({app_url}) specifically for the category: "**{cat}**".

                        EVALUATION PROTOCOL:
                        1.Multi-Source Verification: Use the provided URL as a starting point, but perform targeted web searches for "**{app_name}** {cat} features" to find:
                        - Technical support documentation and Help Center articles.
                        - User walkthroughs or YouTube feature demos.
                        - Detailed product spec sheets or "feature comparison" pages.
                        2. Evidence-Driven Logic: Do not take marketing slogans at face value. Look for screenshots, specific UI mentions, or technical descriptions that prove a feature exists.
                        3. Strict Independence: Evaluate EACH requirement in the list below as a standalone item. The presence of one feature does not guarantee the presence of another.

                        SCORING RULES:
                        - 0 (Absent/No Evidence): Not mentioned, no evidence found across web sources, OR explicitly stated as not supported.
                        - 1 (Partial/Ambiguous): Feature is mentioned but lacks detail, is behind a "coming soon" tag, or is indirectly implied without clear documentation.
                        - 2 (Full Support): Clearly and fully supported with documented evidence, screenshots, or technical descriptions.

                        REQUIREMENTS TO SCORE:
                        {req_str}

                        STRICTURES:
                        - Prefer 0 over guessing: If you cannot find external proof or direct website mention, the score MUST be 0.
                        - No Hallucinations: Base scores ONLY on information found during the current search and the provided site.

                        OUTPUT FORMAT (STRICT JSON ONLY):
                        {{
                            "Req ID": score
                        }}

                        Return a flat JSON object mapping each Req ID to its integer score. No preamble. No explanations. No extra text.
                        """

                        chunk = client.chat.completions.create(
                            model="llama-3.3-70b-versatile",
                            messages=[
                                {
                                    "role": "system",
                                    "content": "You are a strict, evidence-based scoring engine for EdTech products. You do not guess and you always return valid JSON."
                                },
                                {"role": "user", "content": scoring_prompt}
                            ],
                            response_format={"type": "json_object"}
                        )

                        results["Scores"].update(json.loads(chunk.choices[0].message.content))

                    status.update(label="Evaluation Complete!", state="complete")

                conn = sqlite3.connect(DB_PATH)
                c = conn.cursor()
                meta_json = {k:v for k,v in results.items() if k != "Scores"}
                c.execute("INSERT INTO evaluations (app_name, url, metadata, scores) VALUES (?, ?, ?, ?)",
                          (app_name, app_url, json.dumps(meta_json), json.dumps(results["Scores"])))
                conn.commit()
                conn.close()
                st.success(f"Successfully added {app_name}!")
                st.rerun()
                
            except Exception as e:
                st.error(f"Error during evaluation: {e}")

#  LIST OF PLATFORMS 
st.divider()
st.subheader("Currently Tracked Platforms")

def delete_platform(platform_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("DELETE FROM evaluations WHERE id = ?", (platform_id,))
    conn.commit()
    conn.close()
    st.toast("Platform removed!")

# Fetch the full list
conn = sqlite3.connect(DB_PATH)
cursor = conn.execute("SELECT id, app_name, url FROM evaluations")
apps = cursor.fetchall()
conn.close()

if apps:
    for app_id, name, url in apps:
        with st.container(border=True):
            col_info, col_action = st.columns([4, 1.2])
            
            with col_info:
                st.markdown(f"**{name}**")
                st.caption(url)
            
            with col_action:
                with st.popover("Delete"):
                    st.warning(f"Are you sure you want to delete {name}?")
                    if st.button(f"Yes, Delete {name}", key=f"conf_{app_id}", type="primary", use_container_width=True):
                        delete_platform(app_id)
                        st.rerun()
else:
    st.info("The database is currently empty.")