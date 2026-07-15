import { v2 as cloudinary } from "cloudinary"
import fs from "fs"
import "../config/env.js";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath, folder = "devconnect") => {
    try {
        if (!localFilePath) return null
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "image",
            folder,
        })
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        console.error("Cloudinary upload error:", error.message);
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath)
        }
        return null;
    }
}

//uploadOnCloudinary, deleteFromCloudinary, getPublicIdFromUrl
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
    try {
        if (!publicId) return null;

        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType, // image / video / raw
        });

        return result;
    } catch (error) {
        console.error("Error deleting from Cloudinary:", error);
        return null;
    }
};


const getPublicIdFromUrl = (url) => {
    try {
        if (!url) return null;

        // Example URL:
        // https://res.cloudinary.com/demo/image/upload/v1234567890/folder/file.jpg

        const uploadMarker = "/upload/";
        const afterUpload = url.split(uploadMarker)[1];
        if (!afterUpload) return null;
        const withoutVersion = afterUpload.replace(/^v\d+\//, "");
        return withoutVersion.replace(/\.[^/.]+$/, "");
    } catch (error) {
        return null;
    }
}


export { uploadOnCloudinary, deleteFromCloudinary, getPublicIdFromUrl };
