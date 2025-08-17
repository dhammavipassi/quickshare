#!/usr/bin/env node
const http = require('http');

function fetchTunnels(callback) {
  const options = {
    hostname: '127.0.0.1',
    port: 4040,
    path: '/api/tunnels',
    method: 'GET',
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        callback(null, json);
      } catch (e) {
        callback(e);
      }
    });
  });

  req.on('error', (err) => callback(err));
  req.end();
}

fetchTunnels((err, json) => {
  if (err) {
    console.error('Failed to query ngrok Web UI at http://127.0.0.1:4040');
    console.error(String(err));
    process.exit(1);
  }

  const tunnels = Array.isArray(json.tunnels) ? json.tunnels : [];
  if (!tunnels.length) {
    console.error('No active tunnels found. Is the ngrok-agent container running?');
    process.exit(2);
  }

  const https = tunnels.find((t) => (t.public_url || '').startsWith('https://'));
  const any = https || tunnels[0];
  console.log(any.public_url);
});

