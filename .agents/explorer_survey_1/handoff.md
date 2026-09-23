# Frontend UI/UX Survey & Investigation Report

## 1. Observation

### 1.1 Architecture & Page Mapping
The frontend is a vanilla HTML5 / CSS3 / JavaScript (ES6) multi-page application with server-side static routing managed by a custom Node.js `http.createServer` instance (`backend/server.js`). There is no React, Vue, Vite, or Next.js bundling pipeline.

- **Primary Entry Points & Client Pages**:
  - `frontend/home.html`: Homepage featuring hero slider, stats bar, 4-step process, "Our Pujas" carousel, why-us grid, sacred temples grid, puja gallery lightbox, testimonials, and FAQ accordion.
  - `frontend/puja.html`: Puja catalog listing with search filter and category tabs ("All", "Finance", "Health").
  - `frontend/puja-details.html`: Dynamic puja detail view driven by `details.js`, reading query parameter `?id=...` and injecting benefits, procedure steps, temple details, countdown timer, sticky bottom bar, and breadcrumbs.
  - `frontend/package.html`: Monthly package subscription listing.
  - `frontend/booking.html`: Devotee detail intake form (WhatsApp number, 4 family members, optional Gotram toggle, Sankalpam prayer text, price summary sidebar, docking pay button).
  - `frontend/payment.html`: Dual-mode payment page (Razorpay modal vs. dynamic UPI QR code generator using `qrcode.js`).
  - `frontend/account.html`: Devotee dashboard with profile summary, tabbed bookings list ("Pending", "Ongoing", "Completed"), subscriptions, and wishlist.
  - `frontend/login.html`: OTP authentication modal flow (Phone -> OTP -> Profile).
  - `backend/admin.html` (served at `/admin`): Master control dashboard for bookings, devotees, CMS pujas, packages, and site settings.
  - Static Policy Pages: `about.html`, `privacy.html`, `terms.html`, `refund.html`, `video-player.html`.
- **CSS Architecture**:
  - `global.css`, `navbar.css`, `hero.css`, `home.css`, `puja-details.css`, `puja-listing.css`, `forms.css`, `account.css`, `admin.css`, `animations.css`, `responsive.css`, `vedamandir-mobile.css`.
- **Shared JavaScript Libraries**:
  - `main.js`, `navbar.js`, `cards.js`, `animations.js`, `language.js`, `auth.js`, `booking.js`, `cms.js`, `cms-renderer.js`.

---

### 1.2 Layout Overlaps Across Viewports (Mobile 375px, Tablet 768px, Desktop 1280px+)

#### Observation 1.2.1: Multi-Widget Collision on Mobile Viewports (375px - 768px)
- **Files**: `frontend/assets/js/navbar.js`, `frontend/assets/css/responsive.css`, `frontend/assets/css/forms.css`, `frontend/assets/css/puja-details.css`.
- **Code**:
  - `responsive.css:74-78`:
    ```css
    body { padding-bottom: calc(70px + env(safe-area-inset-bottom)); }
    .bottom-nav { display: flex; width: 100vw; ... }
    .floating-wa { bottom: 85px; right: 16px; width: 54px; height: 54px; }
    ```
  - `navbar.js:261-267`:
    ```css
    .abandoned-fab { position: fixed; bottom: 120px; right: 24px; z-index: 9999; width: 60px; height: 60px; }
    @media (max-width: 900px) { .abandoned-fab { bottom: 190px; right: 16px; width: 54px; height: 54px; } }
    ```
  - `puja-details.css:1063-1065`:
    ```css
    @media (max-width: 768px) {
      .pd-sticky-bottom { bottom: calc(72px + env(safe-area-inset-bottom, 0px) + 8px); margin: 0 16px; }
    }
    ```
  - `forms.css:126-141`:
    ```css
    @media (max-width: 900px) {
      .fixed-pay-btn { position: fixed !important; bottom: calc(75px + env(safe-area-inset-bottom)) !important; left: 16px; right: 16px; width: calc(100% - 32px); z-index: 85; }
      body:has(.booking-layout) .floating-wa { bottom: calc(140px + env(safe-area-inset-bottom)) !important; }
    }
    ```
