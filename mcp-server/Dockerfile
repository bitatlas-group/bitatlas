FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Remote Streamable-HTTP entry (Smithery "External URL" listing).
# For the stdio entry instead, override: docker run ... node index.js
EXPOSE 8000
ENTRYPOINT ["node", "http.js"]
