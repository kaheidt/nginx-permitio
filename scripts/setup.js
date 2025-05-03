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
const fetch = require('node-fetch');

// Parse command line arguments
const args = parseCommandLineArgs();

// Initialize the Permit SDK with API key from command line args or environment variables
const permit = new Permit({
  // @ts-ignore
  token: args.apiKey || process.env.PERMIT_API_KEY,
  // @ts-ignore
  pdp: args.pdpUrl || process.env.PERMIT_PDP_URL || 'https://cloudpdp.api.permit.io',
  // @ts-ignore
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
/**
 * Handles API errors gracefully
 * @param {import('permitio').PermitError} error - The error object from Permit.io API
 * @param {string} step - The current operation that failed
 */
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
 * Step 0: Set up user attributes for the environment
 */
async function setupUserAttributes() {
  log('Setting up user attributes...');

  try {
    // Define the user attributes we want to create
    const userAttributes = [
      {
        key: 'vehicles',
        type: 'array',
        description: 'VINs of vehicles owned by the user'
      },
      {
        key: 'vin_requested',
        type: 'string',
        description: 'VIN of the vehicle being accessed'
      }
    ];

    // Get the API key and environment
    const apiKey = args.apiKey || process.env.PERMIT_API_KEY;
    const environment = args.environment || process.env.PERMIT_ENVIRONMENT || 'dev';
    const project = args.project || process.env.PERMIT_PROJECT || 'nginx';

    // Create or update each user attribute using direct API calls
    for (const attr of userAttributes) {
      try {
        // Make a direct API call to create the attribute
        const createResponse = await fetch(`https://api.permit.io/v2/schema/${project}/${environment}/users/attributes`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(attr)
        });

        if (createResponse.ok) {
          log(`✓ Created user attribute: ${attr.key} (${attr.type})`);
        } else {
          const createData = await createResponse.json().catch(() => ({ message: 'Unknown error' }));
          
          // SKIP trying to update the user attributes, there's something wrong with the API side
/*
          // If attribute exists (409 Conflict), try to update it
          if (createResponse.status === 409) {

            const objClone = { ...attr };
            if ('key' in objClone) {
                // @ts-ignore
                delete objClone.key;
            }

            const updateResponse = await fetch(`https://api.permit.io/v2/schema/${project}/${environment}/users/attributes/${attr.key}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(objClone)
            });

            if (updateResponse.ok) {
              log(`✓ Updated user attribute: ${attr.key} (${attr.type})`);
            } else {
              const updateData = await updateResponse.json().catch(() => ({ message: 'Unknown error' }));
              handleError({ 
                status: updateResponse.status, 
                message: updateData.message || `Failed to update attribute: ${attr.key}`, 
                data: updateData 
              }, `User attribute update for ${attr.key}`);
            }
          } else {
            handleError({ 
              status: createResponse.status, 
              message: createData.message || `Failed to create attribute: ${attr.key}`, 
              data: createData 
            }, `User attribute creation for ${attr.key}`);
          }
              */
        }
      } catch (error) {
        handleError({ 
          status: 500, 
          message: error.message || `API request failed for ${attr.key}` 
        }, `API request for user attribute ${attr.key}`);
      }
    }
    log('✓ User attributes setup complete');
  } catch (error) {
    handleError({ 
      status: 500, 
      message: error.message || 'Unknown error in user attributes setup' 
    }, 'User attributes setup');
  }
}

/**
 * Main setup function
 */
async function setup() {
  log('Starting Permit.io setup...');
  verbose(`Using PDP URL: ${permit.config.pdp}`);
  verbose(`Using environment: ${permit.config.environment}`);

  try {
    // Step 0: Set up user attributes for the environment
    await setupUserAttributes();
    
    // Step 1: Set up resource types with attributes
    if (!args.skipResources) {
      await setupresources();
    } else {
      log('Skipping resources setup...');
    }
    
    // Step 2: Create roles
    if (!args.skipRoles) {
      await setupRoles();
    } else {
      log('Skipping roles setup...');
    }
    
    // Step 3: Create tenants for multi-tenancy
    if (!args.skipTenants) {
      await setupTenants();
    } else {
      log('Skipping tenants setup...');
    }
    
    // Step 4: Create example users and assign roles
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
async function setupresources() {
  log('Setting up resource types...');

  // Vehicle resource
  try {
    // Check if resource already exists
    let existingResource = null;
    try {
      existingResource = await permit.api.resources.get('vehicle');
      log('Vehicle resource already exists, updating...');
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }
    }

    /**
     * @type {import('permitio').ResourceType}
     */
    const vehicleResource = {
      name: 'Vehicle',
      description: 'Vehicle resource type',
      actions: {
        read: { name: 'Read' },
        create: { name: 'Create' },
        update: { name: 'Update' },
        delete: { name: 'Delete' }
      },
      attributes: {
        vin: {
          type: 'string',
          description: 'Vehicle Identification Number'
        },
        owner_id: {
          type: 'string',
          description: 'ID of the vehicle owner'
        },
        fleet_id: {
          type: 'string',
          description: 'ID of the fleet this vehicle belongs to'
        }
      }
    };

    if (existingResource) {
      await permit.api.resources.update('vehicle', vehicleResource);
    } else {
      await permit.api.resources.create('vehicle', vehicleResource);
    }
    log('✓ Vehicle resource setup complete');
  } catch (error) {
    handleError(error, 'Vehicle resource setup');
  }

  // Maintenance resource
  try {
    // Check if resource already exists
    let existingResource = null;
    try {
      existingResource = await permit.api.resources.get('maintenance');
      log('Maintenance resource already exists, updating...');
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }
    }

    /**
     * @type {import('permitio').ResourceType}
     */
    const maintenanceResource = {
      name: 'Maintenance',
      description: 'Maintenance record for vehicles',
      actions: {
        read: { name: 'Read' },
        create: { name: 'Create' },
        update: { name: 'Update' },
        delete: { name: 'Delete' }
      },
      attributes: {
        vehicle_vin: {
          type: 'string',
          description: 'VIN of the vehicle being serviced'
        },
        technician_id: {
          type: 'string',
          description: 'ID of the technician performing the service'
        }
      }
    };

    if (existingResource) {
      await permit.api.resources.update('maintenance', maintenanceResource);
    } else {
      await permit.api.resources.create('maintenance', maintenanceResource);
    }
    log('✓ Maintenance resource setup complete');
  } catch (error) {
    handleError(error, 'Maintenance resource setup');
  }

  // Fleet resource
  try {
    // Check if resource already exists
    let existingResource = null;
    try {
      existingResource = await permit.api.resources.get('fleet');
      log('Fleet resource already exists, updating...');
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }
    }

    /**
     * @type {import('permitio').ResourceType}
     */
    const fleetResource = {
      name: 'Fleet',
      description: 'Fleet of vehicles',
      actions: {
        read: { name: 'Read' },
        create: { name: 'Create' },
        update: { name: 'Update' },
        delete: { name: 'Delete' }
      },
      attributes: {
        manager_id: {
          type: 'string',
          description: 'ID of the fleet manager'
        }
      }
    };

    if (existingResource) {
      await permit.api.resources.update('fleet', fleetResource);
    } else {
      await permit.api.resources.create('fleet', fleetResource);
    }
    log('✓ Fleet resource setup complete');
  } catch (error) {
    handleError(error, 'Fleet resource setup');
  }

  // Analytics resource
  try {
    // Check if resource already exists
    let existingResource = null;
    try {
      existingResource = await permit.api.resources.get('analytics');
      log('Analytics resource already exists, updating...');
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }
    }

    /**
     * @type {import('permitio').ResourceType}
     */
    const analyticsResource = {
      name: 'Analytics',
      description: 'Driver behavior analytics',
      actions: {
        read: { name: 'Read' },        
        create: { name: 'Create' },
        update: { name: 'Update' },
        delete: { name: 'Delete' }
      },
      attributes: {
        user_id: {
          type: 'string',
          description: 'ID of the user the analytics are about'
        },
        insurance_agent_id: {
          type: 'string',
          description: 'ID of the insurance agent with access'
        }
      }
    };

    if (existingResource) {
      await permit.api.resources.update('analytics', analyticsResource);
    } else {
      await permit.api.resources.create('analytics', analyticsResource);
    }
    log('✓ Analytics resource setup complete');
  } catch (error) {
    handleError(error, 'Analytics resource setup');
  }
}

