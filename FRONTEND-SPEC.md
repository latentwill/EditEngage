# EditEngage v2 — Frontend Specification

> Self-contained spec for building the EditEngage v2 frontend. This document contains everything needed to build the complete SvelteKit application from scratch.

---

## Project Setup

**Framework:** SvelteKit 2.x with Svelte 5 (runes mode — use `$state`, `$derived`, `$effect`)
**Components:** DaisyUI (Tailwind CSS component library)
**Styling:** Tailwind CSS 3.4+
**Icons:** Lucide Svelte
**Auth/DB:** Supabase JS client (@supabase/supabase-js)
**Font:** Inter (Google Fonts)
**Package manager:** bun

```bash
bunx sv create editengage --template skeleton --types typescript
cd editengage
bun add daisyui
bun add @supabase/supabase-js lucide-svelte
```

**This is a full rewrite.** The existing React/Vite code in this directory is v1 and should be replaced entirely with SvelteKit.

---

## Design System

### Theme: Glassmorphism

Dark mode is the default. Light mode is toggled via ThemeToggle component.

### Color Tokens

```css
/* Dark Mode (default) */
:root {
  --bg-primary: #0a0a0f;
  --bg-secondary: #12121a;
  --bg-tertiary: #1a1a2e;
  --text-primary: #ffffff;
  --text-secondary: #a0a0b0;
  --text-muted: #6b6b80;
  --accent: #34D399;           /* Emerald 400 */
  --accent-hover: #6EE7B7;    /* Emerald 300 */
  --accent-muted: #065F46;    /* Emerald 900 */
  --border: rgba(255, 255, 255, 0.12);
  --border-hover: rgba(255, 255, 255, 0.20);
  --glass-bg: rgba(255, 255, 255, 0.08);
  --glass-bg-hover: rgba(255, 255, 255, 0.12);
  --glass-blur: 20px;
  --glass-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
  --error: #EF4444;
  --warning: #F59E0B;
  --success: #34D399;
  --info: #3B82F6;
}

/* Light Mode */
.light {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-tertiary: #f0f1f3;
  --text-primary: #111111;
  --text-secondary: #555555;
  --text-muted: #999999;
  --accent: #10B981;           /* Emerald 500 */
  --accent-hover: #059669;     /* Emerald 600 */
  --accent-muted: #D1FAE5;    /* Emerald 100 */
  --border: rgba(0, 0, 0, 0.08);
  --border-hover: rgba(0, 0, 0, 0.15);
  --glass-bg: rgba(255, 255, 255, 0.70);
  --glass-bg-hover: rgba(255, 255, 255, 0.85);
  --glass-blur: 16px;
  --glass-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.06);
}
```

### Typography

```css
/* Font Family: Inter */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

body { font-family: 'Inter', system-ui, sans-serif; }

/* Scale */
--text-xs: 0.75rem;     /* 12px */
--text-sm: 0.875rem;    /* 14px */
--text-base: 1rem;      /* 16px */
--text-lg: 1.125rem;    /* 18px */
--text-xl: 1.25rem;     /* 20px */
--text-2xl: 1.5rem;     /* 24px */
--text-3xl: 1.875rem;   /* 30px */
--text-4xl: 2.25rem;    /* 36px */
--text-5xl: 3rem;       /* 48px — hero headline */
--text-6xl: 3.75rem;    /* 60px — hero headline large */
```

### Spacing

4px base unit. Use Tailwind spacing scale (4 = 1rem = 16px).

### Border Radius

```
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-2xl: 24px;
--radius-full: 9999px;
```

### Animations

All transitions: `300ms cubic-bezier(0.4, 0, 0.2, 1)` unless specified.

```css
/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Grain Overlay

Every page has a subtle noise texture overlay:

```svelte
<!-- GrainOverlay.svelte -->
<div class="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
  style="background-image: url('data:image/svg+xml,...'); background-repeat: repeat;" />
```

Use a 200x200 SVG noise pattern as inline data URI.

---

## Responsive Breakpoints

| Breakpoint | Width | Notes |
|------------|-------|-------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Small desktop |
| `xl` | 1280px | Desktop |
| `2xl` | 1440px | Large desktop |

Mobile-first approach. Design for 320px minimum width.

---

## Glassmorphism Component Primitives

### GlassCard

The foundational container. Used everywhere.

```svelte
<div class="
  backdrop-blur-[20px]
  bg-white/[0.08] dark:bg-white/[0.08]
  border border-white/[0.12]
  rounded-xl
  shadow-glass
  transition-all duration-300
  hover:bg-white/[0.12] hover:border-white/[0.20]
