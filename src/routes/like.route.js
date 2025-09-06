import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {toggleCommentLike, toggleVideoLike, toggleTweetLike, getLikedVideosByUser} from "../controllers/like.controller.js";

const router = Router();

router.post("/toggle-comment-like/:commentId", verifyJWT, toggleCommentLike);
router.post("/toggle-video-like/:videoId", verifyJWT, toggleVideoLike);
router.post("/toggle-tweet-like/:tweetId", verifyJWT, toggleTweetLike);
router.get("/liked-videos", verifyJWT, getLikedVideosByUser);

export default router;