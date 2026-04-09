FROM node:22-slim

WORKDIR /app

COPY mcp-server/package*.json ./
RUN npm install --production

COPY mcp-server/ .

ENTRYPOINT ["node", "index.js"]
