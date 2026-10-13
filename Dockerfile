# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi \
    && npm ci

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi \
    && npm run build

FROM base AS runner
ENV NODE_ENV=production \
    PORT=8080 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nextjs \
    && useradd --system --uid 1001 --gid nextjs nextjs

COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]
