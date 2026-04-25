# ResumeIQ AI — Full App Copilot Prompt
## Next.js + Firebase Auth + Firestore + WebGL Landing Page

---

## SYSTEM CONTEXT

You are an expert full-stack engineer. Build **ResumeIQ AI** — a complete multi-page web application with:
- A stunning WebGL animated landing page
- Firebase Authentication (email/password + Google OAuth)
- Firestore database for storing resume analysis history
- A dashboard for authenticated users
- Resume upload + AI analysis page
- Full shadcn/ui component library with dark theme

This is a **Next.js 14 App Router** project using TypeScript, Tailwind CSS, and shadcn/ui.

---

## TECH STACK

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | Firebase Authentication |
| Database | Firestore (Firebase) |
| Storage | Firebase Storage (resume files) |
| 3D/WebGL | Three.js |
| Animation | Framer Motion |
| Icons | Lucide React |
| AI Backend | FastAPI (existing — call `http://localhost:8000`) |
| Package Manager | npm |

---

## PROJECT SETUP COMMANDS

```bash
npx create-next-app@latest resumeiq --typescript --tailwind --eslint --app --src-dir
cd resumeiq
npx shadcn@latest init
npx shadcn@latest add button card input label badge progress separator tabs toast dialog sheet avatar dropdown-menu
npm install three @types/three framer-motion firebase @radix-ui/react-slot class-variance-authority lucide-react react-markdown
```

---

## FOLDER STRUCTURE

```
resumeiq/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout with providers
│   │   ├── page.tsx                      # Landing page (WebGL)
│   │   ├── globals.css                   # Global styles + dark theme
│   │   │
│   │   ├── auth/
│   │   │   ├── login/page.tsx            # Login page
│   │   │   └── signup/page.tsx           # Signup page
│   │   │
│   │   ├── dashboard/
│   │   │   ├── layout.tsx                # Dashboard layout (protected)
│   │   │   ├── page.tsx                  # Dashboard home
│   │   │   ├── analyze/page.tsx          # Resume upload + analysis
│   │   │   └── history/page.tsx          # Past analyses from Firestore
│   │   │
│   │   └── api/
│   │       └── analyze/route.ts          # Next.js API route (proxies to FastAPI)
│   │
│   ├── components/
│   │   ├── ui/                           # shadcn components (auto-generated)
│   │   │   ├── web-gl-shader.tsx         # WebGL Three.js shader component
│   │   │   └── liquid-glass-button.tsx   # Liquid glass button component
│   │   │
│   │   ├── landing/
│   │   │   ├── HeroSection.tsx           # WebGL hero with headline + CTA
│   │   │   ├── FeaturesSection.tsx       # Feature cards section
│   │   │   ├── HowItWorks.tsx            # 3-step process section
│   │   │   └── Navbar.tsx                # Landing navbar
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx             # Login form component
│   │   │   ├── SignupForm.tsx            # Signup form component
│   │   │   └── AuthGuard.tsx             # Route protection wrapper
│   │   │
│   │   ├── dashboard/
│   │   │   ├── DashboardNav.tsx          # Top nav with user avatar/logout
│   │   │   ├── Sidebar.tsx               # Left sidebar navigation
│   │   │   ├── ScoreCard.tsx             # Score ring + breakdown bars
│   │   │   ├── FeedbackPanel.tsx         # Markdown feedback renderer
│   │   │   ├── UploadZone.tsx            # Drag-and-drop file uploader
│   │   │   └── HistoryCard.tsx           # Past analysis card
│   │   │
│   │   └── providers/
│   │       ├── AuthProvider.tsx          # Firebase auth context
│   │       └── ThemeProvider.tsx         # Dark theme provider
│   │
│   ├── lib/
│   │   ├── firebase.ts                   # Firebase initialization
│   │   ├── firestore.ts                  # Firestore CRUD helpers
│   │   ├── storage.ts                    # Firebase Storage helpers
│   │   └── utils.ts                      # shadcn cn() utility
│   │
│   └── hooks/
│       ├── useAuth.ts                    # Auth state hook
│       └── useAnalysis.ts               # Analysis state/logic hook
│
├── .env.local                            # Firebase config (template)
└── middleware.ts                         # Next.js route protection
```

---

## FIREBASE SETUP (`src/lib/firebase.ts`)

```typescript
import { initializeApp, getApps } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const googleProvider = new GoogleAuthProvider()
```

---

## .ENV.LOCAL TEMPLATE

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## FIRESTORE SCHEMA

