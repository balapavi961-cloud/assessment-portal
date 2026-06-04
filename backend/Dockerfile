FROM node:20-bookworm

# Set the working directory
WORKDIR /app

# Install compilation and execution dependencies:
# - openjdk-17-jdk: Java JDK 17
# - python3: Python 3
# - python-is-python3: automatically symlinks 'python' to 'python3' (avoids spawn python ENOENT)
# - g++ & build-essential: C++ compiler and tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jdk \
    python3 \
    python-is-python3 \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Configure Java Environment
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$PATH:$JAVA_HOME/bin

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the backend files
COPY . .

# Expose the default application port (Render will override or map this dynamically)
EXPOSE 5000

# Start the Node.js application
CMD ["npm", "start"]