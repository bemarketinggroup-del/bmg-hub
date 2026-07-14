import { readFile } from "node:fs/promises";
import { join } from "node:path";

const projectRoot = new URL("..", import.meta.url).pathname;
const hubAccessToken = process.env.BMG_HUB_ACCESS_TOKEN || "";
const env = hubAccessToken ? {} : await loadEnv(process.env.ENV_FILE || join(projectRoot, ".env.local"));

const content = [
  ...siteSeoSlots(),
  ...homepageStructureSlots(),
  {
    slug: "home.hero.copy",
    type: "copy",
    title: "Comunicazione, contenuti e strategie",
    status: "draft",
    payload: {
      page: "Homepage",
      section: "Hero",
      subtitle: "per brand che vogliono crescere, brillare, vendere, emozionare, convertire.",
      body: "Un unico partner per strategia, creativita' e produzione. Dalla brand identity al sito, dalle campagne ai contenuti: tutto sotto lo stesso tetto, con la stessa visione.",
      image_url: "",
      image_alt: "",
      cta_label: "Lavoriamo insieme",
      cta_url: "#contatti",
      notes: "Testo hero reale in index.html."
    }
  },
  ...imageSlots("Homepage", "Hero slideshow", "home.hero.image", [
    ["Hero slide 1 - Vetera Matera", "assets/images/portfolio/vetera_matera-1200.webp", "Vetera Matera"],
    ["Hero slide 2 - Favorita Hotel", "assets/images/portfolio/favorita_hotel-1200.webp", "Grand Hotel La Favorita"],
    ["Hero slide 3 - Costiera Gin", "assets/images/portfolio/costiera_gin-1200.webp", "Costiera Gin"]
  ]),
  ...homepageVerticalSlots(),
  ...homepageCopySlots(),
  {
    slug: "home.services.list",
    type: "service",
    title: "Tre aree, un unico linguaggio.",
    status: "draft",
    payload: {
      page: "Homepage",
      section: "Servizi",
      subtitle: "Content Production | Digital Marketing & Social | Web & Digital Experience",
      body: "Content Production: Shooting ADV, Video & Foto, Graphic Design & Branding, Copywriting & Storytelling.\nDigital Marketing & Social: Gestione Social, Meta, Google, TikTok Ads, Email & Automation.\nWeb & Digital Experience: Web & E-commerce, UX/UI Design, SEO & Positioning, Data & Tracking.",
      image_url: "",
      image_alt: "",
      cta_label: "",
      cta_url: "#servizi",
      notes: "Array Services in index.html."
    }
  },
  ...projectSlots(),
  ...projectGallerySlots(),
  ...projectVideoSlots(),
  ...projectContentSlots(),
  ...beviralImageSlots(),
  ...beviralCopySlots(),
  {
    slug: "home.contact.copy",
    type: "copy",
    title: "Parliamo del tuo prossimo progetto.",
    status: "draft",
    payload: {
      page: "Homepage",
      section: "Contatti",
      subtitle: "Form BMG collegato a BMG Hub.",
      body: "Sezione contatti della homepage.",
      image_url: "",
      image_alt: "",
      cta_label: "Prenota una consulenza",
      cta_url: "#contatti",
      notes: "Form bmg_contact in index.html."
    }
  },
  {
    slug: "beviral.hero.copy",
    type: "copy",
    title: "Diventa virale. Davvero.",
    status: "draft",
    payload: {
      page: "BeViral",
      section: "Hero",
      subtitle: "La divisione di BMG dedicata alla crescita organica.",
      body: "Personal branding, video brevi, copertura organica e contenuti ad alto impatto.",
      image_url: "",
      image_alt: "",
      cta_label: "Lavoriamo insieme",
      cta_url: "#cta",
      notes: "Hero reale di beviral.html."
    }
  },
  {
    slug: "beviral.services.list",
    type: "service",
    title: "Otto modi per farsi notare.",
    status: "draft",
    payload: {
      page: "BeViral",
      section: "Servizi",
      subtitle: "Personal Branding | Video Virali | Copertura Organica | Strategia Editoriale | Script & Hook | Produzione Contenuti | Comunicazione Organica | Crescita Community",
      body: "Lista servizi reale della pagina BeViral.",
      image_url: "",
      image_alt: "",
      cta_label: "",
      cta_url: "#servizi",
      notes: "Array SERVIZI in beviral.html."
    }
  },
  {
    slug: "beviral.method.steps",
    type: "copy",
    title: "Un metodo in 5 step.",
    status: "draft",
    payload: {
      page: "BeViral",
      section: "Metodo",
      subtitle: "Discovery | Strategia | Script & Hook | Shooting & Produzione | Crescita & Iterazione",
      body: "Metodo BeViral reale in beviral.html.",
      image_url: "",
      image_alt: "",
      cta_label: "",
      cta_url: "#metodo",
      notes: "Array STEPS in beviral.html."
    }
  }
];

