![Autosecure Gateway: API First](/docs/images/Autosecure_Gateway.jpeg)
# AutoSecure API Gateway: API-First Authorization for Automotive Industry

An innovative API gateway solution leveraging NGINX and Permit.io to implement fine-grained authorization for automotive industry applications.

## LIVE DEMO
Try it out [LIVE HERE](http://nginx-permitio-dev-alb-4vmsoywl-419828416.us-east-1.elb.amazonaws.com/docs)

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
- 📝 **Interactive API Documentation** - Swagger UI for testing authorization policies directly in the browser

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

1. **NGINX API Gateway with Permit.io Lua Module** - Acts as the Policy Enforcement Point (PEP)
2. **Permit.io Sidecar Local (or Cloud) PDP** - Provides centralized Policy Decision Point
3. **Backend Microservices** - Four automotive-focused API services
4. **Authentication Service** - Handles user login and JWT token issuance
5. **Swagger UI Service** - Interactive API documentation and testing interface

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
- For AWS deployment: AWS account, AWS CLI, and Terraform

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

4. Access the Swagger UI for interactive API testing
```
http://localhost:8080/docs/
```
The Swagger UI provides a complete interactive documentation of all API endpoints with:
- Built-in authentication flow
- Pre-configured example requests
- Sample payloads for each endpoint
- Live testing with real-time authorization decisions
- Easy comparison between allowed and denied operations

5. Test the API with curl
```bash
# Login to get a token
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "newuser", "password": "2025DEVChallenge"}'

# Use the token to access a protected resource
curl -X GET http://localhost:8080/api/v1/vehicles \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Next Steps: Configure Authorization Model

After starting the services, you need to configure your authorization model in Permit.io. You have two options:

#### Option 1: One-Click Setup with the Setup Script

To quickly set up the complete authorization model including resources, roles, and permissions:

1. Navigate to the scripts directory
```bash
cd scripts
```

2. Install the required dependencies
```bash
npm install
```

3. Run the setup script
```bash
# Using environment variables from .env file
npm run setup

# Or pass API key directly via command line
node setup.js --api-key your_api_key_here

# For production environments
node setup.js --api-key your_api_key_here --environment prod
```

The script accepts various command line arguments:
```
--api-key <key>      Permit.io API key
--pdp-url <url>      Permit.io PDP URL
--environment <env>  Permit.io environment name
--verbose            Enable verbose logging
--skip-users         Skip creating example users
--help               Display all available options
```

This will automatically create all resources, roles, policies, tenants, and example users in your Permit.io environment.

#### Option 2: Manual Configuration

Alternatively, you can manually configure your authorization model through the Permit.io dashboard by following the steps in our [Configuration Guide](docs/configuration.md).

For detailed setup instructions for either option, see our [Configuration Guide](docs/configuration.md).

## Cloud Deployment

### AWS Deployment with Terraform

This project includes a comprehensive Terraform setup to deploy the NGINX-Permit.io authorization gateway to AWS using:

- Amazon VPC with public and private subnets
- Amazon ECS Fargate for containerized services
- Application Load Balancer for traffic distribution
- AWS Secrets Manager for secure credential storage
- Amazon ECR for container images

#### Deployment Steps

1. Install prerequisites:
   - [AWS CLI](https://aws.amazon.com/cli/)
   - [Terraform](https://www.terraform.io/downloads.html)
   - [Docker](https://www.docker.com/get-started)

2. Configure AWS credentials:
   ```bash
   aws configure
   ```

3. Prepare Terraform variables:
   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your settings, including Permit.io API key
   ```

4. Initialize and apply Terraform:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

5. Deploy Docker images:
   - On Linux/macOS:
     ```bash
     cd ../scripts
     chmod +x deploy.sh
     ./deploy.sh
     ```
   - On Windows:
     ```powershell
     cd ..\scripts
     .\deploy.ps1
     ```

6. Access your deployed application:
   ```bash
   cd ../terraform
   terraform output load_balancer_dns
   ```
   
   The Swagger UI documentation will be available at:
   ```
   http://<load_balancer_dns>/docs/
   ```

7. To destroy the infrastructure when no longer needed:
   ```bash
   terraform destroy
   ```

For detailed AWS deployment instructions and architecture, see our [AWS Deployment Guide](docs/aws-deployment.md).

## API Documentation

Our Connected Vehicle Services Platform exposes multiple RESTful APIs:

- **Authentication API** - User login and profile management
- **Vehicle Telemetry API** - Access to vehicle data
- **Maintenance Service API** - Service records and appointments
- **Fleet Management API** - Fleet operations
- **Driver Analytics API** - Driving behavior and statistics

Each API endpoint has specific authorization requirements based on user roles and resource ownership.

### Interactive API Documentation with Swagger UI

A comprehensive Swagger UI interface is available to interactively explore and test the API:

- **Local Development**: [http://localhost:8080/docs/](http://localhost:8080/docs/)
- **AWS Deployment**: [http://nginx-permitio-dev-alb-4vmsoywl-419828416.us-east-1.elb.amazonaws.com/docs/](http://nginx-permitio-dev-alb-4vmsoywl-419828416.us-east-1.elb.amazonaws.com/docs/)

The Swagger UI provides:
- Complete OpenAPI specification of all endpoints
- Interactive authentication with JWT
- Pre-populated demo credentials (username: "newuser", password: "2025DEVChallenge")
- Test cases for both allowed and denied authorization scenarios
- Example responses for successful and error cases
- Detailed schema documentation for all request/response payloads

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

Integrate Permit.io with NGINX using the Lua module:

```lua
-- In permit.lua module
function _M.check_authorization()
    -- Extract token from the request
    local token = _M.extract_token()
    if not token then
        ngx.status = 401
        ngx.header.content_type = "application/json"
        ngx.say(cjson.encode({ error = "Unauthorized: No valid Bearer token provided" }))
        return ngx.exit(401)
    end
    
    -- Extract user information from token
    local user_info = _M.extract_user_info(token)
    
    -- Determine resource and action from request path and method
    local method = ngx.req.get_method()
    local path = ngx.var.uri
    
    -- Example of resource mapping logic
    local resource = ""
    if string.find(path, "/vehicles") then
        resource = "vehicle"
        resource_id = string.match(path, "/vehicles/([^/]+)")
    end
    
    -- Map HTTP method to action
    local action = ""
    if method == "GET" then
        action = "read"
    elseif method == "POST" then
        action = "create"
    elseif method == "PUT" or method == "PATCH" then
        action = "update"
    elseif method == "DELETE" then
        action = "delete"
    end
    
    -- Make authorization request to PDP
    local httpc = http.new()
    local res, err = httpc:request_uri(pdp_url, {
        method = "POST",
        body = cjson.encode({
            user = {
                key = user_info.user_id,
                -- User attributes
            },
            action = action,
            resource = {
                type = resource,
                key = resource_id or "",
                -- Resource attributes
            }
        }),
        headers = {
            ["Content-Type"] = "application/json",
            ["Authorization"] = "Bearer " .. permit_api_key
        }
    })
    
    -- Handle authorization response
    if res.status == 200 then
        local pdp_response = cjson.decode(res.body)
        if pdp_response.allow == true then
            -- Continue to the backend service
            return true
        else
            -- Return 403 Forbidden with reason
            ngx.status = 403
            ngx.header.content_type = "application/json"
            ngx.say(cjson.encode({
                error = "Forbidden",
                message = pdp_response.reason or "Access denied by policy"
            }))
            return ngx.exit(403)
        end
    end
end
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