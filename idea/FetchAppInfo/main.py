import streamlit as st
import streamlit_authenticator as stauth
import yaml
from yaml.loader import SafeLoader

st.set_page_config(page_title="EdTech Evaluation Pipeline", layout="wide")

with open('config.yaml') as file:
    config = yaml.load(file, Loader=SafeLoader)

#  AUTHENTICATOR 
authenticator = stauth.Authenticate(
    config['credentials'],
    config['cookie']['name'],
    config['cookie']['key'],
    config['cookie']['expiry_days']
)

#  LOGIN 
authenticator.login(location='main')
#  AUTH STATE 
if st.session_state.get("authentication_status"):

    authenticator.logout('Logout', 'sidebar')
    st.sidebar.write(f"Welcome, {st.session_state.get('name')}!")

    #  NAVIGATION 
    pages = {
        "Layer 1: Automated AI Filter": [
            st.Page("pages/Layer_1/0_Evaluator.py", title="Evaluator"),
            st.Page("pages/Layer_1/1_Reporting.py", title="Reporting"),
            st.Page("pages/Layer_1/2_Scoring_Matrix.py", title="Scoring Matrix"),
            st.Page("pages/Layer_1/3_Categorical_Analysis.py", title="Categorical Analysis"),
        ],
        "Layer 2: Human Validation": [
            st.Page("pages/Layer_2/0_Layer_2_Form.py", title="Layer 2 Form"),
            st.Page("pages/Layer_2/1_Layer_2_Management.py", title="Management"),
            st.Page("pages/Layer_2/2_Layer_2_Reporting.py", title="Reporting"),
            st.Page("pages/Layer_2/3_Layer_2_Scoring_Matrix.py", title="Scoring Matrix"),
            st.Page("pages/Layer_2/4_Layer_2_Compare_Layers.py", title="Compare Layers"),
            st.Page("pages/Layer_2/5_Layer_2_Categorical_Analysis.py", title="Categorical Analysis"),
        ]
    }

    pg = st.navigation(pages)
    pg.run()

elif st.session_state.get("authentication_status") is False:
    st.error('Username/password is incorrect')

elif st.session_state.get("authentication_status") is None:
    st.warning('Please enter your username and password')