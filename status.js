// Edit these two values, then push/deploy the site to update your public status.
// Leave updated blank to hide the date; otherwise use a label such as "October 22, 2026".
(() => {
  const status = {
    text: "I got high and forced a clanker to clean up my dogshit code again. Sorry AI bros",
    updated: ""
  };

  const message = document.getElementById('personal-status-text');
  const date = document.getElementById('personal-status-date');
  if (!message || !date) return;
  message.textContent = status.text;
  date.textContent = status.updated ? `Updated ${status.updated}` : '';
  date.hidden = !status.updated;
})();
