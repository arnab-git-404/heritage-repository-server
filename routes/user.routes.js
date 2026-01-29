import { Router } from "express";
import {
  getProfileController,
  updateProfileController,
  deleteProfileController,
  uploadAvatarController,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/upload.middleware.js";


const router = Router();

router.get("/profile", getProfileController);
router.patch("/update-profile", updateProfileController);
router.delete("/delete-profile", deleteProfileController);
router.post("/avatar", upload.single("avatar"), uploadAvatarController);


export default router;
