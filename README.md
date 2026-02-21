# Report Generator

A full-stack web application for creating, managing, and exporting professional penetration testing reports. Built with React, Node.js, Express, and MongoDB.

---

## 🏗️ Architecture

| Layer | Technology |
|---|---|
| Frontend | React 18 (SPA) |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Auth | JWT tokens + email verification |
| Report engine | docxtemplater + custom CrossReference module |
| AI assistance | Groq API (text enhancement) |
| Email | Resend / Nodemailer |

---

## 📋 Prerequisites

- **Node.js** v14 or higher → https://nodejs.org/
- **MongoDB** v4.4 or higher → https://www.mongodb.com/try/download/community  
  (or via Docker: `docker run -d -p 27017:27017 --name mongodb mongo:latest`)
- **npm** (bundled with Node.js)

---

## 🚀 Installation

### 1. Install dependencies

```bash
# From the project root — installs both server and client in one command
npm run install-all
```

Or manually:

```bash
npm install
cd client && npm install && cd ..
```

### 2. Configure environment

Create a `.env` file in the project root. Use the template below and fill in your own values — **never commit this file to version control**.

```env
# ── Server ────────────────────────────────────────────────────────────────────
PORT=5000
NODE_ENV=development

# ── Database ──────────────────────────────────────────────────────────────────
MONGODB_URI=mongodb://localhost:27017/pentest-reports

# ── Auth ──────────────────────────────────────────────────────────────────────
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_long_random_secret_here
JWT_EXPIRE=7d

# ── File uploads ──────────────────────────────────────────────────────────────
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# ── AI (Groq) ─────────────────────────────────────────────────────────────────
# Get your key from: https://console.groq.com/keys
GROQ_API_KEY=your_groq_api_key_here

# ── Email (Resend) ────────────────────────────────────────────────────────────
# Get your key from: https://resend.com → API Keys
RESEND_API_KEY=your_resend_api_key_here

# ── Email (Gmail fallback) ────────────────────────────────────────────────────
GMAIL_USER=your_gmail_address@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password_here

# ── App ───────────────────────────────────────────────────────────────────────
APP_NAME=Report Generator
CLIENT_URL=http://localhost:3000
```

> **Security note:** `JWT_SECRET` must be a long random string in production. To generate one run:  
> `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### 3. Start MongoDB

```bash
# System installation
sudo systemctl start mongod

# Docker
docker start mongodb
```

### 4. Run the application

```bash
# Development — starts both backend (port 5000) and frontend (port 3000) concurrently
npm run dev
```

Other options:

```bash
npm run server    # Backend only (with nodemon)
npm run client    # Frontend only
npm start         # Production (no nodemon, no React dev server)
```

Open your browser at **http://localhost:3000**

---

## 📱 Using the Application

### Register & Login

1. Go to `http://localhost:3000` and click **"Register here"**
2. Fill in your username, email, and password (min. 6 characters)
3. Verify your email address via the link sent to your inbox
4. Log in — you'll land on the Dashboard

> Password reset and email change are available from **Settings**.

---

### Dashboard

The Dashboard lists all your reports. Each card shows:
- Project name and client
- Testing period (start → end date)
- Vulnerability severity distribution bar
- **Status badge** — toggle between `✏️ Editing` and `✅ Finished` directly from the card

**Filter panel** (click 🔍 Filters): filter reports by status, client, tester, and date range (start date, end date, created, or updated). All filtering is instant and client-side.

---

### Creating a Report

Click **➕ New Report** from the sidebar.

Fill in the form sections:

**Project Info**
- Project name (required)
- Client name
- Testing company name
- Testing mode (Black Box, White Box, Grey Box, etc.)
- Start & end dates, duration
- Executive summary

**Revisioner & Approver**
- Name, role, and date for the revisioner
- Name and date for the approver

**Testers**
- Add one or more testers with name, role, and date

**Targets**
- Add each tested target: name, URL, and severity

**Credentials**
- Test accounts used during the engagement: username and description

