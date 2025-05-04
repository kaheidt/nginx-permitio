# Development Journal: Building API-First Authorization for Automotive APIs

This document chronicles our journey in implementing API-First authorization principles using Permit.io and NGINX for the automotive industry. It captures key design decisions, challenges faced, and lessons learned throughout the development process.

## Project Genesis

### The Problem Space

Traditional authorization in automotive industry applications faces several challenges:

1. **Complex Access Control Requirements** - Different user roles need varying access to vehicle data, making authorization complex
2. **Scattered Authorization Logic** - Authorization rules spread across microservices lead to inconsistency
3. **Changing Regulations** - Privacy and security regulations for vehicle data are evolving
4. **Policy Agility** - Business needs demand rapid changes to authorization policies

We identified API-First authorization as an approach to addressing these challenges by:
- Centralizing authorization policies
- Enforcing them at the API gateway level
- Making policy changes without code deployments
- Providing consistent enforcement across all APIs

### Industry-Specific Requirements

For the automotive industry, we needed to consider:

- **Vehicle Ownership** - Vehicle owners should access only their own vehicles
- **Service Provider Access** - Service centers need limited access to vehicle diagnostics
- **Fleet Management** - Fleet managers need aggregate views of multiple vehicles
- **Insurance Provider Access** - Insurance companies need limited access to driving habits
- **Regulatory Compliance** - Different jurisdictions have varying requirements on data access

## Design Decision: Architecture

### Decision: API Gateway Authorization Enforcement

We chose to implement authorization at the NGINX API gateway level instead of within each microservice.

**Pros:**
- Single enforcement point for all API calls
- Consistent policy application
- Simplified microservices that focus on business logic
- Ability to centrally monitor and audit access

**Cons:**
- Gateway becomes a critical security component
- Requires careful design to avoid performance bottlenecks
- Needs detailed context about users and resources

### Decision: Permit.io for Policy Decision

We selected Permit.io as our Policy Decision Point (PDP) for several reasons:

- **Cedar Policy Language** - Expressive policy language suited for complex rules
- **REST API** - Simple integration with NGINX via HTTP calls
- **Managed Service** - Reduces operational overhead
- **Real-time Updates** - Policy changes take effect immediately
- **Audit Logging** - Comprehensive auditing of all authorization decisions

## Design Decision: Authorization Model

### Decision: Combined RBAC and ABAC Approach

We implemented a hybrid model that combines:

- **Role-Based Access Control (RBAC)** - For coarse-grained permissions based on user roles
- **Attribute-Based Access Control (ABAC)** - For fine-grained rules based on user and resource attributes

This approach allowed us to:
- Define baseline permissions for roles (vehicle owner, service technician, etc.)
- Apply fine-grained rules based on vehicle ownership, fleet assignment, etc.
- Create relationship-based access rules (e.g., technicians only see vehicles they service)

### Decision: Multi-tenant Resource Model

We designed our resource model to support multi-tenancy:

- **Personal Vehicles Tenant** - For individual vehicle owners
- **Service Providers Tenant** - For automotive service centers
- **Fleet Operators Tenant** - For companies managing vehicle fleets
- **Insurance Companies Tenant** - For insurance providers

This separation ensures proper data isolation while allowing cross-tenant access when needed.

## Implementation Challenges

### Challenge: JWT Token Integration

**Problem:** The NGINX JavaScript module needed to extract and validate JWT tokens to identify users for authorization decisions.

**Solution:** We implemented custom JavaScript functions within the NGINX NJS module to:
1. Extract JWT tokens from Authorization headers
2. Parse claims to identify user, roles, and tenant
3. Pass this information to Permit.io for policy evaluation

### Challenge: Resource Mapping from URLs

**Problem:** Mapping API URLs to authorization resources and extracting resource IDs consistently.

**Solution:** We created a pattern-matching system in the NGINX JavaScript module:

```javascript
if (path.includes('/vehicles')) {
  resource = 'vehicle';
  const match = path.match(/\/vehicles\/([^\/]+)/);
  resourceId = match ? match[1] : '';
}
```

This approach allowed us to consistently identify resource types and IDs from URL paths.

### Challenge: Forwarding User Context to Backend Services

**Problem:** Even with gateway-level authorization, backend services still needed user context.

**Solution:** We used NGINX's proxy capabilities to forward authorized user information:

```nginx
auth_request_set $authorization $upstream_http_authorization;
proxy_set_header Authorization $authorization;
```

This ensured that backend services received user context while being relieved of authorization duties.

