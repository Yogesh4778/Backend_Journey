import multer from "multer";

const storage = multer.diskStorage({
    //cb -> callback
    destination: function (req, file, cb) {
        cb(null, "./public/temp")
        //error handle ,dest. folder
    },
    filename: function( req, file, cb){
        cb(null, file.originalname)   //you can give file name by ur choice
    }
})

export const upload = multer({
     storage,
    })