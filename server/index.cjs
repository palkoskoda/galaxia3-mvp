'use strict';

const http = require('node:http');
const { createHandler } = require('./app.cjs');

function startServer({ port = process.env.PORT || 3000, ...options } = {}) {
  const server = http.createServer({ requestTimeout: 15_000, headersTimeout: 15_000 }, createHandler(options));
  server.listen(port, '0.0.0.0', () => {
    console.log(`Moje obedy bežia na porte ${server.address().port}.`);
  });
  return server;
}

if (require.main === module) startServer();

module.exports = { createHandler, startServer };
