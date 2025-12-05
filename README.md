Project Specification: Full-Stack Web Application

Tech Stack

Frontend: React 19, Next.js 15, Tailwind CSS 4
Backend: RESTful API (Node.js/Express or equivalent) with modern best practices
Core Features to Implement

Authentication & User Management
 - Secure login and registration
 - Email verification
 - Password reset (via email)
 - Role-based access control (RBAC) with granular permissions
 - Login history tracking

Admin Dashboard
 - Centralized interface for managing users, and system settings
 - Reporting and analytics

Communication & Notifications
 - Contact form with email integration
 - In-app and email notifications (e.g., booking confirmations, password resets)

Backend Architecture Requirements

 - Modular folder structure with clear separation of concerns
 - Implement:
     - Models (data schemas)
     - Routes with proper access control
     - Middleware (authentication, logging, error handling)
     - Validation (input sanitization and schema validation)
     - Context/Auth providers for session management
     - API routes (RESTful or tRPC if preferred)
     - Route protection (verify user roles/permissions before access)

Frontend Architecture Requirements

 - Use React Server Components (RSC) and Client Components appropriately
 - Leverage Next.js 15 features (App Router, server actions, etc.)
 - Custom hooks for data fetching, form handling, and auth logic
 - Responsive UI built with Tailwind CSS 4
 - Protected routes based on user roles and authentication status

Basic Structure:

/
├── public/
│   └── # Static assets
├── src/
│   ├── app/
│   │   ├── (api)/
│   │   │   └── # Next.js API Routes (or tRPC)
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── admin/
│   │   │   └── # Admin dashboard routes
│   │   ├── layout.js
│   │   └── page.js
│   ├── components/
│   │   ├── ui/
│   │   └── # Shared client/server components
│   ├── hooks/
│   │   └── # Custom hooks
│   ├── lib/
│   │   └── # Helper functions, utils
│   └── middleware.js # For route protection
└── # Config files (tailwind.config.js, etc.)