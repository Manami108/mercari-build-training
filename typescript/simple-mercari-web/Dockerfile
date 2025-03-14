# Step 1: Use a lightweight Node.js image
FROM node:20-alpine

# Step 2: Set working directory inside the container
WORKDIR /app

# Step 3: Copy package.json and install dependencies
COPY package*.json ./

# 🛠 Fix: Remove cached dependencies before installing
RUN rm -rf node_modules package-lock.json && npm install --force

# Step 4: Copy frontend files after dependencies are installed
COPY . .

# Step 5: Expose port 3000 for the frontend
EXPOSE 3000

# Step 6: Start Vite on host 0.0.0.0 and port 3000
CMD ["npm", "start", "--", "--host", "0.0.0.0", "--port", "3000"]
