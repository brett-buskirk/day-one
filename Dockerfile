# Day One — build the static PWA and serve it with nginx. Self-host anywhere
# Docker runs:  docker build -t day-one .  &&  docker run -p 8080:80 day-one
# Then open http://localhost:8080

# --- build stage ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- serve stage ---
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
# (the official nginx image already runs nginx in the foreground)
