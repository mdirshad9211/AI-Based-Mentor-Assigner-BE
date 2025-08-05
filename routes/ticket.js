import express from "express";
import { authenticate } from "../middleswares/auth.js";
import { 
    createTicket, 
    getTicket, 
    getTickets, 
    updateTicket, 
    assignTicket, 
    getAllTicketsForAdmin,
    bulkAutoAssign,
    getAssignmentRecommendations,
    testSkillMatching,
    addReply,
    submitUserFeedback
} from "../controllers/ticket.js";

const router = express.Router();

router.get("/", authenticate, getTickets);
router.get("/admin/all", authenticate, getAllTicketsForAdmin);
router.get("/:id", authenticate, getTicket);
router.get("/:id/recommendations", authenticate, getAssignmentRecommendations);
router.post("/", authenticate, createTicket);
router.post("/admin/bulk-auto-assign", authenticate, bulkAutoAssign);
router.post("/admin/test-skill-matching", authenticate, testSkillMatching);
router.post("/:id/reply", authenticate, addReply);
router.post("/:id/feedback", authenticate, submitUserFeedback);
router.patch("/:id", authenticate, updateTicket);
router.patch("/:id/assign", authenticate, assignTicket);

export default router;