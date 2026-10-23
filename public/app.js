"use strict";

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const svg = (name, className = "") => `<svg${className ? ` class="${className}"` : ""} aria-hidden="true"><use href="#i-${name}"/></svg>`;
const escapeHTML = (value = "") => String(value).replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));

const services = {
  extranjeria: {
    label: "Extranjería y nacionalidad",
    icon: "passport",
    description: "Os asesoramos y tramitamos de manera personalizada solicitudes de nacionalidad, estancia y residencia ante la administración.",
    items: ["Nacionalidad española", "Arraigo social, laboral, familiar y para la formación", "Reagrupación familiar y tarjeta de familiar de ciudadano de la UE", "Solicitud y renovación de autorizaciones de residencia"]
  },
  vehiculos: {
    label: "Vehículos · DGT",
    icon: "car",
    description: "Realizamos gestiones ante la Dirección General de Tráfico, con tramitación telemática y sin desplazamientos innecesarios.",
    items: ["Cambio de titularidad y contratos de compraventa", "Informes de la DGT y duplicados de documentación", "Matriculaciones y cambios de domicilio", "Bajas temporales o definitivas y canje de permisos extranjeros"]
  },
  fiscal: {
    label: "Gestión fiscal",
    icon: "calculator",
    description: "Asesoramos, preparamos y presentamos impuestos en tu nombre ante las diferentes administraciones de Hacienda.",
    items: ["Declaración de la renta", "Impuestos trimestrales de autónomos y empresas", "Trámites ante la Agencia Tributaria de Cataluña", "Respuesta a requerimientos"]
  },
  laboral: {
    label: "Laboral y contable",
    icon: "briefcase",
    description: "Ofrecemos asesoramiento laboral y contable para autónomos, empresas y particulares, adaptado a cada situación.",
    items: ["Confección de nóminas", "Liquidación de seguros sociales", "Altas, bajas y modificaciones de contratos laborales", "Gestión de la contabilidad de tu empresa"]
  },
  certificados: {
    label: "Certificados digitales",
    icon: "certificate",
    description: "Como gestoría administrativa colegiada y autoridad de registro, podemos emitir tu certificado digital desde nuestra oficina.",
    items: ["Emisión de certificados electrónicos", "Tramitación desde nuestra oficina", "Asesoramiento para realizar gestiones telemáticas"]
  },
  administrativos: {
    label: "Otros trámites administrativos",
    icon: "file",
    description: "Preparamos y presentamos solicitudes y expedientes ante diferentes administraciones públicas.",
    items: ["Confección de contratos", "Redacción y presentación de alegaciones y recursos", "Solicitudes de prestaciones sociales", "Otras gestiones administrativas: consúltanos tu caso"]
  },
  otro: {
    label: "Otro trámite / No lo tengo claro",
    icon: "chat",
    description: "Cuéntanos brevemente tu caso y te ayudaremos a identificar el trámite.",
    items: []
  }
};

/* Navigation, accordions and general interactions */
const header = $("#site-header");
const menuToggle = $(".menu-toggle");
const mainNav = $("#main-nav");

const closeMenu = () => {
  mainNav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Abrir menú");
  document.body.classList.remove("menu-open");
};

menuToggle.addEventListener("click", () => {
  const willOpen = !mainNav.classList.contains("open");
  mainNav.classList.toggle("open", willOpen);
  menuToggle.setAttribute("aria-expanded", String(willOpen));
  menuToggle.setAttribute("aria-label", willOpen ? "Cerrar menú" : "Abrir menú");
  document.body.classList.toggle("menu-open", willOpen);
});

$$("a", mainNav).forEach(link => link.addEventListener("click", closeMenu));
window.addEventListener("scroll", () => header.classList.toggle("scrolled", window.scrollY > 12), {passive:true});
window.addEventListener("resize", () => { if (window.innerWidth > 900) closeMenu(); });
$("#current-year").textContent = new Date().getFullYear();

$$(".faq-item > button").forEach(button => {
  button.addEventListener("click", () => {
    const answer = document.getElementById(button.getAttribute("aria-controls"));
    const expanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!expanded));
    answer.hidden = expanded;
  });
});

let toastTimer;
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
}

/* Service detail dialog */
const serviceDialog = $("#service-dialog");
let dialogService = "administrativos";

