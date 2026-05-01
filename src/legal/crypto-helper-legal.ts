/**
 * Informational legal copy for Crypto Helper (dashboard, wallet tools, third-party market data).
 * Not a substitute for counsel — operators should adapt jurisdiction, entity name, and contact.
 */

export type LegalSection = { id: string; title: string; paragraphs: string[] };

const esLocale = (locale: string) => locale.toLowerCase().startsWith("es");

export function privacyTitle(locale: string): string {
  return esLocale(locale) ? "Política de privacidad" : "Privacy Policy";
}

export function termsTitle(locale: string): string {
  return esLocale(locale) ? "Términos y condiciones" : "Terms & Conditions";
}

export function lastUpdatedLabel(locale: string): string {
  return esLocale(locale) ? "Última actualización: mayo de 2026." : "Last updated: May 2026.";
}

export function getPrivacySections(locale: string): LegalSection[] {
  return esLocale(locale) ? PRIVACY_ES : PRIVACY_EN;
}

export function getTermsSections(locale: string): LegalSection[] {
  return esLocale(locale) ? TERMS_ES : TERMS_EN;
}

const PRIVACY_EN: LegalSection[] = [
  {
    id: "intro",
    title: "Introduction",
    paragraphs: [
      "This Privacy Policy describes how Crypto Helper (“we”, “us”) handles information when you use our websites, dashboards, and related services (the “Services”). By using the Services, you acknowledge this Policy.",
      "The Services are informational and analytical tools. We are not a bank, broker, custodian, or investment adviser.",
    ],
  },
  {
    id: "what-we-collect",
    title: "Information we may process",
    paragraphs: [
      "Account and authentication data you provide (for example email when you register or sign in), session identifiers, and technical logs such as IP address, browser type, timestamps, and pages accessed — used for security, debugging, and abuse prevention.",
      "Wallet addresses you connect or paste into the interface appear in requests our backend makes to blockchain indexers and APIs. On-chain data is public by nature.",
      "If you contact support or use chat features, we process the content you send for that interaction.",
    ],
  },
  {
    id: "third-parties",
    title: "Third-party services",
    paragraphs: [
      "We rely on infrastructure and data providers (including but not limited to hosting, databases, analytics indexers, market-data APIs, and optional AI models) to operate the Services. Those providers process data under their own terms and privacy policies.",
      "We do not sell your personal information as a commodity. We may share data with processors strictly to operate the Services.",
    ],
  },
  {
    id: "cookies-storage",
    title: "Cookies, storage, and similar technologies",
    paragraphs: [
      "We use cookies or local storage for authentication sessions, preferences (such as locale), and essential functionality. Non-essential analytics, if enabled, will respect applicable consent rules where required.",
    ],
  },
  {
    id: "security-retention",
    title: "Security and retention",
    paragraphs: [
      "We apply reasonable technical and organizational measures to protect data. No online service can guarantee absolute security.",
      "We retain information only as long as necessary for the purposes above, unless a longer period is required by law or legitimate interest (for example security logs).",
    ],
  },
  {
    id: "rights",
    title: "Your rights",
    paragraphs: [
      "Depending on your jurisdiction, you may have rights to access, rectify, delete, restrict, or export personal data, or to object to certain processing. Contact us to exercise these rights. You may also lodge a complaint with your local supervisory authority.",
    ],
  },
  {
    id: "children",
    title: "Children",
    paragraphs: [
      "The Services are not directed at children under the age where parental consent is required in your region. We do not knowingly collect personal information from children.",
    ],
  },
  {
    id: "changes-contact",
    title: "Changes and contact",
    paragraphs: [
      "We may update this Policy from time to time; the revised version will be indicated by the “Last updated” date above.",
      "For privacy inquiries, use the contact details published on this site or in your account area when available.",
    ],
  },
];

