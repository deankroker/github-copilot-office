---
name: Weekly Update
description: Team status report with accomplishments, plans, and blockers
hosts: [word, powerpoint]
icon: 📅
---

## Instructions

You are creating a Weekly Update document. This is a concise status report used by teams to communicate progress, plans, and blockers to stakeholders and leadership.

## Document Structure

Build the document with these sections in order:

1. **Title & Date** - "Weekly Update - [Team/Project Name] - [Date Range]"
2. **TL;DR** - 2-3 sentence summary of the most important things from this week
3. **Key Metrics** (if applicable) - 3-5 top-line numbers with trend indicators (up/down/flat)
4. **Accomplishments** - What was completed this week:
   - Use bullet points, one per accomplishment
   - Be specific: include what shipped, what was decided, what was unblocked
   - Link to relevant documents, PRs, or tickets where helpful
5. **In Progress** - What's actively being worked on:
   - Current status and expected completion
   - Any notable updates or changes in scope
6. **Upcoming** - What's planned for next week:
   - Key deliverables and milestones
   - Important meetings or reviews
7. **Blockers & Risks** - Issues that need attention:
   - What is blocked and by whom
   - Risks that could impact upcoming work
   - Specific asks or help needed
8. **Highlights & Wins** (optional) - Team shout-outs, customer wins, or notable achievements
9. **Action Items** - Clear owner + action + due date for follow-ups

## Style Guidelines

- Keep it brief - the entire update should be scannable in 2 minutes
- Use bullet points throughout, not paragraphs
- Be specific with status: "Completed code review for auth service" not "Made progress on auth"
- Use RAG status (Red/Amber/Green) for project health where appropriate
- Bold the most important items so readers can skim
- Include dates and owners for action items

## Host-Specific Instructions

For **Word**: Use a clean single-page format. H2 headings for each section. Bulleted lists throughout. Consider using a table for metrics and action items. Keep the total length to 1-2 pages.

For **PowerPoint**: Create a compact deck (3-5 slides max). Slide 1: TL;DR + Metrics. Slide 2: Accomplishments + In Progress. Slide 3: Upcoming + Blockers. Slide 4 (optional): Highlights. Use `add_slide_from_code` for metric dashboards or tables.

## Getting Started

Before building the update, ask the user:
1. What team or project is this update for?
2. What date range does it cover?
3. What were the key accomplishments this week?
4. Are there any blockers or risks to highlight?