">
  <slot />
</div>
```

Props: `variant` (default, elevated, flat), `hover` (boolean), `padding` (sm, md, lg)

### GlassButton

```svelte
<!-- Primary -->
<button class="
  bg-emerald-500 hover:bg-emerald-400
  text-white font-medium
  px-6 py-3 rounded-lg
  transition-all duration-300
  hover:shadow-lg hover:shadow-emerald-500/25
  active:scale-[0.98]
">
  <slot />
</button>

<!-- Ghost -->
<button class="
  bg-white/[0.06] hover:bg-white/[0.12]
  border border-white/[0.08]
  text-white/80 hover:text-white
  px-6 py-3 rounded-lg
  transition-all duration-300
">
  <slot />
</button>
```

### GlassInput

```svelte
<input class="
  w-full px-4 py-3
  bg-white/[0.06]
  border border-white/[0.08]
  rounded-lg
  text-white placeholder:text-white/40
  focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40
  transition-all duration-300
" />
```

### Sidebar

Collapsible sidebar navigation replacing the fixed top GlassNav:

- **Expanded width:** 240px (w-60), **Collapsed width:** 64px (w-16)
- **Background:** DaisyUI `bg-base-200` with `border-r border-base-300`
- **Sections (top to bottom):**
  1. Project Switcher area (hidden when collapsed)
  2. Navigation menu (DaisyUI `menu menu-sm`)
  3. Collapse toggle button (chevrons left/right)
  4. Bottom section: ThemeToggle + User avatar
- **Collapse/expand:** Button at bottom, state persisted to localStorage
- **Navigation items:**
  - Dashboard (`/dashboard`) — LayoutDashboard icon
  - Workflows (`/dashboard/workflows`) — GitBranch icon
  - Write (expandable) — PenTool icon
    - Content Library (`/dashboard/write/content`) — FileText icon
    - Topics (`/dashboard/write/topics`) — ListChecks icon
  - Research (`/dashboard/research`) — Search icon
  - Publish (`/dashboard/publish`) — Send icon
  - Settings (`/dashboard/settings`) — Settings icon
- **Active state:** DaisyUI `active` class on current route link
- **Collapsed mode:** Icons only with DaisyUI tooltip showing label
- **Mobile:** Rendered inside a SidebarDrawer (overlay drawer component)

### SidebarDrawer

Mobile navigation wrapper for the Sidebar:

- Overlay drawer that slides in from the left
- Hamburger menu button triggers open
- Click outside or close button dismisses
- Contains the full Sidebar component inside

---

## Route Structure (SvelteKit)

```
src/routes/
├── +page.svelte                          # Landing page (public)
├── +layout.svelte                        # Root layout (GrainOverlay, theme script)
├── auth/
│   ├── login/+page.svelte                # Login (email/password + magic link)
│   ├── signup/+page.svelte               # Registration
│   └── callback/+page.server.ts          # Supabase auth callback
├── dashboard/
│   ├── +layout.svelte                    # Dashboard shell (Sidebar, Ticker, auth guard)
│   ├── +page.svelte                      # Dashboard overview
│   ├── workflows/
│   │   ├── +page.svelte                  # Workflow list
│   │   ├── new/+page.svelte              # Create workflow wizard
│   │   └── [id]/+page.svelte             # Workflow detail (runs, config, manual run)
│   ├── write/
│   │   ├── content/
│   │   │   ├── +page.svelte              # Content library (filterable list)
│   │   │   └── [id]/+page.svelte         # Content detail/editor (review, approve/reject)
│   │   └── topics/
│   │       └── +page.svelte              # Topic queue + variety memory
│   ├── research/
│   │   └── +page.svelte                  # Research tools (coming soon)
│   ├── publish/
│   │   └── +page.svelte                  # Publishing management (coming soon)
│   ├── content/+page.server.ts           # 301 redirect → /dashboard/write/content
│   ├── topics/+page.server.ts            # 301 redirect → /dashboard/write/topics
│   ├── pipelines/
│   │   ├── +page.server.ts              # 301 redirect → /dashboard/workflows
│   │   └── [id]/+page.server.ts         # 301 redirect → /dashboard/workflows/[id]
│   ├── programmatic/
│   │   ├── +page.svelte                  # Template list
│   │   ├── [id]/+page.svelte             # Template editor + generated pages
│   │   └── new/+page.svelte              # Create template
│   └── settings/
│       ├── +page.svelte                  # Project settings
│       ├── destinations/+page.svelte     # Manage destinations
│       ├── styles/+page.svelte           # Writing styles
│       ├── api-keys/+page.svelte         # API key management
│       └── team/+page.svelte             # Team members
```

---

## Page Specifications

### 1. Landing Page (`/`)

**Height:** Hero section is 92vh. Full page scrolls vertically.

**Sections (in scroll order):**

#### 1a. Hero (92vh)
- Large headline (text-5xl md:text-6xl, font-bold): "AI-Powered Content Operations"
- Subheadline (text-xl, text-secondary): Brief value proposition
- Two CTAs: "Get Started" (primary emerald button) + "Watch Demo" (ghost button)
- Three glass stat cards in a row below CTAs:
  - "10x Faster" / "Content Creation"
  - "4 Channels" / "Ghost, Social, Email, SEO"
  - "0 Manual" / "Fully Automated"
- Background: Subtle radial gradient from emerald-900/10 at center
- Floating abstract shapes (blur-3xl, opacity-20) with slow float animation

#### 1b. Feature Grid
- Section heading: "Everything you need to automate content"
- Two-column layout (lg): Left sticky header + description, Right scrolling icon grid
- 6 feature cards (GlassCard with icon + title + description):
  1. Workflow Builder — "Compose AI agent workflows"
  2. SEO Writer — "Generate optimized articles"
  3. Variety Engine — "Never repeat content"
  4. Multi-Channel — "Ghost, social, email, research"
  5. Content Review — "Human-in-the-loop approval"
  6. Programmatic SEO — "Scale landing pages"
- Below grid: A "display card" showing a mock workflow (Topic Queue -> Variety Engine -> Writer -> Publisher)

#### 1c. Productivity Block
- Dark section (bg-tertiary with grain)
- Three numbered steps (01, 02, 03):
  1. "Configure your workflow" — Select agents, set schedule
  2. "Let AI create content" — Watch it generate in real-time
  3. "Review and publish" — Approve, edit, or auto-publish
- Right side: 3D-perspective mockup window showing the dashboard UI
- Mockup has a title bar with traffic light dots, shows a workflow running

#### 1d. Pricing Bento Grid
- Section heading: "Simple, transparent pricing"
- Three-column bento layout (stacked on mobile):
  1. **Starter** (free) — 1 project, 5 workflow runs/month, 1 destination
  2. **Pro** ($29/mo) — Unlimited projects, unlimited workflow runs, all destinations, research agents
  3. **Team** ($79/mo) — Everything in Pro + team members, priority support, API access
- Each card: GlassCard with plan name, price, feature list, CTA button
- Pro card is highlighted (emerald border, "Most Popular" badge)

#### 1e. Footer
- Logo + tagline
- Links: Product, Docs, Pricing, Blog
- Social icons
- "Built with AI, for content creators"

**Mobile (< 640px):**
- Hero headline: text-3xl
- Stat cards: stack vertically
- Feature grid: single column
- Pricing: stack vertically
- Hamburger nav menu

---

### 2. Auth Pages (`/auth/login`, `/auth/signup`)

**Layout:** Centered card on gradient background. No Sidebar — standalone page.

**Login Page:**
- GlassCard (max-w-md centered)
- Logo at top
- Tab switcher: "Email" | "Magic Link"
- Email tab: Email input + Password input + "Sign In" button + "Forgot password?" link
- Magic Link tab: Email input + "Send Magic Link" button + success message
- Bottom: "Don't have an account? Sign Up" link
- Error states: red border on inputs, error message below form

**Signup Page:**
- Same layout as login
- Fields: Full Name + Email + Password + Confirm Password
- "Create Account" button
- Bottom: "Already have an account? Sign In" link

**Auth Flow (Supabase):**
```typescript
// Login
const { data, error } = await supabase.auth.signInWithPassword({ email, password });

