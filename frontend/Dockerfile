# Stage 1: Build Stage
# This stage uses a Node.js image to build the static files for the React application.
FROM node:20-alpine AS build

# Set the working directory inside the container.
WORKDIR /app

# Copy package.json and package-lock.json and install dependencies.
# This leverages Docker's layer caching.
COPY frontend/package*.json ./
RUN npm install

# Copy the rest of the frontend source code.
COPY frontend .
# Build the production-ready static files.
RUN npm run build

# Stage 2: Serve Stage
# This stage uses a lightweight Nginx image to serve the built static files.
FROM nginx:stable-alpine

# Set an environment variable that can be used by the Nginx configuration
# to proxy requests to the backend service.
ENV BACKEND_HOST backend:8000

# Copy the custom Nginx configuration file.
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built static files from the 'build' stage to the Nginx public directory.
COPY --from=build /app/dist /usr/share/nginx/html

# Expose the default Nginx port.
EXPOSE 80

# The default command for the Nginx image, which starts the server.
# The '-g "daemon off;"' flag ensures Nginx runs in the foreground.
CMD ["nginx", "-g", "daemon off;"]