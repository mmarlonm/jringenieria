# Permisos especiales (Seguridad) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que los usuarios que lo necesitan tengan permisos especiales configurables desde Seguridad, validados en el servidor, empezando por `compras.documentos.revisar` para los usuarios 14 y 16.

**Architecture:** El API declara los permisos en código (`PermisosEspecialesCatalogo`) y los sincroniza a dos tablas nuevas al arrancar; un servicio con caché de 60 s calcula qué códigos tiene cada usuario; dos filtros de autorización (`RequierePermisoEspecial`, `RequiereVista`) los exigen en los endpoints; el front consulta `mis-permisos` para ocultar botones y ofrece una pantalla en Seguridad para asignar usuarios.

**Tech Stack:** .NET 8 / ASP.NET Core / EF Core 8 (SQL Server) en `g:\dev\jr\jr_api\jr_api`; Angular standalone + Tailwind + Material + SweetAlert2 en `g:\dev\jr\jringenieria`.

**Spec:** `docs/superpowers/specs/2026-10-15-permisos-especiales-design.md` (en `jringenieria`).

## Global Constraints

- Código de permiso: formato `modulo.recurso.accion`, minúsculas, con puntos. Primer permiso: `compras.documentos.revisar`, nombre «Revisar documentos de requisiciones», módulo «Compras», usuarios iniciales 14 y 16.
- Los permisos especiales se asignan **solo a usuarios** (nunca a roles).
- Tiene el permiso = `Usuario.Activo` + `PermisoEspecial.Activo` + asignación.
- Tablas: `PermisosEspeciales` y `PermisosEspecialesAsignaciones`; índices únicos `Codigo` y `(PermisoEspecialId, UsuarioId)`.
- Caché por usuario de **60 s**; cualquier cambio desde la pantalla la invalida entera.
- Administración: vista con `NombreVista = "apps.permisos-especiales"` (menú Seguridad, ruta `/security/permisos-especiales`), validada también en el servidor.
- Respuestas de error del API: `{ "mensaje": "..." }` en español. Sin sesión → 401; sin permiso o sin acceso → 403; inexistente → 404; duplicado → 409; dato inválido → 400.
- La sincronización de arranque **nunca** debe impedir que el API arranque, nunca borra y nunca pisa nombre, descripción ni estado editados; las asignaciones iniciales solo se crean en el alta del permiso.
- No se hace commit ni push salvo que el usuario lo pida; al hacerlo, incluir **solo** los archivos de este plan (el árbol del API trae trabajo ajeno sin commit).

## Review Focus

- Token sin id de usuario válido, o sin token → debe responder 401 con `mensaje`, no 500. (Task 3)
- Código exigido que no existe, está desactivado o no está declarado → 403 (se niega por defecto), no 200. (Task 3)
- Asignar dos veces el mismo permiso al mismo usuario → 409 con `mensaje`, no 500 por el índice único. (Task 3, Task 4)
- Usuario inactivo con asignaciones, o permiso desactivado → sin permisos. (Task 2)
- Usuario inicial que no existe en esa base (ids 14 y 16 en otro ambiente) o error al sincronizar → el API arranca igual y no se rompe la llave foránea. (Task 3, Task 4)
- Quitar una asignación que ya no existe → 404, no 500. (Task 3, Task 4)

## Archivos

**API (`g:\dev\jr\jr_api\jr_api`)**
- Create `Models/PermisoEspecial.cs` — entidades `PermisoEspecial` y `PermisoEspecialAsignacion`.
- Modify `Data/ApplicationDbContext.cs` — DbSets y configuración fluida.
- Create `Migrations/<timestamp>_AddPermisosEspeciales.cs` + `.Designer.cs`; Modify `Migrations/ApplicationDbContextModelSnapshot.cs` (los genera `dotnet ef`).
- Create `Services/PermisosEspeciales/PermisosEspecialesRegla.cs` — regla pura de permiso efectivo.
- Create `Services/PermisosEspeciales/PermisosEspecialesCatalogo.cs` — declaración de permisos + cálculo puro de altas.
- Create `DTOs/PermisosEspecialesDtos.cs` — DTOs del API.
- Create `Services/PermisosEspeciales/IPermisosEspecialesService.cs` y `PermisosEspecialesService.cs`.
- Create `Services/PermisosEspeciales/PermisosEspecialesSincronizador.cs` — sincronización de arranque.
- Create `Seguridad/UsuarioActual.cs`, `Seguridad/RequierePermisoEspecialAttribute.cs`, `Seguridad/RequiereVistaAttribute.cs`.
- Create `Controllers/PermisosEspecialesController.cs`.
- Modify `Program.cs` — registro de servicios y sincronización tras `Migrate()`.

**Front (`g:\dev\jr\jringenieria`)**
- Create `src/app/core/permisos-especiales/permisos-especiales.types.ts`, `permisos-especiales.utils.ts`, `permisos-especiales.service.ts`.
- Create `src/app/modules/admin/security/permisos-especiales/permisos-especiales.routes.ts`, `permisos-especiales.component.ts`, `permisos-especiales.component.html`.
- Modify `src/app/app.routes.ts`, `src/app/mock-api/common/navigation/data.ts`, `src/app/layout/layout.component.ts`.

