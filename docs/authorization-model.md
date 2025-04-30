# Authorization Model: API-First Authorization with Permit.io

This document outlines the authorization model implemented in the AutoSecure API Gateway project for the automotive industry. It explains how we leverage Permit.io's declarative policy framework to implement fine-grained access control.

## Authorization Design Principles

Our API-First authorization implementation follows these key principles:

1. **Separation of Concerns**: Authorization logic is completely external to business logic
2. **Declarative Policies**: Permissions expressed as declarative rules, not code
3. **API Gateway Enforcement**: Authorization decisions enforced at API gateway level
4. **Centralized Management**: Single source of truth for all authorization policies
5. **Dynamic Updates**: Policy changes take effect immediately without redeployments

## Core Authorization Concepts

### Resources

Resources represent the objects that users can access in our automotive platform:

| Resource | Description | Examples |
|----------|-------------|----------|
| `vehicle` | Connected vehicles in the system | Personal vehicles, fleet vehicles |
| `maintenance` | Service records and maintenance data | Repair records, service history |
| `fleet` | Groups of vehicles managed together | Delivery fleets, service fleets |
| `analytics` | Driver behavior and vehicle analytics | Safety scores, driving patterns |

### Actions

Actions represent operations that can be performed on resources:

| Action | HTTP Method | Description |
|--------|-------------|-------------|
| `read` | GET | View resource data |
| `create` | POST | Create new resources |
| `update` | PUT/PATCH | Modify existing resources |
| `delete` | DELETE | Remove resources |

### Roles

Roles represent job functions or responsibilities in the automotive ecosystem:

| Role | Description | Permissions |
|------|-------------|------------|
| `vehicle_owner` | Individual who owns vehicles | Read own vehicle data, maintenance records |
| `service_technician` | Maintenance professional | Read vehicle diagnostics, create/update maintenance records |
| `fleet_manager` | Fleet operations manager | Read/update fleet data and vehicle assignments |
| `insurance_provider` | Insurance company representative | Read driver analytics data (limited) |
| `system_administrator` | System admin with full access | All permissions on all resources |

### Resource Relationships

The relationships between resources define our ownership model:

```
Vehicle Owner → owns → Vehicles
Service Technician → services → Vehicles → generates → Maintenance Records
Fleet Manager → manages → Fleets → contains → Vehicles
Insurance Provider → covers → Vehicle Owners → generates → Driver Analytics
```

## Implementing Authorization with Permit.io

### 1. Resource Definition in Permit.io

Resources are defined in Permit.io with their associated attributes:

```json
{
  "vehicle": {
    "attributes": {
      "vin": "string",
      "owner_id": "string",
      "fleet_id": "string"
    }
  },
  "maintenance": {
    "attributes": {
      "vehicle_vin": "string",
      "technician_id": "string"
    }
  },
  "fleet": {
    "attributes": {
      "manager_id": "string"
    }
  },
  "analytics": {
    "attributes": {
      "user_id": "string",
      "insurance_agent_id": "string"
    }
  }
}
```

### 2. Role Definition and Permission Assignment

Roles are defined in Permit.io with their associated permissions:

```json
{
  "roles": {
    "vehicle_owner": {
      "permissions": [
        { "resource": "vehicle", "action": "read", "condition": "resource.owner_id == user.id" },
        { "resource": "maintenance", "action": "read", "condition": "resource.vehicle_vin in user.vehicles" }
      ]
    },
    "service_technician": {
      "permissions": [
        { "resource": "vehicle", "action": "read" },
        { "resource": "maintenance", "action": "read", "condition": "resource.technician_id == user.id" },
        { "resource": "maintenance", "action": "create" },
        { "resource": "maintenance", "action": "update", "condition": "resource.technician_id == user.id" }
      ]
    },
    "fleet_manager": {
      "permissions": [
        { "resource": "fleet", "action": "read", "condition": "resource.manager_id == user.id" },
        { "resource": "fleet", "action": "update", "condition": "resource.manager_id == user.id" },
        { "resource": "vehicle", "action": "read", "condition": "resource.fleet_id in user.managed_fleets" }
      ]
    },
    "insurance_provider": {
      "permissions": [
        { "resource": "analytics", "action": "read", "condition": "resource.insurance_agent_id == user.id" }
      ]
    },
    "system_administrator": {
      "permissions": [
        { "resource": "*", "action": "*" }
      ]
    }
  }
}
```

### 3. Multi-tenancy Model

Our authorization model supports multi-tenancy to separate different organizations:

- **Personal Vehicles Tenant**: Individual vehicle owners
- **Service Providers Tenant**: Automotive service centers
- **Fleet Operators Tenant**: Companies managing vehicle fleets
- **Insurance Companies Tenant**: Insurance providers

Users are assigned roles within specific tenants, providing clear separation of duties and data.

## Attribute-Based Access Control (ABAC)

Our model uses ABAC to implement fine-grained authorization rules based on:

1. **User Attributes**:
   - User ID
   - Role
   - Tenant
   - Owned vehicles
   - Managed fleets
   - Service regions

2. **Resource Attributes**:
   - Owner ID
   - Vehicle VIN
   - Fleet ID
   - Manager ID
   - Technician ID

3. **Environmental Attributes**:
   - Time of access
   - IP address
   - Device type

### Example ABAC Rules

#### Vehicle Owner Access Control

```cedar
permit(
  principal in VehicleOwner,
  action == "read",
  resource in Vehicle
)
when { resource.owner_id == principal.id };
```

#### Service Technician Access Control

```cedar
permit(
  principal in ServiceTechnician,
  action == "read",
  resource in Vehicle
);

permit(
  principal in ServiceTechnician,
  action in ["create", "update"],
  resource in MaintenanceRecord
)
when { resource.technician_id == principal.id };
```

#### Fleet Manager Access Control

```cedar
permit(
  principal in FleetManager,
  action == "read",
  resource in Fleet
)
when { resource.manager_id == principal.id };

permit(
  principal in FleetManager,
  action == "read",
  resource in Vehicle
)
when { resource.fleet_id in principal.managed_fleets };
```

## Authorization Flow in NGINX API Gateway

1. **JWT Token Extraction**:
   - Extract JWT from Authorization header
   - Decode user information and roles

2. **Resource Context Building**:
   - Parse HTTP method to determine action
   - Parse URL path to determine resource type and ID
   - Extract resource attributes from URL parameters or path segments

3. **Authorization Decision**:
   - Send authorization check to Permit.io PDP with:
     - User information (ID, roles, tenant)
     - Action being performed
     - Resource type and attributes
     - Environmental context

4. **Access Control Enforcement**:
   - If authorized, proxy request to backend service
   - If denied, return 403 Forbidden response

## Automotive Industry-Specific Authorization Patterns

### 1. Vehicle Ownership Verification

Vehicle owners can only access vehicles they own:

```
GET /api/v1/vehicles/VIN123456789
```

Authorization check:
```json
{
  "user": "vehicle-owner-1",
  "action": "read",
  "resource": "vehicle",
  "context": {
    "resource_id": "VIN123456789",
    "owner_id": "vehicle-owner-1"
  }
}
```

### 2. Fleet Management Boundaries

Fleet managers can only access fleets they manage:

```
GET /api/v1/fleet/delivery-fleet-east
```

Authorization check:
```json
{
  "user": "fleet-mgr-1",
  "action": "read",
  "resource": "fleet",
  "context": {
    "resource_id": "delivery-fleet-east",
    "manager_id": "fleet-mgr-1"
  }
}
```

### 3. Insurance Data Access Limitations

Insurance providers have limited access to driver analytics:

```
GET /api/v1/analytics/vehicle-owner-1
```

Authorization check:
```json
{
  "user": "insurance-agent-1",
  "action": "read",
  "resource": "analytics",
  "context": {
    "resource_id": "vehicle-owner-1",
    "insurance_agent_id": "insurance-agent-1",
    "data_categories": ["safety_score", "driving_habits"]
  }
}
```

## Authorization Audit and Monitoring

All authorization decisions are logged for audit purposes:

```json
{
  "timestamp": "2025-04-30T10:15:30Z",
  "user": "service-tech-1",
  "action": "read",
  "resource": "vehicle",
  "resource_id": "VIN123456789",
  "decision": "allow",
  "policy_id": "policy-456",
  "tenant": "acme-auto-service"
}
```

These logs provide visibility into:
- Who accessed what resources
- When access occurred
- Whether access was allowed or denied
- Which policy rule made the decision

## Conclusion

The API-First authorization model implemented with Permit.io in our AutoSecure API Gateway provides:

1. **Fine-grained access control** appropriate for the automotive industry
2. **Declarative policy management** separate from application code
3. **Consistent enforcement** at the API gateway level
4. **Real-time policy updates** without service disruption
5. **Comprehensive audit trail** of all authorization decisions

This approach demonstrates how authorization can be treated as a first-class concern in API design, enhancing security and flexibility while reducing development complexity.