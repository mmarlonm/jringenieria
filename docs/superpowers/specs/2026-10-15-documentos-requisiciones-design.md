# Documentos de requisiciones — Diseño

Fecha: 2026-10-15 · Estado: para revisión · Proyecto B de 2 (usa el A, «Permisos especiales», ya implementado)

## 1. Objetivo

Que cada requisición lleve su documentación completa dentro del ERP —**factura del proveedor, evidencia y comprobante de pago**— revisada por contabilidad, y que la requisición **se cierre sola** cuando todo esté aprobado y el pago esté liquidado. Así se evitan requisiciones abiertas por falta de soporte y no hay que pedir facturas después.

Origen: sugerencia de Pachuca (administración y contabilidad). Aplica a **todas las sucursales**.

## 2. Decisiones (ya tomadas)

| # | Decisión | De quién |
|---|---|---|
| 1 | La factura es la **del proveedor**, en **PDF** | Cliente |
| 2 | Los documentos requeridos varían por tipo de compra; el sistema queda **preparado para distintos tipos** | Cliente / usuario |
| 3 | Una requisición con anticipo no se cierra hasta quedar **liquidada por completo** | Cliente |
| 4 | Revisan y aprueban Catalina Méndez (usuario 14) y Ana Laura Ramos (usuario 16), con el permiso especial `compras.documentos.revisar` | Cliente |
| 5 | Las requisiciones existentes sin documentos aparecen como **pendientes**; las ya cerradas se quedan cerradas, sin fecha de corte | Cliente / usuario |
| 6 | **Subir** documentos puede hacerlo cualquier usuario con acceso al módulo de compras | Usuario |
| 7 | La factura aprobada **sustituye** el requisito de factura en CONTPAQi y la evidencia aprobada sustituye el registro de recepción para poder cerrar | Usuario |
| 8 | Se corrige el estatus que pone el registro de recepción (hoy regresa la requisición a «Aprobación») | Usuario |

Defaults aceptados al no recibir corrección: varios archivos por tipo (completo = al menos uno aprobado y ninguno pendiente), avisos por correo al rechazar y al cerrar, los archivos subidos antes quedan como anexos, y una requisición cerrada bloquea sus documentos.

## 3. Conceptos

- **Tipo de documento**: `Factura`, `Evidencia`, `Pago`. Cada uno define su nombre, las extensiones permitidas y si necesita revisión.
- **Documento**: un archivo subido a una requisición, con estado **Pendiente / Aprobado / Rechazado**.
- **Documentos requeridos**: los tipos que exige una requisición según su tipo de compra (§4.1).
- **Etapa documental**: la requisición ya se compró o se pagó: `IdEstatus >= 4` **o** `EstadoLiquidacion >= 1` (anticipo o liquidado), y su estatus no es 8 (cerrada) ni 11 (rechazada). Una requisición recién creada (estatus 1 a 3, sin pagos) no tiene documentos pendientes; una cerrada o rechazada ya no los pide. Se define así porque en la práctica el equipo casi no avanza los estatus: con los datos de hoy ninguna requisición ha llegado al 8, 365 están en el 4, los gastos solo llegan al 1 y al 4, y 9 requisiciones pagadas siguen en el 1. Exigirlos desde el 5 dejaría fuera casi todo. Resultado con los datos de hoy: **410** requisiciones en etapa documental (380 compras y 30 gastos); **288** ya están liquidadas, 9 tienen anticipo y 113 no tienen ningún pago.
- **Fecha de inicio (opcional)**: el catálogo tiene un valor `FechaInicioDocumentacion`, hoy vacío (aplica a todas, como se decidió). Si el volumen de pendientes resultara excesivo, poner una fecha exime a las requisiciones anteriores sin cambiar nada más.
- Estatus del catálogo (confirmados): 1 Solicitud creada · 2 Revisión de compras · 3 Cotización con proveedor · 4 Aprobación · 5 Orden de compra generada · 6 Material en tránsito · 7 Material recibido · **8 Solicitud cerrada** · 9 Pago Pendiente · 10 Pago Liquidado · **11 Solicitud rechazada**. Los estatus 9 y 10 existen pero el pago se lleva en `EstadoLiquidacion` (0 pendiente, 1 liquidado, 2 anticipo).

## 4. Reglas (funciones puras, sin base de datos)

### 4.1 Documentos requeridos
Declarados en una sola tabla del código (`DocumentosRequisicionCatalogo`), con una regla por línea y una regla por defecto. Cambiar o agregar un tipo es editar esa tabla.

| Condición | Requeridos |
|---|---|
| `TipoOperacion = 2` (Gasto) | Factura, Pago |
| `TipoCompra = Servicio` | Factura, Evidencia, Pago |
| Cualquier otro (materiales, inventario, herramienta, consumible, venta confirmada) | Factura, Evidencia, Pago |

La comparación de `TipoCompra` ignora mayúsculas, acentos y espacios sobrantes. Un tipo desconocido o vacío usa la regla por defecto.

Extensiones y tamaño (`TipoDocumentoDef`): Factura **solo PDF**; Evidencia y Pago PDF, JPG, JPEG, PNG. Máximo **10 MB** por archivo.

