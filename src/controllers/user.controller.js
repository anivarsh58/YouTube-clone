import { asyncHandler } from "../utils/asyncHandler.js";
import {APIError} from "../utils/apiError.js"
import {User} from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { APIResponse } from "../utils/apiResponse.js";
const registerUser = asyncHandler(async (req, res) => {
    const {fullName, email, username, password} = req.body
    console.log(email)

    if (
        [fullName, email, username, password].
        some((field) => field?.trim() === "")
        )
        {
            throw new APIError(400, `${field} is mandatory`)
        }

    const existingUser = User.findOne({
        $or: [{username}, {email}]
    }
    )

    if (existingUser){
        throw new APIError(409, `User already exists.`)
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if (!avatarLocalPath)
    {
        throw new APIError(400, "Avatar is required.")
    }

    const avatarURL = await uploadOnCloudinary(avatarLocalPath).url;
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    const user = await User.create(
        {
            fullName,
            avatar: avatarURL,
            coverImage: coverImage.url || "",
            email,
            password,
            username: username.toLowerCase()
        }
    )

    const isUserCreated = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser){
        throw new APIError(500, "Error while registering.")
    }
    else {
        return res.status(201).json(
            new APIResponse(200, createdUser, "User registered successfully.")
        )
    }
})  

export {registerUser}