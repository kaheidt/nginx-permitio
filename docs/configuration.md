# Configuration Guide: Setting Up API-First Authorization with Permit.io

This guide explains how to configure the AutoSecure API Gateway to implement API-First authorization using Permit.io for automotive industry applications.

## Prerequisites

Before configuring the system, you'll need:

1. A [Permit.io account](https://app.permit.io/signup)
2. Your Permit.io API key
3. Docker and Docker Compose installed
4. Understanding of your resource model and access control requirements

## Step 1: Environment Configuration

First, set up your environment variables by creating a `.env` file based on the provided `.env.example`:

```bash
# Copy the example file
cp .env.example .env

# Edit the .env file with your actual values
nano .env
```

The key environment variables to configure are:

```
# Permit.io Configuration
PERMIT_API_KEY=your_permit_api_key_here
PERMIT_PDP_URL=https://cloudpdp.api.permit.io
PERMIT_ENVIRONMENT=dev

# Auth Service Configuration
AUTH_SECRET=change_this_to_a_secure_secret
```

## Step 2: Permit.io Setup

### Option 1: Automated Setup with Script

For quick and consistent setup, you can use the provided setup script that creates all necessary resources, roles, permissions, tenants, and example users in your Permit.io environment:

1. Navigate to the scripts directory:
```bash
cd scripts
```

2. Install the required dependencies:
```bash
npm install
```

3. Run the setup script:
```bash
# Using environment variables from .env file
npm run setup

# Or pass API key directly via command line
node setup.js --api-key your_api_key_here

# For production environments
node setup.js --api-key your_api_key_here --environment prod
```

The script supports the following command line arguments:

```
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
--help               Display help message with all available options
```

For example, to only set up the resources and roles without creating users:

```bash
node setup.js --api-key your_api_key_here --skip-users
```

The script will:
- Create resource types (vehicle, maintenance, fleet, analytics) with attributes
- Define roles (vehicle owner, service technician, fleet manager, etc.)
- Set up permission policies with appropriate conditions
- Create tenants for multi-tenancy support
- Create example users with appropriate role assignments (unless --skip-users is specified)

The script handles errors gracefully and will continue even if some resources already exist, making it safe to run multiple times.

### Option 2: Manual Setup via Dashboard

### Create Your Permit.io Project

1. Sign up for a Permit.io account at [app.permit.io](https://app.permit.io/signup)
2. Create a new project (e.g., "Automotive API Gateway")
3. Select the default environment or create custom ones (dev, staging, prod)
4. Copy your API key from the dashboard

### Define Your Resource Model

Use the Permit.io dashboard to define the resources for your automotive API:

1. Navigate to "Resources" in the Permit.io dashboard
2. Create the following resources:
   - `vehicle`
   - `maintenance`
   - `fleet`
   - `analytics`

3. Add attributes to each resource:

   **Vehicle Resource:**
   ```json
   {
     "attributes": {
       "vin": {
         "type": "string",
         "description": "Vehicle Identification Number"
       },
       "owner_id": {
         "type": "string",
         "description": "ID of the vehicle owner"
       },
       "fleet_id": {
         "type": "string",
         "description": "ID of the fleet this vehicle belongs to",
         "required": false
       }
     }
   }
   ```

   **Maintenance Resource:**
   ```json
   {
     "attributes": {
       "vehicle_vin": {
         "type": "string",
         "description": "VIN of the vehicle being serviced"
       },
       "technician_id": {
         "type": "string",
         "description": "ID of the technician performing the service"
       }
     }
   }
   ```

   **Fleet Resource:**
   ```json
   {
     "attributes": {
       "manager_id": {
         "type": "string",
         "description": "ID of the fleet manager"
       }
     }
   }
   ```

   **Analytics Resource:**
   ```json
   {
     "attributes": {
       "user_id": {
         "type": "string",
         "description": "ID of the user the analytics are about"
       },
       "insurance_agent_id": {
         "type": "string",
         "description": "ID of the insurance agent with access",
         "required": false
       }
     }
   }
   ```

### Define Roles and Permissions

1. Navigate to "Roles" in the Permit.io dashboard
2. Create the following roles:
   - `vehicle_owner`
   - `service_technician`
   - `fleet_manager`
   - `insurance_provider`
   - `system_administrator`

3. Assign permissions to roles:

   **Vehicle Owner Permissions:**
   - Can `read` `vehicle` where `resource.owner_id == user.id`
   - Can `read` `maintenance` where `resource.vehicle_vin in user.vehicles`

   **Service Technician Permissions:**
   - Can `read` `vehicle`
   - Can `read` `maintenance` where `resource.technician_id == user.id`
   - Can `create` `maintenance`
   - Can `update` `maintenance` where `resource.technician_id == user.id`

   **Fleet Manager Permissions:**
   - Can `read` `fleet` where `resource.manager_id == user.id`
   - Can `update` `fleet` where `resource.manager_id == user.id`
   - Can `read` `vehicle` where `resource.fleet_id in user.managed_fleets`

   **Insurance Provider Permissions:**
   - Can `read` `analytics` where `resource.insurance_agent_id == user.id`

   **System Administrator Permissions:**
   - Can perform any action on any resource

### Configure User Directory Integration (Optional)

For production environments, you may want to integrate with your existing user directory:

1. Navigate to "Directory Sync" in the Permit.io dashboard
2. Select your identity provider (Okta, Auth0, etc.)
3. Configure the SCIM integration or API-based sync

## Step 3: NGINX Configuration

### Configure NGINX Lua Module

The NGINX Lua module is already set up in the `nginx/conf.d/permit.lua` file. You can customize the following aspects:

1. **Resource mapping logic** - How URLs map to resources and actions
2. **JWT token extraction** - How user information is extracted from the token
3. **Context enrichment** - Additional context sent to Permit.io for decisions

```lua
-- Example: Customizing resource mapping
if string.find(path, "/vehicles") then
    resource = "vehicle"
    resource_id = string.match(path, "/vehicles/([^/]+)")
    if resource_id then
        resource_attributes = { vehicle_ids = {resource_id} }
    end
end
-- Add custom resource mappings here
```

### Configure NGINX Routes

The NGINX routes are defined in `nginx/conf.d/default.conf`. Add new routes by following this pattern:

```nginx
location /api/v1/your-new-endpoint {
    access_by_lua_block {
        local permit = require("permit")
        permit.check_authorization()
    }
    
    # Preserve original client Authorization header
    proxy_set_header Authorization $http_authorization;
    proxy_pass ${YOUR_SERVICE_URL};
}
```

## Step 4: User Management

### Configure the Authentication Service

The authentication service is responsible for:
1. Authenticating users
2. Creating JWT tokens
3. Syncing users to Permit.io

Review and customize the user synchronization in `src/services/auth/index.js`:

```javascript
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
    // Customize this part based on your needs
  } catch (error) {
    console.error('Error syncing with Permit.io:', error);
    throw error;
  }
}
```

## Step 5: Tenant Configuration

### Setting Up Multi-tenancy

For multi-tenant environments:

1. Define tenants in Permit.io dashboard:
   - personal-vehicles (for individual vehicle owners)
   - acme-auto-service (for service centers)
   - swift-delivery (for fleet operators)
   - safe-auto-insurance (for insurance providers)

2. Assign users to tenants with appropriate roles
3. Ensure tenant information is included in JWT tokens

```javascript
// Example JWT token content
{
  "sub": "user-123",
  "username": "johndoe",
  "roles": ["vehicle_owner"],
  "tenant_id": "personal-vehicles",
  "vehicles": ["VIN123456789"]
}
```

## Step 6: Testing Authorization Policies

### Test with API Requests

You can test your authorization policies using curl commands:

```bash
# Login to get a token
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "newuser", "password": "2025DEVChallenge"}'

# Use the token to access protected resources
curl -X GET http://localhost:8080/api/v1/vehicles \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Authorization Enforcement Difference

A key aspect of this architecture is understanding how authorization enforcement changes the behavior of your API. The following example shows a request that would work without Permit.io authorization but would be blocked with proper authorization in place:

```bash
# Assuming "newuser" is a vehicle owner with access only to their own vehicles (VIN123456789, VIN987654321)
# First, get a token
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "newuser", "password": "2025DEVChallenge"}'

# Then, attempt to access a vehicle they don't own
curl -X GET http://localhost:8080/api/v1/vehicles/VIN-NOT-OWNED-BY-USER \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Behavior without authorization (or with bypass enabled):**
- Request is forwarded to the backend service
- Data is returned if the backend doesn't implement its own access controls
- No centralized enforcement of access policies

**Behavior with Permit.io authorization enabled:**
- Request is intercepted by the NGINX gateway
- Permit.io evaluates the authorization policy: `vehicle_owner can read vehicle where resource.owner_id == user.id`
- Request is rejected with a 403 Forbidden response since the user doesn't own the vehicle
- Detailed reason is logged in the Permit.io audit logs

This demonstrates the value of API-first authorization: consistent access control at the API gateway layer without requiring each backend service to implement authorization logic.

### Authorization Cross-User Testing

With our system configuration, we can demonstrate a key aspect of API-first authorization: enforcing access boundaries between different users with the same role. We can use the two vehicle owner accounts to illustrate this:

```bash
# Step 1: First vehicle owner logs in and gets their token
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "newuser", "password": "2025DEVChallenge"}'
# Save the returned token as OWNER1_TOKEN

# Step 2: Try to access vehicle-owner-1's vehicle (should succeed)
curl -X GET http://localhost:8080/api/v1/vehicles/VIN123456789 \
  -H "Authorization: Bearer $OWNER1_TOKEN"
# Returns vehicle data since this user owns this vehicle

# Step 3: Try to access vehicle-owner-2's vehicle (should fail with proper authorization)
curl -X GET http://localhost:8080/api/v1/vehicles/VIN555666777 \
  -H "Authorization: Bearer $OWNER1_TOKEN"
# With Permit.io integration enabled: Returns 403 Forbidden
# With Permit.io integration bypassed: May return the data despite not being authorized

# Step 4: Second vehicle owner logs in and gets their token
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "vehicleowner2", "password": "2025DEVChallenge"}'
# Save the returned token as OWNER2_TOKEN

# Step 5: Try to access vehicle-owner-2's vehicle (should succeed)
curl -X GET http://localhost:8080/api/v1/vehicles/VIN555666777 \
  -H "Authorization: Bearer $OWNER2_TOKEN"
# Returns vehicle data since this user owns this vehicle

# Step 6: Try to access vehicle-owner-1's vehicle (should fail with proper authorization)
curl -X GET http://localhost:8080/api/v1/vehicles/VIN123456789 \
  -H "Authorization: Bearer $OWNER2_TOKEN"
# With Permit.io integration enabled: Returns 403 Forbidden
# With Permit.io integration bypassed: May return the data despite not being authorized
```

This example demonstrates how the NGINX-Permit.io integration enforces fine-grained access control at the API gateway level. Each vehicle owner can only access their own vehicles, and the system blocks attempts to access other users' resources - even when they have the same role.

Without API-first authorization at the gateway level, these kinds of security checks would have to be implemented consistently across all backend services, creating a higher risk of security vulnerabilities.

### Authorization Testing Scenarios

Test these common scenarios to validate your policies:

1. **Vehicle Owner Access:**
   - Can access their own vehicles
   - Cannot access vehicles they don't own
   - Can access maintenance records for their vehicles

2. **Service Technician Access:**
   - Can access vehicle data
   - Can create maintenance records
   - Can update maintenance records they created

3. **Fleet Manager Access:**
   - Can access fleets they manage
   - Cannot access fleets they don't manage
   - Can access vehicles in their managed fleets

4. **Insurance Provider Access:**
   - Can access driver analytics for their policy holders
   - Cannot access full vehicle telemetry data

5. **System Administrator Access:**
   - Can access all resources

## Step 7: Monitoring and Auditing

### Authorization Logs

View authorization decisions in Permit.io's audit logs:

1. Navigate to "Audit Logs" in the Permit.io dashboard
2. Filter logs by:
   - User
   - Resource type
   - Action
   - Decision (allow/deny)
   - Time period

### Custom Logging

You can add custom logging in the NGINX Lua module:

```lua
-- Example: Adding custom logging
if res.status == 200 then
    ngx.log(ngx.INFO, "Authorization allowed for ", user_id, " on ", resource, ":", resource_id)
else
    ngx.log(ngx.WARN, "Authorization denied for ", user_id, " on ", resource, ":", resource_id)
    ngx.exit(ngx.HTTP_FORBIDDEN)
end
```

## Troubleshooting

### Common Issues and Solutions

1. **403 Forbidden Responses:**
   - Check user roles in Permit.io
   - Verify resource attributes match policy conditions
   - Examine audit logs for decision reasoning

2. **JWT Token Issues:**
   - Verify token format and signatures
   - Check that user claims match expected format
   - Ensure token isn't expired

3. **NGINX Lua Errors:**
   - Check NGINX error logs: `docker logs nginx-api-gateway`
   - Verify Lua syntax and API usage

4. **Permit.io API Connectivity:**
   - Check network connectivity to Permit.io PDP
   - Verify API key is valid
   - Ensure environment is correctly specified

### Debug Mode

Enable debug mode for more verbose logging:

1. In `.env`, set:
   ```
   DEBUG=true
   ```

2. In NGINX config, increase log level:
   ```
   error_log /var/log/nginx/error.log debug;
   ```

## Advanced Configuration

### Performance Optimization

For production environments, consider these performance optimizations:

1. **Caching Authorization Decisions:**
   - Add response caching in NGINX
   - Implement TTL-based cache for common requests

2. **Batch Processing:**
   - Use Permit.io's batch decision API for multiple checks

3. **Connection Pooling:**
   - Configure optimal HTTP keepalive settings for Permit.io requests

### High Availability Setup

For production deployments requiring high availability:

1. **NGINX Load Balancing:**
   - Deploy multiple NGINX instances behind a load balancer
   - Configure health checks and failover

2. **Fallback Policies:**
   - Implement graceful degradation if Permit.io is unavailable
   - Define default policies for emergency access

## Conclusion

This configuration guide provided instructions for setting up API-First authorization with Permit.io in the AutoSecure API Gateway. By following these steps, you can implement fine-grained access control for your automotive industry applications.