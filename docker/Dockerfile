FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node . .
RUN mkdir -p public/uploads && chown -R node:node public/uploads

ENV NODE_ENV=production
EXPOSE 3000

USER node
CMD ["node", "server/server.js"]
