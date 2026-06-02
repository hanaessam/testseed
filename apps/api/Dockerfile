FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/db/package.json packages/db/package.json

RUN npm ci

COPY . .
RUN npx turbo run build --filter=@testseed/api...

EXPOSE 3001
CMD ["npm", "run", "start", "--workspace", "@testseed/api"]
