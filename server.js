const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

const app = express();
const HTTP_PORT = 80;
const HTTPS_PORT = 443;

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Middleware to parse JSON
app.use(express.json());

// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (req.header('host') !== 'localhost' && req.header('host') !== '127.0.0.1' && req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

// Webhook endpoint for GitHub
app.post('/webhook', (req, res) => {
  console.log('Received webhook');
  const payload = req.body;

  // Check if it's a push to main branch
  if (payload.ref === 'refs/heads/main') {
    console.log('Push to main branch detected, pulling changes...');
    exec('git pull', { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error pulling: ${error}`);
        return res.status(500).send('Pull failed');
      }
      console.log(`Pull successful: ${stdout}`);
      res.status(200).send('OK');
    });
  } else {
    res.status(200).send('Not a push to main');
  }
});

// Start HTTP server (for redirect)
http.createServer(app).listen(HTTP_PORT, () => {
  console.log(`HTTP Server running on port ${HTTP_PORT}, redirecting to HTTPS`);
});

// Start HTTPS server if certs exist
const certPath = 'C:\\Certbot\\live\\owenfillmore.com\\';
if (fs.existsSync(certPath + 'privkey.pem') && fs.existsSync(certPath + 'fullchain.pem')) {
  const options = {
    key: fs.readFileSync(certPath + 'privkey.pem'),
    cert: fs.readFileSync(certPath + 'fullchain.pem')
  };
  https.createServer(options, app).listen(HTTPS_PORT, () => {
    console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
  });
} else {
  console.log('SSL certificates not found, running HTTP only');
}