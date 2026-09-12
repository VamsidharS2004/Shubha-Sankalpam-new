# Shubha Sankalpam — Website Guide

A quick reference for finding and editing anything on the site.

---

## The golden rule

**`frontend/content/`** → things YOU edit (text, prices, images, settings)
**`frontend/assets/js/`** → the site's code (you shouldn't need to touch this)

If you're ever unsure where something lives, open the `.html` page you
want to change first — every page has a comment block at the very top
telling you exactly which file controls each section.

---

## Folder structure

```
puja-site-pro/
│
├── frontend/                    ← the website itself
│   │
│   ├── home.html                ← 8 separate pages, one per file
│   ├── puja.html
│   ├── package.html
│   ├── puja-details.html
│   ├── booking.html
│   ├── login.html
│   ├── account.html
│   ├── payment.html
│   │
│   ├── content/                 ⭐ EDIT THESE FILES for content ⭐
│   │   ├── pujas.js             All puja info: name, price, temple,
│   │   │                        date, description, benefits, procedure,
│   │   │                        FAQs, reviews — everything about each puja
│   │   ├── packages.js          Monthly package info (same format)
│   │   ├── puja-detail-defaults.js  Fallback content used when a puja
│   │   │                        doesn't define its own benefits/FAQs
│   │   ├── trust-highlights.js  The 4 items in the homepage hero box
│   │   ├── faq.js               The homepage FAQ accordion
│   │   └── site-settings.js     Brand name, WhatsApp number, UPI ID,
│   │                            social media links
│   │
│   └── assets/                  ⚠️ site code + media — see below ⚠️
│       │
│       ├── images/               ⭐ PUT YOUR PHOTOS HERE ⭐
│       │   ├── hero/             Homepage hero banner photos
│       │   ├── pujas/            Puja card & details-page photos
│       │   ├── packages/         Package card photos
│       │   ├── reviews/          Reviewer profile photos (optional)
│       │   └── icons/            Custom icons (optional)
│       │   (each folder has its own README.txt with naming tips)
│       │
│       ├── css/                  One file per part of the site —
│       │   ├── global.css        colors/fonts + shared button styles
│       │   ├── navbar.css        header, footer, language switcher
│       │   ├── hero.css          homepage hero section only
│       │   ├── home.css          rest of homepage + shared cards/tabs
│       │   ├── puja-listing.css  puja.html & package.html banner
│       │   ├── puja-details.css  puja-details.html
│       │   ├── account.css       account.html
│       │   ├── forms.css         login/booking/payment pages
│       │   └── responsive.css    every phone/tablet breakpoint
│       │
│       └── js/                   Site code — no need to edit for
│           │                     content changes
│           ├── main.js           Shared helpers (API calls, login state)
│           ├── language.js       Telugu/Hindi translations
│           ├── navbar.js         Builds the header/footer
│           ├── cards.js          Builds puja/package cards
│           ├── auth.js           The login page's OTP flow
│           ├── booking.js        The booking form's submit flow
│           └── pages/            One file per page's own logic
│               ├── home.js, puja.js, package.js, details.js,
│               └── account.js, payment.js
│
└── backend/                     ← the server (bookings, login, admin)
    ├── server.js
    ├── config.js                 Port, admin password, demo mode
    ├── routes/                   Which URL goes to which controller
    ├── controllers/               What each API endpoint does
    ├── middleware/                Login & admin checks
    ├── models/                    Reading/writing the database files
    ├── utils/
    └── admin.html                 Your bookings dashboard
```

**Naming convention used throughout:** every CSS/JS file is named after
the exact page or component it belongs to (`hero.css` styles the hero,
`account.css` styles the account page), so if you're looking at a page
and want to change its look, the matching file is one click away — no
searching through a giant single file.

---

## "How do I...?" cheat sheet

| I want to... | Open this file |
|---|---|
| Change a puja's price, name, description, temple, or date | `content/pujas.js` |
| Add a brand-new puja | `content/pujas.js` — copy an existing `{ ... }` block |
| Edit a puja's benefits/procedure/FAQ on its details page | `content/pujas.js` (inside that puja's `detail` section) |
| Change a package (monthly subscription) | `content/packages.js` |
| Change the 4 "Puja Video Delivered..." hero highlights | `content/trust-highlights.js` |
| Change the homepage FAQ questions | `content/faq.js` |
| Change your WhatsApp number, UPI ID, or social links | `content/site-settings.js` |
| Change your brand name / logo text | `content/site-settings.js` |
| Add a real photo to the homepage hero | Drop it in `assets/images/hero/` (see that folder's README.txt) |
| Add real puja photos | Drop them in `assets/images/pujas/` (see that folder's README.txt) |
| Change the homepage hero's colors/spacing | `assets/css/hero.css` |
| Change the header/footer/navbar look | `assets/css/navbar.css` |
| Change the puja-details page's look | `assets/css/puja-details.css` |
| Change colors, fonts, or button styles sitewide | `assets/css/global.css` |
| Fix how something looks on phones/tablets | `assets/css/responsive.css` |
| Change the hero step-by-step icons/captions ("Choose Your Pooja"...) | `home.html` directly (marked with a comment) |
| Change the admin dashboard password | `backend/config.js` |

---

## Adding a new puja — step by step

1. Open `frontend/content/pujas.js`
2. Copy one whole puja block, from its opening `{` to matching `}`
3. Paste it just before the closing `];` at the bottom of the file
4. Edit the copy: change `name`, `desc`, `temple`, `date`, `price`, etc.
5. Save — it will automatically appear as a new card on the homepage,
   the Puja listing page, and get its own details page. Nothing else
   needs to change.

The same process works for `content/packages.js`.

---

## Running the site

```
cd backend
node server.js
```
Then open `http://localhost:3000` in your browser.
**Always use this address — never double-click the HTML files directly**,
or login/booking features won't work (browsers block that for security).

Full setup, hosting, and payment instructions are in the other guides
you already have: `README.txt` (in the backend folder) and the OTP/
payment setup guide.