## Performance Considerations

### Optimization: Authorization Decision Caching

Initial performance tests showed that authorization checks added latency. We explored caching options:

1. **TTL-based Caching** - Cache decisions for a limited time
2. **Invalidation-based Caching** - Invalidate cache when policies change

We implemented a simple TTL-based caching strategy to reduce calls to Permit.io's PDP for repeated identical requests.

### Optimization: Batch Authorization Requests

For APIs that needed multiple authorization checks (e.g., retrieving lists of vehicles), we utilized Permit.io's batch authorization API to reduce network round-trips.

## Security Considerations

### JWT Token Handling

We implemented several security measures for JWT handling:

- Token validation including signature verification
- Verification of token claims (issuer, audience, expiration)
- Protection against token tampering

### Defense in Depth

Despite gateway-level authorization, we maintained some basic access checks in backend services as a defense-in-depth measure.

## Testing Approach

We developed a comprehensive testing strategy:

1. **Unit Tests** - For individual components like JWT parsing
2. **Integration Tests** - For the NGINX-Permit.io integration
3. **Policy Tests** - Testing various policy scenarios
4. **Role-based Scenario Tests** - End-to-end tests for each user role

Our test suite included positive and negative test cases to verify both allowed and denied access patterns.

## Lessons Learned

### Lesson 1: Start with Clear Authorization Requirements

Having clearly defined authorization requirements before implementation was crucial. We documented:
- What resources exist in the system
- Who should have access to which resources
- Under what conditions access should be granted or denied

### Lesson 2: Design for Policy Changes

Our design prioritized making policy changes easy and safe. This paid dividends when we needed to:
- Add a new role (Dealership Staff)
- Modify permissions for existing roles
- Implement emergency access patterns

### Lesson 3: Factor in Authorization Context

The more context available during authorization decisions, the more sophisticated the policies could be. We worked to ensure:
- Rich user context in JWT tokens
- Resource attributes available at decision time
- Environmental factors (time, location) when relevant

## Future Improvements

### Enhanced Policy Testing Tools

Development of specialized tools to test authorization policies would improve the development experience by:
- Visualizing policy effects
- Simulating different user scenarios
- Identifying conflicts or gaps in policies

### Delegated Administration

Supporting delegated administration would allow:
- Fleet managers to assign permissions within their fleet
- Service center managers to manage technician permissions
- Vehicle owners to grant temporary access to other users

### Policy Analytics

Adding analytics on policy usage and decisions would provide insights into:
- Which policies are frequently triggered
- Which resources face the most access attempts
- Patterns of denied access that might indicate issues

## Conclusion

Implementing API-First authorization for automotive industry APIs demonstrated the power of externalizing authorization from application code. By enforcing policies at the API gateway level using Permit.io's policy engine, we achieved:

- **Consistent Policy Enforcement** - All API requests subject to the same policy evaluation
- **Simplified Service Implementation** - Backend services focused on business logic, not authorization
- **Agile Policy Management** - Policy changes without code or deployment changes
- **Comprehensive Audit Trail** - Complete visibility into authorization decisions

This approach proved especially valuable for the automotive industry's complex access control requirements, where vehicle ownership, fleet management, and service provider access patterns create a challenging authorization landscape.

## Architectural Evolution

### Decision: Switching from Cloud PDP to Local PDP Sidecar

After our initial implementation using the Permit.io cloud-hosted Policy Decision Point (PDP), we transitioned to a local PDP sidecar architecture to improve performance and reliability.

**Reasons for Change:**
- **Latency Reduction** - Authorization decisions now happen locally without network calls to external services
- **Higher Availability** - System continues to function even during temporary internet connectivity issues
- **Reduced Egress Traffic** - No outbound traffic for authorization decisions, only policy synchronization
- **Enhanced Security** - Authorization decisions remain within our infrastructure boundary

**Implementation Approach:**

1. **Sidecar Container**: Added a Permit.io PDP sidecar container to run alongside the NGINX gateway
   ```yaml
   pdp-sidecar:
     image: permitio/pdp-v2:latest
     environment:
       - PDP_API_KEY=${PERMIT_API_KEY}
       - PDP_LISTENER_URL=0.0.0.0:7000
   ```

2. **Updated Authorization Flow**: Modified NGINX JavaScript module to communicate with the local PDP endpoint
   ```javascript
   const pdpUrl = process.env.PERMIT_LOCAL_PDP_URL || 'http://pdp-sidecar:7000';
   // Make HTTP request to local PDP sidecar
   ```