- **Observed Behavior**: On mobile (375px), when a devotee is logged in with a pending booking and visits `puja-details.html`, up to four separate floating/fixed elements stack simultaneously: `.bottom-nav` (bottom:0), `.pd-sticky-bottom` (bottom:75px), `.floating-wa` (bottom:150px), and `.abandoned-fab` (bottom:190px). These widgets collide and cover over 35% of the lower viewport, obstructing content and button clicks.

#### Observation 1.2.2: Mobile Sticky Bottom Bar Overflow on 375px
- **File**: `frontend/assets/css/puja-details.css:1062-1094`
- **Code**:
  ```css
  @media (max-width: 768px) {
    .pd-sticky-bottom {
      bottom: calc(72px + env(safe-area-inset-bottom, 0px) + 8px);
      margin: 0 16px;
      padding: 8px 8px 8px 16px;
      border-radius: 999px;
    }
    .pd-sb-icon { width: 40px; height: 40px; }
    .pd-sb-text h4 { font-size: 0.65rem; max-width: 140px; }
    .pd-sb-price { font-size: 1.35rem; }
    .pd-sb-right .pd-btn-white { padding: 10px 10px 10px 20px; font-size: 0.95rem; gap: 8px; }
    .pd-btn-icon { width: 26px; height: 26px; }
  }
  ```
- **Observed Behavior**: Available width on 375px viewport minus margins (`375 - 32 = 343px`). Left content (icon 40px + gap 16px + text ~140px = ~196px). Right button (padding 30px + button icon 26px + text). When current language is Telugu (`te`), "Book Now" is translated to "ఇప్పుడే బుక్ చేసుకోండి" (over 180px text width). The combined width exceeds 390px, causing the flex layout to blow out of the pill container and overflow the screen.
- **Unlinked Mobile Patch**: `frontend/assets/css/vedamandir-mobile.css` was written with responsive rules for `.pd-sticky-bottom` and `.pd-hero-section`, but is NOT linked in `puja-details.html` or any HTML document.

#### Observation 1.2.3: Mobile Account Page Sidebar Clutter
- **Files**: `frontend/assets/css/account.css:16`, `frontend/assets/css/responsive.css:23`
- **Code**:
  - `account.css:16`: `.account-grid { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 34px; ... }`
  - `responsive.css:23`: `@media (max-width: 1023px) { .account-grid { grid-template-columns: minmax(0, 1fr); gap: 26px; } }`
- **Observed Behavior**: On mobile screens (375px), `.account-grid` stacks the sidebar `.side-card` directly above the active panel. The sidebar contains 9 vertical buttons ("Profile Summary", "My Bookings", "My Subscriptions", "Saved Wishlist", "Saved Addresses", "Devotee Wallet", "Language Switcher", "About", "Support"), taking up over 520px of vertical space before the devotee can see their profile details or bookings.

#### Observation 1.2.4: Admin Panel Complete Mobile Unresponsiveness (375px & 768px)
- **File**: `frontend/assets/css/admin.css:25-32, 91-99`
- **Code**:
  ```css
  body {
    font-family: 'Poppins', sans-serif;
    background-color: var(--bg-dark);
    color: var(--text-main);
    display: flex;
    height: 100vh;
    overflow: hidden;
  }
  .sidebar {
    width: 250px;
    background-color: var(--bg-sidebar);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    padding: 24px 0;
    flex-shrink: 0;
  }
  ```
- **Observed Behavior**: `admin.css` contains ZERO `@media` queries. On a 375px mobile screen, the fixed 250px sidebar leaves exactly 125px of horizontal space for the main dashboard and tables. Because `body` has `overflow: hidden`, the dashboard content cannot be scrolled horizontally or viewed. On a 768px tablet, the table columns are squeezed into 518px, causing severe column clipping.

---

### 1.3 Shaking, Jerking, and Animation Jitter

#### Observation 1.3.1: Mobile Hero Slider Height Snapping
- **File**: `frontend/assets/css/hero.css:875-911`
- **Code**:
  ```css
  @media (max-width: 767px) {
    .hero-slider {
      min-height: 780px;
      height: auto;
    }
  ```
