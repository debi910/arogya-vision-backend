# Healthcare App Backend

A multi-tenant healthcare management system backend built with Node.js, Express, and Supabase.

## Features

- **Multi-Tenant Architecture** - Complete data isolation between clinics
- **User Management** - Admin, doctor, receptionist, and patient roles
- **JWT Authentication** - Secure token-based authentication
- **Patient Management** - Patient records and health information
- **Doctor Management** - Doctor profiles and specializations
- **Appointment Scheduling** - Book and manage appointments
- **Consultations** - Record detailed consultation notes and medicines
- **AI Integration** - AI-powered medicine suggestions using Groq API
- **Analytics Dashboard** - Real-time clinic statistics and metrics
- **HIPAA-Ready** - Secure multi-tenant data isolation

## Prerequisites

- Node.js 16+ 
- npm or yarn
- Supabase account
- Groq API key (for AI features)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd healthcare-app-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your actual credentials:
   - Supabase URL and keys
   - JWT secret
   - Groq API key
   - Server port

4. **Start the server**
   ```bash
   node index.js
   ```
   Server runs on `http://localhost:5000`

## Environment Variables

See `.env.example` for all required variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Public Supabase key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin Supabase key | Yes |
| `JWT_SECRET` | Secret for JWT signing | Yes |
| `GROQ_API_KEY` | Groq API key for AI | Yes |
| `PORT` | Server port | No (default: 5000) |

## API Documentation

### Authentication
- **POST** `/api/auth/register-admin` - Register new clinic and admin user
- **POST** `/api/auth/login` - Login user and get JWT token

### Patients (Protected)
- **GET** `/api/patients` - List all patients in clinic
- **POST** `/api/patients` - Create new patient
- **GET** `/api/patients/:id` - Get patient details

### Doctors (Protected)
- **GET** `/api/doctors` - List all doctors in clinic
- **POST** `/api/doctors` - Add new doctor

### Appointments (Protected)
- **GET** `/api/appointments` - List all appointments
- **GET** `/api/appointments/:id` - Get appointment details
- **POST** `/api/appointments` - Create appointment

### Consultations (Protected)
- **GET** `/api/consultations` - List all consultations
- **POST** `/api/consultations` - Create consultation with notes

### AI (Protected)
- **POST** `/api/ai/suggest` - Get AI medicine suggestions based on symptoms

### Analytics (Protected)
- **GET** `/api/analytics/overview` - Get clinic statistics and metrics

### Admin (Protected - Admin Only)
- **GET** `/api/admin/users` - List all staff users
- **POST** `/api/admin/users` - Create new staff user

### Tenant (Protected)
- **GET** `/api/tenant/profile` - Get clinic profile information

## Architecture

### Middleware Stack
1. **CORS** - Handle cross-origin requests
2. **JSON Parser** - Parse request bodies
3. **Auth Middleware** - Verify JWT and extract user info
4. **Tenant Middleware** - Validate tenant from JWT
5. **Route Handlers** - Process requests with automatic tenant filtering

### Security Features
- JWT-based authentication with 7-day expiry
- Multi-tenant data isolation at database level
- Admin-only endpoints protected by role-based middleware
- Supabase service role for privileged operations
- Environment variable configuration for sensitive data

## Database Schema

The backend expects these Supabase tables:

- **users** - App-level users (linked to Supabase auth)
- **tenants** - Clinic/organization records
- **patients** - Patient information
- **doctors** - Doctor profiles
- **appointments** - Scheduled appointments
- **consultations** - Consultation records with notes and medicines

## Error Handling

All endpoints return JSON responses:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "error": "Error message here"
}
```

## Development

```bash
# Start development server
node index.js

# The server will output:
# Backend server running on port 5000
```

Visit `http://localhost:5000` to verify the server is running.

## Production Deployment

1. Set `JWT_SECRET` to a strong random string
2. Use environment-specific Supabase keys
3. Enable HTTPS/TLS
4. Set appropriate CORS origins
5. Implement rate limiting
6. Enable Supabase RLS policies
7. Monitor logs and error rates

## License

ISC 