const PRIVACY_ES: LegalSection[] = [
  {
    id: "intro",
    title: "Introducción",
    paragraphs: [
      "Esta Política de privacidad describe cómo Crypto Helper («nosotros») trata la información cuando utilizas nuestros sitios, paneles y servicios relacionados (los «Servicios»). Al usar los Servicios, reconoces esta Política.",
      "Los Servicios son herramientas informativas y analíticas. No somos banco, bróker, custodio ni asesor de inversiones.",
    ],
  },
  {
    id: "what-we-collect",
    title: "Información que podemos tratar",
    paragraphs: [
      "Datos de cuenta y autenticación que proporcionas (por ejemplo correo al registrarte o iniciar sesión), identificadores de sesión y registros técnicos como dirección IP, tipo de navegador, marcas de tiempo y páginas visitadas — para seguridad, depuración y prevención de abusos.",
      "Las direcciones de wallet que conectas o pegas en la interfaz aparecen en peticiones que nuestro backend realiza a indexadores y APIs de cadena. Los datos on-chain son públicos por naturaleza.",
      "Si contactas soporte o usas funciones de chat, tratamos el contenido que envías para esa interacción.",
    ],
  },
  {
    id: "third-parties",
    title: "Servicios de terceros",
    paragraphs: [
      "Dependemos de infraestructura y proveedores de datos (incluidos alojamiento, bases de datos, indexadores, APIs de mercado y modelos de IA opcionales) para operar los Servicios. Esos proveedores tratan datos según sus propios términos y políticas de privacidad.",
      "No vendemos tu información personal como mercancía. Podemos compartir datos con encargados del tratamiento estrictamente para operar los Servicios.",
    ],
  },
  {
    id: "cookies-storage",
    title: "Cookies, almacenamiento local y tecnologías similares",
    paragraphs: [
      "Usamos cookies o almacenamiento local para sesiones de autenticación, preferencias (como idioma) y funcionalidad esencial. Si se habilitara analítica no esencial, respetaremos las normas de consentimiento aplicables.",
    ],
  },
  {
    id: "security-retention",
    title: "Seguridad y conservación",
    paragraphs: [
      "Aplicamos medidas técnicas y organizativas razonables para proteger los datos. Ningún servicio en línea puede garantizar seguridad absoluta.",
      "Conservamos la información solo el tiempo necesario para los fines descritos, salvo obligación legal o interés legítimo (por ejemplo registros de seguridad).",
    ],
  },
  {
    id: "rights",
    title: "Tus derechos",
    paragraphs: [
      "Según tu jurisdicción, puedes tener derechos de acceso, rectificación, supresión, limitación u oposición al tratamiento, o de portabilidad. Contáctanos para ejercerlos. También puedes presentar reclamación ante la autoridad de protección de datos competente.",
    ],
  },
  {
    id: "children",
    title: "Menores",
    paragraphs: [
      "Los Servicios no están dirigidos a menores por debajo de la edad que exija consentimiento parental en tu región. No recopilamos a sabiendas datos personales de menores.",
    ],
  },
  {
    id: "changes-contact",
    title: "Cambios y contacto",
    paragraphs: [
      "Podemos actualizar esta Política; la versión revisada se indicará con la fecha de «Última actualización» arriba.",
      "Para consultas de privacidad, usa los datos de contacto publicados en el sitio o en tu cuenta cuando estén disponibles.",
    ],
  },
];

