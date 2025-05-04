const express = require('express');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3005;

// Load OpenAPI specification
const openApiSpec = JSON.parse(fs.readFileSync(path.join(__dirname, 'openapi.json'), 'utf8'));

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Create a custom JS file for auto-filling credentials
const customJs = `
window.addEventListener('load', function() {
  // Add click handler for authorize button
  const interval = setInterval(function() {
    const authorizeBtn = document.querySelector('.btn.authorize');
    if (authorizeBtn) {
      clearInterval(interval);
      authorizeBtn.addEventListener('click', function() {
        setTimeout(function() {
          const usernameInput = document.querySelector('input[name="username"]');
          const passwordInput = document.querySelector('input[name="password"]');
          if (usernameInput && passwordInput) {
            usernameInput.value = "newuser";
            passwordInput.value = "2025DEVChallenge";
            console.log("Credentials prefilled");
          }
        }, 500);
      });
    }
  }, 300);
});
`;

// Create custom options for Swagger UI
const options = {
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 3,
    filter: true
  },
  customCss: '.swagger-ui .topbar { display: none } .swagger-ui .info { margin: 30px 0 } .swagger-ui .scheme-container { background-color: #f6f8fa; box-shadow: none; padding: 20px 0;}',
  customSiteTitle: 'AutoSecure API Gateway with Permit.io',
};

// Serve the custom JavaScript to assist with auth prefilling
app.get('/custom-auth.js', (req, res) => {
  res.set('Content-Type', 'application/javascript');
  res.send(customJs);
});

// Explicitly mount Swagger UI at the root path
app.use('/', swaggerUi.serve);
app.get('/', (req, res) => {
  // Generate the HTML with additional script tag for our custom JS
  const html = swaggerUi.generateHTML(openApiSpec, {
    ...options,
    customJs: '/custom-auth.js'
  });
  res.send(html);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'swagger-ui' });
});

// Start the server
app.listen(port, () => {
  console.log(`Swagger UI service listening at http://localhost:${port}`);
});