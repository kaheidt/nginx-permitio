/**
 * Permit.io Setup Script
 * 
 * This script creates all necessary resources, roles, and permissions in Permit.io
 * for the AutoSecure API Gateway demo.
 * 
 * It can accept parameters from either command line arguments or environment variables.
 */
require('dotenv').config({ path: '../.env' });
const { Permit } = require('permitio');

// Parse command line arguments
const args = parseCommandLineArgs();

// Initialize the Permit SDK with API key from command line args or environment variables
const permit = new Permit({
  token: args.apiKey || process.env.PERMIT_API_KEY,
  pdp: args.pdpUrl || process.env.PERMIT_PDP_URL || 'https://cloudpdp.api.permit.io',
  environment: args.environment || process.env.PERMIT_ENVIRONMENT || 'dev',
});

// Helper function to parse command line arguments
function parseCommandLineArgs() {
  const args = {};
  const argv = process.argv.slice(2); // Remove 'node' and script name
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    
    if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-./g, x => x[1].toUpperCase()); // Convert kebab-case to camelCase
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
      
      args[key] = value;
      
      if (value !== true) {
        i++; // Skip the next argument as it's the value
      }
    }
  }
  
  return args;
}

// Helper function to log steps
const log = (message) => {
  if (!args.quiet) {
    console.log(`\x1b[34m[Permit Setup]\x1b[0m ${message}`);
  }
};

// Helper function for verbose logging
const verbose = (message) => {
  if (args.verbose) {
    console.log(`\x1b[36m[Verbose]\x1b[0m ${message}`);
  }
};

// Helper function to handle errors
const handleError = (error, step) => {
  if (error.status === 409) {
    console.log(`\x1b[33m[Warning]\x1b[0m ${step} already exists, continuing...`);
  } else {
    console.error(`\x1b[31m[Error]\x1b[0m ${step} failed:`, error.message);
    if (error.data && args.verbose) console.error(error.data);
  }
};

/**
 * Display help information
 */
function displayHelp() {
  console.log(`
\x1b[1mPermit.io Setup Script\x1b[0m

This script creates all necessary resources, roles, and permissions in Permit.io
for the AutoSecure API Gateway demo.

\x1b[1mUsage:\x1b[0m
  node setup.js [options]

\x1b[1mOptions:\x1b[0m
  --api-key <key>      Permit.io API key (falls back to PERMIT_API_KEY env var)
  --pdp-url <url>      Permit.io PDP URL (falls back to PERMIT_PDP_URL env var)
  --environment <env>  Permit.io environment (falls back to PERMIT_ENVIRONMENT env var)
  --verbose            Enable verbose logging
  --quiet              Suppress all non-error output
  --skip-resources     Skip creating resources
  --skip-roles         Skip creating roles
  --skip-permissions   Skip creating permissions
  --skip-tenants       Skip creating tenants
  --skip-users         Skip creating example users
  --help               Display this help message

\x1b[1mExamples:\x1b[0m
  node setup.js --api-key abc123 --environment prod
  node setup.js --skip-users --verbose
  `);
  process.exit(0);
}

// Check if help is requested
if (args.help) {
  displayHelp();
}

// Validate required parameters
if (!args.apiKey && !process.env.PERMIT_API_KEY) {
  console.error('\x1b[31m[Error]\x1b[0m Permit.io API key is required. Provide it via --api-key argument or PERMIT_API_KEY environment variable.');
  displayHelp();
}

/**
 * Main setup function
 */
async function setup() {
  log('Starting Permit.io setup...');
  verbose(`Using PDP URL: ${permit.config.pdp}`);
  verbose(`Using environment: ${permit.config.environment}`);

  try {
    // Step 1: Set up resource types with attributes
    if (!args.skipResources) {
      await setupResources();
    } else {
      log('Skipping resources setup...');
    }
    
    // Step 2: Create roles
    if (!args.skipRoles) {
      await setupRoles();
    } else {
      log('Skipping roles setup...');
    }
    
    // Step 3: Create permission policies for roles
    if (!args.skipPermissions) {
      await setupPermissions();
    } else {
      log('Skipping permissions setup...');
    }
    
    // Step 4: Create tenants for multi-tenancy
    if (!args.skipTenants) {
      await setupTenants();
    } else {
      log('Skipping tenants setup...');
    }
    
    // Step 5: Create example users and assign roles
    if (!args.skipUsers) {
      await setupUsers();
    } else {
      log('Skipping users setup...');
    }

    log('Setup completed successfully!');
    log('You can now use the AutoSecure API Gateway with Permit.io authorization.');

  } catch (error) {
    console.error('\x1b[31m[Setup Failed]\x1b[0m An unexpected error occurred:', error);
    process.exit(1);
  }
}

