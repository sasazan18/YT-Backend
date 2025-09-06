import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query,
        sortBy,
        sortType,
        userId } = req.query

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const pipeline = [];

    // 1. Match published videos
    pipeline.push({
        $match: { isPublished: true }
    })

    // 2. If query is provided, add search filter
    if (query) {
        pipeline.push({
            $match: {
                $or: [
                    { title: { $regex: query, $options: "i" } },
                    { description: { $regex: query, $options: "i" } }
                ]
            }
        })
    }

    // 3. lookup to get owner details
    pipeline.push({
        $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
            pipeline: [
                { $project: { fullName: 1, username: 1, avatar: 1 } }
            ]
        }
    })
    // 4. unwind the owner array
    pipeline.push({ $unwind: "$owner" })

    // 5. sort if sortBy is provided
    if (sortBy) {
        const sortCriteria = {};
        const sortField = sortBy;
        const sortOrder = sortType === "desc" ? -1 : 1; // Default to ascending if not specified
        sortCriteria[sortField] = sortOrder;
        pipeline.push({ $sort: sortCriteria });
    } else {
        // Default sort by createdAt descending
        pipeline.push({ $sort: { createdAt: -1 } });
    }

    // 6. pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limitNumber });

    // 7. apply the aggregation pipeline
    const videos = await Video.aggregate(pipeline);

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            { videos },
            "Videos fetched successfully"
        ));

})

const publishAVideo = asyncHandler(async (req, res) => {
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
        title: req.body?.title,
        description: req.body?.description,
        duration: req.body?.duration
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

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    const video = await Video.findById(videoId)
        .populate({ 
            path: "owner", 
            select: "fullName username avatar" 
        })
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        video,
        "Video fetched successfully"
    ))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const title = req.body?.title
    const description = req.body?.description
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path

    // Update video details
    const updatedVideo = await Video.findByIdAndUpdate(videoId, {
        title,
        description,
        thumbnail: thumbnailLocalPath ? await uploadOnCloudinary(thumbnailLocalPath) : undefined
    }, { new: true })

    if (!updatedVideo) {
        throw new ApiError(404, "Video not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            updatedVideo,
            "Video updated successfully"
        ))
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    // check if the user is the owner of the video
    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this video")
    }
    await Video.findByIdAndDelete(videoId)
    return res
        .status(200)
        .json(new ApiResponse(
            200,
            {},
            "Video deleted successfully"
        ))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    // check if the user is the owner of the video
    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this video")
    }
    video.isPublished = !video.isPublished
    await video.save()
    return res
        .status(200)
        .json(new ApiResponse(
            200,
            video,
            `Video ${video.isPublished ? "published" : "unpublished"} successfully`
        ))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}