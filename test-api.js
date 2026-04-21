const http = require('http');

const testLogin = () => {
  const data = JSON.stringify({
    email: 'admin@galaxia.sk',
    password: 'password123'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
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
      console.log('Status:', res.statusCode);
      const response = JSON.parse(body);
      console.log('Response:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('\n✅ Login successful!');
        console.log('Token:', response.data.token.substring(0, 50) + '...');
        
        // Test menu plan
        testMenuPlan(response.data.token);
      } else {
        console.log('\n❌ Login failed:', response.error);
      }
    });
  });

  req.on('error', (e) => console.error('Error:', e.message));
  req.write(data);
  req.end();
};

const testMenuPlan = (token) => {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/menu/plan',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      const response = JSON.parse(body);
      if (response.success) {
        const dates = Object.keys(response.data);
        console.log(`\n✅ Menu plan loaded: ${dates.length} days`);
        console.log('First day:', dates[0]);
        if (dates.length > 0) {
          const firstDay = response.data[dates[0]];
          console.log('Items:', firstDay.items.length);
        }
      } else {
        console.log('\n❌ Menu plan failed:', response.error);
      }
    });
  });

  req.on('error', (e) => console.error('Error:', e.message));
  req.end();
};

console.log('Testing API...\n');
testLogin();
