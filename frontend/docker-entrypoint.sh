#!/bin/sh
# Replace API URL at runtime
if [ -n "$VITE_API_URL" ]; then
    find /usr/share/nginx/html -type f -name "*.js" -exec sed -i "s|http://localhost:3001|$VITE_API_URL|g" {} \;
fi
exec nginx -g 'daemon off;'
