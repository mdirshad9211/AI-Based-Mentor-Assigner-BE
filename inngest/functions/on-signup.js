import Inngest, { NonRetriableError } from "inngest";
import User from "../models/user.js";
import { sendMail } from "../../utils/mailer";
export const onUserSignup = inngest.createFunction(
  { id: "on-user-signup", retries: 2 },
  { event: "user/signup" },
  async ({ event, step }) => {
    try {
      const { email } = event.data;
      const user = await step.run("get-user-email", async () => {
        const userObject = await User.findOne({ email });
        if (!userObject) {
          throw new NonRetriableError("User does not exist in our DB");
        }
        return userObject;
      });

      await step.run("send-welcome-email", async () => {
        const subject = "Welcome to AI Ticket Assistant!";
        const message = `Hi,
        \n\n
        Thanks for signup we're glad to welcome you to our ticketing system`;
        await sendMail(user.email, subject, message);
      });
      return { success: true, userId: user._id };
    } catch (error) {
      console.error("Error in onUserSignup function:", error);
      throw new NonRetriableError("Failed to process user signup");
    }
  }
);