function openService(key) {
  const service = services[key];
  if (!service) return;
  dialogService = key;
  $("#dialog-title").textContent = service.label;
  $("#dialog-description").textContent = service.description;
  $("#dialog-icon use").setAttribute("href", `#i-${service.icon}`);
  const list = $("#dialog-list");
  list.replaceChildren();
  service.items.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = svg("check");
    li.append(document.createTextNode(item));
    list.append(li);
  });
  serviceDialog.showModal();
}

$$(".service-card").forEach(card => card.addEventListener("click", () => openService(card.dataset.service)));
$(".dialog-close").addEventListener("click", () => serviceDialog.close());
serviceDialog.addEventListener("click", event => {
  if (event.target !== serviceDialog) return;
  const rect = serviceDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) serviceDialog.close();
});
$("#dialog-cta").addEventListener("click", () => {
  serviceDialog.close();
  openChat(dialogService);
});

/* Guided appointment assistant */
const chatPanel = $("#chat-panel");
const chatOverlay = $("#chat-overlay");
const chatLauncher = $("#chat-launcher");
const siteFooter = $(".site-footer");
if (siteFooter && "IntersectionObserver" in window) {
  const footerObserver = new IntersectionObserver(([entry]) => {
    chatLauncher.classList.toggle("launcher-footer-hidden", entry.isIntersecting);
  }, {threshold:0.01});
  footerObserver.observe(siteFooter);
}
const chatMessages = $("#chat-messages");
const chatComposer = $("#chat-composer");
const progress = $("#chat-progress");
const progressBar = $("#progress-bar");
const progressLabel = $("#progress-label");
const progressName = $("#progress-name");
let lastFocused = null;
let state;
let chatMode = "booking";

function freshState() {
  return {
    service: "", serviceLabel: "", profile: "", details: "",
    name: "", phone: "", email: "", contactPreference: "Teléfono",
    timeframe: "", slot: "", step: "service", reference: ""
  };
}

function setChatHeader(title, subtitle) {
  $("#chat-title").textContent = title;
  $("#chat-subtitle").textContent = subtitle;
}

function showChatPanel() {
  lastFocused = document.activeElement;
  closeMenu();
  chatPanel.hidden = false;
  chatOverlay.hidden = false;
  chatLauncher.hidden = true;
  document.body.classList.add("chat-open");
  setTimeout(() => {
    const target = $("button, input, textarea, select", chatComposer) || $("#chat-close");
    target?.focus({preventScroll:true});
  }, 60);
}

function openChat(preset = "") {
  if (typeof preset !== "string") preset = "";
  if (chatMode !== "booking" || preset || !state || !chatMessages.children.length || state.step === "success") startChat(preset);
  showChatPanel();
}

function openHelp() {
  startHelp();
  showChatPanel();
}

function closeChat() {
  chatPanel.hidden = true;
  chatOverlay.hidden = true;
  chatLauncher.hidden = false;
  document.body.classList.remove("chat-open");
  if (lastFocused && document.contains(lastFocused)) lastFocused.focus({preventScroll:true});
}

$$('[data-open-chat]').forEach(button => button.addEventListener("click", event => {
  const preset = event.currentTarget.dataset.servicePreset || "";
  openChat(preset);
}));
$$('[data-open-help]').forEach(button => button.addEventListener("click", openHelp));
$("#chat-close").addEventListener("click", closeChat);
chatOverlay.addEventListener("click", closeChat);
$("#chat-reset").addEventListener("click", () => {
  if (chatMode === "help") {
    startHelp();
    showToast("Ayuda reiniciada");
  } else {
    startChat();
    showToast("Solicitud reiniciada");
  }
});

function resetChatContent(label) {
  chatMessages.replaceChildren();
  chatComposer.replaceChildren();
  const date = document.createElement("div");
  date.className = "chat-date";
  date.textContent = label;
  chatMessages.append(date);
}

function startChat(preset = "") {
  chatMode = "booking";
  setChatHeader("Asistente MundiGest", "Solicitud guiada · Unos 2 minutos");
  state = freshState();
  resetChatContent("ASISTENTE AUTOMÁTICO · SOLICITUD DE CITA");
  addBot("¡Hola! Te ayudaré a preparar tu solicitud en unos 2 minutos. Después, el equipo de MundiGest te contactará para confirmar la cita.");
  if (preset && services[preset]) {
    state.service = preset;
    state.serviceLabel = services[preset].label;
    addUser(services[preset].label);
    goToStep("profile");
  } else {
    goToStep("service");
  }
}

