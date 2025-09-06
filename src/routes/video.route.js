import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getAllVideos, publishAVideo, getVideoById, updateVideo, deleteVideo, togglePublishStatus } from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
const router = Router();

// secured routes
router.get("/get-all-videos", verifyJWT, getAllVideos);
router.route("/upload-video").post(verifyJWT, upload.fields([
    {
        name: "videoFile",
        maxCount: 1
    },
    {
        name: "thumbnail",
        maxCount: 1
    }
]), publishAVideo);
router.get("/video/:videoId", verifyJWT, getVideoById);
router.patch("/update-video/:videoId", verifyJWT, upload.single("thumbnail"), updateVideo);
router.delete("/delete-video/:videoId", verifyJWT, deleteVideo);
router.patch("/toggle-publish-status/:videoId", verifyJWT, togglePublishStatus);

export default router;