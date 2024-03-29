import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

//method for generating access & refresh token
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    //save refreshToken in DB
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); //since we are updating only refresh token field and remaining as it is

    //return tokens
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //1 get user details
  const { fullName, email, username, password } = req.body;

  /*
  console.log("Req. body", req.body);
  Req. body [Object: null prototype] {
    fullName: 'Yogesh Patidar',
    email: 'ypatidar194@gmail.com',
    password: '123456789',
    username: 'yogesh9923'
  }
*/
  //2 validation
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  //3 check if already exist or not
  const existedUser = await User.findOne({
    //operators
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exist");
  }

  //4 check for images, avatar

  // console.log(req.file) -> it gives a array of object name as the file name here it is avatar which contains the fields
  // fieldname, originalname, encoding, mimetype, destination, filename, path,size

  //additional field(files) is provided by multer middleware
  const avatarLocalPath = req?.files?.avatar[0]?.path;
  //req, fields by multer, name of file, at 0 index we got object which give us path

  // const coverImageLocalPath = req?.files?.coverImage[0]?.path; //if user didn't give coverImg then it gives error

  //check in a classical way
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  //5 upload them to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  //6 create user object - create entry in DB
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
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

const loginUser = asyncHandler(async (req, res) => {
  //1 get data from req body
  const { email, username, password } = req.body;

  //2 username or email
  if (!password || !email) {
    throw new ApiError(400, "Username or Email is required");
  }

  //3 find the user (using mongoDB operators)
  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(400, "User doesn't exist");
  }

  //4 check PWD
  //check the methods you created by yourself in db with the instance you take here is user not the User
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  //5 access & refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  //since we got the info. from the User model but we got unwanted fields like pwd, refreshtoken
  //if DB call is expensive then just update the object with the new value like user.refreshToken = refreshToken
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //6 send cookie
  //option
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
          //why we are sending tokens here if we pass them in cookie -> because if user want to save cookie in local storage due to user needs
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  //user lao (since we add our middleware verifyJWT in routes and in that middleware we add a user field in request so we get the user here )
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    }
  );

  //option
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out Successfully"));
});

//when access Token is expired then user can refresh it with the help of refresh token
const refreshAccessToken = asyncHandler(async (req, res) => {
  //fetch token
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  //validate
  if (!incomingRefreshToken) {
    throw new ApiError(400, "Unauthorized request");
  }

  try {
    //check authenticity
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id); //id we pass while creating refresh token

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  //find user with the help of user object you add in middleware
  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await User.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

//updating text fields
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

//updating files
const updateUserAvatar = asyncHandler(async (req, res) => {
  //use multer (file single file)
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar on cloudinary");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { avatar: avatar.url },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  //use multer (file single file)
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading cover image on cloudinary");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { coverImage: coverImage.url },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing");
  }

  //here we can find the document with the username by the below query
  // User.find({username})

  //but the problem here is first we find the id from the DB and then we apply aggregation on the basis of that id
  //but you can apply direct aggregation using match field

  //aggregation pipeline
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      }, //now at this step we filter a single document
      //now we have to do lookup on the basis of that document
      //finding subscribers of a channel
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      }, //in the above code we are finding the subscriber of a channel for that we have to select channel
      // so from subscriptions model (plural and lowercase saved) finding id which have the channel
    },
    //now find the subscribed
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    //adding both the pipelines (adding additional field in user object)
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers", //counting the document which we separate above
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            // if        finding this    in this docs   in this field
            //  $in is used to check the availability in array and obj both
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        email: 1
      }
    }
  ])
  //DO console log channel
  if(!channel?.length){
    throw new ApiError(404, "channel does not exists")
  }

  return res.status(200)
  .json(
    new ApiResponse(200,channel[0], "User channel details fetched successfully")
  )
});

const getWatchHistory = asyncHandler(async(req, res) => {
  const user = await User.aggregate([
    { //getting the user document
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {  //getting the videos in watchHistory array
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        //subpipeline (because we have a owner field in our DB with 
        // ref to User so to get the details of owner we have to do lookup again for that we write sub pipeline)
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              //giving only essential info rather than passing all info so we are writing this subpipeline
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  }
                }
              ]
            }
          },
          //changing the structure of data (For front end convenience)
          {
            $addFields: {
              owner: { //getting first value from array (one way elementAt) 
                $first: "$owner"
              } //This will send FE 1 own er object from which data can be fetched easily.
            }
          }
        ]
      }
    }
  ])

  return res.status(200).json(
    new ApiResponse(200, user[0].watchHistory, "Watch History fetched successfully")
  )
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
}; //make sure you import this inside {} because you export this inside {}