function startHelp() {
  chatMode = "help";
  setChatHeader("Ayuda MundiGest", "Orientación, dudas y contacto");
  state = freshState();
  state.step = "help";
  resetChatContent("AYUDA AUTOMÁTICA · SIN FORMULARIOS");
  progress.hidden = true;
  addBot("¡Hola! Puedo orientarte antes de contactar con el equipo. ¿Qué necesitas?");
  renderHelpMenu();
}

function renderHelpMenu() {
  chatComposer.replaceChildren();
  renderOptions([
    {value:"appointment", label:"Quiero pedir una cita"},
    {value:"services", label:"Buscar mi trámite"},
    {value:"info", label:"Dudas sobre las citas"},
    {value:"contact", label:"Horario y contacto"}
  ], option => {
    if (option.value === "appointment") return startChat();
    addUser(option.label);
    if (option.value === "services") {
      addBot("Elige un área para ver los trámites más habituales. Si no lo tienes claro, también puedes contarnos tu caso.");
      renderHelpServices();
    }
    if (option.value === "info") {
      addBot("La solicitud no reserva una hora automáticamente. Primero nos cuentas lo básico y después te contactamos para confirmar el día, la hora y la documentación necesaria.");
      renderOptions([
        {value:"appointment", label:"Preparar mi solicitud"},
        {value:"faq", label:"Ver preguntas frecuentes"},
        {value:"back", label:"Volver a las opciones"}
      ], answer => {
        if (answer.value === "appointment") return startChat();
        if (answer.value === "back") { addUser(answer.label); addBot("¿Qué más necesitas?"); return renderHelpMenu(); }
        closeChat();
        $("#preguntas").scrollIntoView({behavior:"smooth", block:"start"});
      }, true);
    }
    if (option.value === "contact") {
      addBot("Puedes llamarnos al 872 270 170 o al 624 652 048, o escribir a info@mundigest.com. Horario: lunes a viernes, de 9:30 a 13:00 y de 15:30 a 19:00.");
      renderHelpContact();
    }
  });
}

function renderHelpServices() {
  chatComposer.replaceChildren();
  const options = ["extranjeria", "vehiculos", "fiscal", "laboral", "certificados", "administrativos"].map(key => ({value:key, label:services[key].label}));
  options.push({value:"otro", label:"No lo tengo claro"});
  options.push({value:"back", label:"Volver a las opciones"});
  renderOptions(options, option => {
    if (option.value === "back") { addUser(option.label); addBot("¿En qué más puedo orientarte?"); return renderHelpMenu(); }
    if (option.value === "otro") return startChat("otro");
    closeChat();
    setTimeout(() => openService(option.value), 60);
  });
}

function renderHelpContact() {
  chatComposer.replaceChildren();
  const actions = document.createElement("div");
  actions.className = "chat-form";
  actions.innerHTML = `
    <a class="chat-submit" href="tel:+34872270170">${svg("phone")} Llamar a MundiGest</a>
    <a class="chat-submit outline" href="mailto:info@mundigest.com">${svg("mail")} Enviar un email</a>
    <a class="chat-submit outline" href="https://www.google.com/maps/search/?api=1&query=Rambla+de+la+Generalitat+45+17220+Sant+Feliu+de+Guixols" target="_blank" rel="noopener">${svg("pin")} Cómo llegar</a>
    <button class="chat-submit outline" type="button" id="help-contact-back">Volver a las opciones</button>`;
  chatComposer.append(actions);
  $("#help-contact-back").addEventListener("click", () => {
    addUser("Volver a las opciones");
    addBot("¿En qué más puedo orientarte?");
    renderHelpMenu();
  });
  scrollChat();
}

const stepOrder = ["service", "profile", "details", "contact", "preference"];
const stepTitles = {service:"Servicio", profile:"Tipo de cliente", details:"Tu consulta", contact:"Contacto", preference:"Preferencia"};

