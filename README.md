# DevConnect API - Developer Networking Platform

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.x-brightgreen.svg)](https://mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-black.svg)](https://socket.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)


A modern, production-ready social networking platform built for developers to connect, share knowledge, and collaborate. DevConnect combines the best features of professional networking with real-time communication.

## 🚀 Features

- 🔐 **JWT Authentication** with secure token management
- 👤 **User Profiles** with skills, experience, and social links
- 📝 **Posts & Feed** with likes, comments, and replies
- 🤝 **Connection System** with request/accept functionality
- 💬 **Real-time Chat** powered by Socket.io
- 🔔 **Real-time Notifications** for all interactions
- 🔍 **Advanced Search** by users, skills, and posts
- 📸 **Image Upload** with Cloudinary integration
- 🛡️ **Security** with rate limiting, XSS protection, and input sanitization

## 📋 Table of Contents

- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
  - [Authentication](#authentication)
  - [User Profile](#user-profile)
  - [Posts](#posts)
  - [Comments](#comments)
  - [Connections](#connections)
  - [Chat](#chat)
  - [Notifications](#notifications)
  - [Search](#search)
- [Error Handling](#error-handling)
- [WebSocket Events](#websocket-events)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| Node.js | Runtime environment |
| Express.js | Web framework |
| MongoDB | Database |
| Mongoose | ODM |
| JWT | Authentication |
| Socket.io | Real-time communication |
| Cloudinary | Image storage |
| Nodemailer | Email notifications |
| Helmet | Security headers |
| Express Validator | Input validation |

# 🚀 DevConnect Backend

A scalable social networking backend built with **Node.js, Express, MongoDB**, and real-time chat using **Socket.io**.

---

## 🏗️ Tech Stack Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                      Client (React)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Express)                    │
│  • Authentication Middleware                                │
│  • Rate Limiting                                            │
│  • Request Validation                                       │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌────────────────┐    ┌───────────────┐
│  Controllers  │    │   Services     │    │   Middleware  │
│  • User       │    │  • Email       │    │  • Auth       │
│  • Post       │    │  • Cache       │    │  • Upload     │
│  • Comment    │    │  • Notification│    │  • Error      │
│  • Chat       │    └────────────────┘    └───────────────┘
└───────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                    MongoDB Database                         │
│  • Users | Profiles | Posts | Comments                      │
│  • Likes | Connections | Chats | Messages                   │
│  • Notifications                                            │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Steps

# Clone repository
```bash
git clone https://github.com/yourusername/devconnect-backend.git
cd devconnect-backend
```

# Install dependencies
```bash
npm install
```

# Create environment file
```bash
cp .env.example .env
```

# Start development server
```bash
npm run dev
```

Step 1: Clone the Repository
```bash
git clone https://github.com/yourusername/devconnect-backend.git
cd devconnect-backend
```

Step 2: Install Dependencies
```bash
npm install
```

Step 3: Configure Environment Variables
Create a .env file in the root directory:

```env
# Server Configuration
PORT=8000
NODE_ENV=development
CLIENT_URL=http://localhost:3000


# Database
MONGO_URI=mongodb://localhost:27017/devconnect

# JWT Secrets
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRE=7d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRE=30d

# Cloudinary (for image upload)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=DevConnect <noreply@devconnect.com>
```

Step 4: Start MongoDB
```bash
# Local MongoDB
mongod


# OR if using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

Step 5: Run the Application
```bash
# Development mode
npm run dev

# Production mode
npm start
Your server will start at http://localhost:8000
```
