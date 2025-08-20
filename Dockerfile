# Multi-stage build for frontend and backend in one image

FROM node:20-alpine AS frontend-builder
WORKDIR /app/client
	COPY client ./
	RUN npm install --no-audit --no-fund
RUN npm run build

FROM node:20-alpine AS backend
WORKDIR /app
COPY server/package.json ./server/package.json
	RUN cd server && npm install --no-audit --no-fund
COPY server ./server

# Final runtime image
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy backend and frontend source for dev servers
COPY --from=backend /app/server ./server
COPY --from=frontend-builder /app/client ./client

# Copy the start script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 4000 5173
CMD ["/app/start.sh"]