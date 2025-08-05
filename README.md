# AI Ticket Assistant - Backend

A Node.js Express backend application for managing support tickets with AI-powered assignment and role-based access control.

## Features

- 🔐 **Authentication & Authorization**: JWT-based auth with role management (User, Moderator, Admin)
- 🎫 **Ticket Management**: Create, read, update tickets with status tracking
- 👥 **User Management**: User registration, login, profile management
- 🤖 **AI Integration**: Automated ticket assignment using AI (via Inngest)
- 📧 **Email Notifications**: Mailtrap integration for email notifications
- 🔄 **Background Processing**: Inngest for handling async workflows

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Background Jobs**: Inngest
- **Email**: Nodemailer with Mailtrap
- **AI Integration**: Google Gemini API
- **Environment**: dotenv

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-ticket-assistant/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Create a `.env` file in the backend directory:
   ```env
   # MongoDB Connection
   MONGO_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/ai-ticket-assistant
   
   # JWT Secret
   JWT_SECRET=your-super-secret-jwt-key
   
   # Server Port
   PORT=5000
   
   # Mailtrap SMTP
   MAILTRAP_SMTP_HOST=sandbox.smtp.mailtrap.io
   MAILTRAP_SMTP_PORT=2525
   MAILTRAP_SMTP_USER=your-mailtrap-user
   MAILTRAP_SMTP_PASS=your-mailtrap-password
   
   # Google Gemini AI
   GEMINI_API_KEY=your-gemini-api-key
   
   # Frontend URL
   APP_URL=http://localhost:3000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Start Inngest development server** (in a separate terminal)
   ```bash
   npm run inngest-dev
   ```

## API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/signup` | Register new user | No |
| POST | `/login` | User login | No |
| POST | `/logout` | User logout | Yes |
| POST | `/update-user` | Update user profile | Yes |
| GET | `/users` | Get all users (Admin only) | Yes |

### Ticket Routes (`/api/tickets`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get user's tickets / all tickets (Admin) | Yes |
| GET | `/:id` | Get specific ticket | Yes |
| POST | `/` | Create new ticket | Yes |
| PATCH | `/:id` | Update ticket (Admin/Moderator only) | Yes |

## Database Schema

### User Model
```javascript
{
  email: String (required, unique),
  password: String (required, hashed),
  role: String (enum: ["user", "admin", "moderator"], default: "user"),
  skills: [String],
  createdAt: Date
}
```

### Ticket Model
```javascript
{
  title: String (required),
  description: String (required),
  status: String (default: "TODO"),
  createdBy: ObjectId (ref: User),
  assignedTo: ObjectId (ref: User, nullable),
  priority: String,
  deadline: Date,
  helpfulNotes: String,
  relatedSkills: [String],
  createdAt: Date
}
```

## Role-Based Access Control

- **User**: Can create tickets and view their own tickets
- **Moderator**: Can view and update all tickets
- **Admin**: Full access to all users and tickets

## Background Jobs (Inngest)

The application uses Inngest for handling background processes:

- **User Signup**: Sends welcome email when user registers
- **Ticket Creation**: AI-powered ticket assignment based on user skills

## Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run inngest-dev` - Start Inngest development server

## Project Structure

```
backend/
├── controllers/          # Route handlers
│   ├── user.js          # User-related logic
│   └── ticket.js        # Ticket-related logic
├── models/              # Database models
│   ├── user.model.js    # User schema
│   └── ticket.model.js  # Ticket schema
├── routes/              # API routes
│   ├── user.js          # Auth routes
│   └── ticket.js        # Ticket routes
├── middlewares/         # Custom middleware
│   └── auth.js          # JWT authentication
├── inngest/             # Background job functions
│   ├── client.js        # Inngest client
│   └── functions/       # Job definitions
├── utils/               # Utility functions
│   ├── ai.js           # AI integration
│   └── mailer.js       # Email utilities
├── index.js             # Application entry point
└── package.json         # Dependencies and scripts
```

## Development

1. Ensure MongoDB is running
2. Start the backend server: `npm run dev`
3. Start Inngest server: `npm run inngest-dev`
4. The API will be available at `http://localhost:5000`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.
