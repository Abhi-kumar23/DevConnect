import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Project from "../models/Project.js";
import ProjectGroupChat from "../models/ProjectGroupChat.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

// Create Project
const createProject = asyncHandler(async (req, res) => {
    const { title, description, githubLink, demoLink, technologies, visibility } = req.body;

    if (!title || !description) {
        throw new ApiError(400, "Title and description are required");
    }

    if (visibility && !["public", "private"].includes(visibility)) {
        throw new ApiError(400, "Visibility must be public or private");
    }

    const technologyList = Array.isArray(technologies)
        ? technologies
        : String(technologies || "").split(",");

    const project = await Project.create({
        title: title.trim(),
        description: description.trim(),
        githubLink,
        demoLink,
        technologies: [...new Set(technologyList.map((technology) => String(technology).trim()).filter(Boolean))],
        visibility: visibility || 'public',
        createdBy: req.user._id,
        members: [{ user: req.user._id, role: 'owner' }]
    });

    // Create group chat for the project
    const groupChat = await ProjectGroupChat.create({
        project: project._id,
        participants: [req.user._id]
    });

    project.groupChat = groupChat._id;
    await project.save();

    await project.populate('createdBy', 'firstName lastName profilePicture');
    await project.populate('members.user', 'firstName lastName profilePicture');

    return res.status(201).json(
        new ApiResponse(201, project, "Project created successfully")
    );
});

// Get All Projects
const getAllProjects = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, visibility } = req.query;
    const skip = (page - 1) * limit;

    let query = { status: 'active' };

    // Filter by visibility
    if (visibility === 'public') {
        query.visibility = 'public';
    } else if (visibility === 'my') {
        query.createdBy = req.user._id;
    } else if (visibility === 'joined') {
        query['members.user'] = req.user._id;
    } else {
        // Default: show public projects + user's projects + projects user is member of
        query.$or = [
            { visibility: 'public' },
            { createdBy: req.user._id },
            { 'members.user': req.user._id }
        ];
    }

    const projects = await Project.find(query)
        .select("-pendingRequests")
        .populate('createdBy', 'firstName lastName profilePicture')
        .populate('members.user', 'firstName lastName profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const total = await Project.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(200, {
            projects,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }, "Projects fetched successfully")
    );
});

// Get Single Project
// Get Single Project
const getProjectById = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    const isOwner =
        project.createdBy.toString() === req.user._id.toString();

    const isMember = project.isMember(req.user._id);

    // Private projects are visible only to their owner and members
    if (project.visibility === "private" && !isOwner && !isMember) {
        throw new ApiError(404, "Project not found");
    }

    // Do not expose member email addresses
    await project.populate(
        "createdBy",
        "firstName lastName profilePicture"
    );

    await project.populate(
        "members.user",
        "firstName lastName profilePicture"
    );

    // Only the owner should see pending join requests
    if (isOwner) {
        await project.populate(
            "pendingRequests.user",
            "firstName lastName profilePicture"
        );
    } else {
        project.pendingRequests = [];
    }

    return res.status(200).json(
        new ApiResponse(200, project, "Project fetched successfully")
    );
});

// Send Join Request
const sendJoinRequest = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { message } = req.body;

    const project = await Project.findById(projectId);

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    // Check if already a member
    if (project.isMember(req.user._id)) {
        throw new ApiError(400, "You are already a member of this project");
    }

    // Check if request already sent
    if (project.hasPendingRequest(req.user._id)) {
        throw new ApiError(400, "Join request already sent");
    }

    // For public projects, auto-add as member
    if (project.visibility === 'public') {
        project.members.push({ user: req.user._id });
        await project.save();

        // Add to group chat
        const groupChat = await ProjectGroupChat.findById(project.groupChat);
        if (groupChat && !groupChat.participants.some((id) => id.toString() === req.user._id.toString())) {
            groupChat.participants.push(req.user._id);
            await groupChat.save();
        }

        return res.status(200).json(
            new ApiResponse(200, project, "Joined project successfully")
        );
    }

    // For private projects, add to pending requests
    project.pendingRequests.push({
        user: req.user._id,
        message: message || ""
    });
    await project.save();

    // Create notification for project owner
    await Notification.upsertNotification({
        recipient: project.createdBy,
        sender: req.user._id,
        dedupeKey: `project-join:${req.user._id}:${project._id}`,
        type: "project_join_request",
        title: "New Project Join Request",
        message: `${req.user.firstName} ${req.user.lastName} requested to join your project`,
        data: { projectId: project._id, userId: req.user._id },
        actionUrl: `/projects/${project._id}`,
    });

    return res.status(200).json(
        new ApiResponse(200, null, "Join request sent successfully")
    );
});

