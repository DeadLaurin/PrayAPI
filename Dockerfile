# Production image — Node 22 LTS (Alpine: small attack surface)
# Good fit for PrayAPI: same runtime everywhere, easy scaling, no host Node install.

FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# Required so the server accepts connections from outside the container
ENV HOST=0.0.0.0

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder --chown=node:node /app/dist ./dist

USER node

EXPOSE 3000

# Assumes PORT=3000; if you change PORT, override healthcheck in compose/k8s
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ > /dev/null || exit 1

CMD ["node", "dist/index.js"]
