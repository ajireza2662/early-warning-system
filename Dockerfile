FROM node:20-alpine

WORKDIR /app

# Install deps dulu (cache layer terpisah dari source code)
COPY package.json ./
RUN npm install

# Copy seluruh source
COPY . .

# Build Next.js (production build)
RUN npm run build

RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
