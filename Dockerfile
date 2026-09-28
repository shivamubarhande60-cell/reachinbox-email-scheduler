FROM node:22-alpine AS backend-build
RUN apk add --no-cache openssl
WORKDIR /workspace/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run db:generate && npm run build

FROM node:22-alpine AS frontend-build
WORKDIR /workspace/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV FRONTEND_DIST_DIR=/app/frontend/dist
WORKDIR /app/backend
COPY --from=backend-build /workspace/backend/package*.json ./
COPY --from=backend-build /workspace/backend/node_modules ./node_modules
COPY --from=backend-build /workspace/backend/dist ./dist
COPY --from=backend-build /workspace/backend/prisma ./prisma
COPY --from=frontend-build /workspace/frontend/dist /app/frontend/dist
EXPOSE 5000
CMD ["node", "dist/src/index.js"]
