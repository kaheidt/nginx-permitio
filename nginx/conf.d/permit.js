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
                // Return 403 instead of letting the request continue
                r.return(403, JSON.stringify({ error: "Forbidden: Access denied by authorization policy" }));
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
    
    // Extract user information from JWT token
    const userId = extractUserFromToken(token);
    const firstName = extractFirstNameFromToken(token) || 'Unknown';
    const lastName = extractLastNameFromToken(token) || 'User';
    const tenantId = extractTenantFromToken(token);
    
    r.log(`Authorization check for user=${userId} action=${action} resource=${resource} resourceId=${resourceId} tenantId=${tenantId}`);
    
    // Select the service URL based on debug mode or production
    const useEchoService = false; // Change to true for debugging with echo service
    
    let serviceUrl = '';
    if (useEchoService) {
        serviceUrl = "http://echo:8080/allowed";
        r.log(`Debug mode: Using echo service at ${serviceUrl}`);
    } else {
        serviceUrl = "http://pdp-sidecar:7000/allowed";
        r.log(`Production mode: Using PDP sidecar at ${serviceUrl}`);
    }
    
    // Get API key from environment variable (now accessible with env directive)
    const permitApiKey = process.env.PERMIT_API_KEY;
    
    // Log API key status
    if (permitApiKey) {
        const maskedKey = permitApiKey.substring(0, 4) + "..." + permitApiKey.substring(permitApiKey.length - 4);
        r.log(`Using API key: ${maskedKey}`);
    } else {
        r.error("No API key found for authorization");
    }
    
    // Prepare the request headers and body
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${permitApiKey}`
    };
    
    // Prepare the request body according to the PDP sidecar API format
    const body = JSON.stringify({
        user: {
            key: userId,
            firstName: firstName,
            lastName: lastName
        },
        action: action,
        resource: {
            type: resource,
            key: resourceId || resource,
            tenant: tenantId
        }
    });
    
    // Log the request for debugging
    r.log(`PDP request payload: ${body}`);

    try {
        // Make the authorization request
        const res = ngx.fetch(serviceUrl, {
            method: 'POST',
            headers: headers,
            body: body
        });
        
        res.then(response => {
            r.log(`PDP response status: ${response.status}`);
            
            return response.text().then(data => {
                r.log(`PDP raw response: ${data}`);
                
                try {
                    const jsonData = JSON.parse(data);
                    
                    if (jsonData && jsonData.allow === true) {
                        r.log(`Access allowed for user=${userId} to ${resource}:${resourceId}`);
                        r.return(200, JSON.stringify({ allow: true }));
                    } else {
                        r.warn(`Access denied for user=${userId} to ${resource}:${resourceId}`);
                        r.return(403, JSON.stringify({ 
                            error: "Forbidden: You don't have permission to access this resource"
                        }));
                    }
                } catch (parseErr) {
                    r.error(`Error parsing PDP response: ${parseErr.message}`);
                    // If we can't parse the response but got a 200, assume allowed
                    if (response.status === 200) {
                        r.return(200, JSON.stringify({ allow: true }));
                    } else {
                        r.return(500, JSON.stringify({ error: "Internal server error parsing authorization response" }));
                    }
                }
            }).catch(error => {
                r.error(`Error reading PDP response: ${error.message}`);
                r.return(500, JSON.stringify({ error: "Internal server error reading authorization response" }));
            });
        }).catch(error => {
            r.error(`Error connecting to PDP: ${error.message}`);
            r.return(500, JSON.stringify({ error: "Internal server error: Failed to connect to authorization service" }));
        });
    } catch (err) {
        r.error(`Critical error in auth check: ${err.message}`);
        r.return(500, JSON.stringify({ error: "Internal server error in authorization check" }));
    }
}

// Helper function to extract user ID from JWT token
function extractUserFromToken(token) {
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
function extractTenantFromToken(token) {   
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        return payload.tenant_id || '';
    } catch (e) {
        return '';
    }
}

// Helper function to extract first name from JWT token
function extractFirstNameFromToken(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        return payload.given_name || payload.firstName || '';
    } catch (e) {
        return '';
    }
}

// Helper function to extract last name from JWT token
function extractLastNameFromToken(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        return payload.family_name || payload.lastName || '';
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

// Helper function to extract roles from JWT token
function extractRolesFromToken(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        return payload.roles || [];
    } catch (e) {
        return [];
    }
}

export default { permitio_token, permitio_check_auth, internal_auth_check };