function updateProgress() {
  progress.hidden = false;
  if (state.step === "review") {
    progressLabel.textContent = "Último paso";
    progressName.textContent = "Revisar y enviar";
    progressBar.style.width = "100%";
  } else if (state.step === "success") {
    progressLabel.textContent = "Completado";
    progressName.textContent = "Solicitud enviada";
    progressBar.style.width = "100%";
  } else {
    const index = Math.max(0, stepOrder.indexOf(state.step));
    progressLabel.textContent = `Paso ${index + 1} de ${stepOrder.length}`;
    progressName.textContent = stepTitles[state.step];
    progressBar.style.width = `${(index + 1) * 20}%`;
  }
}

function goToStep(step) {
  state.step = step;
  updateProgress();
  chatComposer.replaceChildren();
  if (step === "service") askService();
  if (step === "profile") askProfile();
  if (step === "details") askDetails();
  if (step === "contact") askContact();
  if (step === "preference") askPreference();
  if (step === "review") showReview();
}

function scrollChat() {
  requestAnimationFrame(() => { chatMessages.scrollTop = chatMessages.scrollHeight; });
}

function messageNode(author, text = "") {
  const row = document.createElement("div");
  row.className = `chat-message ${author}`;
  if (author === "bot") {
    const avatar = document.createElement("span");
    avatar.className = "message-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = "MG";
    row.append(avatar);
  }
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = text;
  row.append(bubble);
  return {row, bubble};
}

function addBot(text) {
  const {row} = messageNode("bot", text);
  chatMessages.append(row);
  scrollChat();
}

function addUser(text) {
  const {row} = messageNode("user", text);
  chatMessages.append(row);
  scrollChat();
}

function addCustomBubble(node) {
  const {row, bubble} = messageNode("bot");
  bubble.textContent = "";
  bubble.append(node);
  chatMessages.append(row);
  scrollChat();
}

function renderOptions(options, onSelect, single = false) {
  const wrap = document.createElement("div");
  wrap.className = `chat-options${single ? " single" : ""}`;
  options.forEach(option => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chat-option";
    button.innerHTML = `<span>${escapeHTML(option.label)}</span>${svg("arrow")}`;
    button.addEventListener("click", () => {
      $$("button", wrap).forEach(item => { item.disabled = true; });
      onSelect(option);
    }, {once:true});
    wrap.append(button);
  });
  chatComposer.append(wrap);
  scrollChat();
}

function askService() {
  addBot("¿Sobre qué necesitas ayuda?");
  const options = ["extranjeria", "vehiculos", "fiscal", "laboral", "certificados", "administrativos", "otro"].map(key => ({value:key, label:services[key].label}));
  renderOptions(options, option => {
    state.service = option.value;
    state.serviceLabel = option.label;
    addUser(option.label);
    goToStep("profile");
  });
}

function askProfile() {
  addBot("Perfecto. ¿Para quién es el trámite?");
  renderOptions([
    {value:"Particular", label:"Para mí · Particular"},
    {value:"Autónomo/a", label:"Autónomo/a"},
    {value:"Empresa", label:"Empresa"}
  ], option => {
    state.profile = option.value;
    addUser(option.label);
    goToStep("details");
  }, true);
}

function askDetails() {
  addBot("Cuéntanos brevemente qué necesitas. No hace falta que uses términos técnicos ni que envíes documentos.");
  const form = document.createElement("form");
  form.className = "chat-form";
  form.noValidate = true;
  form.innerHTML = `
    <label for="chat-details">Tu consulta
      <textarea id="chat-details" name="details" maxlength="500" placeholder="Ej.: He comprado un coche y necesito ponerlo a mi nombre…" required></textarea>
    </label>
    <div class="char-count"><span id="detail-count">0</span>/500</div>
    <p class="form-error" role="alert" hidden></p>
    <button class="chat-submit" type="submit">Continuar ${svg("arrow")}</button>`;
  chatComposer.append(form);
  const textarea = $("textarea", form);
  textarea.addEventListener("input", () => { $("#detail-count", form).textContent = textarea.value.length; });
  form.addEventListener("submit", event => {
    event.preventDefault();
    const value = textarea.value.trim();
    const error = $(".form-error", form);
    if (value.length < 8) {
      error.textContent = "Añade un poco más de detalle (al menos 8 caracteres).";
      error.hidden = false;
      textarea.focus();
      return;
    }
    state.details = value;
    addUser(value);
    goToStep("contact");
  });
  scrollChat();
}