if (hubAccessToken) {
  await seedThroughHub(content, hubAccessToken);
  process.exit(0);
}

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const currentResult = await fetch(`${env.SUPABASE_URL}/rest/v1/site_content?select=id,slug,title,status,payload`, {
  headers: {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
  }
});

if (!currentResult.ok) {
  throw new Error(`Supabase content lookup failed: ${currentResult.status}`);
}

const currentRows = await currentResult.json();
await patchLegacyDrafts(currentRows);
const existingSlugs = new Set(currentRows.map((row) => row.slug));
const missingContent = content.filter((row) => !existingSlugs.has(row.slug));

if (!missingContent.length) {
  console.log("All website content slots already exist. Legacy draft labels checked.");
  process.exit(0);
}

const result = await fetch(`${env.SUPABASE_URL}/rest/v1/site_content`, {
  method: "POST",
  headers: {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal"
  },
  body: JSON.stringify(missingContent)
});

if (!result.ok) {
  throw new Error(`Supabase seed failed: ${result.status} ${await result.text()}`);
}

console.log(`Created ${missingContent.length} missing website content slots without changing existing content.`);

function imageSlots(page, section, prefix, rows) {
  return rows.map(([title, imageUrl, alt], index) => ({
    slug: `${prefix}.${index + 1}`,
    type: "image",
    title,
    status: "draft",
    payload: {
      page,
      section,
      subtitle: "",
      body: "",
      image_url: imageUrl,
      image_alt: alt,
      cta_label: "",
      cta_url: "",
      notes: "Slot immagine reale da data/images.js."
    }
  }));
}

function homepageVerticalSlots() {
  return [
    ["Hotel", "Hospitality e accoglienza", "assets/images/portfolio/favorita_hotel-800.webp", "Grand Hotel La Favorita"],
    ["Brand", "Identita' e posizionamento", "assets/images/portfolio/vetera_matera-800.webp", "Vetera Matera"],
    ["Food", "Ristorazione e prodotti", "assets/images/portfolio/zest_restaurant-800.webp", "Zest Restaurant"],
    ["Personal Brand", "Persone e autorevolezza", "assets/images/portfolio/costiera_gin-800.webp", "Costiera Gin"]
  ].map(([title, body, imageUrl, imageAlt], index) => contentSlot(
    `home.about.vertical.${index + 1}`,
    "image",
    "Homepage",
    "Chi siamo",
    title,
    "",
    body,
    imageUrl,
    imageAlt
  ));
}

function projectSlots() {
  const projects = [
    ["bellevue-syrene", "Bellevue Syrene", "Hospitality / Luxury", "assets/images/portfolio/vetera_matera-800.webp"],
    ["grand-hotel-aminta", "Grand Hotel Aminta", "Hospitality / Resort", "assets/images/portfolio/favorita_hotel-800.webp"],
    ["grand-hotel-la-favorita", "Grand Hotel La Favorita", "Hospitality", "assets/images/portfolio/favorita_hotel-800.webp"],
    ["vetera-matera", "Vetera Matera", "Hospitality / Boutique", "assets/images/portfolio/vetera_matera-800.webp"],
    ["zest-restaurant", "Zest Restaurant", "Food & Beverage", "assets/images/portfolio/zest_restaurant-800.webp"],
    ["costiera-gin", "Costiera Gin", "Brand / Beverage", "assets/images/portfolio/costiera_gin-800.webp"]
  ];

  return projects.map(([slug, name, sector, imageUrl]) => ({
    slug: `home.project.${slug}`,
    type: "project",
    title: name,
    status: "draft",
    payload: {
      page: "Homepage",
      section: "Lavori selezionati",
      subtitle: sector,
      body: `Card progetto reale collegata alla pagina projects/${slug}.html`,
      image_url: imageUrl,
      image_alt: name,
      cta_label: "Scopri il progetto",
      cta_url: `projects/${slug}.html`,
      notes: "Elemento reale di PROJECT_LIST in index.html."
    }
  }));
}

