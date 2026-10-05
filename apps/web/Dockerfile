# Web: Next.js en modo standalone (solo lo necesario para servir), usuario sin privilegios.
FROM node:22-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
RUN npm ci --workspace packages/shared --workspace apps/web --include-workspace-root=false

FROM deps AS build
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
ARG NEXT_PUBLIC_SITE_URL=https://www.pimentoneslacajita.com
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL API_URL=http://api:4000 NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w packages/shared && npm run build -w apps/web

FROM node:22-alpine AS runtime
RUN apk add --no-cache curl tini
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 CMD curl -fs http://localhost:3000/ > /dev/null || exit 1
CMD ["node", "apps/web/server.js"]
