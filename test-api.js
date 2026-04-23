const http = require('http');

const options = {
  hostname: 'localhost',
  port: 10000,
  path: '/api/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', data));
});

req.on('error', e => console.error('ERROR:', e.message));
req.on('timeout', () => { console.error('TIMEOUT'); req.abort(); });
req.end();
