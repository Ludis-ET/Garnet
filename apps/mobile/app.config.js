// Garnet's face as the app icon (owner direction P-55, for U-25) — only when the owner's
// generated brand images exist locally. They live in the git-ignored assets/characters/brand/
// (made by scripts/make-garnet-brand.py from the owner's image), so no character art enters the
// repository and a fresh checkout still builds with the neutral icons in app.json.
const fs = require("node:fs");
const path = require("node:path");

module.exports = ({ config }) => {
  const brand = (file) => path.join(__dirname, "assets", "characters", "brand", file);
  const local = (file) => (fs.existsSync(brand(file)) ? `./assets/characters/brand/${file}` : null);
  const icon = local("icon.png");
  const foreground = local("adaptive-foreground.png");
  const background = local("adaptive-background.png");
  const favicon = local("favicon.png");
  return {
    ...config,
    ...(icon === null ? {} : { icon }),
    android: {
      ...config.android,
      adaptiveIcon: {
        ...config.android?.adaptiveIcon,
        ...(foreground === null || background === null
          ? {}
          : { foregroundImage: foreground, backgroundImage: background }),
      },
    },
    web: { ...config.web, ...(favicon === null ? {} : { favicon }) },
  };
};
