FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
RUN pnpm rebuild better-sqlite3 esbuild

COPY . .
RUN pnpm run build

# production stage
FROM node:22-alpine AS runner
WORKDIR /app

RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --prod
RUN pnpm rebuild better-sqlite3

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 4001

CMD ["node", "dist/server.cjs"]
