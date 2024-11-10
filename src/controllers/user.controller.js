import { asyncHandler } from "../utils/asyncHandler.js";
import {APIError} from "../utils/apiError.js"
import {User} from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { APIResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
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

       const foundUserAgain = foundUser.select("-password -refreshToken")

       const options = {
        httpOnly: true,
        secure: true
       }

       return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
        new APIResponse(200,
            {
                user: foundUserAgain, accessToken, refreshToken
            },
            "User logged in successfully."
        )
       )
    }
})

const logoutUser = asyncHandler(async (req, res) => {
   await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }

    )

    const options = {
        httpOnly: true,
        secure: true 
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new APIResponse(200, {}, "User logged out."))
})

const refreshAccessToken = asyncHandler(async(req, res) => {
    const incomingRT = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRT){
        throw new APIError(401, "Unauthorised request.")
    }

    try {
        const decodedToken = jwt.verify(incomingRT, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user){
            throw new APIError(401, "Invalid refresh token.")
        }
    
        if (incomingRT !== user?.refreshToken) {
            throw new APIError(401, "Invalid refreshToken.")
        }
        else {
            const options = {
                httpOnly: true,
                secure: true
            }
    
            const {at, rt} = await generateAccessAndRefreshToken(user_.id)
    
            return res.status(200).cookie("accessToken", at, options)
            .cookie("refreshToken", rt, options)
            .json(
                new APIResponse(200, {at, rt}, "Access Token refreshed succesfully.")
            )
    }} catch (error) {
        throw new APIError(401, "Invalid Refresh Token.")
    }
    })

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(200, req.user, "Current user fetched successfully.")
})

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body;
    const user = User.findById(req.user?._id);

    const isPwdCorrect = await user.isPasswordCorrect(oldPassword);
    
    if (isPwdCorrect) {
        user.password = newPassword; 
    }
    else {
        throw new APIError(401, "Incorrect password.")
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res.status(200).json(new APIResponse(200, "Password has been updated."));
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body;

    if (!fullName || !email) {
        throw new APIError(400, "All fields are required.");
    }

    const user = User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },
        {new : true}
    ).select("-password")

    return res.status(200).json
    (new APIResponse(200, user, "Updated successfully."));
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
        throw new APIError(400, "Avatar file is missing.");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
       throw new APIError(400, "Error while uploading avatar.") 
    }
    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password");

    return res.status(200).json(
        new APIResponse(200, user, "Avatar updated successfully.")
    )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
        throw new APIError(400, "Cover image file is missing.");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
       throw new APIError(400, "Error while uploading cover image.") 
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password");

    return res.status(200).json(
        new APIResponse(200, user, "Cover image updated successfully.")
    )
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const {username} = req.params;

    if (!username?.trim()) {
        throw new APIError(400, "Username is missing.")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
        /*
        Since MongoDB only matches ObjectId values rather than
        embedded full documents, when we define channel as a reference
        to User, it actually still holds just the User’s _id
        as an ObjectId.
        */
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                subscribedToCount: {
                    $size: "subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]}, 
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
                subscribersCount : 1,
                subscribedToCount : 1,
                email: 1
            }
        }
    ])

    if (!channel?.length) {
        throw new APIError(404, "Channel does not exist.")
    }

    return res
    .status(200)
    .json(new APIResponse(200, channel[0], "User channel fetched successfully."))


})

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                /*
                In Users, for every user, we now have a new field -
                watchHistory which has documents of every ‘Video’
                the user has seen. In those ‘Video’ documents,
                since they were formed as a result of the lookup
                operation, this pipeline is being applied.

                What this pipeline does is that for every ‘Video’
                in watchHistory it looks up the “_id” in users
                that match the “owner” for a “Video”, it changes
                the owner that previously had just the value of
                “_id” with a Document that has the same “_id” as
                “owner” previously did.
                */

                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                },
                                {
                                    $addFields: {
                                        owner: {
                                            $first: "$owner"
                                        }
                                    }
                                }
                            ]

                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new APIResponse(200, user[0].watchHistory, "Watch History fetched successfully.")
    )
})


export {registerUser, loginUser, logoutUser, getCurrentUser, changeCurrentPassword,
    updateUserAvatar, updateUserCoverImage, getWatchHistory
}