- **Observed Behavior**: Because `.hero-slider` uses `height: auto` on mobile while stacking slides in CSS Grid (`grid-area: 1 / 1`), slides with different text lengths (e.g. Navanarasimha Homam with Telugu title and long description vs. Go-Grasam Sankalpam) have different heights. When slides transition every 6 seconds, the container height snaps dynamically, causing the Stats Bar, Process Steps, and Puja Cards below it to jump vertically by 30px-80px.

#### Observation 1.3.2: Missing `#pujaDots` Element with Active Observer Code
- **Files**: `frontend/home.html:205`, `frontend/assets/js/pages/home.js:146-150`, `frontend/assets/css/home.css:401`
- **Code**:
  - `home.html:205`: `<div class="cards puja-carousel" id="pujaCards" style="text-align: left;"></div>` (no `#pujaDots` container).
  - `home.js:147-150`:
    ```javascript
    const track = $id("pujaCards");
    const dotsEl = $id("pujaDots");
    if (!track || !dotsEl) return;
    ```
  - `home.css:401`: `.puja-dots { display:flex; ... display: none !important; }`
- **Observed Behavior**: `initPujaCarousel()` exits on line 149 because `#pujaDots` does not exist in `home.html`. The intended scroll-synchronized dot navigation is completely broken and dead.

#### Observation 1.3.3: Touch-Triggered Hover Micro-Transforms
- **File**: `frontend/assets/css/animations.css:141-143, 201-203`
- **Code**:
  - `animations.css:143`: `.card:hover .card-media img { transform: scale(1.06); }`
  - `animations.css:201`: `.process-step:hover { transform: translateY(-4px); ... }`
- **Observed Behavior**: On mobile and tablet touchscreens, touch-down events activate `:hover` pseudo-classes, applying `scale(1.06)` or `translateY(-4px)` mid-gesture, creating visible stutter during swipe.

---

### 1.4 Blank Flashes & FOUC

#### Observation 1.4.1: 2.3-Second Obtrusive White Landing Splash
- **Files**: `frontend/assets/css/animations.css:42-49`, `frontend/home.html:69-74`, `frontend/assets/js/animations.js:25-39`
- **Code**:
  ```css
  .site-splash {
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    background: #ffffff;
    pointer-events: none;
    animation: splashOut .8s cubic-bezier(.7,0,.3,1) 1.5s forwards;
  }
  ```
- **Observed Behavior**: On initial visit to `home.html`, a fixed `#ffffff` white screen blocks the viewport for 1.5 seconds delay + 0.8s fade = 2.3 seconds. Users on slower connections or in darker ambient lighting experience this as an unstyled blank screen flash.

#### Observation 1.4.2: Font-Loading Blank Hero Flash
- **File**: `frontend/home.html:37-47`
- **Code**:
  ```html
  <style>
    html.fonts-loading .hero-landing {
      opacity: 0;
      pointer-events: none;
    }
    html:not(.fonts-loading) .hero-landing {
      transition: opacity 0.3s ease;
      opacity: 1;
    }
  </style>
  <script>document.documentElement.classList.add('fonts-loading');document.fonts.ready.then(function(){document.documentElement.classList.remove('fonts-loading')});</script>
  ```
- **Observed Behavior**: If `fonts.googleapis.com` experiences latency, the main hero section stays at `opacity: 0` (invisible) while other page sections render beneath it, creating an inverted blank space at the top of the viewport.

#### Observation 1.4.3: Async CMS Render Wipe-Out Flash
- **Files**: `frontend/assets/js/cms-renderer.js:17-28, 168`, `frontend/assets/js/pages/home.js:128-139`
- **Code**:
  - `home.js:7, 122-126`: Renders `pujaCards`, `faqList`, `whyUsGrid`, `templeGrid`, `testimonialGrid`, and `renderSlider()` synchronously on first script execution.
  - `cms-renderer.js:17, 168`:
    ```javascript
    const res = await fetch("/api/content/global");
    ...
    window.dispatchEvent(new Event("languageChanged"));
    ```
