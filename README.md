# AutoSecure API Gateway: API-First Authorization for Automotive Industry

An innovative API gateway solution leveraging NGINX and Permit.io to implement fine-grained authorization for automotive industry applications.

![API-First Authorization Architecture](https://raw.githubusercontent.com/permitio/nginx-guard/main/docs/nginx-permit.png)

## Project Overview

AutoSecure API Gateway demonstrates how API-First authorization principles can be applied to modern automotive industry services. It showcases how authorization can be externalized from application code and enforced at the gateway layer using Permit.io's integration with NGINX.

### Use Case: Connected Vehicle Services Platform

This project implements a Connected Vehicle Services Platform API with the following components:

1. **Vehicle Telemetry API** - Access to real-time vehicle data
2. **Maintenance Services API** - Schedule and manage service appointments
3. **Fleet Management API** - Monitor and manage vehicle fleets
4. **Driver Behavior Analytics API** - Access to driving behavior data

Each API has different access control requirements based on user roles:
- **Vehicle Owner** - Access to their own vehicle data and services
- **Service Technician** - Access to vehicle diagnostics and service history
- **Fleet Manager** - Access to fleet-wide telemetry and management features
- **Insurance Provider** - Limited access to driving behavior data
- **System Administrator** - Complete access to all APIs

## Key Features

- 🛡️ **API Gateway Authorization** - Authorization enforced at the NGINX gateway level
- 🔐 **Fine-grained RBAC & ABAC** - Role-based and attribute-based access control
- 📱 **Multi-tenant Architecture** - Support for multiple organizations and user hierarchies
- 🔄 **Real-time Policy Updates** - Policy changes take effect immediately without redeployments
- 📊 **Audit Logging** - Comprehensive logging of all authorization decisions

## Why API-First Authorization Matters?

Traditional authorization approaches embed authorization logic directly in application code, leading to:
- **Scattered policies** across services and endpoints
- **Inconsistent enforcement** of security rules
- **Tight coupling** between business logic and access control
- **Service restarts** required to update policies

API-First authorization moves authorization decisions to a dedicated layer:
- **Centralized policies** managed outside application code
- **Consistent enforcement** at the API gateway
- **Declarative rules** expressed as policies, not code
- **Real-time updates** without service disruptions
- **Reduced developer burden** as authorization is handled externally

## Architecture

Our architecture consists of:

1. **NGINX API Gateway with Permit.io NJS Module** - Acts as the Policy Enforcement Point (PEP)
2. **Permit.io Cloud PDP** - Provides centralized Policy Decision Point
3. **Backend Microservices** - Four automotive-focused API services
4. **Authentication Service** - Handles user login and JWT token issuance

The authorization flow works as follows:

1. Client authenticates and receives a JWT token
2. Client makes API requests with the JWT token
3. NGINX extracts user info, resource, and action from the request
4. NGINX sends authorization check to Permit.io PDP
5. Permit.io evaluates policies and returns allow/deny decision
6. NGINX enforces the decision by allowing or blocking the request

For more details, see the [Architecture Documentation](docs/architecture.md).

## Authorization Model

Our authorization model for the automotive industry is built around:

- **Resources**: Vehicles, maintenance records, fleets, analytics
- **Actions**: Read, create, update, delete
- **Roles**: Vehicle owner, service technician, fleet manager, insurance provider, admin
- **Attributes**: User properties (role, tenant), resource properties (owner, VIN)
- **Relationships**: Ownership of vehicles, assignment to fleets, etc.

For a detailed explanation of our authorization model, see the [Authorization Model Documentation](docs/authorization-model.md).

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Permit.io account (free tier available)
- Node.js (v14 or higher) for development

### Quick Start

1. Clone this repository
```bash
git clone https://github.com/kaheidt/nginx-permitio.git
cd nginx-permitio
```

2. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your Permit.io API key and other settings
```

3. Start the services
```bash
docker-compose up -d
```

4. Test the API
```bash
# Login to get a token
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "newuser", "password": "2025DEVChallenge"}'

# Use the token to access a protected resource
curl -X GET http://localhost:8080/api/v1/vehicles \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

For detailed setup instructions, see our [Configuration Guide](docs/configuration.md).

## API Documentation

Our Connected Vehicle Services Platform exposes multiple RESTful APIs:

- **Authentication API** - User login and profile management
- **Vehicle Telemetry API** - Access to vehicle data
- **Maintenance Service API** - Service records and appointments
- **Fleet Management API** - Fleet operations
- **Driver Analytics API** - Driving behavior and statistics

Each API endpoint has specific authorization requirements based on user roles and resource ownership.

For complete API documentation, see the [API Documentation](docs/api.md).

## Implementing API-First Authorization

### Step 1: Define Resources and Actions

Define the resources and actions in your Permit.io dashboard:

```json
{
  "resources": {
    "vehicle": ["read", "create", "update", "delete"],
    "maintenance": ["read", "create", "update", "delete"],
    "fleet": ["read", "create", "update", "delete"],
    "analytics": ["read"]
  }
}
```

### Step 2: Create Roles and Policies

Create roles and assign permissions with conditions:

```json
{
  "roles": {
    "vehicle_owner": {
      "permissions": [
        {
          "resource": "vehicle",
          "action": "read",
          "condition": "resource.owner_id == user.id"
        }
      ]
    }
  }
}
```

### Step 3: Configure NGINX Integration

Integrate Permit.io with NGINX using the JavaScript module:

```javascript
function permitio_check_auth(r) {
  const token = permitio_token(r);
  const method = r.method;
  const path = r.uri;
  
  // Determine resource and action from request
  let resource = extractResourceFromPath(path);
  let action = mapMethodToAction(method);
  
  // Check permission with Permit.io
  const response = ngx.fetch(permitio_pdp_url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${permitApiKey}` },
    body: JSON.stringify({
      user: extractUserFromToken(token),
      action: action,
      resource: resource,
      context: { /* request context */ }
    })
  });
  
  // Handle response
  response.then(res => {
    if (res.status === 200) {
      return res.json();
    } else {
      r.return(403);
    }
  })
  .then(data => {
    if (data && data.allow) {
      r.return(200);
    } else {
      r.return(403);
    }
  });
}
```

For a complete implementation guide, see our [Configuration Documentation](docs/configuration.md).

## Contributing

We welcome contributions to this project! To contribute:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Permit.io](https://permit.io) for their authorization framework
- [NGINX](https://nginx.org/) for the powerful API gateway capabilities
- The automotive industry partners who provided real-world requirements