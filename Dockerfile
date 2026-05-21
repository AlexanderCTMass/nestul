# Этап 1: Установка зависимостей
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json yarn.lock ./
# Копируем схему, чтобы Prisma была доступна
COPY prisma ./prisma/
RUN yarn install --frozen-lockfile

# Этап 2: Сборка приложения
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Даем Prisma фейковый URL, чтобы просто сгенерировать клиент
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN yarn prisma generate
RUN yarn build

# Этап 3: Финальный образ
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копируем standalone-сборку
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Ручное копирование файлов Prisma (обход проблемы "выбрасывания" Next.js)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]