- **Observed Behavior**: Once `/api/content/global` finishes in the background, `languageChanged` is fired, which causes `home.js` to execute `container.innerHTML = ""` on every grid and rebuild the entire DOM. This produces an abrupt double-paint flicker where active slides and hover states reset.

#### Observation 1.4.4: Account Page Content Flash
- **File**: `frontend/account.html:19-24`, `frontend/assets/js/pages/account.js:27`
- **Code**:
  ```css
  body:not(.auth-ready) .account-banner,
  body:not(.auth-ready) .account-grid {
    display: none !important;
  }
  ```
- **Observed Behavior**: The entire 900px+ dashboard body is hidden with `display: none !important` until `account.js` finishes loading and adds `auth-ready`, causing a jarring late pop-in.

---

### 1.5 Broken Images, Dead Links, and Unresponsive Buttons

#### Observation 1.5.1: 404 Broken Default Image Fallbacks
- **File**: `frontend/assets/js/booking.js:65`
- **Code**:
  ```javascript
  $id("bkImg").style.backgroundImage = `url(${item.image || (type === 'pkg' ? 'assets/images/packages/default.jpg' : 'assets/images/pujas/default.jpg')})`;
  ```
- **Observed Behavior**: `assets/images/packages/default.jpg` and `assets/images/pujas/default.jpg` DO NOT exist in the repository. If any puja or package has a missing image, the browser triggers a 404 GET request and shows a broken graphic.

#### Observation 1.5.2: Unresponsive Category Tabs (Blank Results)
- **Files**: `frontend/content/pujas.js:5-111`, `frontend/home.html:196-204`, `frontend/puja.html:61-64`, `frontend/assets/js/cards.js:89`
- **Code**:
  - In `content/pujas.js`: Every single puja has `"cat": "All"`.
  - In `home.html`: Tabs are "All", "Graha Shanti", "Health", "Wealth", "Marriage", "Education", "Protection", "Special".
  - In `puja.html`: Tabs are "All", "Finance", "Health".
  - In `cards.js:89`: `if (cat && cat !== "All" && p.cat !== cat) return;`
- **Observed Behavior**: Clicking ANY category tab other than "All" filters out 100% of pujas. The container becomes completely empty with no cards and NO "No pujas found" message. Users perceive the tabs as unresponsive/dead buttons.

#### Observation 1.5.3: Dead Footer Links and Misdirected Navigation
- **File**: `frontend/assets/js/navbar.js:118-124`
- **Code**:
  ```html
  <div>
    <h4>Quick Links</h4>
    <a href="puja.html">Puja</a><a href="account.html">Contact Us</a><a href="home.html">About Us</a>
  </div>
  <div>
    <h4>Legal</h4>
    <a href="#">Privacy Policy</a><a href="#">Terms of Service</a><a href="#">Refund Policy</a>
  </div>
  ```
- **Observed Behavior**:
  - "Privacy Policy", "Terms of Service", and "Refund Policy" are hardcoded to `href="#"`. Clicking them jumps to page top instead of navigating to `privacy.html`, `terms.html`, and `refund.html`.
  - "About Us" links to `home.html` instead of `about.html`.
  - "Contact Us" links to `account.html`.

#### Observation 1.5.4: Unhandled TypeError on Invalid Puja ID
- **Files**: `frontend/assets/js/pages/details.js:11-14`, `frontend/puja-details.html:26-38`
- **Code**:
  ```javascript
  let { item, type } = getItem(ref);
  if (!item) {
    document.querySelector('main').innerHTML = '<div style="text-align:center; ...">...</div>';
    throw new Error('STOP');
  }
  ```
- **Observed Behavior**: `puja-details.html` contains `<div class="pd-content">` but NO `<main>` tag. Calling `document.querySelector('main').innerHTML` throws `TypeError: Cannot set properties of null (setting 'innerHTML')`, crashing script execution before the error message can be shown.

#### Observation 1.5.5: Stray Closing Tag in Homepage Markup
- **File**: `frontend/home.html:251-253`
- **Code**:
  ```html
    <div class="lightbox-caption" id="lightboxCaption"></div>
  </div>
  </section>
  ```
