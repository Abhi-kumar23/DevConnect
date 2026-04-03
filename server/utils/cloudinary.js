import { v2 as cloudinary } from "cloudinary"
import fs from "fs"
import dotenv from "dotenv";
dotenv.config({ path: "./config/.env" });


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    console.log("Uploading to Cloudinary. File path:", localFilePath);
    try {
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        console.log("Cloudinary upload successful. URL:", response.url);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        console.error("Cloudinary upload error details:", error.message);
        console.error("Full error:", error);
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


const getPublicIdFromUrl = async (url) => {
    try {
        if (!url) return null;

        // Example URL:
        // https://res.cloudinary.com/demo/image/upload/v1234567890/folder/file.jpg

        const parts = url.split("/");
        const fileWithExt = parts.slice(-2).join("/");
        // folder/file.jpg

        const publicId = fileWithExt.replace(/\.[^/.]+$/, "");
        // remove extension → folder/file

        return publicId;
    } catch (error) {
        return null;
    }
}


export { uploadOnCloudinary, deleteFromCloudinary, getPublicIdFromUrl };