const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();
const app = express();

// app.use(cors());
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(express.json());
app.use(morgan("dev"));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
});
app.use("/api/", apiLimiter);

// DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(console.error);

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/profile", require("./routes/profileRoutes"));
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/api/connections", require("./routes/connectionsRoutes"));
app.use("/api/chats", require("./routes/chatRoutes"));
app.use("/api/search", require("./routes/searchRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));

// Error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ message: err.message });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000"],
    credentials: true,
  },
});

const initSocket = require("./sockets/chatSocket");
initSocket(io);

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log("Server running..."));