- **Observed Behavior**: Stray closing `</section>` tag on line 252 with no corresponding opening tag.

---

### 1.6 Incorrect Redirects & Routing Flaws

#### Observation 1.6.1: Clean URLs Return Raw 404s
- **File**: `backend/server.js:98-114`
- **Code**:
  ```javascript
  let filePath = path.join(FRONTEND_DIR, decodeURIComponent(url.pathname));
  if (url.pathname === "/") filePath = path.join(FRONTEND_DIR, "home.html");
  if (!filePath.startsWith(FRONTEND_DIR)) return send(res, 403, { error: "Forbidden" });
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, "<h1>404 — Page not found</h1>", "text/html");
  ```
- **Observed Behavior**: Direct navigation to `/booking`, `/account`, `/login`, `/puja`, or `/puja-details` without the `.html` extension returns a 404 error page.

#### Observation 1.6.2: Booking ID Inconsistency (Requirement R5)
- **Files**: `backend/controllers/bookingController.js:70`, `backend/models/bookingModel.js:56-63, 73-81, 100`, `frontend/assets/js/pages/payment.js:143-156`, `frontend/assets/js/pages/account.js:187-189`, `frontend/assets/js/admin.js:325`
- **Code**:
  - `bookingModel.js:56-63`: Stored booking generates a 6-digit `shortId` and prepends to notes: `notes: 'BookingID: ${await generateUniqueBookingId()}\n...'`.
  - `bookingController.js:70`: On booking creation, returns only `{ id: booking.id }` (the Supabase UUID or local `bk_...`).
  - `payment.js:143-156`: Does not receive `shortId`, so it runs `numericBookingId(bookingId)`:
    ```javascript
    function numericBookingId(id) {
      const value = String(id || "").toLowerCase();
      if (/^[0-9a-f]{8}-/.test(value)) return String(parseInt(value.slice(0, 5), 16)).padStart(6, "0").slice(0, 6);
      ...
    }
    ```
- **Observed Behavior**: The UPI transaction note on `payment.html` gets a 6-digit number derived from hex-parsing the UUID (e.g. `936965`), whereas Supabase `notes`, the customer Account page (`b.shortId`), and the Admin panel display the stored 6-digit random number (e.g. `482915`). This directly violates Requirement R5.

---

### 1.7 Performance Bottlenecks

#### Observation 1.7.1: Duplicate Initial Render Calls
- **File**: `frontend/assets/js/pages/home.js:123-124`
- **Code**:
  ```javascript
  buildWhyUsList($id("whyUsGrid"), WHY_US[currentLang] || WHY_US.en);
  buildWhyUsList($id("whyUsGrid"), WHY_US[currentLang] || WHY_US.en);
  ```
- **Observed Behavior**: Sequential duplicate invocation of `buildWhyUsList` on page load.

#### Observation 1.7.2: Heavy Assets & Missing Image Sizing
- **Files**: `frontend/assets/temple_bell.wav` (264 KB uncompressed audio); `frontend/home.html:71` (`logo-splash.webp` 800x800 loaded on first paint).
- **Observed Behavior**: Multiple images lack explicit `width` and `height` attributes or responsive `srcset`, causing Cumulative Layout Shifts (CLS) during image decoding.

---

## 2. Logic Chain