### 4.2 Tipo completo y documentación completa
- Un tipo está **completo** si tiene al menos un documento **Aprobado** y **ninguno Pendiente**. Los Rechazados no cuentan.
- La documentación está **completa** si todos los tipos requeridos están completos.

### 4.3 Cierre automático
Una requisición se cierra (estatus 8) cuando se cumplen **las tres**: está en etapa documental, `EstadoLiquidacion = 1` y la documentación está completa. Se evalúa después de cada subida, aprobación, rechazo, borrado y cambio de estado de pago. Al cerrar:
- se escribe en el historial «Cierre automático: documentación completa y pago liquidado»;
- se avisa por correo al solicitante (y a quien creó la requisición) con la notificación existente.

El cambio manual a estatus 8 que ya existe en el tablero aplica **la misma regla** (reemplaza la regla anterior de recepción y factura en CONTPAQi) y, si no se cumple, responde con lo que falta: «No se puede cerrar: falta Factura aprobada; el pago no está liquidado».

### 4.4 Auto-aprobación
Un documento subido por un usuario con `compras.documentos.revisar` nace **Aprobado**. Cubre el comprobante de pago que sube contabilidad al liquidar. No se confía en ningún indicador enviado por el front.

### 4.5 Estatus tras registrar una recepción
Hoy el registro de recepción pone la requisición en 4 («Aprobación») y escribe 8 en el historial; es la causa probable de que 365 requisiciones estén en el 4. Nuevo comportamiento: si el estatus actual es **menor que 7** pasa a **7** («Material recibido») y el historial anota 7; en el 7 o más, y en el 8 y el 11, **no lo cambia** (nunca retrocede ni reabre una cerrada). Las que hoy están en 4 por esta causa pasan a 7 con su siguiente recepción; no se reescribe el historial de las anteriores.

## 5. Datos (migración EF Core)

**`SolicitudesCompra_Documentos`** (mismo prefijo que `SolicitudesCompra_Historial`)
| Columna | Tipo | Notas |
|---|---|---|
| IdDocumento | int identity | PK |
| IdSolicitud | int | FK a solicitudes, cascade |
| TipoDocumento | nvarchar(30) | `Factura` / `Evidencia` / `Pago` |
| NombreOriginal | nvarchar(260) | nombre con el que se subió |
| RutaRelativa | nvarchar(400) | `Compras/{id}/Documentos/{Tipo}/{guid}{ext}` |
| TamanoBytes | bigint | |
| Estatus | int | 0 Pendiente, 1 Aprobado, 2 Rechazado |
| SubidoPor | int | usuario |
| FechaSubida | datetime2 | |
| RevisadoPor | int | null |
| FechaRevision | datetime2 | null |
| ComentarioRevision | nvarchar(500) | null; obligatorio al rechazar |
| AprobadoAutomaticamente | bit | true si lo subió un revisor |

Índice por `(IdSolicitud, TipoDocumento)`. Los archivos van en la carpeta de la requisición con nombre generado (no sobrescriben a otros ni usan el nombre original en disco). Borrar la requisición ya borra su carpeta completa.

## 6. API

Nuevo controlador `SolicitudesCompraDocumentosController` (`api/SolicitudesCompra/{idSolicitud}/documentos`) y servicio `IRequisicionDocumentosService`; no se modifica el controlador grande de compras salvo los puntos de integración de §6.2.

### 6.1 Endpoints y permisos
| Método y ruta | Quién | Qué hace |
|---|---|---|
| `GET /` | acceso al módulo | documentos + estado de cada tipo requerido + si aplica + si está completa + qué falta |
| `POST /` (multipart: `tipo`, `archivo`) | acceso al módulo | valida y guarda; aplica 4.4 y evalúa el cierre |
| `GET /{idDocumento}/descargar` | acceso al módulo | devuelve el archivo |
| `DELETE /{idDocumento}` | quien lo subió o un revisor | solo si no está Aprobado y la requisición no está cerrada |
| `POST /{idDocumento}/aprobar` | `compras.documentos.revisar` | aprueba y evalúa el cierre |
| `POST /{idDocumento}/rechazar` (`{ comentario }`) | `compras.documentos.revisar` | el comentario es obligatorio; avisa al que subió el documento y al solicitante |

**Acceso al módulo** = tener, por alguno de sus roles, la vista `administracion.tablero-compras` **o** `administracion.solicitudes-compra`. Para esto el filtro `[RequiereVista]` del proyecto A pasa a aceptar varias vistas (basta una).

Una requisición **cerrada** no admite subir, borrar, aprobar ni rechazar (409 con mensaje). Un documento Aprobado solo se puede borrar si un revisor lo rechaza antes.

Validaciones al subir: tipo conocido y requerido por esa requisición, extensión permitida para el tipo, tamaño ≤ 10 MB, archivo no vacío y, para PDF, que empiece con la firma `%PDF`. Errores: 400 con `mensaje` (dato inválido), 404 (no existe), 409 (cerrada / estado no permite), 403 (sin permiso), 401 (sin sesión).