3. **Container Dependencies**: Ensured the NGINX container starts after the PDP sidecar is ready
   ```yaml
   depends_on:
     - pdp-sidecar
   ```

4. **AWS Infrastructure Updates**: Modified our ECS task definitions and security groups to accommodate the sidecar architecture

**Benefits Realized:**

- **Average Latency Improvement**: Authorization decisions now take <5ms compared to 100-200ms with the cloud PDP
- **Reliability**: Authorization continues to function during brief cloud connectivity interruptions
- **Cost Efficiency**: Reduced outbound API calls significantly lowered data transfer costs
- **Simplified Debugging**: Local PDP makes it easier to troubleshoot authorization issues

**Challenges Overcome:**

1. **Container Orchestration**: Ensuring proper startup order between the PDP sidecar and the NGINX container
2. **Policy Synchronization**: Configuring the PDP sidecar to periodically sync policies from Permit.io cloud
3. **Resource Allocation**: Balancing memory and CPU allocation between the NGINX container and PDP sidecar

### Infrastructure Considerations for PDP Sidecar

When deploying the sidecar architecture to AWS, we had to make several adjustments:

1. **ECS Task Definition**: Updated to include the PDP sidecar container alongside the NGINX container
2. **IAM Permissions**: Enhanced the task role to allow the PDP sidecar to fetch policies from Permit.io
3. **Health Checks**: Implemented health checks for the PDP sidecar to ensure proper functioning
4. **Log Configuration**: Set up CloudWatch log groups for monitoring PDP sidecar operations

The migration from cloud PDP to local PDP sidecar represents a significant architectural improvement that aligns with edge computing principles—bringing the authorization decisions closer to where they're needed for optimal performance.

### Decision: Migrating from NGINX JavaScript (NJS) to Lua with OpenResty

After encountering stability issues with the NGINX JavaScript module for authorization handling, we made the strategic decision to migrate to Lua with OpenResty.

**Reasons for Change:**
- **Request Handling Reliability**: Initial implementation with JavaScript encountered issues where client requests would time out after service URL calls
- **Synchronous Programming Model**: Lua's synchronous approach simplifies request handling compared to JavaScript's asynchronous model
- **Better Integration with NGINX**: Lua integrates more naturally with NGINX's request processing phases
- **Mature Ecosystem**: OpenResty provides robust libraries like `lua-resty-http` for making HTTP requests to the PDP
- **Production Reliability**: OpenResty is widely adopted for high-traffic API gateways in production environments

**Implementation Approach:**

1. **OpenResty Base Image**: Switched from standard NGINX to the OpenResty Alpine image
   ```dockerfile
   FROM openresty/openresty:alpine
   ```

2. **Lua Module Development**: Created a dedicated Lua module with clear authorization logic
   ```lua
   local _M = {}
   
   function _M.check_authorization()
     -- Extract token and user information
     -- Make authorization decision request to PDP
     -- Handle response and enforce decision
   end
   
   return _M
   ```

3. **NGINX Configuration Update**: Replaced JavaScript directives with Lua directives
   ```nginx
   access_by_lua_block {
       local permit = require("permit")
       permit.check_authorization()
   }
   ```

4. **HTTP Client Improvement**: Utilized OpenResty's `lua-resty-http` library for more reliable HTTP communication with the PDP sidecar

**Benefits Realized:**

- **Request Completion Reliability**: Eliminated the issue of hanging client requests after PDP calls
- **Simplified Debugging**: Lua's synchronous code flow is easier to debug compared to JavaScript Promises
- **Performance Improvements**: Reduced latency in authorization checks with more efficient request handling
- **Better Error Handling**: More robust error handling with clearer error responses to clients
- **Reduced Memory Usage**: Lua typically uses less memory than the JavaScript engine in NGINX

**Challenges Overcome:**

1. **Knowledge Transfer**: Required team to learn Lua programming paradigms
2. **JWT Handling**: Re-implementing JWT token parsing and validation in Lua
3. **Configuration Updates**: Adjusting NGINX configuration to properly load and utilize Lua modules
4. **Testing Methodology**: Developing new testing strategies for the Lua-based implementation
5. **Experimenting With Permit.io Framework**: Had to pass contextual info as array attributes for proper condition rule application

This architectural change highlights the importance of selecting the right tools for critical components like authorization. The migration to Lua with OpenResty provided a more reliable foundation for our API-First authorization approach, ensuring consistent and performant policy enforcement at the API gateway layer.