1. **Mobile Collision Chain**: Because `.bottom-nav` is fixed at the viewport bottom, `.floating-wa` is fixed at `bottom: 85px`, `.abandoned-fab` is fixed at `bottom: 190px`, and `.pd-sticky-bottom` is fixed at `bottom: 75px` without a unified floating manager, they occupy overlapping coordinates on mobile screens. Therefore, devotees on mobile experience stacked buttons that block interactive content.
2. **Sticky Pill Overflow Chain**: `.pd-sticky-bottom` has a fixed-padded flex container designed for short English text. In regional languages like Telugu, "ఇప్పుడే బుక్ చేసుకోండి" exceeds 180px, causing the right-aligned button and left-aligned pricing to exceed the 343px available width on 375px screens. Because `vedamandir-mobile.css` was never linked, the intended responsive compact rules were never applied.
3. **Hero Jitter Chain**: On mobile, `.hero-slider` is styled with `height: auto` and a `min-height: 780px`. Different puja slides contain varying text lengths. When transitioning between slides in CSS Grid, the container dynamically resizes to match the current slide's content height, causing vertical layout displacement of all subsequent sections.
4. **Blank Flash Chain**: On initial page load, `.site-splash` has a 1.5s delay before a 0.8s exit animation, forcing a blank white overlay over the entire screen for 2.3 seconds. Additionally, `cms-renderer.js` unconditionally triggers `languageChanged` upon receiving API data, wiping out all grid containers and recreating them in the DOM. This causes a double flash and resets user scroll/interaction states.
5. **Dead Tabs Chain**: `cards.js` filters pujas by matching `p.cat === tab.dataset.cat`. In `content/pujas.js`, all entries are assigned `"cat": "All"`. When a user clicks "Finance", "Health", or "Wealth", the filter predicate evaluates to false for all records, yielding an empty array. Because `renderCards` does not render an empty state message, the UI becomes a blank area.
6. **Booking ID Divergence Chain (R5)**: The backend generates a 6-digit Booking ID and records it in `notes`. However, `bookingController.create` returns `{ id: booking.id }` (the UUID). On `payment.html`, the frontend falls back to `numericBookingId()`, which parses the first 5 hex digits of the UUID. Because a hex slice of a random UUID does not equal the stored random 6-digit ID, the Booking ID on Razorpay/UPI differs from Supabase and the Admin Panel.

---

## 3. Caveats

- **Read-Only Investigation**: In accordance with instructions, zero application source files have been modified during this survey.
- **Network / Supabase State**: Testing and code tracing were performed against the local codebase and static data fallbacks. Live Supabase database tables (`bookings`, `pujas`, `devotees`) may contain additional columns or records that synchronize via `syncFromSupabase()` on server startup.
- **Audio Bell Test Suite**: Test suite `05_audio.test.js` tests `#templeAudioBtn`, which was previously removed from `main.js` and `home.html` per user request (`main.js:93`). Running `npm run test:e2e` will fail on suite 05 until either the button is restored or suite 05 is updated.

---

## 4. Conclusion

The Shubha Sankalpam frontend is structurally lightweight and fast, but exhibits distinct UI/UX flaws across mobile (375px), tablet (768px), and desktop (1280px+):
1. **Critical Mobile Overlaps**: Multiple uncoordinated fixed floating elements (`.bottom-nav`, `.floating-wa`, `.abandoned-fab`, `.pd-sticky-bottom`, `.fixed-pay-btn`) collide on mobile viewports.
2. **Responsive Degradation on 375px**:
   - The sticky bottom bar on `puja-details.html` overflows when rendered with Telugu or Hindi button text.
   - The Admin Panel has zero media queries and a fixed 250px sidebar with `overflow: hidden` on `body`, making it unusable on mobile and cramped on tablet.
   - The Account page stacks a 9-item vertical sidebar menu above panels on mobile, burying devotee content under 520px of buttons.
3. **Motion Jitter & Blank Flashes**:
   - Mobile hero slider dynamic height snapping causes the homepage to jerk up and down on slide changes.
   - A 2.3-second white splash overlay and Google Fonts loading block cause visible blank flashes on initial paint.
   - Async CMS synchronization triggers a full DOM wipe and re-render of all homepage grids.
4. **Broken Assets & Unresponsive UI**:
   - Default image fallbacks in `booking.js` point to non-existent files (`default.jpg`), causing 404 GET errors.
   - Category filter tabs show empty containers because all pujas are tagged `"cat": "All"`.
   - Footer links for Legal policies are dead `href="#"`, and "About Us" links to `home.html`.
   - Missing `<main>` element in `puja-details.html` crashes script execution on unavailable pujas.
5. **Booking ID Inconsistency (R5)**:
   - The Booking ID generated on `payment.html` diverges from the database and Admin panel due to `numericBookingId()` hashing the UUID instead of returning and using the true 6-digit `shortId`.

