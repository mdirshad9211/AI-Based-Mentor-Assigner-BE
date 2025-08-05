import mongoose from "mongoose";

const ReplySchema = new mongoose.Schema({
    message: {
        type: String,
        required: true
    },
    repliedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    repliedAt: {
        type: Date,
        default: Date.now
    }
});

const TicketSchema = new mongoose.Schema({
    title: String,
    description: String,
    status:{
        type: String,
        enum: ["TODO", "IN_PROGRESS", "COMPLETED", "REOPENED"],
        default: "TODO" 
    },
    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
    },
    assignedTo:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        default: null
    },
    priority:String,
    deadline:Date,
    helpfulNotes:String,
    relatedSkills:[String],
    replies: [ReplySchema],
    userFeedback: {
        isResolved: {
            type: Boolean,
            default: null // null = no feedback yet, true = resolved, false = not resolved
        },
        feedbackAt: {
            type: Date
        },
        feedbackMessage: String
    },
    completedAt: Date,
    reopenedAt: Date,
    createdAt:{
        type:Date,
        default:Date.now
    }
});

export default mongoose.model("Ticket", TicketSchema);