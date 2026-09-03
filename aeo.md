# AEO Score Tool — Build Specification

> Feed this file to Claude Code as the project brief. It covers what to build, how to score it, and in what order.

---

## 1. Product Overview

Build a web tool that gives a brand/website an **AEO (Answer Engine Optimization) Score out of 100**, made up of two halves:

1. **Technical/On-Page Score (50%)** — crawls the website and checks how "AI-readable" it is.
2. **AI Visibility Score (50%)** — runs real prompts against live LLMs (ChatGPT, Claude, Perplexity, Gemini) and measures whether/how the brand is mentioned or cited.

Output: a single 0–100 score with letter grade (A–F), category breakdowns, a prioritized fix list, and (for the AI Visibility half) a competitor comparison.

---

## 2. Scoring Formula

```
AEO Score (100 pts)
├── Technical / Crawlability        25 pts
│     ├── robots.txt AI-bot access        8 pts
│     ├── llms.txt presence               5 pts
│     ├── sitemap + schema validity       7 pts
│     └── page speed / render-blocking    5 pts
│
├── Content Structure                25 pts
│     ├── FAQ / Q&A format presence       8 pts
│     ├── heading hierarchy + answerable
│     │   content format                  7 pts
│     ├── content depth & freshness       5 pts
│     └── author / E-E-A-T signals        5 pts
│
├── AI Visibility                    35 pts   ← highest weight (real outcome)
│     ├── Brand inclusion rate           10 pts
│     ├── Citation rate (URL cited)      10 pts
│     ├── Share of voice vs competitors  10 pts
│     └── Sentiment score                 5 pts
│
└── Trend / Consistency              15 pts
      ├── Score stability over 4 weeks  10 pts
      └── Competitor gap closing/widening 5 pts
```

**Grade scale:** A = 90–100% | B = 75–89% | C = 50–74% | D = 30–49% | F = <30%

---

## 3. Module A — Technical / On-Page Crawler

### What it does
Given a URL, crawl the full site (or a capped set of key pages for MVP) and run checks.

### Per-page data to extract
```
url, http_status
page_title, title_length
h1_text, h1_count
meta_description, meta_description_length
canonical_url, canonical_present
has_json_ld (bool), json_ld_types (list)
has_og_tags (bool), og_tags_missing (list)
has_twitter_cards (bool)
image_count, images_with_alt, images_without_alt
internal_link_count, external_link_count
word_count
has_author_info (bool)
has_date_signal (bool)
has_heading_hierarchy (bool)
has_faq_structure (bool)
has_cta (bool)
render_blocking_scripts_count
has_viewport_meta (bool)
mixed_content_found (bool)
```

### Site-level checks
- Fetch `/robots.txt` → check if `GPTBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`, `CCBot` are disallowed
- Fetch `/llms.txt` → present or not (if missing, auto-generate a template — see Module D)
- Fetch `/sitemap.xml` / `/sitemap_index.xml` → validate and parse
- Detect CMS (WordPress, HubSpot, Shopify, Webflow) via meta generator tags / script signatures

### Recommended schema by page type
| Page type | Recommended schema |
|---|---|
| Homepage | Organization + WebSite + WebPage |
| Blog post | BlogPosting + BreadcrumbList |
| Service page | Service + FAQPage (if FAQ present) |
| Product page | Product + Review |

### Output
- Per-page issue list (title/meta/H1/schema/content/technical), each tagged `HIGH / MEDIUM / LOW` priority
- Aggregate counts feeding the Technical (25 pts) and Content Structure (25 pts) score buckets

---

## 4. Module B — AI Visibility Tracker

### Core concept
Run a fixed set of **buyer-intent prompts** ("best CRM for startups", "top marketing agencies in Lucknow", etc.) against each LLM on a schedule, and record 4 things per prompt per engine:

1. Was the brand **named** (mention)?
2. Was the brand's site **cited** (URL/source)?
3. **How** was it described (sentiment)?
4. **Which competitors** appeared instead?

### Engines to support (MVP → later)
| Engine | Access method | Notes |
|---|---|---|
| ChatGPT | OpenAI API | Only ~31% of responses include a source link — rely on mention detection, not just links |
| Claude | Anthropic API | Very high mention rate (~97%) — good for brand-name detection |
| Perplexity | Perplexity API | ~77%+ responses include source links — easiest to citation-track |
| Gemini | Google AI API | Track both inline and sidebar-style citations |
| Google AI Overviews | No public API — scrape carefully or skip for MVP | Has two citation types: sidebar and in-response |

**Do not scrape ChatGPT/Perplexity web UIs directly — use official APIs only, to stay within ToS.**

