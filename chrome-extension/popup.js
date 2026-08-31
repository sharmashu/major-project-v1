document.addEventListener('DOMContentLoaded', () => {
  const explainBtn = document.getElementById('explain-btn');
  const contentBox = document.getElementById('content');
  const statusText = document.getElementById('status-text');

  // URL of the GitSimple backend
  const API_URL = 'http://localhost:3000/api/explain/brief';

  explainBtn.addEventListener('click', async () => {
    // Get the active tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const activeTab = tabs[0];
      const url = activeTab.url;

      if (!url.includes('github.com') || !url.includes('/commit/')) {
        statusText.innerText = "Please navigate to a GitHub commit page first.";
        return;
      }

      explainBtn.disabled = true;
      explainBtn.innerHTML = 'Loading...';
      contentBox.innerHTML = '<p class="loading">Consulting the AI...</p>';

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ diffUrl: url + ".diff" })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to get explanation.');
        }

        // Format simple markdown
        const formattedText = data.summary
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br/>');

        contentBox.innerHTML = `<p>${formattedText}</p>`;
      } catch (error) {
        console.error('Explanation Error:', error);
        contentBox.innerHTML = `<p style="color: #ef4444;">${error.message}</p>`;
      } finally {
        explainBtn.disabled = false;
        explainBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          Explain another
        `;
      }
    });
  });
});