// Magic Link
const { error } = await supabase.auth.signInWithOtp({ email });

// Signup
const { data, error } = await supabase.auth.signUp({
  email, password,
  options: { data: { full_name: name } }
});

// On auth state change -> redirect to /dashboard
```

**Callback (`/auth/callback`):**
- Server-side route that handles Supabase auth redirects (magic link, OAuth)
- Exchanges code for session, redirects to /dashboard

---

### 3. Dashboard Layout (`/dashboard/+layout.svelte`)

**Structure:**
```
┌───────────┬────────────────────────────────────────┐
│ Sidebar   │                                        │
│           │  <slot /> (page content, padded)       │
│ Dashboard │  p-6 max-w-7xl                        │
│ Workflows │                                        │
│ Write ▾   │                                        │
│  Content  │                                        │
│  Topics   │                                        │
│ Research  │                                        │
│ Publish   │                                        │
│ Settings  │                                        │
│           │                                        │
│ ◀ Collapse├────────────────────────────────────────┤
│ 🌙 👤    │ Command Ticker (fixed bottom)          │
└───────────┴────────────────────────────────────────┘
```

**Layout:** Flex row with Sidebar on the left and main content area as flex-1.

**Sidebar Navigation:**
- Collapsible sidebar (see Sidebar component above)
- Project Switcher rendered inside sidebar header
- Theme toggle and user avatar in sidebar footer

**Project Switcher:**
- Dropdown in the sidebar header (DaisyUI dropdown)
- Shows current project name + icon
- Lists all projects in the user's org
- "Create Project" option at bottom
- Switching projects reloads all dashboard data

**Auth Guard:**
- `+layout.server.ts` checks Supabase session
- No session -> redirect to `/auth/login`
- Session -> load user, org, projects
- Store current project in URL param or cookie

**Command Ticker:**
- Fixed bottom bar (h-10, z-30)
- Glass background (bg-black/60, backdrop-blur)
- Left: status dot (green = recent success, red = failure, yellow = in progress)
- Center: event text with timestamp ("Workflow 'Extndly SEO' completed - 1,842 words - 3s ago")
- Right: expand chevron icon
- Scroll animation: new events slide in from bottom, old slides out
- Click: opens notification center (slide-up panel)
- **Powered by Supabase real-time subscription on `events` table**

---

### 4. Dashboard Overview (`/dashboard`)

**Layout:** Responsive grid

**Row 1: Stat Cards (4 columns, md:2, sm:1)**
- GlassCard with:
  - Icon (Lucide) + label (text-sm, text-muted)
  - Value (text-3xl, font-bold)
  - Trend indicator (up/down arrow + percentage, colored green/red)
- Cards:
  1. Total Content (FileText icon)
  2. Published This Week (Globe icon)
  3. Pending Review (Clock icon)
  4. Active Workflows (Zap icon)

**Row 2: Two columns (lg)**

**Left: Recent Workflow Runs**
- GlassCard with header "Recent Runs"
- Table/list of last 5 runs:
  - Workflow name
  - Status badge (queued=gray, running=yellow/pulse, completed=green, failed=red)
  - Duration
  - Output link (if completed)
- "View All" link -> /dashboard/workflows

**Right: Content Awaiting Review**
- GlassCard with header "Needs Review" + count badge
- List of content items with status "in_review":
  - Title (truncated)
  - Workflow source
  - Created date
  - Quick actions: Approve (checkmark), Reject (X), View (eye)
- Empty state: "No content awaiting review" with check icon

**Row 3: Full width**

**Activity Feed**
- GlassCard with header "Activity"
- Reverse chronological list of events:
  - Event icon (color-coded by type)
  - Description text
  - Relative timestamp ("3 minutes ago")
  - Event types: workflow.started, workflow.completed, workflow.failed, content.created, content.published, topic.added
- **Real-time:** New events appear at top via Supabase subscription
- Load more button at bottom (pagination)

---

### 5. Workflows Page (`/dashboard/workflows`)

**Workflow List:**
- Header: "Workflows" + "Create Workflow" button (primary)
- Grid of workflow cards (2 columns lg, 1 mobile):
  - GlassCard per workflow
  - Workflow name (text-lg, font-semibold)
  - Description (text-sm, text-muted, 2-line clamp)
  - Agent badges: small pills showing agent types in order (e.g., "Topic Queue -> Variety -> Writer -> Ghost")
  - Schedule: cron description or "Manual only"
  - Status: Active/Paused toggle
  - Last run: status + timestamp
  - Actions: "Run Now" button, Edit (pencil icon), Delete (trash icon with confirmation)

**Empty State:** Illustration + "Create your first workflow" + button

---

### 6. Create Workflow Wizard (`/dashboard/workflows/new`)

**Multi-step wizard inside a centered GlassCard (max-w-2xl)**

**Step indicator at top:** 5 steps, numbered circles connected by lines. Current step highlighted in emerald. Completed steps have checkmarks.

**Step 1: Name & Description**
- Name input (required)
- Description textarea (optional)
- "Next" button

**Step 2: Select Agents**
- Agent selection with drag-to-reorder or numbered add
- Available agents shown as cards with icon + name + description:
  - Topic Queue
  - Variety Engine
  - SEO Writer
  - Research Agent
  - Content Reviewer
  - Ghost Publisher
  - Post Bridge Publisher
  - Email Publisher
- Selected agents appear as an ordered list on the right
- Each can be removed (X button) or reordered (drag handle)
- "Back" and "Next" buttons

**Step 3: Configure Each Agent**
- Accordion/tab for each selected agent
- Config fields depend on agent type:
  - **Topic Queue:** Strategy (select: highest_seo_score, oldest_first, random)
  - **Variety Engine:** Similarity threshold (slider 0-1, default 0.65), max mutations (number, default 5)
  - **SEO Writer:** Writing style (select from project styles), LLM model (select), SERP research (toggle)
  - **Research Agent:** Providers (multi-select: Perplexity, ChatGPT, Tavily, OpenRouter), query template (text), max sources per provider (number)
  - **Content Reviewer:** (no config — just holds for review)
  - **Ghost Publisher:** Destination (select from Ghost destinations)
  - **Post Bridge Publisher:** Destination (select from PostBridge destinations)
  - **Email Publisher:** Email box (select), recipients mode (subscriber_list or custom), template (select: newsletter, digest, minimal)
- Validation on each agent's config before allowing "Next"

**Step 4: Schedule & Review Mode**
- Schedule: Toggle "Enable Schedule" + cron expression input (with presets: daily, weekly, etc.)
- Review mode: Radio — "Auto-publish" or "Draft for Review"
- "Back" and "Next" buttons

**Step 5: Review & Save**
- Summary of all selections:
  - Name + description
  - Agent workflow (visual step list)
  - Schedule
  - Review mode
  - Destination
- "Create Workflow" button (primary)
- On save: POST /api/v1/projects/:projectId/workflows

---

### 7. Workflow Detail (`/dashboard/workflows/[id]`)

**Header:** Workflow name + status badge + "Run Now" button + Edit + Pause/Resume toggle

**Tabs: "Runs" | "Configuration"**

**Runs Tab:**
- Table of all workflow runs:
  - Status (badge with color)
  - Started at
  - Duration
  - Current step (if running — show progress "Step 2 of 4: variety_engine")
  - Output (link to content if completed)
  - Error (expandable if failed)
- **Live updates via Supabase real-time on `pipeline_runs` table**
- Running status shows animated progress bar

**Configuration Tab:**
- Read-only view of current config
- "Edit Workflow" button -> opens wizard pre-filled with current values

---

### 8. Content Library (`/dashboard/write/content`)

**Header:** "Content" + filter controls

**Filters (row of dropdowns/pills):**
- Status: All, Draft, In Review, Approved, Published, Rejected
- Type: All, Article, Landing Page, Social Post
- Workflow: All, [list of workflows]
- Sort: Newest, Oldest, Recently Published

**Content List:**
- Table or card list:
  - Title (clickable -> detail page)
  - Type badge (article, landing_page, social_post)
  - Status badge (color-coded: draft=gray, in_review=yellow, approved=blue, published=green, rejected=red)
  - Workflow source (or "Manual")
  - Created date
  - Published URL (if published — external link icon)
- Bulk actions bar (appears when checkboxes selected): Approve All, Reject All
- Pagination (limit/offset)

---

### 9. Content Detail (`/dashboard/write/content/[id]`)

**Layout:** Two-column (lg) — editor left, metadata right

**Left: Content Editor**
- Title input (editable, text-2xl)
- Body editor (rich text — use a simple textarea or Tiptap/ProseMirror integration)
- HTML preview toggle

**Right: Metadata Panel (GlassCard, sticky top)**
- Status badge (large)
- Workflow source + link
- Created / Updated dates
- Meta description (editable textarea)
- Tags (editable tag input)
- Published URL (if published)
- **Actions:**
  - If `in_review`: "Approve" (green), "Reject" (red with reason input)
  - If `approved`: "Publish Now" (sends to destination)
  - If `draft`: "Submit for Review"
  - "Delete" (destructive, with confirmation)

---

### 10. Topics Page (`/dashboard/write/topics`)

**Tabs: "Queue" | "Variety Memory"**

**Queue Tab:**
- Header: "Topic Queue" + "Add Topic" button + "Import" button (CSV/JSON)
- Filter pills: All, Pending, In Progress, Completed, Skipped
- Topic list (table):
  - Title
  - Keywords (pill badges)
  - SEO Score (colored bar: red < 30, yellow 30-70, green > 70)
  - Status badge
  - Actions: Skip (if pending), View Content (if completed)
- Add topic modal: Title + Keywords (tag input) + Notes (textarea) + "Add" button
- Import modal: File upload (CSV/JSON) + preview of parsed topics + "Import X Topics" button

**Variety Memory Tab:**
- Table of canonical lines:
  - Canonical line ("intent | entity | angle")
  - Linked content title (clickable)
  - Created date
- Search/filter input
- This is read-only

---

### 11. Research Page (`/dashboard/research`)

**Status:** Coming soon (placeholder)

**Layout:** Centered content with heading and description
- Heading: "Research" (text-2xl, font-bold)
- Description: "Research tools are coming soon"
- Search icon illustration
- Uses DaisyUI alert component for the coming soon message

---

### 12. Publish Page (`/dashboard/publish`)

**Status:** Coming soon (placeholder)

**Layout:** Centered content with heading and description
- Heading: "Publish" (text-2xl, font-bold)
- Description: "Publishing tools are coming soon"
- Send icon illustration
- Uses DaisyUI alert component for the coming soon message

---

### 13. Programmatic SEO (`/dashboard/programmatic`)

**Template List:**
- Header: "Programmatic SEO" + "Create Template" button
- Card grid of templates:
  - Template name
  - Slug pattern (code font)
  - Page count (generated / total)
  - Status summary (X draft, Y published)
  - Actions: Edit, Generate Pages, Delete

**Template Editor (`/dashboard/programmatic/[id]`):**
- Left: Template configuration form
  - Name input
  - Slug pattern input (with variable helper: click to insert {variable})
  - Sections editor:
    - Ordered list of sections (header, body, CTA, FAQ)
    - Each section: Name + Content template (textarea with variable insertion)
    - Add/remove/reorder sections
  - SEO config: Meta title pattern + Meta description pattern
- Right: Data source configuration
  - Type selector: CSV, JSON, Manual
  - CSV: File upload + column mapping
  - Manual: Table editor (add rows, define columns)
- Bottom: Preview panel
  - Select a data row -> shows rendered preview with variables substituted
- "Save Template" button

**Generated Pages (sub-section of template detail):**
- Table of generated pages:
  - Slug
  - Status (draft, published, archived)
  - SEO score
  - Published URL
  - Actions: Publish, Unpublish, View
- Bulk actions: Select all + Publish Selected / Unpublish Selected
- "Generate Pages" button (triggers workflow run)

---

### 14. Settings Pages (`/dashboard/settings/...`)

All settings pages share a sidebar layout:

```
┌──────────────┬──────────────────────────────┐
│ Settings Nav │  Settings Content             │
│              │                               │
│ > General    │  [Active section]             │
│   Destinations│                              │
│   Styles     │                               │
│   API Keys   │                               │
│   Team       │                               │
└──────────────┴──────────────────────────────┘
```

**General Settings:**
- Project name, description, domain, icon, color
- Default LLM model (OpenRouter model selector)
- Timezone selector
- Danger zone: Delete Project (red button with confirmation)

**Destinations:**
- List of configured destinations with type icon + name + status (active/inactive)
- "Add Destination" button -> modal with type selector (Ghost, PostBridge, Webhook)
- Ghost config: API URL + Admin API Key + "Test Connection" button
- PostBridge config: API Key + Account ID + "Test Connection"
- Webhook config: URL + Method (POST/PUT) + Headers (key-value editor)
- Each destination: Edit, Toggle Active/Inactive, Delete

**Writing Styles:**
- List of writing styles with name + tone
- "Create Style" button -> modal/page:
  - Name input
  - Tone input (e.g., "conversational", "authoritative")
  - Voice guidelines textarea
  - Avoid phrases (tag input — words/phrases the LLM should never use)
  - Example content textarea
- Edit/Delete each style

**API Keys:**
- List of configured external API keys:
  - OpenRouter API Key (masked, with show/hide toggle)
  - Ghost Admin API Key (per destination — managed in destinations)
  - Post Bridge API Key (per destination)
  - Perplexity API Key
  - OpenAI API Key
  - Tavily API Key
  - Brave Search API Key
- Each: masked input + Edit + "Test" button
- Keys are encrypted before storage

**Team:**
- List of organization members:
  - Name/email
  - Role badge (owner, admin, member)
  - Joined date
  - Actions: Change Role (admin only), Remove (admin only)
- "Invite Member" button -> email input + role selector

---

### 15. Notification Center

**Triggered by:** Clicking the Command Ticker

**Layout:** Slide-up panel from bottom (or slide-in from right on desktop)

**Content:**
- Header: "Notifications" + unread count + "Mark All Read" button
- List of notifications:
  - Icon (color-coded by event type)
  - Title (bold if unread)
  - Message body
  - Relative timestamp
  - Click to mark as read + navigate to relevant page
- Powered by Supabase real-time on `notifications` table

**Bell Icon Badge:**
- Red dot with unread count (max "99+")
- Disappears when all read

---

## API Integration

**Base URL:** `/api/v1` (SvelteKit server routes)

**Auth:** All API calls include Supabase JWT in Authorization header. SvelteKit server routes validate with `supabase.auth.getUser()`.

### Key Endpoints (consumed by frontend)

| Method | Path | Used By |
|--------|------|---------|
| GET | `/api/v1/projects` | Project switcher, settings |
| POST | `/api/v1/projects` | Create project |
| PATCH | `/api/v1/projects/:id` | Update project settings |
| DELETE | `/api/v1/projects/:id` | Delete project |
| GET | `/api/v1/projects/:id/workflows` | Workflow list |
| POST | `/api/v1/projects/:id/workflows` | Create workflow |
| GET | `/api/v1/workflows/:id` | Workflow detail |
| PATCH | `/api/v1/workflows/:id` | Update workflow |
| DELETE | `/api/v1/workflows/:id` | Delete workflow |
| POST | `/api/v1/workflows/:id/run` | Trigger workflow run -> returns `{ jobId }` |
| GET | `/api/v1/jobs/:id/status` | Poll job status |
| GET | `/api/v1/projects/:id/workflow-runs` | Run history |
| GET | `/api/v1/projects/:id/content` | Content library |
| GET | `/api/v1/content/:id` | Content detail |
| PATCH | `/api/v1/content/:id` | Update content (edit, approve, reject) |
| POST | `/api/v1/content/:id/publish` | Publish approved content |
| DELETE | `/api/v1/content/:id` | Delete content |
| POST | `/api/v1/content/bulk` | Bulk approve/reject |
| GET | `/api/v1/projects/:id/topics` | Topic queue |
| POST | `/api/v1/projects/:id/topics` | Add topic |
| POST | `/api/v1/projects/:id/topics/import` | Import topics (CSV/JSON) |
| PATCH | `/api/v1/topics/:id` | Update topic (skip, etc.) |
| GET | `/api/v1/projects/:id/variety-memory` | Variety memory viewer |
| GET | `/api/v1/projects/:id/destinations` | Destination list |
| POST | `/api/v1/projects/:id/destinations` | Add destination |
| PATCH | `/api/v1/destinations/:id` | Update destination |
| DELETE | `/api/v1/destinations/:id` | Delete destination |
| POST | `/api/v1/destinations/:id/test` | Test destination connection |
| GET | `/api/v1/projects/:id/writing-styles` | Writing style list |
| POST | `/api/v1/projects/:id/writing-styles` | Create writing style |
| PATCH | `/api/v1/writing-styles/:id` | Update writing style |
| DELETE | `/api/v1/writing-styles/:id` | Delete writing style |
| GET | `/api/v1/projects/:id/templates` | Template list |
| POST | `/api/v1/projects/:id/templates` | Create template |
| GET | `/api/v1/templates/:id` | Template detail |
| PATCH | `/api/v1/templates/:id` | Update template |
| POST | `/api/v1/templates/:id/generate` | Generate pages from template |
| GET | `/api/v1/templates/:id/pages` | Generated pages |
| POST | `/api/v1/generated-pages/bulk` | Bulk publish/unpublish |
| GET | `/api/v1/projects/:id/events` | Activity feed |
| GET | `/api/v1/notifications` | User notifications |
| PATCH | `/api/v1/notifications/read-all` | Mark all as read |
| GET | `/api/v1/projects/:id/stats` | Dashboard stat cards |

### Response Envelope

```typescript
// Success
{ data: T, meta?: { total, limit, offset } }