### 6.2 Integración con lo existente
- `CambiarEstadoLiquidacionAsync` → evalúa el cierre al terminar.
- `ActualizarEstatusAsync` con estatus 8 → usa la regla 4.3 en lugar de la regla anterior.
- Registro de recepción → aplica 4.5.
- `ObtenerTodasAsync` (lista del tablero) → cada requisición incluye `documentacion`: `{ aplica, completa, requeridosCompletos, requeridosTotal, requeridos: [{ tipo, nombre, estado }] }`, calculada con **una sola consulta adicional** para toda la lista.
- Notificaciones: la existente solo recibe asunto (su cuerpo es una plantilla fija), así que el motivo del rechazo y el cierre viajan en el **asunto**: «Documento rechazado (Factura): {motivo}» y «Requisición cerrada: documentación completa y pago liquidado».
- Historial: se registra cada aprobación, rechazo y el cierre automático.

## 7. Front (Angular)

- **Detalle de la requisición** (`solicitud-detalle-dialog`): nuevo bloque «Documentación» con una fila por tipo requerido (estado, archivos con vista previa y descarga, botón «Subir»). Los revisores ven «Aprobar» y «Rechazar» (con campo de motivo) en los pendientes, según `PermisosEspecialesService.tiene('compras.documentos.revisar')`. Los archivos anteriores siguen en «Archivos Adjuntos» como anexos.
- **Tabla del tablero:** columna «Documentos» con chip («2/3») solo en etapa documental: **verde** si está completa, **ámbar** si falta algo y todavía no se paga, y **rojo** si ya está **liquidada** y falta documentación (es lo único que impide cerrarla, y es lo que contabilidad necesita ver primero). Un filtro nuevo «Pagadas sin documentación» las lista. Los filtros `pendiente_factura` y `pendiente_evidencia` usan el estado real de cada tipo; la columna «Soporte Evidencia» del Excel deja de inferirse por estatus.
- **Liquidar y anticipos:** el comprobante que hoy se sube al archivo plano pasa a subirse como documento de tipo `Pago`.
- **Lista «Solicitud de compras»:** el mismo bloque de documentación está disponible desde ahí para quienes no usan el tablero.
- Mensajes de error del API se muestran tal cual (todos traen `mensaje`).

## 8. Requisiciones existentes
Sin migración de datos. Las abiertas en etapa documental muestran «documentación pendiente» por simple cálculo; las cerradas no se tocan. Los archivos ya subidos se quedan como anexos y no se convierten en documentos.

## 9. Pruebas
- **Reglas puras:** requeridos por tipo (gasto, servicio, material, tipo desconocido, acentos y mayúsculas), tipo completo y documentación completa (casos con rechazados y pendientes), etapa documental (estatus 1 sin pago, 1 con anticipo, 1 liquidada, 3, 4, 5, 7, 8 y 11, y con y sin fecha de inicio), cierre (las tres condiciones por separado), estatus tras recepción (1, 4, 5, 6, 7, 8, 11) y validación de archivos (extensión, tamaño, vacío, firma PDF).
- **API con host de prueba** (servicio falso): permisos (sin sesión, sin acceso al módulo, con acceso, revisor), subida válida e inválida, rechazar sin comentario, borrar aprobado, requisición cerrada, y los códigos 400/403/404/409.
- **Front:** `tsc` y `ngc`, y pruebas de las funciones puras nuevas.
- No se podrá ejecutar contra base ni archivos reales; el servicio con base de datos se compila y se revisa.

## 10. Despliegue y riesgos
1. API: al reiniciar el contenedor se aplica la migración. Después, el front. El usuario 14/16 ya tienen el permiso de revisión por el proyecto A.
2. **Cambia el cierre manual:** deja de exigir recepción y factura en CONTPAQi. Es la decisión 7.
3. **Cambia el registro de recepción** (decisión 8): ya no regresa la requisición a «Aprobación».
4. **Volumen inicial de pendientes.** Con los datos de hoy entran **410** requisiciones como «documentación pendiente» (380 compras y 30 gastos). De ellas **288 ya están liquidadas**: son las que se verán en rojo y las primeras que contabilidad querrá completar; las otras 122 (9 con anticipo y 113 sin pago) aparecen en ámbar. Es consecuencia de la decisión 5. La «Fecha de inicio» de §3 permite acotarlo si hace falta. Cuando la documentación de esas 288 se complete y apruebe, se cerrarán solas.
5. Los archivos de requisiciones viven en `RutaArchivos` del servidor; las copias de seguridad deben incluir `Compras/{id}/Documentos`.
6. El árbol del API tiene cambios sin commit de otros módulos; `SolicitudesCompraService.cs`, `SolicitudesCompraController.cs`, `Program.cs` y `ApplicationDbContext.cs` ya los tienen. Al subir a `main` hay que separar lo de este proyecto.

## 11. Fuera de alcance
- XML (CFDI) y validación automática de la factura contra CONTPAQi.
- Reabrir requisiciones cerradas.
- Clasificar archivos antiguos como documentos.
- Reportes de cumplimiento documental.
