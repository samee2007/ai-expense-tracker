const fetch = require('node-fetch'); // Ensure node-fetch is available (v2 for CommonJS or use native fetch in newer Node)
// Since we might not have node-fetch installed, we'll use native fetch if Node 18+ or standard http
const http = require('http');

const data = JSON.stringify({
    text: "Lunch 150 yesterday",
    uid: "test-user-diag"
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/expenses',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Body: ${body}`);
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
