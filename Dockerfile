# Multi-stage build for frontend and backend in one image

FROM node:20-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package.json client/vite.config.js client/index.html client/src ./
RUN npm ci --no-audit --no-fund
RUN npm run build

FROM node:20-alpine AS backend
WORKDIR /app
COPY server/package.json ./server/package.json
RUN cd server && npm ci --no-audit --no-fund
COPY server ./server

# Final runtime image
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=backend /app/server ./server
COPY --from=frontend-builder /app/client/dist ./client-dist

# Simple static file server via express middleware inside backend
EXPOSE 4000
CMD ["node", "server/src/index.js"]


