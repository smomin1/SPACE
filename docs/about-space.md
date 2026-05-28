# SPACE: A Plain-English Explanation

## What is SPACE?

SPACE stands for **Software Platform Analysis, Comparison, and Evaluation**. It
is a web application designed to help an organisation pick the right educational
technology platforms (EdTech) for its needs. Think of it as a structured way to
ask, score, compare, and document "which of these tools is actually worth
buying, and for which group of learners?"

EdTech procurement is harder than it looks. Vendors all claim to do everything,
the features sound similar on glossy marketing pages, and different people in
the organisation (curriculum leads, IT, accessibility experts, finance) value
different things. Without structure, decisions end up driven by whoever shouted
loudest in the last meeting. SPACE replaces that with a consistent process that
is fast, transparent, and audit-friendly.

---

## The two layers

SPACE has two complementary tools. They share the same underlying requirement
set but operate at different speeds and confidence levels.

### Layer 1: Tool Scanner (the fast triage)

Tool Scanner is the exploratory layer. You give it the name of a platform and
its website URL, and an AI agent goes off and reads everything publicly
available about it: the vendor website, product documentation, help centres,
app store listings, YouTube demos, third-party reviews, news articles. From
that evidence it produces a score (0 to 4) against every requirement in your
catalogue.

What you get is a quick, evidence-based estimate of how a platform stacks up,
delivered in minutes instead of weeks. Because the AI works only from public
information, it is naturally conservative: if it can't find proof of a feature,
it scores it zero. That makes the scores useful for filtering ("which of these
fifty platforms is worth a closer look?") even if they're not the final word.

Tool Scanner has four tabs:

* **Evaluator**: where you run a new scan and see your history of past scans.
* **Rankings**: every scanned platform ranked, filterable by grade level,
  fluency level, and requirement category.
* **Scoring Matrix**: a spreadsheet-style grid with every platform as a
  column and every requirement as a row; downloadable as Excel.
* **Categorical Analysis**: compare up to three platforms category-by-category
  to see which one is strongest where.

The scanner also respects **contexts** (more on those below): you can switch
into a context like "K-12 Reading Intervention" and everything reweights
according to that context's priorities.

### Layer 2: Tool Evaluator (the deliberate human review)

Tool Evaluator is the structured workflow your evaluators use when you've
narrowed the field and need authoritative judgement. Two teams score every
shortlisted platform independently:

* **Pedagogy Evaluators** look at the curriculum, learning design, content
  quality, accessibility, and educational soundness.
* **Technical Evaluators** look at APIs, data export, identity (SSO), hosting
  options, integration with your existing systems, and security.

Each team scores their part of the requirement set on a 0 to 4 scale, attaches
evidence (a trial run, a vendor demo, documentation, or a vendor claim), and
adds comments. Crucially, neither team sees the other team's scores during
this phase: this prevents one expert's opinion from anchoring the other.

When both teams are done, the evaluation moves into the merged state. Any
requirement where two evaluators disagreed by more than one point automatically
opens a **conflict thread**: a small discussion area where evaluators share
evidence, revisit their scores, and converge on agreement. Once every conflict
is resolved and all threads are closed, the evaluation is **finalised**: locked,
timestamped, and ready to feed the results dashboards.

The state machine, IN_PROGRESS to MERGED to FINALISED, is one-directional. To
reopen a finalised evaluation, an administrator must take explicit action and
record a reason; this creates a permanent audit trail entry.

---

## The Results dashboard

Once evaluations are finalised, the analytical work begins. The Results section
gives several lenses on the same data, all of which can be filtered by context,
category, or specific platforms.

* **Comparison**: a side-by-side weighted-score table of every platform.
  Pedagogy and Technical percentages are shown independently alongside the
  combined score, plus a recommendation tier (TOP_PICK, RECOMMENDED, CONSIDER,
  or NOT_RECOMMENDED). Platforms that have failed a Compliance Gate are flagged
  as DISQUALIFIED and excluded from comparisons.

* **Breakdown**: a per-platform, per-category profile. Useful for spotting
  exactly where a platform shines or falls short.

* **Best Fit**: probably the most powerful view. Instead of asking "which
  single platform is best?" it asks "what is the smallest combination of
  platforms that together covers the most requirements?" A greedy
  set-cover algorithm picks the lineup. This matters because in reality no
  single platform does everything, and procurement is often about
  complementing one strong tool with a second that fills the gap.

* **Build Readiness**: focuses on technical integration markers (APIs, LTI,
  data export, SSO, interoperability). Tells you which platforms are easiest
  to plug into the systems you already operate.

Every Results view can be exported as a PDF, Excel, or CSV. The PDF is a
polished, branded report suitable for sharing with leadership or external
stakeholders, complete with cover page, comparison table, category breakdown,
Best Fit recommendation, Build Readiness scores, and the full scoring matrix.

---

## Core concepts

A few building blocks make the whole system work. They are the levers that
administrators tune to fit their organisation.

**Requirements** are the criteria platforms are evaluated against. Each one has
a title, a longer description, a weight (HIGH, MEDIUM, or LOW), a category
(free-form, used for grouping in views), an evaluator type (PEDAGOGY,
TECHNICAL, or BOTH), and an optional Compliance Gate flag. Administrators
manage the master list and can bulk-import via Excel.

**Weights** convert raw scores into a weighted percentage. HIGH multiplies by
three, MEDIUM by two, LOW by one. This means a HIGH requirement scoring badly
hurts the overall percentage three times as much as a LOW requirement.

**Compliance Gates** are pass/fail requirements used for hard blockers: legal,
accessibility, data privacy, safety. A failure on any Compliance Gate
immediately marks the platform as DISQUALIFIED, regardless of how well it
scores everywhere else. This prevents you from accidentally recommending a
platform that, say, fails GDPR even though it has great curriculum content.

**Contexts** are named scenarios such as "Adult Beginner ESL", "K-12 Reading
Intervention", or "Corporate Compliance Training". A context filters which
requirements apply and can override the global weight of a requirement for
that scenario only. So "data export" might be HIGH globally but MEDIUM in the
K-12 Reading context where it matters less. Platforms can belong to multiple
contexts. Requirements can too. This lets one evaluation database serve very
different procurement questions.

**N/A scoring** is allowed. When a requirement genuinely does not apply to a
platform (or there's no way to score it confidently), the evaluator marks it
N/A. N/A scores are excluded from the weighted percentage entirely: they
neither help nor hurt the platform's score.

---

## Roles and who does what

SPACE has five roles, each with carefully scoped permissions.

* **Super Admin**: full control, including user account management. Usually
  the system owner.
* **Admin**: manages requirements, contexts, platforms, and evaluations. Sets
  up the catalogue and assigns evaluators.
* **Pedagogy Evaluator**: scores pedagogy-typed requirements during an
  evaluation. Sees only what they're assigned to score.
* **Technical Evaluator**: scores technical-typed requirements during an
  evaluation. Sees only what they're assigned to score.
* **Viewer**: read-only access. Can use Tool Scanner and explore Results, but
  cannot edit requirements, platforms, or scores. Useful for stakeholders who
  need visibility but no editorial control.

Permission checks happen at the database layer, not just in the UI, so role
boundaries are robust against client-side tampering.

---

## Data integrity and the audit trail

Every score submission is attributed to the user who made it and timestamped.
Edits never silently overwrite: each change creates a new audit log entry, so
the complete history of every score is preserved forever. Finalised evaluations
are locked, and any later writes return an error unless an administrator
explicitly reopens the evaluation with a reason. The whole point is that six
months later, you can explain exactly who decided what and why.

---

## What SPACE is not

SPACE is deliberately not a procurement platform, a vendor marketplace, or a
contract management system. It does not handle pricing negotiation, purchase
orders, or vendor onboarding. Its only job is to help you decide which
platforms to procure (or not). After SPACE produces a recommendation, the
actual buying happens through your normal procurement channels.

SPACE also does not capture in-app video or screen recordings of trials, run
automated scraping beyond the AI Tool Scanner's public-source audit, or offer
vendor-facing self-service. These are not in scope for the current version.

---

## A typical workflow

To make this concrete, here is what an organisation using SPACE typically does
over the course of a procurement cycle.

1. **Administrators** define the requirements once. They might enter twenty to
   eighty criteria covering pedagogy, content, accessibility, technical
   integration, and compliance. They mark a few as Compliance Gates (e.g.
   "complies with our data privacy policy"), assign weights, and group them
   into categories.

2. **Administrators** define one or more contexts that reflect the use cases
   the organisation cares about. Each context selects the applicable
   requirements and optionally overrides weights.

3. The team uses **Tool Scanner** to triage. Anyone can drop in a platform
   name and URL and get an AI-driven estimate in a few minutes. Over time the
   scanner builds up a library of evaluated platforms. Rankings and Best Fit
   views surface the most promising candidates.

4. For the shortlist, administrators create a formal **evaluation** and assign
   pedagogy and technical evaluators (often with a Team Lead on each side).

5. Evaluators independently score their slice of the requirements through
   **Tool Evaluator**. They attach evidence and comments. Once both teams
   submit, conflicts surface in threads and the team discusses until the
   scores converge.

6. The evaluation is **finalised**. It flows into Results.

7. Decision-makers consult Results, usually filtered by the specific context
   they care about, to compare platforms, identify the best single fit or the
   best combination of platforms, and export a PDF report to circulate.

8. The audit trail records exactly who scored what, when, and why.

---

## Who benefits

Curriculum teams get a structured language for talking about pedagogy with
their technical counterparts. IT and engineering teams get a way to surface
their integration concerns without being overruled by content priorities.
Procurement and finance get evidence-backed reports they can defend to
leadership. Leadership gets fast, comparable summaries of complex decisions.
And the organisation as a whole gets institutional memory: a year from now,
nobody has to redo the analysis from scratch when a new evaluation comes
around.

In short: SPACE turns EdTech procurement from a series of opinionated meetings
into a documented, repeatable, fair-to-everyone process.