// Accept Join Request
const acceptJoinRequest = asyncHandler(async (req, res) => {
    const { projectId, userId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    // Check if user is project owner
    if (project.createdBy.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Only project owner can accept requests");
    }

    // Check if request exists
    const request = project.pendingRequests.find(r => r.user.toString() === userId);
    if (!request) {
        throw new ApiError(404, "Join request not found");
    }

    // Add user as member
    project.members.push({ user: userId });
    project.pendingRequests = project.pendingRequests.filter(r => r.user.toString() !== userId);
    await project.save();

    // Add to group chat
    const groupChat = await ProjectGroupChat.findById(project.groupChat);
    if (groupChat && !groupChat.participants.some((id) => id.toString() === userId.toString())) {
        groupChat.participants.push(userId);
        await groupChat.save();
    }

    // Create notification for user
    const requester = await User.findById(userId);
    await Notification.upsertNotification({
        recipient: userId,
        sender: req.user._id,
        dedupeKey: `project-join-accepted:${req.user._id}:${userId}:${project._id}`,
        type: "connection_accept",
        title: "Join Request Accepted",
        message: `${req.user.firstName} accepted your request to join "${project.title}"`,
        data: { projectId: project._id },
        actionUrl: `/projects/${project._id}/chat`,
    });

    return res.status(200).json(
        new ApiResponse(200, project, "Join request accepted")
    );
});

// Reject Join Request
const rejectJoinRequest = asyncHandler(async (req, res) => {
    const { projectId, userId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    if (project.createdBy.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Only project owner can reject requests");
    }

    project.pendingRequests = project.pendingRequests.filter(r => r.user.toString() !== userId);
    await project.save();

    return res.status(200).json(
        new ApiResponse(200, null, "Join request rejected")
    );
});

// Get Project Chat
const getProjectChat = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    // Check if user is member
    if (!project.isMember(req.user._id)) {
        throw new ApiError(403, "You must be a member to access the chat");
    }

    const groupChat = await ProjectGroupChat.findById(project.groupChat)
        .populate('messages.sender', 'firstName lastName profilePicture');

    return res.status(200).json(
        new ApiResponse(200, groupChat, "Chat fetched successfully")
    );
});

// Send Message to Project Chat
const sendProjectMessage = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { content } = req.body;

    if (!content) {
        throw new ApiError(400, "Message content is required");
    }

    const project = await Project.findById(projectId);

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    if (!project.isMember(req.user._id)) {
        throw new ApiError(403, "You must be a member to send messages");
    }

    const groupChat = await ProjectGroupChat.findById(project.groupChat);

    const message = {
        sender: req.user._id,
        content,
        createdAt: new Date()
    };

    groupChat.messages.push(message);
    groupChat.lastMessage = content;
    groupChat.lastMessageAt = new Date();
    await groupChat.save();

    await groupChat.populate('messages.sender', 'firstName lastName profilePicture');
    const populatedMessage = groupChat.messages[groupChat.messages.length - 1];
    req.app.get("io")?.to(`project_${projectId}`).emit("projectMessage", populatedMessage);

    return res.status(201).json(
        new ApiResponse(201, populatedMessage, "Message sent successfully")
    );
});

export {
    createProject,
    getAllProjects,
    getProjectById,
    sendJoinRequest,
    acceptJoinRequest,
    rejectJoinRequest,
    getProjectChat,
    sendProjectMessage
};
