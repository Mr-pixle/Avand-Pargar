FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8082 TARAZ_STATIC_DIR=/app/web-dist
RUN npm install --no-save --omit=dev pg@8.23.1 && npm cache clean --force
COPY --from=build /app/server-dist ./server-dist
COPY --from=build /app/web-dist ./web-dist
USER node
EXPOSE 8082
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server-dist/main.mjs"]
