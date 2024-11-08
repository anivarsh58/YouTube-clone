import { asyncHandler } from "../utils/asyncHandler.js";
import {APIError} from "../utils/apiError.js"
import {User} from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { APIResponse } from "../utils/apiResponse.js";
const registerUser = asyncHandler(async (req, res) => {
    const {fullName, email, username, password} = req.body

    if (
        [fullName, email, username, password].
        some((field) => field?.trim() === "")
        )
        {
            throw new APIError(400, `Field is mandatory.`)
        }

    const existingUser = await User.findOne({
        $or: [{username}, {email}]
    }
    )

    if (existingUser){
        throw new APIError(409, `User already exists.`);
    }

    console.log(req.files)

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path


    if (!avatarLocalPath)
    {
        throw new APIError(400, "Avatar is required.")
    }

    /*
    const avatar = await uoc(avatarLocalPath).url
    This would throw an error because
    uploadOnCloudinary(avatarLocalPath) returns a
    promise,
    not the actual object that contains the url.
    You need to wait for the promise to resolve and
    then access the url property.
    */
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const avatarURL = avatar?.url;
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

    if (!isUserCreated){
        throw new APIError(500, "Error while registering.")
    }
    else {
        return res.status(201).json(
            new APIResponse(200, isUserCreated, "User registered successfully.")
        )
    }
})  

const generateAccessAndRefreshToken = async(userID) => {
    try {
        const user = await User.findById(userID)
        user.accessToken = user.generateAccessToken()
        user.refreshToken = user.generateRefreshToken()
        await user.save({validateBeforeSave: false})
        return {accessToken, refreshToken}
    } catch (error) {
        throw new APIError(500, "Error while generating tokens.")
    }
}

const loginUser = asyncHandler(async (req, res) => {

    const {identifier, password} = req.body

    if (!identifier) {
        throw new APIError(400, "Username/Email not found.")
    }

    const emailMatching = await User.findOne({email: identifier})
    const usernameMatching = await User.findOne({username: identifier})
    let foundUser;

    if (emailMatching)
    {
        foundUser = emailMatching;
    }
    else if (usernameMatching)
    {
       foundUser = usernameMatching;
    }
    else {
        throw new APIError(404, "Username/Email does not exist.")
    }

    if (!(await foundUser.comparePassword(password))) {
        throw new APIError(401, "Invalid credentials.")
    }
    else {
       const{accessToken, refreshToken} = await generateAccessAndRefreshToken(foundUser._id);
       return res.status(200).json(new APIResponse(200, { accessToken, refreshToken }, "Login successful."));

    }
})

export {registerUser, loginUser}