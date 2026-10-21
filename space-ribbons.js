(() => {
  document.querySelectorAll('.space-ribbon-track > span').forEach(segment => {
    const symbols = Array.from(segment.textContent).filter(char => char.trim());
    segment.replaceChildren(...symbols.map((symbol, index) => {
      const glyph = document.createElement('i');
      glyph.textContent = symbol;
      // A triangular wave makes a gentle, pointed ribbon rather than a sine wave.
      const phase = (index % 10) / 10;
      const dip = 1 - Math.abs(phase * 2 - 1);
      glyph.style.setProperty('--dip', `${dip * 17}px`);
      return glyph;
    }));
  });
})();
