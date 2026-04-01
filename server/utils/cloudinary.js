import { v2 as cloudinary } from "cloudinary"
import fs from "fs"


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded successfull
        //console.log("file is uploaded on cloudinary ", response.url);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
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