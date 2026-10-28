FROM node:24.21.0-bookworm-slim AS checked
ENV CI=true
RUN npm install -g pnpm@9.10.0
WORKDIR /app/autopilots-website-api
COPY autopilots-website-api/package.json autopilots-website-api/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY autopilots-website-api/ ./
COPY autopilots-website/netlify/functions/ ../autopilots-website/netlify/functions/
COPY autopilots-platform/src/consultant/ ../autopilots-platform/src/consultant/
RUN pnpm run check && pnpm test && pnpm prune --prod --ignore-scripts

FROM node:24.21.0-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=checked --chown=node:node /app ./
RUN mkdir -p /app/data && chown node:node /app/data
WORKDIR /app/autopilots-website-api
USER node
EXPOSE 8080
CMD ["node", "server.ts"]