/**
 * Step 2: Set up roles
 */
async function setupRoles() {
  log('Setting up roles...');

  // System Administrator role
  try {
    let existingRole = null;
    try {
      existingRole = await permit.api.roles.get('system_administrator');
      log('Role system_administrator already exists, updating...');
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }
    }

    /**
     * @type {import('permitio').Role}
     */
    const systemAdminRole = {
      name: 'System Administrator',
      description: 'Administrator with full system access',
      permissions: [
        'vehicle:read',
        'vehicle:create',
        'vehicle:update',
        'vehicle:delete',
        'maintenance:read',
        'maintenance:create',
        'maintenance:update',
        'maintenance:delete',
        'fleet:read',
        'fleet:create',
        'fleet:update',
        'fleet:delete',
        'analytics:read',
        'analytics:create',
        'analytics:update',
        'analytics:delete'
      ]
    };

    if (existingRole) {
      
      const updatedRole = { ...existingRole, ...systemAdminRole };
      await permit.api.roles.update('system_administrator', systemAdminRole);
      log('✓ Updated role: System Administrator');
    } else {
      await permit.api.roles.create('system_administrator', systemAdminRole);
      log('✓ Created role: System Administrator');
    }
  } catch (error) {
    handleError(error, 'System Administrator role setup');
  }

  // Vehicle Owner role
  try {
    let existingRole = null;
    try {
      existingRole = await permit.api.roles.get('vehicle_owner');
      log('Role vehicle_owner already exists, updating...');
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }
    }

    /**
     * @type {import('permitio').Role}
     */
    const vehicleOwnerRole = {
      name: 'Vehicle Owner',
      description: 'Owner of one or more vehicles',
      permissions: [
        'vehicle:read',
        'vehicle:update',
        'maintenance:read',
        'maintenance:create',
        'fleet:read'
      ]
    };

    if (existingRole) {
      const updatedRole = { ...existingRole, ...vehicleOwnerRole };
      await permit.api.roles.update('vehicle_owner', vehicleOwnerRole);
      log('✓ Updated role: Vehicle Owner');
    } else {
      await permit.api.roles.create('vehicle_owner', vehicleOwnerRole);
      log('✓ Created role: Vehicle Owner');
    }
  } catch (error) {
    handleError(error, 'Vehicle Owner role setup');
  }

  // Fleet Manager role
  try {
    let existingRole = null;
    try {
      existingRole = await permit.api.roles.get('fleet_manager');
      log('Role fleet_manager already exists, updating...');
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }
    }

    /**
     * @type {import('permitio').Role}
     */
    const fleetManagerRole = {
      name: 'Fleet Manager',
      description: 'Manager of vehicle fleets',
      permissions: [
        'fleet:read',
        'fleet:update',
        'vehicle:read',
        'vehicle:update',
        'maintenance:read',
        'maintenance:create'
      ]
    };

    if (existingRole) {
      const updatedRole = { ...existingRole, ...fleetManagerRole };
      await permit.api.roles.update('fleet_manager', fleetManagerRole);
      log('✓ Updated role: Fleet Manager');
    } else {
      await permit.api.roles.create('fleet_manager', fleetManagerRole);
      log('✓ Created role: Fleet Manager');
    }
  } catch (error) {
    handleError(error, 'Fleet Manager role setup');
  }

  // Service Technician role
  try {
    let existingRole = null;
    try {
      existingRole = await permit.api.roles.get('service_technician');
      log('Role service_technician already exists, updating...');
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }
    }

    /**
     * @type {import('permitio').Role}
     */
    const technicianRole = {
      name: 'Service Technician',
      description: 'Vehicle service and maintenance technician',
      permissions: [
        'vehicle:read',
        'analytics:read',
        'analytics:create',
        'analytics:update'
      ]
    };

    if (existingRole) {
      const updatedRole = { ...existingRole, ...technicianRole };
      await permit.api.roles.update('service_technician', technicianRole);
      log('✓ Updated role: Service Technician');
    } else {
      await permit.api.roles.create('service_technician', technicianRole);
      log('✓ Created role: Service Technician');
    }
  } catch (error) {
    handleError(error, 'Service Technician role setup');
  }

  // Insurance Provider role
  try {
    let existingRole = null;
    try {
      existingRole = await permit.api.roles.get('insurance_provider');
      log('Role insurance_provider already exists, updating...');
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }
    }

    /**
     * @type {import('permitio').Role}
     */
    const insuranceRole = {
      name: 'Insurance Provider',
      description: 'Vehicle insurance provider with limited access',
      permissions: [
        'vehicle:read',
        'analytics:read'
      ]
    };

    if (existingRole) {
      const updatedRole = { ...existingRole, ...insuranceRole };
      await permit.api.roles.update('insurance_provider', insuranceRole);
      log('✓ Updated role: Insurance Provider');
    } else {
      await permit.api.roles.create('insurance_provider', insuranceRole);
      log('✓ Created role: Insurance Provider');
    }
  } catch (error) {
    handleError(error, 'Insurance Provider role setup');
  }
}

