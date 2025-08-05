import express from "express";
import { signup, login, logout,updateUser,getUser, getModerators } from "../controllers/user.js";
import { authenticate } from "../middleswares/auth.js";

const router = express.Router();

router.post("/update-user", authenticate, updateUser);
router.get("/users", authenticate, getUser);
router.get("/moderators", authenticate, getModerators);

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

export default router;
