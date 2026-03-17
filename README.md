# Summer Green — Homestay Website

A full-stack homestay booking website for **Summer Green Homestay** (Madikeri, Coorg). Guests can browse rooms, check availability, add rooms to a cart, and complete bookings with online payment. The site includes an admin panel for managing bookings, pricing, blocked dates, room images, and gallery content.

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Backend** | Node.js, Express (ES modules) |
| **Database** | MongoDB (Mongoose) |
| **Session** | express-session with Mongo Store |
| **Auth (guest)** | Passport.js (Google OAuth 2.0) |
| **Auth (admin)** | JWT + OTP-based login |
| **Payments** | Razorpay (orders, webhooks, verification) |
| **Email** | Resend (transactional emails) |
| **Media** | Cloudinary (room & gallery images) |
| **Frontend** | Vanilla HTML, CSS, JavaScript (no framework) |
| **UI** | Custom CSS, GSAP, Lenis smooth scroll |

---

## Project Structure

```
├── config/           # App config (rooms, passport, initial data)
├── constants.js       # App constants
├── controllers/      # Route handlers (auth, booking, admin, payment)
├── db.js             # MongoDB connection
├── middleware/       # Auth (guest + admin), JWT verification
├── models/           # Mongoose models (User, Booking, Cart, etc.)
├── public/           # Static frontend
│   ├── css/          # Styles (theme variants)
│   ├── img/          # Images, logos, favicon
│   ├── js/           # Main, cart, admin, animations
│   ├── index.html    # Homepage
│   ├── cart.html     # Booking cart
│   ├── reviews.html  # Reviews page
│   ├── admin.html    # Admin dashboard
│   ├── sitemap.xml   # SEO sitemap
│   └── robots.txt    # Crawler rules
├── routes/           # Express routers (auth, booking, admin, payment)
├── utils/            # Helpers (OTP, Resend, etc.)
├── server.js         # App entry point
├── .env.sample       # Example env vars (copy to .env)
└── package.json
```

---

## Setup

### Prerequisites

- **Node.js** (v18+ recommended)
- **MongoDB** (local or Atlas)
- **Google OAuth** credentials (for guest sign-in)
- **Razorpay** account (for payments)
- **Resend** account (for emails)
- **Cloudinary** account (for images)

### Install and run

1. **Clone and install**

   ```bash
   git clone <repository-url>
   cd summer-green-web
   npm install
   ```

2. **Environment variables**

   Copy the sample env file and fill in your values. **Do not commit `.env`.**

   ```bash
   cp .env.sample .env
   ```

   Required variables (see `.env.sample` for the full list):

   - `PORT` — Server port (e.g. 3000)
   - `MONGODB_URI` — MongoDB connection string
   - `DB_NAME` — Database name
   - `CORS_ORIGIN` — Allowed frontend origin (e.g. http://localhost:3000)
   - `SESSION_SECRET` — Session encryption secret
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth
   - `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` — Razorpay
   - `RESEND_API` — Resend API key (emails)
   - `ACCESSTOKEN_SECRET` / `ACCESSTOKEN_EXPIRY` — Admin JWT
   - Admin credentials and other service keys as in `.env.sample`

3. **Start the server**

   ```bash
   npm run dev    # Development (nodemon)
   npm start      # Production
   ```

4. Open **http://localhost:3000** (or your `PORT`) in the browser.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run server (production) |
| `npm run dev` | Run server with nodemon (development) |

---

## Public Pages

| Path | Description |
|------|-------------|
| `/` | Home (hero, about, rooms, gallery, directions, terms) |
| `/rooms` | Room listing (also available as section on home) |
| `/gallery` | Photo gallery (also on home) |
| `/cart` | Booking cart (add rooms, checkout) |
| `/reviews` | Guest reviews |
| `/admin` | Admin dashboard (protected) |

Static assets (HTML, CSS, JS, images) are served from `public/`. SPA-style navigation is handled on the client where applicable.

---

## API Overview

### Guest / booking (no auth unless noted)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/auth/google` | No | Start Google OAuth |
| GET | `/api/auth/google/callback` | No | OAuth callback |
| GET | `/api/auth/status` | No | Current auth status |
| POST | `/api/auth/logout` | No | Logout |
| GET | `/api/booking/rooms` | No | List rooms |
| GET | `/api/booking/gallery` | No | Gallery images |
| POST | `/api/booking/checkAvailability` | No | Check availability & price |
| GET | `/api/booking/cart` | Yes | Get cart |
| POST | `/api/booking/cart` | Yes | Add to cart |
| DELETE | `/api/booking/cart` | Yes | Remove from cart |
| POST | `/api/booking/checkout` | Yes | Create booking (Razorpay) |
| GET | `/api/booking/bookings` | Yes | User’s bookings |
| POST | `/api/payment/verify` | Yes | Verify Razorpay payment |
| POST | `/api/payment/razorpay-webhook` | No | Razorpay webhook (raw body) |

### Admin (JWT required)

- **Auth:** `/api/admin/login`, `/api/admin/verify-otp`, `/api/admin/logout`
- **Bookings:** GET/PATCH/DELETE bookings
- **Pricing:** Base price (PUT), seasonal prices (GET/POST/DELETE)
- **Blocked dates:** GET/POST/DELETE
- **Rooms:** Room images (GET/PATCH), gallery add/remove
- **Gallery:** GET/POST/DELETE/reorder
- **Cloudinary:** GET signature for uploads

Admin routes are under `/api/admin/*`. Send a valid JWT in the request (e.g. header or cookie) as required by the app.

---

## SEO and structured data

- **Sitemap:** `public/sitemap.xml` — Listed URLs for the production domain.
- **Robots:** `public/robots.txt` — Allows all crawlers and points to the sitemap.
- **JSON-LD:** The main `index.html` includes a **LodgingBusiness** schema (name, URL, telephone, priceRange, address, amenityFeature) in the `<head>` for search engines.

---

## Security and confidentiality

- **Never commit** `.env` or any file containing real API keys, secrets, or credentials.
- Use `.env.sample` only as a template; replace every value with your own (or placeholders) and keep production credentials out of the repo.
- Admin credentials, payment keys, and email/cloud API keys are sensitive; restrict access and rotate if exposed.

---

## License

ISC (see `package.json`).
