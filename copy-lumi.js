const copyLumi = document.getElementById('copy-lumi');
const embed = document.getElementById('lumi-embed');
const feedback = document.getElementById('copy-lumi-status');

copyLumi.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(embed.value);
    embed.hidden = true;
    feedback.textContent = 'HTML copied!';
  } catch {
    embed.hidden = false;
    embed.focus();
    embed.select();
    feedback.textContent = 'Copy the selected HTML below.';
  }
});
