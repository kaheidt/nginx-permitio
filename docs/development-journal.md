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