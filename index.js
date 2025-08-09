import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/user.js";
import TicketRoutes from "./routes/ticket.js";
import { serve } from "inngest/express";
import {inngest} from "./inngest/client.js"
import { onUserSignup } from "./inngest/functions/on-signup.js";
import { onTicketCreated } from "./inngest/functions/on-ticket-create.js";

// Load environment variables
dotenv.config();


const app = express();
// add frontend URL to CORS
const allowedOrigins = ["https://ai-based-mentor-assigner-fe.vercel.app", "http://localhost:3000"];
app.use(cors({
  origin: allowedOrigins
}));
app.use(express.json());

app.use("/api/auth", userRoutes);
app.use("/api/tickets", TicketRoutes);

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [onUserSignup, onTicketCreated],
  })
);


mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected");
        app.listen(process.env.PORT || 5000, () => {
            console.log(`Server is running on port ${process.env.PORT || 5000}`);
        });
    })
    .catch((err) => {
        console.error("MongoDB connection error:", err);
    });
