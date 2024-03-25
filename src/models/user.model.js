import mongoose, { Schema } from "mongoose";
import  jwt  from "jsonwebtoken";
import bcrypt from "bcrypt"

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true, //to enable searching index true is better option
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, //cloudinary url
      required: true,
    },
    coverImage: {
      type: String,
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

//write the below syntax as it is don't use arrow fn due to unavailability of this in arrow fn. so use normal function
//        1hook 2onwhichevent  3function
userSchema.pre("save", async function (next) {
    if(!this.isModified("password"))  return next(); //only do changes when pwd is changing

    this.password = await bcrypt.hash(this.password, 10);
    next()
})

//custom methods (adding new methods)
userSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password, this.password);
                            // normal pwd, encrypted pwd
}

//generate tokens
userSchema.methods.generateAccessToken = function(){
   return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

// module.exports = mongoose.model("User", userSchema);
//OR
export const User = mongoose.model("User", userSchema)
