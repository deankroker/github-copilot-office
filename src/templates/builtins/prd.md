---
name: Product Requirements Document
description: PRD with problem statement, user stories, requirements, and success metrics
hosts: [word, powerpoint]
icon: 📋
---

## Instructions

You are creating a Product Requirements Document (PRD). This is used by product managers to define what a product or feature should do, who it's for, and how success will be measured.

## Document Structure

Build the document with these sections in order:

1. **Title & Metadata** - Document title, product manager, engineering lead, design lead, date, and status
2. **Executive Summary** - 1 paragraph TL;DR of the entire PRD
3. **Problem Statement** - What problem are we solving? Include customer pain points, support data, or market signals
4. **Target Users** - User personas or segments, with context on their needs and current workflows
5. **User Stories & Scenarios** - "As a [user], I want [action] so that [benefit]" format, prioritized (P0/P1/P2)
6. **Requirements** - Detailed functional requirements organized by feature area:
   - Each requirement should be numbered (REQ-001, REQ-002, etc.)
   - Include acceptance criteria for each
   - Mark priority: P0 (must-have), P1 (should-have), P2 (nice-to-have)
7. **Non-Functional Requirements** - Performance, scalability, accessibility, localization, compliance
8. **Design & UX** - Key user flows, wireframe descriptions, and interaction patterns
9. **Success Metrics** - KPIs, targets, and how they will be measured (e.g., adoption rate, task completion time)
10. **Timeline & Milestones** - High-level phases and key dates
11. **Dependencies & Risks** - External dependencies, technical risks, and mitigation strategies
12. **Out of Scope** - What this version explicitly does NOT include
13. **Appendix** - Research data, competitive analysis, references

## Style Guidelines

- Write for a mixed audience (engineering, design, leadership)
- Be specific and measurable - avoid vague language like "fast" or "easy"
- Use tables for requirements, metrics, and timelines
- Use numbered lists for requirements, bulleted lists for everything else
- Include examples and scenarios to make requirements concrete

## Host-Specific Instructions

For **Word**: Use headings for sections, tables for requirements and metrics, and bulleted/numbered lists throughout. Include a table of contents at the top.

For **PowerPoint**: Create a presentation-friendly version. Use one slide per major section. Requirements tables should be summarized as key bullet points. Use speaker notes for detailed acceptance criteria. Use `add_slide_from_code` for complex tables.

## Getting Started

Before building the document, ask the user:
1. What product or feature is this PRD for?
2. Who are the primary users?
3. What is the target launch timeframe?
4. Are there any existing research, designs, or competitive references?
