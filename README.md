# AI Ticket Assistant - Backend

A sophisticated Node.js Express backend application for intelligent support ticket management with AI-powered automatic assignment, skill-based matching, role-based access control, and comprehensive ticket lifecycle management.

## 🚀 Features

- 🔐 **Advanced Authentication & Authorization**: JWT-based auth with role management (User, Moderator, Admin)
- 🎫 **Comprehensive Ticket Management**: Create, read, update, reply, and track tickets with complete lifecycle
- 👥 **User Management**: Registration, login, profile management with role-based validation
- 🤖 **AI-Powered Auto Assignment**: Intelligent ticket assignment using skill-based matching algorithms
- 💬 **Ticket Reply System**: Threaded conversations and communication tracking
- ⭐ **User Feedback System**: Rating and feedback collection for completed tickets
- 📧 **Email Notifications**: Mailtrap integration for automated notifications
- 🔄 **Background Processing**: Inngest for handling async workflows and AI processing
- 🎯 **Skills Management**: Mandatory skills for moderators enabling smart assignment
- 📊 **Advanced Analytics**: System metrics and performance tracking

## 🆕 Latest Features

### AI-Powered Automatic Assignment
- **Flexible Skill Matching**: Advanced algorithms for matching ticket requirements with moderator skills
- **String Normalization**: Intelligent text processing for better skill detection
- **Workload Balancing**: Even distribution of tickets among qualified moderators
- **Manual Override**: Admin capability to manually assign tickets when needed
- **Testing Endpoints**: Dedicated endpoints for testing and debugging skill matching

### Enhanced Ticket System
- **Reply Threading**: Complete conversation history within tickets
- **User Feedback**: 5-star rating system with detailed comments
- **Status Lifecycle**: Comprehensive status tracking (TODO → IN_PROGRESS → COMPLETED → REOPENED)
- **Skills Integration**: Automatic skill extraction from ticket content
- **Assignment Logic**: Sophisticated assignment algorithms with multiple matching strategies

### Improved Authentication
- **Role Validation**: Fixed role selection bugs with proper parameter extraction
- **Skills Validation**: Mandatory skills requirement for moderator registration
- **Enhanced Security**: Improved JWT handling and session management

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
| POST | `/signup` | Register new user with role and skills validation | No |
| POST | `/login` | User login with role-based response | No |
| POST | `/logout` | User logout and session cleanup | Yes |
| POST | `/update-user` | Update user profile and skills | Yes |
| GET | `/users` | Get all users with role filtering (Admin only) | Yes |

### Ticket Routes (`/api/tickets`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get user's tickets / all tickets based on role | Yes |
| GET | `/:id` | Get specific ticket with full details | Yes |
| POST | `/` | Create new ticket with auto-assignment | Yes |
| PATCH | `/:id` | Update ticket status and details | Yes |
| POST | `/:id/replies` | Add reply to ticket conversation | Yes |
| POST | `/:id/feedback` | Submit user feedback and rating | Yes |
| POST | `/auto-assign` | Manually trigger auto-assignment | Yes (Admin) |
| POST | `/test-skill-matching` | Test skill matching algorithms | Yes (Admin) |

## Database Schema

### User Model
```javascript
{
  email: String (required, unique),
  password: String (required, hashed with bcrypt),
  role: String (enum: ["user", "admin", "moderator"], default: "user"),
  skills: [String] (required for moderator role),
  createdAt: Date,
  updatedAt: Date
}
```