/**
 * Helper function to assign permissions to a role
 */
async function assignPermissionToRole(roleKey, permissions) {
  try {
    // The API expects an object with a permissions array
    await permit.api.roles.assignPermissions(roleKey, { permissions });
    log(`✓ Assigned permissions to ${roleKey}`);
  } catch (error) {
    handleError(error, `Permission assignment for ${roleKey}`);
  }
}

/**
 * Step 3: Create tenants for multi-tenancy
 */
async function setupTenants() {
  log('Setting up tenants...');

  /**
   * @type {import('permitio').Tenant[]}
   */
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
      // Check if tenant already exists
      let existingTenant = null;
      try {
        existingTenant = await permit.api.tenants.get(tenant.key);
        log(`Tenant ${tenant.name} already exists, updating...`);
      } catch (error) {
        if (error.status !== 404) {
          throw error;
        }
      }

      if (existingTenant) {
        // Clone into a new object and then remove .key from the new object
        const tenantClone = { ...tenant };
        if ('key' in tenantClone) {
            // @ts-ignore
            delete tenantClone.key;
        }
        await permit.api.tenants.update(tenant.key, tenantClone);
        log(`✓ Updated ${tenant.name} tenant`);
      } else {
        await permit.api.tenants.create(tenant);
        log(`✓ Created ${tenant.name} tenant`);
      }
    } catch (error) {
      handleError(error, `${tenant.name} tenant creation/update`);
    }
  }
}

