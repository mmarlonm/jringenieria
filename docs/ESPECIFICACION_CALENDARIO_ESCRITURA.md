# Especificación: crear eventos de Google Calendar desde el CRM y desde Rayito IA

Objetivo: que el usuario cree eventos en **el calendario que elija** (propio o compartido con permiso de escritura), tanto desde la página **Calendario** del CRM como desde el **chat de Rayito IA**.

## Estado actual (no cambies lo que no esté listado aquí)

- **Lectura** ya existe: `GET /api/mi-calendario/calendarios` y `GET /api/mi-calendario/eventos` (archivos `jr_api/jr_api/Controllers/MiCalendarioController.cs` y `Services/MiCalendarioService.cs`). Usan el token del usuario de la sesión.
- **Página del CRM:** `jringenieria/src/app/modules/admin/calendario/calendario.component.ts` y `.html`. Tiene la lista de calendarios agrupada en "Mis calendarios" (`rol === 'owner'`) y "Otros calendarios". La selección se guarda en `localStorage` con la clave `calendarioSeleccionados`.
- **Servicio del CRM:** `jringenieria/src/app/modules/admin/calendario/calendario.service.ts`.
- **Widget flotante:** `jringenieria/src/app/modules/admin/calendario/calendario-flotante/`.
- **Rayito IA:**
  - Instrucciones y formato del comando en `jr_api/jr_api/Services/GeminiService.cs` (líneas ~194–215): hoy el comando es `[CREATE_EVENT: título | inicio | fin | ubicación | descripción]` y `[DELETE_EVENT: eventId]`.
  - El CRM ejecuta el comando en `jringenieria/src/app/layout/layout.component.ts`: la regex `CREATE_EVENT` (línea ~449) y el método `crearEventoGoogleCalendarDesdeChat(...)`.
  - Hoy **siempre** crea en el calendario principal (`calendars/primary`), por el método `CreateOrUpdateCalendarEventFromClientAsync` en `Services/GoogleAuthService.cs` (~línea 325).
- **Seguridad pendiente, a corregir en esta entrega si tocas esos archivos:** `GET /api/Auth/eventos-por-mes` (`Controllers/AuthController.cs`, ~línea 652) y `AuthController.CreateOrUpdateEvent` (~línea 551) reciben `usuarioId` desde el cliente. Deben tomar el usuario del token (`UsuarioActual.TryObtenerId(User, out var id)`) como hace `MiCalendarioController`. No rompas la respuesta que ya usa el front.

## Parte 1 · API (`jr_api/jr_api`)

### 1.1 Crear evento en un calendario concreto
- Método nuevo en `MiCalendarioService`: `CrearEventoAsync(int usuarioId, EventoNuevoDto dto)`.
  1. Obtener el token vigente con `ObtenerAccessTokenAsync` (ya existe).
  2. Verificar permiso: `GET https://www.googleapis.com/calendar/v3/users/me/calendarList/{calendarioId}` → `accessRole`. Solo `owner` o `writer` pueden crear. Si no, lanzar `UnauthorizedAccessException` con el mensaje "No tienes permiso de escritura en ese calendario."
  3. `POST https://www.googleapis.com/calendar/v3/calendars/{calendarioId}/events` con el cuerpo:
     - `summary` = título, `location` = ubicación (si hay), `description` = descripción (si hay).
     - Evento con hora: `start: { dateTime: "yyyy-MM-ddTHH:mm:ss", timeZone: "America/Mexico_City" }`, igual para `end`.
     - Todo el día: `start: { date: "yyyy-MM-dd" }`, `end: { date: "yyyy-MM-dd" }` con el fin **exclusivo** (día siguiente).
  4. Devolver el evento normalizado (`EventoGoogleDto`) con el mismo formato que `ListarEventosAsync`.
- DTO nuevo en `DTOs/MiCalendarioDtos.cs`: `EventoNuevoDto(string CalendarioId, string Titulo, DateTime Inicio, DateTime Fin, bool TodoElDia, string? Ubicacion, string? Descripcion)`.
- Endpoint nuevo en `MiCalendarioController`: `POST api/mi-calendario/eventos` (`[FromBody] EventoNuevoDto`). Validaciones (400 con `mensaje`): título vacío o mayor de 200 caracteres, `Fin` menor que `Inicio`, `CalendarioId` vacío. Responde **201** con el evento creado. Mapea `UnauthorizedAccessException` a **403** con su mensaje. `InvalidOperationException` sigue como **409**.