### Ticket Model
```javascript
{
  title: String (required),
  description: String (required),
  status: String (enum: ["TODO", "IN_PROGRESS", "COMPLETED", "REOPENED"], default: "TODO"),
  createdBy: ObjectId (ref: User, required),
  assignedTo: ObjectId (ref: User, nullable),
  priority: String (enum: ["low", "medium", "high"]),
  deadline: Date,
  helpfulNotes: String,
  relatedSkills: [String] (extracted from content),
  replies: [ReplySchema],
  userFeedback: {
    rating: Number (1-5),
    comment: String,
    submittedAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Reply Schema (Embedded in Ticket)
```javascript
{
  _id: ObjectId (auto-generated),
  content: String (required),
  author: ObjectId (ref: User, required),
  createdAt: Date (default: Date.now)
}
```

## Role-Based Access Control

- **User**: 
  - Create tickets with automatic AI assignment
  - View and reply to their own tickets
  - Submit feedback for completed tickets
  - Track ticket progress through all status stages

- **Moderator**: 
  - All user permissions
  - View and manage assigned tickets
  - Update ticket status and add replies
  - Receive automatically assigned tickets based on skills
  - Access to moderator-specific dashboard

- **Admin**: 
  - Full system access and control
  - Manage all users and tickets
  - Manual ticket assignment override
  - Test and configure skill matching algorithms
  - Access to system analytics and metrics
  - User role management

## Background Jobs (Inngest)

The application uses Inngest for handling background processes and AI operations:

- **User Signup**: Sends welcome email when user registers with role-specific content
- **Ticket Creation**: AI-powered automatic assignment based on skill matching algorithms
- **Assignment Processing**: Background processing of ticket assignments with workload balancing
- **Email Notifications**: Automated email notifications for ticket updates and assignments

## AI-Powered Features

### Automatic Ticket Assignment
- **Skill Extraction**: Automatically extracts relevant skills from ticket content
- **Flexible Matching**: Multiple matching strategies including exact, partial, and similarity matching
- **String Normalization**: Intelligent text processing for better skill detection
- **Workload Balancing**: Even distribution considering current moderator workloads
- **Assignment Algorithm**: Sophisticated scoring system for optimal moderator selection

### Skill Matching Algorithm
```javascript
// Core features of the assignment system:
- Text normalization and preprocessing
- Multiple matching strategies (exact, contains, similarity)
- Workload-based scoring
- Fallback assignment mechanisms
- Testing and debugging endpoints
```

## Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run inngest-dev` - Start Inngest development server

## Project Structure

```
backend/
├── controllers/          # Route handlers and business logic
│   ├── user.js          # User authentication, registration, role management
│   └── ticket.js        # Ticket CRUD, replies, feedback, assignment logic
├── models/              # Database schemas and models
│   ├── user.model.js    # User schema with role validation
│   └── ticket.model.js  # Enhanced ticket schema with replies and feedback
├── routes/              # API route definitions
│   ├── user.js          # Authentication and user management routes
│   └── ticket.js        # Ticket management and operation routes
├── middlewares/         # Custom middleware functions
│   └── auth.js          # JWT authentication and role verification
├── inngest/             # Background job processing
│   ├── client.js        # Inngest client configuration
│   └── functions/       # Background job definitions
│       ├── on-signup.js # User registration workflows
│       └── on-ticket-create.js # Ticket creation and assignment
├── utils/               # Utility functions and helpers
│   ├── ai.js           # AI integration and processing
│   ├── mailer.js       # Email utilities and templates
│   └── autoAssign.js   # NEW: AI-powered assignment algorithms
├── index.js             # Application entry point and server setup
└── package.json         # Dependencies, scripts, and project metadata
```

## Development

1. **Prerequisites**: Ensure MongoDB is running and accessible
2. **Environment Setup**: Configure all required environment variables in `.env`
3. **Start Backend**: `npm run dev` (starts server with nodemon for auto-reload)
4. **Start Inngest**: `npm run inngest-dev` (starts background job processing)
5. **API Access**: The API will be available at `http://localhost:5000`
6. **Database**: MongoDB connection will be established automatically
7. **Testing**: Use the skill matching test endpoints to verify AI functionality

## Key Features Implementation

### Automatic Assignment System
- Located in `utils/autoAssign.js`
- Implements flexible skill matching with multiple strategies
- Handles workload balancing and moderator selection
- Provides testing endpoints for algorithm verification

### Enhanced Authentication
- Fixed role selection bugs in user registration
- Mandatory skills validation for moderator role
- Improved JWT token handling and session management

### Ticket Reply System
- Embedded reply schema in ticket model
- Population of user references for reply authors
- Chronological conversation threading

### User Feedback System
- 5-star rating system with optional comments
- Feedback submission only for completed tickets
- Analytics and reporting capabilities

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.
