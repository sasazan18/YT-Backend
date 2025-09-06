import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channelId")
    }
    // channel id is to which channel user wants to subscribe
    // subscriber id is the current logged in user
    const channel = await User.findById(channelId)
    if(!channel){
        throw new ApiError(404, "Channel not found")
    }
    const existingSubscription = await Subscription.findOne({
        channel: channelId,
        subscriber: req.user._id
    })
    if(existingSubscription){
        // if subscription already exists, then unsubscribe
        await existingSubscription.deleteOne()
        return res.status(200).json(new ApiResponse(
            200,
            {},
            "Unsubscribed successfully"
        ))
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channelId")
    }
    const channel = await User.findById(channelId)
    if(!channel){
        throw new ApiError(404, "Channel not found")
    }
    const subscribers = await Subscription.find({channel: channelId}).populate("subscriber", "username fullName avatar")
    return res.status(200).json(new ApiResponse(
        200,
        {subscribers},
        "Subscribers fetched successfully"
    ))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriberId")
    }
    const subscriber = await User.findById(subscriberId)
    if (!subscriber) {
        throw new ApiError(404, "Subscriber not found")
    }
    const subscriptions = await Subscription.find({ subscriber: subscriberId }).populate("channel", "username fullName avatar")
    return res.status(200).json(new ApiResponse(
        200,
        { subscriptions },
        "Subscribed channels fetched successfully"
    ))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}