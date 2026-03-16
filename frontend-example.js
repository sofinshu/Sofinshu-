/**
 * STEP 4: FRONTEND FETCH EXAMPLE
 * Use this function on your website (e.g., when a "Save" or "Send" button is clicked)
 */

async function sendEmbedToDiscord(formData) {
    const { serverId, channelId, title, description, color } = formData;

    try {
        const response = await fetch('/api/send-embed', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                serverId,
                channelId,
                title,
                description,
                color
            })
        });

        const data = await response.json();

        if (data.success) {
            // STEP 4: Show success message/alert
            console.log('Success! Message sent to Discord.');
            alert('✅ Embed sent successfully!');
        } else {
            // STEP 4: Handle error response
            console.error('Error from API:', data.error);
            alert(`❌ Error: ${data.error}`);
        }
    } catch (error) {
        // STEP 4: Handle network error
        console.error('Fetch error:', error);
        alert('❌ Failed to connect to the server. Please try again.');
    }
}

/**
 * Example usage with the Welcome Settings API
 */
async function saveWelcomeSettings(settings) {
    try {
        const response = await fetch('/api/settings/welcome', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        const data = await response.json();

        if (data.success) {
            alert('✅ Welcome settings saved successfully!');
        } else {
            alert(`❌ Error saving settings: ${data.error}`);
        }
    } catch (error) {
        alert('❌ Network error while saving settings.');
    }
}