function projectGallerySlots() {
  const galleries = {
    "bellevue-syrene": [
      "assets/images/portfolio/vetera_matera-1200.webp",
      "assets/images/portfolio/favorita_hotel-1200.webp",
      "assets/images/portfolio/vetera_matera-800.webp",
      "assets/images/portfolio/favorita_hotel-800.webp",
      "assets/images/portfolio/vetera_matera-1200.webp"
    ],
    "grand-hotel-aminta": [
      "assets/images/portfolio/favorita_hotel-1200.webp",
      "assets/images/portfolio/vetera_matera-1200.webp",
      "assets/images/portfolio/favorita_hotel-800.webp",
      "assets/images/portfolio/vetera_matera-800.webp",
      "assets/images/portfolio/favorita_hotel-1200.webp"
    ],
    "grand-hotel-la-favorita": [
      "assets/images/portfolio/favorita_hotel-1200.webp",
      "assets/images/portfolio/favorita_hotel-800.webp",
      "assets/images/portfolio/favorita_hotel-1200.webp",
      "assets/images/portfolio/vetera_matera-800.webp",
      "assets/images/portfolio/favorita_hotel-1200.webp"
    ],
    "vetera-matera": [
      "assets/images/portfolio/vetera_matera-1200.webp",
      "assets/images/portfolio/vetera_matera-800.webp",
      "assets/images/portfolio/vetera_matera-1200.webp",
      "assets/images/portfolio/favorita_hotel-800.webp",
      "assets/images/portfolio/vetera_matera-1200.webp"
    ],
    "zest-restaurant": [
      "assets/images/portfolio/zest_restaurant-1200.webp",
      "assets/images/portfolio/zest_restaurant-800.webp",
      "assets/images/portfolio/zest_restaurant-1200.webp",
      "assets/images/portfolio/costiera_gin-800.webp",
      "assets/images/portfolio/zest_restaurant-1200.webp"
    ],
    "costiera-gin": [
      "assets/images/portfolio/costiera_gin-1200.webp",
      "assets/images/portfolio/costiera_gin-800.webp",
      "assets/images/portfolio/costiera_gin-1200.webp",
      "assets/images/portfolio/zest_restaurant-800.webp",
      "assets/images/portfolio/costiera_gin-1200.webp"
    ]
  };

  return Object.entries(galleries).flatMap(([project, images]) => {
    const title = project.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
    return images.map((imageUrl, index) => ({
      slug: `project.${project}.gallery.${index + 1}`,
      type: "image",
      title: `${title} - Gallery ${index + 1}`,
      status: "draft",
      payload: {
        page: "Pagine progetto",
        section: title,
        subtitle: "",
        body: "",
        image_url: imageUrl,
        image_alt: `${title} gallery ${index + 1}`,
        cta_label: "",
        cta_url: `projects/${project}.html`,
        notes: "Slot gallery reale da BMG_IMAGES.projectGalleries."
      }
    }));
  });
}

function projectVideoSlots() {
  return [
    "bellevue-syrene",
    "grand-hotel-aminta",
    "grand-hotel-la-favorita",
    "vetera-matera",
    "zest-restaurant",
    "costiera-gin"
  ].map((project) => contentSlot(
    `project.${project}.video.1`,
    "video",
    "Pagine progetto",
    `${project.split("-").map(capitalize).join(" ")} - Gallery`,
    "Video progetto",
    "",
    "",
    "",
    "",
    "",
    ""
  ));
}

function beviralImageSlots() {
  return imageSlots("BeViral", "Asset grafici", "beviral.asset", [
    ["Logo BeViral blu", "assets/images/logos/logo-beviral-blue.png", "Logo BeViral blu"],
    ["Logo BeViral bianco", "assets/images/logos/logo-beviral-white.png", "Logo BeViral bianco"],
    ["Sticker blu", "assets/images/beviral/sticker-blue.png", "Sticker blu BeViral"],
    ["Sticker magenta", "assets/images/beviral/sticker-magenta.png", "Sticker magenta BeViral"],
    ["Sticker nero", "assets/images/beviral/sticker-black.png", "Sticker nero BeViral"],
    ["Sticker giallo", "assets/images/beviral/sticker-yellow.png", "Sticker giallo BeViral"],
    ["Frame iPhone", "assets/images/beviral/iphone-frame.png", "Frame iPhone BeViral"]
  ]);
}

