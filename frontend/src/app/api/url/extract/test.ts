/**
 * Test script for URL metadata extraction API
 *
 * This script can be run with:
 * npx ts-node -r tsconfig-paths/register src/app/api/url/extract/test.ts
 */

async function testUrlExtraction() {
  console.log('Testing URL metadata extraction API...');

  const testUrl = 'https://www.tensorflow.org/tutorials/keras/classification';

  try {
    const response = await fetch('http://localhost:3000/api/url/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You'll need to add a valid token here for authentication
        'Cookie': 'token=YOUR_TOKEN_HERE'
      },
      body: JSON.stringify({ url: testUrl }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error:', errorData);
      return;
    }

    const metadata = await response.json();
    console.log('Extracted metadata:', JSON.stringify(metadata, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testUrlExtraction();