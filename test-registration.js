async function testRegistration() {
  const apiUrl = 'https://checkout-45tb.onrender.com';
  
  console.log('Testing registration endpoint...');
  console.log('API URL:', apiUrl);
  
  // Test data
  const testData = {
    companyName: 'Test Company ' + Date.now(),
    companySlug: 'test-company-' + Date.now(),
    adminName: 'Test Admin',
    adminEmail: 'test' + Date.now() + '@example.com',
    adminPassword: 'password123',
    plan: 'free',
    industry: 'retail'
  };
  
  console.log('Test data:', testData);
  
  try {
    // First test health check
    console.log('\n1. Testing health check...');
    const healthResponse = await fetch(`${apiUrl}/api/v1/health`);
    const healthData = await healthResponse.json();
    console.log('Health check response:', healthData);
    
    // Test platform health check
    console.log('\n2. Testing platform health check...');
    const platformHealthResponse = await fetch(`${apiUrl}/api/v1/platform/health`);
    const platformHealthData = await platformHealthResponse.json();
    console.log('Platform health check response:', platformHealthData);
    
    // Test registration
    console.log('\n3. Testing registration...');
    const registrationResponse = await fetch(`${apiUrl}/api/v1/platform/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const registrationData = await registrationResponse.json();
    console.log('Registration response:', registrationData);
    
    if (registrationData.success) {
      console.log('\n✅ Registration test PASSED!');
      console.log('Tenant created:', registrationData.tenant);
    } else {
      console.log('\n❌ Registration test FAILED!');
      console.log('Error:', registrationData.message);
    }
    
  } catch (error) {
    console.error('\n❌ Registration test FAILED with error:');
    console.error('Error:', error.message);
  }
}

testRegistration();