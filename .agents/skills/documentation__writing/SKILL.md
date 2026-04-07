---
name: documentation__writing
description: Creates, audits, restructures, and reviews technical documentation using the Diátaxis framework. Use when a user needs to write or reorganize tutorials, how-to guides, reference docs, explanation/concept pages, API docs, quickstarts/getting-started docs, installation guides, troubleshooting docs, or broader documentation structures.
tools:
  - Read
  - Grep
  - Glob
  - Edit
  - Write
model: opus
---

## When to use

Use this skill when a user needs to:
- write or improve a tutorial, how-to guide, reference page, or explanation page
- choose the correct Diátaxis type for a documentation request
- review or reorganize existing docs that mix multiple documentation types
- build or improve API docs, quickstarts, installation guides, troubleshooting content, or landing/readme docs
- design or restructure a documentation set, navigation, or information architecture

## Operating principles

- First determine the job:
  1. create or revise a page
  2. audit or reclassify existing docs
  3. plan or restructure a documentation set

- Ask clarifying questions only when critical information is missing and would materially change the output:
  - product or system being documented
  - audience and prior knowledge
  - desired outcome
  - available source material
  - version, environment, or scope

- If enough context already exists, proceed and state assumptions clearly instead of blocking on questions.

- Never invent technical facts, API behavior, parameters, defaults, outputs, prerequisites, or version details.
  - If information is missing, mark it as unknown, TODO, or assumption.
  - For reference documentation especially, prefer omission over fabrication.

- Keep one dominant documentation type per page.
  - If the user’s request is mixed, either split it into companion pages or choose the dominant type and link to the others.

---

## Step 1 — Identify the documentation type using the Diátaxis compass

Classify the request by answering two questions:

1. Does the content primarily guide **action** or inform **understanding/cognition**?
2. Is the user trying to **acquire** skill/knowledge or **apply** existing skill/knowledge?

Use the result:

| Action/Cognition | Acquire | Apply |
|---|---|---|
| **Action** | **Tutorial** | **How-to guide** |
| **Cognition** | **Explanation** | **Reference** |

### Common mappings for ambiguous requests

- **Quickstart / getting started**
  - Usually a **tutorial** for beginners
  - Sometimes an onboarding **how-to** for domain experts who want the fastest path to first success

- **Installation guide**
  - Usually a procedural **how-to** with setup, verification, and troubleshooting

- **Troubleshooting**
  - Usually a problem-focused **how-to**
  - May include reference-like symptom, error, or diagnostic facts

- **API documentation**
  - Usually **reference** for endpoints, methods, fields, errors, and schemas
  - Often needs companion **tutorials**, **how-tos**, and **explanations**

- **README / landing page / user guide**
  - Usually not a single Diátaxis type
  - Treat as a navigation or overview layer that routes users to the right tutorial, how-to, reference, or explanation pages

- **Release notes / changelog**
  - Not a core Diátaxis type
  - Treat as change communication support content

If uncertain, state the dominant user need in one sentence and choose the corresponding type.

---

## Step 2 — Apply type-specific patterns

### Tutorials (learning-oriented, action + acquisition)

**Purpose:** Provide a successful learning experience for a user who is at study.

**Prefer titles like:**
- Build your first X
- Create Y from scratch
- Get started with Z by building A

**Structure:**
1. What the user will accomplish
2. Audience
3. Prerequisites
4. Setup
5. Numbered steps
6. Expected result after each step
7. Final outcome
8. Next steps

**Rules:**
- Show the learner where they are going from the start
- Use small, concrete steps
- Deliver visible results early and often
- Tell the learner what they should notice
- Keep a narrative of expected results
- Minimise explanation
- Ignore options and alternatives unless absolutely necessary
- Choose the safest, surest path
- Link out to reference or explanation instead of digressing

**Validation:**
- A beginner can complete it end-to-end without external help
- Each step has a meaningful, visible outcome
- Unverified or fragile steps are clearly flagged rather than stated with false certainty

---

### How-to guides (problem-oriented, action + application)

**Purpose:** Help a user who is already at work solve one specific real-world problem or complete one task.

**Prefer titles like:**
- How to configure X
- How to deploy Y to Z
- How to troubleshoot A when B happens