---

## 5. Proposed Concrete Fix Strategies

| Issue ID | Affected File(s) | Problem Description | Concrete Fix Strategy |
|---|---|---|---|
| **FIX-01** | `frontend/assets/css/puja-details.css`, `frontend/puja-details.html` | Multi-widget overlap on mobile (bottom nav, WhatsApp pill, abandoned fab, sticky bottom bar) | Link `vedamandir-mobile.css` or integrate unified z-index and coordinate stack: set `.pd-sticky-bottom` to fixed at `bottom: calc(72px + env(safe-area-inset-bottom))`, shift `.floating-wa` to `bottom: 145px`, and hide `.abandoned-fab` on `puja-details.html`. |
| **FIX-02** | `frontend/assets/css/puja-details.css:1062-1094` | Sticky bottom pill overflow on 375px with Telugu text | In `@media (max-width: 480px)`, adjust `.pd-sb-inner` to: shrink icon to 32px, truncate title to max 90px, use responsive font size (`0.85rem`) and compact padding (`8px 14px`) on `.pd-btn-white`, and enforce `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`. |
| **FIX-03** | `frontend/assets/css/hero.css:875-885` | Mobile hero slider height jerk during slide transition | Replace dynamic `height: auto` on `.hero-slider` with a stable, locked viewport height: `.hero-slider { height: 740px !important; min-height: 740px !important; }` and `.hero-image-wrap { height: 100% !important; }`. |
| **FIX-04** | `frontend/home.html:205`, `frontend/assets/css/home.css:401`, `frontend/assets/js/pages/home.js:146-188` | Missing `#pujaDots` container and disabled CSS | Add `<div class="puja-dots" id="pujaDots"></div>` in `home.html` right below `#pujaCards`. In `home.css`, remove `display: none !important;` from `.puja-dots` to restore dot synchronization. |
| **FIX-05** | `frontend/assets/css/animations.css:42-49`, `frontend/home.html:69-74` | 2.3s obtrusive white splash screen causing blank flash | Shorten splash duration: change animation delay from `1.5s` to `0.4s` and duration to `0.4s` (total <0.8s), or add `.skip` by default if not strictly required. In `home.html`, remove `html.fonts-loading` opacity zeroing so text renders immediately with `font-display: swap`. |
| **FIX-06** | `frontend/assets/js/cms-renderer.js:168` | Full page DOM re-render flicker on async CMS fetch | In `mergeArrayContent()`, avoid dispatching a global `languageChanged` event if the loaded CMS data matches default content, or surgically update only the affected text nodes rather than wiping entire containers. |
| **FIX-07** | `frontend/content/pujas.js:5-111` | Category filter tabs return 0 results (dead click) | Assign authentic categories to each puja in `pujas.js` (e.g. `cat: "Graha Shanti"` for Navanarasimha, `cat: "Wealth"` for Venkateswara, `cat: "Protection"` for Bhadrakali, `cat: "Special"` for Go-Grasam). Add an empty state element in `renderCards()` if a selected category contains no entries. |
| **FIX-08** | `frontend/assets/js/booking.js:65` | 404 broken image for missing `default.jpg` fallbacks | Create fallback image assets or point fallback to existing `assets/images/logo.png` or `assets/images/pujas/shiva.jpg`: `item.image || 'assets/images/logo.jpg'`. |
| **FIX-09** | `frontend/assets/js/navbar.js:118-124` | Dead `#` legal links & wrong about redirect | Update footer HTML in `navbar.js`: set Privacy Policy to `privacy.html`, Terms to `terms.html`, Refund to `refund.html`, and About Us to `about.html`. |
| **FIX-10** | `frontend/puja-details.html:26`, `frontend/assets/js/pages/details.js:11-14` | Unhandled TypeError when accessing `document.querySelector('main')` | In `details.js`, update fallback selector: `const container = document.querySelector('main') || document.querySelector('.pd-content') || document.body; container.innerHTML = ...;`. |
| **FIX-11** | `frontend/home.html:252` | Stray unclosed `</section>` tag | Remove stray `</section>` at line 252. |
| **FIX-12** | `backend/server.js:98-114` | Clean URLs (`/booking`, `/account`, etc.) return raw 404 | In `server.js`, check if `filePath` doesn't exist and `filePath + ".html"` exists: if so, serve `filePath + ".html"`. |
| **FIX-13** | `backend/controllers/bookingController.js:70`, `backend/models/bookingModel.js:100`, `frontend/assets/js/pages/payment.js:143-156` | Booking ID mismatch between Supabase/Admin and payment QR (R5) | In `bookingController.create`, return both `id` and `shortId`: `send(res, 201, { id: booking.id, shortId: getShortId(booking.notes, booking.id) })`. Pass `shortId` to `payment.html?bookingId=${out.id}&shortId=${out.shortId}`, and use `shortId` directly for UPI QR note and Razorpay receipts instead of UUID hashing. |
| **FIX-14** | `frontend/assets/css/admin.css`, `backend/admin.html` | Admin Panel completely unusable on mobile (375px) and tablet (768px) | Add responsive CSS in `admin.css`: for `@media (max-width: 900px)`, convert `.sidebar` into a slide-out drawer or horizontal top-bar, add a hamburger toggle button in `backend/admin.html`, set `body { overflow-y: auto; height: auto; flex-direction: column; }`, and wrap data tables in an `overflow-x: auto` container. |
| **FIX-15** | `frontend/assets/css/account.css:16-35`, `frontend/account.html:64-74` | Mobile Account page vertical sidebar pushes content down by >520px | For `@media (max-width: 768px)`, style `.side-card` as a horizontal scrollable chip/pill bar (`display: flex; flex-direction: row; overflow-x: auto; scrollbar-width: none;`) so it occupies only 50px of vertical height instead of 520px. |
| **FIX-16** | `frontend/assets/js/pages/home.js:123-124` | Duplicate `buildWhyUsList` execution | Delete redundant line 124 in `home.js`. |

