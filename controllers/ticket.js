import { inngest } from "../inngest/client.js";
import Ticket from "../models/ticket.model.js";
import { autoAssignTicket, extractSkillsFromTicket } from "../utils/autoAssign.js";

export const createTicket = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res
        .status(400)
        .json({ error: "Title and description are required" });
    }

    // Extract skills from ticket content
    const relatedSkills = extractSkillsFromTicket(title, description);

    const newTicket = await Ticket.create({
      title,
      description,
      createdBy: req.user._id.toString(),
      relatedSkills: relatedSkills
    });

    // Try to send Inngest event, but don't fail if it's not configured
    try {
      await inngest.send({
        name: "ticket/created",
        data: {
          ticketId: newTicket._id.toString(),
          title,
          description,
          createdBy: req.user._id.toString(),
          relatedSkills: relatedSkills
        },
      });
    } catch (inngestError) {
      console.warn("Inngest event failed (this is normal in development):", inngestError.message);
    }

    // Attempt automatic assignment based on skills
    let assignmentResult = null;
    if (relatedSkills.length > 0) {
      try {
        assignmentResult = await autoAssignTicket(newTicket._id.toString());
      } catch (autoAssignError) {
        console.warn("Auto-assignment failed:", autoAssignError.message);
      }
    }

    // Get the updated ticket with assignment info
    const finalTicket = await Ticket.findById(newTicket._id)
      .populate("assignedTo", ["email", "_id", "role"])
      .populate("createdBy", ["email", "_id", "role"]);

    let message = "Ticket created successfully";
    if (assignmentResult) {
      message += ` and automatically assigned to ${assignmentResult.moderator.email}`;
    } else if (relatedSkills.length > 0) {
      message += " but no suitable moderator found for auto-assignment";
    } else {
      message += " with no detectable skills for auto-assignment";
    }

    return res
      .status(201)
      .json({
        success: true,
        ticket: finalTicket,
        message: message,
        relatedSkills: relatedSkills,
        autoAssigned: !!assignmentResult
      });
  } catch (error) {
    console.error("Error creating ticket:", error.message);
    return res.status(500).json({ error: "Failed to create ticket" });
  }
};

export const getTickets = async (req, res) => {
  try {
    const user = req.user;
    let tickets = [];
    
    if (user.role === "admin") {
      // Admin can see all tickets with full details
      tickets = await Ticket.find({})
        .populate("assignedTo", ["email", "_id", "role"])
        .populate("createdBy", ["email", "_id", "role"])
        .sort({ createdAt: -1 });
    } else if (user.role === "moderator") {
      // Moderator can see tickets assigned to them
      tickets = await Ticket.find({ assignedTo: user._id })
        .populate("assignedTo", ["email", "_id", "role"])
        .populate("createdBy", ["email", "_id", "role"])
        .sort({ createdAt: -1 });
    } else {
      // Regular users can only see tickets they created
      tickets = await Ticket.find({ createdBy: user._id })
        .populate("assignedTo", ["email", "_id", "role"])
        .populate("createdBy", ["email", "_id", "role"])
        .select("title description status createdAt assignedTo")
        .sort({ createdAt: -1 });
    }

    return res.status(200).json(tickets);
  } catch (error) {
    console.error("Error fetching tickets:", error.message);
    return res.status(500).json({ error: "Failed to fetch tickets" });
  }
};

export const getTicket = async (req, res) => {
    try {
        const user = req.user;
        let ticket;

        if(user.role === "admin" || user.role === "moderator"){
            ticket = await Ticket.findById(req.params.id)
                .populate("assignedTo", ["email", "_id", "role"])
                .populate("createdBy", ["email", "_id", "role"])
                .populate("replies.repliedBy", ["email", "_id", "role"]);
        }
        else{
            ticket = await Ticket.findOne({
                createdBy: user._id,
                _id: req.params.id
            }).populate("assignedTo", ["email", "_id", "role"])
              .populate("createdBy", ["email", "_id", "role"])
              .populate("replies.repliedBy", ["email", "_id", "role"]);
        }

        if(!ticket){
            return res.status(404).json({message: "Ticket Not Found"});
        }

        return res.status(200).json({ticket});
        
    } catch (error) {
        console.log("Error Fetching Ticket ", error.message);
        return res.status(500).json({message: "Internal Server Error"});
    }
};

