---
name: Technical Spec
description: Technical specification document with architecture, APIs, and implementation details
hosts: [word, powerpoint]
icon: ⚙️
---

## Instructions

You are creating a Technical Specification document. This is a structured engineering document used to describe a system, feature, or service in enough detail for implementation.

## Document Structure

Build the document with these sections in order:

1. **Title & Metadata** - Document title, author, date, status (Draft/Review/Approved), and version
2. **Overview** - 2-3 paragraph summary of what is being built and why
3. **Background & Motivation** - Problem statement, current state, and why this work is needed
4. **Goals & Non-Goals** - Explicit bulleted lists of what this spec covers and what it intentionally excludes
5. **Proposed Solution** - Detailed technical design including:
   - Architecture overview
   - Key components and their responsibilities
   - Data models / schemas
   - API contracts (endpoints, request/response formats)
   - Sequence diagrams or flow descriptions
6. **Alternatives Considered** - Other approaches evaluated and why they were rejected
7. **Security & Privacy** - Authentication, authorization, data handling, and compliance considerations
8. **Testing Strategy** - Unit, integration, and end-to-end testing approach
9. **Rollout Plan** - Phased deployment, feature flags, monitoring, and rollback strategy
10. **Open Questions** - Unresolved items that need further discussion
11. **Appendix** - References, glossary, and supporting materials

## Style Guidelines

- Use precise, unambiguous technical language
- Include concrete examples for API contracts and data models
- Use tables for comparing options or listing fields
- Keep paragraphs focused - one idea per paragraph
- Use code blocks for schemas, API examples, and configuration

## Host-Specific Instructions

For **Word**: Use headings (H1 for title, H2 for sections, H3 for subsections), tables for structured data, and bulleted lists for goals/non-goals.

For **PowerPoint**: Create a presentation version with one section per slide. Use the title slide for metadata, bullet points for key details, and speaker notes for extended explanations. Use `add_slide_from_code` for slides with diagrams or tables.

## Getting Started

Before building the document, ask the user:
1. What system, feature, or service is this spec for?
2. Who is the target audience (team, org, external)?
3. Are there any existing documents or context to reference?
4. What is the current status (greenfield, migration, extension)?
