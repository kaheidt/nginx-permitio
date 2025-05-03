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
 * Helper function to make API calls to Permit.io
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {Object} data - Request body
 * @param {string} operation - Description of operation for error handling
 */
async function makeApiCall(endpoint, method, data, operation) {
  try {
    const apiKey = args.apiKey || process.env.PERMIT_API_KEY;
    const environment = args.environment || process.env.PERMIT_ENVIRONMENT || 'dev';
    const project = args.project || process.env.PERMIT_PROJECT || 'nginx';

    const url = `https://api.permit.io/v2${endpoint.replace('{project}', project).replace('{environment}', environment)}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      const result = await response.json().catch(() => ({}));
      return { success: true, data: result };
    } else {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      return { 
        success: false, 
        status: response.status, 
        message: errorData.message || `Failed during ${operation}`,
        data: errorData
      };
    }
  } catch (error) {
    return { 
      success: false, 
      status: 500, 
      message: error.message || `API request failed for ${operation}`
    };
  }
}

/**
 * Generic function to create or update an entity using the Permit SDK
 * @param {string} entityType - The type of entity (resource, role, etc.)
 * @param {string} key - The entity key
 * @param {Object} entity - The entity object
 * @param {Function} getFunc - SDK function to get entity
 * @param {Function} createFunc - SDK function to create entity
 * @param {Function} updateFunc - SDK function to update entity
 */
async function createOrUpdateEntity(entityType, key, entity, getFunc, createFunc, updateFunc) {
  try {
    let existing = null;
    try {
      existing = await getFunc(key);
      log(`${entityType} ${key} already exists, updating...`);
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }
    }

    if (existing) {
      await updateFunc(key, entity);
      log(`✓ Updated ${entityType}: ${key}`);
    } else {
      await createFunc(key, entity);
      log(`✓ Created ${entityType}: ${key}`);
    }
    return true;
  } catch (error) {
    handleError(error, `${entityType} setup for ${key}`);
    return false;
  }
}

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
      const result = await makeApiCall(
        `/schema/{project}/{environment}/users/attributes`, 
        'POST', 
        attr, 
        `User attribute creation for ${attr.key}`
      );
      
      if (result.success) {
        log(`✓ Created user attribute: ${attr.key} (${attr.type})`);
      } else if (result.status === 409) {
        log(`User attribute ${attr.key} already exists`);
        
        // SKIP trying to update the user attributes, there's something wrong with the API side
        // If we wanted to update, we would use:
        // Removed update code as it's currently disabled
      } else {
        handleError({ 
          status: result.status, 
          message: result.message, 
          data: result.data 
        }, `User attribute creation for ${attr.key}`);
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
 * Step 0.1: Set up condition sets for resource-based permissions
 */
async function setupConditionSets() {
  log('Setting up condition sets...');

  try {
    // Define the condition set for vehicle ownership
    const ownerOfVehicleCondition = {
      key: "owner_of_vehicle",
      name: "Owner of Vehicle",
      type: "resourceset",
      autogenerated: false,
      resource_id: "vehicle",
      description: "Vehicle owner owns resource",
      conditions: {
        allOf: [
          {
            allOf: [
              {
                "resource.vehicle_ids": {
                  array_intersect: {
                    ref: "user.vehicles"
                  }
                }
              }
            ]
          }
        ]
      }
    };

    const result = await makeApiCall(
      `/schema/{project}/{environment}/condition_sets`, 
      'POST', 
      ownerOfVehicleCondition, 
      `Condition set creation for ${ownerOfVehicleCondition.key}`
    );

    if (result.success) {
      log(`✓ Created condition set: ${ownerOfVehicleCondition.name}`);
    } else if (result.status === 409) {
      log(`Condition set ${ownerOfVehicleCondition.key} already exists`);        
    } else {
      handleError({ 
        status: result.status, 
        message: result.message, 
        data: result.data 
      }, `Condition set creation for ${ownerOfVehicleCondition.key}`);
    }
    
    log('✓ Condition sets setup complete');
  } catch (error) {
    handleError({ 
      status: 500, 
      message: error.message || 'Unknown error in condition sets setup' 
    }, 'Condition sets setup');
  }
}

/**
 * Step 2.1: Set up role rules
 */
async function setupRoleRules() {
  log('Setting up role rules...');

  try {
    // Define the rules we want to create for vehicle owners
    const rules = [
      {
        user_set: "vehicle_owner",
        permission: "vehicle:update",
        resource_set: "owner_of_vehicle",
        is_role: true,
        is_resource: false
      },
      {
        user_set: "vehicle_owner",
        permission: "vehicle:read",
        resource_set: "owner_of_vehicle",
        is_role: true,
        is_resource: false
      }
    ];

    // Create each rule using direct API calls
    for (const rule of rules) {
      const result = await makeApiCall(
        `/facts/{project}/{environment}/set_rules`, 
        'POST', 
        rule, 
        `Rule creation for ${rule.permission}`
      );

      if (result.success) {
        log(`✓ Created rule: ${rule.user_set} can ${rule.permission} where resource is in ${rule.resource_set}`);
      } else {
        handleError({ 
          status: result.status || 500, 
          message: result.message || `Failed to create rule: ${rule.permission}`,
          data: result.data 
        }, `Rule creation for ${rule.permission}`);
      }
    }
    
    log('✓ Role rules setup complete');
  } catch (error) {
    handleError({
      status: 500,
      message: error.message || 'Unknown error in role rules setup'
    }, 'Role rules setup');
  }
}

/**
 * Create a resource type in Permit.io
 * @param {string} key - Resource key 
 * @param {Object} definition - Resource definition object
 */
async function createOrUpdateResource(key, definition) {
  return createOrUpdateEntity(
    'Resource', 
    key, 
    definition, 
    (k) => permit.api.resources.get(k),
    (k, r) => permit.api.resources.create(k, r),
    (k, r) => permit.api.resources.update(k, r)
  );
}

/**
 * Create a role in Permit.io
 * @param {string} key - Role key 
 * @param {Object} definition - Role definition object
 */
async function createOrUpdateRole(key, definition) {
  return createOrUpdateEntity(
    'Role', 
    key, 
    definition, 
    (k) => permit.api.roles.get(k),
    (k, r) => permit.api.roles.create(k, r),
    (k, r) => permit.api.roles.update(k, r)
  );
}

/**
 * Step 1: Set up resource types
 */
async function setupResources() {
  log('Setting up resource types...');

  // Define all resources with their configurations
  const resources = [
    {
      key: 'vehicle',
      definition: {
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
          },
          vehicle_ids: {
            type: 'array',
            description: 'IDs that identify this vehicle'
          }
        }
      }
    },
    {
      key: 'maintenance',
      definition: {
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
      }
    },
    {
      key: 'fleet',
      definition: {
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
      }
    },
    {
      key: 'analytics',
      definition: {
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
      }
    }
  ];

  // Create or update each resource
  for (const resource of resources) {
    const success = await createOrUpdateResource(resource.key, resource.definition);
    if (success) {
      log(`✓ ${resource.key} resource setup complete`);
    }
  }
}

/**
 * Step 2: Set up roles
 */
async function setupRoles() {
  log('Setting up roles...');

  // Define all roles with their configurations
  const roles = [
    {
      key: 'system_administrator',
      definition: {
        name: 'System Administrator',
        description: 'Administrator with full system access',
        permissions: [
          'vehicle:read', 'vehicle:create', 'vehicle:update', 'vehicle:delete',
          'maintenance:read', 'maintenance:create', 'maintenance:update', 'maintenance:delete',
          'fleet:read', 'fleet:create', 'fleet:update', 'fleet:delete',
          'analytics:read', 'analytics:create', 'analytics:update', 'analytics:delete'
        ]
      }
    },
    {
      key: 'vehicle_owner',
      definition: {
        name: 'Vehicle Owner',
        description: 'Owner of one or more vehicles',
        permissions: [
          'maintenance:read',
          'maintenance:create',
          'fleet:read'
        ]
      }
    },
    {
      key: 'fleet_manager',
      definition: {
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
      }
    },
    {
      key: 'service_technician',
      definition: {
        name: 'Service Technician',
        description: 'Vehicle service and maintenance technician',
        permissions: [
          'vehicle:read',
          'analytics:read',
          'analytics:create',
          'analytics:update'
        ]
      }
    },
    {
      key: 'insurance_provider',
      definition: {
        name: 'Insurance Provider',
        description: 'Vehicle insurance provider with limited access',
        permissions: [
          'vehicle:read',
          'analytics:read'
        ]
      }
    }
  ];

  // Create or update each role
  for (const role of roles) {
    const success = await createOrUpdateRole(role.key, role.definition);
    if (success) {
      log(`✓ ${role.definition.name} role setup complete`);
    }
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
    
    // Step 0.1: Create condition sets for resource-based permissions
    await setupConditionSets();
    
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
    
    // Step 2.1: Create role rules
    await setupRoleRules();
    
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