FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Add cache busting
RUN echo "Build at $(date)" > /usr/share/nginx/html/build.txt

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh

# Add no-cache headers for JS
RUN echo 'add_header Cache-Control "no-cache, no-store, must-revalidate";' >> /etc/nginx/conf.d/default.conf

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
