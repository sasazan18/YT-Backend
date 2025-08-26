import { v2 as cloudinary } from "cloudinary";
import { response } from "express";
import fs from "fs";

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        // Upload file to Cloudinary
        response = await cloudinary.uploader.upload(
            localFilePath,
            {
                resource_type: "auto"
            }
        )
        console.log("File uploaded to Cloudinary successfully ", response.url);
        fs.unlinkSync(localFilePath) // remove file from local uploads folder as upload succeeded
        return response;

    } catch (error) {
        return null
    }
}

// Upload an image
const uploadResult = await cloudinary.uploader
    .upload(
        'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg', {
        public_id: 'shoes',
    }
    )
    .catch((error) => {
        console.log(error);
    });

console.log(uploadResult);