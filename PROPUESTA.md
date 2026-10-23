# Propuesta de mejora para mundigest.com

## 1. Diagnóstico de la web actual

### Diseño y experiencia
- La jerarquía visual es débil y cuesta identificar una acción principal.
- Se mezclan muchos estilos de fotografías, iconos y tamaños, lo que resta unidad y confianza.
- La información de contacto aparece repetida y compite con el contenido principal.
- Los servicios se presentan como una enumeración extensa; no ayudan a escoger ni conducen a una acción contextual.
- La página no tiene una propuesta de valor clara al inicio orientada al beneficio del cliente.

### Contenido y SEO básico
- Las páginas analizadas no tienen meta description ni encabezado H1.
- Las URLs (`/tr-fico`, `/men`, `/extranjer-a`) no describen bien su contenido.
- Hay erratas y texto que convendría revisar profesionalmente.
- El pie muestra © 2022 y debería actualizarse.
- La dirección aparece como Rambla de la Generalitat **45** en unos bloques y **47** en otros; debe confirmarse antes de publicar.

### Conversión y organización
- El formulario genérico pide una consulta abierta, pero no clasifica el servicio, el tipo de cliente ni la disponibilidad.
- No se distingue visualmente entre enviar una consulta y confirmar una cita.
- Falta un recorrido simple que anticipe qué ocurrirá después de contactar.

## 2. Concepto del rediseño

**Idea rectora:** “Tus trámites, bien hechos. Tu tiempo, para ti.”

- Se mantiene el rojo corporativo y el logotipo de MundiGest.
- Fondo cálido, tipografía única, más espacio en blanco y una retícula consistente.
- Se refuerza la confianza con la condición de gestores administrativos colegiados (COGAC n.º 3916).
- Un CTA principal visible en toda la página: **Pedir cita**.
- Servicios agrupados en seis áreas con detalles bajo demanda.
- Diseño adaptado a móvil, tableta y escritorio.

## 3. Arquitectura propuesta

1. Inicio: beneficio principal y CTA.
2. Señales de confianza.
3. Servicios.
4. Cómo funciona la solicitud.
5. Presentación del despacho.
6. Preguntas frecuentes.
7. Contacto, horario, teléfono, email y mapa.
8. Pie con páginas legales internas: aviso legal, privacidad y cookies.

En una fase posterior se puede crear una URL específica por servicio para mejorar el posicionamiento local, por ejemplo `/servicios/extranjeria` o `/gestoria-sant-feliu-de-guixols`.

## 4. Asistente de solicitud de cita

El prototipo utiliza un flujo guiado y predecible, sin fingir que el usuario habla con una persona ni con un sistema de inteligencia artificial.

### Dos puntos de entrada diferenciados
- **Pedir cita:** abre directamente el formulario conversacional para preparar una solicitud.
- **¿Te ayudamos?:** abre un menú de orientación sin formulario, con acceso a servicios, funcionamiento de las citas, preguntas frecuentes, horario, teléfono, email y mapa. Desde ayuda también se puede pasar voluntariamente a pedir cita.

### Datos que recoge
1. Servicio o “No lo tengo claro”.
2. Particular, autónomo/a o empresa.
3. Descripción breve, sin documentos ni datos sensibles.
4. Nombre, teléfono, email opcional y canal de respuesta preferido.
5. Disponibilidad y franja horaria.
6. Revisión y consentimiento de privacidad.

### Resultado para el gestor
Una solicitud homogénea con referencia, fecha, estado pendiente y todos los campos ordenados. En la demo se guarda en JSONL y CSV; el formato CSV puede abrirse en Excel o Google Sheets.

### Resultado para el cliente
Recibe una referencia y sabe que el equipo revisará su caso y lo contactará para confirmar la cita. No se promete una reserva automática inexistente.

## 5. Evolución recomendada para producción

### Fase 1 · Publicación
- Revisar textos, dirección y avisos legales.
- Conectar el formulario a un email transaccional o bandeja de solicitudes.
- Configurar dominio, HTTPS, copias de seguridad y monitorización.
- Añadir redirecciones desde las URLs antiguas.

### Fase 2 · Organización interna
- Guardar solicitudes en una base de datos o CRM.
- Notificar al gestor y enviar acuse de recibo al cliente.
- Panel privado con estados: nueva, en revisión, cita propuesta, confirmada y cerrada.
- Exportación y filtros por servicio, fecha o estado.

### Fase 3 · Agenda real, si se desea
- Integrar calendario y franjas disponibles reales.
- Permitir elegir cita presencial o videollamada.
- Confirmaciones y recordatorios automáticos.
- No pedir documentación sensible por el chat; usar un canal seguro separado.

## 6. Medición

Conviene medir: solicitudes iniciadas, solicitudes completadas, abandono por paso, llamadas desde la web y tiempo de primera respuesta. Así se puede comprobar si el rediseño reduce trabajo administrativo y mejora la conversión.
