import { Router } from "express";
import { registerController, loginController, logoutController, refreshTokenController } from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", registerController);
router.post("/login", loginController);
router.post("/logout", logoutController);
router.post("/refresh-token", refreshTokenController);

export default router;