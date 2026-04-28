FROM mcr.microsoft.com/playwright:v1.58.2-noble

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

EXPOSE 3000

CMD ["npm", "start"]