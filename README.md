# TJDict - Taiwanese-English Dictionary Editor

A full-stack application for editing a Taiwanese-English dictionary, built with React, Hono, and Cloudflare Workers.

## Features

- 🔐 Secure authentication with email/password
- 🔑 TOTP-based two-factor authentication (2FA)
- 👥 Role-based access control (admin, editor, user)
- 🗄️ SQLite database with Cloudflare D1
- ⚡ Edge computing with Cloudflare Workers
- 🎯 Minimalist, functional UI for internal use

## Tech Stack

- [**React**](https://react.dev/) - Frontend UI framework
- [**Vite**](https://vite.dev/) - Build tooling and dev server
- [**Hono**](https://hono.dev/) - Backend API framework
- [**Cloudflare Workers**](https://developers.cloudflare.com/workers/) - Edge computing platform
- [**Cloudflare D1**](https://developers.cloudflare.com/d1/) - SQLite database

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Cloudflare account with Wrangler CLI configured
- D1 database created (see Database Setup below)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up the database schema:

```bash
npx wrangler d1 execute prod-tjdict --file=./src/worker/schema.sql
```

### Development

Start the development server:

```bash
npm run dev
```

Your application will be available at [http://localhost:5173](http://localhost:5173).

### First-Time Setup

1. Navigate to `/setup` (or the app will redirect you there automatically)
2. Create the admin account with your email and password
3. Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
4. Save the backup codes in a secure location
5. Verify the TOTP code to complete setup
6. You'll be redirected to the dashboard

### Database Setup

The application uses Cloudflare D1 for data storage. To create and configure the database:

```bash
# Create the database
npx wrangler d1 create prod-tjdict

# Update wrangler.json with the database_id from the output above

# Run the schema
npx wrangler d1 execute prod-tjdict --file=./src/worker/schema.sql
```

## Production

Build your project for production:

```bash
npm run build
```

Preview your build locally:

```bash
npm run preview
```

Deploy your project to Cloudflare Workers:

```bash
npm run build && npm run deploy
```

Monitor your workers:

```bash
npx wrangler tail
```

## Security Features

### Password Hashing
- Uses Web Crypto API with SHA-256
- Unique salt per user
- Minimum 8 character password requirement

### Two-Factor Authentication
- TOTP (Time-based One-Time Password) implementation
- 30-second time windows with ±1 window tolerance for clock skew
- 10 single-use backup codes
- QR code generation for easy setup

### Session Management
- JWT tokens with 7-day expiration
- httpOnly, secure, and sameSite cookies
- Temporary tokens for 2FA setup flow (10-minute expiration)

### Access Control
- Role-based permissions (admin, editor, user)
- Protected routes requiring authentication
- Initial admin account creation restricted to empty database

## API Endpoints

### Setup
- `GET /api/setup/status` - Check if initial setup is needed
- `POST /api/setup/create-admin` - Create the first admin account

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/verify-totp` - Verify TOTP code after login
- `POST /api/auth/logout` - Logout and clear session
- `GET /api/auth/me` - Get current user information

### 2FA Setup
- `GET /api/auth/setup-2fa` - Initialize 2FA setup (get QR code and backup codes)
- `POST /api/auth/setup-2fa` - Complete 2FA setup (verify and enable)

## Project Structure

```
tjdict/
├── src/
│   ├── react-app/          # Frontend React application
│   │   ├── components/     # React components
│   │   │   └── ProtectedRoute.tsx
│   │   ├── contexts/       # React contexts
│   │   │   └── AuthContext.tsx
│   │   ├── pages/          # Page components
│   │   │   ├── SetupPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── Setup2FAPage.tsx
│   │   │   └── DashboardPage.tsx
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   └── worker/             # Backend Cloudflare Worker
│       ├── utils/          # Utility functions
│       │   ├── auth.ts     # Authentication utilities
│       │   └── totp.ts     # TOTP utilities
│       ├── index.ts        # API routes
│       ├── types.ts        # TypeScript types
│       └── schema.sql      # Database schema
├── wrangler.json           # Cloudflare Workers configuration
└── package.json
```

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Vite Documentation](https://vitejs.dev/guide/)
- [React Documentation](https://reactjs.org/)
- [Hono Documentation](https://hono.dev/)
