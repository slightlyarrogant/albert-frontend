# CFI Chatbot Frontend

This repository contains the frontend code for the CFI Chatbot, an AI-powered assistant for Vendo ERP users.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Running the App](#running-the-app)
- [Building for Production](#building-for-production)
- [Setting Up Reverse Proxy](#setting-up-reverse-proxy)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14.0.0 or later)
- npm (v6.0.0 or later)
- Git

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-org/cfi-chatbot-frontend.git
   cd cfi-chatbot-frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

## Environment Setup

1. Create a `.env` file in the root directory:
   ```
   cp .env.example .env
   ```

2. Open the `.env` file and fill in the necessary environment variables:
   ```
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   REACT_APP_WEBHOOK_URL=your_n8n_webhook_url
   ```

## Running the App

To start the development server:

```
npm start
```

The app will be available at `http://localhost:3000`.

## Building for Production

To create a production build:

```
npm run build
```

The built files will be in the `build` directory.

## Setting Up Reverse Proxy

To set up a reverse proxy for the frontend (using Nginx as an example):

1. Install Nginx if not already installed.

2. Create a new Nginx configuration file:
   ```
   sudo nano /etc/nginx/sites-available/cfi-chatbot
   ```

3. Add the following configuration (adjust as needed):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       location /api {
           proxy_pass http://your-backend-url;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. Enable the site and restart Nginx:
   ```
   sudo ln -s /etc/nginx/sites-available/cfi-chatbot /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

5. Set up SSL with Let's Encrypt (recommended):
   ```
   sudo certbot --nginx -d your-domain.com
   ```

## Project Structure

```
cfi-chatbot-frontend/
├── public/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── styles/
│   ├── utils/
│   ├── App.js
│   └── index.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request

## Troubleshooting

- If you encounter CORS issues, ensure your backend is properly configured to allow requests from the frontend origin.
- For Supabase authentication problems, double-check your Supabase URL and anon key in the `.env` file.
- If the webhook is not responding, verify the webhook URL and ensure the n8n workflow is active.

For more detailed troubleshooting, refer to the [Troubleshooting Guide](link-to-troubleshooting-guide).
