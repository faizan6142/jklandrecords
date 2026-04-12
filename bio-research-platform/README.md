# 🔬 BioResearch Hub

A comprehensive full-stack web application for biology and medical physics researchers to collaborate, share research, and communicate in real time.

---

## 🚀 Features

- **Real-time Chat** — Room-based messaging with Socket.io (General, Biology, Medical Physics, Biophysics, Off-Topic)
- **Research Database** — Upload, search, and download research papers; like and categorize publications
- **Discussion Forums** — Topic threads with replies, voting, and category filtering
- **Researcher Profiles** — Follow/unfollow researchers, showcase expertise, display publications
- **JWT Authentication** — Secure register/login with hashed passwords
- **File Uploads** — PDF, Word, and image file support via Multer

---

## 🛠 Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | React 18, React Router v6, Axios, Socket.io-client |
| Backend   | Node.js, Express 4, Socket.io 4                 |
| Database  | MongoDB + Mongoose                              |
| Auth      | JSON Web Tokens (JWT), bcryptjs                 |
| Uploads   | Multer (local storage)                          |

---

## 📁 Directory Structure

```
bio-research-platform/
├── backend/
│   ├── server.js           # Entry point, Express + Socket.io setup
│   ├── config/db.js        # MongoDB connection
│   ├── models/             # Mongoose schemas
│   ├── routes/             # REST API routes
│   └── middleware/         # Auth + Upload middleware
└── frontend/
    ├── public/index.html
    └── src/
        ├── App.js
        ├── context/AuthContext.js
        ├── pages/          # Full page components
        └── components/     # Shared components
```

---

## ⚙️ Setup Instructions

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- npm or yarn

### 1. Clone / Navigate to project
```bash
cd bio-research-platform
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm install
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

The backend runs on **http://localhost:5000** and frontend on **http://localhost:3000**.

---

## 🔑 Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

| Variable       | Description                        | Default                                          |
|----------------|------------------------------------|--------------------------------------------------|
| `PORT`         | Backend server port                | `5000`                                           |
| `MONGODB_URI`  | MongoDB connection string          | `mongodb://localhost:27017/bio_research_platform` |
| `JWT_SECRET`   | Secret key for JWT signing         | *(required)*                                     |
| `JWT_EXPIRE`   | JWT token expiry                   | `7d`                                             |
| `NODE_ENV`     | Environment                        | `development`                                    |

---

## 📡 API Endpoints

### Auth — `/api/auth`
| Method | Endpoint    | Description             | Auth |
|--------|-------------|-------------------------|------|
| POST   | `/register` | Register new user       | No   |
| POST   | `/login`    | Login user              | No   |
| GET    | `/me`       | Get current user        | Yes  |
| POST   | `/logout`   | Logout (client-side)    | No   |

### Users — `/api/users`
| Method | Endpoint        | Description             | Auth |
|--------|-----------------|-------------------------|------|
| GET    | `/search?q=`    | Search users            | No   |
| GET    | `/:id`          | Get user profile        | No   |
| PUT    | `/:id`          | Update own profile      | Yes  |
| POST   | `/:id/follow`   | Toggle follow user      | Yes  |

### Messages — `/api/messages`
| Method | Endpoint     | Description               | Auth |
|--------|--------------|---------------------------|------|
| GET    | `/rooms`     | List available chat rooms | No   |
| GET    | `/:room`     | Get messages for room     | No   |
| POST   | `/`          | Send new message          | Yes  |
| DELETE | `/:id`       | Delete own message        | Yes  |

### Research — `/api/research`
| Method | Endpoint      | Description                  | Auth |
|--------|---------------|------------------------------|------|
| GET    | `/`           | List papers (search/filter)  | No   |
| GET    | `/:id`        | Get single paper             | No   |
| POST   | `/`           | Upload research paper        | Yes  |
| PUT    | `/:id`        | Edit own paper               | Yes  |
| DELETE | `/:id`        | Delete own paper             | Yes  |
| POST   | `/:id/like`   | Toggle like                  | Yes  |

### Forums — `/api/forums`
| Method | Endpoint          | Description              | Auth |
|--------|-------------------|--------------------------|------|
| GET    | `/`               | List topics              | No   |
| GET    | `/:id`            | Get topic detail         | No   |
| POST   | `/`               | Create topic             | Yes  |
| PUT    | `/:id`            | Edit own topic           | Yes  |
| DELETE | `/:id`            | Delete own topic         | Yes  |
| POST   | `/:id/replies`    | Add reply                | Yes  |
| POST   | `/:id/vote`       | Toggle vote on topic     | Yes  |

---

## 🌐 Socket.io Events

| Event            | Direction         | Payload                          |
|------------------|-------------------|----------------------------------|
| `join_room`      | Client → Server   | `{ room, userId, username }`     |
| `send_message`   | Client → Server   | `{ room, message }`              |
| `receive_message`| Server → Client   | Message object                   |
| `user_typing`    | Client → Server   | `{ room, username }`             |
| `stop_typing`    | Client → Server   | `{ room, username }`             |
| `typing`         | Server → Client   | `{ username }`                   |
| `stop_typing`    | Server → Client   | `{ username }`                   |
| `online_users`   | Server → Client   | Array of online user objects     |

---

## 📜 Usage Guide

1. **Register** an account at `/register` — provide username, email, password, bio, and expertise areas.
2. **Browse Research** at `/research` — search by keyword or filter by category. Click a paper to view details or download.
3. **Upload a Paper** — click "Upload Paper", fill in metadata and attach a file (PDF/DOC/DOCX/TXT).
4. **Join Chat** at `/chat` — select a room from the sidebar and start messaging in real time.
5. **Post in Forums** at `/forums` — create a discussion topic, reply to others, and vote on posts.
6. **View Profiles** — click a username anywhere to view their profile, research contributions, and follow them.

---

## 📄 License

MIT License — feel free to use, modify, and distribute.
