const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const { Permit } = require('permitio');

// Load environment variables
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize Permit.io SDK
const permit = new Permit({
  pdp: process.env.PERMIT_PDP_URL,
  token: process.env.PERMIT_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Mock users database for demo purposes
const users = {
  'vehicle-owner-1': {
    id: 'vehicle-owner-1',
    username: 'newuser',
    password: '2025DEVChallenge', // In a real app, this would be hashed
    firstName: 'John',
    lastName: 'Doe',
    roles: ['vehicle_owner'],
    tenantId: 'personal-vehicles',
    vehicles: ['VIN123456789', 'VIN987654321']
  },
  'service-tech-1': {
    id: 'service-tech-1',
    username: 'alicesmith',
    password: 'techpass456',
    firstName: 'Alice',
    lastName: 'Smith',
    roles: ['service_technician'],
    tenantId: 'acme-auto-service',
    serviceRegions: ['northeast', 'midwest']
  },
  'fleet-mgr-1': {
    id: 'fleet-mgr-1',
    username: 'robertjohnson',
    password: 'fleetmgr789',
    firstName: 'Robert',
    lastName: 'Johnson',
    roles: ['fleet_manager'],
    tenantId: 'swift-delivery',
    managedFleets: ['delivery-fleet-east', 'delivery-fleet-west']
  },
  'insurance-agent-1': {
    id: 'insurance-agent-1',
    username: 'sarahbrown',
    password: 'insure987',
    firstName: 'Sarah',
    lastName: 'Brown',
    roles: ['insurance_provider'],
    tenantId: 'safe-auto-insurance',
    coverageRegions: ['northeast', 'southeast']
  },
  'admin-1': {
    id: 'admin-1',
    username: 'admin',
    password: '2025DEVChallenge',
    firstName: 'Admin',
    lastName: 'User',
    roles: ['system_administrator'],
    tenantId: 'automotive-platform'
  }
};

// Login endpoint
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;

  // Find user by username
  const user = Object.values(users).find(u => u.username === username);
  
  // Check if user exists and password matches
  if (!user || user.password !== password) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Synchronize user with Permit.io if needed
  try {
    await syncUserWithPermit(user);
  } catch (error) {
    console.error('Error syncing user with Permit.io:', error);
    // Continue with login even if sync fails
  }

  // Create JWT token
  const token = jwt.sign(
    { 
      sub: user.id,
      username: user.username,
      roles: user.roles,
      tenant_id: user.tenantId,
      firstName: user.firstName,
      lastName: user.lastName
    },
    process.env.AUTH_SECRET,
    { 
      expiresIn: '1h',
      issuer: process.env.AUTH_ISSUER,
      audience: process.env.AUTH_AUDIENCE
    }
  );

  // Return token and user info
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      tenantId: user.tenantId
    }
  });
});

// User profile endpoint
app.get('/auth/profile', authenticateToken, (req, res) => {
  // Get user ID from the JWT token
  const userId = req.user.sub;
  
  // Find user by ID
  const user = users[userId];
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Return user info without sensitive data
  res.json({
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles,
    tenantId: user.tenantId
  });
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Missing authentication token' });
  }

  jwt.verify(token, process.env.AUTH_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  });
}

// Function to sync user with Permit.io
async function syncUserWithPermit(user) {
  try {
    // Check if the user already exists in Permit.io
    try {
      await permit.api.users.get(user.id);
      console.log(`User ${user.id} already exists in Permit.io`);
    } catch (error) {
      if (error.status === 404) {
        // User doesn't exist, create them
        await permit.api.users.create({
          key: user.id,
          email: `${user.username}@example.com`,
          first_name: user.firstName,
          last_name: user.lastName,
          roles: user.roles.map(role => ({
            role: role,
            tenant: user.tenantId
          }))
        });
        console.log(`Created user ${user.id} in Permit.io`);
      } else {
        throw error;
      }
    }

    // Ensure user has the correct roles in Permit.io
    for (const role of user.roles) {
      try {
        await permit.api.roles.assignRole({
          tenant: user.tenantId,
          user: user.id,
          role: role
        });
        console.log(`Assigned role ${role} to user ${user.id} in tenant ${user.tenantId}`);
      } catch (error) {
        console.error(`Error assigning role ${role} to user ${user.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error syncing with Permit.io:', error);
    throw error;
  }
}

// Start the server
app.listen(port, () => {
  console.log(`Auth service listening at http://localhost:${port}`);
});