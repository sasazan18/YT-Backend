import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

export {
    registerUser,
    loginUser,
    logoutUser
}