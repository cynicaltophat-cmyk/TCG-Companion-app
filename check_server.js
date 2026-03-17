import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/img/ST01/ST01-001.png',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  let bodyLength = 0;
  res.on('data', (chunk) => {
    bodyLength += chunk.length;
  });
  res.on('end', () => {
    console.log(`BODY LENGTH: ${bodyLength}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
