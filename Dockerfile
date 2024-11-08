# Use an official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the required dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port for the Express server
EXPOSE 3000

# Start the bot and Express server
CMD ["node", "index.js"]
