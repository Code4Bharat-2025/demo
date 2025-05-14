# BrainyBuds 

An exciting personalised learning adventure experience to embark upon journey of knowledge discovery to create fun and interactive quizzes based on child's unique interest and learning style

## Presentation reference 
- **link**: https://github.com/mandanaarti/team16_apibot/blob/develop/Team_16-Brainy_Buds_Presentation.pptx
## Demo
 - **link**: https://github.com/mandanaarti/team16_apibot/blob/develop/video1474455442.mp4

# Chat Bot API

A Node.js backend service for handling chatbot interactions using SwiftChat's bot platform, with Redis and PostgreSQL integration.

## ⚙️ Local Setup Instructions

Follow these steps to set up the repository on your local machine:

### 1. Install Required Services
- **Redis**: Download and install Redis from https://redis.io/download
- **PostgreSQL**: Download and install PostgreSQL from https://www.postgresql.org/download/

### 2. Setup SwiftChat Bot Credentials
You will need the following details from your SwiftChat bot configuration:
- Bot ID
- API Key
- API URL

These values will be used to configure your environment.

### 3. Create Environment Configuration
1. Review the file `template.env`.
2. Create a `.env` file in the root directory with the following structure:

```env
BOT_UUID=<bot_id>
KLUSTER_API_URL=https://put-url-here/api
KLUSTER_API_TOKEN=<token>

# Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# PostgreSQL configuration
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=yourpassword
PG_DATABASE=chat_bot_db

# Application
PORT=3000
```

### 4. Install Dependencies
Run the following command to install all Node.js dependencies:

```bash
npm install
```

### 5. Seed the Database
Ensure PostgreSQL and Redis services are running. Then seed the database:

```bash
npm run seed
```

This will create the necessary tables and populate them with dummy data.

## ✅ Setup Complete

## 📹 Demo Video

[▶️ Watch the demo](https://drive.google.com/file/d/1629PmJgL7xZj0qyiAROf3BTUFredwbYW/view?usp=sharing)

## Swiftchat postman

[📋 View Postman Documentation](https://documenter.getpostman.com/view/20587790/UyrGCuhH#ecd8fd49-96ab-4ff4-8216-57539e20f742)

## 🚀 Running the Application

### Development Mode
To start the app with live-reloading:

```bash
npm run dev
```

### Production Mode
To start the app in production:

```bash
npm start
```

### Entry Point
The main entry file for the application is: `app.js`

## 🔄 Testing the App Locally
Once the app is running on the desired port:

- Use the SwiftChat Bot API to send test messages to the backend.

During local testing:
- The bot will send messages to the SwiftChat frontend.
- Messages from frontend → backend will not work directly.

To simulate this flow locally, use Postman or any other API testing tool along with the shared Postman collection.

## 🌐 Connecting Frontend and Backend via Localhost (NGROK)

⚠️ **Disclaimer**: NGROK's free plan has a limited number of requests and may become unreliable after exceeding those limits.

### Steps:
1. Download NGROK from: https://ngrok.com/download

2. Start your local backend server:
```bash
npm run dev
```

3. Open an NGROK tunnel by running:
```bash
ngrok http <PORT>
```
(Replace `<PORT>` with the port your backend is running on.)

4. Open the NGROK inspector to view logs and details:
```bash
http://localhost:4040/inspect/http
```

5. Copy the public NGROK URL (e.g., https://xyz.ngrok.io).

6. Using the SwiftChat Platform API:
   - Call the get-webhook-url endpoint to check the current webhook.
   - Use the update-webhook-url endpoint to update it to the NGROK URL.

Now your frontend is connected to your backend running locally via NGROK. You can interact with buttons and send messages directly from SwiftChat frontend to your Node.js backend.
