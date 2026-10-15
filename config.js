// ============================================================
//  Personnalisation du carnet : tout se règle ici.
// ============================================================
const CONFIG = {
  // ⚠️ À personnaliser
  prenoms: ["Mady", "Pady"],
  monPrenom: "Augustin",
  messageAccueil:
    "Pour vos anniversaires, je vous offre un peu de mon temps.\n" +
    "Choisissez un bon quand vous voulez, je m'occupe du reste !",

  // Clé gratuite à obtenir sur https://web3forms.com (en saisissant votre email).
  web3formsKey: "",

  // Affiché si l'envoi échoue.
  monTelephone: "07 83 70 82 46",

  // Chaque bon ne peut être utilisé qu'une seule fois. L'id doit être unique et ne plus changer.
  bons: [
    { id: "jardin",  emoji: "🌱", titre: "1h de jardinage",               detail: "Tonte, taille, désherbage…" },
    { id: "brico",   emoji: "🔨", titre: "1h de bricolage",               detail: "Une étagère, une ampoule, un meuble à monter" },
    { id: "techno",  emoji: "💻", titre: "1h d'aide informatique",        detail: "Téléphone, ordinateur, photos, WhatsApp…" },
    { id: "repas",   emoji: "🍲", titre: "Un repas cuisiné par moi",      detail: "Vous mettez les pieds sous la table" },
    { id: "jeux",    emoji: "🎲", titre: "Un après-midi jeux de société", detail: "Belote, Scrabble, ou ce que vous voulez" },
    { id: "balade",  emoji: "🚶", titre: "Une balade ensemble",           detail: "" },
    { id: "courses", emoji: "🛒", titre: "Les grosses courses",           detail: "Je porte, vous choisissez" },
    { id: "photos",  emoji: "📸", titre: "Trier et numériser vos photos", detail: "" },
    { id: "joker1",  emoji: "🃏", titre: "Ce que vous voulez !",          detail: "Demandez-moi ce dont vous avez besoin", joker: true },
    { id: "joker2",  emoji: "🃏", titre: "Ce que vous voulez !",          detail: "Demandez-moi ce dont vous avez besoin", joker: true },
  ],

  // Quand je reçois un email, j'ajoute le bon ici et je pousse sur GitHub :
  // il apparaîtra comme utilisé sur les deux ordinateurs.
  dejaUtilises: {
    // jardin: { par: "Mamie", date: "2026-10-20", message: "Plutôt un samedi matin" },
  },
};
