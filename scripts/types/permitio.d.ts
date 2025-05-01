/**
 * Type definitions for Permit.io SDK
 * These types provide strong typing for working with the Permit.io API
 */

declare module 'permitio' {
  export interface Permit {
    api: PermitAPI;
    config: PermitConfig;
  }

  export interface PermitConfig {
    pdp: string;
    environment?: string;
  }

  export interface PermitAPI {
    resources: ResourcesAPI;
    roles: RolesAPI;
    policies: PoliciesAPI;
    tenants: TenantsAPI;
    users: UsersAPI;
  }

  export interface ResourcesAPI {
    get(key: string): Promise<ResourceType>;
    list(): Promise<ResourceType[]>;
    create(key: string, resource: ResourceType): Promise<ResourceType>;
    update(key: string, resource: ResourceType): Promise<ResourceType>;
  }

  export interface RolesAPI {
    get(key: string): Promise<Role>;
    list(): Promise<Role[]>;
    create(key: string, role: Role): Promise<Role>;
    update(key: string, role: Role): Promise<Role>;
    assignPermissions(roleKey: string, permissions: { permissions: Permission[] }): Promise<void>;
  }

  export interface PoliciesAPI {
    list(): Promise<Policy[]>;
    create(policy: Policy): Promise<Policy>;
  }

  export interface TenantsAPI {
    get(key: string): Promise<Tenant>;
    list(): Promise<Tenant[]>;
    create(tenant: Tenant): Promise<Tenant>;
    update(key: string, tenant: Tenant): Promise<Tenant>;
  }

  export interface UsersAPI {
    get(key: string): Promise<User>;
    list(): Promise<User[]>;
    create(user: User): Promise<User>;
    update(key: string, user: User): Promise<User>;
    assignRole(assignParams: RoleAssignment): Promise<void>;
    getRoles?(key: string): Promise<UserRole[]>; // Make optional as it may not exist in the library
  }

  export interface ResourceType {
    name: string;
    description: string;
    actions: {
      [key: string]: {
        name: string;
      };
    };
    attributes: {
      [key: string]: {
        type: string;
        description: string;
        required?: boolean;
      };
    };
  }

  export interface Role {
    name: string;
    description: string;
    permissions: string[];
  }

  export interface Policy {
    role: string;
    resource: string;
    action: string;
    condition?: {
      rule: {
        operator: string;
        left: { resourceAttr: string } | { userAttr: string };
        right: { resourceAttr: string } | { userAttr: string } | { value: any };
      };
    };
  }

  export interface Tenant {
    key: string;
    name: string;
    description: string;
  }

  export interface User {
    key: string;
    email: string;
    first_name: string;
    last_name: string;
    attributes?: {
      [key: string]: any;
    };
  }

  export interface RoleAssignment {
    user: string;
    role: string;
    tenant: string;
  }

  export interface UserRole {
    role: string;
    tenant: string;
  }

  // Custom error type for better error handling
  export interface PermitError extends Error {
    status: number;
    data?: any;
  }

  export class Permit {
    constructor(config: {
      token: string;
      pdp?: string;
      environment?: string;
    });
  }
}