/**
 * Step 1: Set up resource types
 */
async function setupResources() {
  log('Setting up resource types...');

  // Vehicle resource
  try {
    await permit.api.resources.create({
      key: 'vehicle',
      name: 'Vehicle',
      description: 'Vehicle resource type',
      actions: {
        'read': { name: 'Read' },
        'create': { name: 'Create' },
        'update': { name: 'Update' },
        'delete': { name: 'Delete' }
      },
      attributes: {
        'vin': {
          type: 'string',
          description: 'Vehicle Identification Number'
        },
        'owner_id': {
          type: 'string',
          description: 'ID of the vehicle owner'
        },
        'fleet_id': {
          type: 'string',
          description: 'ID of the fleet this vehicle belongs to',
          required: false
        }
      }
    });
    log('✓ Created vehicle resource');
  } catch (error) {
    handleError(error, 'Vehicle resource creation');
  }

  // Maintenance resource
  try {
    await permit.api.resources.create({
      key: 'maintenance',
      name: 'Maintenance',
      description: 'Maintenance record for vehicles',
      actions: {
        'read': { name: 'Read' },
        'create': { name: 'Create' },
        'update': { name: 'Update' },
        'delete': { name: 'Delete' }
      },
      attributes: {
        'vehicle_vin': {
          type: 'string',
          description: 'VIN of the vehicle being serviced'
        },
        'technician_id': {
          type: 'string', 
          description: 'ID of the technician performing the service'
        }
      }
    });
    log('✓ Created maintenance resource');
  } catch (error) {
    handleError(error, 'Maintenance resource creation');
  }

  // Fleet resource
  try {
    await permit.api.resources.create({
      key: 'fleet',
      name: 'Fleet',
      description: 'Fleet of vehicles',
      actions: {
        'read': { name: 'Read' },
        'create': { name: 'Create' },
        'update': { name: 'Update' },
        'delete': { name: 'Delete' }
      },
      attributes: {
        'manager_id': {
          type: 'string',
          description: 'ID of the fleet manager'
        }
      }
    });
    log('✓ Created fleet resource');
  } catch (error) {
    handleError(error, 'Fleet resource creation');
  }

  // Analytics resource
  try {
    await permit.api.resources.create({
      key: 'analytics',
      name: 'Analytics',
      description: 'Driver behavior analytics',
      actions: {
        'read': { name: 'Read' }
      },
      attributes: {
        'user_id': {
          type: 'string',
          description: 'ID of the user the analytics are about'
        },
        'insurance_agent_id': {
          type: 'string',
          description: 'ID of the insurance agent with access',
          required: false
        }
      }
    });
    log('✓ Created analytics resource');
  } catch (error) {
    handleError(error, 'Analytics resource creation');
  }
}

/**
 * Step 2: Create roles
 */
async function setupRoles() {
  log('Setting up roles...');

  const roles = [
    {
      key: 'vehicle_owner',
      name: 'Vehicle Owner',
      description: 'Owner of one or more vehicles'
    },
    {
      key: 'service_technician',
      name: 'Service Technician',
      description: 'Technician who performs maintenance on vehicles'
    },
    {
      key: 'fleet_manager',
      name: 'Fleet Manager',
      description: 'Manager responsible for a fleet of vehicles'
    },
    {
      key: 'insurance_provider',
      name: 'Insurance Provider',
      description: 'Insurance company agent'
    },
    {
      key: 'system_administrator',
      name: 'System Administrator',
      description: 'Administrator with full access'
    }
  ];

  for (const role of roles) {
    try {
      await permit.api.roles.create(role);
      log(`✓ Created ${role.name} role`);
    } catch (error) {
      handleError(error, `${role.name} role creation`);
    }
  }
}

/**
 * Step 3: Create permission policies
 */
