FROM mcr.microsoft.com/playwright:v1.58.2-noble

WORKDIR /app

COPY package*.json ./

# Use npm install instead of npm ci (because lock file is missing)
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]