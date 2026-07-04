# AudioBook Creator — Application Desktop

Lecteur et créateur d'audiobooks avec synthèse vocale, export MP3 et capture photo.

---

## Lancer en développement (sur votre machine)

### Prérequis
- [Node.js 20+](https://nodejs.org/) installé

### Première fois
```bash
npm install
npm start
```

L'application s'ouvre dans une fenêtre native.

---

## Publier une release avec GitHub Actions

Le workflow `.github/workflows/release.yml` build automatiquement l'app pour **Windows (.exe), macOS (.dmg) et Linux (.AppImage/.deb)** à chaque tag de version.

### Étapes

1. **Créez un dépôt GitHub** et poussez ce dossier :
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/VOTRE_NOM/audiobook-creator.git
   git push -u origin main
   ```

2. **Poussez un tag de version** pour déclencher le build :
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. **Attendez ~10 minutes** — GitHub Actions build en parallèle sur Windows, macOS et Linux.

4. **Téléchargez les installeurs** dans l'onglet **Releases** de votre dépôt GitHub :
   - Windows : `AudioBook Creator Setup 1.0.0.exe` (installeur avec raccourci bureau)
   - macOS : `AudioBook Creator-1.0.0.dmg`
   - Linux : `AudioBook Creator-1.0.0.AppImage` ou `.deb`

---

## Structure du projet

```
audiobook-creator/
├── index.html              # L'application complète (fichier unique)
├── main.js                 # Processus principal Electron
├── package.json            # Config npm + electron-builder
└── .github/
    └── workflows/
        └── release.yml     # Pipeline CI/CD GitHub Actions
```

---

## Build local (sans GitHub)

```bash
# Windows
npm run dist:win

# macOS
npm run dist:mac

# Linux
npm run dist:linux
```

Les fichiers sont générés dans le dossier `dist/`.