async function setupPermissions() {
  log('Setting up permissions...');

  // Vehicle Owner Permissions
  try {
    // Read own vehicle
    await permit.api.policies.create({
      role: 'vehicle_owner',
      resource: 'vehicle',
      action: 'read',
      condition: {
        rule: {
          operator: "equals",
          left: { resourceAttr: "owner_id" },
          right: { userAttr: "id" }
        }
      }
    });
    log('✓ Created vehicle owner read vehicle permission');

    // Read maintenance records for own vehicles
    await permit.api.policies.create({
      role: 'vehicle_owner',
      resource: 'maintenance',
      action: 'read',
      condition: {
        rule: {
          operator: "in",
          left: { resourceAttr: "vehicle_vin" },
          right: { userAttr: "vehicles" }
        }
      }
    });
    log('✓ Created vehicle owner read maintenance permission');
  } catch (error) {
    handleError(error, 'Vehicle owner permissions setup');
  }

  // Service Technician Permissions
  try {
    // Read any vehicle
    await permit.api.policies.create({
      role: 'service_technician',
      resource: 'vehicle',
      action: 'read'
    });
    log('✓ Created service technician read vehicle permission');

    // Read maintenance records created by themselves
    await permit.api.policies.create({
      role: 'service_technician',
      resource: 'maintenance',
      action: 'read',
      condition: {
        rule: {
          operator: "equals",
          left: { resourceAttr: "technician_id" },
          right: { userAttr: "id" }
        }
      }
    });
    log('✓ Created service technician read maintenance permission');

    // Create maintenance records
    await permit.api.policies.create({
      role: 'service_technician',
      resource: 'maintenance',
      action: 'create'
    });
    log('✓ Created service technician create maintenance permission');

    // Update maintenance records created by themselves
    await permit.api.policies.create({
      role: 'service_technician',
      resource: 'maintenance',
      action: 'update',
      condition: {
        rule: {
          operator: "equals",
          left: { resourceAttr: "technician_id" },
          right: { userAttr: "id" }
        }
      }
    });
    log('✓ Created service technician update maintenance permission');
  } catch (error) {
    handleError(error, 'Service technician permissions setup');
  }

  // Fleet Manager Permissions
  try {
    // Read fleets managed by them
    await permit.api.policies.create({
      role: 'fleet_manager',
      resource: 'fleet',
      action: 'read',
      condition: {
        rule: {
          operator: "equals",
          left: { resourceAttr: "manager_id" },
          right: { userAttr: "id" }
        }
      }
    });
    log('✓ Created fleet manager read fleet permission');

    // Update fleets managed by them
    await permit.api.policies.create({
      role: 'fleet_manager',
      resource: 'fleet',
      action: 'update',
      condition: {
        rule: {
          operator: "equals",
          left: { resourceAttr: "manager_id" },
          right: { userAttr: "id" }
        }
      }
    });
    log('✓ Created fleet manager update fleet permission');

    // Read vehicles in fleets managed by them
    await permit.api.policies.create({
      role: 'fleet_manager',
      resource: 'vehicle',
      action: 'read',
      condition: {
        rule: {
          operator: "in",
          left: { resourceAttr: "fleet_id" },
          right: { userAttr: "managed_fleets" }
        }
      }
    });
    log('✓ Created fleet manager read vehicle permission');
  } catch (error) {
    handleError(error, 'Fleet manager permissions setup');
  }

  // Insurance Provider Permissions
  try {
    // Read analytics for their clients
    await permit.api.policies.create({
      role: 'insurance_provider',
      resource: 'analytics',
      action: 'read',
      condition: {
        rule: {
          operator: "equals",
          left: { resourceAttr: "insurance_agent_id" },
          right: { userAttr: "id" }
        }
      }
    });
    log('✓ Created insurance provider read analytics permission');
  } catch (error) {
    handleError(error, 'Insurance provider permissions setup');
  }

  // System Administrator Permissions
  try {
    // Full access to all resources
    const resources = ['vehicle', 'maintenance', 'fleet', 'analytics'];
    
    for (const resource of resources) {
      await permit.api.policies.create({
        role: 'system_administrator',
        resource: resource,
        action: '*'
      });
      log(`✓ Created administrator full access permission for ${resource}`);
    }
  } catch (error) {
    handleError(error, 'System administrator permissions setup');
  }
}

/**
 * Step 4: Create tenants for multi-tenancy
 */
async function setupTenants() {
  log('Setting up tenants...');

  const tenants = [
    {
      key: 'personal-vehicles',
      name: 'Personal Vehicles',
      description: 'Tenant for individual vehicle owners'
    },
    {
      key: 'acme-auto-service',
      name: 'Acme Auto Service',
      description: 'Tenant for service centers'
    },
    {
      key: 'swift-delivery',
      name: 'Swift Delivery',
      description: 'Tenant for fleet operators'
    },
    {
      key: 'safe-auto-insurance',
      name: 'Safe Auto Insurance',
      description: 'Tenant for insurance providers'
    }
  ];

  for (const tenant of tenants) {
    try {
      await permit.api.tenants.create(tenant);
      log(`✓ Created ${tenant.name} tenant`);
    } catch (error) {
      handleError(error, `${tenant.name} tenant creation`);
    }
  }
}

