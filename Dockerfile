# Imagen única para API y worker: misma base, distinto comando. Multi-stage, sin devDependencies, usuario sin privilegios.
FROM node:22-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN npm ci --workspace packages/shared --workspace apps/api --include-workspace-root=false

FROM deps AS build
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN npm run build -w packages/shared && npm run build -w apps/api && npm prune --omit=dev --workspace packages/shared --workspace apps/api --include-workspace-root=false

FROM node:22-alpine AS runtime
RUN apk add --no-cache curl tini
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/package.json ./
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/apps/api/dist ./apps/api/dist
RUN mkdir -p /repo/apps/api/uploads && chown -R node:node /repo/apps/api
USER node
WORKDIR /repo/apps/api
EXPOSE 4000 4001
ENTRYPOINT ["/sbin/tini", "--"]
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=3 CMD curl -fs http://localhost:${PORT:-4000}/api/health || curl -fs http://localhost:${WORKER_PORT:-4001}/health || exit 1
CMD ["node", "dist/main.js"]
