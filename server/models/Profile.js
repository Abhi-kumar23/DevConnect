const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    bio: { 
        type: String, 
        default: "" 
    },
    skills: {
        type: [String],
        default: []
    },
    github: { 
        type: String,
        default:"" 
    },
    linkedin: { 
        type: String,
        default:"" 
    },
    profilePic: { 
        type: String 
    }
}, { timestamps: true });

module.exports = mongoose.model('Profile', profileSchema);