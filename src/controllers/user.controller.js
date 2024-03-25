import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  //1 get user details
  const { fullName, email, username, password } = req.body;

  //2 validation
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  //3 check if already exist or not
  const existedUser = User.findOne({
    //operators
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exist");
  }

  //4 check for images, avatar
  //additional field(files) is provided by multer middleware
  const avatarLocalPath = req?.files?.avatar[0]?.path;
                         //req, fields by multer, name of file, at 0 index we got object which give us path

  const coverImgLocalPath = req?.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  //5 upload them to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  const coverImg = await uploadOnCloudinary(coverImgLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  //6 create user object - create entry in DB
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImg: coverImg?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });
  //chk if entry is created or not
  const createdUser = await User.findById(user._id).select(
    //7 remove pwd and refresh token field from response
    "-password -refreshToken" //this field is not required because select bydefault select all field
  );

  //8 check for user creation
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user");
  }

  //9 return response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

export { registerUser }; //make sure you import this inside {} because you export this inside {}
