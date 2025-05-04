-- Permit.io authorization module for NGINX (using Lua)
local cjson = require "cjson.safe"  -- Safe version to handle JSON errors
local http = require "resty.http"

-- Use a more reliable method to access environment variables
local function get_env(name, default)
    -- Try to get from os.getenv first (most reliable)
    local env_value = os.getenv(name)
    if env_value and env_value ~= "" then
        return env_value
    end
    
    -- Try to get from nginx variable as fallback
    local var_value = ngx.var[name:lower()] or ngx.var[name] or ""
    if var_value and var_value ~= "" then
        return var_value
    end
    
    -- Return default if provided
    return default or ""
end

local _M = {}

-- Helper function to decode JWT payload
local function decode_jwt_payload(token)
    local _, _, payload_b64 = string.find(token, "([^%.]+)%.[^%.]+$")
    if not payload_b64 then
        ngx.log(ngx.WARN, "Failed to extract payload from JWT token")
        return nil
    end
    
    -- Add padding if needed
    local padding = 4 - (#payload_b64 % 4)
    if padding < 4 then
        payload_b64 = payload_b64 .. string.rep("=", padding)
    end
    
    -- Use ngx.decode_base64 for JWT decoding
    local payload = ngx.decode_base64(payload_b64)
    if not payload then
        ngx.log(ngx.WARN, "Failed to base64 decode JWT payload")
        return nil
    end
    
    -- Use pcall for safer JSON decoding
    local ok, decoded = pcall(cjson.decode, payload)
    if not ok then
        ngx.log(ngx.ERR, "Failed to decode JWT payload: ", decoded)
        return nil
    end
    
    return decoded
end

-- Extract token from authorization header
function _M.extract_token()
    local auth_header = ngx.req.get_headers()["Authorization"]
    if not auth_header then
        ngx.log(ngx.WARN, "No Authorization header found")
        return nil
    end
    
    if not string.find(auth_header, "Bearer%s") then
        ngx.log(ngx.WARN, "Authorization header does not contain Bearer token")
        return nil
    end
    
    local token = string.gsub(auth_header, "Bearer%s", "")
    return token
end

-- Extract user information from JWT token
function _M.extract_user_info(token)
    local payload = decode_jwt_payload(token)
    if not payload then
        return nil
    end
    
    -- Log the payload for debugging
    ngx.log(ngx.DEBUG, "JWT payload: ", cjson.encode(payload or {}))
    
    return {
        user_id = payload.sub or "",
        first_name = payload.given_name or payload.firstName or "Unknown",
        last_name = payload.family_name or payload.lastName or "User",
        email = payload.email or "",
        tenant_id = payload.tenant_id or payload.org_id or payload.tenantId or "",
        roles = payload.roles or {}
    }
end

-- Check authorization with Permit.io PDP sidecar
function _M.check_authorization()
    -- Log to ensure this function is being called
    ngx.log(ngx.INFO, "Starting authorization check")

    -- Extract token
    local token = _M.extract_token()
    if not token then
        ngx.status = 401
        ngx.header.content_type = "application/json"
        ngx.say(cjson.encode({ error = "Unauthorized: No valid Bearer token provided" }))
        return ngx.exit(401)
    end
    
    -- Get user information from token
    local user_info = _M.extract_user_info(token)
    if not user_info or not user_info.user_id or user_info.user_id == "" then
        ngx.status = 401
        ngx.header.content_type = "application/json"
        ngx.say(cjson.encode({ error = "Unauthorized: Invalid or malformed token" }))
        return ngx.exit(401)
    end
    
    -- Get API key and other config from environment with multiple fallback options
    local permit_api_key = get_env("PERMIT_API_KEY", "")
    local pdp_url_base = get_env("LOCAL_PERMIT_PDP_URL", get_env("PERMIT_PDP_URL", "http://pdp-sidecar:7000"))
    local permit_env = get_env("PERMIT_ENVIRONMENT", "dev")
    
    ngx.log(ngx.INFO, "Environment check: " ..
        "API Key: " .. (permit_api_key ~= "" and "found" or "not found") ..
        ", PDP URL: " .. pdp_url_base ..
        ", Environment: " .. permit_env)
    
    -- If still no API key, return error
    if permit_api_key == "" then
        ngx.log(ngx.ERR, "Missing API key for authorization")
        ngx.status = 500
        ngx.header.content_type = "application/json"
        ngx.say(cjson.encode({ 
            error = "Internal Server Error",
            message = "Missing API key for authorization"
        }))
        return ngx.exit(500)
    end
    
    -- Log API key (masked) for debugging
    local masked_key = "..."
    if #permit_api_key > 8 then
        masked_key = string.sub(permit_api_key, 1, 4) .. "..." .. string.sub(permit_api_key, -4)
    end
    ngx.log(ngx.INFO, "Using API key: " .. masked_key)
    
    -- Parse request path to determine resource and action
    local method = ngx.req.get_method()
    local path = ngx.var.uri
    
    -- Extract resource identifiers from path
    local resource = ""
    local resource_id = ""
    local resource_attributes = {}
    
    if string.find(path, "/vehicles") then
        resource = "vehicle"
        resource_id = string.match(path, "/vehicles/([^/]+)")
        if resource_id then
            resource_attributes = { vehicle_ids = {resource_id} }
        else
            resource_attributes = { vehicle_ids = {} }
        end
    elseif string.find(path, "/maintenance") then
        resource = "maintenance"
        resource_id = string.match(path, "/maintenance/([^/]+)")
        if resource_id then
            resource_attributes = { maintenance_id = resource_id }
        end
    elseif string.find(path, "/fleet") then
        resource = "fleet"
        resource_id = string.match(path, "/fleet/([^/]+)")
        if resource_id then
            resource_attributes = { fleet_id = resource_id }
        end
    elseif string.find(path, "/analytics") then
        resource = "analytics"
        resource_id = string.match(path, "/analytics/([^/]+)")
        if resource_id then
            resource_attributes = { report_id = resource_id }
        end
    end
    
    -- Add request context to resource attributes
    resource_attributes.request_path = path
    resource_attributes.request_method = method
    
    -- Determine action based on HTTP method
    local action = ""
    if method == "GET" then
        action = "read"
    elseif method == "POST" then
        action = "create"
    elseif method == "PUT" or method == "PATCH" then
        action = "update"
    elseif method == "DELETE" then
        action = "delete"
    else
        action = "access"
    end
    
    -- Log authorization information
    ngx.log(ngx.INFO, string.format(
        "Authorization check for user=%s action=%s resource=%s resourceId=%s tenantId=%s",
        user_info.user_id, action, resource, resource_id or "", user_info.tenant_id
    ))
    
    -- Prepare request payload for PDP
    local payload = {
        user = {
            key = user_info.user_id,
            firstName = user_info.first_name,
            lastName = user_info.last_name,
            email = user_info.email,
            roles = user_info.roles,
            tenant = user_info.tenant_id
        },
        action = action,
        resource = {
            type = resource,
            key = resource_id or "",
            tenant = user_info.tenant_id,
            attributes = resource_attributes
        },
        context = {
            tenant = user_info.tenant_id,
            environment = permit_env
        }
    }
    
    -- Convert payload to JSON
    local json_payload = cjson.encode(payload)
    
    -- Log PDP request payload
    ngx.log(ngx.DEBUG, "PDP request payload: " .. json_payload)
    
    -- Make HTTP request to PDP sidecar
    local httpc = http.new()
    httpc:set_timeout(5000) -- 5 second timeout

    -- Extract the protocol, host and path from pdp_url_base
local protocol, host, port
local pattern = "^(https?)://([^:/]+):?(%d*)(.*)$"
local proto_match, host_match, port_match, path_match = string.match(pdp_url_base, pattern)

protocol = proto_match or "http"
host = host_match or "localhost" 
port = port_match ~= "" and port_match or "7000"

-- Force using direct IP for localhost in AWS ECS
if host == "localhost" or host == "pdp-sidecar" then
    -- In AWS ECS, containers within the same task share network namespace,
    -- so localhost (127.0.0.1) will work correctly
    host = "127.0.0.1"
end

    
    local pdp_url = pdp_url_base .. "/allowed"
    ngx.log(ngx.INFO, "Making request to PDP: " .. pdp_url)
    
    local res, err = httpc:request_uri(pdp_url, {
        method = "POST",
        body = json_payload,
        headers = {
            ["Content-Type"] = "application/json",
            ["Authorization"] = "Bearer " .. permit_api_key
        }
    })
    
    -- Handle HTTP errors
    if not res then
        ngx.log(ngx.ERR, "Failed to call PDP: " .. (err or "unknown error"))
        ngx.status = 500
        ngx.header.content_type = "application/json"
        ngx.say(cjson.encode({ 
            error = "Internal Server Error",
            message = "Error communicating with authorization service"
        }))
        return ngx.exit(500)
    end
    
    -- Log PDP response
    ngx.log(ngx.INFO, "PDP response status: " .. res.status)
    ngx.log(ngx.DEBUG, "PDP response body: " .. res.body)
    
    -- Process PDP response
    if res.status == 200 then
        local ok, pdp_response = pcall(cjson.decode, res.body)
        if not ok or not pdp_response then
            ngx.log(ngx.ERR, "Failed to parse PDP response: " .. res.body)
            ngx.status = 500
            ngx.header.content_type = "application/json"
            ngx.say(cjson.encode({ 
                error = "Internal Server Error", 
                message = "Failed to parse authorization response"
            }))
            return ngx.exit(500)
        end
        
        if pdp_response.allow == true then
            -- Add permission details to request headers for downstream services
            ngx.req.set_header("X-User-ID", user_info.user_id)
            ngx.req.set_header("X-Tenant-ID", user_info.tenant_id)
            ngx.req.set_header("X-Authorization-Decision", "allowed")
            
            -- Access granted, continue to the backend service
            return true
        else
            -- Get reason from response if available
            local reason = "Access denied by policy"
            if pdp_response.reason then
                reason = pdp_response.reason
            end
            
            -- Log the denial
            ngx.log(ngx.WARN, string.format(
                "Authorization denied for user=%s action=%s resource=%s reason='%s'",
                user_info.user_id, action, resource, reason
            ))
            
            -- Return 403 Forbidden with reason
            ngx.status = 403
            ngx.header.content_type = "application/json"
            ngx.say(cjson.encode({
                error = "Forbidden",
                message = reason
            }))
            return ngx.exit(403)
        end
    else
        -- Handle non-200 responses from PDP
        local error_message = "Authorization service error"
        local ok, error_body = pcall(cjson.decode, res.body)
        if ok and error_body and error_body.message then
            error_message = error_body.message
        end
        
        ngx.log(ngx.ERR, string.format(
            "PDP returned error: status=%d message='%s'",
            res.status, error_message
        ))
        
        ngx.status = res.status
        ngx.header.content_type = "application/json"
        ngx.say(cjson.encode({
            error = "Authorization Error",
            message = error_message
        }))
        return ngx.exit(res.status)
    end
end

return _M