### Collection: `users/{uid}`
```typescript
{
  uid: string,
  email: string,
  displayName: string,
  photoURL: string | null,
  createdAt: Timestamp,
  totalAnalyses: number
}
```

### Collection: `analyses/{analysisId}`
```typescript
{
  id: string,                         // UUID
  userId: string,                     // Firebase UID
  fileName: string,
  fileSize: number,
  targetRole: string | null,
  totalScore: number,
  scores: {
    skills_completeness: number,
    experience_clarity: number,
    ats_keyword_density: number,
    formatting_quality: number,
    education_relevance: number
  },
  weakAreas: string[],
  feedback: string,                   // markdown string
  suggestions: string[],
  parsedName: string,
  parsedEmail: string,
  createdAt: Timestamp
}
```

---

## FIRESTORE HELPERS (`src/lib/firestore.ts`)

Implement these functions:

```typescript
// Save new analysis result
export async function saveAnalysis(userId: string, data: AnalysisResult): Promise<string>

// Get all analyses for a user (ordered by createdAt desc)
export async function getUserAnalyses(userId: string): Promise<Analysis[]>

// Get single analysis by ID
export async function getAnalysis(analysisId: string): Promise<Analysis | null>

// Delete an analysis
export async function deleteAnalysis(analysisId: string): Promise<void>

// Create/update user profile
export async function upsertUser(user: FirebaseUser): Promise<void>
```

---

## MIDDLEWARE (`middleware.ts`)

```typescript
// Protect /dashboard/* routes
// Redirect unauthenticated users to /auth/login
// Redirect authenticated users away from /auth/* to /dashboard
// Use Firebase session cookie or client-side check with next-firebase-auth
```

Use `next/server` middleware to check for the Firebase auth session token cookie.
Redirect `/` authenticated users to `/dashboard`.
Redirect unauthenticated users trying to access `/dashboard/*` to `/auth/login`.

---

## PAGE 1 — LANDING PAGE (`src/app/page.tsx`)

### Design Direction
**Dark, editorial, futuristic** — the WebGL shader fills the entire viewport as background. Content is layered on top with glassmorphism cards.

### Sections

#### Hero Section (`components/landing/HeroSection.tsx`)
- Full viewport height
- `WebGLShader` component as fixed background (already provided — copy to `components/ui/web-gl-shader.tsx`)
- Centered content layered above with `z-10 relative`:
  ```
  [Pill badge] — "AI-Powered Resume Intelligence"
  [H1] — "Your Resume,  
           Perfected by AI"
  [Subtext] — "Upload once. Get structured scores, section feedback, and ATS optimization suggestions — instantly."
  [Green pulse dot] — "Available for free"
  [Two CTAs]:
    - LiquidButton "Analyze My Resume →" → links to /auth/signup
    - Ghost button "See How It Works" → scrolls to #how-it-works
  ```
- Add staggered entrance animations using Framer Motion (fade up, delay per element)
- Glassmorphism stat strip below headline: "500+ Resumes Analyzed | 92% ATS Score Avg | 3s Analysis Time"

#### Features Section (`components/landing/FeaturesSection.tsx`)
- Dark section with subtle grid background
- Section title: "Everything your resume needs"
- 6 feature cards in a 3x2 grid (glassmorphism style, dark border):
  1. 🎯 ATS Score — "Know exactly how recruiter filters see you"
  2. 🔍 Section Analysis — "Feedback on every bullet point"
  3. ⚡ Instant Results — "Analysis in under 5 seconds"
  4. 📝 Rewrite Suggestions — "AI rewrites weak bullets for you"
  5. 🔑 Keyword Gaps — "See what skills you're missing"
  6. 📊 Score History — "Track improvement over time"

#### How It Works (`components/landing/HowItWorks.tsx`)
- ID: `how-it-works`
- 3 steps with connecting line:
  1. Upload → "Drop your PDF or DOCX"
  2. Analyze → "AI parses + scores in seconds"
  3. Improve → "Get actionable feedback"
- Each step has an icon, number badge, title, and description

#### Footer
- Dark with logo, tagline, links: Privacy, Terms, GitHub
- Copyright line

### Navbar (`components/landing/Navbar.tsx`)
- Transparent on top, dark blur on scroll
- Logo: "ResumeIQ" in green (`#10B981`)
- Links: Features, How It Works, Login, "Get Started" (green button)
- Sticky with `position: fixed`

---

## PAGE 2 — LOGIN (`src/app/auth/login/page.tsx`)

