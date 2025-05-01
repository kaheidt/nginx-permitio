# Architecture: API-First Authorization in Automotive Industry

This document outlines the architecture of the AutoSecure API Gateway project, which demonstrates API-First authorization principles using Permit.io integration with NGINX for the automotive industry.

## Overview

The AutoSecure API Gateway implements a pattern where authorization decisions are:
- Externalized from application code
- Enforced at the API gateway level
- Managed through a centralized policy system
- Updated in real-time without service restarts

This approach ensures consistent enforcement of access control policies across all services and APIs.

## Architecture Diagram

```
┌─────────────────┐     ┌─────────────────────────────────────┐     ┌─────────────────┐
│                 │     │                                     │     │                 │
│    Frontend     │────▶│   NGINX with Permit.io NJS Module   │────▶│  Microservices  │
│   Applications  │     │                                     │     │                 │
│                 │     └─────────────────┬───────────────────┘     └─────────────────┘
└─────────────────┘                       │
                                          │
                                          ▼
                           ┌────────────────────────────┐
                           │                            │
                           │     Local PDP Sidecar      │
                           │ (Policy Decision Point)    │
                           │                            │
                           └────────────┬───────────────┘
                                        │
                                        │
                                        ▼
                           ┌────────────────────────────┐
                           │                            │
                           │     Permit.io PAP Cloud    │
                           │ (Policy Administration)    │
                           │                            │
                           └────────────────────────────┘
```

## Key Components

### 1. NGINX API Gateway

The NGINX API Gateway acts as a Policy Enforcement Point (PEP) using the NGINX JavaScript (NJS) module integrated with Permit.io. It:

- Intercepts all API requests
- Extracts authorization context (user, action, resource)
- Makes authorization decisions via the local PDP sidecar
- Routes allowed requests to the appropriate backend service
- Returns 403 Forbidden responses for denied requests

**Key Technologies:**
- NGINX
- NGINX JavaScript (NJS) module
- JWT Authentication

### 2. Local PDP Sidecar

The Permit.io integration now uses a local sidecar container for Policy Decision Point (PDP) functionality:

- **Performance Benefits:** Reduced latency for authorization decisions by avoiding network calls to external services
- **Reliability:** Authorization decisions can be made even if internet connectivity is temporarily interrupted
- **Synchronization:** Automatically syncs with Permit.io cloud to get the latest policies
- **Security:** Keeps authorization decision-making within your infrastructure
- **Caching:** Caches authorization decisions to improve performance

**How Authorization Works:**

1. The gateway extracts the JWT token from the Authorization header
2. User information is decoded from the JWT token
3. Resource and action are determined from the URL path and HTTP method
4. A request is made to the local PDP sidecar to check permissions
5. The PDP returns allow/deny decision based on policies
6. The gateway enforces the decision

### 3. Automotive Backend Services

The system includes several microservices for automotive industry use cases:

- **Vehicle Telemetry Service:** Real-time vehicle data
- **Maintenance Service:** Service records and appointments
- **Fleet Management Service:** Fleet operations and management
- **Driver Analytics Service:** Driving behavior and statistics

### 4. Authentication Service

A separate authentication service provides:

- User registration and login
- JWT token issuance
- User profile management
- Integration with Permit.io for user synchronization

## Authorization Model

The authorization model is based on a combination of:

- **Role-Based Access Control (RBAC):** Permissions assigned to roles
- **Attribute-Based Access Control (ABAC):** Rules based on user and resource attributes
- **Resource-Based Access Control:** Vehicle owners can only access their own vehicles

### Automotive Industry Roles

- **Vehicle Owner:** Access to own vehicle data and maintenance
- **Service Technician:** Access to vehicle diagnostics and service history
- **Fleet Manager:** Access to fleet-wide telemetry and management
- **Insurance Provider:** Limited access to driving behavior data
- **System Administrator:** Complete access to all systems

## Data Flow

1. **Client Authentication:**
   - User authenticates with the Auth Service
   - User receives JWT token with identity and role claims

2. **API Request:**
   - Client makes request to API with JWT token
   - NGINX gateway intercepts request

3. **Authorization:**
   - NGINX extracts JWT and decodes user information
   - NGINX determines resource and action from URL path and method
   - NGINX sends authorization check to local PDP sidecar
   - PDP evaluates policies and returns decision

4. **Request Processing:**
   - If authorized, request is forwarded to backend service
   - If denied, 403 Forbidden response is returned

## Benefits of this Architecture

- **Separation of Concerns:** Authorization logic separate from business logic
- **Consistent Enforcement:** All API requests enforced at the gateway
- **Centralized Policy Management:** Policies managed in one place
- **Real-time Updates:** Policy changes effective immediately without restarts
- **Fine-grained Control:** Detailed policies based on user, resource, action
- **Audit Trail:** Comprehensive logging of all authorization decisions
- **Reduced Developer Burden:** Developers don't need to implement authorization logic
- **Improved Security:** Consistent enforcement reduces risk of policy bypass
- **Lower Latency:** Local PDP sidecar reduces authorization decision time
- **Higher Availability:** Authorization still functions during temporary connectivity issues
- **Reduced Egress Traffic:** No outbound traffic for authorization decisions

## Scalability Considerations

- NGINX and PDP sidecar can be horizontally scaled within each ECS task
- Permit.io cloud connectivity is only needed for policy updates, not for enforcement
- Backend services can be scaled independently based on demand

## Future Enhancements

- Integration with OAuth 2.0 Authorization Server
- Support for delegated authorization (on behalf of)
- Enhanced monitoring and analytics for authorization decisions
- Custom policy extensions for automotive-specific requirements