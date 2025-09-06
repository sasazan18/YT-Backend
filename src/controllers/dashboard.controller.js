import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const {channelId} = req.params
    if(!mongoose.isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channelId")
    }
    // total videos
    const totalVideos = await Video.countDocuments({owner: channelId})
    // total subscribers
    const totalSubscribers = await Subscription.countDocuments({channel: channelId})
    // total likes 
    // like documents have video field which references video id
    // we need to find all like documents where video is in the list of videos owned by the channel
    const channelVideos = await Video.find({owner: channelId}).select("_id")
    const channelVideoIds = channelVideos.map(video => video._id)
    const totalLikes = await Like.countDocuments({video: {$in: channelVideoIds}})

    // total views
    // there is a views field in video model which stores the number of views for that video
    // we need to sum up the views of all videos owned by the channel
    const totalViewsAgg = await Video.aggregate([
        {
            $match: {owner: mongoose.Types.ObjectId(channelId)}
        },
        {
            $group: {
                _id: null,
                totalViews: {$sum: "$views"}
            }
        }
    ])
    const totalViews = totalViewsAgg[0]?.totalViews || 0

    return res.status(200).json(new ApiResponse(
        200,
        {
            totalVideos,
            totalSubscribers,
            totalViews,
            totalLikes
        },
        "Channel stats fetched successfully"
    ))
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const {channelId} = req.params
    if(!mongoose.isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channelId")
    }
    const videos = await Video.find({owner: channelId}).sort({createdAt: -1})
    return res.status(200).json(new ApiResponse(
        200,
        {videos},
        "Channel videos fetched successfully"
    ))
})

export {
    getChannelStats, 
    getChannelVideos
    }