FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

COPY package.json package-lock.json ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ── production stage ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

RUN npm install -g pnpm

COPY package.json package-lock.json ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/data

ENV NODE_ENV=production
EXPOSE 4001

CMD ["node", "dist/server.cjs"]