const TERMS_EN: LegalSection[] = [
  {
    id: "acceptance",
    title: "Agreement",
    paragraphs: [
      "By accessing or using Crypto Helper (the “Services”), you agree to these Terms. If you do not agree, do not use the Services.",
      "We may update these Terms; continued use after changes constitutes acceptance of the revised Terms.",
    ],
  },
  {
    id: "service",
    title: "Nature of the Services",
    paragraphs: [
      "Crypto Helper provides informational dashboards, analytics, links to third-party data sources, and optional tools (including wallet connection for display purposes). We do not operate an exchange, custody funds for you, or execute trades on your behalf through these Terms unless a separate written agreement explicitly says otherwise.",
    ],
  },
  {
    id: "risk-disclaimer",
    title: "Not financial, tax, or legal advice",
    paragraphs: [
      "Nothing on the Services constitutes investment, financial, tax, or legal advice. Digital assets are volatile and high-risk. Past performance does not predict future results.",
      "You alone are responsible for decisions to buy, sell, hold, or use any asset. Consult qualified professionals before making financial or legal decisions.",
    ],
  },
  {
    id: "data-accuracy",
    title: "Third-party data and delays",
    paragraphs: [
      "Market, NFT, wallet, and on-chain data shown in the Services come from third-party APIs and indexers. Data may be incomplete, delayed, incorrect, or unavailable. We do not warrant accuracy or timeliness.",
    ],
  },
  {
    id: "wallet",
    title: "Wallet connection and transactions",
    paragraphs: [
      "Connecting a wallet may reveal your public address to our servers and partners as needed to display balances and activity. You are solely responsible for safeguarding seed phrases, private keys, and hardware devices.",
      "Any signature or transaction you approve in your wallet is under your control and risk. Verify every transaction detail in your wallet before confirming.",
    ],
  },
  {
    id: "pro-ai",
    title: "Pro features, billing, and AI tools",
    paragraphs: [
      "Certain features may require a paid or subscription tier (“Pro”) as described in the product UI. Fees, networks, and verification flows are shown at purchase time.",
      "AI-assisted features produce automated outputs that may be wrong or outdated. Do not rely on them as sole grounds for financial decisions.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    paragraphs: [
      "You will not misuse the Services (including scraping in violation of our technical limits, attacking infrastructure, laundering funds, or violating applicable sanctions and laws). We may suspend or terminate access for violations.",
    ],
  },
  {
    id: "ip",
    title: "Intellectual property",
    paragraphs: [
      "The Services’ branding, design, and original content are protected by applicable intellectual property laws. Third-party names and logos belong to their owners.",
    ],
  },
  {
    id: "disclaimer-warranty",
    title: "Disclaimer of warranties",
    paragraphs: [
      "THE SERVICES ARE PROVIDED “AS IS” AND “AS AVAILABLE”, WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.",
    ],
  },
  {
    id: "limitation-liability",
    title: "Limitation of liability",
    paragraphs: [
      "TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE AND OUR AFFILIATES WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICES.",
      "OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF THE SERVICES SHALL NOT EXCEED THE GREATER OF (A) AMOUNTS YOU PAID US FOR THE SERVICES IN THE TWELVE MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED US DOLLARS (USD $100), IF APPLICABLE LAWS ALLOW SUCH A CAP.",
    ],
  },
  {
    id: "indemnity",
    title: "Indemnity",
    paragraphs: [
      "You agree to defend and indemnify us against claims arising from your misuse of the Services, violation of these Terms, or violation of applicable law.",
    ],
  },
  {
    id: "law",
    title: "Governing law and disputes",
    paragraphs: [
      "Unless mandatory local law requires otherwise, these Terms are governed by the laws of the jurisdiction where the operator designates as its place of business (update this clause with your entity and venue after legal review). Courts in that jurisdiction shall have exclusive jurisdiction, except where consumer protections require otherwise.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [
      "For questions about these Terms, contact us through the channels published on this website.",
    ],
  },
];

