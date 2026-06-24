# 📚 AI Study Companion

[![Frontend Deployment](https://img.shields.io/badge/Frontend-Vercel-000000?style=for-the-badge&logo=vercel)](https://ai-study-companion-flame.vercel.app/#/)
[![Backend Deployment](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render)](https://ai-study-companion-gru5.onrender.com/)

**AI Study Companion** is a full-stack study planning application designed specifically for students preparing for placements. It serves as an all-in-one dashboard combining AI-generated study plans, mock tests, analytics, focus sessions, coding practice tracking, and daily notes.

---

## ✨ Features

- 🧠 **AI Timetable Generation**: Create study timetables instantly from a syllabus and target number of days.
- 📝 **AI Mock Tests**: Auto-generate mock tests for MCQ and coding-style questions.
- 📊 **Personalized Insights**: Get smart dashboard insights powered by Google Gemini.
- 🔐 **Secure Authentication**: JWT-based authentication using HTTP-only cookies for robust security.
- 🏆 **Gamified Dashboard**: Track study time, completed tasks, XP, level, and streaks.
- 📅 **Task Views**: Seamlessly switch between daily and all-plan views for study tasks.
- ⏱️ **Focus Mode**: Pomodoro-style sessions with automatic study-time logging.
- 💻 **Coding Prep Tracker**: Track DSA challenges and maintain platform stats.
- 🤝 **HR Round Prep**: Dedicated preparation page for HR interviews.
- 📓 **Daily Notes**: Write and save your daily notes directly on the platform.
- ⏳ **Test History**: Securely store and review past test history.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, React Router, Tailwind CSS, Recharts, Lucide React |
| **Backend** | Node.js, Express 5 |
| **Database** | MongoDB with Mongoose |
| **AI Integration** | Google Gemini (via `@google/generative-ai`) |
| **Authentication** | JWT, bcryptjs, cookie-parser |

---

## 📂 Project Structure

```text
study companion/
├── backend/
│   ├── middlewares/    # Custom middlewares (e.g., auth.js)
│   ├── models/         # Mongoose schemas (Analytics, Note, StudyPlan, etc.)
│   ├── routes/         # Express routes (ai, auth, plan, test, user)
│   └── server.js       # Backend entry point
├── frontend/
│   ├── src/
│   │   ├── api/        # Axios API configurations
│   │   ├── components/ # Reusable React components
│   │   ├── context/    # React context providers
│   │   └── pages/      # Page components
│   └── vite.config.js
├── app.js              # Standalone prototype logic
├── index.html          # Standalone prototype entry
└── style.css           # Standalone prototype styles
```

> **Note**: The `frontend/` and `backend/` folders contain the full-stack MERN app. The top-level `index.html`, `style.css`, and `app.js` are from a standalone static version/prototype.

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed and set up:
- **Node.js** (v18 or newer)
- **MongoDB** connection string (Atlas or local)
- **Google Gemini API Key**

### 🔧 Backend Setup

1. Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Create a `.env` file in the `backend/` directory with the following variables:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_atlas_uri
   JWT_SECRET=your_jwt_secret
   CLIENT_URL=http://localhost:5173
   GEMINI_API_KEY=your_gemini_api_key
   ```

3. Start the API server:
   ```bash
   npm run dev
   ```
   > The backend runs at `http://localhost:5000` by default.

### 💻 Frontend Setup

1. Navigate to the frontend directory and install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Create a `.env` file in the `frontend/` directory with the following variable:
   ```env
   VITE_API_URL=http://localhost:5000
   ```

3. Start the Vite dev server:
   ```bash
   npm run dev
   ```
   > Open `http://localhost:5173` in your browser.

---

## ⚙️ Environment Variables

| Variable | Location | Description |
| :--- | :--- | :--- |
| `PORT` | `backend/.env` | API server port (Defaults to `5000`). |
| `MONGO_URI` | `backend/.env` | MongoDB connection string. |
| `JWT_SECRET` | `backend/.env` | Secret key used to sign JWT tokens. |
| `CLIENT_URL` | `backend/.env` | Allowed frontend origin for CORS. |
| `GEMINI_API_KEY` | `backend/.env` | Google Gemini API key for AI generation. |
| `VITE_API_URL` | `frontend/.env` | Backend API base URL used by the React app. |

---

## 📡 API Endpoints

### 🔐 Auth
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user. |
| `POST` | `/api/auth/login` | Log in and set the auth cookie. |
| `GET` | `/api/auth/me` | Get the current authenticated user. |
| `POST` | `/api/auth/logout` | Clear the auth cookie. |

### 🤖 AI
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/ai/generate-timetable` | Generate a study timetable from syllabus text. |
| `POST` | `/api/ai/generate-test` | Generate a mock test for a specific topic. |
| `POST` | `/api/ai/generate-insights` | Generate personalized dashboard insights. |

### 📅 Plans
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/plan/daily` | Get today's study tasks. |
| `GET` | `/api/plan/all` | Get all study plans for the user. |
| `POST` | `/api/plan/task` | Add a manual study task. |
| `PATCH` | `/api/plan/task/:id` | Toggle or update a specific task. |
| `DELETE` | `/api/plan/task/:id` | Delete a single task. |
| `DELETE` | `/api/plan/group/:groupId` | Delete a generated plan group. |

### 👤 User
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/user/profile` | Get the user profile. |
| `PUT` | `/api/user/preferences` | Update user preferences. |
| `GET` | `/api/user/analytics` | Get study analytics. |
| `POST` | `/api/user/analytics/log-time` | Log focus-session study time. |
| `GET` | `/api/user/notes` | Get saved daily notes. |
| `POST` | `/api/user/notes` | Save daily notes. |
| `DELETE` | `/api/user/reset` | Reset user data. |

### 📝 Tests
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/tests` | Save a completed/generated test result. |
| `GET` | `/api/tests/history` | Get the authenticated user's test history. |

---

## 📜 Useful Scripts

Run these commands from their respective folders:

**Backend**
```bash
npm run dev    # Starts the server in development mode using nodemon
npm start      # Starts the server in production mode
```

**Frontend**
```bash
npm run dev    # Starts the Vite development server
npm run build  # Builds the app for production
npm run preview# Previews the production build
npm run lint   # Runs ESLint to catch errors
```

---

## ☁️ Deployment Notes

- Deploy the **backend** as a Node web service and set the root directory to `backend`.
- Deploy the **frontend** as a Vite app and set the root directory to `frontend`.
- Ensure `CLIENT_URL` on the backend is set to the frontend URL (e.g., `https://ai-study-companion-flame.vercel.app`).
- Ensure `VITE_API_URL` on the frontend is set to the backend URL (e.g., `https://ai-study-companion-gru5.onrender.com`).
- **Never** commit your `.env` files to version control.

---

## 📄 License

This project is currently marked as `ISC` in the `backend/package.json`.
