import { inngest } from "../inngest/client.js";
import Ticket from "../models/ticket.model.js";

export const createTicket = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res
        .status(400)
        .json({ error: "Title and description are required" });
    }
    const newTicket = await Ticket.create({
      title,
      description,
      createdBy: req.user._id.toString(),
    });

    await inngest.send({
      name: "ticket/created",
      data: {
        ticketId: newTicket._id.toString(),
        title,
        description,
        createdBy: req.user._id.toString(),
      },
    });
    return res
      .status(201)
      .json({
        success: true,
        ticket: newTicket,
        message: "Ticket created successfully and processing started",
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
    if (user.role === "user") {
      tickets = await Ticket.find({})
        .populate("assignedTo", ["email", "_id"])
        .sort({ createdAt: -1 });
    } else {
      tickets = await Ticket.find({ createdBy: user._id })
        .select("title description status createAt")
        .sort({ createdAt: -1 });
    }

    return res.status(200).json(tickets);
  } catch (error) {
    console.error("Error fetching tickets:", error.message);
    return res.status(500).json({ error: "Failed to fetch tickets" });
  }
};


export const getTicket = async ()=>{
    try {
        const user  = req.user;
        let ticket;

        if(user.role !== "user"){
            ticket = Ticket.findById(req.params.id)
            .populate("assignedTO", ["email", "_id"])
        }
        else{
            ticket = Ticket.findOne({
                createdBy:user._id,
                _id: req.params.id
            }).select("title description status createdA");
        }

        if(!ticket){
            return res.status(404).josn({message: "Ticket Not Found"});
        }

        return res.status(404).json({ticket});
        
    } catch (error) {
        console.log("Error Fetching Ticket ", error.message);
        return res.status(500).json({message: "Internal Server Error"});
    }
};