const TERMS_ES: LegalSection[] = [
  {
    id: "acceptance",
    title: "Aceptación",
    paragraphs: [
      "Al acceder o usar Crypto Helper (los «Servicios»), aceptas estos Términos. Si no estás de acuerdo, no uses los Servicios.",
      "Podemos actualizar estos Términos; el uso continuado tras los cambios implica la aceptación de la versión revisada.",
    ],
  },
  {
    id: "service",
    title: "Naturaleza de los Servicios",
    paragraphs: [
      "Crypto Helper ofrece paneles informativos, analítica, enlaces a fuentes de datos de terceros y herramientas opcionales (incluida la conexión de wallet para visualización). No operamos un exchange, no custodiamos tus fondos ni ejecutamos operaciones en tu nombre salvo acuerdo por escrito distinto.",
    ],
  },
  {
    id: "risk-disclaimer",
    title: "No constituye asesoramiento financiero, fiscal ni legal",
    paragraphs: [
      "Nada en los Servicios constituye asesoramiento de inversión, financiero, fiscal o legal. Los activos digitales son volátiles y de alto riesgo. Los resultados pasados no garantizan resultados futuros.",
      "Eres el único responsable de las decisiones de compra, venta, custodia o uso de cualquier activo. Consulta a profesionales cualificados antes de tomar decisiones financieras o legales.",
    ],
  },
  {
    id: "data-accuracy",
    title: "Datos de terceros y retrasos",
    paragraphs: [
      "Los datos de mercado, NFT, wallet y cadena provienen de APIs e indexadores externos. Pueden estar incompletos, retrasados, ser incorrectos o no estar disponibles. No garantizamos exactitud ni puntualidad.",
    ],
  },
  {
    id: "wallet",
    title: "Conexión de wallet y transacciones",
    paragraphs: [
      "Conectar una wallet puede exponer tu dirección pública a nuestros servidores y socios según sea necesario para mostrar saldos y actividad. Eres el único responsable de proteger semillas, claves privadas y dispositivos.",
      "Cada firma o transacción que apruebes en tu wallet está bajo tu control y riesgo. Verifica todos los detalles en la wallet antes de confirmar.",
    ],
  },
  {
    id: "pro-ai",
    title: "Funciones Pro, facturación e IA",
    paragraphs: [
      "Algunas funciones pueden requerir un nivel de pago o suscripción («Pro») según se muestra en la interfaz. Comisiones, redes y flujos de verificación se indican en el momento del pago.",
      "Las funciones asistidas por IA generan salidas automáticas que pueden ser incorrectas u obsoletas. No las uses como única base para decisiones financieras.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Uso aceptable",
    paragraphs: [
      "No harás un uso indebido de los Servicios (incluido scraping contrario a límites técnicos, ataques a la infraestructura, blanqueo de capitales o incumplimiento de sanciones y leyes aplicables). Podemos suspender o terminar el acceso por incumplimiento.",
    ],
  },
  {
    id: "ip",
    title: "Propiedad intelectual",
    paragraphs: [
      "La marca, el diseño y el contenido original de los Servicios están protegidos por las leyes aplicables. Los nombres y logotipos de terceros pertenecen a sus titulares.",
    ],
  },
  {
    id: "disclaimer-warranty",
    title: "Exclusión de garantías",
    paragraphs: [
      "LOS SERVICIOS SE OFRECEN «TAL CUAL» Y «SEGÚN DISPONIBILIDAD», SIN GARANTÍAS DE NINGÚN TIPO, EXPRESAS O IMPLÍCITAS, INCLUIDAS COMERCIABILIDAD, IDONEIDAD PARA UN FIN CONCRETO Y NO INFRACCIÓN.",
    ],
  },
  {
    id: "limitation-liability",
    title: "Limitación de responsabilidad",
    paragraphs: [
      "EN LA MEDIDA MÁXIMA PERMITIDA POR LEY, NOSOTROS Y NUESTRAS FILIALES NO SEREMOS RESPONSABLES POR DAÑOS INDIRECTOS, INCIDENTALES, ESPECIALES, CONSECUENCIALES O PUNITIVOS, NI POR PÉRDIDA DE BENEFICIOS, DATOS O FONDO DE COMERCIO, DERIVADOS DEL USO DE LOS SERVICIOS.",
      "NUESTRA RESPONSABILIDAD TOTAL POR CUALQUIER RECLAMACIÓN RELACIONADA CON LOS SERVICIOS NO EXCEDERÁ EL MAYOR DE (A) LO QUE NOS HAYAS PAGADO POR LOS SERVICIOS EN LOS DOCE MESES ANTERIORES A LA RECLAMACIÓN O (B) CIEN DÓLARES ESTADOUNIDENSES (100 USD), SI LAS LEYES APLICABLES PERMITEN DICHO TOPE.",
    ],
  },
  {
    id: "indemnity",
    title: "Indemnización",
    paragraphs: [
      "Te comprometes a defendernos e indemnizarnos frente a reclamaciones derivadas de un uso indebido de los Servicios, del incumplimiento de estos Términos o de la ley aplicable.",
    ],
  },
  {
    id: "law",
    title: "Ley aplicable y controversias",
    paragraphs: [
      "Salvo que la normativa imperativa disponga lo contrario, estos Términos se rigen por las leyes de la jurisdicción que el operador designe como domicilio social (actualiza esta cláusula con tu entidad y fuero tras revisión legal). Los tribunales de esa jurisdicción tendrán competencia exclusiva, salvo donde la protección al consumidor exija otro fuero.",
    ],
  },
  {
    id: "contact",
    title: "Contacto",
    paragraphs: [
      "Para consultas sobre estos Términos, contáctanos por los canales publicados en este sitio web.",
    ],
  },
];
