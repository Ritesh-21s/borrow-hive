# BorrowHive 🐝

A hyper-local peer-to-peer community resource exchange platform.

## Stack

| Layer | Technology |
|---|---|
| Mobile | React Native + Expo (JavaScript) |
| Backend | Node.js + Express |
| Database | MongoDB Atlas + Mongoose |
| Images | Cloudinary (unsigned upload) |
| Real-time | Socket.IO |
| Push | Expo Push Service |
| Auth | JWT + bcrypt |

---

## Quick Start

### 1. Backend

```bash
cd server
cp .env.example .env
# Fill in MONGODB_URI, JWT_SECRET, CLOUDINARY_* in .env
npm install
node scripts/seed.js   # Creates demo community + users
npm run dev            # Starts on http://localhost:5000
```

### 2. Mobile

```bash
cd mobile
cp .env.example .env   # Set EXPO_PUBLIC_API_URL to your local IP
# e.g. EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api
npm install
npx expo start
```

Scan the QR with Expo Go on your phone, or press `a` for Android emulator / `i` for iOS simulator.

---

## Demo Credentials

After running the seed script:

| Email | Password |
|---|---|
| ritesh@kpriet.ac.in | password123 |
| arun@kpriet.ac.in | password123 |
| priya@kpriet.ac.in | password123 |

Community invite code: **KPRIET2026**

---

## Cloudinary Setup

1. Create a free Cloudinary account at [cloudinary.com](https://cloudinary.com)
2. Go to **Settings → Upload → Upload presets**
3. Create an **unsigned** preset named `borrowhive_unsigned`
4. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in `server/.env`
5. Set `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` and `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET` in `mobile/.env`

---

## Deployment

### Server → Render

1. Push `server/` to a GitHub repo
2. Create a new **Web Service** on [render.com](https://render.com)
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add all environment variables from `.env.example`

### Mobile → Expo

```bash
cd mobile
npx eas build --platform android   # APK
npx eas build --platform ios       # IPA (requires Apple Dev account)
```

---

## API Response Format

**Success:**
```json
{ "success": true, "message": "...", "data": {} }
```

**Error:**
```json
{ "success": false, "message": "Human-readable error." }
```

---

## Architecture

```
React Native (Expo)
  └── axios client (JWT injected)
      └── Express API
          ├── JWT middleware
          ├── communityId scope guard
          ├── Controllers
          └── Mongoose models → MongoDB Atlas
Socket.IO (real-time chat)
Expo Push Service (notifications)
Cloudinary (images — url+publicId only, never binary in DB)
```

---

## Key Engineering Rules

- **All queries scoped by `communityId`** — cross-community access returns 403
- **Borrow overlap check:** `existing.startTime < end AND existing.endTime > start`
- **Atomic ride booking:** single `findOneAndUpdate` with `$gte` + `$inc` — no read-then-write
- **Reviews gated** by verified completed transaction
- **No stack traces** exposed to clients
- **Rate limiting** on auth, listing/ride/favor creation, messages, reviews