export const updateTicket = async (req, res) => {
    try {
        const user = req.user;
        const { title, description, status, helpfulNotes } = req.body;

        // Only admin or moderator can update tickets
        if(user.role !== "admin" && user.role !== "moderator"){
            return res.status(403).json({error: "Forbidden: Only admin or moderator can update tickets"});
        }

        const ticket = await Ticket.findById(req.params.id);
        if(!ticket){
            return res.status(404).json({error: "Ticket Not Found"});
        }

        // Update the ticket
        const updatedTicket = await Ticket.findByIdAndUpdate(
            req.params.id,
            { 
                title: title || ticket.title,
                description: description || ticket.description,
                status: status || ticket.status,
                helpfulNotes: helpfulNotes || ticket.helpfulNotes
            },
            { new: true }
        ).populate("assignedTo", ["email", "_id", "role"])
         .populate("createdBy", ["email", "_id", "role"]);

        return res.status(200).json({
            success: true,
            ticket: updatedTicket,
            message: "Ticket updated successfully"
        });
        
    } catch (error) {
        console.log("Error Updating Ticket ", error.message);
        return res.status(500).json({error: "Internal Server Error"});
    }
};

// Assign ticket to moderator (Admin only) - can be manual or auto
export const assignTicket = async (req, res) => {
    try {
        const user = req.user;
        const { assignedTo, autoAssign } = req.body;

        // Only admin can assign tickets
        if(user.role !== "admin"){
            return res.status(403).json({error: "Forbidden: Only admin can assign tickets"});
        }

        const ticket = await Ticket.findById(req.params.id);
        if(!ticket){
            return res.status(404).json({error: "Ticket Not Found"});
        }

        let updatedTicket;
        let message;

        if (autoAssign) {
            // Perform automatic assignment
            const assignmentResult = await autoAssignTicket(req.params.id);
            
            if (assignmentResult) {
                updatedTicket = assignmentResult.ticket;
                message = `Ticket automatically assigned to ${assignmentResult.moderator.email} (match score: ${assignmentResult.matchScore.toFixed(2)})`;
            } else {
                return res.status(400).json({
                    error: "No suitable moderator found for auto-assignment. Please assign manually."
                });
            }
        } else {
            // Manual assignment
            updatedTicket = await Ticket.findByIdAndUpdate(
                req.params.id,
                { 
                    assignedTo: assignedTo || null,
                    status: assignedTo ? "IN_PROGRESS" : ticket.status
                },
                { new: true }
            ).populate("assignedTo", ["email", "_id", "role"])
             .populate("createdBy", ["email", "_id", "role"]);

            message = assignedTo ? "Ticket assigned successfully" : "Ticket unassigned successfully";
        }

        return res.status(200).json({
            success: true,
            ticket: updatedTicket,
            message: message
        });
        
    } catch (error) {
        console.log("Error Assigning Ticket ", error.message);
        return res.status(500).json({error: "Internal Server Error"});
    }
};

// Get all tickets for admin dashboard with assignment info
export const getAllTicketsForAdmin = async (req, res) => {
    try {
        const user = req.user;

        // Only admin can access this endpoint
        if(user.role !== "admin"){
            return res.status(403).json({error: "Forbidden: Admin access required"});
        }

        const tickets = await Ticket.find({})
            .populate("assignedTo", ["email", "_id", "role"])
            .populate("createdBy", ["email", "_id", "role"])
            .sort({ createdAt: -1 });

        // Get assignment statistics
        const totalTickets = tickets.length;
        const assignedTickets = tickets.filter(t => t.assignedTo).length;
        const unassignedTickets = totalTickets - assignedTickets;
        const completedTickets = tickets.filter(t => t.status === "COMPLETED").length;
        const autoAssignableTickets = tickets.filter(t => !t.assignedTo && t.relatedSkills && t.relatedSkills.length > 0).length;

        return res.status(200).json({
            tickets,
            stats: {
                total: totalTickets,
                assigned: assignedTickets,
                unassigned: unassignedTickets,
                completed: completedTickets,
                autoAssignable: autoAssignableTickets
            }
        });
        
    } catch (error) {
        console.log("Error Fetching Admin Tickets ", error.message);
        return res.status(500).json({error: "Internal Server Error"});
    }
};

// Bulk auto-assign all unassigned tickets (Admin only)
export const bulkAutoAssign = async (req, res) => {
    try {
        const user = req.user;

        // Only admin can access this endpoint
        if(user.role !== "admin"){
            return res.status(403).json({error: "Forbidden: Admin access required"});
        }

        // Get all unassigned tickets with skills
        const unassignedTickets = await Ticket.find({
            assignedTo: null,
            relatedSkills: { $exists: true, $ne: [] }
        });

        if (unassignedTickets.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No unassigned tickets with skills found",
                assigned: 0,
                failed: 0
            });
        }

        let assignedCount = 0;
        let failedCount = 0;
        const results = [];

        for (const ticket of unassignedTickets) {
            try {
                const assignmentResult = await autoAssignTicket(ticket._id.toString());
                if (assignmentResult) {
                    assignedCount++;
                    results.push({
                        ticketId: ticket._id,
                        title: ticket.title,
                        assignedTo: assignmentResult.moderator.email,
                        matchScore: assignmentResult.matchScore,
                        success: true
                    });
                } else {
                    failedCount++;
                    results.push({
                        ticketId: ticket._id,
                        title: ticket.title,
                        error: "No suitable moderator found",
                        success: false
                    });
                }
            } catch (error) {
                failedCount++;
                results.push({
                    ticketId: ticket._id,
                    title: ticket.title,
                    error: error.message,
                    success: false
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: `Bulk assignment completed: ${assignedCount} assigned, ${failedCount} failed`,
            assigned: assignedCount,
            failed: failedCount,
            results: results
        });
        
    } catch (error) {
        console.log("Error in Bulk Auto Assignment ", error.message);
        return res.status(500).json({error: "Internal Server Error"});
    }
};

