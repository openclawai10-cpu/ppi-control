#!/bin/sh
# Replace API URL at runtime
if [ -n "$VITE_API_URL" ]; then
    # Replace in all JS files
    find /usr/share/nginx/html -type f -name "*.js" -exec sed -i "s|http://localhost:3001|$VITE_API_URL|g" {} \;
fi
exec nginx -g 'daemon off;'
