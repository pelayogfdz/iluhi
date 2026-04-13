import { schedule } from '@netlify/functions';

export const handler = schedule('* * * * *', async (event) => {
    // If we're deployed on a standard branch, process.env.URL points to the live URL
    const baseUrl = process.env.URL || 'http://localhost:3000';
    console.log("Triggering Cron at " + baseUrl);
    
    try {
        const response = await fetch(`${baseUrl}/api/cron-processor`);
        const data = await response.json();
        console.log("Cron Result:", data);
        return { statusCode: 200, body: JSON.stringify(data) };
    } catch(err) {
        console.error("Cron Error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
});
