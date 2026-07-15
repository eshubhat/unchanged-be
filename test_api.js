const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/admin/orders?limit=100&sortBy=newest&fromDate=2026-06-11&toDate=2026-07-11T23:59:59',
  method: 'GET',
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('API Response count:', parsed.data?.data?.length);
      if (parsed.data?.data?.length > 0) {
        console.log('First order:', parsed.data.data[0].orderNumber, parsed.data.data[0].createdAt);
      } else {
        console.log('Full response:', parsed);
      }
    } catch(e) { console.log('Error parsing JSON', e, data); }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