**Structure:**
1. Goal or problem statement
2. When to use this guide
3. Assumptions / prerequisites
4. Recommended path
5. Numbered steps and decision points
6. Verification or expected result
7. Related reference / explanation links

**Rules:**
- Focus on one task or problem
- Assume baseline competence
- Action only: no teaching, no conceptual digressions
- Allow branches, conditional steps, and judgment when real-world complexity requires them
- Omit unnecessary completeness
- Prefer the most common or recommended path
- Mention alternatives only when they are materially useful

**Validation:**
- An experienced user can complete the task with minimal confusion or backtracking
- The guide handles likely pitfalls and relevant branches
- The task matches a real user goal, not merely a product capability

---

### Reference (information-oriented, cognition + application)

**Purpose:** Provide authoritative facts that users consult while working.

**Prefer titles like:**
- Configuration options
- API endpoints
- CLI flags
- `POST /users`
- `deploy` command

**Structure:**
Use a consistent schema that matches the thing being documented.

Examples:
- For APIs: name/operation, summary, method + endpoint, auth, parameters, request body, responses, errors, examples, limits, related pages
- For commands: command, syntax, options/flags, defaults, exit codes, examples, related commands
- For config: field/name, type, default, allowed values, description, examples, warnings

**Rules:**
- Describe and only describe
- Be neutral, precise, and consistent
- Mirror the structure of the product or machinery
- Make entries easy to scan
- Use standard patterns and predictable headings
- Include warnings, requirements, limits, and examples where appropriate
- Stamp version/scope when needed
- Never invent missing details

**Validation:**
- A user can find a specific fact in under 30 seconds
- There is no ambiguity about what is certain vs unknown
- The schema is consistent across entries

---

### Explanation (understanding-oriented, cognition + acquisition)

**Purpose:** Help the reader understand why something works the way it does.

**Prefer titles like:**
- How X works
- Understanding Y
- Why Z is designed this way
- Authentication vs authorization

**Structure:**
1. Topic or question
2. Context
3. Core idea
4. Why / design rationale / constraints
5. History, alternatives, and trade-offs
6. Implications
7. Related concepts

**Rules:**
- Focus on understanding, not execution
- Make connections across concepts
- Provide context and rationale
- Discuss alternatives, limits, and trade-offs
- Perspective and opinion are allowed when framed clearly as interpretation
- Do not turn it into a procedure or a spec

**Validation:**
- After reading, the user can explain the concept and its rationale in their own words
- The page clarifies the why, not just the what

---

## Step 3 — Handle audits and restructures explicitly

If the user gives existing documentation or asks to reorganize docs:

1. Inventory the pages or sections
2. Classify each page by dominant type:
   - tutorial
   - how-to
   - reference
   - explanation
   - support/other (README, quickstart, troubleshooting, release notes, etc.)
3. Flag mixed pages that combine multiple types
4. Identify missing content based on audience needs and user tasks
5. Propose a split/merge plan
6. Recommend navigation, cross-links, and priority order

When prioritizing, prefer:
- high-frequency or high-friction user tasks
- onboarding paths
- core reference gaps
- pages whose mixed types are causing confusion

---

## Step 4 — Maintain separation and integration

- Keep each page to one dominant type
- Cross-link companion pages:
  - tutorials → reference + explanation
  - how-tos → reference + explanation
  - reference → related how-tos and tutorials
  - explanation → relevant how-tos and reference
- Use consistent terminology, headings, and naming across the doc set
- Prefer plain language and accessible structure
- Put prerequisite knowledge near the start when it matters
- Landing pages and READMEs may summarize and route, but should not replace the underlying documentation types

---

## Step 5 — Validate before delivering

Check both functional quality and reader fit.

### Functional quality
- accurate
- precise
- internally consistent
- complete enough for its purpose
- current in scope/version where relevant
- explicit about unknowns
- examples align with stated behavior

### Reader-fit quality
- matches the audience’s prior knowledge
- anticipates confusion
- preserves flow
- supports the reader’s actual task or question
- does not force the reader to extract one documentation type from another

---

## Response behavior

When responding:
1. State the chosen mode and documentation type in one sentence
2. State any important assumptions if you are proceeding without clarifications
3. Deliver the documentation, audit, or restructure plan
4. When useful, recommend companion pages rather than overloading one page