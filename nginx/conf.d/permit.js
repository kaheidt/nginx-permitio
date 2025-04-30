function permitio_token(r) {
    // Extract token from the authorization header
    let authHeader = r.headersIn.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return '';
    }
    return authHeader.substring(7); // Remove 'Bearer ' prefix
}

function permitio_check_auth(r) {
    // Using NginxJS async handler
    r.headersOut['Content-Type'] = 'application/json';
    
    r.subrequest('/_auth_check_internal', { method: 'POST' },
        function(res) {
            if (res.status == 200) {
                r.return(200); // Authorization successful
            } else {
                r.return(403, JSON.stringify({ error: "Forbidden: No permission" }));
            }
        }
    );
}

function internal_auth_check(r) {
    // Extract the JWT token
    const token = permitio_token(r);
    if (!token) {
        return r.return(401, JSON.stringify({ error: "Unauthorized: No token provided" }));
    }

    // Get the request method and path from the parent request
    const method = r.variables.request_method;
    const path = r.variables.request_uri;
    
    // Extract resource identifiers from path
    // Example: /api/v1/vehicles/123 -> resource='vehicle', resourceId='123'
    let resource = '';
    let resourceId = '';
    
    if (path.includes('/vehicles')) {
        resource = 'vehicle';
        const match = path.match(/\/vehicles\/([^\/]+)/);
        resourceId = match ? match[1] : '';
    } else if (path.includes('/maintenance')) {
        resource = 'maintenance';
        const match = path.match(/\/maintenance\/([^\/]+)/);
        resourceId = match ? match[1] : '';
    } else if (path.includes('/fleet')) {
        resource = 'fleet';
        const match = path.match(/\/fleet\/([^\/]+)/);
        resourceId = match ? match[1] : '';
    } else if (path.includes('/analytics')) {
        resource = 'analytics';
        const match = path.match(/\/analytics\/([^\/]+)/);
        resourceId = match ? match[1] : '';
    }
    
    // Determine the action based on the HTTP method
    let action = '';
    switch (method) {
        case 'GET':
            action = 'read';
            break;
        case 'POST':
            action = 'create';
            break;
        case 'PUT':
        case 'PATCH':
            action = 'update';
            break;
        case 'DELETE':
            action = 'delete';
            break;
        default:
            action = 'access';
    }
    
    // For development/testing purposes - bypass permit.io check
    // Remove this in production
    return r.return(200, JSON.stringify({ allow: true }));
    
    /* 
    // The following code would be used in production
    
    // Make the request to Permit.io PDP (Policy Decision Point)
    const pdpUrl = process.env.PERMIT_PDP_URL || 'https://cloudpdp.api.permit.io';
    const permitApiKey = process.env.PERMIT_API_KEY;
    const permitEnv = process.env.PERMIT_ENVIRONMENT || 'dev';
    
    // Extract user information from JWT token (requires parsing the JWT)
    const userId = extractUserIdFromToken(token);
    const tenantId = extractTenantIdFromToken(token);
    
    // Prepare the check permission request
    const checkPermissionUrl = `${pdpUrl}/v2/check`;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${permitApiKey}`
    };
    
    const body = JSON.stringify({
        user: userId,
        tenant: tenantId,
        action: action,
        resource: resource,
        environment: permitEnv,
        context: {
            resource_id: resourceId,
            method: method,
            path: path
        }
    });
    
    // Make HTTP request to Permit.io PDP
    ngx.fetch(checkPermissionUrl, {
        method: 'POST',
        headers: headers,
        body: body,
        verify: false
    })
    .then(res => {
        if (res.status === 200) {
            return res.json();
        } else {
            r.return(403, JSON.stringify({ error: "Forbidden: Authorization check failed" }));
            return null;
        }
    })
    .then(data => {
        if (data && data.allow === true) {
            r.return(200, JSON.stringify({ allow: true }));
        } else {
            r.return(403, JSON.stringify({ error: "Forbidden: You don't have permission to access this resource" }));
        }
    })
    .catch(error => {
        r.error(`Authorization check error: ${error.message}`);
        r.return(500, JSON.stringify({ error: "Internal Server Error during authorization" }));
    });
    */
}

// Helper function to extract user ID from JWT token
function extractUserIdFromToken(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        return payload.sub || '';
    } catch (e) {
        return '';
    }
}

// Helper function to extract tenant ID from JWT token
function extractTenantIdFromToken(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        return payload.tenant_id || payload.org_id || '';
    } catch (e) {
        return '';
    }
}

export default { permitio_token, permitio_check_auth, internal_auth_check };