**Vulnerabilities**
- For each finding:
  - Name, severity, priority
  - CVSS score and vector (built-in CVSS calculator available)
  - Description, impact, remediation
  - OWASP Top 10 category and CWE references
  - Endpoints (HTTP method, path, parameter)
  - Attacks — each attack step can be either **text** or an **image with a caption**
  - Internal notes (not exported to the final document)

> The **AI Enhancement** button (✨) on text fields uses Groq to improve wording. It applies only to the current field and can be reviewed before accepting.

Click **Create Report** to save.

---

### Editing a Report

From the Dashboard, click **Edit** on any card to reopen the full form. All fields are editable. Save with **Update Report**.

---

### Downloading a Report

Click **📥 Download DOCX** on any card. The server will:
1. Load the selected (or default) `.docx` template
2. Inject all report data into the template placeholders
3. Return a ready-to-download Word document

---

### Report Templates

Navigate to **📄 Report Templates** from the sidebar to upload and manage `.docx` templates. One template can be set as the default for all new reports. Templates use the placeholder syntax described below.

---

### Vulnerability Templates

Navigate to **📋 Vulnerability Templates** to manage a reusable library of common findings. When adding vulnerabilities to a report, you can load any saved template to pre-fill the fields.

---

## 📄 Template Placeholder Reference

Templates use `{placeholder}` syntax. Dynamic sections use `{#section}...{/section}` loops.

### Static fields

```
{client_name}
{testing_company_name}
{testing_mode}
{testing_start_date}
{testing_end_date}
{testing_duration}
{executive_summary}

{revisioner_name}
{revisioner_role}
{revisioner_date}

{approver_name}
{approver_date}
```

### Dynamic sections

```
{#testers}
  {name}  {role}  {date}
{/testers}

{#targets}
  {name}  {url}  {severity}
{/targets}

{#credentials}
  {username}  {description}
{/credentials}

{#vulnerabilities}
  {name}  {severity}  {priority}
  {cvss_score}  {cvss_vector}
  {description}  {impact}  {remediation}

  {#endpoints}
    {index}  {http_method}  {path}  {parameter}
  {/endpoints}

  {#attacks}
    {#if type=='text'}  {text}  {/if}
    {#if type=='image'} {image} {caption} {/if}
  {/attacks}
{/vulnerabilities}
```

---

## 📁 Project Structure

```
pentest-app/
├── server/
│   ├── models/
│   │   ├── User.js                   # User schema (auth, email verification)
│   │   ├── Report.js                 # Report schema (full data model)
│   │   ├── Template.js               # Report template schema
│   │   └── VulnerabilityTemplate.js  # Reusable vulnerability library
│   ├── routes/
│   │   ├── auth.js                   # Register, login, verify, reset, settings
│   │   ├── reports.js                # CRUD + DOCX generation
│   │   ├── templates.js              # Report template upload/manage
│   │   ├── vulnerability-templates.js
│   │   └── ai.js                     # AI text enhancement (Groq)
│   ├── middleware/
│   │   └── auth.js                   # JWT protect middleware
│   └── server.js
├── client/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.js          # Report list + filters + status
│       │   ├── CreateReport.js       # New report form
│       │   ├── EditReport.js         # Edit existing report
│       │   ├── Templates.js          # Report template manager
│       │   ├── Settings.js           # Password & email change
│       │   ├── Login.js / Register.js
│       │   ├── ForgotPassword.js / ResetPassword.js
│       │   ├── VerifyEmail.js / VerifyEmailChange.js
│       │   └── ResendVerification.js
│       ├── components/
│       │   ├── ReportFormSections.js # All form section components
│       │   ├── CVSSCalculator.js     # CVSS v3 scoring tool
│       │   ├── TemplateSelector.js   # Template picker in report form
│       │   ├── TemplateManager.js    # Vuln template library UI
│       │   └── Copyright.js
│       ├── context/
│       │   └── AuthContext.js        # Global auth state
│       ├── hooks/
│       │   └── useReportForm.js      # Shared form state logic
│       └── App.js
├── guides/
│   ├── doc_tags.md                   # Template placeholder reference
│   └── app_run_guide.md
├── uploads/                          # Uploaded images (attack screenshots)
├── templates/                        # Stored .docx templates
├── .env                              # ⚠️ Local only — never commit
├── .gitignore
├── package.json
└── README.md
```