function homepageCopySlots() {
  return [
    contentSlot("home.about.copy", "copy", "Homepage", "Chi siamo", "Siamo un team di marketer, creativi e produttori. Diamo forma a brand che vogliono distinguersi - nell'hospitality, nel luxury, nel food, nel retail e nel personal brand.", "", "Lavoriamo come un partner integrato: niente passaggi di mano, niente perdite in traduzione. La stessa squadra pensa la strategia, scrive il claim, gira il video, costruisce il sito e fa girare le campagne."),
    ...[["50", "brand seguiti"], ["6", "anni di lavoro"], ["4", "settori verticali"], ["1", "unico partner"]].map(([number, label], index) =>
      contentSlot(`home.about.stat.${index + 1}`, "copy", "Homepage", "Chi siamo - numeri", number, label)
    ),
    contentSlot("home.services.heading", "copy", "Homepage", "Servizi", "Tre aree, un unico linguaggio."),
    contentSlot("home.service.1", "service", "Homepage", "Servizi", "Content Production", "Contenuti di alta qualita' per campagne pubblicitarie, corporate e brand identity.", "Shooting ADV | Video & Foto | Graphic Design & Branding | Copywriting & Storytelling"),
    contentSlot("home.service.2", "service", "Homepage", "Servizi", "Digital Marketing & Social", "Strategie di crescita digitale e advertising per visibilita' e performance online.", "Gestione Social | Meta - Google - TikTok Ads | Email & Automation"),
    contentSlot("home.service.3", "service", "Homepage", "Servizi", "Web & Digital Experience", "Soluzioni digitali avanzate per la presenza online e le performance dei brand.", "Web & E-commerce | UX/UI Design | SEO & Positioning | Data & Tracking"),
    contentSlot("home.projects.heading", "copy", "Homepage", "Lavori selezionati", "Una selezione di brand che abbiamo costruito."),
    contentSlot("site.footer.contact", "copy", "Tutto il sito", "Footer", "Contatti BMG", "info@bemarketinggroup.it"),
    ...[["Instagram", "#"], ["LinkedIn", "#"], ["Behance", "#"]].map(([label, url], index) =>
      contentSlot(`site.footer.social.${index + 1}`, "link", "Tutto il sito", "Footer", label, "", "", "", "", label, url)
    )
  ];
}

function homepageStructureSlots() {
  const clients = [
    ["Bellevue Syrene", "assets/images/portfolio/vetera_matera-800.webp"],
    ["Grand Hotel Aminta", "assets/images/portfolio/favorita_hotel-800.webp"],
    ["Grand Hotel La Favorita", "assets/images/portfolio/favorita_hotel-800.webp"],
    ["Vetera Matera", "assets/images/portfolio/vetera_matera-800.webp"],
    ["Zest Restaurant", "assets/images/portfolio/zest_restaurant-800.webp"],
    ["Costiera Gin", "assets/images/portfolio/costiera_gin-800.webp"],
    ["Studio Vallone", "assets/images/portfolio/vetera_matera-800.webp"],
    ["Marettima Beach Club", "assets/images/portfolio/costiera_gin-800.webp"],
    ...Array.from({ length: 7 }, (_, index) => [`Cliente ${String(index + 9).padStart(2, "0")}`, [
      "assets/images/portfolio/favorita_hotel-800.webp",
      "assets/images/portfolio/zest_restaurant-800.webp",
      "assets/images/portfolio/vetera_matera-800.webp",
      "assets/images/portfolio/costiera_gin-800.webp"
    ][index % 4]])
  ];
  return [
    contentSlot("home.navigation", "link", "Homepage", "Navigazione", "Navigazione principale", "", "Chi siamo\nServizi\nLavori\nBeViral\nContatti", "", "", "Lavoriamo insieme", "#contatti"),
    contentSlot("home.hero.mobile-video", "video", "Homepage", "Hero", "Video Hero mobile", "", "", "", "", "", "assets/video/hero-mobile.mp4"),
    contentSlot("home.sectors.list", "copy", "Homepage", "Settori", "Settori serviti", "", "Hospitality\nLuxury\nFood & Beverage\nRetail\nPersonal Brand\nE-commerce"),
    ...clients.map(([name, imageUrl], index) => contentSlot(`home.client.${index + 1}`, "image", "Homepage", "Clienti", name, "", "", imageUrl, name)),
    contentSlot("home.beviral.spotlight", "landing", "Homepage", "BeViral", "BeViral", "Una divisione di bmg", "La divisione specializzata in video virali, personal branding e crescita organica. Per chi vuole diventare un punto di riferimento nel proprio settore.", "", "", "Scopri BeViral", "beviral.html"),
    contentSlot("home.beviral.services", "service", "Homepage", "BeViral", "Servizi BeViral", "", "Personal branding\nVideo & script\nCopertura organica\nStrategia editoriale"),
    contentSlot("home.contact.form", "landing", "Homepage", "Contatti", "Prenota una consulenza", "Parliamo del tuo prossimo progetto", "Hospitality\nFood\nLuxury / Retail\nPersonal Brand\nAltro", "", "", "Prenota una consulenza", "https://calendly.com/bemarketinggroup/30min"),
    contentSlot("site.footer.brand", "landing", "Tutto il sito", "Footer", "Be Marketing Group", "© 2026 BMG SRLS · P.IVA e informazioni legali", "Strategia, creativita' e produzione per brand che vogliono crescere.", "", "BMG", "", "")
  ];
}

