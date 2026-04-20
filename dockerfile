ARG NODE_VERSION=20.19.0
 
################################################################################
# Use node image for base image for all stages.
FROM node:${NODE_VERSION}-alpine as base
 
# Set working directory for all build stages.
WORKDIR /usr/src/app
 
################################################################################
# Create a stage for installing production dependencies.
FROM base as deps
 
# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.yarn to speed up subsequent builds.
# Leverage bind mounts to package.json and yarn.lock to avoid having to copy them
# into this layer.
RUN --mount=type=bind,source=package.json,target=package.json \
   --mount=type=bind,source=yarn.lock,target=yarn.lock \
   --mount=type=cache,target=/root/.cache/yarn \
   yarn config set network-timeout 600000 \ 
   && yarn install --frozen-lockfile --ignore-scripts --non-interactive --network-timeout 600000 --no-progress
 
################################################################################
# Create a stage for building the application.
FROM deps as build
 
# Copy the rest of the source files into the image.
COPY . .

# deps used --ignore-scripts; run sharp's install so linuxmusl-x64 binaries exist for PWA on Alpine.
RUN for f in node_modules/@qwikdev/pwa/node_modules/sharp/install/check.js \
             node_modules/sharp/install/check.js; do \
      if [ -f "$f" ]; then node "$f" && break; fi; \
    done

# Run the build script.
RUN yarn run build
 
################################################################################
# Create a new stage to run the application with minimal runtime dependencies
# where the necessary files are copied from the build stage.
FROM base as final
 
# Use production node environment by default.
ENV NODE_ENV production
# Set to your public URL (e.g. https://crypto-ghost.fly.dev)
ENV ORIGIN https://crypto-helper.fly.dev
ENV PUBLIC_APP_URL https://crypto-helper.fly.dev
 
# Run the application as a non-root user.
USER node
 
# Copy package.json so that package manager commands can be used.
COPY --chown=node:node package.json .
 
# Copy the production dependencies from the deps stage and also
# the built application from the build stage into the image.
COPY --from=deps --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --from=build --chown=node:node /usr/src/app/dist ./dist
COPY --from=build --chown=node:node /usr/src/app/server ./server
COPY --from=build --chown=node:node /usr/src/app/drizzle ./drizzle
COPY --from=build --chown=node:node /usr/src/app/drizzle.config.ts ./

# Copy entrypoint script and ensure it is executable
COPY --chown=node:node entrypoint.sh .
RUN chmod +x entrypoint.sh

# Expose the port that the application listens on.
EXPOSE 3000
 
# Run the application.
ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
CMD ["yarn", "serve"]