# Online Assessment Portal

A complete full-stack web application for conducting MCQ and Coding tests. 

## Features
- **Admin Dashboard**: Manage assessments, candidates, MCQs, and Coding problems.
- **Candidate Interface**: Take assessments with timer, auto-save, and built-in code editor.
- **Code Execution**: Utilizes the Piston API to compile and run Python, Java, C, and C++ code.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Vite, Monaco Editor
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas

## Getting Started

### Prerequisites
- Node.js installed
- MongoDB URI (local or Atlas)

### Backend Setup
1. Navigate to the `backend` folder: `cd backend`
2. Install dependencies: `npm install`
3. Configure environment variables in `backend/.env`:
```
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
```
4. Start the server: `npm start` (or `node server.js`)
*Note: On the first run, it will automatically create an admin account: `admin@example.com` / `admin123`.*

### Frontend Setup
1. Navigate to the `frontend` folder: `cd frontend`
2. Install dependencies: `npm install`
3. Update the API Base URL in `src/api/axiosClient.js` if necessary (defaults to `http://localhost:5000/api`).
4. Start the development server: `npm run dev`

## Deployment
- **Frontend**: Designed to be deployed on Vercel (includes `vercel.json`). Build command: `npm run build`, Output directory: `dist`.
- **Backend**: Designed to be deployed on Render (includes `render.yaml`).
