FROM node:22-slim

# Build deps for better-sqlite3 (prebuilts available for glibc/Debian, much faster)
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN NODE_ENV=development npm install --legacy-peer-deps

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000
CMD ["npm", "run", "start"]