function siteSeoSlots() {
  const projects = [
    ["bellevue-syrene", "Bellevue Syrene"],
    ["grand-hotel-aminta", "Grand Hotel Aminta"],
    ["grand-hotel-la-favorita", "Grand Hotel La Favorita"],
    ["vetera-matera", "Vetera Matera"],
    ["zest-restaurant", "Zest Restaurant"],
    ["costiera-gin", "Costiera Gin"]
  ];
  return [
    contentSlot("site.seo.home", "landing", "Tutto il sito", "SEO", "BMG - Be Marketing Group", "Agenzia di comunicazione, marketing e produzione creativa.", "", "assets/images/portfolio/vetera_matera-1200.webp", "BMG - Be Marketing Group"),
    contentSlot("site.seo.beviral", "landing", "Tutto il sito", "SEO", "BeViral - una divisione di BMG", "Video virali, personal branding e crescita organica.", "", "assets/images/logos/logo-beviral-blue.png", "BeViral"),
    ...projects.map(([slug, name]) => contentSlot(`project.${slug}.seo`, "landing", "Pagine progetto", `${name} - SEO`, `${name} - Case study BMG`, `Scopri il progetto ${name} realizzato da BMG.`, "", "", name))
  ];
}

function projectContentSlots() {
  const projects = [
    {
      slug: "bellevue-syrene", name: "Bellevue Syrene", sector: "Hospitality / Luxury", location: "Sorrento, IT", year: "Anno 2025", credit: "BMG Studio",
      lead: "Icona della costiera sorrentina dal 1820. Un'identita' contemporanea che conserva la grazia della Belle Epoque.",
      bio: "Bellevue Syrene e' un luogo sospeso tra storia e Mediterraneo. Il progetto valorizza il carattere dell'hotel con un sistema visivo elegante, riconoscibile e internazionale.",
      story: "Un racconto di ospitalita', cultura e paesaggio tradotto in identita', contenuti e presenza digitale.",
      services: "Brand Identity | Sito Web | Direzione Creativa | Social Media | Content Production",
      stats: "+128%::Engagement social YoY\n3.2M::Impression campagna\n+41%::Direct booking",
      next: ["Grand Hotel Aminta", "projects/grand-hotel-aminta.html"]
    },
    {
      slug: "grand-hotel-aminta", name: "Grand Hotel Aminta", sector: "Hospitality / Resort", location: "Sorrento, IT", year: "Anno 2025", credit: "BMG Studio",
      lead: "Un resort affacciato sul golfo di Napoli, riposizionato attraverso un linguaggio di lusso quieto e contemporaneo.",
      bio: "Dal logo al sito, dai social alle campagne ADV, abbiamo costruito un sistema coerente capace di raccontare l'esperienza Aminta a un pubblico internazionale.",
      story: "Un riposizionamento completo che unisce strategia, identita', contenuti e performance.",
      services: "Brand Identity | Sito Web | Social Media | Performance Advertising | Email Marketing",
      stats: "+62%::Traffico organico\n4.8 stelle::Rating medio social\n2.1M::Reach campagna estiva",
      next: ["Grand Hotel La Favorita", "projects/grand-hotel-la-favorita.html"]
    },
    {
      slug: "grand-hotel-la-favorita", name: "Grand Hotel La Favorita", sector: "Hospitality", location: "Sorrento, IT", year: "Anno 2024", credit: "BMG Studio",
      lead: "Un hotel storico nel cuore di Sorrento raccontato attraverso una presenza digitale autentica e orientata alla prenotazione.",
      bio: "La Favorita unisce tradizione, accoglienza e una posizione unica. Il progetto digitale mette in primo piano questi elementi con contenuti e percorsi chiari.",
      story: "Una presenza digitale pensata per trasformare la curiosita' in relazione e prenotazione.",
      services: "Sito Web | Content Strategy | Social Media | Advertising",
      stats: "+74%::Richieste dirette\n1.8M::Visualizzazioni contenuti\n+39%::Conversion rate",
      next: ["Vetera Matera", "projects/vetera-matera.html"]
    },
    {
      slug: "vetera-matera", name: "Vetera Matera", sector: "Hospitality / Boutique", location: "Matera, IT", year: "Anno 2024", credit: "BeViral x BMG",
      lead: "Boutique hotel scavato nella pietra dei Sassi. L'identita' nasce dalla materia: la pietra, il tempo, la luce.",
      bio: "Scavato nella pietra millenaria dei Sassi, Vetera e' un boutique hotel che e' esso stesso un racconto di Matera. Dal naming all'identita' visiva, abbiamo lasciato parlare la materia.",
      story: "Un brand essenziale e tattile che racconta Matera senza didascalie.",
      services: "Brand Identity | Naming | Sito Web | Social Media | Photography",
      stats: "100%::Occupancy stagione 2024\n+210%::Crescita IG dal lancio\n12::Press internazionali",
      next: ["Zest Restaurant", "projects/zest-restaurant.html"]
    },
    {
      slug: "zest-restaurant", name: "Zest Restaurant", sector: "Food & Beverage", location: "Sorrento, IT", year: "Anno 2025", credit: "BMG Studio",
      lead: "Una cucina contemporanea e solare trasformata in un'identita' visiva fresca, riconoscibile e pronta a vivere sui social.",
      bio: "Zest nasce dall'incontro tra materia prima, energia e convivialita'. Il progetto costruisce un tono di voce e un'immagine capaci di portare questa esperienza anche online.",
      story: "Identita', contenuti e campagne per un ristorante che vuole essere ricordato prima ancora di essere visitato.",
      services: "Brand Identity | Social Media | Content Production | Advertising",
      stats: "+186%::Engagement social\n2.4M::Reach organica\n+52%::Prenotazioni da social",
      next: ["Costiera Gin", "projects/costiera-gin.html"]
    },
    {
      slug: "costiera-gin", name: "Costiera Gin", sector: "Brand / Beverage", location: "Costiera Amalfitana, IT", year: "Anno 2025", credit: "BMG Studio",
      lead: "Un gin che porta nel bicchiere il carattere della Costiera, dal paesaggio agli agrumi, attraverso un brand distintivo.",
      bio: "Costiera Gin nasce come prodotto e come racconto. Naming, identita', packaging e contenuti lavorano insieme per costruire un immaginario mediterraneo contemporaneo.",
      story: "Un sistema di marca pensato per distinguersi sullo scaffale, nei locali e sui canali digitali.",
      services: "Brand Strategy | Naming | Packaging | Content Production | Social Media",
      stats: "6 mesi::Dal lancio alla distribuzione\n1.6M::Impression campagna\n+94%::Crescita community",
      next: ["Bellevue Syrene", "projects/bellevue-syrene.html"]
    }
  ];

  return projects.flatMap((project) => [
    contentSlot(`project.${project.slug}.hero`, "copy", "Pagine progetto", `${project.name} - Hero`, project.name, project.sector, project.lead),
    contentSlot(`project.${project.slug}.meta`, "copy", "Pagine progetto", `${project.name} - Metadati`, project.location, project.year, project.credit),
    contentSlot(`project.${project.slug}.story`, "copy", "Pagine progetto", `${project.name} - Racconto`, "Racconto progetto", project.bio, project.story),
    contentSlot(`project.${project.slug}.services`, "service", "Pagine progetto", `${project.name} - Servizi e risultati`, "Servizi e risultati", project.services, project.stats),
    contentSlot(`project.${project.slug}.cta`, "link", "Pagine progetto", `${project.name} - Prossimo progetto`, project.next[0], "", "", "", "", "Vedi il progetto", project.next[1])
  ]);
}

