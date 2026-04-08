import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Project title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Project description is required'],
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    githubLink: {
        type: String,
        trim: true
    },
    demoLink: {
        type: String,
        trim: true
    },
    technologies: [{
        type: String,
        trim: true
    }],
    visibility: {
        type: String,
        enum: ['public', 'private'],
        default: 'public'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        role: {
            type: String,
            enum: ['owner', 'contributor'],
            default: 'contributor'
        }
    }],
    pendingRequests: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        requestedAt: {
            type: Date,
            default: Date.now
        },
        message: {
            type: String,
            maxlength: [500, 'Message cannot exceed 500 characters']
        }
    }],
    groupChat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProjectGroupChat'
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'archived'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Indexes
projectSchema.index({ title: 'text', description: 'text', technologies: 'text' });
projectSchema.index({ createdBy: 1 });
projectSchema.index({ visibility: 1 });
projectSchema.index({ 'members.user': 1 });

// Method to check if user is member
projectSchema.methods.isMember = function(userId) {
    return this.members.some(m => m.user.toString() === userId.toString());
};

// Method to check if user has pending request
projectSchema.methods.hasPendingRequest = function(userId) {
    return this.pendingRequests.some(r => r.user.toString() === userId.toString());
};

// Method to add member
projectSchema.methods.addMember = async function(userId, role = 'contributor') {
    if (!this.isMember(userId)) {
        this.members.push({ user: userId, role });
        await this.save();
    }
};

// Method to remove pending request
projectSchema.methods.removePendingRequest = function(userId) {
    this.pendingRequests = this.pendingRequests.filter(
        r => r.user.toString() !== userId.toString()
    );
};

const Project = mongoose.model('Project', projectSchema);

export default Project;