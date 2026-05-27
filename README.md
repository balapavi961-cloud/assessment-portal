# AssessPro - Assessment Portal

A full-stack online assessment platform similar to HackerRank/LeetCode, built with React, Node.js, Express, and MongoDB.

## Features

### Super Admin
- Secure JWT authentication
- Dashboard with analytics charts
- Create/manage tests (MCQ + Coding)
- Publish/unpublish tests
- View submissions and scores
- Auto MCQ evaluation
- Auto/manual coding evaluation
- Export results (CSV/PDF)
- User management with search

### Candidate
- Registration and login
- Join available tests
- MCQ with timer, palette, auto-save
- Monaco code editor (JS, Python, Java, C++)
- Run code & submit with test cases
- Fullscreen proctoring
- Tab switch detection with auto-submit
- View results and leaderboard

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Axios, Monaco Editor |
| Backend | Node.js, Express.js, JWT, bcrypt |
| Database | MongoDB, Mongoose |
| Charts | Recharts |

## Project Structure

```
Assessment Portal/
├── backend/
│   ├── config/          # DB & constants
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Auth, validation, errors
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   ├── services/        # Code executor, email
│   ├── scripts/         # Seed admin
│   └── server.js
├── frontend/
│   └── src/
│       ├── components/
│       ├── context/
│       ├── pages/
│       │   ├── admin/
│       │   ├── auth/
│       │   └── candidate/
│       └── utils/
└── README.md
```

## Prerequisites

- **Node.js** 18+ 
- **MongoDB** 6+ (local or Atlas)
- **Code execution** (optional, for coding questions):
  - Python 3 (`python`)
  - Node.js (`node`) — included with Node install
  - Java JDK (`javac`, `java`)
  - GCC/G++ (`g++`) for C++

## Installation

### 1. Clone and install dependencies

```bash
cd "Assessment Portal"

# Backend
cd backend
npm install
cp .env.example .env   # Edit with your values

# Frontend
cd ../frontend
npm install
cp .env.example .env
```

### 2. Configure environment

**backend/.env**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/assessment_portal
JWT_SECRET=your_secret_key_here
CLIENT_URL=http://localhost:5173
ADMIN_EMAIL=admin@assessment.com
ADMIN_PASSWORD=Admin@123456
```

**frontend/.env**
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Start MongoDB

```bash
# Windows (if installed as service)
net start MongoDB

# Or run mongod manually
mongod
```

### 4. Seed super admin

```bash
cd backend
npm run seed
```

Default credentials:
- **Email:** admin@assessment.com
- **Password:** Admin@123456

### 5. Run the application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Open **http://localhost:5173**

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Candidate signup |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Statistics |
| GET | `/api/admin/users` | List users |

### Tests (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tests` | Create test |
| GET | `/api/tests` | List tests |
| PATCH | `/api/tests/:id/publish` | Publish/unpublish |
| POST | `/api/tests/:testId/mcq` | Add MCQ |
| POST | `/api/tests/:testId/coding` | Add coding question |
| GET | `/api/tests/:testId/export/csv` | Export CSV |

### Submissions (Candidate)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/submissions/:testId/start` | Start test |
| PUT | `/api/submissions/:testId/mcq` | Save MCQ answer |
| POST | `/api/submissions/:testId/coding/run` | Run code |
| POST | `/api/submissions/:testId/submit` | Submit test |

## Database Collections

- **users** — Admins and candidates
- **tests** — Assessment metadata
- **mcqquestions** — MCQ questions
- **codingquestions** — Coding problems with test cases
- **submissions** — In-progress and completed attempts
- **results** — Aggregated result snapshots

## Deployment Guide

### Backend (Railway / Render / VPS)

1. Set environment variables on hosting platform
2. Use MongoDB Atlas for production database
3. Deploy:
```bash
cd backend
npm install --production
npm start
```

### Frontend (Vercel / Netlify)

1. Set `VITE_API_URL` to your production API URL
2. Build and deploy:
```bash
cd frontend
npm run build
# Deploy dist/ folder
```

### Production Checklist

- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Use MongoDB Atlas with IP whitelist
- [ ] Enable HTTPS
- [ ] Set `NODE_ENV=production`
- [ ] Configure SMTP for email notifications
- [ ] Install Python, Java, GCC on server for code execution
- [ ] Set appropriate `CODE_EXEC_TIMEOUT`
- [ ] Update `CLIENT_URL` for CORS

### Docker (Optional)

```dockerfile
# Example backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

## Security Notes

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens for stateless auth
- Role-based route protection
- Tab switch proctoring with violation limits
- Copy/paste prevention during exams
- Hidden test cases for coding evaluation
- Basic plagiarism detection for coding submissions

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connection failed | Ensure MongoDB is running and URI is correct |
| Code execution fails | Install required language runtimes on server |
| CORS errors | Match `CLIENT_URL` in backend .env |
| 401 on API calls | Check token in localStorage, re-login |

## License

MIT
