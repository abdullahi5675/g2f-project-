const http = require('http');

http.get('http://localhost:3000/api/farmers', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('FARMERS STATUS:', res.statusCode);
    console.log('FARMERS BODY:', data);
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
