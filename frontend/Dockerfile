FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
RUN if [ -f yarn.lock ]; then yarn build; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm build; \
    else npm run build; fi

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]