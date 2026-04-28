FROM mcr.microsoft.com/playwright:v1.58.2-noble

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clean install
RUN npm ci

# Copy the rest of the code
COPY . .

EXPOSE 3000

CMD ["npm", "start"]