import mongoose, { Aggregate } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    let { page = 1, limit = 10 } = req.query

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    page = parseInt(page) > 0 ? parseInt(page) : 1;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const skip = (page - 1) * limit;

    const comments = await Comment.aggregate(
        [
            {
                $match: {
                    video: new mongoose.Types.ObjectId(videoId)
                }
            },
            {
                $skip: skip
            },
            {
                $limit: limit
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner"
                }
            },
            {
                $unwind: "$owner"
            },
            {
                $project: {
                    _id: 1,
                    content: 1,
                    "owner.fullName": 1,
                    "owner.username": 1,
                    "owner.email": 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            }
        ]
    )
    console.log(comments);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { comments },
                "Comments fetched successfully"
            )
        )

})

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content cannot be empty");
    }

    const newComment = await Comment.create({
        content: content.trim(),
        video: videoId,
        owner: req.user._id
    })

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                { comment: newComment },
                "Comment added successfully"
            )
        )
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content cannot be empty");
    }
    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }
    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this comment");
    }
    comment.content = content.trim();
    await comment.save();

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { comment },
                "Comment updated successfully"
            )
        );
});


const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }
    console.log("Comment ID to delete:", commentId);  // Debugging log
    const comment = await Comment.findById(commentId)
    if(!comment){
        throw new ApiError (404, "Comment not found");
    }
    if (comment.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403, "You are not authorized to delete this comment");
    }
    await comment.deleteOne();
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                [],
                "Comment deleted successfully"
            )
        );

});


export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}