function askContact() {
  addBot("¿A nombre de quién ponemos la solicitud y cómo podemos contactar?");
  const form = document.createElement("form");
  form.className = "chat-form";
  form.noValidate = true;
  form.innerHTML = `
    <div class="form-row">
      <label for="chat-name">Nombre y apellidos
        <input id="chat-name" name="name" autocomplete="name" maxlength="80" placeholder="Tu nombre" required>
      </label>
      <label for="chat-phone">Teléfono
        <input id="chat-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="20" placeholder="600 000 000" required>
      </label>
    </div>
    <div class="form-row">
      <label for="chat-email">Email (opcional)
        <input id="chat-email" name="email" type="email" autocomplete="email" maxlength="120" placeholder="tu@email.com">
      </label>
      <label for="chat-preference">Prefiero respuesta por
        <select id="chat-preference" name="contactPreference"><option>Teléfono</option><option>WhatsApp</option><option>Email</option></select>
      </label>
    </div>
    <p class="form-error" role="alert" hidden></p>
    <button class="chat-submit" type="submit">Continuar ${svg("arrow")}</button>`;
  chatComposer.append(form);
  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const email = String(data.get("email") || "").trim();
    const contactPreference = String(data.get("contactPreference") || "Teléfono");
    const digits = phone.replace(/\D/g, "");
    const error = $(".form-error", form);
    let message = "";
    if (name.length < 2) message = "Escribe tu nombre para poder dirigirnos a ti.";
    else if (digits.length < 9 || digits.length > 15) message = "Revisa el número de teléfono.";
    else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) message = "Revisa la dirección de email.";
    else if (contactPreference === "Email" && !email) message = "Añade tu email o elige otra forma de contacto.";
    if (message) {
      error.textContent = message;
      error.hidden = false;
      return;
    }
    Object.assign(state, {name, phone, email, contactPreference});
    addUser(`${name} · ${contactPreference}`);
    goToStep("preference");
  });
  scrollChat();
}

function askPreference() {
  addBot("Por último, ¿cuándo te vendría mejor que te contactáramos? La cita se acordará después contigo.");
  const form = document.createElement("form");
  form.className = "chat-form";
  form.noValidate = true;
  form.innerHTML = `
    <label for="chat-timeframe">Disponibilidad
      <select id="chat-timeframe" name="timeframe" required>
        <option value="">Selecciona una opción</option>
        <option>Lo antes posible</option><option>Esta semana</option><option>La próxima semana</option><option>Solo quiero información</option>
      </select>
    </label>
    <label>Franja horaria</label>
    <div class="time-options">
      <label class="time-option"><input type="radio" name="slot" value="Mañana · 9:30–13:00"><span>Mañana<br>9:30–13:00</span></label>
      <label class="time-option"><input type="radio" name="slot" value="Tarde · 15:30–19:00"><span>Tarde<br>15:30–19:00</span></label>
      <label class="time-option"><input type="radio" name="slot" value="Sin preferencia" checked><span>Sin<br>preferencia</span></label>
    </div>
    <p class="form-error" role="alert" hidden></p>
    <button class="chat-submit" type="submit">Revisar solicitud ${svg("arrow")}</button>`;
  chatComposer.append(form);
  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(form);
    const timeframe = String(data.get("timeframe") || "");
    if (!timeframe) {
      const error = $(".form-error", form);
      error.textContent = "Selecciona tu disponibilidad para continuar.";
      error.hidden = false;
      return;
    }
    state.timeframe = timeframe;
    state.slot = String(data.get("slot") || "Sin preferencia");
    addUser(`${timeframe} · ${state.slot}`);
    goToStep("review");
  });
  scrollChat();
}

function showReview() {
  addBot("Ya tenemos lo básico. Revisa el resumen y envía tu solicitud.");
  const review = document.createElement("div");
  review.className = "chat-review";
  const rows = [
    ["Servicio", state.serviceLabel], ["Cliente", state.profile], ["Consulta", state.details],
    ["Nombre", state.name], ["Teléfono", state.phone], ["Email", state.email || "No indicado"],
    ["Respuesta por", state.contactPreference], ["Disponibilidad", `${state.timeframe} · ${state.slot}`]
  ];
  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "review-row";
    const term = document.createElement("span");
    term.textContent = label;
    const content = document.createElement("strong");
    content.textContent = value;
    row.append(term, content);
    review.append(row);
  });
  addCustomBubble(review);

  const form = document.createElement("form");
  form.className = "chat-form";
  form.noValidate = true;
  form.innerHTML = `
    <label class="consent-label"><input type="checkbox" name="consent" required><span>He leído la <a href="privacidad.html" target="_blank" rel="noopener">política de privacidad</a> y consiento el uso de estos datos para gestionar mi solicitud.</span></label>
    <p class="form-error" role="alert" hidden></p>
    <button class="chat-submit" type="submit">Enviar solicitud ${svg("send")}</button>`;
  chatComposer.append(form);
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!$("input[name='consent']", form).checked) {
      const error = $(".form-error", form);
      error.textContent = "Necesitamos tu consentimiento para enviar la solicitud.";
      error.hidden = false;
      return;
    }
    submitRequest(form);
  });
  scrollChat();
}

