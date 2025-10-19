const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const tls = require('tls');

const app = express();
const HTTP_PORT = 8080;
const HTTPS_PORT = 8443;

// Middleware to serve static files based on hostname
app.use((req, res, next) => {
  let staticPath;
  if (req.hostname === 'susanlangone.com') {
    staticPath = path.join(__dirname, '..', 'SusanLangone');
  } else {
    staticPath = __dirname;
  }
  express.static(staticPath)(req, res, next);
});

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

// Webhook endpoint for Owen
app.post('/webhook-owen', (req, res) => {
  console.log('Received webhook for Owen');
  const payload = req.body;

  // Check if it's a push to main branch
  if (payload.ref === 'refs/heads/main') {
    console.log('Push to main branch detected, pulling changes for Owen...');
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

// Webhook endpoint for Susan
app.post('/webhook-susan', (req, res) => {
  console.log('Received webhook for Susan');
  const payload = req.body;

  // Check if it's a push to main branch
  if (payload.ref === 'refs/heads/main') {
    console.log('Push to main branch detected, pulling changes for Susan...');
    exec('git pull', { cwd: path.join(__dirname, '..', 'SusanLangone') }, (error, stdout, stderr) => {
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
const owenCertPath = 'C:\\Certbot\\live\\owenfillmore.com\\';
const susanCertPath = 'C:\\Certbot\\live\\susanlangone.com\\';
if (fs.existsSync(owenCertPath + 'privkey.pem') && fs.existsSync(owenCertPath + 'fullchain.pem')) {
  const options = {
    SNICallback: (domain, cb) => {
      let certPath;
      if (domain === 'susanlangone.com') {
        certPath = susanCertPath;
      } else {
        certPath = owenCertPath;
      }
      if (fs.existsSync(certPath + 'privkey.pem') && fs.existsSync(certPath + 'fullchain.pem')) {
        cb(null, tls.createSecureContext({
          key: fs.readFileSync(certPath + 'privkey.pem'),
          cert: fs.readFileSync(certPath + 'fullchain.pem')
        }));
      } else {
        cb(new Error('Cert not found for ' + domain));
      }
    }
  };
  https.createServer(options, app).listen(HTTPS_PORT, () => {
    console.log(`HTTPS Server running on port ${HTTPS_PORT} with SNI`);
  });
} else {
  console.log('SSL certificates not found for Owen, running HTTP only');
}