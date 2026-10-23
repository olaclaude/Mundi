# MundiGest · Propuesta de rediseño

Web responsive para MundiGest, con navegación completa, páginas legales y dos asistentes diferenciados: orientación y solicitud de citas.

## Producción

- Web: https://mundigest-web.vercel.app
- Proyecto de Vercel: `mundigest-web`
- Repositorio: https://github.com/olaclaude/Mundi

## Ejecutar en local

```bash
npm start
```

Se abre en `http://localhost:3000`. No requiere instalar dependencias. El servidor local guarda las solicitudes en `data/appointments.jsonl` y `data/appointments.csv`.

## Funcionalidad

- Navegación responsive y menú móvil.
- “Pedir cita” abre la solicitud; “¿Te ayudamos?” ofrece orientación, servicios, dudas y contacto.
- El botón flotante se oculta al llegar al footer para no tapar los enlaces legales.
- Accesos `tel:`, `mailto:` y Google Maps.
- Seis fichas de servicios con detalle y CTA contextual.
- Preguntas frecuentes desplegables.
- Páginas internas de aviso legal, privacidad y cookies.
- Asistente con validaciones, resumen, consentimiento y confirmación con referencia.
- Alternativa por email si la recepción online no está disponible.

## Estructura para Vercel

- `public/`: web estática, estilos, JavaScript y recursos.
- `api/appointments.js`: función serverless que valida y registra solicitudes.
- `api/health.js`: comprobación del estado de la API.
- `vercel.json`: configuración y cabeceras de seguridad.
- `supabase-schema.sql`: tabla recomendada para persistencia.
- `server.js`: servidor de desarrollo local; no se utiliza en Vercel.

## Persistencia en producción

Vercel no conserva archivos locales entre ejecuciones. La función serverless admite dos alternativas configurables mediante variables de entorno.

### Opción A · Supabase

1. Ejecutar `supabase-schema.sql` en el proyecto elegido.
2. Configurar en Vercel:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` como variable `sensitive` y solo en el entorno correspondiente.

La clave de servicio se utiliza exclusivamente en la función de servidor; nunca se envía al navegador.

### Opción B · Webhook

Configurar:

- `APPOINTMENTS_WEBHOOK_URL`
- `APPOINTMENTS_WEBHOOK_SECRET` (opcional, recomendado)

El endpoint debe aceptar un `POST` JSON y responder con un estado HTTP 2xx.

Si no hay ninguna opción configurada, la API responde `503 STORAGE_NOT_CONFIGURED` y el asistente ofrece enviar la solicitud completa por email. No muestra una confirmación falsa.

## Antes de publicar como web definitiva

- Confirmar si la dirección correcta es Rambla de la Generalitat **45 o 47**.
- Configurar persistencia y notificaciones al equipo.
- Revisar los textos legales con el responsable de privacidad.
- Añadir autenticación y copias de seguridad si se incorpora un panel interno.
- La solicitud no confirma automáticamente día y hora; el equipo debe contactar con el cliente.
