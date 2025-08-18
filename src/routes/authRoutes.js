import express from "express";
import { login, updatePassword } from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.post("/login", login);
router.post("/update-password", authenticate, updatePassword);

export default router;