### 1.2 Rayito IA: elegir calendario
- En `GeminiService.cs`, agrega al contexto que se envía al modelo la lista `calendariosEscribibles`: `[{ id, nombre }]` solo de calendarios con `accessRole` `owner` o `writer`. Búscala donde se arma el JSON de contexto `calendarioGoogle` (usa `graphify query "calendarioGoogle contexto chat"`).
- Cambia la sintaxis del comando a:
  `[CREATE_EVENT: título | inicio | fin | ubicación | descripción | calendario]`
  - El sexto campo es **opcional**. Puede ser el `id` o el `nombre` exacto de un calendario de `calendariosEscribibles`.
  - Si se omite, usa el calendario principal (comportamiento actual). Los comandos de 5 campos deben seguir funcionando.
- Actualiza las instrucciones del prompt: si el usuario dice "en el calendario de RRHH", "en el de Compras", etc., elige el de `calendariosEscribibles` cuyo nombre coincida. Si hay varios o ninguno, pregunta antes de crear.

## Parte 2 · CRM (`jringenieria`)

### 2.1 Servicio
- `calendario.service.ts`: método `crearEvento(evento: EventoNuevo): Observable<EventoGoogle>` que hace `POST {apiUrl}/mi-calendario/eventos`. Interfaz `EventoNuevo` con los mismos campos del DTO (fechas en formato local `yyyy-MM-ddTHH:mm:ss`).

### 2.2 Página Calendario
- Botón **"Nuevo evento"** en el encabezado.
- Diálogo (`MatDialog`, componente nuevo `nuevo-evento-dialog/`) con:
  - **Calendario**: `mat-select` con solo los calendarios escribibles (`owner` o `writer`). Por defecto, el primero escribible del grupo **seleccionado** en la barra lateral: si hay calendarios marcados en "Mis calendarios", uno de esos; si no, el primero escribible de "Otros calendarios".
  - **Título** (obligatorio, máx. 200), **Todo el día** (toggle), **Inicio** y **Fin** (`datetime-local`, o `date` si es todo el día), **Ubicación**, **Descripción**.
  - Validación: fin mayor que inicio. Botón "Crear" deshabilitado mientras envía.
- Al crear: cierra el diálogo, muestra aviso de éxito y vuelve a cargar la semana. Si el API responde 403, muestra el mensaje del API en el diálogo.
- Atajo: clic en un día vacío de la semana abre el diálogo con esa fecha y hora 09:00 como inicio.

### 2.3 Rayito IA en `layout.component.ts`
- La regex de `CREATE_EVENT` acepta el sexto campo (`calendario`).
- `crearEventoGoogleCalendarDesdeChat` pasa el `calendarioId` al nuevo endpoint. Si el sexto campo es un nombre, resuélvelo contra la lista de calendarios escribibles (ya disponible vía `GET /mi-calendario/calendarios`).
- Muestra un aviso con el nombre del calendario donde se creó. Si la creación falla, muestra el mensaje del API en el chat.

## Reglas de trabajo
- **No despliegues nada** y **no hagas commits**.
- Usa el grafo antes de buscar en el código: `graphify query "<pregunta>"` en `jr_api/jr_api` y en `jringenieria`. **No ejecutes `graphify update`**; lo hace el usuario.
- Cambia solo los archivos listados aquí. Si necesitas tocar otro, explica por qué antes.
- No dejes `console.log`, TODOs ni código comentado. Comentarios cortos solo donde no sea obvio.
- Verificación obligatoria:
  - `dotnet build jr_api.csproj` en `jr_api/jr_api` sin errores.
  - `npx ngc -p tsconfig.app.json --noEmit` en `jringenieria` sin errores.

## Criterios de aceptación
1. Desde el CRM se puede crear un evento en un calendario compartido donde el usuario tiene escritura, y aparece en la semana al recargar.
2. Un calendario de solo lectura no aparece en el selector; si se fuerza por API, responde 403 con mensaje claro.
3. Con el grupo "Mis calendarios" seleccionado, el diálogo propone uno de esos calendarios.
4. En el chat, "crea una reunión mañana a las 10 en el calendario de RRHH" crea el evento en ese calendario; si no existe o hay ambigüedad, Rayito pregunta.
5. Los comandos `CREATE_EVENT` de 5 campos y `DELETE_EVENT` siguen funcionando.
6. `eventos-por-mes` y `CreateOrUpdateEvent` ya no aceptan `usuarioId` desde el cliente.
