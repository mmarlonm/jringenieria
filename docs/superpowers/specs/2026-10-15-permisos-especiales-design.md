# Permisos especiales (Seguridad) — Diseño

Fecha: 2026-10-15 · Estado: para revisión (v2: asignación solo por usuario) · Proyecto A de 2 (el B, "Documentos de requisiciones", lo usa)

## 1. Objetivo

Un módulo en **Seguridad** donde se configure qué **usuarios** tienen **permisos especiales** (acciones sensibles que no caben en Ver / Agregar / Editar / Eliminar), válido para el módulo de Compras y para los que vengan después.

Primer caso de uso: solo Catalina Méndez (usuario 14) y Ana Laura Ramos (usuario 16) pueden **aprobar o rechazar los documentos** de las requisiciones.

### Situación actual
- Los permisos genéricos se asignan a **roles** (`RolPermiso`, con `VistaId`), y los roles a usuarios (`UsuarioRol`); el usuario hereda lo de su rol.
- Los permisos "especiales" de un módulo están escritos a mano en el front (p. ej. Documentación ISO usa los ID fijos 1002/1003 y etiquetas fijas en `rol-navigation.component.ts`).
- Esos permisos solo ocultan botones: hasta donde se revisó, **el API no los valida**. Para aprobar documentos eso no es suficiente.
- Los endpoints de Seguridad (`RolController`, etc.) tampoco validan rol en el servidor; solo el menú limita quién llega a la pantalla.

### Decisión de diseño: solo por usuario
Un permiso especial es una **excepción por persona**. Si se concediera a un rol, todos los usuarios de ese rol lo heredarían, y eso es justo lo que se quiere evitar. Por eso **no se asigna a roles**: solo a los usuarios que lo requieren. (Si algún día hiciera falta, se agrega una columna `RolId` a la tabla de asignaciones sin cambiar lo demás.)

### Fuera de alcance
- Asignar permisos especiales a roles (ver decisión arriba).
- Migrar los permisos existentes (Documentación ISO, secciones de proveedores): siguen como están.
- Reemplazar roles/vistas. Esto se suma a ellos.
- Crear permisos nuevos desde la pantalla (ver §3: un permiso sin código que lo aplique no sirve).
- Bitácora detallada de cambios (solo se guarda quién y cuándo asignó).
- Permisos temporales o con vencimiento.

## 2. Conceptos

- **Permiso especial**: código estable `modulo.recurso.accion` (minúsculas, con puntos), nombre, descripción, módulo y activo/inactivo.
- **Asignación**: un permiso concedido a un **usuario**.
- **Tiene el permiso** = el usuario está activo (`Usuario.Activo`), el permiso está activo y existe la asignación.

## 3. El código declara, la pantalla asigna

Cada módulo declara sus permisos en una lista del API (`PermisosEspecialesCatalogo`). Cada entrada: `Codigo`, `Nombre`, `Descripcion`, `Modulo` y, opcionalmente, `UsuariosIniciales`.

