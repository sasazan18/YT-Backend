import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        if (!user) {
            throw new ApiError(404, "User not found while generating refresh and access token")
        }
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")

    }
}

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validate user details - not empty 
    // check if user already exists - by email or username
    // check for avatar
    // if then upload to cloudinary
    // create user object - create entry in DB
    // remove password and refresh token from response
    // check if user created successfully
    // if yes, send success response
    // else, send error response

    const { fullName, email, username, password } = req.body // destructure user details from req body

    if (
        [fullName, email, username, password].some((field) => {
            return (
                !field || field.trim().length === 0
            )
        })
    ) {
        throw new ApiError(400, "All fields are required! Make sure you have: fullName, email, username, password")
    }

    // check if user already exists
    const existedUser = await User.findOne({
        $or: [
            { email },
            { username }
        ]
    })
    if (existedUser) {
        throw new ApiError(409, "User already exists with this email or username")
    }

    // console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }

    const coverImageLocalPath = req?.files?.coverImage?.[0]?.path || null

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null

    if (!avatar) {
        throw new ApiError(500, "Failed to upload avatar. Please try again later.")
    }

    // Only throw error if coverImageLocalPath exists but upload failed
    if (coverImageLocalPath && !coverImage) {
        throw new ApiError(500, "Failed to upload cover image. Please try again later.")
    }

    // create user object
    const user = await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500, "Failed to create user. Please try again later.")
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    // get user email/username and password from req body
    // validate email/username and password - not empty
    // check if user exists with given email/username
    // if not, send error response
    // if user exists, compare password
    // if password doesn't match, send error response
    // if password matches, generate access token and refresh token
    // send cookies and response

    const { email, username, password } = req.body
    if (
        (!email && !username) || !password ||
        (email && email.trim().length === 0) ||
        (username && username.trim().length === 0) ||
        password.trim().length === 0
    ) {
        throw new ApiError(400, "Email or username and password are required!")
    }
    // check if user exists
    const user = await User.findOne({
        $or: [
            { email },
            { username }
        ]
    })
    if (!user) {
        throw new ApiError(404, "User not found with this email or username")
    }
    // compare password
    const isPasswordCorrect = await user.isPasswordCorrect(password)
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid password!")
    }
    // generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    // previous user object does not have the latest refresh token
    // so, fetch the user again
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    // send cookies with response
    const options = {
        httpOnly: true,
        secure: true // it won't allow frontend to modify the cookie
    }
    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken, // we are sending access and refresh token in response body also because we might need them in frontend to set in memory or local storage
                    refreshToken

                }, "User logged in successfully")
        )
})

const logoutUser = asyncHandler(async (req, res) => {
    // get user id from req.user
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined }
        },
        { new: true }
    )

    // send cookies with response
    const options = {
        httpOnly: true,
        secure: true // it won't allow frontend to modify the cookie
    }
    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                {},
                "User logged out successfully!"
            )
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    // get refresh token from cookies
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is missing!")
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        // find user with this refresh token
        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, "Invalid refresh token!")
        }
        if (user?.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Refresh token does not match!")
        }

        const options = {
            httpOnly: true,
            secure: true // it won't allow frontend to modify the cookie
        }
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken: newRefreshToken
                    },
                    "Access token refreshed successfully!"
                )
            )
    } catch (error) {
        throw new ApiError(401, error.message || "Invalid refresh token!")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user._id)

    if (!user) {
        throw new ApiError(404, "User not found!")
    }
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Old password is incorrect!")
    }
    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Password changed successfully!"
        )
    )

})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(
            200,
            { user: req.user },
            "Current user fetched successfully!"
        )
    )
})

const updateUserDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body
    if (!fullName || !email) {
        throw new ApiError(400, "Full name and email are required!")
    }
    const user = User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName: fullName, // can only be written as fullName as both variable is of same name, but for clarity writing as fullName: fullName 
                email: email
            }
        },
        { new: true }
    ).select("-password -refreshToken")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user },
                "User details updated successfully!"
            )
        )
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required!")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar.url) {
        throw new ApiError(500, "Error while uploading avatar. Please try again later.")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password -refreshToken")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user },
                "User avatar updated successfully!"
            )
        )
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file.path
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image is required!")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!coverImage.url) {
        throw new ApiError(500, "Error while uploading cover image. Please try again later.")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password -refreshToken")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user },
                "User cover image updated successfully!"
            )
        )
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params
    console.log(username);
    if (!username || username?.trim().length === 0) {
        throw new ApiError(400, "Channel username is required!")
    }
    const channel = await User.aggregate([
        {
            $match: { username: username.toLowerCase() }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
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
                subscribersCount: { $size: "$subscribers" },
                subscribedToCount: { $size: "$subscribedTo" },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
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
                subscribersCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
                createdAt: 1
            }
        }
    ])

    console.log(channel);

    if (!channel || channel.length === 0) {
        throw new ApiError(404, "Channel not found!")
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { channel: channel[0] },
                "Channel profile fetched successfully!"
            )
        )
})

const uploadVideo = asyncHandler(async (req, res) => {
    const videoLocalPath = req.files.videoFile?.[0]?.path
    if (!videoLocalPath) {
        throw new ApiError(400, "Video file is required!")
    }
    const video = await uploadOnCloudinary(videoLocalPath)
    if (!video.url) {
        throw new ApiError(500, "Error while uploading video. Please try again later.")
    }

    const thumbnailLocalPath = req.files.thumbnail?.[0]?.path
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail image is required!")
    }
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if (!thumbnail.url) {
        throw new ApiError(500, "Error while uploading thumbnail. Please try again later.")
    }

    // upload video to the videos collection
    const video_uploaded = await Video.create({
        videoFile: video.url,
        thumbnail: thumbnail.url,
        owner: req.user?._id,
        title: req.body.title,
        description: req.body.description,
        duration: req.body.duration
    })
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { video_uploaded },
                "Video uploaded successfully!"
            )
        )
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: { _id: req.user?._id }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
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
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: { $arrayElemAt: ["$owner", 0] } // since owner is an array after lookup, we need to get the first element
                        }
                    }
                ]
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { watchHistory: user?.[0]?.watchHistory || [] },
                "Watch history fetched successfully!"
            )
        )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    uploadVideo,
    getWatchHistory
}