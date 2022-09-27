FROM node:16-alpine

# Only copy the package.json file to work directory
WORKDIR /usr/src/app
COPY package.json .
# Install all Packages
RUN npm install

# Copy built js file into repo
ADD dist/index.js /usr/src/app

# Add and enable source map to help w/ debugging.
ADD dist/index.js.map /usr/src/app
ENV NODE_OPTIONS='--enable-source-maps'


# Start
CMD [ "node", "index.js"]
