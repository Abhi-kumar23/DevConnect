import jwt from "jsonwebtoken";
import Chat from "../models/Chat.js";
import Project from "../models/Project.js";

const onlineUsers = new Map();

const initSocket = (io) => {
  const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3001")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  // Origin validation
  io.use((socket, next) => {
    const origin = socket.handshake.headers.origin;

    if (!origin || !allowedOrigins.includes(origin)) {
      return next(new Error("Origin not allowed"));
    }

    next();
  });

  // JWT authentication
  io.use((socket, next) => {
    try {
      const token = socket.request.headers.cookie
        ?.split(";")
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith("accessToken="))
        ?.split("=")
        .slice(1)
        .join("=");

      if (!token) {
        throw new Error("Authentication required");
      }

      const decoded = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET
      );

      socket.userId = decoded._id;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });


  io.on("connection", (socket) => {
    const userId = socket.userId.toString();

    onlineUsers.set(userId, socket.id);
    socket.join(`user:${userId}`);

    io.emit("onlineUsers", [...onlineUsers.keys()]);

    socket.on("joinChat", async (chatId) => {
      const chat = await Chat.exists({
        _id: chatId,
        participants: userId,
      });

      if (chat) socket.join(chatId);
    });

    socket.on("joinProjectChat", async (projectId) => {
      const project = await Project.findOne({
        _id: projectId,
        "members.user": userId,
      }).select("_id");

      if (project) socket.join(`project_${projectId}`);
    });

    socket.on("typing", ({ chatId }) => {
      if (!socket.rooms.has(chatId)) return;
      socket.to(chatId).emit("typing", userId);
    });

    socket.on("stopTyping", ({ chatId }) => {
      if (!socket.rooms.has(chatId)) return;
      socket.to(chatId).emit("stopTyping", userId);
    });

    socket.on("disconnect", () => {
      if (onlineUsers.get(userId) === socket.id) {
        onlineUsers.delete(userId);
      }

      io.emit("onlineUsers", [...onlineUsers.keys()]);
    });
  });
};

export default initSocket;