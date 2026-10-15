// Carnet de bons : logique de la page. Toute la personnalisation est dans config.js.
(function () {
  "use strict";

  const CLE_STOCKAGE = "bons-v2";
  const ANCIENNES_CLES = ["bons-v1"];
  const URL_WEB3FORMS = "https://api.web3forms.com/submit";
  const DELAI_ENVOI_MS = 15000;
  const TEINTES = ["#ffe4d6", "#dff3e6", "#e4e8ff", "#fff1c7", "#fde2ec", "#d9f1f6", "#eee5ff", "#ecf3d6"];

  const params = new URLSearchParams(window.location.search);
  const MODE_TEST = params.has("test");

  if (typeof CONFIG === "undefined") {
    document.body.textContent = "Erreur : le fichier config.js est introuvable.";
    return;
  }

  // ?reset=1 : remet à zéro les bons utilisés sur ce PC.
  if (params.has("reset")) {
    if (window.confirm("Remettre à zéro les bons utilisés sur cet ordinateur ?")) {
      for (const cle of [CLE_STOCKAGE, ...ANCIENNES_CLES]) {
        try { localStorage.removeItem(cle); } catch (e) { /* stockage indisponible */ }
      }
    }
    window.location.replace(window.location.pathname);
    return;
  }

  const prenoms = CONFIG.prenoms || [];
  const dejaUtilises = Array.isArray(CONFIG.dejaUtilises) ? CONFIG.dejaUtilises : [];
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
      else if (cle === "style") el.style.cssText = valeur;
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
      const liste = JSON.parse(localStorage.getItem(CLE_STOCKAGE));
      return Array.isArray(liste) ? liste : [];
    } catch (e) {
      return [];
    }
  }

  function ecrireLocal(liste) {
    try {
      localStorage.setItem(CLE_STOCKAGE, JSON.stringify(liste));
    } catch (e) {
      console.warn("Impossible d'enregistrer dans localStorage", e);
    }
  }

  // Toutes les utilisations connues : config.js (synchronisé par moi) + ce PC, dédoublonnées par uid.
  function toutesUtilisations() {
    const parUid = new Map();
    for (const u of lireLocal()) if (u && u.uid) parUid.set(u.uid, u);
    for (const u of dejaUtilises) if (u && u.bon) parUid.set(u.uid || Math.random(), u);
    return [...parUid.values()];
  }

  function quantite(bon) {
    return bon.quantite || CONFIG.quantiteParDefaut || 1;
  }

  function nouvelUid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
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

  function teinte(bon, index) {
    return bon.couleur || TEINTES[index % TEINTES.length];
  }

  // ---------- En-tête ----------

  function rendreEntete() {
    const noms = prenoms.join(" & ");
    document.title = `Les bons de ${noms}`;
    $("#titre").replaceChildren("Joyeux anniversaire", h("span", { class: "noms" }, noms));
    $("#message").textContent = CONFIG.messageAccueil || "";
    $("#avatar").textContent = (CONFIG.monPrenom || "?").charAt(0).toUpperCase();
    $("#signature").textContent = `Avec tout mon amour, ${CONFIG.monPrenom}`;
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
    const utilisations = toutesUtilisations();
    const grille = $("#grille");
    let total = 0;
    let restantsTotal = 0;

    grille.replaceChildren();
    CONFIG.bons.forEach((bon, i) => {
      const usages = utilisations
        .filter((u) => u.bon === bon.id)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));
      const max = quantite(bon);
      total += max;
      restantsTotal += Math.max(0, max - usages.length);
      grille.append(carte(bon, i, usages, bon.id === idAnime));
    });

    const compteur = $("#compteur");
    if (restantsTotal === 0) {
      compteur.textContent = "Tous les bons ont été utilisés ! Un nouveau carnet arrive bientôt… 😉";
    } else {
      compteur.replaceChildren(
        "Il vous reste ", h("strong", {}, String(restantsTotal)),
        restantsTotal > 1 ? ` bons sur ${total}` : ` bon sur ${total}`);
    }
    $("#jauge").style.width = total ? `${(restantsTotal / total) * 100}%` : "0";
  }

  function carte(bon, index, usages, animer) {
    const max = quantite(bon);
    const restants = Math.max(0, max - usages.length);
    const epuise = restants === 0;

    const classes = ["bon"];
    if (bon.joker) classes.push("bon-joker");
    if (epuise) classes.push("bon-epuise");

    // Tickets : d'abord les disponibles, puis les utilisés. Le dernier utilisé « saute » après un envoi.
    const tickets = [];
    for (let i = 0; i < max; i++) {
      const utilise = i >= restants;
      const pop = animer && i === restants;
      tickets.push(h("span", { class: "ticket" + (utilise ? " utilise" : "") + (pop ? " pop" : "") }));
    }

    return h("article", { class: classes.join(" "), "data-id": bon.id },
      h("div", { class: "bon-haut" },
        h("div", { class: "bon-tuile", style: `--teinte: ${teinte(bon, index)}`, "aria-hidden": "true" }, bon.emoji),
        h("span", { class: "bon-etiquette" }, bon.joker ? "Joker" : "Bon pour")),
      h("h3", { class: "bon-titre" }, bon.titre),
      bon.detail && h("p", { class: "bon-detail" }, bon.detail),
      h("div", { class: "bon-stock" },
        h("div", { class: "tickets", "aria-hidden": "true" }, tickets),
        h("span", { class: "stock-texte" },
          epuise ? "Tous utilisés" : `${restants} ${restants > 1 ? "restants" : "restant"} sur ${max}`)),
      usages.length > 0 && h("ul", { class: "bon-historique" },
        usages.map((u) => h("li", {},
          `Utilisé le ${dateLisible(u.date)}`, u.message ? ` · « ${u.message} »` : ""))),
      h("p", { class: "bon-offert print-only" }, `Offert avec tout mon amour par ${CONFIG.monPrenom}`),
      h("div", { class: "bon-actions" },
        epuise
          ? h("p", { class: "epuise-note" }, "Tous utilisés, merci ! 💛")
          : h("button", { type: "button", class: "btn btn-principal", onclick: () => ouvrirModale(bon, index, restants) },
            bon.joker ? "Utiliser un joker" : "Utiliser ce bon"),
        h("button", { type: "button", class: "btn btn-secondaire", onclick: () => imprimer(bon.id) },
          "🖨️ Imprimer")));
  }

  // ---------- Modale ----------

  function ouvrirModale(bon, index, restants) {
    dernierFocus = document.activeElement;
    afficherFormulaire(bon, index, restants);
    modale.hidden = false;
    page.inert = true;
    document.body.classList.add("modale-ouverte");
    $("#mot")?.focus();
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

  function afficherFormulaire(bon, index, restants) {
    const apres = restants - 1;
    const sousTitre = apres === 0
      ? "C'est le dernier de ce type !"
      : `Il vous en restera ${apres} après celui-ci.`;

    const zone = h("textarea", {
      id: "mot",
      rows: "4",
      placeholder: bon.joker
        ? "Par exemple : m'aider à installer la nouvelle imprimante"
        : "Par exemple : plutôt un samedi matin",
    });
    const erreur = h("p", { class: "erreur", role: "alert", hidden: true });
    const boutonEnvoyer = h("button", { type: "submit", class: "btn btn-principal btn-grand" },
      `Envoyer à ${CONFIG.monPrenom}`);

    const form = h("form", { novalidate: true },
      h("div", { class: "modale-entete" },
        h("div", { class: "bon-tuile", style: `--teinte: ${teinte(bon, index)}`, "aria-hidden": "true" }, bon.emoji),
        h("h2", { id: "modale-titre" }, bon.joker ? "Utiliser un joker" : bon.titre),
        h("p", { class: "modale-sous-titre" }, sousTitre)),
      h("label", { for: "mot", class: "etiquette" },
        bon.joker ? "De quoi avez-vous besoin ?" : "Un petit mot ? (facultatif)"),
      zone,
      erreur,
      h("div", { class: "modale-actions" },
        boutonEnvoyer,
        h("button", { type: "button", class: "btn btn-secondaire", onclick: fermerModale }, "Annuler")));

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (envoiEnCours) return;

      const message = zone.value.trim();
      if (bon.joker && !message) {
        montrerErreur(erreur, "Écrivez en quelques mots ce dont vous avez besoin.");
        zone.focus();
        return;
      }

      const utilisation = { uid: nouvelUid(), bon: bon.id, date: aujourdhuiISO(), message };
      erreur.hidden = true;
      envoiEnCours = true;
      boutonEnvoyer.disabled = true;
      boutonEnvoyer.textContent = "Envoi en cours…";
      try {
        await envoyer(bon, utilisation, apres);
        envoiEnCours = false;
        afficherSucces(utilisation);
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

  function afficherSucces(utilisation) {
    if (!MODE_TEST) {
      ecrireLocal([...lireLocal(), utilisation]);
      animerApresFermeture = utilisation.bon;
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

  function ligneConfig(u) {
    const champs = [`uid: ${JSON.stringify(u.uid)}`, `bon: ${JSON.stringify(u.bon)}`, `date: ${JSON.stringify(u.date)}`];
    if (u.message) champs.push(`message: ${JSON.stringify(u.message)}`);
    return `{ ${champs.join(", ")} },`;
  }

  async function envoyer(bon, utilisation, restantsApres) {
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
      ? `${prefixe}🃏 Demande sur mesure : ${utilisation.message.slice(0, 60)}`
      : `${prefixe}🎁 Bon utilisé : ${bon.titre}`;

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
          "Message": utilisation.message || "(pas de message)",
          "Date": dateLisible(utilisation.date),
          "Il en reste": `${restantsApres} sur ${quantite(bon)}`,
          "À copier dans config.js (dejaUtilises)": ligneConfig(utilisation),
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
      colors: ["#6d4aff", "#ff8a5c", "#ffd166", "#1f8a5b", "#e8553d"],
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
