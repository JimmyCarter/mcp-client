# 阶段 1: 构建
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 阶段 2: 用 Nginx 服务静态文件
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template

# 使用 envsubst 替换环境变量
ENV MCP_BRIDGE_URL=${MCP_BRIDGE_URL:-http://localhost:3002}
RUN apk add --no-cache gettext && \
    envsubst < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]