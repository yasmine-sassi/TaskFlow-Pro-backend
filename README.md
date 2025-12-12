## Setup for Collaborators

**Read this if you're cloning the repo for the first time.**

### Prerequisites – Install First

Before you start, install these on your machine:

1. **Node.js 18+** from [nodejs.org](https://nodejs.org/)
   - Verify: Open terminal and run `node --version`
2. **Git** from [git-scm.com](https://git-scm.com/)
   - Verify: `git --version`
3. **Supabase access** – Ask the project lead for:
   - Your Supabase **project reference ID** (looks like: `qletmpgetunvaydqvcgl`)
   - Your Supabase **database password**

### Complete Setup Steps (Copy & Paste)

#### Step 1: Clone the Repository

```bash
git clone <repo-url>
cd my-nest-project
```

(Replace `<repo-url>` with the actual GitHub/Git URL)

#### Step 2: Install Dependencies

```bash
npm ci
```

This installs exact versions of all packages. Wait for it to finish—it may take a minute.

#### Step 3: Create Your `.env` File

Copy the example:

```bash
cp .env.example .env
```

Open `.env` in your editor (Visual Studio Code, Sublime, etc.) and replace:

- `<ref>` → Your Supabase project reference ID (same in both URLs)
- `<password>` → Your Supabase database password
- Keep everything else as-is

**just copy this in your file .env:**

```env
DATABASE_URL="postgresql://postgres.qletmpgetunvaydqvcgl:syrine22005572004@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
DIRECT_URL="postgresql://postgres.qletmpgetunvaydqvcgl:syrine22005572004@db.qletmpgetunvaydqvcgl.supabase.co:5432/postgres?sslmode=require"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRATION="7d"
PORT=3000
```

#### Step 4: Set Up Prisma

Generate the Prisma client:

```bash
npx prisma generate
```

#### Step 5: Seed Test Data (Optional But Recommended)

Populate your database with fake data for testing:

```bash
npm run seed
```

If successful, you'll see:
```
Seed data created. Admin login: admin@taskflow.dev / Password123!
```

#### Step 6: Start the Server

```bash
npm run start:dev
```

You should see:
```
[NestApplication] successfully started
Server running on http://localhost:3000
```

**The server is now running!** Leave this terminal window open.

#### Step 7: Test Authentication (In a New Terminal)

Open a **new terminal/PowerShell window** (keep the server running in the first one).

**Test 1: Register a new user**

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","password":"TestPass123!","name":"New User"}'
```

You should get back a JSON response with an `accessToken`.

**Test 2: Login**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","password":"TestPass123!"}'
```

Copy the `accessToken` value from the response (it's a long string).

**Test 3: Get your user info**

```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Replace `YOUR_TOKEN_HERE` with the token from Test 2.

If you got a response with user details, **everything is working!**

---

### When You're Ready to Develop

- **Start the dev server:** `npm run start:dev`
- **Run tests:** `npm run test`
- **Lint code:** `npm run lint`
- **Build for production:** `npm run build`
- **See all available commands:** Look at `scripts` in `package.json`

### Project Structure

```
my-nest-project/
├── src/
│   ├── auth/              ← Authentication (login, register, guards)
│   ├── prisma/            ← Database connection service
│   ├── app.module.ts      ← Main app module
│   └── main.ts            ← App entry point
├── prisma/
│   ├── schema.prisma      ← Database schema (synced from Supabase)
│   └── seed.ts            ← Test data script
├── docs/
│   └── AUTH_SUMMARY.md    ← Detailed auth documentation
├── .env.example           ← Template for .env (already copied to .env)
├── package.json           ← Dependencies & scripts
└── README.md              ← This file
```

### Troubleshooting

**❌ "Cannot find module @prisma/client"**
```bash
npx prisma generate
```

**❌ "Port 3000 already in use"**
```bash
npm run start:dev -- --port 3001
```

**❌ "Database connection refused"**
- Double-check `.env` has correct `DATABASE_URL` and `DIRECT_URL`
- Confirm Supabase project is active (check dashboard)
- Verify internet connection

**❌ "TLS certificate error" (Windows)**
- This is already handled in the code
- If you still see it, contact the project lead

**❌ "Seed data already exists"**
```bash
# Delete and re-run (careful—this clears your data)
npm run seed
```

### Questions?

- Check [docs/AUTH_SUMMARY.md](docs/AUTH_SUMMARY.md) for auth details
- Ask the project lead in Slack/Discord
- Check the troubleshooting section above
