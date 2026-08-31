// This script runs on github.com pages
function injectLegacyLoopButton() {
  // Try to find the file navigation bar or repository header
  const fileNavigation = document.querySelector('.file-navigation') || document.querySelector('#repository-container-header');
  
  if (!fileNavigation) return;
  
  // Don't inject twice
  if (document.getElementById('legacy-loop-btn')) return;

  const btnContainer = document.createElement('div');
  btnContainer.id = 'legacy-loop-btn-container';
  btnContainer.style.display = 'inline-block';
  btnContainer.style.marginLeft = '10px';
  btnContainer.style.verticalAlign = 'middle';

  const btn = document.createElement('button');
  btn.id = 'legacy-loop-btn';
  btn.className = 'btn btn-sm';
  btn.innerHTML = `
    <svg style="margin-right: 4px; vertical-align: text-bottom;" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
    Ask Oracle
  `;
  
  btn.style.backgroundColor = '#090e1a';
  btn.style.color = '#06b6d4';
  btn.style.borderColor = '#1e293b';

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    alert('Legacy Loop Oracle:\n\nPlease click the extension icon in your browser toolbar to open the full chat interface and ask about this repository!');
  });

  btnContainer.appendChild(btn);
  
  // Append to the file navigation or header
  if (fileNavigation.className.includes('file-navigation')) {
    fileNavigation.appendChild(btnContainer);
  } else {
    // If it's the header, try to append it to the actions area
    const actions = fileNavigation.querySelector('.pagehead-actions');
    if (actions) {
      const li = document.createElement('li');
      li.appendChild(btnContainer);
      actions.insertBefore(li, actions.firstChild);
    }
  }
}

// GitHub uses Turbo, so we need to observe DOM changes or listen to turbo events
document.addEventListener('turbo:load', injectLegacyLoopButton);
document.addEventListener('pjax:end', injectLegacyLoopButton);

// Also try on initial load
setTimeout(injectLegacyLoopButton, 1000);
