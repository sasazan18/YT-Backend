import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addComment, getVideoComments, updateComment, deleteComment } from "../controllers/comment.controller.js";

const router = Router();

// secure routes
router.get("/video-comments/:videoId", verifyJWT, getVideoComments);
router.post("/add-comment/:videoId", verifyJWT, addComment);
router.patch("/update-comment/:commentId", verifyJWT, updateComment);
router.delete("/delete-comment/:commentId", verifyJWT, deleteComment);

export default router;