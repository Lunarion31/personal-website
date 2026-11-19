(() => {
  const feedback = document.getElementById('copy-lumi-status');
  const buttons = [...document.querySelectorAll('[data-copy-embed]')];
  buttons.forEach(button => button.addEventListener('click', async () => {
    const embed = document.getElementById(button.dataset.copyEmbed);
    const name = button.id === 'copy-lumi-garden' ? 'Garden' : 'Observatory';
    buttons.forEach(other => { document.getElementById(other.dataset.copyEmbed).hidden = true; });
    try {
      await navigator.clipboard.writeText(embed.value);
      feedback.textContent = `${name} button HTML copied!`;
    } catch {
      embed.hidden = false;
      embed.focus();
      embed.select();
      feedback.textContent = 'Copy the selected HTML below.';
    }
  }));
})();