async function submitRequest(form) {
  const button = $("button[type='submit']", form);
  const error = $(".form-error", form);
  error.hidden = true;
  button.disabled = true;
  button.innerHTML = `<span class="spinner" aria-hidden="true"></span> Enviando…`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        service:state.service, serviceLabel:state.serviceLabel, profile:state.profile,
        details:state.details, name:state.name, phone:state.phone, email:state.email,
        contactPreference:state.contactPreference, timeframe:state.timeframe, slot:state.slot,
        consent:true
      }),
      signal:controller.signal
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "No se ha podido registrar la solicitud.");
    state.reference = result.reference;
    state.step = "success";
    updateProgress();
    chatComposer.replaceChildren();
    addBot(`Gracias, ${state.name.split(" ")[0]}. Tu solicitud se ha registrado correctamente.`);
    const success = document.createElement("div");
    success.className = "chat-success";
    success.innerHTML = `<span class="success-icon">${svg("check")}</span><strong>Solicitud enviada</strong><p>El equipo la revisará y te contactará para confirmar día y hora. Todavía no es una cita confirmada.</p><span class="reference">Ref. ${escapeHTML(state.reference)}</span>`;
    addCustomBubble(success);
    const actions = document.createElement("div");
    actions.className = "chat-form";
    const finish = document.createElement("button");
    finish.type = "button";
    finish.className = "chat-submit";
    finish.textContent = "Finalizar";
    finish.addEventListener("click", closeChat);
    const another = document.createElement("button");
    another.type = "button";
    another.className = "chat-submit outline";
    another.textContent = "Preparar otra solicitud";
    another.addEventListener("click", () => startChat());
    actions.append(finish, another);
    chatComposer.append(actions);
    scrollChat();
  } catch (requestError) {
    error.textContent = requestError.name === "AbortError" ? "La conexión está tardando demasiado. Inténtalo de nuevo." : (requestError.message || "No hemos podido enviar la solicitud. Inténtalo de nuevo.");
    error.hidden = false;
    button.disabled = false;
    button.innerHTML = `Reintentar envío ${svg("send")}`;
    if (!$(".email-fallback", chatComposer)) {
      const fallback = document.createElement("a");
      fallback.className = "chat-submit outline email-fallback";
      fallback.href = buildEmailFallback();
      fallback.textContent = "Alternativa: enviar por email";
      chatComposer.append(fallback);
    }
  } finally {
    clearTimeout(timeout);
    scrollChat();
  }
}

function buildEmailFallback() {
  const body = [
    "SOLICITUD DE CITA · WEB", "", `Servicio: ${state.serviceLabel}`, `Tipo de cliente: ${state.profile}`,
    `Consulta: ${state.details}`, "", `Nombre: ${state.name}`, `Teléfono: ${state.phone}`,
    `Email: ${state.email || "No indicado"}`, `Prefiero respuesta por: ${state.contactPreference}`,
    `Disponibilidad: ${state.timeframe}`, `Franja: ${state.slot}`, "",
    "Consiento el uso de estos datos para gestionar esta solicitud."
  ].join("\n");
  return `mailto:info@mundigest.com?subject=${encodeURIComponent(`Solicitud de cita · ${state.serviceLabel}`)}&body=${encodeURIComponent(body)}`;
}

/* Keyboard support and focus containment */
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (!chatPanel.hidden) closeChat();
    if (mainNav.classList.contains("open")) closeMenu();
  }
  if (event.key !== "Tab" || chatPanel.hidden) return;
  const focusable = $$('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])', chatPanel).filter(el => el.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
