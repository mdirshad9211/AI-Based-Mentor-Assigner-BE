import bcrypt from "bcrypt";
import User from "../models/user.js";
import jwt from "jsonwebtoken";
import { inngest } from "../inngest/client.js";

export const signup = async (req, res) => {
  const { email, password, skills } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 15);
    const user = await User.create({ email, password: hashedPassword, skills });
    await inngest.send({
      name: "user/signup",
      data: { email },
    });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.status(201).json({ user, token });
  } catch (error) {
    console.error("Error in signup:", error);
    res.status(500).json({ error: "Signup Failed", details: error.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({
          error: "Invalid credentials please check your email and password",
        });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.status(200).json({ user, token });
  } catch (error) {
    console.error("Error in login:", error);
    res.status(500).json({ error: "Login Failed", details: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "unauthorized No token provided" });
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).json({ error: "unauthorized Invalid token" });
        }
      });
      res.status(200).json({ message: "Logout successful" });
    }
  } catch (error) {
    console.error("Error in logout:", error);
    res.status(500).json({ error: "Logout Failed", details: error.message });
  }
};


export const updateUser = async (req, res) =>{
    const {skills = [], role, email} = req.body;

    try{
        if(!req.user || !req.user.userId) {
            return res.status(401).json({ error: "Unauthorized: No user found" });
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }   

        await User.updateOne(
            {email},
            {skills: skills.length ? skills : user.skills, role}
        )
        res.status(200).json({ message: "User updated successfully" });
    }catch (error) {
        console.error("Error in updateUser:", error);
        res.status(500).json({ error: "Update Failed", details: error.message });
    }
};



export const getUser = async (req, res) => {
    try {
         if(req.user.role !== "admin") {
            return res.status(403).json({ error: "Forbidden: Only admins can access this route" });
        }

        const users = await User.find().select("-password");;
        if (!users || users.length === 0) {
            return res.status(404).json({ error: "No users found" });
        }
        res.status(200).json(users);
    } catch (error) {
        console.error("Error in getUser:", error);
        res.status(500).json({ error: "Failed to retrieve user", details: error.message });
        
    }
}