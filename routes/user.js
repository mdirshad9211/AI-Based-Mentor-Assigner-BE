import express from "express";
import { signup, login, logout,updateUser,getUser } from "../controllers/user";
import { authenticate } from "../middleswares/auth";

const router = express.Router();

router.post("/update-user", authenticate, updateUser);
router.get("/users", authenticate, getUser);

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

module.exports = router;
