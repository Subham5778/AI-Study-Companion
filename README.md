# AI Study Companion

AI Study Companion is a full-stack study planning app for students preparing for placements. It combines AI-generated study plans, mock tests, analytics, focus sessions, coding practice tracking, and daily notes in one dashboard.

## Live Links

- Frontend: [https://ai-study-companion-flame.vercel.app/#/](https://ai-study-companion-flame.vercel.app/#/)
- Backend API: [https://ai-study-companion-gru5.onrender.com/](https://ai-study-companion-gru5.onrender.com/)

## Features

- AI timetable generation from a syllabus and target number of days
- AI mock test generation for MCQ and coding-style questions
- Personalized dashboard insights powered by Google Gemini
- JWT authentication with HTTP-only cookies
- Dashboard stats for study time, completed tasks, XP, level, and streaks
- Daily and all-plan views for study tasks
- Focus mode with Pomodoro-style sessions and automatic study-time logging
- Coding preparation page with DSA challenge tracking and platform stats
- HR round preparation page
- Daily notes saved per user
- Test history storage for authenticated users

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router, Tailwind CSS, Recharts, Lucide React |
| Backend | Node.js, Express 5 |
| Database | MongoDB with Mongoose |
| AI | Google Gemini via `@google/generative-ai` |
| Auth | JWT, bcryptjs, cookie-parser |

## Project Structure

```text
study companion/
+-- backend/
|   +-- middlewares/
|   |   +-- auth.js
|   +-- models/
|   |   +-- Analytics.js
|   |   +-- Note.js
|   |   +-- StudyPlan.js
|   |   +-- Test.js
|   |   +-- User.js
|   +-- routes/
|   |   +-- ai.js
|   |   +-- auth.js
|   |   +-- plan.js
|   |   +-- test.js
|   |   +-- user.js
|   +-- server.js
+-- frontend/
|   +-- src/
|   |   +-- api/
|   |   +-- components/
|   |   +-- context/
|   |   +-- pages/
|   +-- vite.config.js
+-- app.js
+-- index.html
+-- style.css
```

The `frontend/` and `backend/` folders contain the full-stack app. The top-level `index.html`, `style.css`, and `app.js` are a standalone static version/prototype.

## Getting Started

### Prerequisites

- Node.js 18 or newer
- MongoDB connection string
- Google Gemini API key

### Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key
```

Start the API server:

```bash
npm run dev
```

The backend runs at `http://localhost:5000` by default.

### Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

Start the Vite dev server:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

## Environment Variables

| Variable | Location | Description |
| --- | --- | --- |
| `PORT` | `backend/.env` | API server port. Defaults to `5000`. |
| `MONGO_URI` | `backend/.env` | MongoDB connection string. |
| `JWT_SECRET` | `backend/.env` | Secret used to sign JWT tokens. |
| `CLIENT_URL` | `backend/.env` | Frontend origin allowed by CORS. |
| `GEMINI_API_KEY` | `backend/.env` | Google Gemini API key for AI features. |
| `VITE_API_URL` | `frontend/.env` | Backend API base URL used by the React app. |

## API Endpoints

### Auth

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register a new user. |
| `POST` | `/api/auth/login` | Log in and set the auth cookie. |
| `GET` | `/api/auth/me` | Get the current authenticated user. |
| `POST` | `/api/auth/logout` | Clear the auth cookie. |

### AI

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/ai/generate-timetable` | Generate a study timetable from syllabus text. |
| `POST` | `/api/ai/generate-test` | Generate a mock test for a topic. |
| `POST` | `/api/ai/generate-insights` | Generate personalized dashboard insights. |

### Plans

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/plan/daily` | Get today's study tasks. |
| `GET` | `/api/plan/all` | Get all study plans for the user. |
| `POST` | `/api/plan/task` | Add a manual study task. |
| `PATCH` | `/api/plan/task/:id` | Toggle or update a task. |
| `DELETE` | `/api/plan/task/:id` | Delete a single task. |
| `DELETE` | `/api/plan/group/:groupId` | Delete a generated plan group. |

### User

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/user/profile` | Get the user profile. |
| `PUT` | `/api/user/preferences` | Update user preferences. |
| `GET` | `/api/user/analytics` | Get study analytics. |
| `POST` | `/api/user/analytics/log-time` | Log focus-session study time. |
| `GET` | `/api/user/notes` | Get saved daily notes. |
| `POST` | `/api/user/notes` | Save daily notes. |
| `DELETE` | `/api/user/reset` | Reset user data. |

### Tests

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/tests` | Save a completed/generated test result. |
| `GET` | `/api/tests/history` | Get the authenticated user's test history. |

## Useful Scripts

Run these commands from their respective folders.

### Backend

```bash
npm run dev
npm start
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Deployment Notes

- Deploy the backend as a Node web service and set the root directory to `backend`.
- Deploy the frontend as a Vite app and set the root directory to `frontend`.
- Set `CLIENT_URL` on the backend to `https://ai-study-companion-flame.vercel.app`.
- Set `VITE_API_URL` on the frontend to `https://ai-study-companion-gru5.onrender.com`.
- Keep `.env` files out of version control.

## License

This project is currently marked as `ISC` in `backend/package.json`.