**Pruebas (fuera del repo):** `C:\Users\chiva\AppData\Local\Temp\claude\g--dev-jr\52264600-d116-42b0-b0d2-a38f611e9a51\scratchpad\pe_test\` — proyecto web que compila los archivos reales del API por `<Compile Include>` (no se copian) y los prueba. El repo no tiene proyecto de pruebas y no se crea uno.

---

### Task 1: Entidades, configuración y migración

**Files:**
- Create: `Models/PermisoEspecial.cs`
- Modify: `Data/ApplicationDbContext.cs` (DbSets junto a `Vistas`/`RolVistas`, línea ~38; configuración dentro de `OnModelCreating`, tras `base.OnModelCreating(modelBuilder);`)
- Create (generados): `Migrations/*_AddPermisosEspeciales.cs`, `.Designer.cs`; Modify: `Migrations/ApplicationDbContextModelSnapshot.cs`

**Interfaces:**
- Produces: `PermisoEspecial { int Id; string Codigo; string Nombre; string? Descripcion; string Modulo; bool Activo; DateTime FechaCreacion; ICollection<PermisoEspecialAsignacion> Asignaciones }`, `PermisoEspecialAsignacion { int Id; int PermisoEspecialId; PermisoEspecial Permiso; int UsuarioId; Usuario Usuario; int? AsignadoPor; DateTime FechaAsignacion }`, `DbSet<PermisoEspecial> PermisosEspeciales`, `DbSet<PermisoEspecialAsignacion> PermisosEspecialesAsignaciones`.

- [ ] **Step 1: Crear las entidades**

```csharp
// Models/PermisoEspecial.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace jr_api.Models
{
    /// <summary>Acción sensible que solo ciertos usuarios pueden realizar. Se declara en PermisosEspecialesCatalogo.</summary>
    public class PermisoEspecial
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(150)]
        public string Codigo { get; set; } = string.Empty;

        [Required, MaxLength(200)]
        public string Nombre { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Descripcion { get; set; }

        [Required, MaxLength(100)]
        public string Modulo { get; set; } = string.Empty;

        public bool Activo { get; set; } = true;

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        public ICollection<PermisoEspecialAsignacion> Asignaciones { get; set; } = new List<PermisoEspecialAsignacion>();
    }

    /// <summary>Un permiso especial concedido a un usuario.</summary>
    public class PermisoEspecialAsignacion
    {
        [Key]
        public int Id { get; set; }

        public int PermisoEspecialId { get; set; }

        [ForeignKey(nameof(PermisoEspecialId))]
        public PermisoEspecial Permiso { get; set; } = null!;

        public int UsuarioId { get; set; }

        [ForeignKey(nameof(UsuarioId))]
        public Usuario Usuario { get; set; } = null!;

        public int? AsignadoPor { get; set; }

        public DateTime FechaAsignacion { get; set; } = DateTime.UtcNow;
    }
}
```

- [ ] **Step 2: Registrar DbSets y configurar índices y relaciones**

En `Data/ApplicationDbContext.cs`, después de `public DbSet<RolVista> RolVistas { get; set; }`:

```csharp
    public DbSet<PermisoEspecial> PermisosEspeciales { get; set; }
    public DbSet<PermisoEspecialAsignacion> PermisosEspecialesAsignaciones { get; set; }
```

Dentro de `OnModelCreating`, justo después de `base.OnModelCreating(modelBuilder);`:

```csharp
        // Permisos especiales: código único; un usuario no puede tener dos veces el mismo permiso
        modelBuilder.Entity<PermisoEspecial>(e =>
        {
            e.ToTable("PermisosEspeciales");
            e.HasIndex(p => p.Codigo).IsUnique().HasDatabaseName("IX_PermisosEspeciales_Codigo");
        });

        modelBuilder.Entity<PermisoEspecialAsignacion>(e =>
        {
            e.ToTable("PermisosEspecialesAsignaciones");
            e.HasIndex(a => new { a.PermisoEspecialId, a.UsuarioId })
                .IsUnique()
                .HasDatabaseName("IX_PermisosEspecialesAsignaciones_Permiso_Usuario");
            e.HasOne(a => a.Permiso).WithMany(p => p.Asignaciones)
                .HasForeignKey(a => a.PermisoEspecialId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(a => a.Usuario).WithMany()
                .HasForeignKey(a => a.UsuarioId).OnDelete(DeleteBehavior.Cascade);
        });
```

- [ ] **Step 3: Compilar**

Run: `cd g:/dev/jr/jr_api/jr_api && dotnet build jr_api.csproj --nologo -v q`
Expected: `Compilación correcta.` y `0 Errores`.

- [ ] **Step 4: Generar la migración y revisar que solo traiga las dos tablas**

Run: `dotnet ef migrations add AddPermisosEspeciales --project jr_api.csproj --context ApplicationDbContext --no-build`
(si pide compilar, quitar `--no-build`). Antes de este paso, `has-pending-model-changes` dio «No changes have been made to the model since the last migration».

Abrir `Migrations/*_AddPermisosEspeciales.cs`. **Expected:** `Up` contiene únicamente `CreateTable` de `PermisosEspeciales` y de `PermisosEspecialesAsignaciones` (con sus llaves, FK con cascade) y `CreateIndex` de `IX_PermisosEspeciales_Codigo`, `IX_PermisosEspecialesAsignaciones_Permiso_Usuario` y el índice de `UsuarioId`; `Down` hace `DropTable` de ambas. **Si aparece cualquier otra operación, detenerse**: significa que el árbol trae cambios de modelo ajenos; quitarlos de la migración y no continuar sin revisarlo.

- [ ] **Step 5: Confirmar que el modelo y la migración quedaron sincronizados**

Run: `dotnet ef migrations has-pending-model-changes --project jr_api.csproj --context ApplicationDbContext --no-build 2>&1 | tail -2`
Expected: `No changes have been made to the model since the last migration.`

---

### Task 2: Regla pura y catálogo (con pruebas)

**Files:**
- Create: `Services/PermisosEspeciales/PermisosEspecialesRegla.cs`, `Services/PermisosEspeciales/PermisosEspecialesCatalogo.cs`
- Test: `pe_test/` (fuera del repo)

**Interfaces:**
- Produces: `record PermisoAsignadoInfo(string Codigo, bool PermisoActivo)`; `PermisosEspecialesRegla.CodigosEfectivos(bool usuarioActivo, IEnumerable<PermisoAsignadoInfo> asignados) : IReadOnlyList<string>`; `record PermisoEspecialDefinicion(string Codigo, string Nombre, string Descripcion, string Modulo, int[]? UsuariosIniciales = null)`; `PermisosEspecialesCatalogo.Todos`, `.ComprasDocumentosRevisar`, `.EstaDeclarado(string)`, `.CalcularAltas(IEnumerable<PermisoEspecialDefinicion>, IEnumerable<string>) : IReadOnlyList<PermisoEspecialDefinicion>`.

- [ ] **Step 1: Crear el proyecto de pruebas (fuera del repo) con las pruebas que deben fallar**

`pe_test/pe_test.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <UseAppHost>false</UseAppHost>
  </PropertyGroup>
  <ItemGroup>
    <Compile Include="g:\dev\jr\jr_api\jr_api\Services\PermisosEspeciales\PermisosEspecialesRegla.cs" Link="PermisosEspecialesRegla.cs" />
    <Compile Include="g:\dev\jr\jr_api\jr_api\Services\PermisosEspeciales\PermisosEspecialesCatalogo.cs" Link="PermisosEspecialesCatalogo.cs" />
  </ItemGroup>
</Project>
```

`pe_test/Program.cs` (se amplía en las tareas 3 y 4):

```csharp
using jr_api.Services.PermisosEspeciales;

int fallos = 0;
void Check(string titulo, bool ok, string detalle = "")
{
    Console.WriteLine($"{(ok ? "OK   " : "FALLA")} {titulo}{(detalle.Length > 0 ? "  -> " + detalle : "")}");
    if (!ok) fallos++;
}

// ---- Regla de permiso efectivo
var asig = new[] { new PermisoAsignadoInfo("compras.documentos.revisar", true), new PermisoAsignadoInfo("otro.recurso.accion", false) };
Check("usuario activo + permiso activo -> lo tiene", PermisosEspecialesRegla.CodigosEfectivos(true, asig).SequenceEqual(new[] { "compras.documentos.revisar" }));
Check("permiso inactivo -> no lo tiene", !PermisosEspecialesRegla.CodigosEfectivos(true, asig).Contains("otro.recurso.accion"));
Check("usuario inactivo -> ninguno", PermisosEspecialesRegla.CodigosEfectivos(false, asig).Count == 0);
Check("sin asignaciones -> ninguno", PermisosEspecialesRegla.CodigosEfectivos(true, Array.Empty<PermisoAsignadoInfo>()).Count == 0);
Check("duplicados y mayúsculas -> una sola vez", PermisosEspecialesRegla.CodigosEfectivos(true,
    new[] { new PermisoAsignadoInfo("A.b.c", true), new PermisoAsignadoInfo("a.b.c", true) }).Count == 1);

// ---- Catálogo
var todos = PermisosEspecialesCatalogo.Todos;
Check("catálogo: códigos únicos", todos.Select(d => d.Codigo.ToLowerInvariant()).Distinct().Count() == todos.Count);
Check("catálogo: formato modulo.recurso.accion en minúsculas",
    todos.All(d => System.Text.RegularExpressions.Regex.IsMatch(d.Codigo, @"^[a-z0-9]+(\.[a-z0-9-]+){2}$")));
var rev = todos.Single(d => d.Codigo == PermisosEspecialesCatalogo.ComprasDocumentosRevisar);
Check("compras.documentos.revisar declarado para 14 y 16", rev.UsuariosIniciales!.OrderBy(x => x).SequenceEqual(new[] { 14, 16 }) && rev.Modulo == "Compras");
Check("EstaDeclarado ignora mayúsculas", PermisosEspecialesCatalogo.EstaDeclarado("COMPRAS.documentos.REVISAR") && !PermisosEspecialesCatalogo.EstaDeclarado("no.existe.nunca"));
Check("altas: BD vacía -> todos", PermisosEspecialesCatalogo.CalcularAltas(todos, Array.Empty<string>()).Count == todos.Count);
Check("altas: ya existe (otra capitalización) -> ninguna", PermisosEspecialesCatalogo.CalcularAltas(todos, new[] { "COMPRAS.DOCUMENTOS.REVISAR" }).Count == 0);

Console.WriteLine(fallos == 0 ? "\nTODAS LAS PRUEBAS PASARON" : $"\n{fallos} PRUEBA(S) FALLARON");
return fallos;
```

- [ ] **Step 2: Ejecutar y confirmar que no compila (los archivos aún no existen)**

Run (PowerShell): `cd <pe_test>; dotnet build -c Release --nologo -v q 2>&1 | Select-String 'error' | Select-Object -First 3`
Expected: error por archivos inexistentes / tipos no definidos.

- [ ] **Step 3: Implementar la regla y el catálogo**

```csharp
// Services/PermisosEspeciales/PermisosEspecialesRegla.cs
namespace jr_api.Services.PermisosEspeciales
{
    /// <summary>Un permiso asignado a un usuario, tal como sale de la base.</summary>
    public record PermisoAsignadoInfo(string Codigo, bool PermisoActivo);

    public static class PermisosEspecialesRegla
    {
        /// <summary>
        /// Códigos que el usuario puede usar: el usuario debe estar activo, el permiso activo y estar asignado.
        /// Función pura (sin base de datos) para poder probarla.
        /// </summary>
        public static IReadOnlyList<string> CodigosEfectivos(bool usuarioActivo, IEnumerable<PermisoAsignadoInfo> asignados)
        {
            if (!usuarioActivo) return Array.Empty<string>();

            return asignados
                .Where(a => a.PermisoActivo)
                .Select(a => a.Codigo.ToLowerInvariant())
                .Distinct()
                .OrderBy(c => c, StringComparer.Ordinal)
                .ToList();
        }
    }
}
```

```csharp
// Services/PermisosEspeciales/PermisosEspecialesCatalogo.cs
namespace jr_api.Services.PermisosEspeciales
{
    public record PermisoEspecialDefinicion(
        string Codigo, string Nombre, string Descripcion, string Modulo, int[]? UsuariosIniciales = null);

    /// <summary>
    /// Permisos especiales que existen en el sistema. Un módulo nuevo agrega aquí una línea; la pantalla de
    /// Seguridad lo muestra solo y permite asignarlo a usuarios. Un permiso sin código que lo exija no sirve,
    /// por eso no se crean desde la pantalla.
    /// </summary>
    public static class PermisosEspecialesCatalogo
    {
        public const string ComprasDocumentosRevisar = "compras.documentos.revisar";

        public static readonly IReadOnlyList<PermisoEspecialDefinicion> Todos = new List<PermisoEspecialDefinicion>
        {
            new(ComprasDocumentosRevisar,
                "Revisar documentos de requisiciones",
                "Aprobar o rechazar las facturas, evidencias y comprobantes de pago que se cargan en las requisiciones de compra.",
                "Compras",
                new[] { 14, 16 })
        };

        public static bool EstaDeclarado(string codigo) =>
            Todos.Any(d => string.Equals(d.Codigo, codigo, StringComparison.OrdinalIgnoreCase));

        /// <summary>Definiciones declaradas que todavía no existen en la base (sin distinguir mayúsculas).</summary>
        public static IReadOnlyList<PermisoEspecialDefinicion> CalcularAltas(
            IEnumerable<PermisoEspecialDefinicion> declaradas, IEnumerable<string> codigosExistentes)
        {
            var existentes = new HashSet<string>(codigosExistentes, StringComparer.OrdinalIgnoreCase);
            return declaradas.Where(d => !existentes.Contains(d.Codigo)).ToList();
        }
    }
}
```

- [ ] **Step 4: Ejecutar las pruebas y confirmar que pasan**

Run (PowerShell): `cd <pe_test>; dotnet build -c Release --nologo -v q; dotnet bin\Release\net8.0\pe_test.dll`
Expected: todas las líneas `OK` y `TODAS LAS PRUEBAS PASARON`.

---

### Task 3: Servicio, sincronizador y filtros de autorización (con pruebas)

**Files:**
- Create: `DTOs/PermisosEspecialesDtos.cs`, `Services/PermisosEspeciales/IPermisosEspecialesService.cs`, `Services/PermisosEspeciales/PermisosEspecialesService.cs`, `Services/PermisosEspeciales/PermisosEspecialesSincronizador.cs`, `Seguridad/UsuarioActual.cs`, `Seguridad/RequierePermisoEspecialAttribute.cs`, `Seguridad/RequiereVistaAttribute.cs`
- Test: `pe_test/Program.cs`

**Interfaces:**
- Consumes (Task 1/2): `PermisoEspecial`, `PermisoEspecialAsignacion`, `ApplicationDbContext.PermisosEspeciales/PermisosEspecialesAsignaciones/Usuarios/RolVistas/UsuarioRoles`, `PermisoAsignadoInfo`, `PermisosEspecialesRegla`, `PermisosEspecialesCatalogo`.
- Produces: DTOs `PermisoEspecialResumenDto`, `ActualizarPermisoEspecialDto`, `AsignarPermisoEspecialDto`, `AsignacionDto`, `PermisoDeUsuarioDto` (namespace `jr_api.DTOs.PermisosEspeciales`); `IPermisosEspecialesService` (namespace `jr_api.Services.PermisosEspeciales`); `UsuarioActual.TryObtenerId(ClaimsPrincipal, out int)`; `[RequierePermisoEspecial(string codigo)]`, `[RequiereVista(string nombreVista)]` (namespace `jr_api.Seguridad`); `PermisosEspecialesSincronizador.SincronizarAsync(ApplicationDbContext)`.

- [ ] **Step 1: DTOs e interfaz del servicio**

```csharp
// DTOs/PermisosEspecialesDtos.cs
namespace jr_api.DTOs.PermisosEspeciales
{
    public class PermisoEspecialResumenDto
    {
        public int Id { get; set; }
        public string Codigo { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public string Modulo { get; set; } = string.Empty;
        public bool Activo { get; set; }
        public int TotalAsignados { get; set; }
    }

    public class ActualizarPermisoEspecialDto
    {
        public string? Nombre { get; set; }
        public string? Descripcion { get; set; }
        public bool Activo { get; set; }
    }

    public class AsignarPermisoEspecialDto
    {
        public int UsuarioId { get; set; }
    }

    public class AsignacionDto
    {
        public int AsignacionId { get; set; }
        public int UsuarioId { get; set; }
        public string NombreUsuario { get; set; } = string.Empty;
        public string? Email { get; set; }
        public DateTime FechaAsignacion { get; set; }
        public int? AsignadoPor { get; set; }
    }

    public class PermisoDeUsuarioDto
    {
        public int AsignacionId { get; set; }
        public int PermisoId { get; set; }
        public string Codigo { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public string Modulo { get; set; } = string.Empty;
        public bool Activo { get; set; }
    }
}
```

```csharp
// Services/PermisosEspeciales/IPermisosEspecialesService.cs
using jr_api.DTOs.PermisosEspeciales;

namespace jr_api.Services.PermisosEspeciales
{
    public interface IPermisosEspecialesService
    {
        // Consulta de permisos (la usan los filtros y /mis-permisos)
        Task<bool> UsuarioTieneAsync(int usuarioId, string codigo);
        Task<IReadOnlyList<string>> CodigosDeUsuarioAsync(int usuarioId);
        Task<string?> NombreDePermisoAsync(string codigo);
        Task<bool> UsuarioTieneVistaAsync(int usuarioId, string nombreVista);

        // Administración. KeyNotFoundException = no existe; InvalidOperationException = duplicado; ArgumentException = dato inválido.
        Task<IReadOnlyList<PermisoEspecialResumenDto>> CatalogoAsync();
        Task<PermisoEspecialResumenDto> ActualizarAsync(int id, ActualizarPermisoEspecialDto dto);
        Task<IReadOnlyList<AsignacionDto>> AsignacionesAsync(int permisoId);
        Task<AsignacionDto> AsignarAsync(int permisoId, int usuarioId, int? asignadoPor);
        Task QuitarAsync(int asignacionId);
        Task<IReadOnlyList<PermisoDeUsuarioDto>> PermisosDeUsuarioAsync(int usuarioId);
    }
}
```

- [ ] **Step 2: Identidad del usuario y filtros de autorización**

```csharp
// Seguridad/UsuarioActual.cs
using System.Security.Claims;

namespace jr_api.Seguridad
{
    public static class UsuarioActual
    {
        /// <summary>Id del usuario del token (claim NameIdentifier o sub). false si no hay sesión o el id no es válido.</summary>
        public static bool TryObtenerId(ClaimsPrincipal? user, out int usuarioId)
        {
            usuarioId = 0;
            var valor = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? user?.FindFirst("sub")?.Value;
            return int.TryParse(valor, out usuarioId) && usuarioId > 0;
        }
    }
}
```

```csharp
// Seguridad/RequierePermisoEspecialAttribute.cs
using jr_api.Services.PermisosEspeciales;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace jr_api.Seguridad
{
    /// <summary>Exige que el usuario tenga el permiso especial indicado. Sin sesión: 401. Sin permiso: 403.</summary>
    public class RequierePermisoEspecialAttribute : TypeFilterAttribute
    {
        public RequierePermisoEspecialAttribute(string codigo) : base(typeof(RequierePermisoEspecialFilter))
        {
            Arguments = new object[] { codigo };
        }
    }

    public class RequierePermisoEspecialFilter : IAsyncAuthorizationFilter
    {
        private readonly string _codigo;
        private readonly IPermisosEspecialesService _servicio;
        private readonly ILogger<RequierePermisoEspecialFilter> _log;

        public RequierePermisoEspecialFilter(string codigo, IPermisosEspecialesService servicio, ILogger<RequierePermisoEspecialFilter> log)
        {
            _codigo = codigo;
            _servicio = servicio;
            _log = log;
        }

        public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
            if (!UsuarioActual.TryObtenerId(context.HttpContext.User, out var usuarioId))
            {
                context.Result = new UnauthorizedObjectResult(new { mensaje = "Inicia sesión para continuar." });
                return;
            }

            if (!PermisosEspecialesCatalogo.EstaDeclarado(_codigo))
                _log.LogWarning("Se exige el permiso especial '{Codigo}', pero no está declarado en PermisosEspecialesCatalogo.", _codigo);

            if (await _servicio.UsuarioTieneAsync(usuarioId, _codigo)) return;

            var nombre = await _servicio.NombreDePermisoAsync(_codigo) ?? _codigo;
            context.Result = new ObjectResult(new { mensaje = $"No tienes el permiso especial «{nombre}»." })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
        }
    }
}
```

```csharp
// Seguridad/RequiereVistaAttribute.cs
using jr_api.Services.PermisosEspeciales;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace jr_api.Seguridad
{
    /// <summary>
    /// Exige que el usuario tenga, por alguno de sus roles, la vista indicada (el mismo mecanismo que habilita el menú).
    /// Sin sesión: 401. Sin la vista: 403.
    /// </summary>
    public class RequiereVistaAttribute : TypeFilterAttribute
    {
        public RequiereVistaAttribute(string nombreVista) : base(typeof(RequiereVistaFilter))
        {
            Arguments = new object[] { nombreVista };
        }
    }

    public class RequiereVistaFilter : IAsyncAuthorizationFilter
    {
        private readonly string _nombreVista;
        private readonly IPermisosEspecialesService _servicio;

        public RequiereVistaFilter(string nombreVista, IPermisosEspecialesService servicio)
        {
            _nombreVista = nombreVista;
            _servicio = servicio;
        }

        public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
            if (!UsuarioActual.TryObtenerId(context.HttpContext.User, out var usuarioId))
            {
                context.Result = new UnauthorizedObjectResult(new { mensaje = "Inicia sesión para continuar." });
                return;
            }

            if (await _servicio.UsuarioTieneVistaAsync(usuarioId, _nombreVista)) return;

            context.Result = new ObjectResult(new { mensaje = "No tienes acceso a esta sección." })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
        }
    }
}
```

- [ ] **Step 3: Servicio con base de datos y caché**

```csharp
// Services/PermisosEspeciales/PermisosEspecialesService.cs
using jr_api.DTOs.PermisosEspeciales;
using jr_api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Primitives;

namespace jr_api.Services.PermisosEspeciales
{
    public class PermisosEspecialesService : IPermisosEspecialesService
    {
        private static CancellationTokenSource _reinicioCache = new();
        private static readonly TimeSpan Vigencia = TimeSpan.FromSeconds(60);

        private readonly ApplicationDbContext _context;
        private readonly IMemoryCache _cache;

        public PermisosEspecialesService(ApplicationDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        /// <summary>Invalida el caché de todos los usuarios (se llama tras cualquier cambio hecho desde la pantalla).</summary>
        private static void InvalidarCache()
        {
            var anterior = Interlocked.Exchange(ref _reinicioCache, new CancellationTokenSource());
            anterior.Cancel();
            anterior.Dispose();
        }

        // ------------------------------------------------------------------ consulta

        public async Task<IReadOnlyList<string>> CodigosDeUsuarioAsync(int usuarioId)
        {
            var clave = $"permisos-especiales:{usuarioId}";
            if (_cache.TryGetValue(clave, out IReadOnlyList<string>? enCache) && enCache != null) return enCache;

            var activo = await _context.Usuarios
                .Where(u => u.UsuarioId == usuarioId)
                .Select(u => (bool?)u.Activo)
                .FirstOrDefaultAsync();

            var asignados = await _context.PermisosEspecialesAsignaciones
                .Where(a => a.UsuarioId == usuarioId)
                .Select(a => new PermisoAsignadoInfo(a.Permiso.Codigo, a.Permiso.Activo))
                .ToListAsync();

            var codigos = PermisosEspecialesRegla.CodigosEfectivos(activo == true, asignados);

            _cache.Set(clave, codigos, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = Vigencia }
                .AddExpirationToken(new CancellationChangeToken(_reinicioCache.Token)));

            return codigos;
        }

        public async Task<bool> UsuarioTieneAsync(int usuarioId, string codigo) =>
            (await CodigosDeUsuarioAsync(usuarioId)).Contains(codigo, StringComparer.OrdinalIgnoreCase);

        public async Task<string?> NombreDePermisoAsync(string codigo)
        {
            var normalizado = codigo.ToLower();
            return await _context.PermisosEspeciales
                .Where(p => p.Codigo.ToLower() == normalizado)
                .Select(p => p.Nombre)
                .FirstOrDefaultAsync();
        }

        public async Task<bool> UsuarioTieneVistaAsync(int usuarioId, string nombreVista) =>
            await _context.Usuarios.AnyAsync(u => u.UsuarioId == usuarioId && u.Activo)
            && await _context.RolVistas.AnyAsync(rv =>
                rv.Vista.NombreVista == nombreVista &&
                _context.UsuarioRoles.Any(ur => ur.UsuarioId == usuarioId && ur.RolId == rv.RolId));

        // ------------------------------------------------------------------ administración

        public async Task<IReadOnlyList<PermisoEspecialResumenDto>> CatalogoAsync() =>
            await _context.PermisosEspeciales
                .OrderBy(p => p.Modulo).ThenBy(p => p.Nombre)
                .Select(p => new PermisoEspecialResumenDto
                {
                    Id = p.Id,
                    Codigo = p.Codigo,
                    Nombre = p.Nombre,
                    Descripcion = p.Descripcion,
                    Modulo = p.Modulo,
                    Activo = p.Activo,
                    TotalAsignados = p.Asignaciones.Count
                })
                .ToListAsync();

        public async Task<PermisoEspecialResumenDto> ActualizarAsync(int id, ActualizarPermisoEspecialDto dto)
        {
            var permiso = await _context.PermisosEspeciales.FirstOrDefaultAsync(p => p.Id == id)
                ?? throw new KeyNotFoundException($"El permiso especial {id} no existe.");

            var nombre = dto.Nombre?.Trim();
            if (string.IsNullOrEmpty(nombre))
                throw new ArgumentException("El nombre del permiso no puede quedar vacío.");
            if (nombre.Length > 200)
                throw new ArgumentException("El nombre del permiso no puede pasar de 200 caracteres.");

            var descripcion = string.IsNullOrWhiteSpace(dto.Descripcion) ? null : dto.Descripcion.Trim();
            if (descripcion != null && descripcion.Length > 500)
                throw new ArgumentException("La descripción no puede pasar de 500 caracteres.");

            permiso.Nombre = nombre;
            permiso.Descripcion = descripcion;
            permiso.Activo = dto.Activo;
            await _context.SaveChangesAsync();
            InvalidarCache();

            return new PermisoEspecialResumenDto
            {
                Id = permiso.Id,
                Codigo = permiso.Codigo,
                Nombre = permiso.Nombre,
                Descripcion = permiso.Descripcion,
                Modulo = permiso.Modulo,
                Activo = permiso.Activo,
                TotalAsignados = await _context.PermisosEspecialesAsignaciones.CountAsync(a => a.PermisoEspecialId == id)
            };
        }

        public async Task<IReadOnlyList<AsignacionDto>> AsignacionesAsync(int permisoId)
        {
            if (!await _context.PermisosEspeciales.AnyAsync(p => p.Id == permisoId))
                throw new KeyNotFoundException($"El permiso especial {permisoId} no existe.");

            return await _context.PermisosEspecialesAsignaciones
                .Where(a => a.PermisoEspecialId == permisoId)
                .OrderBy(a => a.Usuario.NombreUsuario)
                .Select(a => new AsignacionDto
                {
                    AsignacionId = a.Id,
                    UsuarioId = a.UsuarioId,
                    NombreUsuario = a.Usuario.NombreUsuario,
                    Email = a.Usuario.Email,
                    FechaAsignacion = a.FechaAsignacion,
                    AsignadoPor = a.AsignadoPor
                })
                .ToListAsync();
        }

        public async Task<AsignacionDto> AsignarAsync(int permisoId, int usuarioId, int? asignadoPor)
        {
            if (!await _context.PermisosEspeciales.AnyAsync(p => p.Id == permisoId))
                throw new KeyNotFoundException($"El permiso especial {permisoId} no existe.");

            var usuario = await _context.Usuarios
                .Where(u => u.UsuarioId == usuarioId)
                .Select(u => new { u.UsuarioId, u.NombreUsuario, u.Email })
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException($"El usuario {usuarioId} no existe.");

            if (await _context.PermisosEspecialesAsignaciones.AnyAsync(a => a.PermisoEspecialId == permisoId && a.UsuarioId == usuarioId))
                throw new InvalidOperationException("Ese usuario ya tiene este permiso.");

            var asignacion = new PermisoEspecialAsignacion
            {
                PermisoEspecialId = permisoId,
                UsuarioId = usuarioId,
                AsignadoPor = asignadoPor,
                FechaAsignacion = DateTime.UtcNow
            };
            _context.PermisosEspecialesAsignaciones.Add(asignacion);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // Dos asignaciones simultáneas del mismo par: gana la primera
                throw new InvalidOperationException("Ese usuario ya tiene este permiso.");
            }

            InvalidarCache();

            return new AsignacionDto
            {
                AsignacionId = asignacion.Id,
                UsuarioId = usuario.UsuarioId,
                NombreUsuario = usuario.NombreUsuario,
                Email = usuario.Email,
                FechaAsignacion = asignacion.FechaAsignacion,
                AsignadoPor = asignacion.AsignadoPor
            };
        }

        public async Task QuitarAsync(int asignacionId)
        {
            var asignacion = await _context.PermisosEspecialesAsignaciones.FirstOrDefaultAsync(a => a.Id == asignacionId)
                ?? throw new KeyNotFoundException($"La asignación {asignacionId} no existe.");

            _context.PermisosEspecialesAsignaciones.Remove(asignacion);
            await _context.SaveChangesAsync();
            InvalidarCache();
        }

        public async Task<IReadOnlyList<PermisoDeUsuarioDto>> PermisosDeUsuarioAsync(int usuarioId)
        {
            if (!await _context.Usuarios.AnyAsync(u => u.UsuarioId == usuarioId))
                throw new KeyNotFoundException($"El usuario {usuarioId} no existe.");

            return await _context.PermisosEspecialesAsignaciones
                .Where(a => a.UsuarioId == usuarioId)
                .OrderBy(a => a.Permiso.Modulo).ThenBy(a => a.Permiso.Nombre)
                .Select(a => new PermisoDeUsuarioDto
                {
                    AsignacionId = a.Id,
                    PermisoId = a.PermisoEspecialId,
                    Codigo = a.Permiso.Codigo,
                    Nombre = a.Permiso.Nombre,
                    Modulo = a.Permiso.Modulo,
                    Activo = a.Permiso.Activo
                })
                .ToListAsync();
        }
    }
}
```

- [ ] **Step 4: Sincronizador de arranque**

```csharp
// Services/PermisosEspeciales/PermisosEspecialesSincronizador.cs
using jr_api.Models;
using Microsoft.EntityFrameworkCore;

namespace jr_api.Services.PermisosEspeciales
{
    public static class PermisosEspecialesSincronizador
    {
        /// <summary>
        /// Da de alta los permisos declarados en el catálogo que aún no existen. Nunca borra ni pisa lo editado en la pantalla.
        /// Los usuarios iniciales solo se asignan en el alta, y solo si existen (evita romper la llave foránea en otra base).
        /// </summary>
        public static async Task SincronizarAsync(ApplicationDbContext context)
        {
            var existentes = await context.PermisosEspeciales.Select(p => p.Codigo).ToListAsync();
            var altas = PermisosEspecialesCatalogo.CalcularAltas(PermisosEspecialesCatalogo.Todos, existentes);
            if (altas.Count == 0) return;

            foreach (var definicion in altas)
            {
                var permiso = new PermisoEspecial
                {
                    Codigo = definicion.Codigo,
                    Nombre = definicion.Nombre,
                    Descripcion = definicion.Descripcion,
                    Modulo = definicion.Modulo,
                    Activo = true
                };

                if (definicion.UsuariosIniciales is { Length: > 0 })
                {
                    var ids = definicion.UsuariosIniciales;
                    var usuariosExistentes = await context.Usuarios
                        .Where(u => ids.Contains(u.UsuarioId))
                        .Select(u => u.UsuarioId)
                        .ToListAsync();

                    foreach (var usuarioId in usuariosExistentes)
                        permiso.Asignaciones.Add(new PermisoEspecialAsignacion { UsuarioId = usuarioId });
                }

                context.PermisosEspeciales.Add(permiso);
            }

            await context.SaveChangesAsync();
        }
    }
}
```

- [ ] **Step 5: Escribir las pruebas de los filtros (fallan hasta que existan los archivos en el proyecto de pruebas)**

Agregar a `pe_test/pe_test.csproj` dentro del `ItemGroup`:

```xml
    <Compile Include="g:\dev\jr\jr_api\jr_api\DTOs\PermisosEspecialesDtos.cs" Link="PermisosEspecialesDtos.cs" />
    <Compile Include="g:\dev\jr\jr_api\jr_api\Services\PermisosEspeciales\IPermisosEspecialesService.cs" Link="IPermisosEspecialesService.cs" />
    <Compile Include="g:\dev\jr\jr_api\jr_api\Seguridad\UsuarioActual.cs" Link="UsuarioActual.cs" />
    <Compile Include="g:\dev\jr\jr_api\jr_api\Seguridad\RequierePermisoEspecialAttribute.cs" Link="RequierePermisoEspecialAttribute.cs" />
    <Compile Include="g:\dev\jr\jr_api\jr_api\Seguridad\RequiereVistaAttribute.cs" Link="RequiereVistaAttribute.cs" />
```

Crear `pe_test/HostDePrueba.cs` (servicio falso + autenticación de prueba + host):

```csharp
using System.Security.Claims;
using System.Text.Encodings.Web;
using jr_api.DTOs.PermisosEspeciales;
using jr_api.Seguridad;
using jr_api.Services.PermisosEspeciales;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

/// <summary>Servicio falso en memoria: usuario 14 tiene el permiso y la vista de administración; usuario 99 no tiene nada; 7 está inactivo.</summary>
public class ServicioFalso : IPermisosEspecialesService
{
    public Task<bool> UsuarioTieneAsync(int usuarioId, string codigo) =>
        Task.FromResult(usuarioId == 14 && codigo == PermisosEspecialesCatalogo.ComprasDocumentosRevisar);
    public Task<IReadOnlyList<string>> CodigosDeUsuarioAsync(int usuarioId) =>
        Task.FromResult<IReadOnlyList<string>>(usuarioId == 14 ? new[] { PermisosEspecialesCatalogo.ComprasDocumentosRevisar } : Array.Empty<string>());
    public Task<string?> NombreDePermisoAsync(string codigo) =>
        Task.FromResult<string?>(codigo == PermisosEspecialesCatalogo.ComprasDocumentosRevisar ? "Revisar documentos de requisiciones" : null);
    public Task<bool> UsuarioTieneVistaAsync(int usuarioId, string nombreVista) =>
        Task.FromResult(usuarioId == 14 && nombreVista == "apps.permisos-especiales");

    public Task<IReadOnlyList<PermisoEspecialResumenDto>> CatalogoAsync() =>
        Task.FromResult<IReadOnlyList<PermisoEspecialResumenDto>>(new[] { new PermisoEspecialResumenDto { Id = 1, Codigo = "compras.documentos.revisar", Nombre = "Revisar", Modulo = "Compras", Activo = true, TotalAsignados = 2 } });
    public Task<PermisoEspecialResumenDto> ActualizarAsync(int id, ActualizarPermisoEspecialDto dto)
    {
        if (id == 404) throw new KeyNotFoundException("El permiso especial 404 no existe.");
        if (string.IsNullOrWhiteSpace(dto.Nombre)) throw new ArgumentException("El nombre del permiso no puede quedar vacío.");
        return Task.FromResult(new PermisoEspecialResumenDto { Id = id, Nombre = dto.Nombre!, Activo = dto.Activo });
    }
    public Task<IReadOnlyList<AsignacionDto>> AsignacionesAsync(int permisoId) =>
        permisoId == 404 ? throw new KeyNotFoundException("El permiso especial 404 no existe.")
                         : Task.FromResult<IReadOnlyList<AsignacionDto>>(new[] { new AsignacionDto { AsignacionId = 1, UsuarioId = 14, NombreUsuario = "Catalina" } });
    public Task<AsignacionDto> AsignarAsync(int permisoId, int usuarioId, int? asignadoPor)
    {
        if (usuarioId == 404) throw new KeyNotFoundException("El usuario 404 no existe.");
        if (usuarioId == 14) throw new InvalidOperationException("Ese usuario ya tiene este permiso.");
        return Task.FromResult(new AsignacionDto { AsignacionId = 5, UsuarioId = usuarioId, AsignadoPor = asignadoPor });
    }
    public Task QuitarAsync(int asignacionId) =>
        asignacionId == 404 ? throw new KeyNotFoundException("La asignación 404 no existe.") : Task.CompletedTask;
    public Task<IReadOnlyList<PermisoDeUsuarioDto>> PermisosDeUsuarioAsync(int usuarioId) =>
        usuarioId == 404 ? throw new KeyNotFoundException("El usuario 404 no existe.")
                         : Task.FromResult<IReadOnlyList<PermisoDeUsuarioDto>>(Array.Empty<PermisoDeUsuarioDto>());
}

/// <summary>Autenticación de prueba: el header X-Usuario trae el id (o un texto inválido); sin header = anónimo.</summary>
public class AutenticacionDePrueba : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public AutenticacionDePrueba(IOptionsMonitor<AuthenticationSchemeOptions> o, ILoggerFactory l, UrlEncoder e) : base(o, l, e) { }
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("X-Usuario", out var v)) return Task.FromResult(AuthenticateResult.NoResult());
        var identidad = new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, v.ToString()) }, "Prueba");
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identidad), "Prueba")));
    }
}

[ApiController]
[Route("probar")]
public class ControladorDePrueba : ControllerBase
{
    [HttpGet("permiso")]
    [RequierePermisoEspecial(PermisosEspecialesCatalogo.ComprasDocumentosRevisar)]
    public IActionResult Permiso() => Ok(new { mensaje = "pasó" });

    [HttpGet("permiso-inexistente")]
    [RequierePermisoEspecial("no.existe.nunca")]
    public IActionResult PermisoInexistente() => Ok(new { mensaje = "pasó" });

    [HttpGet("vista")]
    [RequiereVista("apps.permisos-especiales")]
    public IActionResult Vista() => Ok(new { mensaje = "pasó" });
}
```

Reemplazar `pe_test/Program.cs` por la versión que corre las pruebas puras (Task 2), levanta el host de prueba y lanza las peticiones. Estructura (las pruebas puras de la Task 2 van tal cual dentro de `Pruebas.Puras()`):

```csharp
using jr_api.Seguridad;
using jr_api.Services.PermisosEspeciales;
using Microsoft.AspNetCore.Authentication;

public static class Reporte
{
    public static int Fallos;
    public static void Check(string titulo, bool ok, string detalle = "")
    {
        Console.WriteLine($"{(ok ? "OK   " : "FALLA")} {titulo}{(detalle.Length > 0 ? "  -> " + detalle : "")}");
        if (!ok) Fallos++;
    }
}

public static class Program
{
    public static async Task<int> Main(string[] args)
    {
        Pruebas.Puras();

        var builder = WebApplication.CreateBuilder(args);
        builder.Logging.SetMinimumLevel(LogLevel.Warning);
        builder.Services.AddControllers();
        builder.Services.AddSingleton<IPermisosEspecialesService, ServicioFalso>();
        builder.Services.AddAuthentication("Prueba").AddScheme<AuthenticationSchemeOptions, AutenticacionDePrueba>("Prueba", _ => { });
        builder.Services.AddAuthorization();
        var app = builder.Build();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();
        await app.StartAsync("http://127.0.0.1:5198");

        using var http = new HttpClient { BaseAddress = new Uri("http://127.0.0.1:5198") };
        async Task<(int status, string cuerpo)> Llamar(HttpMethod metodo, string ruta, string? usuario, string? json = null)
        {
            var req = new HttpRequestMessage(metodo, ruta);
            if (usuario != null) req.Headers.Add("X-Usuario", usuario);
            if (json != null) req.Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
            var resp = await http.SendAsync(req);
            return ((int)resp.StatusCode, await resp.Content.ReadAsStringAsync());
        }

        // ---- RequierePermisoEspecial
        var r = await Llamar(HttpMethod.Get, "/probar/permiso", null);
        Reporte.Check("permiso: sin sesión -> 401 con mensaje", r.status == 401 && r.cuerpo.Contains("mensaje"), r.cuerpo);
        r = await Llamar(HttpMethod.Get, "/probar/permiso", "abc");
        Reporte.Check("permiso: id de usuario inválido en el token -> 401 (no 500)", r.status == 401, $"{r.status} {r.cuerpo}");
        r = await Llamar(HttpMethod.Get, "/probar/permiso", "99");
        Reporte.Check("permiso: usuario sin el permiso -> 403 con el nombre del permiso", r.status == 403 && r.cuerpo.Contains("Revisar documentos de requisiciones"), r.cuerpo);
        r = await Llamar(HttpMethod.Get, "/probar/permiso", "14");
        Reporte.Check("permiso: usuario con el permiso -> 200", r.status == 200, r.cuerpo);
        r = await Llamar(HttpMethod.Get, "/probar/permiso-inexistente", "14");
        Reporte.Check("permiso: código que no existe -> 403 (se niega por defecto)", r.status == 403, r.cuerpo);

        // ---- RequiereVista
        r = await Llamar(HttpMethod.Get, "/probar/vista", null);
        Reporte.Check("vista: sin sesión -> 401", r.status == 401, r.cuerpo);
        r = await Llamar(HttpMethod.Get, "/probar/vista", "99");
        Reporte.Check("vista: sin la vista -> 403", r.status == 403 && r.cuerpo.Contains("mensaje"), r.cuerpo);
        r = await Llamar(HttpMethod.Get, "/probar/vista", "14");
        Reporte.Check("vista: con la vista -> 200", r.status == 200, r.cuerpo);

        // (la Task 4 agrega aquí las pruebas del controlador real)

        await app.StopAsync();
        Console.WriteLine(Reporte.Fallos == 0 ? "\nTODAS LAS PRUEBAS PASARON" : $"\n{Reporte.Fallos} PRUEBA(S) FALLARON");
        return Reporte.Fallos;
    }
}
```

Mover las pruebas puras de la Task 2 a `pe_test/Pruebas.cs` como `public static class Pruebas { public static void Puras() { ... } }`, usando `Reporte.Check` en lugar de la función local.

- [ ] **Step 6: Ejecutar y comprobar que las pruebas de filtros pasan**

Run (PowerShell): `cd <pe_test>; dotnet build -c Release --nologo -v q; dotnet bin\Release\net8.0\pe_test.dll`
Expected: todas `OK`, `TODAS LAS PRUEBAS PASARON`. Si el puerto 5198 está ocupado, cambiarlo.

- [ ] **Step 7: Compilar el API completo con el servicio, el sincronizador y los filtros**

Run: `cd g:/dev/jr/jr_api/jr_api && dotnet build jr_api.csproj --nologo -v q`
Expected: `Compilación correcta.`, `0 Errores`. (El servicio y el sincronizador usan la base y no se pueden ejecutar aquí; se revisan por lectura contra el spec y se cubren con la compilación.)

---

### Task 4: Controlador y registro en Program.cs (con pruebas)

**Files:**
- Create: `Controllers/PermisosEspecialesController.cs`
- Modify: `Program.cs` (registro de servicios junto a `builder.Services.AddScoped<IRolService, RolService>();`, línea ~44; sincronización justo después del bloque `Migrate()`)
- Test: `pe_test/Program.cs`

**Interfaces:**
- Consumes (Task 3): `IPermisosEspecialesService`, `UsuarioActual.TryObtenerId`, `[RequiereVista]`, DTOs.
- Produces: rutas `GET api/PermisosEspeciales/mis-permisos`, `GET catalogo`, `PUT {id}`, `GET {id}/asignaciones`, `POST {id}/asignaciones`, `DELETE asignaciones/{asignacionId}`, `GET usuario/{usuarioId}`.

- [ ] **Step 1: Escribir las pruebas del controlador (deben fallar: el archivo aún no existe)**

Agregar a `pe_test/pe_test.csproj`: `<Compile Include="g:\dev\jr\jr_api\jr_api\Controllers\PermisosEspecialesController.cs" Link="PermisosEspecialesController.cs" />`. En `Program.cs`, antes de `await app.StopAsync()`, reemplazar el comentario `(la Task 4 agrega aquí…)` por:

```csharp
        // ---- Controlador real (con el servicio falso)
        const string base_ = "/api/PermisosEspeciales";
        r = await Llamar(HttpMethod.Get, $"{base_}/mis-permisos", null);
        Reporte.Check("mis-permisos: sin sesión -> 401", r.status == 401, r.cuerpo);
        r = await Llamar(HttpMethod.Get, $"{base_}/mis-permisos", "14");
        Reporte.Check("mis-permisos: usuario 14 -> lista con compras.documentos.revisar", r.status == 200 && r.cuerpo.Contains("compras.documentos.revisar"), r.cuerpo);
        r = await Llamar(HttpMethod.Get, $"{base_}/mis-permisos", "99");
        Reporte.Check("mis-permisos: usuario sin permisos -> 200 con lista vacía", r.status == 200 && r.cuerpo.Trim() == "[]", r.cuerpo);
        r = await Llamar(HttpMethod.Get, $"{base_}/mis-permisos", "abc");
        Reporte.Check("mis-permisos: token sin id válido -> 401 (no 500)", r.status == 401, $"{r.status}");

        r = await Llamar(HttpMethod.Get, $"{base_}/catalogo", "99");
        Reporte.Check("catalogo: sin la vista de administración -> 403", r.status == 403, r.cuerpo);
        r = await Llamar(HttpMethod.Get, $"{base_}/catalogo", "14");
        Reporte.Check("catalogo: administrador -> 200", r.status == 200 && r.cuerpo.Contains("totalAsignados"), r.cuerpo);

        r = await Llamar(HttpMethod.Put, $"{base_}/1", "14", "{\"nombre\":\"Nuevo\",\"descripcion\":null,\"activo\":true}");
        Reporte.Check("actualizar: ok -> 200", r.status == 200, r.cuerpo);
        r = await Llamar(HttpMethod.Put, $"{base_}/1", "14", "{\"nombre\":\"  \",\"activo\":true}");
        Reporte.Check("actualizar: nombre vacío -> 400 con mensaje", r.status == 400 && r.cuerpo.Contains("mensaje"), r.cuerpo);
        r = await Llamar(HttpMethod.Put, $"{base_}/404", "14", "{\"nombre\":\"x\",\"activo\":true}");
        Reporte.Check("actualizar: permiso inexistente -> 404", r.status == 404, r.cuerpo);
        r = await Llamar(HttpMethod.Put, $"{base_}/1", "99", "{\"nombre\":\"x\",\"activo\":true}");
        Reporte.Check("actualizar: sin acceso -> 403", r.status == 403, r.cuerpo);

        r = await Llamar(HttpMethod.Get, $"{base_}/1/asignaciones", "14");
        Reporte.Check("asignaciones: ok -> 200", r.status == 200 && r.cuerpo.Contains("Catalina"), r.cuerpo);
        r = await Llamar(HttpMethod.Get, $"{base_}/404/asignaciones", "14");
        Reporte.Check("asignaciones: permiso inexistente -> 404", r.status == 404, r.cuerpo);

        r = await Llamar(HttpMethod.Post, $"{base_}/1/asignaciones", "14", "{\"usuarioId\":16}");
        Reporte.Check("asignar: usuario nuevo -> 200 y guarda quién asignó (14)", r.status == 200 && r.cuerpo.Contains("\"asignadoPor\":14"), r.cuerpo);
        r = await Llamar(HttpMethod.Post, $"{base_}/1/asignaciones", "14", "{\"usuarioId\":14}");
        Reporte.Check("asignar: duplicado -> 409 con mensaje (no 500)", r.status == 409 && r.cuerpo.Contains("ya tiene"), r.cuerpo);
        r = await Llamar(HttpMethod.Post, $"{base_}/1/asignaciones", "14", "{\"usuarioId\":404}");
        Reporte.Check("asignar: usuario inexistente -> 404", r.status == 404, r.cuerpo);

        r = await Llamar(HttpMethod.Delete, $"{base_}/asignaciones/5", "14");
        Reporte.Check("quitar: ok -> 200", r.status == 200, r.cuerpo);
        r = await Llamar(HttpMethod.Delete, $"{base_}/asignaciones/404", "14");
        Reporte.Check("quitar: asignación que ya no existe -> 404 (no 500)", r.status == 404, r.cuerpo);

        r = await Llamar(HttpMethod.Get, $"{base_}/usuario/14", "14");
        Reporte.Check("permisos de usuario: ok -> 200", r.status == 200, r.cuerpo);
        r = await Llamar(HttpMethod.Get, $"{base_}/usuario/404", "14");
        Reporte.Check("permisos de usuario: usuario inexistente -> 404", r.status == 404, r.cuerpo);
```

- [ ] **Step 2: Compilar las pruebas y confirmar que fallan**

Run (PowerShell): `cd <pe_test>; dotnet build -c Release --nologo -v q 2>&1 | Select-String 'error' | Select-Object -First 3`
Expected: error (archivo del controlador inexistente).

- [ ] **Step 3: Implementar el controlador**

```csharp
// Controllers/PermisosEspecialesController.cs
using jr_api.DTOs.PermisosEspeciales;
using jr_api.Seguridad;
using jr_api.Services.PermisosEspeciales;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace jr_api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PermisosEspecialesController : ControllerBase
    {
        /// <summary>Vista del menú Seguridad que habilita la administración de permisos especiales.</summary>
        public const string VistaAdministracion = "apps.permisos-especiales";

        private readonly IPermisosEspecialesService _servicio;

        public PermisosEspecialesController(IPermisosEspecialesService servicio)
        {
            _servicio = servicio;
        }

        /// <summary>Códigos de permisos especiales que tiene el usuario con sesión (para mostrar u ocultar botones).</summary>
        [HttpGet("mis-permisos")]
        public async Task<IActionResult> MisPermisos()
        {
            if (!UsuarioActual.TryObtenerId(User, out var usuarioId))
                return Unauthorized(new { mensaje = "Inicia sesión para continuar." });

            return Ok(await _servicio.CodigosDeUsuarioAsync(usuarioId));
        }

        [HttpGet("catalogo")]
        [RequiereVista(VistaAdministracion)]
        public Task<IActionResult> Catalogo() =>
            Ejecutar(async () => Ok(await _servicio.CatalogoAsync()));

        [HttpPut("{id:int}")]
        [RequiereVista(VistaAdministracion)]
        public Task<IActionResult> Actualizar(int id, [FromBody] ActualizarPermisoEspecialDto dto) =>
            Ejecutar(async () => Ok(await _servicio.ActualizarAsync(id, dto)));

        [HttpGet("{id:int}/asignaciones")]
        [RequiereVista(VistaAdministracion)]
        public Task<IActionResult> Asignaciones(int id) =>
            Ejecutar(async () => Ok(await _servicio.AsignacionesAsync(id)));

        [HttpPost("{id:int}/asignaciones")]
        [RequiereVista(VistaAdministracion)]
        public Task<IActionResult> Asignar(int id, [FromBody] AsignarPermisoEspecialDto dto)
        {
            UsuarioActual.TryObtenerId(User, out var quien);
            return Ejecutar(async () => Ok(await _servicio.AsignarAsync(id, dto.UsuarioId, quien > 0 ? quien : null)));
        }

        [HttpDelete("asignaciones/{asignacionId:int}")]
        [RequiereVista(VistaAdministracion)]
        public Task<IActionResult> Quitar(int asignacionId) =>
            Ejecutar(async () =>
            {
                await _servicio.QuitarAsync(asignacionId);
                return Ok(new { mensaje = "Permiso retirado." });
            });

        [HttpGet("usuario/{usuarioId:int}")]
        [RequiereVista(VistaAdministracion)]
        public Task<IActionResult> PermisosDeUsuario(int usuarioId) =>
            Ejecutar(async () => Ok(await _servicio.PermisosDeUsuarioAsync(usuarioId)));

        /// <summary>Convierte las excepciones del servicio en respuestas con `mensaje` (nunca un 500 sin explicación).</summary>
        private async Task<IActionResult> Ejecutar(Func<Task<IActionResult>> accion)
        {
            try
            {
                return await accion();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { mensaje = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { mensaje = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { mensaje = ex.Message });
            }
        }
    }
}
```

- [ ] **Step 4: Ejecutar las pruebas y confirmar que pasan**

Run (PowerShell): `cd <pe_test>; dotnet build -c Release --nologo -v q; dotnet bin\Release\net8.0\pe_test.dll`
Expected: todas `OK`, `TODAS LAS PRUEBAS PASARON`.

- [ ] **Step 5: Registrar el servicio y la sincronización en `Program.cs`**

Después de `builder.Services.AddScoped<IRolService, RolService>();`:

```csharp
builder.Services.AddMemoryCache();
builder.Services.AddScoped<jr_api.Services.PermisosEspeciales.IPermisosEspecialesService, jr_api.Services.PermisosEspeciales.PermisosEspecialesService>();
```

Justo después del bloque `using (var scope = app.Services.CreateScope()) { ... context.Database.Migrate(); ... }` y antes del comentario `// Inicializar tablas y sembrar datos de talleres/conferencias`:

```csharp
// Permisos especiales: dar de alta los declarados en el catálogo (nunca debe impedir que el API arranque)
using (var scope = app.Services.CreateScope())
{
    try
    {
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await jr_api.Services.PermisosEspeciales.PermisosEspecialesSincronizador.SincronizarAsync(context);
        Console.WriteLine("✅ Permisos especiales sincronizados");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️ No se pudieron sincronizar los permisos especiales: {ex.Message}");
    }
}
```

- [ ] **Step 6: Compilar el API completo**

Run: `cd g:/dev/jr/jr_api/jr_api && dotnet build jr_api.csproj --nologo -v q`
Expected: `Compilación correcta.`, `0 Errores`.

---

### Task 5: Front — servicio, utilidades, pantalla, ruta y menú

**Files:**
- Create: `src/app/core/permisos-especiales/permisos-especiales.types.ts`, `permisos-especiales.utils.ts`, `permisos-especiales.service.ts`
- Create: `src/app/modules/admin/security/permisos-especiales/permisos-especiales.routes.ts`, `permisos-especiales.component.ts`, `permisos-especiales.component.html`
- Modify: `src/app/app.routes.ts` (hijos de `security`, línea ~133), `src/app/mock-api/common/navigation/data.ts` (menú Seguridad de `defaultNavigation`, tras `apps.activity-monitor`, línea ~408), `src/app/layout/layout.component.ts` (`ngOnInit`)
- Test: utilidades con `esbuild` + `node` (fuera del repo); `tsc` y `ngc` para el resto.

**Interfaces:**
- Consumes: endpoints de la Task 4 (JSON en camelCase); `UsersService.getUsers()` (usuarios con `usuarioId`, `nombreUsuario`, `email`).
- Produces: `PermisosEspecialesService.tiene(codigo: string): boolean`, `.cargar(): Observable<string[]>`, y los métodos de administración que usa la pantalla.

- [ ] **Step 1: Tipos y utilidades puras, con prueba que falla primero**

```ts
// src/app/core/permisos-especiales/permisos-especiales.types.ts
export interface PermisoEspecial {
    id: number;
    codigo: string;
    nombre: string;
    descripcion?: string | null;
    modulo: string;
    activo: boolean;
    totalAsignados: number;
}

export interface ActualizarPermisoEspecial {
    nombre: string;
    descripcion?: string | null;
    activo: boolean;
}

export interface AsignacionPermiso {
    asignacionId: number;
    usuarioId: number;
    nombreUsuario: string;
    email?: string | null;
    fechaAsignacion: string;
    asignadoPor?: number | null;
}

export interface PermisoDeUsuario {
    asignacionId: number;
    permisoId: number;
    codigo: string;
    nombre: string;
    modulo: string;
    activo: boolean;
}

export interface UsuarioBasico {
    usuarioId: number;
    nombreUsuario: string;
    email?: string | null;
}

export interface GrupoPermisos {
    modulo: string;
    permisos: PermisoEspecial[];
}
```

Prueba (`pe_front_test/run.js`, fuera del repo; se compila con esbuild):

```js
const assert = require('assert');
const { agruparPorModulo, filtrarUsuarios } = require('./permisos-especiales.utils.js');

const permisos = [
  { id: 1, codigo: 'compras.documentos.revisar', nombre: 'Revisar documentos', modulo: 'Compras', activo: true, totalAsignados: 2 },
  { id: 2, codigo: 'compras.pagos.autorizar', nombre: 'Autorizar pagos', modulo: 'Compras', activo: true, totalAsignados: 0 },
  { id: 3, codigo: 'rrhh.nomina.ver', nombre: 'Ver nómina', modulo: 'RRHH', activo: false, totalAsignados: 1 },
];
let g = agruparPorModulo(permisos, '');
assert.deepStrictEqual(g.map(x => x.modulo), ['Compras', 'RRHH']);
assert.strictEqual(g[0].permisos.length, 2);
g = agruparPorModulo(permisos, 'nómina');
assert.deepStrictEqual(g.map(x => x.modulo), ['RRHH'], 'busca en nombre y sin distinguir acentos/mayúsculas');
g = agruparPorModulo(permisos, 'COMPRAS.PAGOS');
assert.strictEqual(g.length, 1); assert.strictEqual(g[0].permisos[0].id, 2, 'busca también por código');
assert.deepStrictEqual(agruparPorModulo(permisos, 'zzz'), []);

const usuarios = [
  { usuarioId: 14, nombreUsuario: 'Catalina Méndez', email: 'catalina@jr.com' },
  { usuarioId: 16, nombreUsuario: 'Ana Laura Ramos', email: 'ana@jr.com' },
  { usuarioId: 20, nombreUsuario: 'Luis', email: null },
];
assert.deepStrictEqual(filtrarUsuarios(usuarios, 'cat', [], 8).map(u => u.usuarioId), [14]);
assert.deepStrictEqual(filtrarUsuarios(usuarios, 'ANA', [], 8).map(u => u.usuarioId), [16], 'sin distinguir mayúsculas');
assert.deepStrictEqual(filtrarUsuarios(usuarios, 'ana@', [], 8).map(u => u.usuarioId), [16], 'busca por correo');
assert.deepStrictEqual(filtrarUsuarios(usuarios, 'a', [14], 8).map(u => u.usuarioId), [16], 'excluye a los ya asignados');
assert.deepStrictEqual(filtrarUsuarios(usuarios, '', [], 8), [], 'sin texto no lista a nadie');
assert.strictEqual(filtrarUsuarios(usuarios, 'a', [], 1).length, 1, 'respeta el máximo');
assert.deepStrictEqual(filtrarUsuarios([{ usuarioId: 1, nombreUsuario: null, email: null }], 'x', [], 8), [], 'tolera nulos');
console.log('utilidades OK');
```

Run (bash): `cd g:/dev/jr/jringenieria && npx esbuild src/app/core/permisos-especiales/permisos-especiales.utils.ts --format=cjs --platform=node --outfile=<scratchpad>/pe_front_test/permisos-especiales.utils.js && node <scratchpad>/pe_front_test/run.js`
Expected (antes de crear `utils.ts`): error de archivo inexistente.

- [ ] **Step 2: Implementar las utilidades**

```ts
// src/app/core/permisos-especiales/permisos-especiales.utils.ts
import { GrupoPermisos, PermisoEspecial, UsuarioBasico } from './permisos-especiales.types';

/** Minúsculas y sin acentos, para comparar texto escrito por personas. */
const normalizar = (texto: string | null | undefined): string =>
    (texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Agrupa los permisos por módulo (orden alfabético) y los filtra por nombre, código o descripción. */
export function agruparPorModulo(permisos: PermisoEspecial[], busqueda: string): GrupoPermisos[] {
    const texto = normalizar(busqueda);
    const filtrados = texto
        ? permisos.filter(p =>
            normalizar(p.nombre).includes(texto) ||
            normalizar(p.codigo).includes(texto) ||
            normalizar(p.descripcion).includes(texto))
        : permisos;

    const porModulo = new Map<string, PermisoEspecial[]>();
    for (const permiso of filtrados) {
        porModulo.set(permiso.modulo, [...(porModulo.get(permiso.modulo) ?? []), permiso]);
    }

    return [...porModulo.entries()]
        .sort(([a], [b]) => a.localeCompare(b, 'es'))
        .map(([modulo, lista]) => ({ modulo, permisos: [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')) }));
}

/** Usuarios que coinciden con el texto (nombre o correo), sin los ya asignados y limitados a `maximo`. */
export function filtrarUsuarios(
    usuarios: UsuarioBasico[], busqueda: string, excluirIds: number[], maximo: number
): UsuarioBasico[] {
    const texto = normalizar(busqueda);
    if (!texto) return [];

    return usuarios
        .filter(u => !excluirIds.includes(Number(u.usuarioId)))
        .filter(u => normalizar(u.nombreUsuario).includes(texto) || normalizar(u.email).includes(texto))
        .slice(0, maximo);
}
```

- [ ] **Step 3: Ejecutar la prueba y confirmar que pasa**

Run: el mismo comando del Step 1.
Expected: `utilidades OK`.

- [ ] **Step 4: Servicio de Angular**

```ts
// src/app/core/permisos-especiales/permisos-especiales.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable, tap } from 'rxjs';
import {
    ActualizarPermisoEspecial, AsignacionPermiso, PermisoDeUsuario, PermisoEspecial
} from './permisos-especiales.types';

/**
 * Permisos especiales del usuario con sesión (para mostrar u ocultar botones) y administración de asignaciones.
 * La validación real la hace el API; aquí solo se oculta lo que el usuario no puede usar.
 */
@Injectable({ providedIn: 'root' })
export class PermisosEspecialesService {
    private _http = inject(HttpClient);
    private _api = `${environment.apiUrl}/PermisosEspeciales`;
    private _codigos = signal<ReadonlySet<string>>(new Set<string>());

    /** Carga los permisos del usuario actual (se llama al entrar a la aplicación). */
    cargar(): Observable<string[]> {
        return this._http.get<string[]>(`${this._api}/mis-permisos`).pipe(
            tap(codigos => this._codigos.set(new Set((codigos || []).map(c => c.toLowerCase()))))
        );
    }

    /** ¿El usuario actual tiene este permiso especial? Ejemplo: tiene('compras.documentos.revisar'). */
    tiene(codigo: string): boolean {
        return this._codigos().has(codigo.toLowerCase());
    }

    // ---- Administración (requiere la vista «Permisos especiales»)
    getCatalogo(): Observable<PermisoEspecial[]> {
        return this._http.get<PermisoEspecial[]>(`${this._api}/catalogo`);
    }

    actualizar(id: number, dto: ActualizarPermisoEspecial): Observable<PermisoEspecial> {
        return this._http.put<PermisoEspecial>(`${this._api}/${id}`, dto);
    }

    getAsignaciones(permisoId: number): Observable<AsignacionPermiso[]> {
        return this._http.get<AsignacionPermiso[]>(`${this._api}/${permisoId}/asignaciones`);
    }

    asignar(permisoId: number, usuarioId: number): Observable<AsignacionPermiso> {
        return this._http.post<AsignacionPermiso>(`${this._api}/${permisoId}/asignaciones`, { usuarioId });
    }

    quitar(asignacionId: number): Observable<{ mensaje: string }> {
        return this._http.delete<{ mensaje: string }>(`${this._api}/asignaciones/${asignacionId}`);
    }

    getPermisosDeUsuario(usuarioId: number): Observable<PermisoDeUsuario[]> {
        return this._http.get<PermisoDeUsuario[]>(`${this._api}/usuario/${usuarioId}`);
    }
}
```

- [ ] **Step 5: Ruta, componente y plantilla**

```ts
// src/app/modules/admin/security/permisos-especiales/permisos-especiales.routes.ts
import { Routes } from '@angular/router';
import { PermisosEspecialesComponent } from './permisos-especiales.component';

export default [
    {
        path: '',
        component: PermisosEspecialesComponent,
    },
] as Routes;
```

```ts
// src/app/modules/admin/security/permisos-especiales/permisos-especiales.component.ts
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { agruparPorModulo, filtrarUsuarios } from 'app/core/permisos-especiales/permisos-especiales.utils';
import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import {
    AsignacionPermiso, GrupoPermisos, PermisoDeUsuario, PermisoEspecial, UsuarioBasico
} from 'app/core/permisos-especiales/permisos-especiales.types';
import { UsersService } from 'app/modules/admin/security/users/users.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-permisos-especiales',
    standalone: true,
    imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSlideToggleModule],
    templateUrl: './permisos-especiales.component.html',
})
export class PermisosEspecialesComponent implements OnInit {
    private _servicio = inject(PermisosEspecialesService);
    private _usersService = inject(UsersService);
    private _cdr = inject(ChangeDetectorRef);

    vista: 'permiso' | 'usuario' = 'permiso';
    cargando = true;
    errorCarga: string | null = null;

    permisos: PermisoEspecial[] = [];
    grupos: GrupoPermisos[] = [];
    busquedaPermiso = '';
    usuarios: UsuarioBasico[] = [];

    // Pestaña "Por permiso"
    seleccionado: PermisoEspecial | null = null;
    edicion = { nombre: '', descripcion: '', activo: true };
    asignaciones: AsignacionPermiso[] = [];
    cargandoAsignaciones = false;
    busquedaUsuario = '';
    sugerencias: UsuarioBasico[] = [];

    // Pestaña "Por usuario"
    busquedaUsuarioVista = '';
    sugerenciasVista: UsuarioBasico[] = [];
    usuarioElegido: UsuarioBasico | null = null;
    permisosDelUsuario: PermisoDeUsuario[] = [];

    ngOnInit(): void {
        this._usersService.getUsers().subscribe({
            next: usuarios => (this.usuarios = usuarios || []),
            error: () => (this.usuarios = []),
        });
        this.recargarCatalogo();
    }

    // ------------------------------------------------------------------ catálogo

    recargarCatalogo(idParaSeleccionar?: number): void {
        this.cargando = true;
        this._servicio.getCatalogo().subscribe({
            next: lista => {
                this.permisos = lista;
                this.aplicarBusquedaPermiso();
                this.cargando = false;
                this.errorCarga = null;
                const id = idParaSeleccionar ?? this.seleccionado?.id;
                const actual = lista.find(p => p.id === id) ?? null;
                if (actual) this.seleccionar(actual);
                this._cdr.markForCheck();
            },
            error: err => {
                this.cargando = false;
                this.errorCarga = this.mensajeDe(err, 'No se pudo cargar el catálogo de permisos especiales.');
                this._cdr.markForCheck();
            },
        });
    }

    aplicarBusquedaPermiso(): void {
        this.grupos = agruparPorModulo(this.permisos, this.busquedaPermiso);
    }

    seleccionar(permiso: PermisoEspecial): void {
        this.seleccionado = permiso;
        this.edicion = { nombre: permiso.nombre, descripcion: permiso.descripcion ?? '', activo: permiso.activo };
        this.busquedaUsuario = '';
        this.sugerencias = [];
        this.cargarAsignaciones();
    }

    get hayCambios(): boolean {
        const p = this.seleccionado;
        return !!p && (this.edicion.nombre !== p.nombre
            || (this.edicion.descripcion ?? '') !== (p.descripcion ?? '')
            || this.edicion.activo !== p.activo);
    }

    guardarCambios(): void {
        const p = this.seleccionado;
        if (!p) return;
        this._servicio.actualizar(p.id, { ...this.edicion }).subscribe({
            next: () => {
                Swal.fire({ icon: 'success', title: 'Guardado', timer: 1400, showConfirmButton: false });
                this.recargarCatalogo(p.id);
            },
            error: err => Swal.fire('No se pudo guardar', this.mensajeDe(err, 'Inténtalo de nuevo.'), 'error'),
        });
    }

    // ------------------------------------------------------------------ asignaciones

    cargarAsignaciones(): void {
        const p = this.seleccionado;
        if (!p) return;
        this.cargandoAsignaciones = true;
        this._servicio.getAsignaciones(p.id).subscribe({
            next: lista => {
                this.asignaciones = lista;
                this.cargandoAsignaciones = false;
                this._cdr.markForCheck();
            },
            error: err => {
                this.asignaciones = [];
                this.cargandoAsignaciones = false;
                Swal.fire('No se pudieron cargar los usuarios', this.mensajeDe(err, 'Inténtalo de nuevo.'), 'error');
                this._cdr.markForCheck();
            },
        });
    }

    buscarUsuario(): void {
        this.sugerencias = filtrarUsuarios(
            this.usuarios, this.busquedaUsuario, this.asignaciones.map(a => a.usuarioId), 8);
    }

    asignar(usuario: UsuarioBasico): void {
        const p = this.seleccionado;
        if (!p) return;
        this._servicio.asignar(p.id, Number(usuario.usuarioId)).subscribe({
            next: () => {
                this.busquedaUsuario = '';
                this.sugerencias = [];
                this.recargarCatalogo(p.id);
            },
            error: err => Swal.fire('No se pudo asignar', this.mensajeDe(err, 'Inténtalo de nuevo.'), 'error'),
        });
    }

    quitar(asignacion: AsignacionPermiso): void {
        const p = this.seleccionado;
        if (!p) return;
        Swal.fire({
            title: '¿Quitar el permiso?',
            text: `${asignacion.nombreUsuario} dejará de poder usar «${p.nombre}».`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, quitar',
            cancelButtonText: 'Cancelar',
        }).then(r => {
            if (!r.isConfirmed) return;
            this._servicio.quitar(asignacion.asignacionId).subscribe({
                next: () => this.recargarCatalogo(p.id),
                error: err => Swal.fire('No se pudo quitar', this.mensajeDe(err, 'Inténtalo de nuevo.'), 'error'),
            });
        });
    }

    // ------------------------------------------------------------------ por usuario

    buscarUsuarioVista(): void {
        this.sugerenciasVista = filtrarUsuarios(this.usuarios, this.busquedaUsuarioVista, [], 8);
    }

    elegirUsuario(usuario: UsuarioBasico): void {
        this.usuarioElegido = usuario;
        this.busquedaUsuarioVista = '';
        this.sugerenciasVista = [];
        this.permisosDelUsuario = [];
        this._servicio.getPermisosDeUsuario(Number(usuario.usuarioId)).subscribe({
            next: lista => {
                this.permisosDelUsuario = lista;
                this._cdr.markForCheck();
            },
            error: err => Swal.fire('No se pudieron cargar sus permisos', this.mensajeDe(err, 'Inténtalo de nuevo.'), 'error'),
        });
    }

    // ------------------------------------------------------------------ utilidades

    private mensajeDe(err: any, porDefecto: string): string {
        return err?.error?.mensaje || (err?.status === 403 ? 'No tienes acceso a esta sección.' : porDefecto);
    }
}
```

```html
<!-- src/app/modules/admin/security/permisos-especiales/permisos-especiales.component.html -->
<div class="flex flex-col flex-auto min-w-0 p-6 sm:p-10 bg-card dark:bg-transparent">
    <div class="mb-6">
        <h2 class="text-3xl font-extrabold tracking-tight">Permisos especiales</h2>
        <p class="text-secondary mt-1">
            Acciones sensibles que solo pueden hacer los usuarios a los que se les concede. Se asignan a personas, no a roles.
        </p>
    </div>

    <div class="flex gap-2 mb-6">
        <button mat-flat-button [color]="vista === 'permiso' ? 'primary' : undefined" (click)="vista = 'permiso'">
            Por permiso
        </button>
        <button mat-flat-button [color]="vista === 'usuario' ? 'primary' : undefined" (click)="vista = 'usuario'">
            Por usuario
        </button>
    </div>

    <div *ngIf="cargando" class="text-secondary">Cargando…</div>
    <div *ngIf="errorCarga" class="p-4 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">{{ errorCarga }}</div>

    <!-- ===================== POR PERMISO ===================== -->
    <div *ngIf="!cargando && !errorCarga && vista === 'permiso'" class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Lista de permisos -->
        <div class="lg:col-span-1 space-y-4">
            <input type="text" [(ngModel)]="busquedaPermiso" (ngModelChange)="aplicarBusquedaPermiso()"
                   placeholder="Buscar permiso…"
                   class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent">

            <div *ngFor="let grupo of grupos">
                <div class="text-xs font-bold uppercase tracking-wider text-secondary mb-2">{{ grupo.modulo }}</div>
                <button *ngFor="let p of grupo.permisos" type="button" (click)="seleccionar(p)"
                        class="w-full text-left p-3 mb-2 rounded-xl border transition-colors"
                        [ngClass]="seleccionado?.id === p.id
                            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'">
                    <div class="flex items-center justify-between gap-2">
                        <span class="font-semibold text-sm">{{ p.nombre }}</span>
                        <span class="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
                            {{ p.totalAsignados }} {{ p.totalAsignados === 1 ? 'usuario' : 'usuarios' }}
                        </span>
                    </div>
                    <div class="text-[11px] font-mono text-secondary mt-0.5">{{ p.codigo }}</div>
                    <div *ngIf="!p.activo" class="text-[11px] text-amber-600 mt-0.5">Desactivado</div>
                </button>
            </div>
            <div *ngIf="grupos.length === 0" class="text-secondary text-sm">No hay permisos que coincidan.</div>
        </div>

        <!-- Detalle -->
        <div class="lg:col-span-2">
            <div *ngIf="!seleccionado" class="text-secondary p-6 border border-dashed rounded-2xl text-center">
                Elige un permiso de la lista para ver y asignar usuarios.
            </div>

            <div *ngIf="seleccionado" class="space-y-6">
                <div class="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4">
                    <div class="text-[11px] font-mono text-secondary">{{ seleccionado.codigo }}</div>

                    <label class="block">
                        <span class="text-xs font-bold uppercase tracking-wider text-secondary">Nombre</span>
                        <input type="text" [(ngModel)]="edicion.nombre" maxlength="200"
                               class="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent">
                    </label>

                    <label class="block">
                        <span class="text-xs font-bold uppercase tracking-wider text-secondary">Descripción</span>
                        <textarea [(ngModel)]="edicion.descripcion" rows="2" maxlength="500"
                                  class="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent"></textarea>
                    </label>

                    <div class="flex items-center justify-between">
                        <mat-slide-toggle [(ngModel)]="edicion.activo">
                            {{ edicion.activo ? 'Activo' : 'Desactivado: nadie lo tiene mientras esté así' }}
                        </mat-slide-toggle>
                        <button mat-flat-button color="primary" [disabled]="!hayCambios || !edicion.nombre.trim()"
                                (click)="guardarCambios()">
                            Guardar cambios
                        </button>
                    </div>
                </div>

                <div class="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4">
                    <div class="text-xs font-bold uppercase tracking-wider text-secondary">Usuarios con este permiso</div>

                    <div *ngIf="cargandoAsignaciones" class="text-secondary text-sm">Cargando…</div>
                    <div *ngIf="!cargandoAsignaciones && asignaciones.length === 0" class="text-secondary text-sm">
                        Nadie lo tiene todavía.
                    </div>

                    <div *ngFor="let a of asignaciones"
                         class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                        <div>
                            <div class="font-semibold text-sm">{{ a.nombreUsuario }}</div>
                            <div class="text-[11px] text-secondary">{{ a.email }} · desde {{ a.fechaAsignacion | date:'dd/MM/yyyy' }}</div>
                        </div>
                        <button mat-icon-button type="button" (click)="quitar(a)" title="Quitar permiso">
                            <mat-icon>close</mat-icon>
                        </button>
                    </div>

                    <div class="relative">
                        <input type="text" [(ngModel)]="busquedaUsuario" (ngModelChange)="buscarUsuario()"
                               placeholder="Agregar usuario: escribe su nombre o correo…"
                               class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent">
                        <div *ngIf="sugerencias.length > 0"
                             class="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
                            <button *ngFor="let u of sugerencias" type="button" (click)="asignar(u)"
                                    class="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                                <div class="text-sm font-semibold">{{ u.nombreUsuario }}</div>
                                <div class="text-[11px] text-secondary">{{ u.email }}</div>
                            </button>
                        </div>
                        <div *ngIf="busquedaUsuario && sugerencias.length === 0" class="text-[11px] text-secondary mt-1">
                            Sin coincidencias (o ya tiene el permiso).
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- ===================== POR USUARIO ===================== -->
    <div *ngIf="!cargando && !errorCarga && vista === 'usuario'" class="max-w-2xl space-y-6">
        <div class="relative">
            <input type="text" [(ngModel)]="busquedaUsuarioVista" (ngModelChange)="buscarUsuarioVista()"
                   placeholder="Busca un usuario por nombre o correo…"
                   class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent">
            <div *ngIf="sugerenciasVista.length > 0"
                 class="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
                <button *ngFor="let u of sugerenciasVista" type="button" (click)="elegirUsuario(u)"
                        class="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <div class="text-sm font-semibold">{{ u.nombreUsuario }}</div>
                    <div class="text-[11px] text-secondary">{{ u.email }}</div>
                </button>
            </div>
        </div>

        <div *ngIf="usuarioElegido" class="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
            <div class="font-bold">{{ usuarioElegido.nombreUsuario }}</div>
            <div *ngIf="permisosDelUsuario.length === 0" class="text-secondary text-sm">
                No tiene permisos especiales.
            </div>
            <div *ngFor="let p of permisosDelUsuario" class="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                <div class="font-semibold text-sm">{{ p.nombre }}</div>
                <div class="text-[11px] text-secondary">{{ p.modulo }} · <span class="font-mono">{{ p.codigo }}</span></div>
                <div *ngIf="!p.activo" class="text-[11px] text-amber-600">El permiso está desactivado: no le aplica.</div>
            </div>
        </div>
    </div>
</div>
```

- [ ] **Step 6: Conectar la ruta, el menú y la carga de permisos**

En `src/app/app.routes.ts`, dentro de los hijos de `security`, después de la línea de `activity-monitor` (agregar coma a la línea anterior):

```ts
                    { path: 'permisos-especiales', loadChildren: () => import('app/modules/admin/security/permisos-especiales/permisos-especiales.routes') }
```

En `src/app/mock-api/common/navigation/data.ts`, en `defaultNavigation`, dentro de los hijos de Seguridad, después de `apps.activity-monitor`:

```ts
            { id: 'apps.permisos-especiales', title: 'Permisos especiales', type: 'basic', icon: 'heroicons_outline:key', link: '/security/permisos-especiales' },
```

En `src/app/layout/layout.component.ts`: agregar `import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';`, inyectarlo (`private _permisosEspeciales = inject(PermisosEspecialesService)`, o por constructor si el archivo no usa `inject`) y, al inicio de `ngOnInit()`, antes del código existente:

```ts
        // Permisos especiales del usuario (para mostrar u ocultar botones); si falla, simplemente no se muestran
        this._permisosEspeciales.cargar().subscribe({ error: () => { /* sin permisos especiales hasta recargar */ } });
```

- [ ] **Step 7: Compilar el front y sus plantillas**

Run: `cd g:/dev/jr/jringenieria && npx tsc -p tsconfig.app.json --noEmit; echo "tsc exit: $?"; npx ngc -p tsconfig.app.json --noEmit; echo "ngc exit: $?"`
Expected: ambos con salida vacía de errores y `exit: 0`.

---

### Task 6: Verificación final y entrega

**Files:** ninguno nuevo.

- [ ] **Step 1: Todas las pruebas juntas**

Run (PowerShell): `cd <pe_test>; dotnet build -c Release --nologo -v q; dotnet bin\Release\net8.0\pe_test.dll` y el comando de utilidades del front.
Expected: `TODAS LAS PRUEBAS PASARON` y `utilidades OK`.

- [ ] **Step 2: Compilación completa**

Run: `cd g:/dev/jr/jr_api/jr_api && dotnet build jr_api.csproj --nologo -v q` y, en el front, `npx tsc -p tsconfig.app.json --noEmit` y `npx ngc -p tsconfig.app.json --noEmit`.
Expected: sin errores.

- [ ] **Step 3: Revisar el SQL que se aplicará**

Run: `cd g:/dev/jr/jr_api/jr_api && dotnet ef migrations script --project jr_api.csproj --context ApplicationDbContext --no-build --from <migración anterior> --to AddPermisosEspeciales`
Expected: solo `CREATE TABLE` de `PermisosEspeciales` y `PermisosEspecialesAsignaciones`, sus índices y las inserciones en `__EFMigrationsHistory`.

- [ ] **Step 4: Lista de archivos de este proyecto y entrega**

Run: `git status --short` en ambos repos y listar solo los archivos de este plan (los de «Archivos»). **No** hacer commit ni push a menos que el usuario lo pida; si lo pide, incluir solo esos archivos (en `jr_api` el árbol trae trabajo ajeno sin commit y `main` va adelante del remoto).

Informar al usuario: qué quedó hecho y qué se probó, que la sincronización y el servicio con base de datos no se ejecutaron contra una base real, y los pasos de despliegue del spec §9 (reconstruir el contenedor; desplegar el front; asignar la vista «Permisos especiales» al rol que administra Seguridad).
