import type { TemplateDefinition } from "./types";

export const localBusiness: TemplateDefinition = {
  key: "local-business",
  version: 1,
  name: { es: "Web para negocio local", en: "Local business website" },
  description: {
    es: "Cafeterías, restaurantes, tiendas, estudios y servicios de barrio.",
    en: "Cafés, restaurants, shops, studios and neighbourhood services.",
  },
  sections: [
    {
      key: "business",
      title: { es: "Tu negocio", en: "Your business" },
      description: {
        es: "Los datos básicos que aparecerán en la web.",
        en: "The basic details that will appear on the website.",
      },
      fields: [
        {
          key: "business_name",
          type: "text",
          required: true,
          maxLength: 120,
          label: { es: "Nombre comercial", en: "Business name" },
          placeholder: { es: "Cafetería Nube", en: "Cloud Café" },
        },
        {
          key: "description",
          type: "textarea",
          required: true,
          maxLength: 1500,
          label: { es: "¿A qué se dedica tu negocio?", en: "What does your business do?" },
          help: {
            es: "Dos o tres frases, como se lo contarías a alguien que no te conoce.",
            en: "Two or three sentences, as you would tell someone who doesn't know you.",
          },
        },
        {
          key: "address",
          type: "textarea",
          rows: 2,
          maxLength: 300,
          label: { es: "Dirección", en: "Address" },
          help: {
            es: "Déjalo vacío si no atiendes en un local físico.",
            en: "Leave it empty if you don't have a physical location.",
          },
        },
        { key: "phone", type: "phone", label: { es: "Teléfono", en: "Phone" } },
        {
          key: "contact_email",
          type: "email",
          label: { es: "Email de contacto público", en: "Public contact email" },
        },
        {
          key: "opening_hours",
          type: "weekly-hours",
          label: { es: "Horario", en: "Opening hours" },
        },
        {
          key: "hours_notes",
          type: "text",
          maxLength: 300,
          label: { es: "Notas sobre el horario", en: "Notes about opening hours" },
          placeholder: {
            es: "Cerrado en agosto, horario de verano…",
            en: "Closed in August, summer hours…",
          },
        },
        {
          key: "social_links",
          type: "social-links",
          networks: ["instagram", "facebook", "tiktok", "x", "linkedin", "youtube", "google"],
          label: { es: "Redes sociales y perfiles", en: "Social networks and profiles" },
          help: {
            es: "Pega el enlace o el nombre de usuario.",
            en: "Paste the link or the username.",
          },
        },
      ],
    },
    {
      key: "goals",
      title: { es: "Objetivos y contenido", en: "Goals and content" },
      description: {
        es: "Qué quieres conseguir con la web y a quién va dirigida.",
        en: "What you want the website to achieve and who it is for.",
      },
      fields: [
        {
          key: "website_goals",
          type: "multiselect",
          required: true,
          allowOther: true,
          label: { es: "¿Qué debe conseguir la web?", en: "What should the website achieve?" },
          options: [
            { value: "calls", label: { es: "Recibir llamadas o mensajes", en: "Get calls or messages" } },
            {
              value: "bookings",
              label: { es: "Conseguir reservas o citas", en: "Get bookings or appointments" },
            },
            {
              value: "menu",
              label: { es: "Mostrar carta, catálogo o precios", en: "Show menu, catalogue or prices" },
            },
            { value: "sell", label: { es: "Vender online", en: "Sell online" } },
            { value: "google", label: { es: "Aparecer en Google", en: "Show up on Google" } },
            { value: "brand", label: { es: "Mejorar la imagen de marca", en: "Improve brand image" } },
          ],
        },
        {
          key: "target_audience",
          type: "textarea",
          required: true,
          maxLength: 1000,
          label: { es: "¿Quiénes son tus clientes?", en: "Who are your customers?" },
          placeholder: {
            es: "Vecinos del barrio, oficinistas a mediodía, turistas…",
            en: "Locals, office workers at lunchtime, tourists…",
          },
        },
        {
          key: "services",
          type: "list",
          required: true,
          max: 20,
          label: { es: "Servicios o productos principales", en: "Main services or products" },
          itemLabel: { es: "Servicio o producto", en: "Service or product" },
          descriptionLabel: { es: "Descripción breve (opcional)", en: "Short description (optional)" },
        },
        {
          key: "primary_cta",
          type: "select",
          label: {
            es: "¿Qué acción principal debe hacer un visitante?",
            en: "What is the main action a visitor should take?",
          },
          options: [
            { value: "call", label: { es: "Llamar", en: "Call" } },
            { value: "whatsapp", label: { es: "Escribir por WhatsApp", en: "Message on WhatsApp" } },
            { value: "book", label: { es: "Reservar", en: "Book" } },
            { value: "buy", label: { es: "Comprar", en: "Buy" } },
            { value: "visit", label: { es: "Visitar el local", en: "Visit the place" } },
            { value: "form", label: { es: "Rellenar un formulario", en: "Fill in a form" } },
          ],
        },
        {
          key: "differentiators",
          type: "textarea",
          maxLength: 1000,
          label: {
            es: "¿Qué te diferencia de la competencia?",
            en: "What sets you apart from competitors?",
          },
        },
      ],
    },
    {
      key: "design",
      title: { es: "Diseño", en: "Design" },
      description: {
        es: "Tus gustos nos ayudan a acertar a la primera.",
        en: "Your taste helps us get it right the first time.",
      },
      fields: [
        {
          key: "logo",
          type: "file",
          accept: ["image", "svg", "pdf"],
          maxFiles: 3,
          label: { es: "Logo", en: "Logo" },
          help: {
            es: "Si tienes varias versiones (color, blanco, vectorial), súbelas todas.",
            en: "If you have several versions (colour, white, vector), upload them all.",
          },
        },
        {
          key: "references",
          type: "references",
          count: 3,
          label: { es: "Tres webs que te gusten", en: "Three websites you like" },
          help: {
            es: "No tienen que ser de tu sector. Cuéntanos qué te gusta de cada una.",
            en: "They don't have to be from your industry. Tell us what you like about each one.",
          },
        },
        {
          key: "colors",
          type: "colors",
          max: 5,
          label: { es: "Colores preferidos", en: "Preferred colours" },
        },
        {
          key: "style",
          type: "multiselect",
          allowOther: true,
          label: { es: "Estilo deseado", en: "Desired style" },
          options: [
            { value: "modern", label: { es: "Moderno", en: "Modern" } },
            { value: "minimal", label: { es: "Minimalista", en: "Minimal" } },
            { value: "elegant", label: { es: "Elegante", en: "Elegant" } },
            { value: "warm", label: { es: "Cálido y cercano", en: "Warm and friendly" } },
            { value: "playful", label: { es: "Divertido", en: "Playful" } },
            { value: "rustic", label: { es: "Rústico o artesanal", en: "Rustic or handmade" } },
            { value: "bold", label: { es: "Atrevido", en: "Bold" } },
            { value: "corporate", label: { es: "Profesional y sobrio", en: "Professional and sober" } },
          ],
        },
        {
          key: "dislikes",
          type: "textarea",
          maxLength: 1000,
          label: { es: "¿Qué NO te gusta?", en: "What do you NOT like?" },
          placeholder: {
            es: "Colores, tipografías, webs de la competencia…",
            en: "Colours, fonts, competitors' websites…",
          },
        },
      ],
    },
    {
      key: "materials",
      title: { es: "Materiales", en: "Materials" },
      description: {
        es: "Fotos, textos y todo lo que ya tengas preparado.",
        en: "Photos, copy and anything you already have.",
      },
      fields: [
        {
          key: "photos",
          type: "file",
          accept: ["image"],
          maxFiles: 20,
          label: { es: "Fotos del negocio", en: "Photos of the business" },
          help: {
            es: "Local, equipo, productos… Cuanta más calidad, mejor.",
            en: "Premises, team, products… The higher the quality, the better.",
          },
        },
        {
          key: "catalog_files",
          type: "file",
          accept: ["image", "pdf"],
          maxFiles: 5,
          label: { es: "Carta, catálogo o lista de precios", en: "Menu, catalogue or price list" },
        },
        {
          key: "prices_notes",
          type: "textarea",
          maxLength: 3000,
          label: {
            es: "Precios o carta (si no tienes archivo)",
            en: "Prices or menu (if you don't have a file)",
          },
        },
        {
          key: "existing_texts",
          type: "textarea",
          maxLength: 5000,
          rows: 6,
          label: { es: "Textos que ya tengas", en: "Copy you already have" },
          help: {
            es: "Historia, presentación, descripciones… Pégalos aquí.",
            en: "Story, introduction, descriptions… Paste them here.",
          },
        },
        {
          key: "faq",
          type: "list",
          max: 15,
          label: { es: "Preguntas frecuentes", en: "Frequently asked questions" },
          itemLabel: { es: "Pregunta", en: "Question" },
          descriptionLabel: { es: "Respuesta", en: "Answer" },
        },
      ],
    },
    {
      key: "practical",
      title: { es: "Aspectos prácticos", en: "Practical details" },
      description: {
        es: "Dominio, servicios actuales, idiomas y fechas.",
        en: "Domain, current services, languages and dates.",
      },
      fields: [
        {
          key: "no_passwords_notice",
          type: "notice",
          tone: "warning",
          text: {
            es: "Nunca escribas contraseñas en este formulario. Si hace falta acceder a algún servicio, lo coordinaremos por otra vía segura.",
            en: "Never write passwords in this form. If we need access to any service, we will arrange it another, secure way.",
          },
        },
        {
          key: "has_domain",
          type: "select",
          label: { es: "¿Tienes ya un dominio?", en: "Do you already have a domain?" },
          options: [
            { value: "yes", label: { es: "Sí", en: "Yes" } },
            { value: "no", label: { es: "No", en: "No" } },
            { value: "unsure", label: { es: "No lo sé", en: "I'm not sure" } },
          ],
        },
        {
          key: "domain_name",
          type: "text",
          maxLength: 253,
          label: { es: "Dominio actual o deseado", en: "Current or desired domain" },
          placeholder: { es: "cafeterianube.com", en: "cloudcafe.com" },
        },
        {
          key: "current_website",
          type: "url",
          label: { es: "Web actual (si existe)", en: "Current website (if any)" },
        },
        {
          key: "existing_services",
          type: "multiselect",
          allowOther: true,
          label: {
            es: "¿Qué servicios tienes contratados ya?",
            en: "Which services do you already use?",
          },
          help: {
            es: "Solo para saber qué accesos coordinar después.",
            en: "Only so we know which access to arrange later.",
          },
          options: [
            { value: "hosting", label: { es: "Hosting", en: "Hosting" } },
            {
              value: "domain_email",
              label: { es: "Email con dominio propio", en: "Email on your own domain" },
            },
            {
              value: "google_business",
              label: { es: "Perfil de Google Business", en: "Google Business profile" },
            },
            { value: "booking", label: { es: "Sistema de reservas", en: "Booking system" } },
            { value: "shop", label: { es: "Tienda online", en: "Online shop" } },
            { value: "analytics", label: { es: "Analítica web", en: "Web analytics" } },
          ],
        },
        {
          key: "languages",
          type: "multiselect",
          required: true,
          allowOther: true,
          label: { es: "Idiomas de la web", en: "Website languages" },
          options: [
            { value: "es", label: { es: "Español", en: "Spanish" } },
            { value: "en", label: { es: "Inglés", en: "English" } },
            { value: "ca", label: { es: "Catalán", en: "Catalan" } },
            { value: "fr", label: { es: "Francés", en: "French" } },
            { value: "de", label: { es: "Alemán", en: "German" } },
            { value: "pt", label: { es: "Portugués", en: "Portuguese" } },
          ],
        },
        {
          key: "desired_launch_date",
          type: "date",
          label: { es: "¿Para cuándo te gustaría tenerla?", en: "When would you like it live?" },
        },
        {
          key: "additional_notes",
          type: "textarea",
          maxLength: 3000,
          label: { es: "¿Algo más que debamos saber?", en: "Anything else we should know?" },
        },
      ],
    },
  ],
};