// Get assignment recommendations for a specific ticket (Admin only)
export const getAssignmentRecommendations = async (req, res) => {
    try {
        const user = req.user;

        // Only admin can access this endpoint
        if(user.role !== "admin"){
            return res.status(403).json({error: "Forbidden: Admin access required"});
        }

        const ticket = await Ticket.findById(req.params.id);
        if(!ticket){
            return res.status(404).json({error: "Ticket Not Found"});
        }

        if (!ticket.relatedSkills || ticket.relatedSkills.length === 0) {
            return res.status(400).json({
                error: "Ticket has no related skills for recommendations"
            });
        }

        // Get all moderators with their skills and current workload
        const moderators = await User.find({ 
            role: "moderator",
            skills: { $exists: true, $ne: [] }
        });

        const recommendations = [];

        for (const moderator of moderators) {
            // Count how many ticket skills match moderator skills with flexible matching
            const matchingSkills = ticket.relatedSkills.filter(ticketSkill => 
                moderator.skills.some(modSkill => {
                    const ticketSkillNormalized = ticketSkill.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const modSkillNormalized = modSkill.toLowerCase().replace(/[^a-z0-9]/g, '');
                    
                    // Check if skills match with various patterns
                    return modSkillNormalized.includes(ticketSkillNormalized) ||
                           ticketSkillNormalized.includes(modSkillNormalized) ||
                           modSkillNormalized === ticketSkillNormalized ||
                           // Special cases for common abbreviations
                           (ticketSkillNormalized === 'js' && (modSkillNormalized.includes('javascript') || modSkillNormalized.includes('nodejs') || modSkillNormalized.includes('reactjs'))) ||
                           (ticketSkillNormalized === 'node' && modSkillNormalized.includes('nodejs')) ||
                           (ticketSkillNormalized === 'react' && modSkillNormalized.includes('reactjs')) ||
                           (modSkillNormalized.includes('js') && ticketSkillNormalized.includes('javascript'));
                })
            );

            if (matchingSkills.length > 0) {
                // Get current workload
                const assignedTicketsCount = await Ticket.countDocuments({ 
                    assignedTo: moderator._id,
                    status: { $in: ["TODO", "IN_PROGRESS"] }
                });

                const skillMatchScore = matchingSkills.length;
                const workloadScore = Math.max(0, 5 - assignedTicketsCount);
                const finalScore = (skillMatchScore * 0.7) + (workloadScore * 0.3);

                recommendations.push({
                    moderator: {
                        _id: moderator._id,
                        email: moderator.email,
                        skills: moderator.skills
                    },
                    matchingSkills: matchingSkills,
                    skillMatchScore: skillMatchScore,
                    currentWorkload: assignedTicketsCount,
                    workloadScore: workloadScore,
                    finalScore: finalScore
                });
            }
        }

        // Sort by final score (highest first)
        recommendations.sort((a, b) => b.finalScore - a.finalScore);

        return res.status(200).json({
            success: true,
            ticket: {
                _id: ticket._id,
                title: ticket.title,
                relatedSkills: ticket.relatedSkills
            },
            recommendations: recommendations
        });
        
    } catch (error) {
        console.log("Error Getting Assignment Recommendations ", error.message);
        return res.status(500).json({error: "Internal Server Error"});
    }
};

