FROM node:22-alpine

WORKDIR /app

COPY . .

RUN if [ -f package.json ]; then npm install; else \
    npm init -y && \
    npm install express pg pgvector; \
    fi

EXPOSE 3000

CMD ["node", "index.js"]