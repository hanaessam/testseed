FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/types/package.json packages/types/package.json

RUN npm ci

COPY . .
RUN npx turbo run build --filter=@testseed/web...

EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "@testseed/web"]
