const http = require('http');

const API_URL = 'localhost';
const API_PORT = 3000;

let authToken = null;

const makeRequest = (path, method = 'GET', data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_URL,
      port: API_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

const testAdmin = async () => {
  console.log('=== Test Admin API ===\n');

  // 1. Login as admin
  console.log('1. Prihlásenie ako admin...');
  const loginRes = await makeRequest('/api/auth/login', 'POST', {
    email: 'admin@galaxia.sk',
    password: 'password123',
  });
  
  if (!loginRes.data.success) {
    console.log('❌ Prihlásenie zlyhalo:', loginRes.data.error);
    return;
  }
  
  authToken = loginRes.data.data.token;
  console.log('✅ Prihlásený ako admin');

  // 2. Test users list
  console.log('\n2. Zoznam používateľov...');
  const usersRes = await makeRequest('/api/admin/users', 'GET', null, authToken);
  console.log('   Status:', usersRes.status);
  if (usersRes.data.success) {
    console.log(`✅ Nájdených ${usersRes.data.data.length} používateľov`);
    
    // 3. Test update user
    const userId = usersRes.data.data[0].id;
    console.log(`\n3. Aktualizácia používateľa ${userId}...`);
    const updateRes = await makeRequest(`/api/admin/users/${userId}`, 'PUT', {
      firstName: 'Updated',
      lastName: 'Name',
    }, authToken);
    console.log('   Status:', updateRes.status);
    if (updateRes.data.success) {
      console.log('✅ Používateľ aktualizovaný');
    } else {
      console.log('❌ Aktualizácia zlyhala:', updateRes.data.error);
    }
  }

  // 4. Test settings update
  console.log('\n4. Aktualizácia nastavení...');
  const settingsRes = await makeRequest('/api/admin/settings', 'PUT', {
    planning_horizon_days: '21',
  }, authToken);
  console.log('   Status:', settingsRes.status);
  if (settingsRes.data.success) {
    console.log('✅ Nastavenia aktualizované');
  } else {
    console.log('❌ Aktualizácia nastavení zlyhala:', settingsRes.data.error);
  }

  console.log('\n=== Test dokončený ===');
};

testAdmin().catch(console.error);