function beviralCopySlots() {
  const services = [
    ["Personal Branding", "Costruzione e valorizzazione dell'immagine dell'imprenditore o del volto aziendale."],
    ["Video Virali", "Ideazione, scrittura e produzione di video pensati per aumentare visualizzazioni e copertura."],
    ["Copertura Organica", "Strategie di contenuto per raggiungere pubblico senza dipendere dalle sponsorizzazioni."],
    ["Strategia Editoriale", "Piani contenuto, rubriche, format ricorrenti e linee narrative coerenti."],
    ["Script & Hook", "Scrittura di testi, ganci iniziali, call to action e strutture narrative per reel e TikTok."],
    ["Produzione Contenuti", "Realizzazione di video, shooting, reel, stories e caroselli pronti a essere pubblicati."],
    ["Comunicazione Organica", "Supporto alle aziende che vogliono raccontarsi online in modo diretto, umano, riconoscibile."],
    ["Crescita Community", "Contenuti pensati per aumentare interazioni, salvataggi, condivisioni e rapporto con il pubblico."]
  ];
  const steps = [
    ["Discovery", "Analizziamo brand, settore e competitors per trovare la posizione giusta."],
    ["Strategia", "Definiamo posizionamento, pubblico, format ricorrenti e linee narrative."],
    ["Script & Hook", "Scriviamo ganci iniziali, copioni, rubriche e obiettivi di ogni contenuto."],
    ["Shooting & Produzione", "Realizziamo reel, parlati, video corporate e materiali pronti per i canali."],
    ["Crescita & Iterazione", "Pubblichiamo, analizziamo e miglioriamo sulla base dei risultati."]
  ];

  return [
    contentSlot("beviral.navigation", "link", "BeViral", "Navigazione", "Navigazione BeViral", "", "", "", "", "Inizia ora", "#cta"),
    contentSlot("beviral.hero.secondary", "link", "BeViral", "Hero", "Pulsante secondario Hero", "", "", "", "", "Il metodo", "#metodo"),
    contentSlot("beviral.marquee.items", "copy", "BeViral", "Marquee", "Parole in evidenza", "", "VIDEO VIRALI\nPERSONAL BRANDING\nCOPERTURA ORGANICA\nREELS · TIKTOK · IG\nSTORYTELLING\nHOOK & SCRIPT\nCOMMUNITY\nAUTHORITY"),
    contentSlot("beviral.manifesto.copy", "copy", "BeViral", "Manifesto", "Non solo post. Attenzione.", "Cos'e' BeViral", "BeViral lavora sulla parte piu' dinamica della comunicazione digitale: video brevi, format social, storytelling, contenuti parlati, trend e copertura organica.\nL'obiettivo non e' pubblicare. E' creare contenuti che funzionano: che arrivano al pubblico giusto, costruiscono autorevolezza e generano richieste commerciali reali.\nTrasformiamo idee, competenze e punti di forza in contenuti ad alto impatto."),
    contentSlot("beviral.manifesto.stats", "copy", "BeViral", "Manifesto", "Numeri BeViral", "", "10M+::visualizzazioni generate\n0€::su sponsorizzazioni\n48h::dal brief al primo video\n100%::contenuti su misura"),
    contentSlot("beviral.services.heading", "copy", "BeViral", "Servizi", "Otto modi per farsi notare."),
    ...services.map(([title, body], index) => contentSlot(`beviral.service.${index + 1}`, "service", "BeViral", "Servizi", title, "", body)),
    contentSlot("beviral.method.heading", "copy", "BeViral", "Metodo", "Un metodo in 5 step.\nNiente magia. Solo lavoro."),
    ...steps.map(([title, body], index) => contentSlot(`beviral.step.${index + 1}`, "copy", "BeViral", "Metodo", title, "", body)),
    contentSlot("beviral.cta.copy", "copy", "BeViral", "CTA", "Pronto a diventare il\npunto di riferimento del\ntuo settore?", "Prenota una call gratuita di 30 minuti", "", "", "", "Iniziamo a far rumore", "#cta"),
    contentSlot("beviral.cta.form", "link", "BeViral", "CTA", "Prenota una call gratuita di 30 minuti", "GRATIS · 30 MIN", "personal::Personal brand\ncompany::Azienda / B2B\nproduct::Brand prodotto\nother::Altro", "", "", "", "https://calendly.com/bemarketinggroup/30min"),
    contentSlot("beviral.footer.copy", "copy", "BeViral", "Footer", "Contatti BeViral", "hello@beviral.it", "Instagram::#\nTikTok::#\nLinkedIn::#"),
    contentSlot("beviral.footer.meta", "link", "BeViral", "Footer", "Torna su bmg · una divisione di Be Marketing Group", "© 2026 BeViral · BMG SRLS", "", "", "", "", "index.html"),
    ...Array.from({ length: 8 }, (_, index) => contentSlot(`beviral.showreel.${index + 1}`, "video", "BeViral", "Showreel", index === 0 ? "Radi - Cucina di casa" : `Cliente ${String(index + 1).padStart(2, "0")}`, index === 0 ? "418.977" : "", "", "", "", "Apri TikTok", index === 0 ? "https://www.tiktok.com/@radi_cucinadicasa/video/7637166094301629718" : ""))
  ];
}

