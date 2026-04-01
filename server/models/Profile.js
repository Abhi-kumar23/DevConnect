import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    bio: {
        type: String,
        maxlength: [500, 'Bio cannot exceed 500 characters'],
        default: ''
    },
    headline: {
        type: String,
        maxlength: [100, 'Headline cannot exceed 100 characters'],
        default: ''
    },
    skills: [{
        type: String,
        trim: true,
        maxlength: [50, 'Skill cannot exceed 50 characters']
    }],
    experience: [{
        title: {
            type: String,
            required: true
        },
        company: {
            type: String,
            required: true
        },
        location: String,
        from: {
            type: Date,
            required: true
        },
        to: Date,
        current: {
            type: Boolean,
            default: false
        },
        description: String
    }],
    education: [{
        school: {
            type: String,
            required: true
        },
        degree: {
            type: String,
            required: true
        },
        fieldOfStudy: String,
        from: {
            type: Date,
            required: true
        },
        to: Date,
        current: {
            type: Boolean,
            default: false
        },
        description: String
    }],
    certifications: [{
        name: {
            type: String,
            required: true
        },
        issuingOrganization: {
            type: String,
            required: true
        },
        issueDate: Date,
        expirationDate: Date,
        credentialId: String,
        credentialUrl: String
    }],
    social: {
        github: {
            type: String,
            match: [/^https?:\/\/(www\.)?github\.com\/[A-Za-z0-9_-]+$/, 'Please provide a valid GitHub URL']
        },
        linkedin: {
            type: String,
            match: [/^https?:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+$/, 'Please provide a valid LinkedIn URL']
        },
        twitter: {
            type: String,
            match: [/^https?:\/\/(www\.)?twitter\.com\/[A-Za-z0-9_-]+$/, 'Please provide a valid Twitter URL']
        },
        portfolio: {
            type: String,
            match: [/^https?:\/\/.+\..+/, 'Please provide a valid URL']
        }
    },
    location: {
        type: String,
        maxlength: [100, 'Location cannot exceed 100 characters']
    },
    availability: {
        type: String,
        enum: ['available', 'open', 'busy', 'not-looking'],
        default: 'open'
    },
    yearsOfExperience: {
        type: Number,
        min: 0,
        max: 50
    },
    preferredRoles: [String],
    preferredLocations: [String],
    openToWork: {
        type: Boolean,
        default: true
    },
    openToCollaborate: {
        type: Boolean,
        default: true
    },
    profileViews: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes for search
profileSchema.index({ bio: 'text', headline: 'text', skills: 'text' });
profileSchema.index({ location: 1 });
profileSchema.index({ yearsOfExperience: 1 });
profileSchema.index({ openToWork: 1 });

// Method to get profile completion percentage
profileSchema.methods.getCompletionPercentage = function() {
    const fields = ['bio', 'headline', 'skills', 'experience', 'education', 'social', 'location'];
    const completed = fields.filter(field => {
        if (field === 'skills') return this.skills && this.skills.length > 0;
        if (field === 'experience') return this.experience && this.experience.length > 0;
        if (field === 'education') return this.education && this.education.length > 0;
        if (field === 'social') return Object.values(this.social).some(v => v);
        return this[field];
    }).length;
    
    return Math.round((completed / fields.length) * 100);
};

const Profile = mongoose.model("Profile", profileSchema);

export default Profile;