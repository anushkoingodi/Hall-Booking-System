
# HallSync – Hall Booking System

A web-based Hall Booking System designed to simplify the process of viewing, requesting and managing hall reservations within a college campus.

## About the Project

HallSync is a centralized hall booking platform that helps college students and faculty manage hall reservations efficiently. It provides a simple and user-friendly interface for requesting halls and managing booking activities.

The system aims to reduce manual booking procedures, avoid scheduling conflicts and improve communication between users and administrators.

## Features

- **User Registration:** Register using official college email addresses.
- **Email Validation:** Restrict registration to approved college email domains.
- **Hall Booking:** Submit requests for available halls.
- **Booking Management:** View and manage booking requests.
- **Admin Dashboard:** Manage halls and booking activities.
- **Responsive Design:** Accessible across desktop, tablet and mobile devices.

## Technology Stack

**Frontend**
- HTML, CSS and JavaScript
- Responsive UI

**Backend**
- Node.js
- Express.js

**Database**
- MongoDB

**Deployment**
- Vercel

## Project Structure

```text
HallSync/
│
├── frontend/
│   └── Frontend application files
│
├── server.js
├── package.json
├── package-lock.json
├── vercel.json
├── .gitignore
└── README.md
```

## Installation and Setup

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

### 2. Navigate to the project directory

```bash
cd HallSync
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file in the project root and configure the required credentials.

Example:

```env
MONGODB_URI=your_mongodb_connection_string
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your_verified_sender_email
```

Add any other environment variables required by your existing application.

Never upload `.env` files or secret credentials to GitHub.

### 5. Run the application

Use the development command configured in your `package.json`.

For example:

```bash
npm start
```

## Security

- Sensitive credentials are stored in environment variables.
- College email domain validation is applied to registration.
- Authentication endpoints should validate requests on the backend.
- API keys and database credentials must not be exposed publicly.

## Future Enhancements

- Advanced booking calendar.
- Real-time booking status updates.
- Automated email notifications.
- Improved hall availability management.
- Booking history and reports.
- Enhanced administrative controls.

## Project Purpose

HallSync aims to make college hall reservation management more organized, transparent and accessible through a centralized digital platform.

---

**HallSync – Simplifying Campus Hall Reservations.**