// Test skill matching endpoint (Admin only) - for debugging
export const testSkillMatching = async (req, res) => {
    try {
        const user = req.user;

        // Only admin can access this endpoint
        if(user.role !== "admin"){
            return res.status(403).json({error: "Forbidden: Admin access required"});
        }

        const { ticketSkills, moderatorSkills } = req.body;

        if (!ticketSkills || !moderatorSkills) {
            return res.status(400).json({
                error: "Both ticketSkills and moderatorSkills arrays are required"
            });
        }

        const matches = [];

        ticketSkills.forEach(ticketSkill => {
            moderatorSkills.forEach(modSkill => {
                const ticketSkillNormalized = ticketSkill.toLowerCase().replace(/[^a-z0-9]/g, '');
                const modSkillNormalized = modSkill.toLowerCase().replace(/[^a-z0-9]/g, '');
                
                const isMatch = modSkillNormalized.includes(ticketSkillNormalized) ||
                               ticketSkillNormalized.includes(modSkillNormalized) ||
                               modSkillNormalized === ticketSkillNormalized ||
                               (ticketSkillNormalized === 'js' && (modSkillNormalized.includes('javascript') || modSkillNormalized.includes('nodejs') || modSkillNormalized.includes('reactjs'))) ||
                               (ticketSkillNormalized === 'node' && modSkillNormalized.includes('nodejs')) ||
                               (ticketSkillNormalized === 'react' && modSkillNormalized.includes('reactjs')) ||
                               (modSkillNormalized.includes('js') && ticketSkillNormalized.includes('javascript'));

                if (isMatch) {
                    matches.push({
                        ticketSkill: ticketSkill,
                        moderatorSkill: modSkill,
                        ticketNormalized: ticketSkillNormalized,
                        moderatorNormalized: modSkillNormalized,
                        matched: true
                    });
                }
            });
        });

        return res.status(200).json({
            success: true,
            matches: matches,
            totalMatches: matches.length
        });
        
    } catch (error) {
        console.log("Error Testing Skill Matching ", error.message);
        return res.status(500).json({error: "Internal Server Error"});
    }
};

// Add reply to ticket (Moderator/Admin only)
export const addReply = async (req, res) => {
    try {
        const user = req.user;
        const { message } = req.body;

        // Only moderator or admin can add replies
        if(user.role !== "admin" && user.role !== "moderator"){
            return res.status(403).json({error: "Forbidden: Only moderators and admins can add replies"});
        }

        if (!message || message.trim() === "") {
            return res.status(400).json({error: "Reply message is required"});
        }

        const ticket = await Ticket.findById(req.params.id);
        if(!ticket){
            return res.status(404).json({error: "Ticket Not Found"});
        }

        // Add the reply
        ticket.replies.push({
            message: message.trim(),
            repliedBy: user._id
        });

        // Update ticket status to COMPLETED and set completion time
        ticket.status = "COMPLETED";
        ticket.completedAt = new Date();
        
        // Reset user feedback when new reply is added
        ticket.userFeedback.isResolved = null;
        ticket.userFeedback.feedbackAt = null;
        ticket.userFeedback.feedbackMessage = null;

        const updatedTicket = await ticket.save();
        
        // Populate the references
        await updatedTicket.populate("assignedTo", ["email", "_id", "role"]);
        await updatedTicket.populate("createdBy", ["email", "_id", "role"]);
        await updatedTicket.populate("replies.repliedBy", ["email", "_id", "role"]);

        return res.status(200).json({
            success: true,
            ticket: updatedTicket,
            message: "Reply added successfully and ticket marked as completed"
        });
        
    } catch (error) {
        console.log("Error Adding Reply ", error.message);
        return res.status(500).json({error: "Internal Server Error"});
    }
};

// Handle user feedback on completed ticket
export const submitUserFeedback = async (req, res) => {
    try {
        const user = req.user;
        const { isResolved, feedbackMessage } = req.body;

        const ticket = await Ticket.findById(req.params.id);
        if(!ticket){
            return res.status(404).json({error: "Ticket Not Found"});
        }

        // Only the ticket creator can provide feedback
        if(ticket.createdBy.toString() !== user._id.toString()){
            return res.status(403).json({error: "Forbidden: Only the ticket creator can provide feedback"});
        }

        // Only allow feedback on completed tickets
        if(ticket.status !== "COMPLETED"){
            return res.status(400).json({error: "Feedback can only be provided on completed tickets"});
        }

        // Update feedback
        ticket.userFeedback.isResolved = isResolved;
        ticket.userFeedback.feedbackAt = new Date();
        ticket.userFeedback.feedbackMessage = feedbackMessage || "";

        // If user says issue is not resolved, reopen the ticket
        if (!isResolved) {
            ticket.status = "REOPENED";
            ticket.reopenedAt = new Date();
        }

        const updatedTicket = await ticket.save();
        
        // Populate the references
        await updatedTicket.populate("assignedTo", ["email", "_id", "role"]);
        await updatedTicket.populate("createdBy", ["email", "_id", "role"]);
        await updatedTicket.populate("replies.repliedBy", ["email", "_id", "role"]);

        const message = isResolved 
            ? "Thank you for your feedback! Ticket marked as resolved."
            : "Ticket has been reopened. A moderator will provide additional assistance.";

        return res.status(200).json({
            success: true,
            ticket: updatedTicket,
            message: message
        });
        
    } catch (error) {
        console.log("Error Submitting User Feedback ", error.message);
        return res.status(500).json({error: "Internal Server Error"});
    }
};


