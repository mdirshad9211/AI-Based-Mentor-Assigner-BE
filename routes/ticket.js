import express from "express"
import { authenticate } from "../middleswares/auth";
const Router  = express.Router();
import { createTicket, getTicket, getTickets } from "../controllers/ticket.js"



router.get("/", authenticate, getTickets);
router.get("/:id", authenticate, getTicket );
router.post("/", authenticate, createTicket);



export default Router;