/**
 * Step 5: Create example users and assign roles
 */
async function setupUsers() {
  log('Setting up example users...');

  // Create admin user
  try {
    const adminUser = {
      key: 'admin',
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      attributes: {
        id: 'admin',
      }
    };

    await permit.api.users.create(adminUser);
    log('✓ Created admin user');

    // Assign admin role in each tenant
    const tenants = ['personal-vehicles', 'acme-auto-service', 'swift-delivery', 'safe-auto-insurance'];
    
    for (const tenant of tenants) {
      await permit.api.users.assignRole({
        user: 'admin',
        role: 'system_administrator',
        tenant: tenant
      });
      log(`✓ Assigned admin user to system_administrator role in ${tenant}`);
    }
  } catch (error) {
    handleError(error, 'Admin user setup');
  }

  // Create a regular user (vehicle owner)
  try {
    const newUser = {
      key: 'vehicle-owner-1',
      email: 'newuser@example.com',
      first_name: 'New',
      last_name: 'User',
      attributes: {
        id: 'vehicle-owner-1',
        vehicles: ['VIN123456789', 'VIN987654321']
      }
    };

    await permit.api.users.create(newUser);
    log('✓ Created new user');

    // Assign vehicle owner role
    await permit.api.users.assignRole({
      user: 'newuser',
      role: 'vehicle_owner',
      tenant: 'personal-vehicles'
    });
    log('✓ Assigned new user to vehicle_owner role');
  } catch (error) {
    handleError(error, 'New user setup');
  }
  
  // Create a second vehicle owner
  try {
    const secondVehicleOwner = {
      key: 'vehicle-owner-2',
      email: 'vehicleowner2@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      attributes: {
        id: 'vehicle-owner-2',
        vehicles: ['VIN555666777']
      }
    };

    await permit.api.users.create(secondVehicleOwner);
    log('✓ Created second vehicle owner user');

    // Assign vehicle owner role
    await permit.api.users.assignRole({
      user: 'vehicle-owner-2',
      role: 'vehicle_owner',
      tenant: 'personal-vehicles'
    });
    log('✓ Assigned second vehicle owner to vehicle_owner role');
  } catch (error) {
    handleError(error, 'Second vehicle owner user setup');
  }

  // Create a service technician
  try {
    const techUser = {
      key: 'tech1',
      email: 'tech1@example.com',
      first_name: 'Tech',
      last_name: 'User',
      attributes: {
        id: 'tech1'
      }
    };

    await permit.api.users.create(techUser);
    log('✓ Created technician user');

    // Assign service technician role
    await permit.api.users.assignRole({
      user: 'tech1',
      role: 'service_technician',
      tenant: 'acme-auto-service'
    });
    log('✓ Assigned technician user to service_technician role');
  } catch (error) {
    handleError(error, 'Technician user setup');
  }

  // Create a fleet manager
  try {
    const fleetUser = {
      key: 'fleet1',
      email: 'fleet1@example.com',
      first_name: 'Fleet',
      last_name: 'Manager',
      attributes: {
        id: 'fleet1',
        managed_fleets: ['fleet-001', 'fleet-002']
      }
    };

    await permit.api.users.create(fleetUser);
    log('✓ Created fleet manager user');

    // Assign fleet manager role
    await permit.api.users.assignRole({
      user: 'fleet1',
      role: 'fleet_manager',
      tenant: 'swift-delivery'
    });
    log('✓ Assigned fleet manager user to fleet_manager role');
  } catch (error) {
    handleError(error, 'Fleet manager user setup');
  }

  // Create an insurance provider
  try {
    const insuranceUser = {
      key: 'insurance1',
      email: 'insurance1@example.com',
      first_name: 'Insurance',
      last_name: 'Agent',
      attributes: {
        id: 'insurance1'
      }
    };

    await permit.api.users.create(insuranceUser);
    log('✓ Created insurance provider user');

    // Assign insurance provider role
    await permit.api.users.assignRole({
      user: 'insurance1',
      role: 'insurance_provider',
      tenant: 'safe-auto-insurance'
    });
    log('✓ Assigned insurance agent user to insurance_provider role');
  } catch (error) {
    handleError(error, 'Insurance provider user setup');
  }
}

// Run the setup
setup()
  .then(() => {
    console.log('\n\x1b[32m✓ Setup completed successfully!\x1b[0m');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n\x1b[31m✗ Setup failed!\x1b[0m', error);
    process.exit(1);
  });