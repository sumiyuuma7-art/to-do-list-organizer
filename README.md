# Organize Labs Todo

Static habit tracker / review dashboard for GitHub Pages.

## Files

- `index.html`
- `styles.css`
- `script.js`

## Publish On GitHub Pages

1. Create a new empty GitHub repository.
2. Open Terminal and run:

```bash
cd "/Users/inouekinari/Documents/New project/to do list"
git add .
git commit -m "Initial site"
git remote add origin https://github.com/YOUR_NAME/YOUR_REPO.git
git push -u origin main
```

3. On GitHub, open:

- `Settings`
- `Pages`
- `Build and deployment`
- `Source: Deploy from a branch`
- `Branch: main`
- `Folder: / (root)`

4. Wait a minute or two.

Your site URL will be:

```text
https://YOUR_NAME.github.io/YOUR_REPO/
```

## Important Note

This app currently saves data in each browser's `localStorage`.

That means:

- your friend can open and use the site
- your current checks and preserved boards will not automatically sync to their browser
- real shared progress would need a backend or cloud database