---

## 6. Verification Method

To independently verify all observations and subsequent fixes:

1. **Static Analysis & File Inspections**:
   - Inspect `frontend/assets/css/admin.css` to confirm zero `@media` rules.
   - Inspect `frontend/content/pujas.js` to confirm all entries have `"cat": "All"`.
   - Inspect `frontend/assets/js/booking.js:65` to confirm references to non-existent `default.jpg`.
   - Inspect `frontend/assets/js/navbar.js:122-124` to confirm dead `href="#"` legal links.
   - Inspect `backend/controllers/bookingController.js:70` vs `payment.js:143` to trace the Booking ID divergence.
2. **Simulated Viewport Testing**:
   - Run server: `node backend/server.js` (starts on port 3000).
   - Test Mobile (375px x 667px):
     * Visit `http://localhost:3000/home.html` -> check hero slide height snapping during 6-second timer; observe white splash duration.
     * Visit `http://localhost:3000/puja-details.html?id=Navanarasimha%20Homam-te` -> switch language to Telugu; verify overflow of `.pd-sticky-bottom` and check bottom-nav collision.
     * Visit `http://localhost:3000/account.html` -> observe vertical height of 9 stacked sidebar buttons.
     * Visit `http://localhost:3000/admin` -> verify 250px sidebar crushing table into 125px sliver.
   - Test Tablet (768px x 1024px):
     * Visit `http://localhost:3000/admin` -> observe table column compression.
     * Visit `http://localhost:3000/home.html` -> verify grid column reflow.
   - Test Desktop (1280px+):
     * Click category tabs on `home.html` ("Health", "Wealth", "Protection") -> verify that zero cards render.
     * Click footer links ("Privacy Policy", "Terms of Service", "Refund Policy") -> verify dead link behavior.
3. **Invalidation Conditions**:
   - If `content/pujas.js` has diverse categories assigned, FIX-07 is invalidated.
   - If clean URLs (`/login`) resolve cleanly to HTML pages without error, FIX-12 is invalidated.
   - If `bookingController.create` returns `{ id, shortId }` and `payment.js` uses `shortId` directly, FIX-13 is invalidated.
