import {v2 as cloudinary} from "cloudinary"
import fs from "fs"
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try{
        if(!localFilePath) return null

        //upload the file on cloudinary
       const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto" 
        })
        //file has been uploading successfully
        // console.log("File upload done", response.url);

        //unlink from local storage after the img upload on cloudinary is done successfully
        fs.unlinkSync(localFilePath)

        return response;

    } catch(err){
        fs.unlinkSync(localFilePath)  //remove the locally saved temp file as the upload operation got failed
        return null
    }
}

export {uploadOnCloudinary}