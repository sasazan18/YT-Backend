import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Like } from "../models/like.model.js";

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    const existingLike = await Like.findOne({
        comment: commentId,
    })
    if (existingLike) {
        // If like already exists, remove it (unlike)
        await Like.deleteOne({ _id: existingLike._id });
        return res
            .status(200)
            .json(new ApiResponse(
                200,
                {},
                "Comment unliked successfully",
            ));
    }
    // If like doesn't exist, create a new one (like)
    const newLike = await Like.create({
        comment: commentId,
        likedBy: req.user._id,
    });
    return res
        .status(201)
        .json(new ApiResponse(
            201,
            { like: newLike },
            "Comment liked successfully",
        ));
})

const toggleVideoLike = asyncHandler(async (req, res) => {
    // Implementation for toggling video like
    // Similar logic to toggleCommentLike
    const { videoId } = req.params

    const existingLike = await Like.findOne({
        video: videoId,
    })
    if (existingLike) {
        // If like already exists, remove it (unlike)
        await Like.deleteOne({ _id: existingLike._id });
        return res
            .status(200)
            .json(new ApiResponse(
                200,
                {},
                "Video unliked successfully",
            ));
    }
    // If like doesn't exist, create a new one (like)
    const newLike = await Like.create({
        video: videoId,
        likedBy: req.user._id,
    });
    return res
        .status(201)
        .json(new ApiResponse(
            201,
            { like: newLike },
            "Video liked successfully",
        ));
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    const existingLike = await Like.findOne({
        tweet: tweetId,
    })
    if (existingLike) {
        // If like already exists, remove it (unlike)
        await Like.deleteOne({ _id: existingLike._id });
        return res
            .status(200)
            .json(new ApiResponse(
                200,
                {},
                "Tweet unliked successfully",
            ));
    }
    // If like doesn't exist, create a new one (like)
    const newLike = await Like.create({
        tweet: tweetId,
        likedBy: req.user._id,
    });
    return res
        .status(201)
        .json(new ApiResponse(
            201,
            { like: newLike },
            "Tweet liked successfully",
        ));
})

// get liked videos by user
const getLikedVideosByUser = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    console.log("User ID:", userId); // Debugging line to check userId

    const likedVideos = await Like.find({ likedBy: userId, video: { $exists: true } })
        .populate("video")

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            { likes: likedVideos },
            "Liked videos retrieved successfully",
        ));
});


export { 
    toggleCommentLike, 
    toggleVideoLike, 
    toggleTweetLike, 
    getLikedVideosByUser 
}