### Metrics to compute per prompt-engine pair
```
mention_rate        → brand named / total prompts run
citation_rate        → brand URL cited / total prompts run
share_of_voice       → brand citations / total citations across all tracked brands
sentiment_score       → -100 to +100, classified by LLM-based sentiment classifier
prominence            → position of brand mention within the answer (early/mid/late)
```

### Sampling strategy
- MVP: run each prompt once per engine, weekly (cron job)
- Advanced: run each prompt 5–10x per engine to account for response variance (documented industry variance is 40–60% run-to-run) and report a confidence-weighted average
- Always show **trend over time**, not a single snapshot — AI answers change frequently

### Competitor gap analysis
For each prompt, build a table:
```
Prompt | Your brand cited? | Competitor A | Competitor B | Competitor C | None cited
```
Surface prompts where **no one is cited** (content gap opportunity) and prompts where **only competitors are cited** (priority fix).

---

## 5. Module C — Sentiment Classification

Use an LLM call itself to classify sentiment of any response segment that mentions the brand:

```
Prompt to classifier:
"Given this AI-generated answer, does it describe {brand} positively,
neutrally, or negatively? Respond with a score from -100 to 100 and
a one-sentence justification."
```
Store score per prompt-engine-week combination, average for the sentiment sub-score.

---

## 6. Module D — llms.txt Generator

If `/llms.txt` is missing, auto-generate a template from crawled data:

```markdown
# [Brand Name]

> [2-3 sentence summary pulled from homepage/about page]

## Key Pages
- [homepage URL]: [meta description or H1]
- [about URL]: About the company
- [services URL]: [description]
- [blog URL]: [description]

## Key Facts
- [fact 1]
- [fact 2]

## What We Do
[2-3 sentences on core services]

## Contact
- Website: https://[domain]
```

---

## 7. Dashboard / UI Requirements

- **Overall score card** — big number 0–100 + letter grade
- **Two sub-score gauges** — Technical Score vs AI Visibility Score
- **Radar or bar chart** — 4 category breakdown (Technical, Content, AI Visibility, Trend)
- **Trend line chart** — score over past weeks
- **Competitor comparison table** — share of voice bar chart per competitor
- **Prompt-level table** — every tracked prompt, which engines cited/mentioned the brand, sentiment
- **Prioritized fix list** — HIGH/MEDIUM/LOW issues with estimated fix effort
- **Export** — PDF/CSV report button
- **Alerts config** — email/Slack webhook when score drops >X% or a competitor overtakes

---

## 8. Suggested Tech Stack

```
Frontend:  React + Tailwind, charts via Recharts
Backend:   Node.js (Express) or Python (FastAPI)
Crawler:   Playwright or BeautifulSoup + requests
Prompt runner: scheduled cron job (node-cron / Celery) hitting official LLM APIs
Scoring engine: pure function applying Section 2 formula
Sentiment: LLM API call (see Module C)
Database:  PostgreSQL — tables: sites, scans, pages, prompts, prompt_results, competitors, scores_history
Alerts:    Webhook to Slack/email on score-change events
```

### Suggested DB schema (minimal)
```sql
sites(id, domain, created_at)
scans(id, site_id, scanned_at, technical_score, content_score, visibility_score, trend_score, total_score, grade)
pages(id, scan_id, url, title, meta_desc, h1, schema_types, word_count, issues_json)
prompts(id, site_id, prompt_text, created_at)
prompt_results(id, prompt_id, engine, run_at, brand_mentioned, brand_cited, sentiment_score, position, competitors_mentioned_json)
competitors(id, site_id, competitor_domain)
```

---

## 9. Build Order (MVP Roadmap)

1. **Phase 1 — Technical Crawler (1–2 weeks)**
   Site crawl → meta/schema/robots.txt/llms.txt checks → Technical + Content sub-scores.

2. **Phase 2 — AI Visibility Checker, manual trigger (2–3 weeks)**
   5–10 prompts × 4 engine APIs → mention/citation/sentiment detection → AI Visibility sub-score.

3. **Phase 3 — Scheduling + Trend + Competitors**
   Cron job for weekly runs, trend chart, competitor share-of-voice table.

4. **Phase 4 — Polish**
   Sentiment classifier refinement, auto content-gap recommendations, PDF export, alerts.

---

## 10. Notes / Constraints for Claude Code

- Only use **official LLM APIs** for prompt-running (OpenAI, Anthropic, Perplexity, Google). No scraping of chat UIs.
- Respect `robots.txt` when crawling target sites.
- Keep API keys in environment variables, never hardcoded.
- AI response variance is real — always label AI Visibility numbers as **directional/trend data**, not exact absolute counts, in the UI copy.
- Start with a small fixed prompt set (user-editable) rather than trying to auto-discover "all possible prompts" in MVP.