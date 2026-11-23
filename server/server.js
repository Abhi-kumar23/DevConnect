import "./config/env.js";

import express from "express";
import cors from "cors";
import morgan from "morgan";
import http from "node:http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import { pathToFileURL } from "node:url";

import connectDB from "./config/database.js";
import connectRedis from "./config/redis.js";
import { createRateLimiter } from "./utils/rateLimit.js";

import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import connectionsRoutes from "./routes/connectionsRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import likeRoutes from "./routes/likeRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";

import notificationRoutes from "./routes/notificationRoutes.js";

import initSocket from "./sockets/chatSocket.js";
import { createIndexes, createGoogleIdIndex } from "./config/dbIndexes.js";
import { testEmailConnection } from "./utils/mail.js";

// Express application factory
export const createApp = () => {
    const app = express();

    const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

    app.set("allowedOrigins", allowedOrigins);

    app.use(cookieParser());

    app.use(cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error("Origin is not allowed by CORS"));
        },
        credentials: true,
    }));

    const csrfProtection = (req, res, next) => {
        const safeMethods = ["GET", "HEAD", "OPTIONS"];

        if (safeMethods.includes(req.method)) {
            return next();
        }

        const origin = req.get("Origin");

        if (!origin || !allowedOrigins.includes(origin)) {
            return res.status(403).json({
                success: false,
                message: "Invalid request origin",
            });
        }

        return next();
    };

    app.use("/api", csrfProtection);

    app.use(express.json({ limit: "1mb" }));
    app.use(morgan("dev"));

    const apiLimiter = createRateLimiter({
        prefix: "rl:api:",
        windowMs: 60 * 1000,
        max: 100,
        message: "Too many requests, please try again later.",
        standardHeaders: true,
        legacyHeaders: false,
    });

    const authLimiter = createRateLimiter({
        prefix: "rl:auth:",
        windowMs: 15 * 60 * 1000,
        max: 5,
        skipSuccessfulRequests: true,
        message: "Too many login attempts, please try again later.",
    });

    app.use("/api/", apiLimiter);

    app.use("/api/auth/login", authLimiter);
    app.use("/api/auth/register", authLimiter);

    // Routes
    app.use("/api/auth", authRoutes);
    app.use("/api/profiles", profileRoutes);
    app.use("/api/posts", postRoutes);
    app.use("/api/projects", projectRoutes);
    app.use("/api/connections", connectionsRoutes);
    app.use("/api/chats", chatRoutes);
    app.use("/api/likes", likeRoutes);
    app.use("/api/comments", commentRoutes);
    app.use("/api/search", searchRoutes);
    app.use("/api/notifications", notificationRoutes);

    app.get("/health", (req, res) => {
        res.status(200).json({
            status: "success",
            message: "Server is running",
        });
    });

    // Error handler
    app.use((err, req, res, next) => {
        if (res.headersSent) {
            return next(err);
        }

        if (err.name === "MulterError") {
            return res.status(400).json({
                success: false,
                message: err.code === "LIMIT_FILE_SIZE"
                    ? "Images must be 5 MB or smaller"
                    : err.message,
            });
        }

        const statusCode = err.statusCode || err.status || 500;

        return res.status(statusCode).json({
            success: false,
            message: err.message || "Something went wrong",
            errors: err.errors || [],
        });
    });

    return app;
};

// Infrastructure and HTTP server startup
export const startServer = async () => {
    await connectDB();
    await connectRedis();
    await testEmailConnection();

    await createIndexes();
    await createGoogleIdIndex();

    const app = createApp();
    const server = http.createServer(app);

    const io = new Server(server, {
        cors: {
            origin: app.get("allowedOrigins"),
            credentials: true,
        },
    });

    app.set("io", io);
    initSocket(io);

    const PORT = process.env.PORT || 8000;

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(PORT, resolve);
    });

    console.log(`Server running on port ${PORT}`);

    return { app, server, io };
};

// Start only when this file is executed directly
const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
    startServer().catch((error) => {
        console.error("Server startup failed:", error);
        process.exit(1);
    });
}
