import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        { 
           name: "avatar", //make sure this name is as it is in FE
           maxCount: 1 
        },
        {
            name: "coverImage", 
            maxCount: 1
        }
    ]),
     registerUser);

router.route("/login").post(loginUser);

//secured routes (adding verifyJwt middleware in b/w)
router.route("/logout").post(verifyJWT, logoutUser);

export default router;
