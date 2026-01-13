// Test Groq API
const testGroqApi = async () => {
    const testApiKey = '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';

    console.log('Testing Groq API with key:', testApiKey.slice(0, 15) + '...');

    try {
        const response = await fetch('https://api.groq.com/openai/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${testApiKey}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('Success! Available models:', data.data?.map(m => m.id).slice(0, 5));
        } else {
            const error = await response.text();
            console.log('Error:', error);
        }
    } catch (err) {
        console.log('Request failed:', err.message);
    }
};

testGroqApi();