---

## 🌐 API Endpoints

All protected routes require a `Bearer <token>` Authorization header.

### Auth — `/api/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/register` | Create account |
| GET | `/verify-email` | Verify email via token |
| POST | `/resend-verification` | Resend verification email |
| POST | `/login` | Login, returns JWT |
| POST | `/forgot-password` | Send reset email |
| POST | `/reset-password` | Reset password via token |
| GET | `/me` | Get current user 🔒 |
| PUT | `/settings/password` | Change password 🔒 |
| PUT | `/settings/email` | Request email change 🔒 |
| GET | `/verify-email-change` | Confirm new email via token |

### Reports — `/api/reports` 🔒
| Method | Path | Description |
|---|---|---|
| GET | `/` | List all user reports |
| GET | `/:id` | Get single report |
| POST | `/` | Create report |
| PUT | `/:id` | Update report (includes status) |
| DELETE | `/:id` | Delete report |
| POST | `/:id/generate` | Generate & download DOCX |

### Templates — `/api/templates` 🔒
| Method | Path | Description |
|---|---|---|
| GET | `/` | List templates |
| GET | `/default` | Get default template |
| POST | `/upload` | Upload `.docx` template |
| DELETE | `/:id` | Delete template |

### AI — `/api/ai` 🔒
| Method | Path | Description |
|---|---|---|
| POST | `/enhance-text` | Enhance a text field with AI |
| POST | `/preview-mask` | Preview text masking |
| GET | `/models` | List available AI models |

---

## 🔐 Security Notes

- Never commit `.env` to version control — it is listed in `.gitignore`
- Use a strong, unique `JWT_SECRET` in production (64+ random bytes)
- Enable MongoDB authentication in production environments
- Serve the application over HTTPS in production
- Passwords are hashed with bcrypt before storage
- All protected routes validate the JWT on every request

---

## 🛠️ Troubleshooting

**MongoDB won't connect**
```bash
sudo systemctl status mongod
sudo systemctl start mongod
# Docker:
docker ps && docker start mongodb
```

**Port 5000 already in use**
```bash
lsof -i :5000   # find the process
# or change PORT in .env
```

**Module not found / dependency errors**
```bash
rm -rf node_modules client/node_modules
npm run install-all
```

**Template not found on DOCX generation**  
Upload a `.docx` template via the **Report Templates** page and set it as default, or ensure a file exists in the `templates/` folder.

**Emails not arriving**  
Check that `RESEND_API_KEY` or `GMAIL_USER` + `GMAIL_APP_PASSWORD` are correctly set in `.env`. For Gmail, use an [App Password](https://myaccount.google.com/apppasswords), not your regular password.

**JWT errors / logged out unexpectedly**  
Ensure `JWT_SECRET` is set in `.env`. If you changed it, existing tokens are invalidated — log in again.

---

## 🚢 Production Deployment

```bash
# 1. Build the React frontend
npm run build

# 2. Set environment
export NODE_ENV=production

# 3. Run with PM2
npm install -g pm2
pm2 start server/server.js --name report-generator
pm2 save && pm2 startup

# 4. Reverse proxy with Nginx → point to port 5000

# 5. SSL with Let's Encrypt
sudo certbot --nginx -d yourdomain.com
```

---

## ✅ Feature Overview

- User registration, login, email verification, password reset
- Full CRUD for penetration testing reports
- Report status tracking: **Editing** / **Finished**
- Rich vulnerability model: CVSS, OWASP, CWE, endpoints, attack steps (text + images)
- AI-assisted text enhancement per field (Groq)
- Built-in CVSS v3 calculator
- Reusable vulnerability template library
- Custom `.docx` report template support with dynamic placeholders
- Dashboard filters: status, client, tester, date range
- DOCX generation and download
- Settings: password change, email change with verification
