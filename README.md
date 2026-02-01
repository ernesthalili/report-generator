# PenTest Reporter - Full Stack Application
## Complete Setup Guide

A full-stack web application for creating penetration testing reports using your custom Word template.

## 🏗️ Architecture

- **Frontend**: React (Single Page Application)
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Authentication**: JWT tokens
- **Template Engine**: docxtemplater (handles [TEXT] placeholders)

## 📋 Prerequisites

Before you begin, ensure you have installed:

1. **Node.js** (v14 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **MongoDB** (v4.4 or higher)
   - Download: https://www.mongodb.com/try/download/community
   - Or use Docker: `docker run -d -p 27017:27017 --name mongodb mongo:latest`
   - Verify: `mongosh` or `mongo`

3. **npm** (comes with Node.js)
   - Verify: `npm --version`

## 🚀 Installation Steps

### Step 1: Extract and Navigate
```bash
cd pentest-app
```

### Step 2: Install Dependencies

```bash
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### Step 3: Configure Environment

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/pentest-reports
JWT_SECRET=change_this_to_a_long_random_string_for_production
JWT_EXPIRE=7d
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

**IMPORTANT**: Change `JWT_SECRET` to a secure random string in production!

### Step 4: Add Your Template

Copy your `WAPT_template.docx` file to the templates directory:

```bash
mkdir -p templates
cp /path/to/your/WAPT_template.docx templates/
```

### Step 5: Start MongoDB

Make sure MongoDB is running:

```bash
# If using system installation
sudo systemctl start mongod

# Or if using Docker
docker start mongodb

# Verify it's running
mongosh
# or
mongo
```

### Step 6: Run the Application

**Option A: Development Mode (Recommended for development)**

Run both frontend and backend concurrently:

```bash
npm run dev
```

This will:
- Start the backend server on `http://localhost:5000`
- Start the React dev server on `http://localhost:3000`
- Open your browser automatically

**Option B: Run Separately**

Terminal 1 (Backend):
```bash
npm run server
```

Terminal 2 (Frontend):
```bash
npm run client
```

**Option C: Production Mode**

```bash
# Build the frontend
npm run build

# Set environment to production
export NODE_ENV=production

# Start the server
npm start
```

## 📱 Using the Application

### 1. First Time Setup

1. Open your browser to `http://localhost:3000`
2. Click **"Register here"**
3. Create your account:
   - Username (minimum 3 characters)
   - Email
   - Password (minimum 6 characters)
4. You'll be automatically logged in

### 2. Creating a Report

1. Click **"+ Create New Report"** from the dashboard
2. Fill in the form sections:
   
   **Project Information:**
   - Project Name (required)
   - Testing Company Name
   - Testing Mode (Black Box, White Box, etc.)
   
   **Targets:**
   - Add all tested targets (name, URL, severity)
   - Use "+ Add Target" to add more
   
   **Test User Accounts:**
   - Add credentials used during testing
   - Username and description for each
   
   **Vulnerabilities:**
   - Add each finding with:
     - Name, severity, priority
     - CVSS score and vector
     - Description (multiple fields available)
     - Impact
     - Remediation steps
     - Affected targets
     - Vulnerable parameters
     - Testing methodologies

3. Click **"Create Report"**

### 3. Managing Reports

From the dashboard you can:
- **View** all your reports
- **Edit** any report
- **Download DOCX** - generates Word document with your template
- **Delete** reports you no longer need

### 4. Generating Documents

1. Go to Dashboard
2. Find your report
3. Click **"📥 Download DOCX"**
4. The system will:
   - Load your template
   - Replace all `[TEXT]` placeholders with your data
   - Generate and download the final document

## 🔧 Template Placeholder Mapping

Your template uses these placeholders, which map to form fields:

### Project Fields
- `[TESTING COMPANY NAME]` → Testing Company Name
- `[TESTING MODE]` → Testing Mode

### Target Fields (numbered 1, 2, 3...)
- `[TARGET1 NAME]` → Target 1 Name
- `[TARGET1 URL]` → Target 1 URL
- `[TARGET1 SEVERITY]` → Target 1 Severity

### User Account Fields
- `[USERNAME1]` → User Account 1 Username
- `[USERNAME1 DESCRIPTION]` → User Account 1 Description

### Vulnerability Fields (numbered 1, 2, 3...)
- `[VULNERABILITY1 NAME]` → Vulnerability 1 Name
- `[VULNERABILITY1 SEVERITY]` → Vulnerability 1 Severity
- `[VULNERABILITY1 PRIORITY]` → Vulnerability 1 Priority
- `[CVSS VULN1]` → CVSS Score
- `[CVSS VECTOR VULN1]` → CVSS Vector String
- `[VULN1 DESCRIPTION]` → Main Description
- `[VULN1 DESCRIPTION1]` → Additional Description 1
- `[VULN1 DESCRIPTION2]` → Additional Description 2
- `[VULN1 IMPACT]` → Impact
- `[VULN1 REMEDIETION]` → Remediation Steps
- `[VULN1 TARGET1]` → Affected Target 1
- `[VULN1 PARAMETER1]` → Vulnerable Parameter 1
- `[VULN1 MET1]` → Testing Methodology 1

## 🛠️ Troubleshooting

### MongoDB Connection Issues

**Error**: "MongoServerError: connect ECONNREFUSED"

**Solution**:
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Or using Docker
docker ps  # Check if container is running
docker start mongodb
```

### Port Already in Use

**Error**: "Port 5000 is already in use"

**Solution**:
```bash
# Find what's using the port
lsof -i :5000

# Kill the process or change port in .env
PORT=5001
```

### Cannot Find Module Errors

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules
npm install

# For client
cd client
rm -rf node_modules
npm install
```

### Template Not Found

**Error**: "Template file not found"

**Solution**:
```bash
# Ensure template is in correct location
ls templates/WAPT_template.docx

# If missing, copy it
cp /path/to/WAPT_template.docx templates/
```

### JWT Token Errors

**Solution**:
- Make sure `JWT_SECRET` is set in `.env`
- Try logging out and logging back in
- Clear browser localStorage: `localStorage.clear()`

## 📁 Project Structure

```
pentest-app/
├── server/
│   ├── models/
│   │   ├── User.js          # User schema
│   │   └── Report.js        # Report schema
│   ├── routes/
│   │   ├── auth.js          # Authentication routes
│   │   └── reports.js       # Report CRUD + generation
│   ├── middleware/
│   │   └── auth.js          # JWT authentication middleware
│   └── server.js            # Main server file
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.js     # Login page
│   │   │   ├── Register.js  # Registration page
│   │   │   ├── Dashboard.js # Report list
│   │   │   ├── CreateReport.js  # Create report form
│   │   │   └── EditReport.js    # Edit report form
│   │   ├── context/
│   │   │   └── AuthContext.js   # Auth state management
│   │   ├── App.js           # Main app component
│   │   └── index.js         # React entry point
│   └── package.json
├── templates/
│   └── WAPT_template.docx   # Your Word template
├── uploads/                 # User uploaded files
├── .env                     # Environment variables
├── .env.example            # Example environment file
├── package.json            # Server dependencies
└── README.md              # This file
```

## 🔐 Security Notes

1. **Change JWT_SECRET**: Use a long, random string in production
2. **Use HTTPS**: In production, always use HTTPS
3. **MongoDB Authentication**: Enable authentication in production
4. **Environment Variables**: Never commit `.env` to version control
5. **Input Validation**: All inputs are validated on backend
6. **Password Hashing**: Passwords are hashed with bcrypt

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Reports
- `GET /api/reports` - Get all user's reports (protected)
- `GET /api/reports/:id` - Get single report (protected)
- `POST /api/reports` - Create new report (protected)
- `PUT /api/reports/:id` - Update report (protected)
- `DELETE /api/reports/:id` - Delete report (protected)
- `POST /api/reports/:id/generate` - Generate DOCX (protected)

## 🎯 Features

✅ User authentication (register/login)
✅ Secure password hashing
✅ JWT token-based sessions
✅ Create, edit, delete reports
✅ Dynamic form for all template fields
✅ Multiple targets per report
✅ Multiple vulnerabilities per report
✅ Array fields for targets, parameters, methodologies
✅ Generate Word documents from template
✅ Download generated reports
✅ Responsive design
✅ MongoDB data persistence

## 📊 Database Schema

### Users Collection
```javascript
{
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  createdAt: Date
}
```

### Reports Collection
```javascript
{
  user: ObjectId (ref: User),
  projectName: String,
  testingCompanyName: String,
  testingMode: String,
  targets: [{
    name: String,
    url: String,
    severity: String
  }],
  userAccounts: [{
    username: String,
    description: String
  }],
  vulnerabilities: [{
    name: String,
    severity: String,
    priority: String,
    cvssScore: String,
    cvssVector: String,
    description: String,
    description1: String,
    description2: String,
    impact: String,
    remediation: String,
    targets: [String],
    parameters: [String],
    methodologies: [String]
  }],
  createdAt: Date,
  updatedAt: Date
}
```

## 🚢 Deployment

For production deployment:

1. **Build frontend**:
   ```bash
   npm run build
   ```

2. **Set environment**:
   ```bash
   export NODE_ENV=production
   ```

3. **Use process manager** (PM2):
   ```bash
   npm install -g pm2
   pm2 start server/server.js --name pentest-app
   pm2 save
   pm2 startup
   ```

4. **Reverse proxy** (Nginx):
   Configure Nginx to proxy to your Node.js server

5. **SSL Certificate** (Let's Encrypt):
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

## 📝 License

This project is for internal use. Customize as needed.

## 🆘 Support

If you encounter issues:

1. Check this README thoroughly
2. Review error messages in terminal
3. Check MongoDB is running
4. Ensure all dependencies are installed
5. Verify `.env` configuration
6. Check template file location

## 🎉 Quick Start Summary

```bash
# 1. Install dependencies
npm install && cd client && npm install && cd ..

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings

# 3. Add template
cp /path/to/WAPT_template.docx templates/

# 4. Start MongoDB
sudo systemctl start mongod

# 5. Run application
npm run dev

# 6. Open browser
# http://localhost:3000

# 7. Register and start creating reports!
```

Enjoy creating professional penetration testing reports! 🔒🔍