function contentSlot(slug, type, page, section, title, subtitle = "", body = "", imageUrl = "", imageAlt = "", ctaLabel = "", ctaUrl = "") {
  return {
    slug,
    type,
    title,
    status: "draft",
    payload: {
      page,
      section,
      subtitle,
      body,
      image_url: imageUrl,
      image_alt: imageAlt,
      cta_label: ctaLabel,
      cta_url: ctaUrl,
      notes: "Slot collegato al sito pubblico. Diventa visibile solo quando viene pubblicato."
    }
  };
}

function capitalize(value) {
  return value ? value[0].toUpperCase() + value.slice(1) : "";
}

async function patchLegacyDrafts(rows) {
  const replacements = new Map([
    ["home.about.vertical.1", ["Verticale Hospitality - Grand Hotel La Favorita", "Hotel", "Hospitality e accoglienza"]],
    ["home.about.vertical.2", ["Verticale Brand - Vetera Matera", "Brand", "Identita' e posizionamento"]],
    ["home.about.vertical.3", ["Verticale Food - Zest Restaurant", "Food", "Ristorazione e prodotti"]],
    ["home.about.vertical.4", ["Verticale Personal Brand - Costiera Gin", "Personal Brand", "Persone e autorevolezza"]]
  ]);
  for (const row of rows) {
    const replacement = replacements.get(row.slug);
    if (!replacement || row.status !== "draft" || row.title !== replacement[0]) continue;
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/site_content?id=eq.${encodeURIComponent(row.id)}`, {
      method: "PATCH",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        title: replacement[1],
        payload: { ...(row.payload || {}), body: replacement[2] }
      })
    });
    if (!response.ok) throw new Error(`Legacy content patch failed for ${row.slug}: ${response.status}`);
  }
}

async function seedThroughHub(rows, token) {
  const endpoint = process.env.BMG_HUB_URL || "https://bmg-hub.vercel.app";
  const current = await fetch(`${endpoint}/api/site-content`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!current.ok) throw new Error(`BMG Hub content lookup failed: ${current.status}`);

  const existingSlugs = new Set((await current.json()).map((row) => row.slug));
  const missing = rows.filter((row) => !existingSlugs.has(row.slug));
  for (const row of missing) {
    const response = await fetch(`${endpoint}/api/site-content`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(row)
    });
    if (!response.ok) throw new Error(`BMG Hub seed failed for ${row.slug}: ${response.status}`);
  }
  console.log(`Created ${missing.length} missing website content slots through the protected BMG Hub API.`);
}

async function loadEnv(path) {
  const file = await readFile(path, "utf8");
  return Object.fromEntries(file.split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => {
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    return [key, value.replace(/\\n/g, "\n")];
  }));
}
