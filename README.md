# 🎁 Carnet de bons

Un carnet de « bons pour » à offrir à ses grands-parents. Quand ils utilisent un bon, vous recevez un email.

## 1. Personnaliser
Tout se règle dans [`config.js`](config.js) : prénoms, message d'accueil, photo d'accueil facultative (`photoAccueil`, affichée en noir et blanc), votre prénom et votre téléphone, et la liste des bons (catégorie, titre, détail). Les **jokers** (`joker: true`) servent aux demandes sur mesure.

## 2. Recevoir les emails (Web3Forms, gratuit)
1. Allez sur https://web3forms.com, saisissez **votre** email et cliquez sur « Create Access Key ».
2. Copiez la clé reçue dans `web3formsKey` de `config.js`.
3. Testez avec `index.html?test=1` : un email `[TEST]` doit arriver (pensez à vérifier les spams). Aucun bon n'est consommé.

## 3. Publier sur GitHub Pages
```bash
git init && git add . && git commit -m "Carnet de bons"
git branch -M main
git remote add origin https://github.com/<vous>/bon-pour.git
git push -u origin main
```
Sur GitHub, allez dans **Settings → Pages → Source : Deploy from a branch → `main` / `(root)`**. L'adresse est `https://<vous>.github.io/bon-pour/`.

## 4. Quand vous recevez un email : synchroniser les deux PC
L'email contient une ligne **« À copier dans config.js »**. Collez-la telle quelle dans `dejaUtilises` :
```js
dejaUtilises: [
  { uid: "lz8k2a9f", bon: "jardin", date: "2026-10-20", message: "Plutôt un samedi matin" },
],
```
Faites ensuite `git pull`, puis `git commit -am "Bon jardin utilisé" && git push`. Après une minute, l'utilisation apparaît sur les deux ordinateurs. Grâce au `uid`, elle n'est jamais comptée deux fois.

## 5. Faire vivre le carnet
Sur la ligne d'une utilisation dans `dejaUtilises`, ajoutez :
- `prevu: "2026-10-25"` quand la date est fixée. La carte affiche « Prévu le dimanche 25 octobre » et un encadré « Prochain rendez-vous » apparaît en haut. Une fois la date passée, la ligne devient « Fait le… ».
- `photo: "photos/jardin.jpg"` et éventuellement `legende: "…"`. Mettez la photo dans le dossier `photos/` : elle apparaît dans l'album « Nos moments ». Pensez à réduire la photo à environ 1600px de large pour qu'elle charge vite.

**Bon mystère** : c'est le bon `mystere: true` de `config.js`. On le gratte en passant la souris dessus. Chaque PC le découvre une fois. Choisissez votre surprise en modifiant sa catégorie, son titre et son détail.

## Raccourcis utiles
- `?test=1` : mode test.
- `?reset=1` : remet à zéro les bons utilisés **sur ce PC** (par exemple après un clic par erreur). Ce paramètre ne touche pas `dejaUtilises`.
