# Student Activity Data Analysis System (SADAS)

SADAS is a comprehensive web platform specifically designed for tracking and analyzing student activities. It empowers institutions to collect, store, and analyze data regarding students' field projects, cultural and sporting activities, higher education details, and professional examinations with high precision.

## Features

- **Role-based Access Control**: Two distinct roles - `student` and `admin`. 
- **Strict Data Collection**: Collects highly structured and detailed information across 8 crucial dimensions:
  - Field Projects & Student Projects
  - Internship Data
  - Club Activities
  - Sports Activities
  - Higher Education Details
  - State/National/International Examinations
  - Hackathons
  - Extra-Curricular Activities
- **Student Portal**: Students can log in to update their metadata seamlessly, and use a dynamic "Add Record" modal to submit specialized records. The forms strictly ask for the exact fields needed for each type. Student names and PRNs are securely bound to the submission upon entry.
- **Admin Analytics Dashboard**: Administrators have a bird's-eye view of all institutional data. They can analyze participation across different departments, view aggregate performance, and monitor activities.
- **Multi-Sheet Report Generation**: Admins can generate highly detailed, downloadable Excel reports that automatically segregate the submitted data into different spreadsheet tabs (e.g., 'Hackathons', 'Higher Education') perfectly mapped to individual columns.

## Technology Stack

- **Backend Framework**: Node.js with Express.js
- **Database**: PostgreSQL (with discrete specialized relational tables)
- **Frontend**: Vite + React.js + Tailwind CSS
- **Authentication**: JWT (JSON Web Tokens) and bcrypt for password hashing

## Prerequisites

Before starting, make sure you have the following installed:
- Node.js (v14 or higher)
- PostgreSQL
- standard CLI/Terminal software (Git bash, PowerShell, or zsh)

---

## Step-by-Step Running Guide (Locally)

Follow these exact steps to launch the application locally.

### 1. Database Setup

1. Open your PostgreSQL terminal (psql tool) or interface.
2. Create a new dummy database for the project (e.g., `student_activity_db` or `sadas`).
3. Run the complete schema creation file to initialize the users and the 8 new dedicated tables:
   ```bash
   psql -U your_postgres_user -d your_db_name -f database/schema.sql
   ```
4. Run the seed file to populate dummy records (including pre-filled student data across all the new forms):
   ```bash
   psql -U your_postgres_user -d your_db_name -f database/seed.sql
   ```
*(Note: Replace `your_postgres_user` and `your_db_name` with your actual Postgres credentials).*

### 2. Backend Setup

1. Open a terminal and navigate strictly to the `backend` directory.
   ```bash
   cd backend
   ```
2. Install the necessary NPM dependencies.
   ```bash
   npm install
   ```
3. Establish your environment variables. Copy `.env.example` to `.env`. Ensure to configure `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` to match your local PostgreSQL instance credentials.
   ```bash
   # Linux/Mac
   cp .env.example .env
   
   # Windows PowerShell
   Copy-Item .env.example .env
   ```
4. Start the backend Node server.
   ```bash
   npm run dev
   # The server will output startup logs and typically run on http://localhost:5000
   ```

### 3. Frontend Setup

1. Let the backend continue running. Open a fresh terminal and navigate to the `frontend` directory.
   ```bash
   cd frontend
   ```
2. Install the React application dependencies.
   ```bash
   npm install
   ```
3. Start the Vite UI development server.
   ```bash
   npm run dev
   # The application GUI will be accessible locally, typically at http://localhost:5173
   ```

---

## Deployment (Running in Real-Time / Production)

Once you are done testing locally and wish to deploy the project live to real users, follow these detailed step-by-step instructions.

### Phase 1: Prepare the Production Database
1. Pick a managed Cloud PostgreSQL provider such as **Supabase**, **Render Database**, or **AWS RDS**.
2. Create a new PostgreSQL database instance on their platform.
3. They will provide you with connection credentials (Host, Port, User, Password, Database Name, or a single Connection URI).
4. Run your `schema.sql` (and optionally `seed.sql`) against this remote host using `psql`, pgAdmin, or the provider's SQL runner.

### Phase 2: Deploy the Backend
1. Use a cloud hosting platform made for Node.js like **Render**, **Heroku**, or **DigitalOcean App Platform**.
2. Connect your Git repository to the platform and point the "Root Directory" to `backend/`.
3. Set your Build Command to `npm install` and Start Command to `npm start`.
4. **Crucial Step**: In the platform's Environment Variables setting, explicitly set:
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` matching the Cloud Database you made in Phase 1.
   - `JWT_SECRET` to a long, secure random string.
   - `NODE_ENV` to `production`.
5. Deploy the backend. Once deployed, note down your live Backend URL (e.g., `https://sadas-api.onrender.com`).

### Phase 3: Setup Frontend for Production and Deploy
1. Open up your codebase at `frontend/src/services/api.js` (or wherever your Axios/Fetch base URL is configured).
2. Change the `baseURL` property to point directly to your live Backend URL.
   ```javascript
   // Change from '/api' to your production URL:
   baseURL: 'https://sadas-api.onrender.com/api',
   ```
3. Choose a static site hosting platform like **Vercel** or **Netlify**.
4. Connect your Git repository and set the "Root Directory" to `frontend/`.
5. Ensure the framework preset is set to **Vite**. The build command should be `npm run build` and the output (publish) directory should be `dist`.
6. Click deploy. Your frontend is now successfully live on the internet!

*Note: Ensure your Backend's CORS configuration allows requests from your new live Vercel/Netlify frontend URL.*

---

## Default Login Credentials

Use the following pre-seeded credentials to explore the dashboards without registering fresh users:

**Admin Access**:
- Email: `admin@sadas.edu`
- Password: `Password@123`

**Student Access**:
- Email: `student1@sadas.edu` (Accounts from `student1` through `student5` are available)
- Password: `Password@123`