### Design
- Full page dark background with subtle noise texture
- Centered card (max-w-md) with glassmorphism effect
- Logo at top

### LoginForm (`components/auth/LoginForm.tsx`)

```
[Logo + "ResumeIQ"]
[H2] "Welcome back"
[Subtext] "Sign in to your account"

[Google Sign In Button] — full width, white bg with Google icon
[Divider] — "or continue with email"

[Email input] — with Mail icon
[Password input] — with Eye toggle
[Forgot password link] — right aligned

[Sign In Button] — green, full width, loading state

[Bottom link] "Don't have an account? Sign up →"
```

### Behavior
- Use `signInWithEmailAndPassword` from Firebase
- Use `signInWithPopup` with `googleProvider` for Google login
- On success → redirect to `/dashboard`
- Show toast on error (wrong password, user not found, etc.)
- Form validation with inline error messages

---

## PAGE 3 — SIGNUP (`src/app/auth/signup/page.tsx`)

### SignupForm (`components/auth/SignupForm.tsx`)

```
[Logo + "ResumeIQ"]
[H2] "Create your account"
[Subtext] "Start analyzing resumes for free"

[Google Sign Up Button]
[Divider]

[Full Name input]
[Email input]
[Password input] — with strength indicator
[Confirm Password input]

[Sign Up Button] — green, full width

[Bottom link] "Already have an account? Sign in →"
[Terms text] "By signing up you agree to our Terms and Privacy Policy"
```

### Behavior
- Use `createUserWithEmailAndPassword`
- After creation: call `updateProfile` to set `displayName`
- Call `upsertUser()` to create Firestore user doc
- Redirect to `/dashboard`

---

## PAGE 4 — DASHBOARD HOME (`src/app/dashboard/page.tsx`)

### Layout (`src/app/dashboard/layout.tsx`)
- Wrap in `AuthGuard` — redirect to login if not authenticated
- Left sidebar (256px) + main content area
- Dark theme throughout (`bg-[#0A0A0F]`)

### Sidebar (`components/dashboard/Sidebar.tsx`)
```
[Logo] "ResumeIQ"

Navigation:
- 🏠 Dashboard (active state)
- 📄 Analyze Resume
- 📋 History
- ⚙️ Settings (placeholder)

Bottom:
- User avatar + name + email
- Logout button
```

### Dashboard Home Content
- Welcome greeting: "Good morning, {firstName} 👋"
- Stats row (3 cards):
  - Total Analyses
  - Best Score (highest totalScore ever)
  - Latest Score
- "Recent Analyses" section — last 5 from Firestore as `HistoryCard` list
- Empty state if no analyses: illustration + "Analyze your first resume" CTA button

---

## PAGE 5 — ANALYZE RESUME (`src/app/dashboard/analyze/page.tsx`)

### Layout
- Two-column on desktop: Upload panel (left) + Results panel (right)
- Single column on mobile

### Upload Zone (`components/dashboard/UploadZone.tsx`)
```
[Card with dashed border]
  Drag and drop area:
  - Upload icon
  - "Drop your resume here, or click to browse"
  - "Accepted: .pdf, .docx · Max 5 MB"
  
[File preview row when file selected]:
  - File icon + name + size
  - Clear button (X)

[Target Role Input]:
  - Label: "Target Role (optional)"
  - Placeholder: "e.g. Senior ML Engineer"

[Analyze Resume Button] — green, full width
  - Loading state: spinner + "Analyzing..."
  - Disabled when no file selected
```

### Results Panel — shown after analysis completes

#### Score Dashboard (`components/dashboard/ScoreCard.tsx`)
```
[Card: "Score Breakdown"]
  Subtext: "These numbers come from deterministic rules — skills breadth, bullet quality, keyword match, section coverage, education level."
  
  [Large circular ring] — total score (animate on mount)
  Color: green ≥80, yellow 60–79, red <60
  
  [5 progress bars]:
  - Skills Completeness
  - Experience Clarity
  - ATS Keyword Density
  - Formatting Quality
  - Education Relevance
  Each bar animates from 0 to value on mount
  
  [Weak Areas] — red badge tags
```

#### Feedback Panel (`components/dashboard/FeedbackPanel.tsx`)
```
[Tabs: "AI Feedback" | "Suggestions" | "Raw Parse"]

Tab 1 — AI Feedback:
  Render markdown using react-markdown
  Sections: Skills, Experience, Education, Projects
  Each section collapsible

Tab 2 — Suggestions:
  Numbered list of 5–7 improvement items
  Each item has:
  - Priority badge (High/Medium/Low)
  - Copy button
  - "Improve This Section" button → calls POST /improve

Tab 3 — Raw Parse:
  JSON tree view of parsed resume data
  Collapsible sections
```