Al arrancar (después de `Database.Migrate()`, [Program.cs:299](../../../../jr_api/jr_api/Program.cs#L299)), una sincronización:
- **inserta** los permisos declarados que no existan, con su nombre y descripción;
- si el permiso se acaba de crear y declara `UsuariosIniciales`, crea esas asignaciones (solo los usuarios que existan); **solo ocurre en el alta**, así que lo que se quite después en la pantalla no se vuelve a poner;
- **nunca borra** permisos ni pisa el nombre, descripción o estado editados en la pantalla.

Un módulo futuro solo agrega una línea al catálogo; aparece solo en la pantalla.

**Primer permiso declarado**
| Código | Nombre | Módulo | Usuarios iniciales |
|---|---|---|---|
| `compras.documentos.revisar` | Revisar documentos de requisiciones | Compras | 14, 16 |

## 4. Datos (migración EF Core)

**`PermisosEspeciales`**
| Columna | Tipo | Notas |
|---|---|---|
| Id | int identity | PK |
| Codigo | nvarchar(150) | único |
| Nombre | nvarchar(200) | |
| Descripcion | nvarchar(500) | null |
| Modulo | nvarchar(100) | |
| Activo | bit | default 1 |
| FechaCreacion | datetime2 | |

**`PermisosEspecialesAsignaciones`**
| Columna | Tipo | Notas |
|---|---|---|
| Id | int identity | PK |
| PermisoEspecialId | int | FK, cascade |
| UsuarioId | int | FK a usuarios |
| AsignadoPor | int | null |
| FechaAsignacion | datetime2 | |

- Índice único `(PermisoEspecialId, UsuarioId)`: un usuario no puede tener dos veces el mismo permiso.
- La migración se genera sobre el snapshot actual del proyecto (ya incluye las migraciones pendientes de Finanzas, Horas trabajadas y Salidas de almacén).

## 5. API

### Servicio `IPermisosEspecialesService`
- `UsuarioTieneAsync(usuarioId, codigo)` y `CodigosDeUsuarioAsync(usuarioId)`.
- La **regla** (usuario activo + permiso activo + asignación) es una función pura, separada de la consulta a la base. Así se prueba sin base de datos.
- Caché en memoria por usuario, **60 s**; cualquier cambio hecho desde la pantalla invalida todo el caché al instante. Una revocación hecha desde otra instancia tardaría hasta 60 s.

### Atributo de validación
`[RequierePermisoEspecial("compras.documentos.revisar")]` (filtro de autorización):
- sin sesión → **401**;
- sin el permiso → **403** con `{ "mensaje": "No tienes el permiso especial «Revisar documentos de requisiciones»." }`;
- código no declarado o desactivado → **403** (se niega por defecto) y se registra en el log.

El usuario sale del claim `NameIdentifier` del token (ya existe, [AuthController.cs](../../../../jr_api/jr_api/Controllers/AuthController.cs)).

### Acceso de administración
Atributo `[RequiereVista("apps.permisos-especiales")]`: el usuario debe tener, por **alguno de sus roles**, la vista cuyo `NombreVista` sea `apps.permisos-especiales` (`UsuarioRol` → `RolVista` → `Vista`). Es el mismo mecanismo con el que hoy se habilita el menú, ahora también validado en el servidor. Quien ya administra Seguridad por rol, administra esto asignando esa vista en la pantalla de roles.

### `PermisosEspecialesController` (`api/PermisosEspeciales`)
| Método y ruta | Quién | Qué hace |
|---|---|---|
| `GET mis-permisos` | cualquier usuario con sesión | códigos que tiene el usuario actual |
| `GET catalogo` | administración | permisos agrupados por módulo, con número de usuarios asignados |
| `PUT {id}` | administración | edita nombre, descripción y activo |
| `GET {id}/asignaciones` | administración | usuarios que lo tienen |
| `POST {id}/asignaciones` | administración | body `{ usuarioId }` |
| `DELETE asignaciones/{asignacionId}` | administración | quita la asignación |
| `GET usuario/{usuarioId}` | administración | permisos que tiene ese usuario |

Errores con `{ "mensaje": ... }`: permiso o usuario inexistente → 404; ya asignado → 409.

## 6. Front (Angular)

- Menú: un ítem en `defaultNavigation`, dentro de Seguridad, `id: 'apps.permisos-especiales'`, título «Permisos especiales», ruta `/security/permisos-especiales` (carga diferida, como `users` y `roles`). Es el único menú que lista Seguridad.
- Pantalla con dos pestañas:
  1. **Por permiso**: lista de permisos agrupada por módulo con buscador. Al elegir uno: nombre, descripción y estado editables, y la lista de usuarios asignados (con botón de quitar) más un selector con búsqueda para agregar (`UsersService.getUsers()`).
  2. **Por usuario**: se elige un usuario y se ven los permisos especiales que tiene.
- `PermisosEspecialesService` (`providedIn: 'root'`): carga `mis-permisos` al iniciar la aplicación y tras el login, y expone `tiene(codigo): boolean`. Los módulos lo usan así: `*ngIf="permisosEspeciales.tiene('compras.documentos.revisar')"`.
- El front **solo oculta** botones; la validación real es la del servidor. Un cambio de permisos se refleja al recargar la página.

## 7. Casos borde
- Usuario inactivo → sin permisos. Permiso inactivo → nadie lo tiene.
- Cambiar a un usuario de rol no afecta sus permisos especiales: son suyos, no del rol.
- Se asigna y se quita siempre persona por persona, así que quedan a la vista quiénes tienen cada permiso.

## 8. Pruebas
- **Regla de permiso** (función pura): con asignación, sin asignación, usuario inactivo, permiso inactivo.
- **Sincronización del catálogo** (parte pura: diferencia entre lo declarado y lo existente): alta, ya existente, nombre editado que no se pisa, usuarios iniciales que no existen.
- **Atributos** con un host mínimo de ASP.NET (como se hizo con la validación del envío masivo): 401, 403 y 200 de `RequierePermisoEspecial` y `RequiereVista`.
- **Front**: `tsc` y `ngc` sin errores. La pantalla no se podrá ver renderizada con datos reales desde aquí.

## 9. Despliegue
1. API: al reiniciar el contenedor se aplica la migración y corre la sincronización (queda `compras.documentos.revisar` asignado a 14 y 16).
2. Front: desplegar.
3. En Seguridad → Roles, asignar la vista «Permisos especiales» al rol que administra Seguridad. Hasta entonces nadie ve ni usa la pantalla (los permisos asignados a 14 y 16 ya funcionan).

## 10. Riesgos
- El árbol de trabajo del API tiene cambios sin commit de otros módulos. La migración nueva debe generarse y revisarse sobre el snapshot actual, y al subir a `main` hay que incluir solo los archivos de este proyecto.
- El caché de 60 s retrasa una revocación hecha desde otra instancia del API.
