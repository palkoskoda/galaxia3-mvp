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

const testOrderFlow = async () => {
  console.log('=== Test objednávania ===\n');

  // 1. Login
  console.log('1. Prihlásenie...');
  const loginRes = await makeRequest('/api/auth/login', 'POST', {
    email: 'klient1@example.com',
    password: 'password123',
  });
  
  if (!loginRes.data.success) {
    console.log('❌ Prihlásenie zlyhalo:', loginRes.data.error);
    return;
  }
  
  authToken = loginRes.data.data.token;
  console.log('✅ Prihlásený ako:', loginRes.data.data.user.firstName);

  // 2. Get menu plan
  console.log('\n2. Načítanie menu...');
  const menuRes = await makeRequest('/api/menu/plan', 'GET', null, authToken);
  
  if (!menuRes.data.success) {
    console.log('❌ Načítanie menu zlyhalo:', menuRes.data.error);
    return;
  }
  
  const dates = Object.keys(menuRes.data.data);
  console.log(`✅ Načítaných ${dates.length} dní`);
  
  if (dates.length < 2) {
    console.log('❌ Málo dní v menu');
    return;
  }

  // Skúsime zajtra (index 1) - dnes sú už uzávierky preč
  const tomorrowDate = dates[1];
  const tomorrowDay = menuRes.data.data[tomorrowDate];
  console.log(`\n   Zajtra: ${tomorrowDate}, položiek: ${tomorrowDay.items.length}`);

  if (tomorrowDay.items.length === 0) {
    console.log('❌ Žiadne položky na zajtra');
    return;
  }

  // Nájdeme prvú editable položku
  const editableItem = tomorrowDay.items.find(i => i.isEditable);
  
  if (!editableItem) {
    console.log('❌ Žiadne editable položky na zajtra');
    return;
  }

  console.log(`   Položka: ${editableItem.menuItem.name} (ID: ${editableItem.id})`);
  console.log(`   Aktuálne množstvo: ${editableItem.userQuantity}`);
  console.log(`   Uzávierka: ${editableItem.deadlineTimestamp}`);
  console.log(`   Je editable: ${editableItem.isEditable}`);

  // 3. Add order
  console.log('\n3. Pridanie objednávky (+1)...');
  const newQuantity = editableItem.userQuantity + 1;
  const orderRes = await makeRequest('/api/plan/selection', 'PUT', {
    dailyMenuId: editableItem.id,
    quantity: newQuantity,
  }, authToken);

  console.log('   Status:', orderRes.status);
  
  if (orderRes.data.success) {
    console.log('✅ Objednávka úspešná!');
  } else {
    console.log('❌ Objednávka zlyhala:', orderRes.data.error);
    console.log('   Kód:', orderRes.data.code);
  }

  // 4. Verify
  console.log('\n4. Overenie...');
  const verifyRes = await makeRequest('/api/menu/plan', 'GET', null, authToken);
  
  if (verifyRes.data.success) {
    const verifyDay = verifyRes.data.data[tomorrowDate];
    const verifyItem = verifyDay.items.find(i => i.id === editableItem.id);
    console.log(`   Nové množstvo: ${verifyItem.userQuantity}`);
    
    if (verifyItem.userQuantity === newQuantity) {
      console.log('✅ Overenie úspešné!');
    } else {
      console.log('❌ Množstvo sa nezmenilo (očakávané:', newQuantity, ')');
    }
  }

  // 5. Test odobratia
  console.log('\n5. Odobratie objednávky (-1)...');
  const removeRes = await makeRequest('/api/plan/selection', 'PUT', {
    dailyMenuId: editableItem.id,
    quantity: 0,
  }, authToken);

  if (removeRes.data.success) {
    console.log('✅ Odobratie úspešné!');
  } else {
    console.log('❌ Odobratie zlyhalo:', removeRes.data.error);
  }

  console.log('\n=== Test dokončený ===');
};

testOrderFlow().catch(console.error);