#### Save to History
- After analysis completes, auto-save to Firestore via `saveAnalysis()`
- Show toast: "Analysis saved to history"

---

## PAGE 6 — HISTORY (`src/app/dashboard/history/page.tsx`)

### Layout
- Full page list of past analyses
- Search bar at top (filter by file name or date)
- Sort by: Date, Score (dropdown)

### HistoryCard (`components/dashboard/HistoryCard.tsx`)
```
[Card row for each analysis]:
  Left: File icon + file name + date
  Middle: Target role badge (if set)
  Right: Score badge (colored by range) + "View" button + Delete button

[Click on card / View button]:
  Open a Sheet (shadcn) from right side
  Show full ScoreCard + FeedbackPanel for that analysis
```

### Empty State
- Illustration + "No analyses yet" + "Analyze your first resume" button

---

## AUTH PROVIDER (`components/providers/AuthProvider.tsx`)

```typescript
// Context provides:
interface AuthContextType {
  user: FirebaseUser | null
  loading: boolean
  signOut: () => Promise<void>
}

// useAuth hook:
export function useAuth(): AuthContextType
```

- Wrap entire app in `AuthProvider` inside `src/app/layout.tsx`
- Listen to `onAuthStateChanged`
- Store user in context state

---

## AUTH GUARD (`components/auth/AuthGuard.tsx`)

```typescript
// Client component
// If loading: show full-screen loading spinner
// If no user: redirect to /auth/login
// If user: render children
```

---

## WEBGL SHADER COMPONENT

Copy this EXACTLY to `src/components/ui/web-gl-shader.tsx`:

```tsx
"use client"
import { useEffect, useRef } from "react"
import * as THREE from "three"

export function WebGLShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene | null
    camera: THREE.OrthographicCamera | null
    renderer: THREE.WebGLRenderer | null
    mesh: THREE.Mesh | null
    uniforms: any
    animationId: number | null
  }>({
    scene: null, camera: null, renderer: null,
    mesh: null, uniforms: null, animationId: null,
  })

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const { current: refs } = sceneRef

    const vertexShader = `
      attribute vec3 position;
      void main() { gl_Position = vec4(position, 1.0); }
    `
    const fragmentShader = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform float xScale;
      uniform float yScale;
      uniform float distortion;
      void main() {
        vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
        float d = length(p) * distortion;
        float rx = p.x * (1.0 + d);
        float gx = p.x;
        float bx = p.x * (1.0 - d);
        float r = 0.05 / abs(p.y + sin((rx + time) * xScale) * yScale);
        float g = 0.05 / abs(p.y + sin((gx + time) * xScale) * yScale);
        float b = 0.05 / abs(p.y + sin((bx + time) * xScale) * yScale);
        gl_FragColor = vec4(r, g, b, 1.0);
      }
    `
    // ... (full implementation as provided in component code)
    // IMPORTANT: Copy the full useEffect body from the provided web-gl-shader.tsx exactly
  }, [])

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full block" />
}
```

**IMPORTANT**: Use the FULL implementation from the source file provided above. Do not truncate.

---

## LIQUID GLASS BUTTON

Copy the full `LiquidButton` and `GlassFilter` components to `src/components/ui/liquid-glass-button.tsx` exactly as provided.

---

## DESIGN SYSTEM

### Colors (globals.css + Tailwind)
```css
:root {
  --background: #0A0A0F;
  --foreground: #F8F8F2;
  --card: #12121A;
  --card-foreground: #F8F8F2;
  --border: #1E1E2E;
  --accent: #10B981;        /* Green — primary brand color */
  --accent-hover: #059669;
  --muted: #6B7280;
  --destructive: #EF4444;
  --warning: #F59E0B;
}
```

### Typography
- Headings: `font-family: 'Cal Sans', 'Sora', sans-serif` — import from Google Fonts
- Body: `font-family: 'DM Sans', sans-serif`
- Monospace: `font-family: 'JetBrains Mono', monospace` (for score numbers, code)

### Component Conventions
- All cards: `bg-[#12121A] border border-[#1E1E2E] rounded-xl`
- Glassmorphism: `bg-white/5 backdrop-blur-md border border-white/10`
- Green CTA buttons: `bg-[#10B981] hover:bg-[#059669] text-white`
- Input fields: `bg-[#0A0A0F] border-[#1E1E2E] text-white placeholder:text-gray-500`

---

## ANIMATIONS (Framer Motion)

Use these animation presets consistently:

```typescript
// Fade up (for hero content)
const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" }
}

// Stagger children
const stagger = {
  animate: { transition: { staggerChildren: 0.1 } }
}

// Scale in (for cards)
const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.4 }
}
```

---

## API ROUTE (`src/app/api/analyze/route.ts`)

```typescript
// POST /api/analyze
// Accepts FormData with 'file' and 'target_role'
// Proxies to http://localhost:8000/upload
// Returns analysis JSON
// Requires Firebase ID token in Authorization header for auth check
```

---

## TOAST NOTIFICATIONS

Use shadcn `useToast` for:
- ✅ "Analysis complete! Score: {X}/100"
- ✅ "Analysis saved to history"
- ❌ "Upload failed: {error message}"
- ❌ "Login failed: {error message}"
- ✅ "Signed out successfully"
- ✅ "Account created! Welcome to ResumeIQ"

---

## RESPONSIVE BEHAVIOR

| Breakpoint | Changes |
|---|---|
| Mobile (<768px) | Sidebar hidden, hamburger menu, single column layout |
| Tablet (768–1024px) | Sidebar collapsible, stacked analyze page |
| Desktop (>1024px) | Full sidebar, two-column analyze page |

---

## CRITICAL REQUIREMENTS FOR COPILOT

1. Generate ALL files completely — no `// TODO` or placeholder comments
2. Use `"use client"` directive on all interactive components
3. All Firebase calls must be wrapped in try/catch with proper error handling
4. Use `next/navigation` `useRouter` for all client-side routing
5. Never use `<form>` with default submit — use `onClick` handlers
6. `AuthProvider` must wrap the entire app in `src/app/layout.tsx`
7. Dashboard layout must use `AuthGuard` 
8. WebGL and LiquidButton components must be copied EXACTLY as provided
9. All Firestore timestamps must use `serverTimestamp()` on write, `.toDate()` on read
10. Loading states required on every async action (buttons show spinner)
11. The landing page WebGL background must be `position: fixed` so it doesn't scroll
12. Import paths use `@/` alias throughout
13. All pages must be mobile responsive
14. Dark mode is the ONLY theme — do not add light mode toggle
15. Score bars and rings must animate on mount using Framer Motion

---

## FINAL FILE CHECKLIST

Copilot must generate ALL of the following:

- [ ] `src/app/layout.tsx`
- [ ] `src/app/page.tsx` (landing)
- [ ] `src/app/globals.css`
- [ ] `src/app/auth/login/page.tsx`
- [ ] `src/app/auth/signup/page.tsx`
- [ ] `src/app/dashboard/layout.tsx`
- [ ] `src/app/dashboard/page.tsx`
- [ ] `src/app/dashboard/analyze/page.tsx`
- [ ] `src/app/dashboard/history/page.tsx`
- [ ] `src/app/api/analyze/route.ts`
- [ ] `src/components/ui/web-gl-shader.tsx`
- [ ] `src/components/ui/liquid-glass-button.tsx`
- [ ] `src/components/landing/HeroSection.tsx`
- [ ] `src/components/landing/FeaturesSection.tsx`
- [ ] `src/components/landing/HowItWorks.tsx`
- [ ] `src/components/landing/Navbar.tsx`
- [ ] `src/components/auth/LoginForm.tsx`
- [ ] `src/components/auth/SignupForm.tsx`
- [ ] `src/components/auth/AuthGuard.tsx`
- [ ] `src/components/dashboard/DashboardNav.tsx`
- [ ] `src/components/dashboard/Sidebar.tsx`
- [ ] `src/components/dashboard/ScoreCard.tsx`
- [ ] `src/components/dashboard/FeedbackPanel.tsx`
- [ ] `src/components/dashboard/UploadZone.tsx`
- [ ] `src/components/dashboard/HistoryCard.tsx`
- [ ] `src/components/providers/AuthProvider.tsx`
- [ ] `src/components/providers/ThemeProvider.tsx`
- [ ] `src/lib/firebase.ts`
- [ ] `src/lib/firestore.ts`
- [ ] `src/lib/storage.ts`
- [ ] `src/lib/utils.ts`
- [ ] `src/hooks/useAuth.ts`
- [ ] `src/hooks/useAnalysis.ts`
- [ ] `middleware.ts`
- [ ] `.env.local`
- [ ] `README.md`
