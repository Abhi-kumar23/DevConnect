import mongoose from "mongoose";
import Notification from "../models/Notification.js";

const onlineUsers = new Map();

const initSocket = (io) => {
    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        socket.on("userOnline", (userId) => {
            onlineUsers.set(userId, socket.id);
            io.emit("onlineUsers", Array.from(onlineUsers.keys()));
        });

        socket.on("joinChat", (chatId) => {
            socket.join(chatId);
        });

        socket.on("sendMessage", async (data) => {
            const message = await Message.create({
                chat: data.chatId,
                sender: data.senderId,
                text: data.text,
                readBy: [data.senderId],
            });

            await Notification.create({
                recipient: data.receiver,
                sender: data.sender,
                type: "message",
                message: "sent you a message",
            });

            io.to(data.chatId).emit("receiveMessage", message);
        });


        socket.on("typing", ({ chatId, userId }) => {
            socket.to(chatId).emit("typing", userId);
        });

        socket.on("stopTyping", ({ chatId, userId }) => {
            socket.to(chatId).emit("stopTyping", userId);
        });

        socket.on("markAsRead", async ({ chatId, userId }) => {
            await Message.updateMany(
                { chat: chatId, readBy: { $ne: userId } },
                { $push: { readBy: userId } }
            );
        });
        socket.on('joinProjectChat', (projectId) => {
            socket.join(`project_${projectId}`);
        });
        socket.on("disconnect", () => {
            for (let [userId, sockId] of onlineUsers.entries()) {
                if (sockId === socket.id) {
                    onlineUsers.delete(userId);
                    break;
                }
            }
            io.emit("onlineUsers", Array.from(onlineUsers.keys()));
        });
    });
};

export default initSocket;