/**
 * Step 4: Create example users and assign roles
 */
async function setupUsers() {
  log('Setting up example users...');

  /**
   * @typedef {Object} UserRole
   * @property {string} role - The role key
   * @property {string[]} tenants - Array of tenant keys where this role applies
   */

  /**
   * @typedef {Object} UserWithRoles
   * @property {string} key - Unique user identifier
   * @property {string} email - User's email
   * @property {string} first_name - User's first name
   * @property {string} last_name - User's last name
   * @property {Object} attributes - User attributes
   * @property {UserRole[]} role_assignments - Roles assigned to this user
   */

  /**
   * @type {UserWithRoles[]}
   */
  const users = [
    {
      key: 'admin',
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      attributes: {
        id: 'admin',
      },
      role_assignments: [
        { role: 'system_administrator', tenants: ['personal-vehicles', 'acme-auto-service', 'swift-delivery', 'safe-auto-insurance'] }
      ]
    },
    {
      key: 'vehicle-owner-1',
      email: 'newuser@example.com',
      first_name: 'New',
      last_name: 'User',
      attributes: {
        id: 'vehicle-owner-1',
        vehicles: ['VIN123456789', 'VIN987654321']
      },
      role_assignments: [
        { role: 'vehicle_owner', tenants: ['personal-vehicles'] }
      ]
    },
    {
      key: 'vehicle-owner-2',
      email: 'vehicleowner2@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      attributes: {
        id: 'vehicle-owner-2',
        vehicles: ['VIN555666777']
      },
      role_assignments: [
        { role: 'vehicle_owner', tenants: ['personal-vehicles'] }
      ]
    },
    {
      key: 'tech1',
      email: 'tech1@example.com',
      first_name: 'Tech',
      last_name: 'User',
      attributes: {
        id: 'tech1'
      },
      role_assignments: [
        { role: 'service_technician', tenants: ['acme-auto-service'] }
      ]
    },
    {
      key: 'fleet1',
      email: 'fleet1@example.com',
      first_name: 'Fleet',
      last_name: 'Manager',
      attributes: {
        id: 'fleet1',
        managed_fleets: ['fleet-001', 'fleet-002']
      },
      role_assignments: [
        { role: 'fleet_manager', tenants: ['swift-delivery'] }
      ]
    },
    {
      key: 'insurance1',
      email: 'insurance1@example.com',
      first_name: 'Insurance',
      last_name: 'Agent',
      attributes: {
        id: 'insurance1'
      },
      role_assignments: [
        { role: 'insurance_provider', tenants: ['safe-auto-insurance'] }
      ]
    }
  ];

  // Process each user
  for (const user of users) {
    try {
      // Check if user already exists
      let existingUser = null;
      try {
        existingUser = await permit.api.users.get(user.key);
        log(`User ${user.key} already exists, updating...`);
      } catch (error) {
        if (error.status !== 404) {
          throw error;
        }
      }

      // Create user object without roles for API call
      const userObj = {
        key: user.key,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        attributes: user.attributes
      };

      if (existingUser) {
        // Clone into a new object and then remove .key from the new object
        const userObjClone = { ...userObj };
        if ('key' in userObjClone) {
            // @ts-ignore
            delete userObjClone.key;
        }
        await permit.api.users.update(user.key, userObjClone);
        log(`✓ Updated user: ${user.key}`);
      } else {
        await permit.api.users.create(userObj);
        log(`✓ Created user: ${user.key}`);
      }

      // Assign roles to the user
      for (const roleAssignment of user.role_assignments) {
        for (const tenant of roleAssignment.tenants) {
          try {
            await permit.api.users.assignRole({
              user: user.key,
              role: roleAssignment.role,
              tenant: tenant
            });
            log(`✓ Assigned ${user.key} to ${roleAssignment.role} role in ${tenant}`);
          } catch (error) {
            // If the role is already assigned, just continue
            if (error.status === 409) {
              log(`✓ User ${user.key} already has role ${roleAssignment.role} in ${tenant}`);
            } else {
              handleError(error, `Role assignment for ${user.key}`);
            }
          }
        }
      }
    } catch (error) {
      handleError(error, `User setup for ${user.key}`);
    }
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