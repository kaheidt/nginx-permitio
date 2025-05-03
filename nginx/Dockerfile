FROM openresty/openresty:alpine

# Install dependencies
RUN apk add --no-cache curl git \
    && cd /tmp \
    # Install lua-resty-http module
    && git clone https://github.com/ledgetech/lua-resty-http \
    && cd lua-resty-http \
    && cp -r lib/resty/* /usr/local/openresty/lualib/resty/ \
    && cd /tmp \
    # Install lua-resty-openssl module
    && git clone https://github.com/fffonion/lua-resty-openssl \
    && cd lua-resty-openssl \
    && cp -r lib/resty/* /usr/local/openresty/lualib/resty/ \
    && cd /tmp \
    && rm -rf lua-resty-http lua-resty-openssl

#Don't override the openresty.conf file, as it is used by the openresty image to start nginx
#COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf

# Copy configuration files

COPY conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY conf.d/env.main /etc/nginx/conf.d/env.main

# Copy and properly place the Permit.io Lua module
COPY conf.d/permit.lua /usr/local/openresty/lualib/permit.lua

# Create directory for OpenResty temp paths
RUN mkdir -p /var/run/openresty

# Expose port
EXPOSE 80

# Start OpenResty
CMD ["nginx", "-g", "daemon off;"]