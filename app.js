// Carnet de bons : logique de la page. Toute la personnalisation est dans config.js.
(function () {
  "use strict";

  const CLE_STOCKAGE = "bons-v2";
  const CLE_MYSTERE = "bons-mystere-v1";
  const CLE_ENVELOPPE = "bons-enveloppe-v1";
  const ANCIENNES_CLES = ["bons-v1"];
  const URL_WEB3FORMS = "https://api.web3forms.com/submit";
  const DELAI_ENVOI_MS = 15000;
  const PEU_IMPORTE = "Peu importe";

  const params = new URLSearchParams(window.location.search);
  const MODE_TEST = params.has("test");

  if (typeof CONFIG === "undefined") {
    document.body.textContent = "Erreur : le fichier config.js est introuvable.";
    return;
  }

  // ?reset=1 : remet à zéro les bons utilisés (et le bon mystère) sur ce PC.
  if (params.has("reset")) {
    if (window.confirm("Remettre à zéro les bons utilisés sur cet ordinateur ?")) {
      for (const cle of [CLE_STOCKAGE, CLE_MYSTERE, CLE_ENVELOPPE, ...ANCIENNES_CLES]) {
        try { localStorage.removeItem(cle); } catch (e) { /* stockage indisponible */ }
      }
    }
    window.location.replace(window.location.pathname);
    return;
  }

  const prenoms = CONFIG.prenoms || [];
  const dejaUtilises = Array.isArray(CONFIG.dejaUtilises) ? CONFIG.dejaUtilises : [];
  const bonsParId = new Map(CONFIG.bons.map((b) => [b.id, b]));
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

  function lireListe(cle) {
    try {
      const liste = JSON.parse(localStorage.getItem(cle));
      return Array.isArray(liste) ? liste : [];
    } catch (e) {
      return [];
    }
  }

  function ecrireListe(cle, liste) {
    try {
      localStorage.setItem(cle, JSON.stringify(liste));
    } catch (e) {
      console.warn("Impossible d'enregistrer dans localStorage", e);
    }
  }

  // Toutes les utilisations connues : ce PC + config.js (prioritaire, synchronisé par moi), dédoublonnées par uid.
  function toutesUtilisations() {
    const parUid = new Map();
    for (const u of lireListe(CLE_STOCKAGE)) if (u && u.uid) parUid.set(u.uid, u);
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

  function dateLisible(iso, avecJour) {
    if (!iso) return "";
    const [annee, mois, jour] = String(iso).split("-").map(Number);
    const d = new Date(annee, (mois || 1) - 1, jour || 1);
    if (isNaN(d)) return String(iso);
    const options = { day: "numeric", month: "long", year: "numeric" };
    if (avecJour) options.weekday = "long";
    return d.toLocaleDateString("fr-FR", options);
  }

  function numero(index) {
    return `N° ${String(index + 1).padStart(2, "0")}`;
  }

  // Demandé → Prévu (date fixée par moi dans config.js) → Honoré (date passée)
  function statut(u) {
    if (u.prevu && u.prevu >= aujourdhuiISO()) {
      return { classe: "prevu", mot: "prévu", date: u.prevu, texte: `Prévu le ${dateLisible(u.prevu, true)}` };
    }
    if (u.prevu) return { classe: "honore", mot: "honoré", date: u.prevu, texte: `Honoré le ${dateLisible(u.prevu)}` };
    return { classe: "demande", mot: "demandé", date: u.date, texte: `Demandé le ${dateLisible(u.date)}` };
  }

  // « 2026-10-25 » → « 25.10.26 », façon tampon dateur
  function dateCourte(iso) {
    const [annee, mois, jour] = String(iso).split("-");
    return jour && mois && annee ? `${jour}.${mois}.${annee.slice(2)}` : String(iso);
  }

  // Sceau de cire à l'initiale de l'auteur
  function sceau(classe) {
    return h("span", { class: `sceau ${classe || ""}`, "aria-hidden": "true" },
      h("span", {}, (CONFIG.monPrenom || "?").charAt(0).toUpperCase()));
  }

  // ---------- En-tête ----------

  function rendreEntete() {
    const noms = prenoms.join(" & ");
    const totalBons = CONFIG.bons.reduce((somme, bon) => somme + quantite(bon), 0);
    document.title = `Les bons de ${noms}`;

    const moisAnnee = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    $("#mast-date").textContent = moisAnnee;
    $("#noms").textContent = noms;
    $("#fiche-auteur").textContent = CONFIG.monPrenom || "";
    $("#fiche-contenu").textContent = `${totalBons} bons, ${CONFIG.bons.length} sortes`;
    $("#message").textContent = CONFIG.messageAccueil || "";
    $("#signature").textContent = CONFIG.monPrenom || "";
    $("#etape3").textContent = `${CONFIG.monPrenom} reçoit votre message et vous recontacte.`;

    // Photo d'accueil facultative, présentée comme un tirage sépia.
    if (CONFIG.photoAccueil) {
      $("#photo-accueil").src = CONFIG.photoAccueil;
      $("#hero-photo").hidden = false;
    }

    const bandeaux = $("#bandeaux");
    if (MODE_TEST) {
      bandeaux.append(h("div", { class: "bandeau bandeau-test" },
        "Mode test — les emails sont marqués [TEST] et aucun bon n'est consommé."));
    }
    if (!(CONFIG.web3formsKey || "").trim()) {
      bandeaux.append(h("div", { class: "bandeau bandeau-alerte" },
        "Clé Web3Forms manquante dans config.js : les envois ne fonctionneront pas."));
    }
  }

  // ---------- Carnet ----------

  function rendre(idAnime) {
    const utilisations = toutesUtilisations();
    rendreProchain(utilisations);
    rendreCarnet(utilisations, idAnime);
    rendreAlbum(utilisations);
  }

  function rendreProchain(utilisations) {
    const auj = aujourdhuiISO();
    const aVenir = utilisations
      .filter((u) => u.prevu && u.prevu >= auj && bonsParId.has(u.bon))
      .sort((a, b) => a.prevu.localeCompare(b.prevu));
    const el = $("#prochain");
    if (aVenir.length === 0) {
      el.hidden = true;
      return;
    }
    const u = aVenir[0];
    const bon = bonsParId.get(u.bon);
    el.replaceChildren(
      h("span", { class: "prochain-label" }, "Prochain rendez-vous"),
      h("strong", { class: "prochain-titre" }, bon.joker && u.message ? u.message : bon.titre),
      h("span", { class: "prochain-date" }, dateLisible(u.prevu, true)));
    el.hidden = false;
  }

  function rendreCarnet(utilisations, idAnime) {
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
      compteur.textContent = "Tous les bons ont été utilisés ! Un nouveau carnet arrive bientôt.";
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
    if (bon.mystere) classes.push("bon-mystere");
    if (epuise) classes.push("bon-epuise");

    // Carnet à souches : un talon par exemplaire. Les talons utilisés sont « détachés » et datés,
    // le dernier se détache sous les yeux après un envoi.
    const souches = [];
    usages.slice(0, max).forEach((u, i) => {
      const s = statut(u);
      const vientDePartir = animer && i === usages.length - 1;
      souches.push(h("div", {
        class: `talon detache talon-${s.classe}` + (vientDePartir ? " vient-de-partir" : ""),
        title: s.texte + (u.message ? ` — « ${u.message} »` : ""),
      },
        h("span", { class: "talon-num" }, `${i + 1}/${max}`),
        h("span", { class: "talon-date" }, dateCourte(s.date)),
        h("span", { class: "talon-etat" }, s.mot),
        s.classe === "honore" && sceau("sceau-mini")));
    });
    for (let i = Math.min(usages.length, max); i < max; i++) {
      souches.push(h("div", { class: "talon libre" },
        h("span", { class: "talon-num" }, `${i + 1}/${max}`),
        h("span", { class: "talon-etat" }, "à utiliser")));
    }
    const compte = epuise
      ? (max > 1 ? "toutes utilisées" : "utilisée")
      : `${restants} sur ${max} disponible${restants > 1 ? "s" : ""}`;

    const kicker = bon.mystere ? "Un bon mystère" : bon.joker ? "Un joker pour" : "Bon pour";
    const article = h("article", { class: classes.join(" "), "data-id": bon.id },
      h("div", { class: "bon-meta" },
        h("span", {}, numero(index)),
        h("span", {}, bon.categorie || "")),
      h("div", { class: "bon-corps" },
        h("p", { class: "bon-kicker" }, kicker),
        h("h3", { class: "bon-titre" }, bon.titre),
        bon.detail && h("p", { class: "bon-detail" }, bon.detail)),
      h("div", { class: "bon-fiche" },
        h("div", { class: "souches-entete" },
          h("span", { class: "etiquette-fiche" }, "Souches"),
          h("span", { class: "souches-compte" }, compte)),
        h("div", { class: "souches", style: `--n: ${max}` }, souches)),
      h("p", { class: "bon-offert print-only" }, `Offert avec tout mon amour par ${CONFIG.monPrenom}`),
      h("div", { class: "bon-actions" },
        epuise
          ? h("p", { class: "epuise-note" }, "Tous utilisés, merci.")
          : h("button", { type: "button", class: "btn btn-principal fleche", onclick: () => ouvrirModale(bon, index, restants) },
            bon.joker ? "Utiliser un joker" : "Utiliser ce bon"),
        h("button", { type: "button", class: "btn btn-secondaire", onclick: () => imprimer(bon.id) },
          "Imprimer ce bon")));

    if (bon.mystere && usages.length === 0 && !lireListe(CLE_MYSTERE).includes(bon.id)) {
      ajouterGrattage(article, bon, index);
    }
    return article;
  }

  // ---------- Bon mystère à gratter ----------

  function ajouterGrattage(article, bon, index) {
    const canvas = h("canvas", { class: "grattage", "aria-hidden": "true" });
    const boutonDecouvrir = h("button", { type: "button", class: "btn-decouvrir" }, "Ou cliquez ici pour découvrir");
    const couche = h("div", { class: "couche-mystere" }, canvas, boutonDecouvrir);
    const contenu = [...article.children];

    contenu.forEach((el) => { el.inert = true; });
    article.append(couche);

    let ctx = null;
    let dernier = null;
    let mouvements = 0;
    let fini = false;

    function dessiner() {
      if (!canvas.isConnected) return;
      const ratio = window.devicePixelRatio || 1;
      const l = canvas.clientWidth;
      const ht = canvas.clientHeight;
      canvas.width = l * ratio;
      canvas.height = ht * ratio;
      ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.scale(ratio, ratio);

      // Bordeaux avec un grain de pellicule et un double filet doré.
      ctx.fillStyle = "#7b2d26";
      ctx.fillRect(0, 0, l, ht);
      for (let i = 0; i < (l * ht) / 18; i++) {
        ctx.fillStyle = Math.random() < 0.5 ? "rgba(0, 0, 0, 0.10)" : "rgba(255, 240, 220, 0.07)";
        ctx.fillRect(Math.random() * l, Math.random() * ht, 1.5, 1.5);
      }
      ctx.strokeStyle = "#d9c49c";
      ctx.lineWidth = 1;
      ctx.strokeRect(10.5, 10.5, l - 21, ht - 21);
      ctx.strokeRect(15.5, 15.5, l - 31, ht - 31);

      const cx = l / 2;
      ctx.fillStyle = "#d9c49c";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = "500 12px Jost, sans-serif";
      ctx.fillText(`${numero(index)}  ·  SURPRISE`, cx, 52);

      // Ornement : filet — losange — filet
      const oy = ht / 2 - 78;
      ctx.beginPath();
      ctx.moveTo(cx - 70, oy); ctx.lineTo(cx - 12, oy);
      ctx.moveTo(cx + 12, oy); ctx.lineTo(cx + 70, oy);
      ctx.moveTo(cx, oy - 5); ctx.lineTo(cx + 5, oy); ctx.lineTo(cx, oy + 5); ctx.lineTo(cx - 5, oy); ctx.closePath();
      ctx.stroke();

      ctx.fillStyle = "#faf6ee";
      ctx.font = "italic 500 30px 'Cormorant Garamond', serif";
      ctx.fillText("un bon", cx, ht / 2 - 30);
      ctx.font = "600 52px 'Cormorant Garamond', serif";
      ctx.fillText("Mystère", cx, ht / 2 + 18);
      ctx.fillStyle = "#e3cfc6";
      ctx.font = "italic 400 23px 'Cormorant Garamond', serif";
      ctx.fillText("Passez la souris dessus", cx, ht / 2 + 60);
      ctx.fillText("pour le gratter.", cx, ht / 2 + 86);

      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 70;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }

    function proportionGrattee() {
      const donnees = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let vides = 0;
      let echantillons = 0;
      for (let i = 3; i < donnees.length; i += 4 * 16) {
        echantillons++;
        if (donnees[i] === 0) vides++;
      }
      return echantillons ? vides / echantillons : 1;
    }

    function devoiler() {
      if (fini) return;
      fini = true;
      ecrireListe(CLE_MYSTERE, [...lireListe(CLE_MYSTERE), bon.id]);
      contenu.forEach((el) => { el.inert = false; });
      couche.classList.add("disparait");
      setTimeout(() => couche.remove(), 800);
    }

    // Gratter au simple passage de la souris (pas besoin de cliquer), ou au doigt sur écran tactile.
    canvas.addEventListener("pointermove", (ev) => {
      if (fini || !ctx) return;
      const r = canvas.getBoundingClientRect();
      const x = ev.clientX - r.left;
      const y = ev.clientY - r.top;
      ctx.beginPath();
      ctx.moveTo(dernier ? dernier.x : x, dernier ? dernier.y : y);
      ctx.lineTo(x, y);
      ctx.stroke();
      dernier = { x, y };
      if (++mouvements % 12 === 0 && proportionGrattee() > 0.5) devoiler();
    });
    canvas.addEventListener("pointerleave", () => { dernier = null; });
    boutonDecouvrir.addEventListener("click", devoiler);

    // Dessiner une fois la carte placée dans la page et la police chargée.
    requestAnimationFrame(() => {
      dessiner();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (mouvements === 0) dessiner(); });
    });
  }

  // ---------- Album « Nos moments » ----------

  function rendreAlbum(utilisations) {
    const avecPhoto = utilisations
      .filter((u) => u.photo && bonsParId.has(u.bon))
      .sort((a, b) => String(b.prevu || b.date).localeCompare(String(a.prevu || a.date)));

    const album = $("#album");
    album.replaceChildren(h("div", { class: "album-entete" },
      h("h2", { id: "album-titre" }, "Nos moments"),
      h("p", { class: "album-sous-titre" }, "sur pellicule")));

    // Album vide : une bande de pellicule aux cases encore blanches.
    if (avecPhoto.length === 0) {
      album.append(h("div", { class: "pellicule" },
        h("div", { class: "moment" }, h("div", { class: "moment-vide" },
          `Après chaque bon, ${CONFIG.monPrenom} ajoutera ici une photo de votre moment ensemble.`)),
        h("div", { class: "moment" }, h("div", { class: "moment-vide" }, "bientôt…")),
        h("div", { class: "moment" }, h("div", { class: "moment-vide" }, "bientôt…"))));
      return;
    }
    album.append(h("div", { class: "pellicule" },
      avecPhoto.map((u) => {
        const bon = bonsParId.get(u.bon);
        return h("figure", { class: "moment" },
          h("a", { href: u.photo, target: "_blank", rel: "noopener" },
            h("img", { src: u.photo, alt: u.legende || bon.titre, loading: "lazy" })),
          h("figcaption", {},
            h("strong", {}, u.legende || bon.titre),
            h("span", {}, dateLisible(u.prevu || u.date))));
      })));
  }

  // ---------- Modale ----------

  function ouvrirModale(bon, index, restants) {
    dernierFocus = document.activeElement;
    afficherFormulaire(bon, index, restants);
    modale.hidden = false;
    page.inert = true;
    document.body.classList.add("modale-ouverte");
    panneau.querySelector("input:checked")?.focus();
  }

  function fermerModale() {
    if (envoiEnCours) return;
    modale.hidden = true;
    page.inert = false;
    document.body.classList.remove("modale-ouverte");

    if (animerApresFermeture) {
      const id = animerApresFermeture;
      animerApresFermeture = null;
      rendre(id);
      const c = document.querySelector(`.bon[data-id="${CSS.escape(id)}"]`);
      if (c) {
        c.scrollIntoView({ behavior: "smooth", block: "center" });
        c.querySelector("button")?.focus({ preventScroll: true });
      }
    } else if (dernierFocus) {
      dernierFocus.focus();
    }
  }

  // Groupe de gros boutons à choix unique ; « Peu importe » est coché par défaut.
  function groupeChoix(nom, legende, options) {
    return h("fieldset", { class: "groupe" },
      h("legend", { class: "etiquette" }, legende),
      h("div", { class: "choix-liste" },
        options.map((option) => {
          const defaut = option === PEU_IMPORTE;
          return h("label", { class: "choix" + (defaut ? " coche" : "") },
            h("input", { type: "radio", name: nom, value: option, checked: defaut }),
            h("span", {}, option));
        })));
  }

  function afficherFormulaire(bon, index, restants) {
    const apres = restants - 1;
    const sousTitre = apres === 0
      ? (quantite(bon) > 1 ? "C'est le dernier de ce type !" : "Profitez-en bien !")
      : `Il vous en restera ${apres} après celui-ci.`;

    const zone = h("textarea", {
      id: "mot",
      rows: "3",
      placeholder: bon.joker
        ? "Par exemple : m'aider à installer la nouvelle imprimante"
        : "Par exemple : j'aimerais tailler la haie",
    });
    const erreur = h("p", { class: "erreur", role: "alert", hidden: true });
    const boutonEnvoyer = h("button", { type: "submit", class: "btn btn-principal btn-grand fleche" },
      `Envoyer à ${CONFIG.monPrenom}`);

    const form = h("form", { novalidate: true },
      h("div", { class: "modale-entete" },
        h("p", { class: "modale-kicker" }, [numero(index), bon.categorie].filter(Boolean).join(" — ")),
        h("h2", { id: "modale-titre" }, bon.joker ? "Utiliser un joker" : bon.titre),
        h("p", { class: "modale-sous-titre" }, sousTitre)),
      groupeChoix("quand", "Quand ?", ["En semaine", "Le week-end", PEU_IMPORTE]),
      groupeChoix("moment", "À quel moment ?", ["Le matin", "L'après-midi", PEU_IMPORTE]),
      h("label", { for: "mot", class: "etiquette" },
        bon.joker ? "De quoi avez-vous besoin ?" : "Un petit mot ? (facultatif)"),
      zone,
      erreur,
      h("div", { class: "modale-actions" },
        boutonEnvoyer,
        h("button", { type: "button", class: "btn btn-secondaire", onclick: fermerModale }, "Annuler")));

    // Coloration du choix coché (sans dépendre de :has()).
    form.addEventListener("change", (ev) => {
      if (ev.target.type !== "radio") return;
      form.querySelectorAll(`input[name="${ev.target.name}"]`).forEach((input) => {
        input.closest(".choix").classList.toggle("coche", input.checked);
      });
    });

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (envoiEnCours) return;

      const message = zone.value.trim();
      if (bon.joker && !message) {
        montrerErreur(erreur, "Écrivez en quelques mots ce dont vous avez besoin.");
        zone.focus();
        return;
      }

      const creneau = ["quand", "moment"]
        .map((nom) => form.querySelector(`input[name="${nom}"]:checked`)?.value)
        .filter((v) => v && v !== PEU_IMPORTE)
        .join(", ");
      const utilisation = { uid: nouvelUid(), bon: bon.id, date: aujourdhuiISO(), message, creneau };

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
        boutonEnvoyer.textContent = "Réessayer";
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
      ecrireListe(CLE_STOCKAGE, [...lireListe(CLE_STOCKAGE), utilisation]);
      animerApresFermeture = utilisation.bon;
    }

    const bouton = h("button", { type: "button", class: "btn btn-principal btn-grand", onclick: fermerModale },
      "Voir mon carnet");
    panneau.replaceChildren(h("div", { class: "succes" },
      h("div", { class: "tampon-merci", "aria-hidden": "true" }, "merci"),
      h("h2", { id: "modale-titre" }, "C'est envoyé"),
      h("p", {}, `${CONFIG.monPrenom} a bien reçu votre message et vous recontacte très vite.`),
      MODE_TEST && h("p", { class: "note-test" }, "(Mode test : le bon n'a pas été consommé.)"),
      bouton));
  }

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !modale.hidden) fermerModale();
  });

  // ---------- Envoi (Web3Forms) ----------

  function ligneConfig(u) {
    const champs = [`uid: ${JSON.stringify(u.uid)}`, `bon: ${JSON.stringify(u.bon)}`, `date: ${JSON.stringify(u.date)}`];
    if (u.message) champs.push(`message: ${JSON.stringify(u.message)}`);
    if (u.creneau) champs.push(`creneau: ${JSON.stringify(u.creneau)}`);
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
      ? `${prefixe}Joker — demande sur mesure : ${utilisation.message.slice(0, 60)}`
      : `${prefixe}Bon utilisé : ${bon.titre}`;

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
          "Bon": bon.titre,
          "Créneau souhaité": utilisation.creneau || PEU_IMPORTE,
          "Message": utilisation.message || "(pas de message)",
          "Date de la demande": dateLisible(utilisation.date),
          "Il en reste": `${restantsApres} sur ${quantite(bon)}`,
          "À copier dans config.js (dejaUtilises)": ligneConfig(utilisation),
          "Ensuite": 'Ajouter  prevu: "AAAA-MM-JJ"  quand la date est fixée, puis  photo: "photos/xxx.jpg"  pour l\'album.',
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

  // ---------- Enveloppe d'ouverture (première visite, ou ?enveloppe=1) ----------

  function afficherEnveloppe() {
    const ecran = $("#enveloppe");
    let dejaOuverte = false;
    try { dejaOuverte = localStorage.getItem(CLE_ENVELOPPE) === "1"; } catch (e) { /* stockage indisponible */ }
    if (dejaOuverte && !params.has("enveloppe")) {
      ecran.remove();
      return;
    }

    const noms = prenoms.join(" & ");
    $("#enveloppe-noms").textContent = noms;
    $("#lettre-noms").textContent = noms;
    $("#enveloppe-sceau").replaceWith(sceau("sceau-grand"));

    ecran.hidden = false;
    page.inert = true;
    document.body.classList.add("modale-ouverte");

    const bouton = $("#enveloppe-bouton");
    bouton.addEventListener("click", () => {
      if (ecran.classList.contains("ouverte")) return;
      ecran.classList.add("ouverte");
      try { localStorage.setItem(CLE_ENVELOPPE, "1"); } catch (e) { /* stockage indisponible */ }
      setTimeout(() => ecran.classList.add("disparait"), 2800);
      setTimeout(() => {
        ecran.remove();
        page.inert = false;
        document.body.classList.remove("modale-ouverte");
      }, 3600);
    });
  }

  // ---------- Démarrage ----------

  rendreEntete();
  rendre();
  afficherEnveloppe();
})();
