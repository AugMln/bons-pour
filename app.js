// Carnet de bons : logique de la page. Toute la personnalisation est dans config.js.
(function () {
  "use strict";

  const CLE_STOCKAGE = "bons-v1";
  const URL_WEB3FORMS = "https://api.web3forms.com/submit";
  const DELAI_ENVOI_MS = 15000;

  const params = new URLSearchParams(window.location.search);
  const MODE_TEST = params.has("test");

  if (typeof CONFIG === "undefined") {
    document.body.textContent = "Erreur : le fichier config.js est introuvable.";
    return;
  }

  // ?reset=1 : remet à zéro les bons utilisés sur ce PC.
  if (params.has("reset")) {
    if (window.confirm("Remettre à zéro les bons utilisés sur cet ordinateur ?")) {
      try { localStorage.removeItem(CLE_STOCKAGE); } catch (e) { /* stockage indisponible */ }
    }
    window.location.replace(window.location.pathname);
    return;
  }

  const prenoms = CONFIG.prenoms || [];
  const dejaUtilises = CONFIG.dejaUtilises || {};
  const $ = (sel) => document.querySelector(sel);

  const page = $("#page");
  const modale = $("#modale");
  const panneau = $("#modale-panneau");

  let envoiEnCours = false;
  let dernierFocus = null;
  let animerApresFermeture = null;

  // ---------- Utilitaires ----------

  function h(tag, attrs, ...enfants) {
    const el = document.createElement(tag);
    for (const [cle, valeur] of Object.entries(attrs || {})) {
      if (valeur == null || valeur === false) continue;
      if (cle === "class") el.className = valeur;
      else if (cle.startsWith("on")) el.addEventListener(cle.slice(2), valeur);
      else el.setAttribute(cle, valeur === true ? "" : valeur);
    }
    for (const enfant of enfants.flat()) {
      if (enfant == null || enfant === false || enfant === "") continue;
      el.append(enfant instanceof Node ? enfant : String(enfant));
    }
    return el;
  }

  function lireLocal() {
    try {
      const etat = JSON.parse(localStorage.getItem(CLE_STOCKAGE));
      return etat && typeof etat === "object" ? etat : {};
    } catch (e) {
      return {};
    }
  }

  function ecrireLocal(etat) {
    try {
      localStorage.setItem(CLE_STOCKAGE, JSON.stringify(etat));
    } catch (e) {
      console.warn("Impossible d'enregistrer dans localStorage", e);
    }
  }

  // config.js (synchronisé par moi) est prioritaire sur le localStorage du PC.
  function utilisation(id, local) {
    return dejaUtilises[id] || local[id] || null;
  }

  function aujourdhuiISO() {
    const d = new Date();
    const deux = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
  }

  function dateLisible(iso) {
    if (!iso) return "";
    const [annee, mois, jour] = String(iso).split("-").map(Number);
    const d = new Date(annee, (mois || 1) - 1, jour || 1);
    if (isNaN(d)) return String(iso);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }

  // ---------- En-tête ----------

  function rendreEntete() {
    const noms = prenoms.join(" & ");
    document.title = `🎁 Les bons de ${noms}`;
    $("#titre").textContent = `Joyeux anniversaire ${noms} !`;
    $("#message").textContent = CONFIG.messageAccueil || "";
    $("#signature").textContent = CONFIG.monPrenom ? `— ${CONFIG.monPrenom}` : "";
    $("#etape3").textContent = `${CONFIG.monPrenom} reçoit votre message et vous recontacte`;
    $("#telephone").textContent = CONFIG.monTelephone || "";

    const bandeaux = $("#bandeaux");
    if (MODE_TEST) {
      bandeaux.append(h("div", { class: "bandeau bandeau-test" },
        "🧪 MODE TEST : les emails sont marqués [TEST] et aucun bon n'est consommé."));
    }
    if (!(CONFIG.web3formsKey || "").trim()) {
      bandeaux.append(h("div", { class: "bandeau bandeau-alerte" },
        "⚠️ Clé Web3Forms manquante dans config.js : les envois ne fonctionneront pas."));
    }
  }

  // ---------- Carnet ----------

  function rendreCarnet(idAnime) {
    const local = lireLocal();
    const grille = $("#grille");
    let restants = 0;

    grille.replaceChildren();
    for (const bon of CONFIG.bons) {
      const u = utilisation(bon.id, local);
      if (!u) restants++;
      grille.append(carte(bon, u, bon.id === idAnime));
    }

    const total = CONFIG.bons.length;
    const compteur = $("#compteur");
    if (restants === 0) {
      compteur.textContent = "Tous les bons ont été utilisés ! Un nouveau carnet arrive bientôt… 😉";
    } else {
      compteur.replaceChildren(
        "Il vous reste ", h("strong", {}, String(restants)),
        restants > 1 ? ` bons sur ${total}` : ` bon sur ${total}`);
    }
  }

  function carte(bon, u, animer) {
    const classes = ["bon"];
    if (bon.joker) classes.push("bon-joker");
    if (u) classes.push("bon-utilise");

    return h("article", { class: classes.join(" "), "data-id": bon.id },
      h("div", { class: "bon-contenu" },
        h("div", { class: "bon-entete" }, bon.joker ? "Joker" : "Bon pour"),
        h("div", { class: "bon-emoji", "aria-hidden": "true" }, bon.emoji),
        h("h3", { class: "bon-titre" }, bon.titre),
        bon.detail && h("p", { class: "bon-detail" }, bon.detail)),
      u && h("div", { class: "bon-statut" },
        h("p", { class: "bon-info" }, `Utilisé par ${u.par} le ${dateLisible(u.date)}`),
        u.message && h("p", { class: "bon-mot" }, `« ${u.message} »`)),
      h("p", { class: "bon-offert print-only" }, `Offert avec tout mon amour par ${CONFIG.monPrenom}`),
      u && h("div", { class: "tampon" + (animer ? " tampon-anime" : ""), "aria-hidden": "true" }, "Utilisé"),
      h("div", { class: "bon-actions" },
        !u && h("button", { type: "button", class: "btn btn-principal", onclick: () => ouvrirModale(bon) },
          bon.joker ? "Utiliser ce joker" : "Utiliser ce bon"),
        h("button", { type: "button", class: "btn btn-secondaire", onclick: () => imprimer(bon.id) },
          "🖨️ Imprimer")));
  }

  // ---------- Modale ----------

  function ouvrirModale(bon) {
    dernierFocus = document.activeElement;
    afficherFormulaire(bon);
    modale.hidden = false;
    page.inert = true;
    document.body.classList.add("modale-ouverte");
    const cible = panneau.querySelector("[data-focus]");
    if (cible) cible.focus();
  }

  function fermerModale() {
    if (envoiEnCours) return;
    modale.hidden = true;
    page.inert = false;
    document.body.classList.remove("modale-ouverte");

    if (animerApresFermeture) {
      const id = animerApresFermeture;
      animerApresFermeture = null;
      rendreCarnet(id);
      const c = document.querySelector(`.bon[data-id="${CSS.escape(id)}"]`);
      if (c) {
        c.scrollIntoView({ behavior: "smooth", block: "center" });
        c.querySelector("button")?.focus({ preventScroll: true });
      }
    } else if (dernierFocus) {
      dernierFocus.focus();
    }
  }

  function afficherFormulaire(bon) {
    const seul = prenoms.length === 1;

    const choix = prenoms.map((prenom, i) => {
      const input = h("input", { type: "radio", name: "par", value: prenom, checked: seul, "data-focus": i === 0 && !seul });
      return h("label", { class: "choix" + (seul ? " coche" : "") }, input, h("span", {}, prenom));
    });

    const zone = h("textarea", {
      id: "mot",
      rows: "4",
      "data-focus": seul,
      placeholder: bon.joker
        ? "Par exemple : m'aider à installer la nouvelle imprimante"
        : "Par exemple : plutôt un samedi matin",
    });
    const erreur = h("p", { class: "erreur", role: "alert", hidden: true });
    const boutonEnvoyer = h("button", { type: "submit", class: "btn btn-principal btn-grand" }, "✅ Oui, envoyer");

    const form = h("form", { novalidate: true },
      h("h2", { id: "modale-titre" }, bon.joker ? "Utiliser un joker" : "Utiliser ce bon ?"),
      h("p", { class: "modale-bon" }, `${bon.emoji} ${bon.titre}`),
      h("fieldset", { class: "qui" },
        h("legend", {}, "Qui utilise ce bon ?"),
        h("div", { class: "choix-liste" }, choix)),
      h("label", { for: "mot", class: "etiquette" },
        bon.joker ? "De quoi avez-vous besoin ?" : "Un petit mot ? (facultatif)"),
      zone,
      erreur,
      h("div", { class: "modale-actions" },
        boutonEnvoyer,
        h("button", { type: "button", class: "btn btn-secondaire", onclick: fermerModale }, "Annuler")));

    // Coloration du prénom choisi (sans dépendre de :has()).
    form.addEventListener("change", (ev) => {
      if (ev.target.name !== "par") return;
      form.querySelectorAll(".choix").forEach((l) => l.classList.toggle("coche", l.contains(ev.target)));
      erreur.hidden = true;
    });

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (envoiEnCours) return;

      const par = form.querySelector('input[name="par"]:checked')?.value;
      const message = zone.value.trim();
      if (!par) {
        montrerErreur(erreur, "Cliquez sur votre prénom pour dire qui utilise ce bon.");
        return;
      }
      if (bon.joker && !message) {
        montrerErreur(erreur, "Écrivez en quelques mots ce dont vous avez besoin.");
        zone.focus();
        return;
      }

      erreur.hidden = true;
      envoiEnCours = true;
      boutonEnvoyer.disabled = true;
      boutonEnvoyer.textContent = "Envoi en cours…";
      try {
        await envoyer(bon, par, message);
        envoiEnCours = false;
        afficherSucces(bon, par, message);
      } catch (e) {
        console.error("Échec de l'envoi", e);
        envoiEnCours = false;
        boutonEnvoyer.disabled = false;
        boutonEnvoyer.textContent = "🔁 Réessayer";
        montrerErreur(erreur,
          "Oups, ça n'a pas marché. Vérifiez que l'ordinateur est bien connecté à internet, puis réessayez. " +
          `Sinon, appelez-moi au ${CONFIG.monTelephone}.`);
      }
    });

    panneau.replaceChildren(form);
  }

  function montrerErreur(el, texte) {
    el.textContent = texte;
    el.hidden = false;
  }

  function afficherSucces(bon, par, message) {
    if (!MODE_TEST) {
      const etat = lireLocal();
      etat[bon.id] = { par, message, date: aujourdhuiISO() };
      ecrireLocal(etat);
      animerApresFermeture = bon.id;
    }

    const bouton = h("button", { type: "button", class: "btn btn-principal btn-grand", onclick: fermerModale },
      "Voir mon carnet");
    panneau.replaceChildren(h("div", { class: "succes" },
      h("div", { class: "succes-icone", "aria-hidden": "true" }, "🎉"),
      h("h2", { id: "modale-titre" }, "C'est envoyé !"),
      h("p", {}, `${CONFIG.monPrenom} a bien reçu votre message et vous recontacte très vite 💛`),
      MODE_TEST && h("p", { class: "note-test" }, "(Mode test : le bon n'a pas été consommé.)"),
      bouton));
    bouton.focus();
    lancerConfettis();
  }

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !modale.hidden) fermerModale();
  });

  // ---------- Envoi (Web3Forms) ----------

  async function envoyer(bon, par, message) {
    const cle = (CONFIG.web3formsKey || "").trim();
    if (!cle) {
      if (MODE_TEST) {
        await new Promise((r) => setTimeout(r, 800)); // envoi simulé
        return;
      }
      throw new Error("Clé Web3Forms manquante dans config.js");
    }

    const prefixe = MODE_TEST ? "[TEST] " : "";
    const sujet = bon.joker
      ? `${prefixe}🃏 Demande sur mesure de ${par}`
      : `${prefixe}🎁 Bon utilisé : ${bon.titre} (${par})`;

    const controle = new AbortController();
    const minuteur = setTimeout(() => controle.abort(), DELAI_ENVOI_MS);
    try {
      const reponse = await fetch(URL_WEB3FORMS, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: cle,
          subject: sujet,
          from_name: "Carnet de bons",
          "Bon": `${bon.emoji} ${bon.titre}`,
          "Utilisé par": par,
          "Message": message || "(pas de message)",
          "Date": dateLisible(aujourdhuiISO()),
          "Identifiant (pour config.js)": bon.id,
        }),
        signal: controle.signal,
      });
      const donnees = await reponse.json().catch(() => ({}));
      if (!reponse.ok || !donnees.success) {
        throw new Error(donnees.message || `HTTP ${reponse.status}`);
      }
    } finally {
      clearTimeout(minuteur);
    }
  }

  // ---------- Confettis ----------

  function lancerConfettis() {
    if (typeof confetti !== "function") return;
    const options = {
      colors: ["#b5442f", "#d99a2b", "#55744a", "#f6e7c8", "#c62828"],
      zIndex: 1000,
      disableForReducedMotion: true,
    };
    confetti({ ...options, particleCount: 150, spread: 100, origin: { y: 0.6 } });
    setTimeout(() => confetti({ ...options, particleCount: 80, angle: 60, spread: 70, origin: { x: 0, y: 0.7 } }), 250);
    setTimeout(() => confetti({ ...options, particleCount: 80, angle: 120, spread: 70, origin: { x: 1, y: 0.7 } }), 400);
  }

  // ---------- Impression ----------

  function imprimer(id) {
    const c = document.querySelector(`.bon[data-id="${CSS.escape(id)}"]`);
    if (!c) return;
    document.body.classList.add("impression-bon");
    c.classList.add("a-imprimer");
    const nettoyer = () => {
      document.body.classList.remove("impression-bon");
      c.classList.remove("a-imprimer");
      window.removeEventListener("afterprint", nettoyer);
    };
    window.addEventListener("afterprint", nettoyer);
    window.print();
  }

  // ---------- Démarrage ----------

  rendreEntete();
  rendreCarnet();
})();
