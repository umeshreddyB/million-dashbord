# Task Manager

A full-stack task management web app built with **React** and **Node.js**.

## Features

- **Admin** creates user accounts (username + password) and assigns tasks
- **Users** log in with credentials shared by the admin
- Users see all team members; clicking a name shows that person's tasks
- Users can view everyone's tasks but **only mark their own** as done (enforced by username on server)

## Default Admin Login

| Username | Password  |
|----------|-----------|
| `admin`  | `admin123` |

## Getting Started

### 1. Install backend dependencies

```bash
cd backend
npm install
```

### 2. Start the backend server

```bash
npm start
```

Server runs at `http://localhost:5000`

### 3. Install frontend dependencies (new terminal)

```bash
cd frontend
npm install
```

### 4. Start the frontend

```bash
npm run dev
```

App opens at `http://localhost:3000`

## How to Use

1. Log in as **admin** and create users with username/password
2. Share those credentials with each user
3. Assign tasks to users from the admin panel
4. Users log in, click team member names to view tasks
5. Each user can only check off tasks assigned to their own username

## Tech Stack

- **Frontend:** React, Vite, React Router
- **Backend:** Node.js, Express, JSON file storage
- **Auth:** JWT tokens, bcrypt password hashing
