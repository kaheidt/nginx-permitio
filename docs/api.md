# API Documentation: Connected Vehicle Services Platform

This document outlines the API endpoints provided by the Connected Vehicle Services Platform, including how authorization is enforced for each endpoint.

## Authorization Model

All APIs in the Connected Vehicle Services Platform are protected using API-First authorization with Permit.io. The authorization model includes:

- JWT-based authentication
- Role-based access control (RBAC)
- Attribute-based access control (ABAC)
- Resource-based permissions

### Authorization Header

All API requests must include a valid JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Role-Based Permissions

The following roles are defined in the system:

| Role | Description |
|------|-------------|
| `vehicle_owner` | Individual who owns vehicles |
| `service_technician` | Employee of service centers who maintains vehicles |
| `fleet_manager` | Manager responsible for a fleet of vehicles |
| `insurance_provider` | Insurance company representative with limited access |
| `system_administrator` | Administrative user with complete access |

## Authentication API

The Authentication API allows users to log in, register, and manage their profiles.

### Authentication Endpoints

#### Login

```
POST /auth/login
```

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "token": "string",
  "user": {
    "id": "string",
    "username": "string",
    "firstName": "string",
    "lastName": "string",
    "roles": ["string"],
    "tenantId": "string"
  }
}
```

**Authorization:** No authorization required

#### Get User Profile

```
GET /auth/profile
```

**Response:**
```json
{
  "id": "string",
  "username": "string",
  "firstName": "string",
  "lastName": "string",
  "roles": ["string"],
  "tenantId": "string"
}
```

**Authorization:** User must be authenticated

## Vehicle Telemetry API

The Vehicle Telemetry API provides access to real-time vehicle data.

### Vehicle Telemetry Endpoints

#### Get All Vehicles

```
GET /api/v1/vehicles
```

**Response:**
```json
{
  "vehicles": [
    {
      "vin": "string",
      "make": "string",
      "model": "string",
      "year": "number",
      "owner": "string",
      "telemetry": {
        "odometer": "number",
        "batteryLevel": "number",
        "tirePressure": ["number"],
        "engineHealth": "string",
        "lastUpdated": "string",
        "location": {
          "latitude": "number",
          "longitude": "number"
        }
      }
    }
  ]
}
```

**Authorization:**
- `vehicle_owner`: Can see their own vehicles only
- `service_technician`: Can see basic vehicle data for all vehicles
- `fleet_manager`: Can see all vehicles in their managed fleets
- `system_administrator`: Can see all vehicles

#### Get Vehicle by VIN

```
GET /api/v1/vehicles/:vin
```

**Path Parameters:**
- `vin`: Vehicle Identification Number

**Response:**
```json
{
  "vin": "string",
  "make": "string",
  "model": "string",
  "year": "number",
  "owner": "string",
  "telemetry": {
    "odometer": "number",
    "batteryLevel": "number",
    "tirePressure": ["number"],
    "engineHealth": "string",
    "lastUpdated": "string",
    "location": {
      "latitude": "number",
      "longitude": "number"
    }
  }
}
```

**Authorization:**
- `vehicle_owner`: Can see their own vehicles only
- `service_technician`: Can see vehicles they are servicing
- `fleet_manager`: Can see vehicles in their managed fleets
- `system_administrator`: Can see all vehicles

## Maintenance Service API

The Maintenance Service API provides access to vehicle service records and appointments.

### Maintenance Service Endpoints

#### Get All Service Records

```
GET /api/v1/maintenance
```

**Response:**
```json
{
  "serviceRecords": [
    {
      "id": "string",
      "vin": "string",
      "date": "string",
      "type": "string",
      "description": "string",
      "technician": "string",
      "cost": "number",
      "status": "string"
    }
  ]
}
```

**Authorization:**
- `vehicle_owner`: Can see service records for their own vehicles only
- `service_technician`: Can see service records they worked on
- `fleet_manager`: Can see service records for vehicles in their fleets
- `system_administrator`: Can see all service records

#### Get Service Record by ID

```
GET /api/v1/maintenance/:id
```

**Path Parameters:**
- `id`: Service Record ID

**Response:**
```json
{
  "id": "string",
  "vin": "string",
  "date": "string",
  "type": "string",
  "description": "string",
  "technician": "string",
  "cost": "number",
  "status": "string"
}
```

**Authorization:**
- `vehicle_owner`: Can see service records for their own vehicles only
- `service_technician`: Can see service records they worked on
- `fleet_manager`: Can see service records for vehicles in their fleets
- `system_administrator`: Can see all service records

## Fleet Management API

The Fleet Management API provides access to fleet operations data.

### Fleet Management Endpoints

#### Get All Fleets

```
GET /api/v1/fleet
```

**Response:**
```json
{
  "fleets": [
    {
      "id": "string",
      "name": "string",
      "manager": "string",
      "vehicles": ["string"],
      "region": "string",
      "metrics": {
        "totalVehicles": "number",
        "activeVehicles": "number",
        "inServiceVehicles": "number",
        "averageFuelEfficiency": "number",
        "totalMileage": "number"
      }
    }
  ]
}
```

**Authorization:**
- `fleet_manager`: Can see fleets they manage
- `system_administrator`: Can see all fleets

#### Get Fleet by ID

```
GET /api/v1/fleet/:id
```

**Path Parameters:**
- `id`: Fleet ID

**Response:**
```json
{
  "id": "string",
  "name": "string",
  "manager": "string",
  "vehicles": ["string"],
  "region": "string",
  "metrics": {
    "totalVehicles": "number",
    "activeVehicles": "number",
    "inServiceVehicles": "number",
    "averageFuelEfficiency": "number",
    "totalMileage": "number"
  }
}
```

**Authorization:**
- `fleet_manager`: Can see fleets they manage
- `system_administrator`: Can see all fleets

## Driver Analytics API

The Driver Analytics API provides access to driving behavior data.

### Driver Analytics Endpoints

#### Get All Driver Analytics

```
GET /api/v1/analytics
```

**Response:**
```json
{
  "driverData": {
    "userId": {
      "id": "string",
      "safetyScore": "number",
      "drivingHabits": {
        "averageSpeed": "number",
        "hardBrakes": "number",
        "rapidAccelerations": "number",
        "nightDriving": "string",
        "phoneUsage": "string"
      },
      "mileage": {
        "daily": "number",
        "weekly": "number",
        "monthly": "number"
      },
      "insurance": {
        "provider": "string",
        "agent": "string",
        "premium": "number",
        "discount": "string"
      }
    }
  }
}
```

**Authorization:**
- `vehicle_owner`: Can see their own analytics only
- `insurance_provider`: Can see analytics for their policyholders (limited view)
- `system_administrator`: Can see all analytics

#### Get Driver Analytics by ID

```
GET /api/v1/analytics/:id
```

**Path Parameters:**
- `id`: User ID

**Response:**
```json
{
  "id": "string",
  "safetyScore": "number",
  "drivingHabits": {
    "averageSpeed": "number",
    "hardBrakes": "number",
    "rapidAccelerations": "number",
    "nightDriving": "string",
    "phoneUsage": "string"
  },
  "mileage": {
    "daily": "number",
    "weekly": "number",
    "monthly": "number"
  },
  "insurance": {
    "provider": "string",
    "agent": "string",
    "premium": "number",
    "discount": "string"
  }
}
```

**Authorization:**
- `vehicle_owner`: Can see their own analytics only
- `insurance_provider`: Can see analytics for their policyholders (limited view)
- `system_administrator`: Can see all analytics

## Error Responses

### Authentication Errors

**401 Unauthorized**
```json
{
  "message": "Missing authentication token"
}
```

**401 Unauthorized**
```json
{
  "message": "Invalid credentials"
}
```

**403 Forbidden**
```json
{
  "message": "Invalid or expired token"
}
```

### Authorization Errors

**403 Forbidden**
```json
{
  "message": "You don't have permission to access this resource"
}
```

**403 Forbidden**
```json
{
  "message": "Authorization check failed"
}
```

### Resource Errors

**404 Not Found**
```json
{
  "message": "Resource not found"
}
```

**500 Internal Server Error**
```json
{
  "message": "Internal Server Error during authorization"
}
```