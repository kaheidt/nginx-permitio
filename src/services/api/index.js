const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');

// Load environment variables
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const serviceName = process.env.SERVICE_NAME || 'api-service';

// Mock data for different services
const mockData = {
  'vehicle-telemetry': {
    vehicleData: {
      'VIN123456789': {
        vin: 'VIN123456789',
        make: 'Tesla',
        model: 'Model 3',
        year: 2023,
        owner: 'vehicle-owner-1',
        telemetry: {
          odometer: 12345,
          batteryLevel: 78,
          tirePressure: [34, 35, 34, 36],
          engineHealth: 'good',
          lastUpdated: '2025-04-30T10:15:30Z',
          location: {
            latitude: 37.7749,
            longitude: -122.4194
          }
        }
      },
      'VIN987654321': {
        vin: 'VIN987654321',
        make: 'Ford',
        model: 'F-150 Lightning',
        year: 2024,
        owner: 'vehicle-owner-1',
        telemetry: {
          odometer: 8765,
          batteryLevel: 45,
          tirePressure: [32, 33, 32, 33],
          engineHealth: 'needs-service',
          lastUpdated: '2025-04-29T18:20:15Z',
          location: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        }
      },
      'VIN555666777': {
        vin: 'VIN555666777',
        make: 'Toyota',
        model: 'Prius Prime',
        year: 2025,
        owner: 'vehicle-owner-2',
        telemetry: {
          odometer: 3456,
          batteryLevel: 82,
          tirePressure: [35, 35, 34, 35],
          engineHealth: 'excellent',
          lastUpdated: '2025-04-30T09:45:12Z',
          location: {
            latitude: 34.0522,
            longitude: -118.2437
          }
        }
      }
    }
  },
  'maintenance-service': {
    serviceRecords: {
      'SR-12345': {
        id: 'SR-12345',
        vin: 'VIN123456789',
        date: '2025-03-15',
        type: 'regular-maintenance',
        description: 'Regular 10,000 mile service',
        technician: 'service-tech-1',
        cost: 199.99,
        status: 'completed'
      },
      'SR-12346': {
        id: 'SR-12346',
        vin: 'VIN987654321',
        date: '2025-04-20',
        type: 'repair',
        description: 'Replace faulty battery sensor',
        technician: 'service-tech-1',
        cost: 349.99,
        status: 'scheduled'
      }
    }
  },
  'fleet-management': {
    fleets: {
      'delivery-fleet-east': {
        id: 'delivery-fleet-east',
        name: 'East Coast Delivery Fleet',
        manager: 'fleet-mgr-1',
        vehicles: ['VIN123456789', 'VIN987654321'],
        region: 'northeast',
        metrics: {
          totalVehicles: 25,
          activeVehicles: 22,
          inServiceVehicles: 3,
          averageFuelEfficiency: 28.5,
          totalMileage: 125000
        }
      },
      'delivery-fleet-west': {
        id: 'delivery-fleet-west',
        name: 'West Coast Delivery Fleet',
        manager: 'fleet-mgr-1',
        vehicles: [],
        region: 'west',
        metrics: {
          totalVehicles: 18,
          activeVehicles: 15,
          inServiceVehicles: 3,
          averageFuelEfficiency: 30.2,
          totalMileage: 95000
        }
      }
    }
  },
  'driver-analytics': {
    driverData: {
      'vehicle-owner-1': {
        id: 'vehicle-owner-1',
        safetyScore: 92,
        drivingHabits: {
          averageSpeed: 65,
          hardBrakes: 5,
          rapidAccelerations: 3,
          nightDriving: '10%',
          phoneUsage: '2%'
        },
        mileage: {
          daily: 25,
          weekly: 175,
          monthly: 750
        },
        insurance: {
          provider: 'safe-auto-insurance',
          agent: 'insurance-agent-1',
          premium: 1200,
          discount: '15%'
        }
      }
    }
  }
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: serviceName });
});

