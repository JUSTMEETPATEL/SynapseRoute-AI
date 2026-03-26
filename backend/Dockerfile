# Multi-stage Production Dockerfile for Phoenix Backend
FROM hexpm/elixir:1.16.0-erlang-26.2.1-alpine-3.19.0 AS builder

# Install build dependencies
RUN apk add --no-cache \
    build-base \
    git \
    nodejs \
    npm

WORKDIR /app

# Install hex + rebar
RUN mix local.hex --force && \
    mix local.rebar --force

# Set build ENV
ARG MIX_ENV=prod
ENV MIX_ENV=${MIX_ENV}

# Copy mix files
COPY mix.exs mix.lock ./
COPY config config

# Install mix dependencies
RUN mix deps.get --only $MIX_ENV
RUN mix deps.compile

# Copy application
COPY . .

# Compile assets (if any)
RUN mix assets.deploy || true

# Compile the release
RUN mix compile

# Build release
RUN mix release

# Production stage
FROM alpine:3.19.0 AS app

# Install runtime dependencies
RUN apk add --no-cache \
    libstdc++ \
    openssl \
    ncurses-libs \
    postgresql-client

WORKDIR /app

# Create non-root user
RUN addgroup -g 1000 phoenix && \
    adduser -D -u 1000 -G phoenix phoenix

# Copy the release from builder
COPY --from=builder --chown=phoenix:phoenix /app/_build/prod/rel/synapseroute ./

USER phoenix

EXPOSE 4000

ENV HOME=/app
ENV MIX_ENV=prod

# Run the release
CMD ["bin/synapseroute", "start"]