// Error
{ error: { code: string, message: string, details?: Record<string, unknown> } }
```

---

## Supabase Real-Time Subscriptions

The frontend subscribes to 4 tables for live updates:

```typescript
// In dashboard layout onMount
const channel = supabase
  .channel('dashboard-realtime')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'events',
    filter: `project_id=eq.${currentProjectId}`
  }, handleEvent)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'pipeline_runs',
    filter: `pipeline_id=in.(${pipelineIds})`
  }, handleRunUpdate)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'content',
    filter: `project_id=eq.${currentProjectId}`
  }, handleContentChange)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, handleNotification)
  .subscribe();
```

---

## State Management

Use Svelte 5 runes (`$state`, `$derived`, `$effect`) and SvelteKit's built-in `load` functions.

**Global State (stores):**
- `currentProject` — Selected project from switcher (persisted in cookie)
- `user` — Current authenticated user
- `notifications` — Unread notification count
- `tickerEvent` — Latest event for command ticker

**Per-Page Data:**
- Use SvelteKit `+page.server.ts` load functions to fetch data server-side
- Use `invalidateAll()` or granular `invalidate()` for re-fetching after mutations

---

## Accessibility Requirements (WCAG 2.1 AA)

- All text meets 4.5:1 contrast ratio
- Focus states visible on ALL interactive elements (2px emerald ring)
- Skip link at top of page ("Skip to main content")
- ARIA landmarks: nav, main, aside, footer
- ARIA labels on all icon-only buttons
- Modal focus trapping
- Keyboard navigable: Tab through all interactive elements
- Reduced motion: `prefers-reduced-motion` disables all animations
- Screen reader: All images have alt text, status changes announced via live region

---

## Theme Toggle Implementation

**No flash (FOUC):** Inline script in `app.html` `<head>`:

```html
<script>
  (function() {
    const theme = localStorage.getItem('theme') ||
      (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  })();
</script>
```

**ThemeToggle component:**
- Sun/Moon icon button in Sidebar footer
- Toggles `dark`/`light` class on `<html>`
- Persists to `localStorage`
- 300ms transition on `background-color`, `color`, `border-color`

---

## Skeleton Loading States

Every data-dependent section shows a skeleton loader while data is loading:

```svelte
{#if loading}
  <div class="animate-pulse space-y-3">
    <div class="h-4 bg-white/[0.08] rounded w-3/4"></div>
    <div class="h-4 bg-white/[0.08] rounded w-1/2"></div>
    <div class="h-32 bg-white/[0.08] rounded"></div>
  </div>
{:else}
  <!-- actual content -->
{/if}
```

---

## Error Handling

- Form validation: Inline errors below fields (red text, red border)
- API errors: Error banner at top of page or inline in the relevant section
- Network errors: "Connection lost" banner with retry button
- 404: Custom "not found" page with "Go to Dashboard" link
- Auth expired: Redirect to /auth/login with "Session expired" message

---

## Build Phases

### Phase 1: Foundation
- SvelteKit project setup + Tailwind + DaisyUI
- Design system components: GlassCard, GlassButton, GlassInput, Sidebar, GrainOverlay
- ThemeToggle with persistence + no-FOUC
- Landing page (all 5 sections)
- Auth pages (login, signup, magic link, callback)
- Auth guard on /dashboard routes
- Responsive at all breakpoints

### Phase 2: Dashboard Shell + Data Layer
- Dashboard layout (Sidebar, Command Ticker, Project Switcher)
- Dashboard overview page (stat cards, recent runs, content review, activity feed)
- Supabase real-time subscriptions
- Notification center
- Settings pages (General, Destinations, Writing Styles)
- Project CRUD

### Phase 3: Core Features
- Workflow list + detail pages
- Create Workflow wizard (5-step)
- Workflow execution (manual run, status polling, live progress)
- Content library (filterable, sortable)
- Content detail/editor (review, approve, reject, edit)
- Bulk actions

### Phase 4: Advanced Features
- Topic queue management (add, import, skip, view)
- Variety memory viewer
- Programmatic SEO template editor
- Generated pages list + bulk publish
- Research query management
- Team settings

---

*Spec version: 1.1*
*Created: 2026-02-14*
*Updated: 2026-02-19 — Sidebar navigation, Workflows rename, route restructuring*
*Source: DESIGN.md, REQUIREMENTS.md, API-DESIGN.md, DATA-MODEL.md*
*Target: SvelteKit 2.x + Svelte 5 + DaisyUI + Tailwind CSS + Supabase*