// Get service data based on service name
function getServiceData() {
  return mockData[serviceName] || {};
}

// Helper to extract user info from JWT
function extractUserFromToken(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('No authorization header or not a Bearer token');
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.decode(token);
    console.log('Decoded token:', JSON.stringify(decoded));
    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

// API endpoints based on service type
switch (serviceName) {
  case 'vehicle-telemetry':
    // Get all vehicles the user has access to
    app.get('/api/v1/vehicles', (req, res) => {
      const user = extractUserFromToken(req);
      const data = getServiceData();
      
      console.log('Handling /api/v1/vehicles request');
      console.log('Service data available:', Object.keys(data));
      console.log('Vehicle data count:', Object.keys(data.vehicleData || {}).length);
      
      // Filter vehicles based on user role and ownership
      let vehicles = [];
      
      if (user) {
        console.log(`User authenticated as ${user.sub} with roles:`, user.roles);
        
        // Normalize roles for case-insensitive matching
        const userRoles = user.roles.map(role => role.toLowerCase());
        
        if (userRoles.includes('system_administrator') || userRoles.includes('admin')) {
          // Admins see all vehicles
          console.log('User is admin, showing all vehicles');
          vehicles = Object.values(data.vehicleData);
        } else if (userRoles.includes('vehicle_owner')) {
          // Vehicle owners see only their vehicles
          console.log(`Filtering vehicles for owner ${user.sub}`);
          vehicles = Object.values(data.vehicleData).filter(v => v.owner === user.sub);
          console.log(`Found ${vehicles.length} vehicles for owner ${user.sub}`);
        } else if (userRoles.includes('fleet_manager')) {
          // Fleet managers see vehicles in their fleets
          console.log('User is fleet manager');
          vehicles = Object.values(data.vehicleData);
        } else if (userRoles.includes('service_technician')) {
          // Technicians see basic vehicle data
          console.log('User is service technician');
          vehicles = Object.values(data.vehicleData).map(v => ({
            vin: v.vin,
            make: v.make,
            model: v.model,
            year: v.year
          }));
        } else {
          console.log(`Unrecognized roles: ${user.roles.join(', ')}`);
        }
      } else {
        console.log('No user found in request');
      }
      
      res.json({ vehicles });
    });

    // Get specific vehicle data
    app.get('/api/v1/vehicles/:vin', (req, res) => {
      const { vin } = req.params;
      const user = extractUserFromToken(req);
      const data = getServiceData();
      
      const vehicle = data.vehicleData[vin];
      
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      
      // Authorization is handled by the API gateway with Permit.io
      // This is just an additional check
      if (user && (user.roles.includes('system_administrator') || 
                  (user.roles.includes('vehicle_owner') && vehicle.owner === user.sub) ||
                  user.roles.includes('fleet_manager') ||
                  user.roles.includes('service_technician'))) {
        res.json(vehicle);
      } else {
        res.status(403).json({ message: 'Unauthorized access to vehicle data' });
      }
    });
    break;

  case 'maintenance-service':
    // Get all service records
    app.get('/api/v1/maintenance', (req, res) => {
      const user = extractUserFromToken(req);
      const data = getServiceData();
      
      // Filter service records based on user role
      let serviceRecords = [];
      
      if (user) {
        if (user.roles.includes('system_administrator')) {
          // Admins see all service records
          serviceRecords = Object.values(data.serviceRecords);
        } else if (user.roles.includes('service_technician')) {
          // Technicians see records they worked on
          serviceRecords = Object.values(data.serviceRecords)
            .filter(record => record.technician === user.sub);
        } else if (user.roles.includes('vehicle_owner')) {
          // Vehicle owners see records for their vehicles
          const vehicleVins = Object.values(mockData['vehicle-telemetry'].vehicleData)
            .filter(v => v.owner === user.sub)
            .map(v => v.vin);
            
          serviceRecords = Object.values(data.serviceRecords)
            .filter(record => vehicleVins.includes(record.vin));
        }
      }
      
      res.json({ serviceRecords });
    });

    // Get specific service record
    app.get('/api/v1/maintenance/:id', (req, res) => {
      const { id } = req.params;
      const user = extractUserFromToken(req);
      const data = getServiceData();
      
      const record = data.serviceRecords[id];
      
      if (!record) {
        return res.status(404).json({ message: 'Service record not found' });
      }
      
      res.json(record);
    });
    break;

  case 'fleet-management':
    // Get all fleets the user manages
    app.get('/api/v1/fleet', (req, res) => {
      const user = extractUserFromToken(req);
      const data = getServiceData();
      
      // Filter fleets based on user role
      let fleets = [];
      
      if (user) {
        if (user.roles.includes('system_administrator')) {
          // Admins see all fleets
          fleets = Object.values(data.fleets);
        } else if (user.roles.includes('fleet_manager')) {
          // Fleet managers see fleets they manage
          fleets = Object.values(data.fleets)
            .filter(fleet => fleet.manager === user.sub);
        }
      }
      
      res.json({ fleets });
    });

    // Get specific fleet data
    app.get('/api/v1/fleet/:id', (req, res) => {
      const { id } = req.params;
      const user = extractUserFromToken(req);
      const data = getServiceData();
      
      const fleet = data.fleets[id];
      
      if (!fleet) {
        return res.status(404).json({ message: 'Fleet not found' });
      }
      
      res.json(fleet);
    });
    break;

  case 'driver-analytics':
    // Get driver analytics
    app.get('/api/v1/analytics', (req, res) => {
      const user = extractUserFromToken(req);
      const data = getServiceData();
      
      // Filter analytics based on user role
      let driverData = {};
      
      if (user) {
        if (user.roles.includes('system_administrator')) {
          // Admins see all analytics
          driverData = data.driverData;
        } else if (user.roles.includes('insurance_provider')) {
          // Insurance providers see driving habit data for policy holders
          driverData = Object.fromEntries(
            Object.entries(data.driverData)
              .map(([id, data]) => {
                if (data.insurance && data.insurance.agent === user.sub) {
                  return [id, {
                    id,
                    safetyScore: data.safetyScore,
                    drivingHabits: data.drivingHabits
                  }];
                }
                return null;
              })
              .filter(Boolean)
          );
        } else if (user.roles.includes('vehicle_owner')) {
          // Users see their own data only
          if (data.driverData[user.sub]) {
            driverData = {
              [user.sub]: data.driverData[user.sub]
            };
          }
        }
      }
      
      res.json({ driverData });
    });

    // Get specific driver analytics
    app.get('/api/v1/analytics/:id', (req, res) => {
      const { id } = req.params;
      const user = extractUserFromToken(req);
      const data = getServiceData();
      
      const analytics = data.driverData[id];
      
      if (!analytics) {
        return res.status(404).json({ message: 'Driver analytics not found' });
      }
      
      // Check if user is authorized to view this data
      let authorized = false;
      let responseData = analytics;
      
      if (user) {
        if (user.roles.includes('system_administrator')) {
          authorized = true;
        } else if (user.roles.includes('insurance_provider') && 
                  analytics.insurance && 
                  analytics.insurance.agent === user.sub) {
          authorized = true;
          // Limit data for insurance providers
          responseData = {
            id: analytics.id,
            safetyScore: analytics.safetyScore,
            drivingHabits: analytics.drivingHabits
          };
        } else if (user.sub === id) {
          // Users can see their own data
          authorized = true;
        }
      }
      
      if (authorized) {
        res.json(responseData);
      } else {
        res.status(403).json({ message: 'Unauthorized access to analytics data' });
      }
    });
    break;
    
  default:
    app.get('*', (req, res) => {
      res.status(404).json({ message: 'Unknown service type' });
    });
}

// Start the server
app.listen(port, () => {
  console.log(`${serviceName} listening at http://localhost:${port}`);
});