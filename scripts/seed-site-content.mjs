import { readFile } from "node:fs/promises";
import { join } from "node:path";

const projectRoot = new URL("..", import.meta.url).pathname;
const env = await loadEnv(join(projectRoot, ".env.local"));

const content = [
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
  ...imageSlots("Homepage", "Chi siamo", "home.about.vertical", [
    ["Verticale Hospitality - Grand Hotel La Favorita", "assets/images/portfolio/favorita_hotel-800.webp", "Grand Hotel La Favorita"],
    ["Verticale Brand - Vetera Matera", "assets/images/portfolio/vetera_matera-800.webp", "Vetera Matera"],
    ["Verticale Food - Zest Restaurant", "assets/images/portfolio/zest_restaurant-800.webp", "Zest Restaurant"],
    ["Verticale Personal Brand - Costiera Gin", "assets/images/portfolio/costiera_gin-800.webp", "Costiera Gin"]
  ]),
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
  ...beviralImageSlots(),
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

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const result = await fetch(`${env.SUPABASE_URL}/rest/v1/site_content?on_conflict=slug`, {
  method: "POST",
  headers: {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal"
  },
  body: JSON.stringify(content)
});

if (!result.ok) {
  throw new Error(`Supabase seed failed: ${result.status} ${await result.text()}`);
}

console.log(`Seeded ${content.length} real website content slots.`);

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

async function loadEnv(path) {
  const file = await readFile(path, "utf8");
  return Object.fromEntries(file.split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => {
    const index = line.indexOf("=");
    return [line.slice(0, index), line.slice(index + 1)];
  }));
}
