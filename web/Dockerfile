# NEXT_PUBLIC_* vars are baked in at build time by Next.js, so the engine URL
# is a build arg. localhost:8000 is the engine's published port on the host -
# the browser makes these calls, not this container.
FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG NEXT_PUBLIC_ENGINE_URL=http://localhost:8000
ENV NEXT_PUBLIC_ENGINE_URL=$NEXT_PUBLIC_ENGINE_URL
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
