# Documentos de requisiciones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada requisición lleve factura, evidencia y comprobante de pago dentro del ERP, revisados por contabilidad, y que se cierre sola cuando todo esté aprobado y el pago liquidado.

**Architecture:** Reglas puras en el API (documentos requeridos por tipo, estado por tipo, etapa documental, cierre, validación de archivos) con un servicio que guarda archivos y registros; un controlador nuevo bajo `api/SolicitudesCompra/{id}/documentos`; puntos de integración en el servicio de compras (cierre manual, recepción, cambio de pago, lista del tablero); en el front un componente reutilizable de documentación, usado en el detalle del tablero y en la lista de solicitudes, más columna, chip y filtros en el tablero.

**Tech Stack:** .NET 8 / ASP.NET Core / EF Core 8 (SQL Server) en `g:\dev\jr\jr_api\jr_api`; Angular standalone + Tailwind + Material + SweetAlert2 en `g:\dev\jr\jringenieria`.

**Spec:** `docs/superpowers/specs/2026-10-15-documentos-requisiciones-design.md` (en `jringenieria`). Depende del proyecto A (permisos especiales, ya implementado).

## Global Constraints

- Tipos de documento: `Factura` (solo `.pdf`), `Evidencia` y `Pago` (`.pdf`, `.jpg`, `.jpeg`, `.png`). Máximo **10 MB** por archivo. El contenido debe coincidir con la extensión (firma `%PDF`, `FF D8 FF`, `89 50 4E 47`).
- Requeridos: `TipoOperacion = 2` (gasto) → Factura, Pago; `TipoCompra = Servicio` → Factura, Evidencia, Pago; cualquier otro o desconocido → Factura, Evidencia, Pago. La primera regla que coincide gana; tipo de compra sin distinguir mayúsculas, acentos ni espacios sobrantes.
- Estado de un tipo: **Completo** si tiene ≥1 aprobado y 0 pendientes; **EnRevision** si hay pendientes; **Rechazado** si solo hay rechazados; **Falta** si no hay documentos.
- Etapa documental: estatus ≠ 8 y ≠ 11, y (`IdEstatus >= 4` o `EstadoLiquidacion >= 1`), y —si el catálogo define `FechaInicioDocumentacion`— la requisición es de esa fecha en adelante (hoy `null`).
- Cierre automático (estatus 8): etapa documental + `EstadoLiquidacion = 1` + documentación completa. Se evalúa tras subir, aprobar, rechazar, borrar y cambiar el pago. Historial: «Cierre automático: documentación completa y pago liquidado».
- Un documento subido por quien tiene el permiso especial `compras.documentos.revisar` nace **Aprobado** (`AprobadoAutomaticamente = true`). No se confía en nada que mande el front.
- Estatus tras recepción: si es menor que 7 pasa a 7 (historial 7); en 7, 8, 11 o más no cambia.
- Subir/listar/descargar: acceso al módulo = vista `administracion.tablero-compras` **o** `administracion.solicitudes-compra` por algún rol. Aprobar/rechazar: `compras.documentos.revisar`. Borrar: quien lo subió o un revisor, nunca un Aprobado, nunca en requisición cerrada. Rechazar exige comentario (máx. 500). Requisición cerrada: no admite subir, borrar, aprobar ni rechazar.
- Respuestas de error del API: `{ "mensaje": "..." }` en español. 401 sin sesión; 403 sin permiso; 404 no existe; 409 estado no lo permite; 400 dato inválido.
- Los archivos viven en `{RutaArchivos}/Compras/{id}/Documentos/{Tipo}/{guid}{ext}`; el nombre original solo se guarda en la base.
- Las notificaciones usan la existente de compras (solo asunto): «Documento rechazado ({Tipo}): {motivo}» y «Requisición cerrada: documentación completa y pago liquidado». Un fallo al notificar nunca debe impedir aprobar, rechazar o cerrar.
- No se hace commit ni push salvo que el usuario lo pida. Tablas: `SolicitudesCompra_Documentos`.

## Review Focus

- Archivo con extensión permitida pero contenido distinto (ejecutable renombrado a `.pdf`, imagen vacía) → 400, no se guarda. (Task 2)
- Descarga con una ruta guardada que intenta salirse de la carpeta de archivos (`..`) → se niega. (Task 2)
- Requisición cerrada: subir, borrar, aprobar o rechazar → 409; borrar un documento aprobado → 409; rechazar sin motivo → 400; borrar sin ser quien subió ni revisor → 403. (Task 2 y Task 4)
- Un gasto con factura y pago aprobados y liquidado se cierra sin evidencia; una compra no. (Task 2)
- Una recepción nunca reabre ni retrocede una requisición cerrada, rechazada o ya recibida. (Task 2)
- Una requisición sin resumen de documentación (API anterior o fuera de etapa) no rompe la tabla ni el chip. (Task 6)

## Archivos

**API (`g:\dev\jr\jr_api\jr_api`)**
- Create `Models/SolicitudCompraDocumento.cs`; Modify `Data/ApplicationDbContext.cs`; Create `Migrations/*_AddDocumentosRequisicion.cs` (+ Designer); Modify `Migrations/ApplicationDbContextModelSnapshot.cs`.
- Create `Services/Compras/DocumentosRequisicionCatalogo.cs`, `Services/Compras/DocumentosRequisicionRegla.cs`.
- Modify `Seguridad/RequiereVistaAttribute.cs` (acepta varias vistas).
- Create `DTOs/DocumentosRequisicionDtos.cs`; Modify `DTOs/SolicitudesCompraDto.cs` (campo `Documentacion`).
- Create `Services/Compras/IRequisicionDocumentosService.cs`, `Services/Compras/RequisicionDocumentosService.cs`.
- Create `Controllers/SolicitudesCompraDocumentosController.cs`.
- Modify `IServices/ISolicitudesCompraService.cs`, `Services/SolicitudesCompraService.cs`, `Program.cs`.

**Front (`g:\dev\jr\jringenieria`)**
- Create `src/app/core/documentos-requisicion/documentos-requisicion.types.ts`, `.utils.ts`, `.service.ts`.
- Create `src/app/modules/admin/administration/documentos-requisicion/documentos-requisicion.component.ts`, `.component.html`, `documentos-requisicion-dialog.component.ts`.
- Modify `.../tablero-compras/solicitud-detalle-dialog/solicitud-detalle-dialog.component.ts`, `.../tablero-compras/tablero-compras.component.ts`, `.../tablero-compras/tablero-compras.component.html`, `.../solicitudes-compra/models/solicitud-compra.types.ts`, `.../solicitudes-compra/list/list.component.ts`, `.../solicitudes-compra/list/list.component.html`.

**Pruebas (fuera del repo):** `C:\Users\chiva\AppData\Local\Temp\claude\g--dev-jr\52264600-d116-42b0-b0d2-a38f611e9a51\scratchpad\pe_test\` (proyecto web que compila los archivos reales del API; ya existe del proyecto A) y `...\pe_front_test\` (front). No se crea proyecto de pruebas en el repo.

---

### Task 1: Entidad, configuración y migración

**Files:**
- Create: `Models/SolicitudCompraDocumento.cs`
- Modify: `Data/ApplicationDbContext.cs` (DbSet junto a `SolicitudesCompra_Historial`; configuración tras la de `PermisoEspecialAsignacion` en `OnModelCreating`)
- Create (generados): `Migrations/*_AddDocumentosRequisicion.cs`, `.Designer.cs`; Modify: `Migrations/ApplicationDbContextModelSnapshot.cs`

**Interfaces:**
- Produces: `SolicitudCompraDocumento { int IdDocumento; int IdSolicitud; SolicitudCompra Solicitud; string TipoDocumento; string NombreOriginal; string RutaRelativa; long TamanoBytes; int Estatus; int SubidoPor; DateTime FechaSubida; int? RevisadoPor; DateTime? FechaRevision; string? ComentarioRevision; bool AprobadoAutomaticamente }`, `DbSet<SolicitudCompraDocumento> SolicitudesCompra_Documentos`.

- [ ] **Step 1: Crear la entidad**

```csharp
// Models/SolicitudCompraDocumento.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace jr_api.Models
{
    /// <summary>Documento (factura, evidencia o comprobante de pago) subido a una requisición.</summary>
    public class SolicitudCompraDocumento
    {
        [Key]
        public int IdDocumento { get; set; }

        public int IdSolicitud { get; set; }

        [ForeignKey(nameof(IdSolicitud))]
        public SolicitudCompra Solicitud { get; set; } = null!;

        /// <summary>Factura, Evidencia o Pago (ver DocumentosRequisicionCatalogo).</summary>
        [Required, MaxLength(30)]
        public string TipoDocumento { get; set; } = string.Empty;

        [Required, MaxLength(260)]
        public string NombreOriginal { get; set; } = string.Empty;

        /// <summary>Compras/{id}/Documentos/{Tipo}/{guid}{ext}, relativa a RutaArchivos.</summary>
        [Required, MaxLength(400)]
        public string RutaRelativa { get; set; } = string.Empty;

        public long TamanoBytes { get; set; }

        /// <summary>0 Pendiente, 1 Aprobado, 2 Rechazado.</summary>
        public int Estatus { get; set; }

        public int SubidoPor { get; set; }

        public DateTime FechaSubida { get; set; } = DateTime.UtcNow;

        public int? RevisadoPor { get; set; }

        public DateTime? FechaRevision { get; set; }

        [MaxLength(500)]
        public string? ComentarioRevision { get; set; }

        public bool AprobadoAutomaticamente { get; set; }
    }
}
```

- [ ] **Step 2: Registrar el DbSet y configurar índice y relación**

En `Data/ApplicationDbContext.cs`, después de `public DbSet<SolicitudCompraHistorial> SolicitudesCompra_Historial { get; set; }`:

```csharp
    public DbSet<SolicitudCompraDocumento> SolicitudesCompra_Documentos { get; set; }
```

En `OnModelCreating`, después del bloque de `PermisoEspecialAsignacion`:

```csharp
        // Documentos de requisiciones: si se borra la requisición se borran sus documentos
        modelBuilder.Entity<SolicitudCompraDocumento>(e =>
        {
            e.HasIndex(d => new { d.IdSolicitud, d.TipoDocumento })
                .HasDatabaseName("IX_SolicitudesCompra_Documentos_Solicitud_Tipo");
            e.HasOne(d => d.Solicitud).WithMany()
                .HasForeignKey(d => d.IdSolicitud).OnDelete(DeleteBehavior.Cascade);
        });
```

- [ ] **Step 3: Compilar y confirmar el rojo (EF detecta cambios pendientes)**

Run: `cd g:/dev/jr/jr_api/jr_api && dotnet build jr_api.csproj --nologo -v q && dotnet ef migrations has-pending-model-changes --project jr_api.csproj --context ApplicationDbContext --no-build 2>&1 | grep -v "NU190\|No store type\|warn:" | tail -1`
Expected: `Compilación correcta.` y `Changes have been made to the model since the last migration. Add a new migration.`

- [ ] **Step 4: Generar la migración y revisar que solo cree esa tabla**

Run: `dotnet ef migrations add AddDocumentosRequisicion --project jr_api.csproj --context ApplicationDbContext --no-build`, luego `grep -n "CreateTable\|CreateIndex\|AddColumn\|DropColumn\|AlterColumn\|DropTable\|InsertData\|Sql(" Migrations/*_AddDocumentosRequisicion.cs`
Expected: un `CreateTable` (`SolicitudesCompra_Documentos`), dos `CreateIndex` (el compuesto y el de `IdSolicitud` que EF genera para la FK) y un `DropTable`. **Si aparece cualquier otra operación, detenerse** y quitarla.

- [ ] **Step 5: Verde con el binario nuevo**

Run: `dotnet build jr_api.csproj --nologo -v q && dotnet ef migrations has-pending-model-changes --project jr_api.csproj --context ApplicationDbContext --no-build 2>&1 | grep -v "NU190\|No store type\|warn:" | tail -1`
Expected: `No changes have been made to the model since the last migration.` (la comprobación debe correrse **después** de recompilar: con `--no-build` usa el ensamblado ya compilado).

---

### Task 2: Reglas puras (catálogo, regla, validación de archivos) con pruebas

**Files:**
- Create: `Services/Compras/DocumentosRequisicionCatalogo.cs`, `Services/Compras/DocumentosRequisicionRegla.cs`
- Test: `pe_test/RequisicionesPruebas.cs` (+ `pe_test.csproj`, `pe_test/Program.cs`)

**Interfaces:**
- Produces:
  - `record TipoDocumentoDef(string Codigo, string Nombre, string[] Extensiones)`; `record ReglaDocumental(string? TipoCompra, int? TipoOperacion, string[] Requeridos)`.
  - `DocumentosRequisicionCatalogo`: consts `Factura`, `Evidencia`, `Pago`, `PermisoRevisar`, `TamanoMaximoBytes`, `EstatusCerrada = 8`, `EstatusRechazada = 11`; `static DateTime? FechaInicioDocumentacion`; `Tipos`; `Tipo(string?)`; `RequeridosPara(string? tipoCompra, int tipoOperacion) : IReadOnlyList<string>`; `Normalizar(string?) : string`.
  - `record DocumentoInfo(string Tipo, int Estatus)`; `record EstadoTipoDocumento(string Tipo, string Nombre, string Estado, int Total, int Aprobados, int Pendientes, int Rechazados)`; `record EvaluacionDocumental(bool EnEtapaDocumental, bool Completa, IReadOnlyList<EstadoTipoDocumento> Requeridos)`.
  - `DocumentosRequisicionRegla`: consts `EstadoCompleto/EstadoEnRevision/EstadoRechazado/EstadoFalta`, `EstatusPendiente/Aprobado/Rechazado`; `EnEtapaDocumental(int idEstatus, int estadoLiquidacion, DateTime fechaSolicitud, DateTime? fechaInicio)` y su sobrecarga sin `fechaInicio`; `EstadoDeTipo(string, IEnumerable<DocumentoInfo>)`; `Evaluar(string? tipoCompra, int tipoOperacion, int idEstatus, int estadoLiquidacion, DateTime fechaSolicitud, IEnumerable<DocumentoInfo>)`; `DebeCerrarse(EvaluacionDocumental, int estadoLiquidacion)`; `MotivoParaNoCerrar(EvaluacionDocumental, int idEstatus, int estadoLiquidacion) : string?`; `EstatusTrasRecepcion(int)`; `PuedeBorrar(int estatusDocumento, bool requisicionCerrada, bool esSubidor, bool esRevisor) : ResultadoBorrado`; `enum ResultadoBorrado { Permitido, Cerrada, Aprobado, SinPermiso }`; `ValidarArchivo(TipoDocumentoDef, string?, long, byte[]) : string?`; `RutaSegura(string raiz, string relativa) : string?`.

- [ ] **Step 1: Escribir las pruebas (deben fallar: los archivos aún no existen)**

Agregar a `pe_test/pe_test.csproj`:

```xml
    <Compile Include="g:\dev\jr\jr_api\jr_api\Services\Compras\DocumentosRequisicionCatalogo.cs" Link="DocumentosRequisicionCatalogo.cs" />
    <Compile Include="g:\dev\jr\jr_api\jr_api\Services\Compras\DocumentosRequisicionRegla.cs" Link="DocumentosRequisicionRegla.cs" />
```

`pe_test/RequisicionesPruebas.cs`:

```csharp
using jr_api.Services.Compras;

public static class RequisicionesPruebas
{
    static readonly DateTime Hoy = new(2026, 10, 15);
    static DocumentoInfo D(string tipo, int estatus) => new(tipo, estatus);

    public static void Puras()
    {
        // ---- Requeridos por tipo
        string Req(string? tc, int op) => string.Join("+", DocumentosRequisicionCatalogo.RequeridosPara(tc, op));
        Reporte.Check("requeridos: gasto -> Factura+Pago", Req("Material para proyecto", 2) == "Factura+Pago");
        Reporte.Check("requeridos: gasto gana sobre Servicio (orden de reglas)", Req("Servicio", 2) == "Factura+Pago");
        Reporte.Check("requeridos: Servicio -> los tres", Req("Servicio", 1) == "Factura+Evidencia+Pago");
        Reporte.Check("requeridos: ' SERVICIO ' (mayúsculas y espacios) -> los tres", Req("  SERVICIO ", 1) == "Factura+Evidencia+Pago");
        Reporte.Check("requeridos: material -> los tres (por defecto)", Req("Inventario almacén", 1) == "Factura+Evidencia+Pago");
        Reporte.Check("requeridos: nulo o desconocido -> por defecto", Req(null, 1) == "Factura+Evidencia+Pago" && Req("XYZ", 1) == "Factura+Evidencia+Pago");
        Reporte.Check("normalizar: acentos y espacios dobles", DocumentosRequisicionCatalogo.Normalizar("  Servicío   Técnico ") == "servicio tecnico");

        // ---- Etapa documental
        bool E(int est, int liq, DateTime? inicio = null, DateTime? fecha = null) =>
            DocumentosRequisicionRegla.EnEtapaDocumental(est, liq, fecha ?? Hoy, inicio);
        Reporte.Check("etapa: estatus 1 sin pago -> no", !E(1, 0));
        Reporte.Check("etapa: estatus 1 con anticipo -> sí", E(1, 2));
        Reporte.Check("etapa: estatus 1 liquidada -> sí", E(1, 1));
        Reporte.Check("etapa: estatus 3 sin pago -> no", !E(3, 0));
        Reporte.Check("etapa: estatus 4, 5 y 7 -> sí", E(4, 0) && E(5, 0) && E(7, 0));
        Reporte.Check("etapa: cerrada (8) o rechazada (11) -> no, aunque esté pagada", !E(8, 1) && !E(11, 1) && !E(11, 0));
        Reporte.Check("etapa: fecha de inicio exime a las anteriores", !E(4, 1, new DateTime(2026, 11, 1), Hoy) && E(4, 1, new DateTime(2026, 10, 1), Hoy));

        // ---- Estado por tipo
        string Est(params DocumentoInfo[] docs) => DocumentosRequisicionRegla.EstadoDeTipo("Factura", docs).Estado;
        Reporte.Check("tipo: sin documentos -> Falta", Est() == "Falta");
        Reporte.Check("tipo: un pendiente -> EnRevision", Est(D("Factura", 0)) == "EnRevision");
        Reporte.Check("tipo: un aprobado -> Completo", Est(D("Factura", 1)) == "Completo");
        Reporte.Check("tipo: aprobado + pendiente -> EnRevision (no completo)", Est(D("Factura", 1), D("Factura", 0)) == "EnRevision");
        Reporte.Check("tipo: solo rechazado -> Rechazado", Est(D("Factura", 2)) == "Rechazado");
        Reporte.Check("tipo: rechazado + aprobado -> Completo (el rechazado no cuenta)", Est(D("Factura", 2), D("Factura", 1)) == "Completo");
        Reporte.Check("tipo: documentos de otro tipo no cuentan", Est(D("Pago", 1)) == "Falta");
        var cuenta = DocumentosRequisicionRegla.EstadoDeTipo("Factura", new[] { D("Factura", 1), D("Factura", 0), D("Factura", 2) });
        Reporte.Check("tipo: conteos", cuenta.Total == 3 && cuenta.Aprobados == 1 && cuenta.Pendientes == 1 && cuenta.Rechazados == 1);

        // ---- Evaluación y cierre
        var completos = new[] { D("Factura", 1), D("Evidencia", 1), D("Pago", 1) };
        var ev = DocumentosRequisicionRegla.Evaluar("Material", 1, 4, 1, Hoy, completos);
        Reporte.Check("cierre: etapa + liquidada + completa -> cierra", DocumentosRequisicionRegla.DebeCerrarse(ev, 1));
        Reporte.Check("cierre: con anticipo (2) no cierra", !DocumentosRequisicionRegla.DebeCerrarse(ev, 2));
        Reporte.Check("cierre: sin pago (0) no cierra", !DocumentosRequisicionRegla.DebeCerrarse(ev, 0));
        var sinEv = DocumentosRequisicionRegla.Evaluar("Material", 1, 4, 1, Hoy, new[] { D("Factura", 1), D("Pago", 1) });
        Reporte.Check("cierre: compra sin evidencia no cierra", !DocumentosRequisicionRegla.DebeCerrarse(sinEv, 1));
        var gasto = DocumentosRequisicionRegla.Evaluar("Servicio", 2, 4, 1, Hoy, new[] { D("Factura", 1), D("Pago", 1) });
        Reporte.Check("cierre: gasto con factura y pago aprobados cierra sin evidencia", DocumentosRequisicionRegla.DebeCerrarse(gasto, 1));
        var fuera = DocumentosRequisicionRegla.Evaluar("Material", 1, 11, 1, Hoy, completos);
        Reporte.Check("cierre: rechazada no cierra aunque esté completa", !DocumentosRequisicionRegla.DebeCerrarse(fuera, 1));

        // ---- Motivos para no cerrar
        string? M(DocumentosRequisicionRegla_Eval e, int est, int liq) => DocumentosRequisicionRegla.MotivoParaNoCerrar(e.Ev, est, liq);
        Reporte.Check("motivo: todo en orden -> nulo", DocumentosRequisicionRegla.MotivoParaNoCerrar(ev, 4, 1) == null);
        Reporte.Check("motivo: cerrada", DocumentosRequisicionRegla.MotivoParaNoCerrar(ev, 8, 1)!.Contains("ya está cerrada"));
        Reporte.Check("motivo: rechazada", DocumentosRequisicionRegla.MotivoParaNoCerrar(ev, 11, 1)!.Contains("rechazada"));
        var sinNada = DocumentosRequisicionRegla.Evaluar("Material", 1, 1, 0, Hoy, Array.Empty<DocumentoInfo>());
        Reporte.Check("motivo: fuera de etapa -> lo explica", DocumentosRequisicionRegla.MotivoParaNoCerrar(sinNada, 1, 0)!.Contains("etapa"));
        var faltaFactura = DocumentosRequisicionRegla.Evaluar("Material", 1, 4, 0, Hoy, new[] { D("Evidencia", 1), D("Pago", 0) });
        var texto = DocumentosRequisicionRegla.MotivoParaNoCerrar(faltaFactura, 4, 0)!;
        Reporte.Check("motivo: lista lo que falta (factura, pago en revisión, pago sin liquidar)",
            texto.Contains("Factura del proveedor") && texto.Contains("Comprobante de pago") && texto.Contains("pago no está liquidado"), texto);

        // ---- Estatus tras recepción
        int R(int a) => DocumentosRequisicionRegla.EstatusTrasRecepcion(a);
        Reporte.Check("recepción: 1, 4, 5 y 6 pasan a 7", R(1) == 7 && R(4) == 7 && R(5) == 7 && R(6) == 7);
        Reporte.Check("recepción: 7 se queda en 7", R(7) == 7);
        Reporte.Check("recepción: nunca reabre una cerrada ni una rechazada", R(8) == 8 && R(11) == 11);

        // ---- Borrado
        var P = DocumentosRequisicionRegla.PuedeBorrar;
        Reporte.Check("borrar: pendiente por quien lo subió -> permitido", P(0, false, true, false) == ResultadoBorrado.Permitido);
        Reporte.Check("borrar: rechazado por un revisor -> permitido", P(2, false, false, true) == ResultadoBorrado.Permitido);
        Reporte.Check("borrar: ni subidor ni revisor -> sin permiso", P(0, false, false, false) == ResultadoBorrado.SinPermiso);
        Reporte.Check("borrar: aprobado -> no, ni siquiera un revisor", P(1, false, true, true) == ResultadoBorrado.Aprobado);
        Reporte.Check("borrar: requisición cerrada -> no", P(0, true, true, true) == ResultadoBorrado.Cerrada);

        // ---- Validación de archivos
        var pdf = DocumentosRequisicionCatalogo.Tipo("Factura")!;
        var img = DocumentosRequisicionCatalogo.Tipo("Evidencia")!;
        byte[] Pdf = { 0x25, 0x50, 0x44, 0x46, 0x2D }; byte[] Png = { 0x89, 0x50, 0x4E, 0x47, 0x0D }; byte[] Jpg = { 0xFF, 0xD8, 0xFF, 0xE0 };
        Reporte.Check("archivo: PDF válido para factura", DocumentosRequisicionRegla.ValidarArchivo(pdf, "factura.pdf", 1000, Pdf) == null);
        Reporte.Check("archivo: extensión en mayúsculas", DocumentosRequisicionRegla.ValidarArchivo(pdf, "FACTURA.PDF", 1000, Pdf) == null);
        Reporte.Check("archivo: factura en imagen -> no", DocumentosRequisicionRegla.ValidarArchivo(pdf, "foto.jpg", 1000, Jpg)!.Contains("PDF"));
        Reporte.Check("archivo: evidencia PNG y JPG válidas", DocumentosRequisicionRegla.ValidarArchivo(img, "a.png", 10, Png) == null && DocumentosRequisicionRegla.ValidarArchivo(img, "a.jpeg", 10, Jpg) == null);
        Reporte.Check("archivo: ejecutable renombrado a .pdf -> no", DocumentosRequisicionRegla.ValidarArchivo(pdf, "virus.pdf", 1000, new byte[] { 0x4D, 0x5A, 0x90 })!.Contains("no corresponde"));
        Reporte.Check("archivo: .exe -> no", DocumentosRequisicionRegla.ValidarArchivo(img, "setup.exe", 1000, new byte[] { 0x4D, 0x5A })!.Contains("solo se aceptan"));
        Reporte.Check("archivo: vacío -> no", DocumentosRequisicionRegla.ValidarArchivo(pdf, "a.pdf", 0, Array.Empty<byte>())!.Contains("vacío"));
        Reporte.Check("archivo: de más de 10 MB -> no", DocumentosRequisicionRegla.ValidarArchivo(pdf, "a.pdf", 10L * 1024 * 1024 + 1, Pdf)!.Contains("10 MB"));
        Reporte.Check("archivo: exactamente 10 MB -> sí", DocumentosRequisicionRegla.ValidarArchivo(pdf, "a.pdf", 10L * 1024 * 1024, Pdf) == null);
        Reporte.Check("archivo: sin nombre -> no", DocumentosRequisicionRegla.ValidarArchivo(pdf, null, 10, Pdf) != null);

        // ---- Ruta segura (descarga)
        var raiz = Path.Combine(Path.GetTempPath(), "archivos_jr");
        Reporte.Check("ruta: relativa normal -> dentro de la raíz",
            DocumentosRequisicionRegla.RutaSegura(raiz, "Compras/5/Documentos/Factura/a.pdf") is { } r && r.StartsWith(Path.GetFullPath(raiz)));
        Reporte.Check("ruta: con .. que sale de la raíz -> nula", DocumentosRequisicionRegla.RutaSegura(raiz, "Compras/../../etc/passwd") == null);
        Reporte.Check("ruta: absoluta -> nula", DocumentosRequisicionRegla.RutaSegura(raiz, Path.Combine(Path.GetTempPath(), "otra", "a.pdf")) == null);
        Reporte.Check("ruta: vacía -> nula", DocumentosRequisicionRegla.RutaSegura(raiz, "") == null);
    }

    // (alias solo para que la prueba de motivos lea mejor)
    public record DocumentosRequisicionRegla_Eval(EvaluacionDocumental Ev);
}
```

> Nota para el implementador: la línea `string? M(...)` y el record `DocumentosRequisicionRegla_Eval` son restos innecesarios; **bórralos** al pegar (las pruebas de motivos usan directamente `DocumentosRequisicionRegla.MotivoParaNoCerrar`).

En `pe_test/Program.cs`, después de `Pruebas.Puras();` agregar `RequisicionesPruebas.Puras();`.

- [ ] **Step 2: Ejecutar y confirmar el rojo**

Run (PowerShell): `cd <pe_test>; dotnet build -c Release --nologo -v q 2>&1 | Select-String 'error CS2001|error CS0103|error CS0234' | Select-Object -First 3`
Expected: errores de archivo/tipo inexistente.

- [ ] **Step 3: Implementar el catálogo**

```csharp
// Services/Compras/DocumentosRequisicionCatalogo.cs
using System.Globalization;
using System.Text;

namespace jr_api.Services.Compras
{
    public record TipoDocumentoDef(string Codigo, string Nombre, string[] Extensiones);

    /// <summary>TipoCompra / TipoOperacion en null significan "cualquiera". La primera regla que coincide gana.</summary>
    public record ReglaDocumental(string? TipoCompra, int? TipoOperacion, string[] Requeridos);

    /// <summary>
    /// Qué documentos existen y cuáles exige cada tipo de compra. Para soportar un tipo nuevo basta agregar una línea
    /// a <see cref="Reglas"/> (o un tipo de documento a <see cref="Tipos"/>).
    /// </summary>
    public static class DocumentosRequisicionCatalogo
    {
        public const string Factura = "Factura";
        public const string Evidencia = "Evidencia";
        public const string Pago = "Pago";

        /// <summary>Permiso especial (proyecto A) de quien aprueba y rechaza documentos.</summary>
        public const string PermisoRevisar = "compras.documentos.revisar";

        public const long TamanoMaximoBytes = 10L * 1024 * 1024;
        public const int EstatusCerrada = 8;
        public const int EstatusRechazada = 11;

        /// <summary>Si se define, las requisiciones anteriores a esta fecha no piden documentos. Hoy: aplica a todas.</summary>
        public static readonly DateTime? FechaInicioDocumentacion = null;

        public static readonly IReadOnlyList<TipoDocumentoDef> Tipos = new[]
        {
            new TipoDocumentoDef(Factura, "Factura del proveedor", new[] { ".pdf" }),
            new TipoDocumentoDef(Evidencia, "Evidencia de entrega o recepción", new[] { ".pdf", ".jpg", ".jpeg", ".png" }),
            new TipoDocumentoDef(Pago, "Comprobante de pago", new[] { ".pdf", ".jpg", ".jpeg", ".png" }),
        };

        public static readonly string[] RequeridosPorDefecto = { Factura, Evidencia, Pago };

        public static readonly IReadOnlyList<ReglaDocumental> Reglas = new[]
        {
            new ReglaDocumental(null, 2, new[] { Factura, Pago }),                          // Gasto: sin evidencia física
            new ReglaDocumental("Servicio", null, new[] { Factura, Evidencia, Pago }),
        };

        public static TipoDocumentoDef? Tipo(string? codigo) =>
            Tipos.FirstOrDefault(t => string.Equals(t.Codigo, codigo, StringComparison.OrdinalIgnoreCase));

        public static IReadOnlyList<string> RequeridosPara(string? tipoCompra, int tipoOperacion)
        {
            var normalizado = Normalizar(tipoCompra);
            foreach (var regla in Reglas)
            {
                if (regla.TipoOperacion.HasValue && regla.TipoOperacion.Value != tipoOperacion) continue;
                if (regla.TipoCompra != null && Normalizar(regla.TipoCompra) != normalizado) continue;
                return regla.Requeridos;
            }
            return RequeridosPorDefecto;
        }

        /// <summary>Minúsculas, sin acentos y con los espacios colapsados.</summary>
        public static string Normalizar(string? texto)
        {
            if (string.IsNullOrWhiteSpace(texto)) return string.Empty;
            var descompuesto = texto.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder(descompuesto.Length);
            foreach (var c in descompuesto)
                if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark) sb.Append(c);
            return string.Join(' ', sb.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries));
        }
    }
}
```

- [ ] **Step 4: Implementar la regla**

```csharp
// Services/Compras/DocumentosRequisicionRegla.cs
namespace jr_api.Services.Compras
{
    public record DocumentoInfo(string Tipo, int Estatus);

    public record EstadoTipoDocumento(string Tipo, string Nombre, string Estado, int Total, int Aprobados, int Pendientes, int Rechazados);

    public record EvaluacionDocumental(bool EnEtapaDocumental, bool Completa, IReadOnlyList<EstadoTipoDocumento> Requeridos);

    public enum ResultadoBorrado { Permitido, Cerrada, Aprobado, SinPermiso }

    /// <summary>Reglas de negocio de los documentos de una requisición. Funciones puras (sin base de datos ni disco).</summary>
    public static class DocumentosRequisicionRegla
    {
        public const string EstadoCompleto = "Completo";
        public const string EstadoEnRevision = "EnRevision";
        public const string EstadoRechazado = "Rechazado";
        public const string EstadoFalta = "Falta";

        public const int EstatusPendiente = 0;
        public const int EstatusAprobado = 1;
        public const int EstatusRechazado = 2;

        public static bool EnEtapaDocumental(int idEstatus, int estadoLiquidacion, DateTime fechaSolicitud) =>
            EnEtapaDocumental(idEstatus, estadoLiquidacion, fechaSolicitud, DocumentosRequisicionCatalogo.FechaInicioDocumentacion);

        /// <summary>La requisición ya se compró o se pagó, y no está cerrada ni rechazada.</summary>
        public static bool EnEtapaDocumental(int idEstatus, int estadoLiquidacion, DateTime fechaSolicitud, DateTime? fechaInicio)
        {
            if (idEstatus == DocumentosRequisicionCatalogo.EstatusCerrada || idEstatus == DocumentosRequisicionCatalogo.EstatusRechazada) return false;
            if (fechaInicio.HasValue && fechaSolicitud < fechaInicio.Value) return false;
            return idEstatus >= 4 || estadoLiquidacion >= 1;
        }

        public static EstadoTipoDocumento EstadoDeTipo(string tipo, IEnumerable<DocumentoInfo> documentos)
        {
            var propios = documentos.Where(d => string.Equals(d.Tipo, tipo, StringComparison.OrdinalIgnoreCase)).ToList();
            var aprobados = propios.Count(d => d.Estatus == EstatusAprobado);
            var pendientes = propios.Count(d => d.Estatus == EstatusPendiente);
            var rechazados = propios.Count(d => d.Estatus == EstatusRechazado);

            var estado = pendientes > 0 ? EstadoEnRevision
                       : aprobados > 0 ? EstadoCompleto
                       : rechazados > 0 ? EstadoRechazado
                       : EstadoFalta;

            var nombre = DocumentosRequisicionCatalogo.Tipo(tipo)?.Nombre ?? tipo;
            return new EstadoTipoDocumento(tipo, nombre, estado, propios.Count, aprobados, pendientes, rechazados);
        }

        public static EvaluacionDocumental Evaluar(
            string? tipoCompra, int tipoOperacion, int idEstatus, int estadoLiquidacion,
            DateTime fechaSolicitud, IEnumerable<DocumentoInfo> documentos)
        {
            var lista = documentos.ToList();
            var requeridos = DocumentosRequisicionCatalogo.RequeridosPara(tipoCompra, tipoOperacion)
                .Select(t => EstadoDeTipo(t, lista))
                .ToList();

            return new EvaluacionDocumental(
                EnEtapaDocumental(idEstatus, estadoLiquidacion, fechaSolicitud),
                requeridos.All(r => r.Estado == EstadoCompleto),
                requeridos);
        }

        public static bool DebeCerrarse(EvaluacionDocumental evaluacion, int estadoLiquidacion) =>
            evaluacion.EnEtapaDocumental && estadoLiquidacion == 1 && evaluacion.Completa;

        /// <summary>null = la requisición puede cerrarse. Si no, explica qué falta (para el cierre manual).</summary>
        public static string? MotivoParaNoCerrar(EvaluacionDocumental evaluacion, int idEstatus, int estadoLiquidacion)
        {
            if (idEstatus == DocumentosRequisicionCatalogo.EstatusCerrada) return "La requisición ya está cerrada.";
            if (idEstatus == DocumentosRequisicionCatalogo.EstatusRechazada) return "La requisición está rechazada y no se puede cerrar.";
            if (!evaluacion.EnEtapaDocumental)
                return "La requisición aún no está en etapa de documentación (necesita estar aprobada o tener un pago registrado).";

            var faltas = new List<string>();
            foreach (var r in evaluacion.Requeridos.Where(r => r.Estado != EstadoCompleto))
                faltas.Add(r.Estado == EstadoEnRevision ? $"{r.Nombre} pendiente de revisión" : $"falta {r.Nombre} aprobada");
            if (estadoLiquidacion != 1) faltas.Add("el pago no está liquidado");

            return faltas.Count == 0 ? null : "No se puede cerrar: " + string.Join("; ", faltas) + ".";
        }

        /// <summary>Estatus que debe quedar tras registrar una recepción: nunca retrocede ni reabre una cerrada o rechazada.</summary>
        public static int EstatusTrasRecepcion(int estatusActual) => estatusActual < 7 ? 7 : estatusActual;

        public static ResultadoBorrado PuedeBorrar(int estatusDocumento, bool requisicionCerrada, bool esSubidor, bool esRevisor)
        {
            if (requisicionCerrada) return ResultadoBorrado.Cerrada;
            if (estatusDocumento == EstatusAprobado) return ResultadoBorrado.Aprobado;
            if (!esSubidor && !esRevisor) return ResultadoBorrado.SinPermiso;
            return ResultadoBorrado.Permitido;
        }

        /// <summary>null = el archivo es válido; si no, el motivo para mostrarle al usuario.</summary>
        public static string? ValidarArchivo(TipoDocumentoDef tipo, string? nombreArchivo, long tamano, byte[] inicio)
        {
            if (string.IsNullOrWhiteSpace(nombreArchivo)) return "El archivo no tiene nombre.";
            if (tamano <= 0) return "El archivo está vacío.";
            if (tamano > DocumentosRequisicionCatalogo.TamanoMaximoBytes)
                return $"El archivo pesa {tamano / 1024d / 1024d:0.0} MB y el máximo permitido es 10 MB.";

            var extension = Path.GetExtension(nombreArchivo).ToLowerInvariant();
            if (!tipo.Extensiones.Contains(extension))
                return $"Para «{tipo.Nombre}» solo se aceptan archivos {string.Join(", ", tipo.Extensiones.Select(e => e.TrimStart('.').ToUpperInvariant()))}.";

            bool Empieza(params byte[] firma) => inicio.Length >= firma.Length && inicio.Take(firma.Length).SequenceEqual(firma);
            var coincide = extension switch
            {
                ".pdf" => Empieza(0x25, 0x50, 0x44, 0x46),
                ".png" => Empieza(0x89, 0x50, 0x4E, 0x47),
                ".jpg" or ".jpeg" => Empieza(0xFF, 0xD8, 0xFF),
                _ => false
            };

            return coincide ? null : "El contenido del archivo no corresponde a su extensión.";
        }

        /// <summary>Ruta física dentro de la raíz de archivos; null si la ruta intenta salirse de ella (por ejemplo con "..").</summary>
        public static string? RutaSegura(string raiz, string? relativa)
        {
            if (string.IsNullOrWhiteSpace(raiz) || string.IsNullOrWhiteSpace(relativa)) return null;
            if (Path.IsPathRooted(relativa)) return null;

            var raizCompleta = Path.GetFullPath(raiz).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;
            var completa = Path.GetFullPath(Path.Combine(raiz, relativa));
            return completa.StartsWith(raizCompleta, StringComparison.OrdinalIgnoreCase) ? completa : null;
        }
    }
}
```

- [ ] **Step 5: Ejecutar y confirmar el verde**

Run (PowerShell): `cd <pe_test>; Remove-Item bin,obj -Recurse -Force -ErrorAction SilentlyContinue; dotnet build -c Release --nologo -v q; dotnet bin\Release\net8.0\pe_test.dll | Select-String 'FALLA|PASARON|FALLARON'`
Expected: `TODAS LAS PRUEBAS PASARON` y ninguna línea `FALLA`.

---

### Task 3: `RequiereVista` acepta varias vistas (con pruebas)

**Files:**
- Modify: `Seguridad/RequiereVistaAttribute.cs`
- Test: `pe_test/HostDePrueba.cs`, `pe_test/Program.cs`

**Interfaces:**
- Consumes (proyecto A): `IPermisosEspecialesService.UsuarioTieneVistaAsync(int, string)`, `UsuarioActual.TryObtenerId`.
- Produces: `[RequiereVista(params string[] nombresVista)]` — basta tener una de las vistas. Con una sola vista se comporta igual que antes.

- [ ] **Step 1: Pruebas primero (no compilan con la firma actual `string`)**

En `pe_test/HostDePrueba.cs`, dentro de `ControladorDePrueba` agregar:

```csharp
    [HttpGet("vistas-alguna")]
    [RequiereVista("no.existe.a", "apps.permisos-especiales")]
    public IActionResult VistasAlguna() => Ok(new { mensaje = "pasó" });

    [HttpGet("vistas-ninguna")]
    [RequiereVista("no.existe.a", "no.existe.b")]
    public IActionResult VistasNinguna() => Ok(new { mensaje = "pasó" });
```

En `pe_test/Program.cs`, tras las pruebas de `RequiereVista`:

```csharp
        r = await Llamar(HttpMethod.Get, "/probar/vistas-alguna", "14");
        Reporte.Check("vistas: tiene una de las dos -> 200", r.status == 200, r.cuerpo);
        r = await Llamar(HttpMethod.Get, "/probar/vistas-alguna", "99");
        Reporte.Check("vistas: no tiene ninguna -> 403", r.status == 403, r.cuerpo);
        r = await Llamar(HttpMethod.Get, "/probar/vistas-ninguna", "14");
        Reporte.Check("vistas: ninguna de las dos existe para el usuario -> 403", r.status == 403, r.cuerpo);
        r = await Llamar(HttpMethod.Get, "/probar/vistas-alguna", null);
        Reporte.Check("vistas: sin sesión -> 401", r.status == 401, r.cuerpo);
```

- [ ] **Step 2: Confirmar el rojo**

Run: `dotnet build -c Release --nologo -v q 2>&1 | Select-String 'error CS' | Select-Object -First 2` (en `pe_test`)
Expected: error de compilación por los dos argumentos del atributo.

- [ ] **Step 3: Implementar**

```csharp
// Seguridad/RequiereVistaAttribute.cs  (reemplaza el contenido)
using jr_api.Services.PermisosEspeciales;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace jr_api.Seguridad
{
    /// <summary>
    /// Exige que el usuario tenga, por alguno de sus roles, al menos una de las vistas indicadas (el mismo mecanismo
    /// que habilita el menú). Sin sesión: 401. Sin ninguna de las vistas: 403.
    /// </summary>
    public class RequiereVistaAttribute : TypeFilterAttribute
    {
        public RequiereVistaAttribute(params string[] nombresVista) : base(typeof(RequiereVistaFilter))
        {
            Arguments = new object[] { nombresVista };
        }
    }

    public class RequiereVistaFilter : IAsyncAuthorizationFilter
    {
        private readonly string[] _nombresVista;
        private readonly IPermisosEspecialesService _servicio;

        public RequiereVistaFilter(string[] nombresVista, IPermisosEspecialesService servicio)
        {
            _nombresVista = nombresVista;
            _servicio = servicio;
        }

        public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
            if (!UsuarioActual.TryObtenerId(context.HttpContext.User, out var usuarioId))
            {
                context.Result = new UnauthorizedObjectResult(new { mensaje = "Inicia sesión para continuar." });
                return;
            }

            foreach (var vista in _nombresVista)
                if (await _servicio.UsuarioTieneVistaAsync(usuarioId, vista)) return;

            context.Result = new ObjectResult(new { mensaje = "No tienes acceso a esta sección." })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
        }
    }
}
```

- [ ] **Step 4: Verde (incluye las pruebas de los proyectos anteriores)**

Run (PowerShell): `cd <pe_test>; Remove-Item bin,obj -Recurse -Force -ErrorAction SilentlyContinue; dotnet build -c Release --nologo -v q; dotnet bin\Release\net8.0\pe_test.dll | Select-String 'FALLA|PASARON|FALLARON'`
Expected: `TODAS LAS PRUEBAS PASARON`. Compilar también el API: `dotnet build jr_api.csproj --nologo -v q` → 0 errores (el controlador de A sigue usando `[RequiereVista(VistaAdministracion)]` con una sola vista).

---

### Task 4: DTOs, servicio de documentos y controlador (con pruebas del controlador)

**Files:**
- Create: `DTOs/DocumentosRequisicionDtos.cs`, `Services/Compras/IRequisicionDocumentosService.cs`, `Services/Compras/RequisicionDocumentosService.cs`, `Controllers/SolicitudesCompraDocumentosController.cs`
- Modify: `DTOs/SolicitudesCompraDto.cs` (campo `Documentacion` en `SolicitudCompraResponseDto`), `IServices/ISolicitudesCompraService.cs` (método `NotificarRequisicionAsync`), `Program.cs` (registro)
- Test: `pe_test/HostDePrueba.cs`, `pe_test/Program.cs`, `pe_test.csproj`

**Interfaces:**
- Consumes: `DocumentosRequisicionCatalogo/Regla` (Task 2), `[RequiereVista]` varias vistas (Task 3), `IPermisosEspecialesService` y `[RequierePermisoEspecial]` (proyecto A), `UsuarioActual`.
- Produces: DTOs en `jr_api.DTOs.Compras`: `DocumentoRequisicionDto`, `TipoRequeridoDto`, `DocumentacionRequisicionDto`, `ResumenTipoDto`, `ResumenDocumentacionDto`, `RechazarDocumentoDto`; `IRequisicionDocumentosService`; rutas `api/SolicitudesCompra/{idSolicitud}/documentos` (`GET`, `POST`, `GET {idDocumento}/descargar`, `DELETE {idDocumento}`, `POST {idDocumento}/aprobar`, `POST {idDocumento}/rechazar`).

- [ ] **Step 1: DTOs e interfaces**

```csharp
// DTOs/DocumentosRequisicionDtos.cs
namespace jr_api.DTOs.Compras
{
    public class DocumentoRequisicionDto
    {
        public int IdDocumento { get; set; }
        public string TipoDocumento { get; set; } = string.Empty;
        public string NombreOriginal { get; set; } = string.Empty;
        public long TamanoBytes { get; set; }
        /// <summary>Pendiente, Aprobado o Rechazado.</summary>
        public string Estatus { get; set; } = string.Empty;
        public int SubidoPor { get; set; }
        public string? NombreSubidoPor { get; set; }
        public DateTime FechaSubida { get; set; }
        public int? RevisadoPor { get; set; }
        public string? NombreRevisor { get; set; }
        public DateTime? FechaRevision { get; set; }
        public string? ComentarioRevision { get; set; }
        public bool AprobadoAutomaticamente { get; set; }
    }

    public class TipoRequeridoDto
    {
        public string Tipo { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public string[] Extensiones { get; set; } = Array.Empty<string>();
        /// <summary>Completo, EnRevision, Rechazado o Falta.</summary>
        public string Estado { get; set; } = string.Empty;
        public int Total { get; set; }
        public int Aprobados { get; set; }
        public int Pendientes { get; set; }
        public int Rechazados { get; set; }
    }

    public class DocumentacionRequisicionDto
    {
        public int IdSolicitud { get; set; }
        /// <summary>La requisición ya está en etapa documental (se compró o se pagó, y no está cerrada ni rechazada).</summary>
        public bool Aplica { get; set; }
        public bool Completa { get; set; }
        public bool Cerrada { get; set; }
        public int EstadoLiquidacion { get; set; }
        public List<TipoRequeridoDto> Requeridos { get; set; } = new();
        public List<DocumentoRequisicionDto> Documentos { get; set; } = new();
        /// <summary>Qué falta para poder cerrarla; null si ya puede cerrarse.</summary>
        public string? MotivoNoCierre { get; set; }
    }

    public class ResumenTipoDto
    {
        public string Tipo { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public string Estado { get; set; } = string.Empty;
    }

    /// <summary>Resumen que viaja con cada requisición de la lista del tablero.</summary>
    public class ResumenDocumentacionDto
    {
        public bool Aplica { get; set; }
        public bool Completa { get; set; }
        public int RequeridosCompletos { get; set; }
        public int RequeridosTotal { get; set; }
        public List<ResumenTipoDto> Requeridos { get; set; } = new();
    }

    public class RechazarDocumentoDto
    {
        public string? Comentario { get; set; }
    }
}
```

En `DTOs/SolicitudesCompraDto.cs`, dentro de `SolicitudCompraResponseDto`, después de `public FacturaOrdenCompraContpaqDto? DatosFacturaContpaqi { get; set; }`:

```csharp
        public jr_api.DTOs.Compras.ResumenDocumentacionDto? Documentacion { get; set; }
```

```csharp
// Services/Compras/IRequisicionDocumentosService.cs
using jr_api.DTOs.Compras;
using jr_api.Models;

namespace jr_api.Services.Compras
{
    /// <summary>
    /// Documentos de una requisición. Excepciones: KeyNotFoundException = no existe; InvalidOperationException = el estado
    /// no lo permite; ArgumentException = dato inválido; UnauthorizedAccessException = sin permiso para esa acción.
    /// </summary>
    public interface IRequisicionDocumentosService
    {
        Task<DocumentacionRequisicionDto> ObtenerAsync(int idSolicitud);
        Task<DocumentoRequisicionDto> SubirAsync(int idSolicitud, string? tipo, IFormFile? archivo, int usuarioId);
        Task<(Stream Contenido, string NombreOriginal, string ContentType)> DescargarAsync(int idSolicitud, int idDocumento);
        Task EliminarAsync(int idSolicitud, int idDocumento, int usuarioId);
        Task<DocumentoRequisicionDto> AprobarAsync(int idSolicitud, int idDocumento, int usuarioId);
        Task<DocumentoRequisicionDto> RechazarAsync(int idSolicitud, int idDocumento, string? comentario, int usuarioId);

        /// <summary>Cierra la requisición si cumple todo (etapa, pago liquidado, documentación completa). true si la cerró.</summary>
        Task<bool> EvaluarCierreAsync(int idSolicitud, int usuarioId);

        /// <summary>null = puede cerrarse; si no, lo que falta (para el cierre manual).</summary>
        Task<string?> MotivoParaNoCerrarAsync(int idSolicitud);

        /// <summary>Resumen de documentación de varias requisiciones con una sola consulta (para la lista del tablero).</summary>
        Task<IReadOnlyDictionary<int, ResumenDocumentacionDto>> ResumenesAsync(IReadOnlyCollection<SolicitudCompra> solicitudes);
    }
}
```

En `IServices/ISolicitudesCompraService.cs`, agregar al final de la interfaz:

```csharp
        /// <summary>Avisa a los usuarios indicados sobre una requisición con la notificación existente (el motivo viaja en el asunto).</summary>
        Task NotificarRequisicionAsync(int idSolicitud, List<int> usuarioIds, string asunto);
```

- [ ] **Step 2: Pruebas del controlador con servicio falso (deben fallar: el controlador aún no existe)**

En `pe_test.csproj` agregar:

```xml
    <Compile Include="g:\dev\jr\jr_api\jr_api\DTOs\DocumentosRequisicionDtos.cs" Link="DocumentosRequisicionDtos.cs" />
    <Compile Include="g:\dev\jr\jr_api\jr_api\Services\Compras\IRequisicionDocumentosService.cs" Link="IRequisicionDocumentosService.cs" />
    <Compile Include="g:\dev\jr\jr_api\jr_api\Controllers\SolicitudesCompraDocumentosController.cs" Link="SolicitudesCompraDocumentosController.cs" />
```

> `IRequisicionDocumentosService` usa `jr_api.Models.SolicitudCompra` en `ResumenesAsync`; para que compile en el proyecto de pruebas agregar también `<Compile Include="g:\dev\jr\jr_api\jr_api\Models\SolicitudCompra.cs" Link="SolicitudCompra.cs" />` y, si el compilador lo pide, los modelos mínimos que referencia (`Usuario`, `Cat_EstatusCompra`, `SeguimientoProyecto`, `SolicitudCompraDetalle`, `SolicitudCompraProveedor`, `SolicitudCompraAnticipo`). **Si esa cadena crece, sustituir** `IReadOnlyCollection<SolicitudCompra>` en la interfaz por `IReadOnlyCollection<SolicitudResumenEntrada>` (un `record` de `Services/Compras` con `IdSolicitud, IdEstatus, EstadoLiquidacion, TipoCompra, TipoOperacion, FechaSolicitud`) y construirlo en el servicio de compras; es lo que se prefiere, porque desacopla el servicio de las entidades.

Para evitar esa cadena desde el inicio, **usar el record**: agregar a `IRequisicionDocumentosService.cs`

```csharp
    public record SolicitudResumenEntrada(int IdSolicitud, int IdEstatus, int EstadoLiquidacion, string? TipoCompra, int TipoOperacion, DateTime FechaSolicitud);
```

y cambiar la firma a `Task<IReadOnlyDictionary<int, ResumenDocumentacionDto>> ResumenesAsync(IReadOnlyCollection<SolicitudResumenEntrada> solicitudes);` (y quitar el `using jr_api.Models;`).

Servicio falso en `pe_test/HostDePrueba.cs` (usuario 14: revisor y con acceso; 99: sin vistas; requisición 5 abierta; 6 cerrada):

```csharp
public class DocumentosFalso : jr_api.Services.Compras.IRequisicionDocumentosService
{
    public Task<jr_api.DTOs.Compras.DocumentacionRequisicionDto> ObtenerAsync(int id) =>
        id == 404 ? throw new KeyNotFoundException("La requisición 404 no existe.")
                  : Task.FromResult(new jr_api.DTOs.Compras.DocumentacionRequisicionDto { IdSolicitud = id, Aplica = true });
    public Task<jr_api.DTOs.Compras.DocumentoRequisicionDto> SubirAsync(int id, string? tipo, IFormFile? archivo, int usuarioId)
    {
        if (archivo == null) throw new ArgumentException("Selecciona un archivo.");
        if (string.IsNullOrWhiteSpace(tipo)) throw new ArgumentException("Indica el tipo de documento.");
        if (id == 6) throw new InvalidOperationException("La requisición está cerrada: ya no se pueden subir documentos.");
        return Task.FromResult(new jr_api.DTOs.Compras.DocumentoRequisicionDto { IdDocumento = 9, TipoDocumento = tipo, NombreOriginal = archivo.FileName, SubidoPor = usuarioId, Estatus = "Pendiente" });
    }
    public Task<(Stream Contenido, string NombreOriginal, string ContentType)> DescargarAsync(int id, int idDoc) =>
        idDoc == 404 ? throw new KeyNotFoundException("El documento 404 no existe.")
                     : Task.FromResult<(Stream, string, string)>((new MemoryStream(new byte[] { 0x25, 0x50, 0x44, 0x46 }), "factura.pdf", "application/pdf"));
    public Task EliminarAsync(int id, int idDoc, int usuarioId)
    {
        if (idDoc == 403) throw new UnauthorizedAccessException("Solo quien subió el documento o un revisor puede borrarlo.");
        if (idDoc == 409) throw new InvalidOperationException("Un documento aprobado no se puede borrar.");
        if (idDoc == 404) throw new KeyNotFoundException("El documento 404 no existe.");
        return Task.CompletedTask;
    }
    public Task<jr_api.DTOs.Compras.DocumentoRequisicionDto> AprobarAsync(int id, int idDoc, int usuarioId) =>
        idDoc == 404 ? throw new KeyNotFoundException("El documento 404 no existe.")
                     : Task.FromResult(new jr_api.DTOs.Compras.DocumentoRequisicionDto { IdDocumento = idDoc, Estatus = "Aprobado", RevisadoPor = usuarioId });
    public Task<jr_api.DTOs.Compras.DocumentoRequisicionDto> RechazarAsync(int id, int idDoc, string? comentario, int usuarioId)
    {
        if (string.IsNullOrWhiteSpace(comentario)) throw new ArgumentException("Escribe el motivo del rechazo.");
        return Task.FromResult(new jr_api.DTOs.Compras.DocumentoRequisicionDto { IdDocumento = idDoc, Estatus = "Rechazado", ComentarioRevision = comentario });
    }
    public Task<bool> EvaluarCierreAsync(int id, int usuarioId) => Task.FromResult(false);
    public Task<string?> MotivoParaNoCerrarAsync(int id) => Task.FromResult<string?>(null);
    public Task<IReadOnlyDictionary<int, jr_api.DTOs.Compras.ResumenDocumentacionDto>> ResumenesAsync(IReadOnlyCollection<jr_api.Services.Compras.SolicitudResumenEntrada> s) =>
        Task.FromResult<IReadOnlyDictionary<int, jr_api.DTOs.Compras.ResumenDocumentacionDto>>(new Dictionary<int, jr_api.DTOs.Compras.ResumenDocumentacionDto>());
}
```

En el `ServicioFalso` de A, agregar el acceso a las dos vistas del módulo para el usuario 14: cambiar `UsuarioTieneVistaAsync` a

```csharp
    public Task<bool> UsuarioTieneVistaAsync(int usuarioId, string nombreVista) =>
        Task.FromResult(usuarioId == 14 && (nombreVista == "apps.permisos-especiales" || nombreVista == "administracion.tablero-compras"));
```

Y el usuario 15 tiene acceso al módulo pero **no** es revisor: añadir `|| (usuarioId == 15 && nombreVista == "administracion.solicitudes-compra")`.

En `pe_test/Program.cs` registrar `builder.Services.AddSingleton<jr_api.Services.Compras.IRequisicionDocumentosService, DocumentosFalso>();` y agregar las pruebas:

```csharp
        // ---- Documentos de requisiciones (controlador real, servicio falso)
        const string docs = "/api/SolicitudesCompra/5/documentos";
        r = await Llamar(HttpMethod.Get, docs, null);
        Reporte.Check("docs: sin sesión -> 401", r.status == 401, r.cuerpo);
        r = await Llamar(HttpMethod.Get, docs, "99");
        Reporte.Check("docs: sin acceso al módulo -> 403", r.status == 403, r.cuerpo);
        r = await Llamar(HttpMethod.Get, docs, "15");
        Reporte.Check("docs: acceso por la vista de solicitudes -> 200", r.status == 200, r.cuerpo);
        r = await Llamar(HttpMethod.Get, "/api/SolicitudesCompra/404/documentos", "14");
        Reporte.Check("docs: requisición inexistente -> 404 con mensaje", r.status == 404 && r.cuerpo.Contains("mensaje"), r.cuerpo);

        async Task<(int status, string cuerpo)> Subir(string ruta, string? usuario, string? tipo, bool conArchivo)
        {
            var form = new MultipartFormDataContent();
            if (tipo != null) form.Add(new StringContent(tipo), "tipo");
            if (conArchivo) { var parte = new ByteArrayContent(new byte[] { 0x25, 0x50, 0x44, 0x46 }); parte.Headers.ContentType = new("application/pdf"); form.Add(parte, "archivo", "factura.pdf"); }
            var req = new HttpRequestMessage(HttpMethod.Post, ruta) { Content = form };
            if (usuario != null) req.Headers.Add("X-Usuario", usuario);
            var resp = await http.SendAsync(req);
            return ((int)resp.StatusCode, await resp.Content.ReadAsStringAsync());
        }
        r = await Subir(docs, "15", "Factura", true);
        Reporte.Check("subir: usuario con acceso (no revisor) -> 200 y guarda quién subió (15)", r.status == 200 && r.cuerpo.Contains("\"subidoPor\":15"), r.cuerpo);
        r = await Subir(docs, "99", "Factura", true);
        Reporte.Check("subir: sin acceso al módulo -> 403", r.status == 403, r.cuerpo);
        r = await Subir(docs, "14", "Factura", false);
        Reporte.Check("subir: sin archivo -> 400 con mensaje", r.status == 400 && r.cuerpo.Contains("Selecciona un archivo"), r.cuerpo);
        r = await Subir(docs, "14", null, true);
        Reporte.Check("subir: sin tipo -> 400 con mensaje", r.status == 400 && r.cuerpo.Contains("mensaje"), r.cuerpo);
        r = await Subir("/api/SolicitudesCompra/6/documentos", "14", "Factura", true);
        Reporte.Check("subir: requisición cerrada -> 409", r.status == 409, r.cuerpo);

        r = await Llamar(HttpMethod.Get, $"{docs}/1/descargar", "15");
        Reporte.Check("descargar: ok -> 200 PDF", r.status == 200 && r.cuerpo.StartsWith("%PDF"), r.cuerpo);
        r = await Llamar(HttpMethod.Get, $"{docs}/404/descargar", "15");
        Reporte.Check("descargar: inexistente -> 404", r.status == 404, r.cuerpo);

        r = await Llamar(HttpMethod.Delete, $"{docs}/1", "15");
        Reporte.Check("borrar: ok -> 200", r.status == 200, r.cuerpo);
        r = await Llamar(HttpMethod.Delete, $"{docs}/403", "15");
        Reporte.Check("borrar: sin ser quien lo subió ni revisor -> 403 con mensaje", r.status == 403 && r.cuerpo.Contains("mensaje"), r.cuerpo);
        r = await Llamar(HttpMethod.Delete, $"{docs}/409", "14");
        Reporte.Check("borrar: documento aprobado -> 409", r.status == 409, r.cuerpo);
        r = await Llamar(HttpMethod.Delete, $"{docs}/404", "14");
        Reporte.Check("borrar: inexistente -> 404", r.status == 404, r.cuerpo);

        r = await Llamar(HttpMethod.Post, $"{docs}/1/aprobar", "14");
        Reporte.Check("aprobar: revisor -> 200 y guarda quién revisó (14)", r.status == 200 && r.cuerpo.Contains("\"revisadoPor\":14"), r.cuerpo);
        r = await Llamar(HttpMethod.Post, $"{docs}/1/aprobar", "15");
        Reporte.Check("aprobar: usuario con acceso pero sin el permiso especial -> 403", r.status == 403 && r.cuerpo.Contains("permiso especial"), r.cuerpo);
        r = await Llamar(HttpMethod.Post, $"{docs}/1/aprobar", null);
        Reporte.Check("aprobar: sin sesión -> 401", r.status == 401, r.cuerpo);
        r = await Llamar(HttpMethod.Post, $"{docs}/1/rechazar", "14", "{\"comentario\":\"Falta el RFC\"}");
        Reporte.Check("rechazar: con motivo -> 200", r.status == 200 && r.cuerpo.Contains("Falta el RFC"), r.cuerpo);
        r = await Llamar(HttpMethod.Post, $"{docs}/1/rechazar", "14", "{\"comentario\":\"  \"}");
        Reporte.Check("rechazar: sin motivo -> 400 con mensaje", r.status == 400 && r.cuerpo.Contains("motivo"), r.cuerpo);
        r = await Llamar(HttpMethod.Post, $"{docs}/1/rechazar", "15", "{\"comentario\":\"x\"}");
        Reporte.Check("rechazar: sin el permiso especial -> 403", r.status == 403, r.cuerpo);
```

- [ ] **Step 3: Confirmar el rojo**

Run (PowerShell, en `pe_test`): `dotnet build -c Release --nologo -v q 2>&1 | Select-String 'error CS2001' | Select-Object -First 2`
Expected: falta `SolicitudesCompraDocumentosController.cs`.

- [ ] **Step 4: Implementar el controlador**

```csharp
// Controllers/SolicitudesCompraDocumentosController.cs
using jr_api.DTOs.Compras;
using jr_api.Seguridad;
using jr_api.Services.Compras;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace jr_api.Controllers
{
    /// <summary>
    /// Documentos (factura, evidencia, comprobante de pago) de una requisición. Subir, ver y descargar lo puede hacer
    /// cualquier usuario con acceso al módulo de compras; aprobar y rechazar solo quien tenga el permiso especial de revisión.
    /// </summary>
    [ApiController]
    [Route("api/SolicitudesCompra/{idSolicitud:int}/documentos")]
    [Authorize]
    [RequiereVista("administracion.tablero-compras", "administracion.solicitudes-compra")]
    public class SolicitudesCompraDocumentosController : ControllerBase
    {
        private readonly IRequisicionDocumentosService _servicio;

        public SolicitudesCompraDocumentosController(IRequisicionDocumentosService servicio)
        {
            _servicio = servicio;
        }

        [HttpGet]
        public Task<IActionResult> Obtener(int idSolicitud) =>
            Ejecutar(async () => Ok(await _servicio.ObtenerAsync(idSolicitud)));

        [HttpPost]
        [RequestSizeLimit(12 * 1024 * 1024)]
        public Task<IActionResult> Subir(int idSolicitud, [FromForm] string? tipo, IFormFile? archivo) =>
            EjecutarConUsuario(async usuarioId => Ok(await _servicio.SubirAsync(idSolicitud, tipo, archivo, usuarioId)));

        [HttpGet("{idDocumento:int}/descargar")]
        public Task<IActionResult> Descargar(int idSolicitud, int idDocumento) =>
            Ejecutar(async () =>
            {
                var (contenido, nombre, contentType) = await _servicio.DescargarAsync(idSolicitud, idDocumento);
                return File(contenido, contentType, nombre);
            });

        [HttpDelete("{idDocumento:int}")]
        public Task<IActionResult> Eliminar(int idSolicitud, int idDocumento) =>
            EjecutarConUsuario(async usuarioId =>
            {
                await _servicio.EliminarAsync(idSolicitud, idDocumento, usuarioId);
                return Ok(new { mensaje = "Documento eliminado." });
            });

        [HttpPost("{idDocumento:int}/aprobar")]
        [RequierePermisoEspecial(DocumentosRequisicionCatalogo.PermisoRevisar)]
        public Task<IActionResult> Aprobar(int idSolicitud, int idDocumento) =>
            EjecutarConUsuario(async usuarioId => Ok(await _servicio.AprobarAsync(idSolicitud, idDocumento, usuarioId)));

        [HttpPost("{idDocumento:int}/rechazar")]
        [RequierePermisoEspecial(DocumentosRequisicionCatalogo.PermisoRevisar)]
        public Task<IActionResult> Rechazar(int idSolicitud, int idDocumento, [FromBody] RechazarDocumentoDto dto) =>
            EjecutarConUsuario(async usuarioId => Ok(await _servicio.RechazarAsync(idSolicitud, idDocumento, dto?.Comentario, usuarioId)));

        private Task<IActionResult> EjecutarConUsuario(Func<int, Task<IActionResult>> accion)
        {
            if (!UsuarioActual.TryObtenerId(User, out var usuarioId))
                return Task.FromResult<IActionResult>(Unauthorized(new { mensaje = "Inicia sesión para continuar." }));
            return Ejecutar(() => accion(usuarioId));
        }

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
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { mensaje = ex.Message });
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

- [ ] **Step 5: Verde de las pruebas del controlador**

Run (PowerShell, en `pe_test`): `Remove-Item bin,obj -Recurse -Force -ErrorAction SilentlyContinue; dotnet build -c Release --nologo -v q; dotnet bin\Release\net8.0\pe_test.dll | Select-String 'FALLA|PASARON|FALLARON'`
Expected: `TODAS LAS PRUEBAS PASARON`.

- [ ] **Step 6: Implementar el servicio con base de datos y disco**

```csharp
// Services/Compras/RequisicionDocumentosService.cs
using jr_api.DTOs.Compras;
using jr_api.Models;
using jr_api.IServices;
using jr_api.Services.PermisosEspeciales;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;

namespace jr_api.Services.Compras
{
    public class RequisicionDocumentosService : IRequisicionDocumentosService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IPermisosEspecialesService _permisos;
        private readonly IServiceProvider _servicios;
        private readonly ILogger<RequisicionDocumentosService> _log;

        public RequisicionDocumentosService(
            ApplicationDbContext context, IConfiguration configuration, IPermisosEspecialesService permisos,
            IServiceProvider servicios, ILogger<RequisicionDocumentosService> log)
        {
            _context = context;
            _configuration = configuration;
            _permisos = permisos;
            _servicios = servicios;
            _log = log;
        }

        private record DatosSolicitud(
            int IdSolicitud, int IdEstatus, int EstadoLiquidacion, string? TipoCompra, int TipoOperacion,
            DateTime FechaSolicitud, int IdPersonaSolicitante, int? CreatedBy);

        private string RaizArchivos =>
            _configuration["RutaArchivos"] ?? throw new InvalidOperationException("No está configurada la ruta de archivos del servidor.");

        private async Task<DatosSolicitud> CargarSolicitudAsync(int idSolicitud) =>
            await _context.SolicitudesCompra
                .Where(s => s.IdSolicitud == idSolicitud)
                .Select(s => new DatosSolicitud(s.IdSolicitud, s.IdEstatus, s.EstadoLiquidacion, s.TipoCompra, s.TipoOperacion,
                    s.FechaSolicitud, s.IdPersonaSolicitante, s.CreatedBy))
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException($"La requisición {idSolicitud} no existe.");

        private async Task<SolicitudCompraDocumento> CargarDocumentoAsync(int idSolicitud, int idDocumento) =>
            await _context.SolicitudesCompra_Documentos.FirstOrDefaultAsync(d => d.IdDocumento == idDocumento && d.IdSolicitud == idSolicitud)
            ?? throw new KeyNotFoundException($"El documento {idDocumento} no existe en esta requisición.");

        private async Task<Dictionary<int, string>> NombresAsync(IEnumerable<int> ids)
        {
            var lista = ids.Distinct().ToList();
            if (lista.Count == 0) return new Dictionary<int, string>();
            return await _context.Usuarios.Where(u => lista.Contains(u.UsuarioId))
                .ToDictionaryAsync(u => u.UsuarioId, u => u.NombreUsuario);
        }

        private static string NombreEstatus(int estatus) => estatus switch
        {
            DocumentosRequisicionRegla.EstatusAprobado => "Aprobado",
            DocumentosRequisicionRegla.EstatusRechazado => "Rechazado",
            _ => "Pendiente"
        };

        private static DocumentoRequisicionDto ADto(SolicitudCompraDocumento d, IReadOnlyDictionary<int, string> nombres) => new()
        {
            IdDocumento = d.IdDocumento,
            TipoDocumento = d.TipoDocumento,
            NombreOriginal = d.NombreOriginal,
            TamanoBytes = d.TamanoBytes,
            Estatus = NombreEstatus(d.Estatus),
            SubidoPor = d.SubidoPor,
            NombreSubidoPor = nombres.GetValueOrDefault(d.SubidoPor),
            FechaSubida = d.FechaSubida,
            RevisadoPor = d.RevisadoPor,
            NombreRevisor = d.RevisadoPor.HasValue ? nombres.GetValueOrDefault(d.RevisadoPor.Value) : null,
            FechaRevision = d.FechaRevision,
            ComentarioRevision = d.ComentarioRevision,
            AprobadoAutomaticamente = d.AprobadoAutomaticamente
        };

        private async Task<DocumentoRequisicionDto> ADtoAsync(SolicitudCompraDocumento d)
        {
            var ids = new List<int> { d.SubidoPor };
            if (d.RevisadoPor.HasValue) ids.Add(d.RevisadoPor.Value);
            return ADto(d, await NombresAsync(ids));
        }

        private static EvaluacionDocumental Evaluar(DatosSolicitud s, IEnumerable<SolicitudCompraDocumento> docs) =>
            DocumentosRequisicionRegla.Evaluar(s.TipoCompra, s.TipoOperacion, s.IdEstatus, s.EstadoLiquidacion, s.FechaSolicitud,
                docs.Select(d => new DocumentoInfo(d.TipoDocumento, d.Estatus)));

        private void AgregarHistorial(int idSolicitud, int idEstatus, int usuarioId, string comentario) =>
            _context.SolicitudesCompra_Historial.Add(new SolicitudCompraHistorial
            {
                IdSolicitud = idSolicitud,
                IdEstatus = idEstatus,
                IdUsuario = usuarioId,
                FechaCambio = DateTime.UtcNow,
                Comentarios = comentario
            });

        /// <summary>El notificador vive en el servicio de compras, que a su vez usa este; por eso se pide al usar, no al construir.</summary>
        private async Task NotificarAsync(int idSolicitud, IEnumerable<int?> usuarios, string asunto)
        {
            try
            {
                var ids = usuarios.Where(u => u.HasValue && u.Value > 0).Select(u => u!.Value).Distinct().ToList();
                if (ids.Count == 0) return;
                var compras = _servicios.GetRequiredService<ISolicitudesCompraService>();
                await compras.NotificarRequisicionAsync(idSolicitud, ids, asunto);
            }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "No se pudo enviar la notificación de la requisición {IdSolicitud}", idSolicitud);
            }
        }

        // ------------------------------------------------------------------ consulta

        public async Task<DocumentacionRequisicionDto> ObtenerAsync(int idSolicitud)
        {
            var solicitud = await CargarSolicitudAsync(idSolicitud);
            var documentos = await _context.SolicitudesCompra_Documentos
                .Where(d => d.IdSolicitud == idSolicitud)
                .OrderBy(d => d.FechaSubida)
                .ToListAsync();

            var ids = documentos.Select(d => d.SubidoPor).Concat(documentos.Where(d => d.RevisadoPor.HasValue).Select(d => d.RevisadoPor!.Value));
            var nombres = await NombresAsync(ids);
            var evaluacion = Evaluar(solicitud, documentos);

            return new DocumentacionRequisicionDto
            {
                IdSolicitud = idSolicitud,
                Aplica = evaluacion.EnEtapaDocumental,
                Completa = evaluacion.Completa,
                Cerrada = solicitud.IdEstatus == DocumentosRequisicionCatalogo.EstatusCerrada,
                EstadoLiquidacion = solicitud.EstadoLiquidacion,
                MotivoNoCierre = DocumentosRequisicionRegla.MotivoParaNoCerrar(evaluacion, solicitud.IdEstatus, solicitud.EstadoLiquidacion),
                Requeridos = evaluacion.Requeridos.Select(r => new TipoRequeridoDto
                {
                    Tipo = r.Tipo,
                    Nombre = r.Nombre,
                    Extensiones = DocumentosRequisicionCatalogo.Tipo(r.Tipo)?.Extensiones ?? Array.Empty<string>(),
                    Estado = r.Estado,
                    Total = r.Total,
                    Aprobados = r.Aprobados,
                    Pendientes = r.Pendientes,
                    Rechazados = r.Rechazados
                }).ToList(),
                Documentos = documentos.Select(d => ADto(d, nombres)).ToList()
            };
        }

        public async Task<IReadOnlyDictionary<int, ResumenDocumentacionDto>> ResumenesAsync(IReadOnlyCollection<SolicitudResumenEntrada> solicitudes)
        {
            var resultado = new Dictionary<int, ResumenDocumentacionDto>();
            if (solicitudes.Count == 0) return resultado;

            var ids = solicitudes.Select(s => s.IdSolicitud).ToList();
            var documentos = (await _context.SolicitudesCompra_Documentos
                    .Where(d => ids.Contains(d.IdSolicitud))
                    .Select(d => new { d.IdSolicitud, d.TipoDocumento, d.Estatus })
                    .ToListAsync())
                .ToLookup(d => d.IdSolicitud);

            foreach (var s in solicitudes)
            {
                var evaluacion = DocumentosRequisicionRegla.Evaluar(s.TipoCompra, s.TipoOperacion, s.IdEstatus, s.EstadoLiquidacion, s.FechaSolicitud,
                    documentos[s.IdSolicitud].Select(d => new DocumentoInfo(d.TipoDocumento, d.Estatus)));

                resultado[s.IdSolicitud] = new ResumenDocumentacionDto
                {
                    Aplica = evaluacion.EnEtapaDocumental,
                    Completa = evaluacion.Completa,
                    RequeridosTotal = evaluacion.Requeridos.Count,
                    RequeridosCompletos = evaluacion.Requeridos.Count(r => r.Estado == DocumentosRequisicionRegla.EstadoCompleto),
                    Requeridos = evaluacion.Requeridos.Select(r => new ResumenTipoDto { Tipo = r.Tipo, Nombre = r.Nombre, Estado = r.Estado }).ToList()
                };
            }

            return resultado;
        }

        // ------------------------------------------------------------------ subir y descargar

        public async Task<DocumentoRequisicionDto> SubirAsync(int idSolicitud, string? tipo, IFormFile? archivo, int usuarioId)
        {
            var solicitud = await CargarSolicitudAsync(idSolicitud);
            if (solicitud.IdEstatus == DocumentosRequisicionCatalogo.EstatusCerrada)
                throw new InvalidOperationException("La requisición está cerrada: ya no se pueden subir documentos.");

            if (archivo == null) throw new ArgumentException("Selecciona un archivo.");
            var definicion = DocumentosRequisicionCatalogo.Tipo(tipo) ?? throw new ArgumentException("Indica un tipo de documento válido.");

            var requeridos = DocumentosRequisicionCatalogo.RequeridosPara(solicitud.TipoCompra, solicitud.TipoOperacion);
            if (!requeridos.Contains(definicion.Codigo, StringComparer.OrdinalIgnoreCase))
                throw new ArgumentException($"Esta requisición no requiere «{definicion.Nombre}».");

            var inicio = new byte[8];
            int leidos;
            await using (var lectura = archivo.OpenReadStream())
                leidos = await lectura.ReadAsync(inicio, 0, inicio.Length);
            Array.Resize(ref inicio, leidos);

            var error = DocumentosRequisicionRegla.ValidarArchivo(definicion, archivo.FileName, archivo.Length, inicio);
            if (error != null) throw new ArgumentException(error);

            var extension = Path.GetExtension(archivo.FileName).ToLowerInvariant();
            var relativa = $"Compras/{idSolicitud}/Documentos/{definicion.Codigo}/{Guid.NewGuid():N}{extension}";
            var fisica = DocumentosRequisicionRegla.RutaSegura(RaizArchivos, relativa)
                ?? throw new InvalidOperationException("No se pudo determinar dónde guardar el archivo.");

            Directory.CreateDirectory(Path.GetDirectoryName(fisica)!);
            await using (var destino = new FileStream(fisica, FileMode.CreateNew))
                await archivo.CopyToAsync(destino);

            var esRevisor = await _permisos.UsuarioTieneAsync(usuarioId, DocumentosRequisicionCatalogo.PermisoRevisar);
            var nombreOriginal = Path.GetFileName(archivo.FileName);
            var documento = new SolicitudCompraDocumento
            {
                IdSolicitud = idSolicitud,
                TipoDocumento = definicion.Codigo,
                NombreOriginal = nombreOriginal.Length > 260 ? nombreOriginal[^260..] : nombreOriginal,
                RutaRelativa = relativa,
                TamanoBytes = archivo.Length,
                Estatus = esRevisor ? DocumentosRequisicionRegla.EstatusAprobado : DocumentosRequisicionRegla.EstatusPendiente,
                SubidoPor = usuarioId,
                FechaSubida = DateTime.UtcNow,
                RevisadoPor = esRevisor ? usuarioId : null,
                FechaRevision = esRevisor ? DateTime.UtcNow : null,
                AprobadoAutomaticamente = esRevisor
            };
            _context.SolicitudesCompra_Documentos.Add(documento);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch
            {
                // Si no se pudo registrar, no se deja un archivo huérfano en el disco
                try { File.Delete(fisica); } catch { /* sin acción */ }
                throw;
            }

            await EvaluarCierreAsync(idSolicitud, usuarioId);
            return await ADtoAsync(documento);
        }

        public async Task<(Stream Contenido, string NombreOriginal, string ContentType)> DescargarAsync(int idSolicitud, int idDocumento)
        {
            var documento = await CargarDocumentoAsync(idSolicitud, idDocumento);
            var fisica = DocumentosRequisicionRegla.RutaSegura(RaizArchivos, documento.RutaRelativa);
            if (fisica == null || !File.Exists(fisica))
                throw new KeyNotFoundException("El archivo ya no existe en el servidor.");

            if (!new FileExtensionContentTypeProvider().TryGetContentType(documento.NombreOriginal, out var contentType))
                contentType = "application/octet-stream";

            return (new FileStream(fisica, FileMode.Open, FileAccess.Read, FileShare.Read), documento.NombreOriginal, contentType);
        }

        // ------------------------------------------------------------------ borrar, aprobar, rechazar

        public async Task EliminarAsync(int idSolicitud, int idDocumento, int usuarioId)
        {
            var solicitud = await CargarSolicitudAsync(idSolicitud);
            var documento = await CargarDocumentoAsync(idSolicitud, idDocumento);
            var esRevisor = await _permisos.UsuarioTieneAsync(usuarioId, DocumentosRequisicionCatalogo.PermisoRevisar);

            switch (DocumentosRequisicionRegla.PuedeBorrar(documento.Estatus,
                        solicitud.IdEstatus == DocumentosRequisicionCatalogo.EstatusCerrada, documento.SubidoPor == usuarioId, esRevisor))
            {
                case ResultadoBorrado.Cerrada:
                    throw new InvalidOperationException("La requisición está cerrada: sus documentos ya no se pueden borrar.");
                case ResultadoBorrado.Aprobado:
                    throw new InvalidOperationException("Un documento aprobado no se puede borrar; pide a un revisor que lo rechace primero.");
                case ResultadoBorrado.SinPermiso:
                    throw new UnauthorizedAccessException("Solo quien subió el documento o un revisor puede borrarlo.");
            }

            var fisica = DocumentosRequisicionRegla.RutaSegura(RaizArchivos, documento.RutaRelativa);
            _context.SolicitudesCompra_Documentos.Remove(documento);
            await _context.SaveChangesAsync();

            if (fisica != null)
            {
                try { File.Delete(fisica); } catch (Exception ex) { _log.LogWarning(ex, "No se pudo borrar el archivo {Ruta}", fisica); }
            }

            await EvaluarCierreAsync(idSolicitud, usuarioId);
        }

        public async Task<DocumentoRequisicionDto> AprobarAsync(int idSolicitud, int idDocumento, int usuarioId)
        {
            var solicitud = await CargarSolicitudAsync(idSolicitud);
            if (solicitud.IdEstatus == DocumentosRequisicionCatalogo.EstatusCerrada)
                throw new InvalidOperationException("La requisición está cerrada: ya no se pueden revisar sus documentos.");

            var documento = await CargarDocumentoAsync(idSolicitud, idDocumento);
            if (documento.Estatus == DocumentosRequisicionRegla.EstatusAprobado)
                throw new InvalidOperationException("Este documento ya está aprobado.");

            documento.Estatus = DocumentosRequisicionRegla.EstatusAprobado;
            documento.RevisadoPor = usuarioId;
            documento.FechaRevision = DateTime.UtcNow;
            documento.ComentarioRevision = null;
            documento.AprobadoAutomaticamente = false;

            var nombres = await NombresAsync(new[] { usuarioId });
            AgregarHistorial(idSolicitud, solicitud.IdEstatus, usuarioId,
                $"✅ Documento «{NombreTipo(documento.TipoDocumento)}» aprobado por {nombres.GetValueOrDefault(usuarioId) ?? "un revisor"}.");
            await _context.SaveChangesAsync();

            await EvaluarCierreAsync(idSolicitud, usuarioId);
            return await ADtoAsync(documento);
        }

        public async Task<DocumentoRequisicionDto> RechazarAsync(int idSolicitud, int idDocumento, string? comentario, int usuarioId)
        {
            var motivo = comentario?.Trim();
            if (string.IsNullOrEmpty(motivo)) throw new ArgumentException("Escribe el motivo del rechazo.");
            if (motivo.Length > 500) throw new ArgumentException("El motivo del rechazo no puede pasar de 500 caracteres.");

            var solicitud = await CargarSolicitudAsync(idSolicitud);
            if (solicitud.IdEstatus == DocumentosRequisicionCatalogo.EstatusCerrada)
                throw new InvalidOperationException("La requisición está cerrada: ya no se pueden revisar sus documentos.");

            var documento = await CargarDocumentoAsync(idSolicitud, idDocumento);
            documento.Estatus = DocumentosRequisicionRegla.EstatusRechazado;
            documento.RevisadoPor = usuarioId;
            documento.FechaRevision = DateTime.UtcNow;
            documento.ComentarioRevision = motivo;
            documento.AprobadoAutomaticamente = false;

            var nombres = await NombresAsync(new[] { usuarioId });
            AgregarHistorial(idSolicitud, solicitud.IdEstatus, usuarioId,
                $"❌ Documento «{NombreTipo(documento.TipoDocumento)}» rechazado por {nombres.GetValueOrDefault(usuarioId) ?? "un revisor"}: {motivo}");
            await _context.SaveChangesAsync();

            var asunto = $"Documento rechazado ({NombreTipo(documento.TipoDocumento)}): {motivo}";
            await NotificarAsync(idSolicitud,
                new int?[] { documento.SubidoPor, solicitud.IdPersonaSolicitante, solicitud.CreatedBy },
                asunto.Length > 150 ? asunto[..150] + "…" : asunto);

            return await ADtoAsync(documento);
        }

        private static string NombreTipo(string tipo) => DocumentosRequisicionCatalogo.Tipo(tipo)?.Nombre ?? tipo;

        // ------------------------------------------------------------------ cierre

        public async Task<bool> EvaluarCierreAsync(int idSolicitud, int usuarioId)
        {
            var solicitud = await CargarSolicitudAsync(idSolicitud);
            if (solicitud.IdEstatus == DocumentosRequisicionCatalogo.EstatusCerrada
                || solicitud.IdEstatus == DocumentosRequisicionCatalogo.EstatusRechazada) return false;

            var documentos = await _context.SolicitudesCompra_Documentos.Where(d => d.IdSolicitud == idSolicitud).ToListAsync();
            if (!DocumentosRequisicionRegla.DebeCerrarse(Evaluar(solicitud, documentos), solicitud.EstadoLiquidacion)) return false;

            var entidad = await _context.SolicitudesCompra.FirstAsync(s => s.IdSolicitud == idSolicitud);
            entidad.IdEstatus = DocumentosRequisicionCatalogo.EstatusCerrada;
            entidad.IdUsuarioEstatus = usuarioId > 0 ? usuarioId : null;
            AgregarHistorial(idSolicitud, DocumentosRequisicionCatalogo.EstatusCerrada, usuarioId > 0 ? usuarioId : 1,
                "Cierre automático: documentación completa y pago liquidado.");
            await _context.SaveChangesAsync();

            await NotificarAsync(idSolicitud, new int?[] { solicitud.IdPersonaSolicitante, solicitud.CreatedBy },
                "Requisición cerrada: documentación completa y pago liquidado");
            return true;
        }

        public async Task<string?> MotivoParaNoCerrarAsync(int idSolicitud)
        {
            var solicitud = await CargarSolicitudAsync(idSolicitud);
            var documentos = await _context.SolicitudesCompra_Documentos.Where(d => d.IdSolicitud == idSolicitud).ToListAsync();
            return DocumentosRequisicionRegla.MotivoParaNoCerrar(Evaluar(solicitud, documentos), solicitud.IdEstatus, solicitud.EstadoLiquidacion);
        }
    }
}
```

- [ ] **Step 7: Registrar el servicio en `Program.cs`**

Después de la línea que registra `IPermisosEspecialesService`:

```csharp
builder.Services.AddScoped<jr_api.Services.Compras.IRequisicionDocumentosService, jr_api.Services.Compras.RequisicionDocumentosService>();
```

- [ ] **Step 8: Compilar el API completo**

Aún no existe `NotificarRequisicionAsync` en `SolicitudesCompraService` (Task 5): este paso compila **después** de la Task 5, Step 2. Hasta entonces el API no compila por la interfaz ampliada; es esperado.

---

### Task 5: Integración con el servicio de compras

**Files:**
- Modify: `Services/SolicitudesCompraService.cs` (constructor, `ActualizarEstatusAsync`, registro de recepción, `CambiarEstadoLiquidacionAsync`, `ObtenerTodasAsync`, método nuevo `NotificarRequisicionAsync`)

**Interfaces:**
- Consumes (Task 4): `IRequisicionDocumentosService` (`EvaluarCierreAsync`, `MotivoParaNoCerrarAsync`, `ResumenesAsync`), `SolicitudResumenEntrada`, `DocumentosRequisicionRegla.EstatusTrasRecepcion`.
- Produces: `ISolicitudesCompraService.NotificarRequisicionAsync` (usado por el servicio de documentos).

- [ ] **Step 1: Constructor y campo**

Cambiar la firma (línea 22) agregando al final `, IRequisicionDocumentosService documentos` y el campo `private readonly IRequisicionDocumentosService _documentos;` con su asignación `_documentos = documentos;`. Agregar `using jr_api.Services.Compras;` al inicio del archivo.

- [ ] **Step 2: Método de notificación pública**

Antes de `private async Task EnviarNotificacionCompraAsync(`:

```csharp
        public async Task NotificarRequisicionAsync(int idSolicitud, List<int> usuarioIds, string asunto)
        {
            var solicitud = await _context.SolicitudesCompra
                .Include(s => s.ProveedoresSugeridos)
                .FirstOrDefaultAsync(s => s.IdSolicitud == idSolicitud);
            if (solicitud == null) return;

            await EnviarNotificacionCompraAsync(solicitud, usuarioIds, asunto);
        }
```

Ahora el API completo compila: `dotnet build jr_api.csproj --nologo -v q` → `0 Errores`.

- [ ] **Step 3: Cierre manual con la regla nueva**

En `ActualizarEstatusAsync`, reemplazar **todo** el bloque `if (nuevoEstatus == 8) { ... }` (las recepciones obligatorias, las recepciones pendientes y la factura en CONTPAQi) por:

```csharp
                if (nuevoEstatus == 8)
                {
                    // Misma regla que el cierre automático: documentación aprobada + pago liquidado
                    var motivo = await _documentos.MotivoParaNoCerrarAsync(idSolicitud);
                    if (motivo != null) throw new Exception(motivo);
                }
```

- [ ] **Step 4: Estatus tras registrar una recepción**

Reemplazar el bloque `if (solicitud != null && solicitud.IdEstatus != 4) { solicitud.IdEstatus = 4; ... IdEstatus = 8, ... }` por:

```csharp
                if (solicitud != null)
                {
                    var estatusNuevo = DocumentosRequisicionRegla.EstatusTrasRecepcion(solicitud.IdEstatus);
                    if (estatusNuevo != solicitud.IdEstatus)
                    {
                        solicitud.IdEstatus = estatusNuevo; // 7 = Material recibido

                        _context.SolicitudesCompra_Historial.Add(new SolicitudCompraHistorial
                        {
                            IdSolicitud = solicitud.IdSolicitud,
                            IdEstatus = estatusNuevo,
                            IdUsuario = dto.QuienRecibioId,
                            FechaCambio = DateTime.UtcNow,
                            Comentarios = $"Entrega registrada exitosamente en {dto.DondeRecibio}."
                        });
                    }
                }
```

- [ ] **Step 5: Evaluar el cierre al cambiar el estado de pago**

En `CambiarEstadoLiquidacionAsync`, justo antes del `return guardado;` final (el que sigue al bloque `catch` que imprime «Error al enviar notificación de cambio de estatus de pago»):

```csharp
            if (guardado)
            {
                // Si la documentación ya estaba completa, liquidar la pago cierra la requisición
                try
                {
                    await _documentos.EvaluarCierreAsync(idSolicitud, dto.IdUsuario);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error al evaluar el cierre de la solicitud {idSolicitud}: {ex.Message}");
                }
            }

```

- [ ] **Step 6: Resumen de documentación en la lista del tablero**

En `ObtenerTodasAsync`, justo antes de `// 4. Mapeo al DTO`:

```csharp
            // 3.1 Resumen de documentación de todas las requisiciones con una sola consulta
            var resumenes = await _documentos.ResumenesAsync(solicitudes
                .Select(s => new SolicitudResumenEntrada(s.IdSolicitud, s.IdEstatus, s.EstadoLiquidacion, s.TipoCompra, s.TipoOperacion, s.FechaSolicitud))
                .ToList());

```

y, dentro del `new SolicitudCompraResponseDto { ... }` de ese método, después de `IdSolicitud = s.IdSolicitud,`:

```csharp
                Documentacion = resumenes.GetValueOrDefault(s.IdSolicitud),
```

- [ ] **Step 7: Compilar y volver a correr todas las pruebas del API**

Run: `cd g:/dev/jr/jr_api/jr_api && dotnet build jr_api.csproj --nologo -v q` y, en `pe_test`, el build y la ejecución.
Expected: `0 Errores`; `TODAS LAS PRUEBAS PASARON`; `dotnet ef migrations has-pending-model-changes --no-build` (tras compilar) → `No changes have been made to the model since the last migration.`

---

### Task 6: Front — tipos, utilidades puras y servicio (con pruebas)

**Files:**
- Create: `src/app/core/documentos-requisicion/documentos-requisicion.types.ts`, `documentos-requisicion.utils.ts`, `documentos-requisicion.service.ts`
- Modify: `src/app/modules/admin/administration/solicitudes-compra/models/solicitud-compra.types.ts`
- Test: `pe_front_test/run_docs.js` (fuera del repo)

**Interfaces:**
- Produces: tipos `DocumentoRequisicion`, `TipoRequerido`, `DocumentacionRequisicion`, `ResumenDocumentacion`; funciones `chipDocumentacion(resumen, estadoLiquidacion)`, `esPagadaSinDocumentos(fila)`, `tipoIncompleto(fila, tipo)`, `aceptarArchivos(tipoRequerido)`, `formatearTamano(bytes)`; `DocumentosRequisicionService` con `obtener`, `subir`, `descargar`, `eliminar`, `aprobar`, `rechazar`.

- [ ] **Step 1: Tipos**

```ts
// src/app/core/documentos-requisicion/documentos-requisicion.types.ts
export type EstadoTipoDocumento = 'Completo' | 'EnRevision' | 'Rechazado' | 'Falta';
export type EstatusDocumento = 'Pendiente' | 'Aprobado' | 'Rechazado';

export interface DocumentoRequisicion {
    idDocumento: number;
    tipoDocumento: string;
    nombreOriginal: string;
    tamanoBytes: number;
    estatus: EstatusDocumento;
    subidoPor: number;
    nombreSubidoPor?: string | null;
    fechaSubida: string;
    revisadoPor?: number | null;
    nombreRevisor?: string | null;
    fechaRevision?: string | null;
    comentarioRevision?: string | null;
    aprobadoAutomaticamente: boolean;
}

export interface TipoRequerido {
    tipo: string;
    nombre: string;
    extensiones: string[];
    estado: EstadoTipoDocumento;
    total: number;
    aprobados: number;
    pendientes: number;
    rechazados: number;
}

export interface DocumentacionRequisicion {
    idSolicitud: number;
    aplica: boolean;
    completa: boolean;
    cerrada: boolean;
    estadoLiquidacion: number;
    requeridos: TipoRequerido[];
    documentos: DocumentoRequisicion[];
    motivoNoCierre?: string | null;
}

export interface ResumenTipo {
    tipo: string;
    nombre: string;
    estado: EstadoTipoDocumento;
}

/** Resumen que trae cada requisición en la lista del tablero. */
export interface ResumenDocumentacion {
    aplica: boolean;
    completa: boolean;
    requeridosCompletos: number;
    requeridosTotal: number;
    requeridos: ResumenTipo[];
}

export type ColorChip = 'verde' | 'ambar' | 'rojo';
```

- [ ] **Step 2: Prueba de las utilidades (debe fallar: no existen)**

`pe_front_test/run_docs.js`:

```js
const assert = require('assert');
const u = require('./documentos-requisicion.utils.js');

const resumen = (aplica, completa, estados) => ({
  aplica, completa,
  requeridosCompletos: estados.filter(e => e === 'Completo').length,
  requeridosTotal: estados.length,
  requeridos: estados.map((e, i) => ({ tipo: ['Factura', 'Evidencia', 'Pago'][i], nombre: ['Factura', 'Evidencia', 'Pago'][i], estado: e })),
});

// chipDocumentacion
assert.strictEqual(u.chipDocumentacion(resumen(true, true, ['Completo', 'Completo', 'Completo']), 1)?.color, 'verde');
assert.strictEqual(u.chipDocumentacion(resumen(true, false, ['Completo', 'Falta', 'Falta']), 0)?.color, 'ambar', 'falta y sin pagar -> ámbar');
assert.strictEqual(u.chipDocumentacion(resumen(true, false, ['Completo', 'Falta', 'Falta']), 2)?.color, 'ambar', 'con anticipo sigue ámbar');
assert.strictEqual(u.chipDocumentacion(resumen(true, false, ['Completo', 'Falta', 'Falta']), 1)?.color, 'rojo', 'falta y liquidada -> rojo');
assert.strictEqual(u.chipDocumentacion(resumen(true, false, ['EnRevision', 'Completo', 'Completo']), 1)?.color, 'rojo', 'en revisión y liquidada -> rojo');
assert.strictEqual(u.chipDocumentacion(resumen(true, false, ['Completo', 'Falta', 'Falta']), 1)?.texto, '1/3');
assert.strictEqual(u.chipDocumentacion(resumen(false, false, ['Falta', 'Falta', 'Falta']), 0), null, 'fuera de etapa no hay chip');
assert.strictEqual(u.chipDocumentacion(undefined, 1), null, 'sin resumen (API anterior) no rompe');
assert.strictEqual(u.chipDocumentacion(null, 1), null);

// esPagadaSinDocumentos
assert.strictEqual(u.esPagadaSinDocumentos({ estadoLiquidacion: 1, documentacion: resumen(true, false, ['Falta', 'Falta', 'Falta']) }), true);
assert.strictEqual(u.esPagadaSinDocumentos({ estadoLiquidacion: 1, documentacion: resumen(true, true, ['Completo', 'Completo', 'Completo']) }), false);
assert.strictEqual(u.esPagadaSinDocumentos({ estadoLiquidacion: 0, documentacion: resumen(true, false, ['Falta', 'Falta', 'Falta']) }), false, 'sin liquidar no entra');
assert.strictEqual(u.esPagadaSinDocumentos({ estadoLiquidacion: 2, documentacion: resumen(true, false, ['Falta', 'Falta', 'Falta']) }), false, 'con anticipo no es liquidada');
assert.strictEqual(u.esPagadaSinDocumentos({ estadoLiquidacion: 1, documentacion: resumen(false, false, ['Falta']) }), false, 'fuera de etapa no entra');
assert.strictEqual(u.esPagadaSinDocumentos({ estadoLiquidacion: 1 }), false, 'sin resumen no entra');

// tipoIncompleto (filtros pendiente_factura / pendiente_evidencia)
const f1 = { documentacion: resumen(true, false, ['Falta', 'Completo', 'Completo']) };
assert.strictEqual(u.tipoIncompleto(f1, 'Factura'), true);
assert.strictEqual(u.tipoIncompleto(f1, 'Evidencia'), false);
assert.strictEqual(u.tipoIncompleto({ documentacion: resumen(true, false, ['Completo', 'EnRevision', 'Completo']) }, 'Evidencia'), true, 'en revisión cuenta como incompleto');
assert.strictEqual(u.tipoIncompleto({ documentacion: { aplica: true, completa: false, requeridosCompletos: 1, requeridosTotal: 2, requeridos: [{ tipo: 'Factura', nombre: 'F', estado: 'Falta' }, { tipo: 'Pago', nombre: 'P', estado: 'Completo' }] } }, 'Evidencia'), false, 'un gasto no requiere evidencia');
assert.strictEqual(u.tipoIncompleto({ documentacion: resumen(false, false, ['Falta']) }, 'Factura'), false, 'fuera de etapa no entra');
assert.strictEqual(u.tipoIncompleto({}, 'Factura'), false);

// aceptarArchivos
assert.strictEqual(u.aceptarArchivos({ extensiones: ['.pdf'] }), '.pdf');
assert.strictEqual(u.aceptarArchivos({ extensiones: ['.pdf', '.jpg', '.png'] }), '.pdf,.jpg,.png');
assert.strictEqual(u.aceptarArchivos(undefined), '');

// formatearTamano
assert.strictEqual(u.formatearTamano(0), '0 KB');
assert.strictEqual(u.formatearTamano(512), '1 KB');
assert.strictEqual(u.formatearTamano(2048), '2 KB');
assert.strictEqual(u.formatearTamano(1572864), '1.5 MB');
assert.strictEqual(u.formatearTamano(undefined), '');

console.log('utilidades de documentos OK (31 aserciones)');
```

Run (bash): `cd g:/dev/jr/jringenieria && SP=<scratchpad>/pe_front_test && npx esbuild src/app/core/documentos-requisicion/documentos-requisicion.utils.ts --format=cjs --platform=node --outfile="$SP/documentos-requisicion.utils.js" --log-level=error 2>&1 | head -3`
Expected: error `Could not resolve ...utils.ts`.

- [ ] **Step 3: Implementar las utilidades**

```ts
// src/app/core/documentos-requisicion/documentos-requisicion.utils.ts
import { ColorChip, ResumenDocumentacion } from './documentos-requisicion.types';

interface FilaConDocumentacion {
    estadoLiquidacion?: number;
    documentacion?: ResumenDocumentacion | null;
}

/**
 * Chip de la columna «Documentos» del tablero. null = no se muestra (fuera de etapa documental o sin resumen).
 * Verde: completa. Rojo: ya está liquidada y falta documentación (es lo único que impide cerrarla). Ámbar: falta algo y aún no se liquida.
 */
export function chipDocumentacion(
    resumen: ResumenDocumentacion | null | undefined, estadoLiquidacion: number | null | undefined
): { texto: string; color: ColorChip } | null {
    if (!resumen || !resumen.aplica) return null;
    const texto = `${resumen.requeridosCompletos}/${resumen.requeridosTotal}`;
    if (resumen.completa) return { texto, color: 'verde' };
    return { texto, color: estadoLiquidacion === 1 ? 'rojo' : 'ambar' };
}

/** Liquidada y con documentación incompleta (filtro «Pagadas sin documentación»). */
export function esPagadaSinDocumentos(fila: FilaConDocumentacion): boolean {
    const d = fila.documentacion;
    return !!d && d.aplica && !d.completa && fila.estadoLiquidacion === 1;
}

/** El tipo es requerido por la requisición, está en etapa documental y todavía no está completo. */
export function tipoIncompleto(fila: FilaConDocumentacion, tipo: string): boolean {
    const d = fila.documentacion;
    if (!d || !d.aplica) return false;
    const requerido = d.requeridos.find(r => r.tipo === tipo);
    return !!requerido && requerido.estado !== 'Completo';
}

/** Valor del atributo `accept` de un input de archivo. */
export function aceptarArchivos(tipo: { extensiones: string[] } | null | undefined): string {
    return tipo ? tipo.extensiones.join(',') : '';
}

export function formatearTamano(bytes: number | null | undefined): string {
    if (bytes === null || bytes === undefined) return '';
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${Math.max(bytes === 0 ? 0 : 1, Math.round(bytes / 1024))} KB`;
}
```

- [ ] **Step 4: Ejecutar la prueba y confirmar el verde**

Run: el comando de esbuild del Step 2 y `node "$SP/run_docs.js"`
Expected: `utilidades de documentos OK (31 aserciones)`.

- [ ] **Step 5: Servicio de Angular**

```ts
// src/app/core/documentos-requisicion/documentos-requisicion.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { DocumentacionRequisicion, DocumentoRequisicion } from './documentos-requisicion.types';

/** Documentos (factura, evidencia, comprobante de pago) de una requisición. */
@Injectable({ providedIn: 'root' })
export class DocumentosRequisicionService {
    private _http = inject(HttpClient);

    private url(idSolicitud: number): string {
        return `${environment.apiUrl}/SolicitudesCompra/${idSolicitud}/documentos`;
    }

    obtener(idSolicitud: number): Observable<DocumentacionRequisicion> {
        return this._http.get<DocumentacionRequisicion>(this.url(idSolicitud));
    }

    subir(idSolicitud: number, tipo: string, archivo: File): Observable<DocumentoRequisicion> {
        const form = new FormData();
        form.append('tipo', tipo);
        form.append('archivo', archivo);
        return this._http.post<DocumentoRequisicion>(this.url(idSolicitud), form);
    }

    descargar(idSolicitud: number, idDocumento: number): Observable<Blob> {
        return this._http.get(`${this.url(idSolicitud)}/${idDocumento}/descargar`, { responseType: 'blob' });
    }

    eliminar(idSolicitud: number, idDocumento: number): Observable<{ mensaje: string }> {
        return this._http.delete<{ mensaje: string }>(`${this.url(idSolicitud)}/${idDocumento}`);
    }

    aprobar(idSolicitud: number, idDocumento: number): Observable<DocumentoRequisicion> {
        return this._http.post<DocumentoRequisicion>(`${this.url(idSolicitud)}/${idDocumento}/aprobar`, {});
    }

    rechazar(idSolicitud: number, idDocumento: number, comentario: string): Observable<DocumentoRequisicion> {
        return this._http.post<DocumentoRequisicion>(`${this.url(idSolicitud)}/${idDocumento}/rechazar`, { comentario });
    }
}
```

- [ ] **Step 6: Agregar el resumen al tipo de la requisición**

En `solicitudes-compra/models/solicitud-compra.types.ts`, dentro de `SolicitudCompra`, después de `datosFacturaContpaqi?: any;`:

```ts
    documentacion?: import('app/core/documentos-requisicion/documentos-requisicion.types').ResumenDocumentacion | null;
```

- [ ] **Step 7: Compilar**

Run: `cd g:/dev/jr/jringenieria && npx tsc -p tsconfig.app.json --noEmit; echo "exit: $?"`
Expected: `exit: 0`.

---

### Task 7: Front — componente de documentación, diálogo de detalle, liquidación y lista de solicitudes

**Files:**
- Create: `src/app/modules/admin/administration/documentos-requisicion/documentos-requisicion.component.ts`, `documentos-requisicion.component.html`, `documentos-requisicion-dialog.component.ts`
- Modify: `.../tablero-compras/solicitud-detalle-dialog/solicitud-detalle-dialog.component.ts` (importar y colocar el componente), `.../tablero-compras/tablero-compras.component.ts` (subir el comprobante como documento `Pago`), `.../solicitudes-compra/list/list.component.ts` y `list.component.html` (botón «Documentos»)

**Interfaces:**
- Consumes (Task 6): `DocumentosRequisicionService`, tipos y utilidades; `PermisosEspecialesService.tiene('compras.documentos.revisar')` (proyecto A); `ImagePreviewDialogComponent`.
- Produces: `<documentos-requisicion [idSolicitud]="n" (cambio)="...">`; `DocumentosRequisicionDialogComponent` (datos `{ idSolicitud, folio? }`).

- [ ] **Step 1: Componente**

```ts
// src/app/modules/admin/administration/documentos-requisicion/documentos-requisicion.component.ts
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DocumentosRequisicionService } from 'app/core/documentos-requisicion/documentos-requisicion.service';
import { DocumentacionRequisicion, DocumentoRequisicion, TipoRequerido } from 'app/core/documentos-requisicion/documentos-requisicion.types';
import { aceptarArchivos, formatearTamano } from 'app/core/documentos-requisicion/documentos-requisicion.utils';
import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import { ImagePreviewDialogComponent } from 'app/modules/admin/dashboards/tasks/task-media-dialog/task-media-dialog-viewer.component';
import Swal from 'sweetalert2';

/** Documentación de una requisición: qué se exige, qué se ha subido y su revisión. */
@Component({
    selector: 'documentos-requisicion',
    standalone: true,
    imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule],
    templateUrl: './documentos-requisicion.component.html',
})
export class DocumentosRequisicionComponent implements OnChanges {
    @Input() idSolicitud!: number;
    /** Se emite tras subir, borrar, aprobar o rechazar, por si la requisición se cerró y hay que refrescar la pantalla. */
    @Output() cambio = new EventEmitter<void>();

    private _servicio = inject(DocumentosRequisicionService);
    private _permisos = inject(PermisosEspecialesService);
    private _dialog = inject(MatDialog);
    private _cdr = inject(ChangeDetectorRef);

    datos: DocumentacionRequisicion | null = null;
    cargando = false;
    error: string | null = null;
    subiendo: Record<string, boolean> = {};
    rechazando: DocumentoRequisicion | null = null;
    motivoRechazo = '';

    readonly aceptar = aceptarArchivos;
    readonly tamano = formatearTamano;

    get puedeRevisar(): boolean {
        return this._permisos.tiene('compras.documentos.revisar');
    }

    ngOnChanges(cambios: SimpleChanges): void {
        if (cambios['idSolicitud'] && this.idSolicitud) this.cargar();
    }

    cargar(): void {
        this.cargando = true;
        this._servicio.obtener(this.idSolicitud).subscribe({
            next: datos => {
                this.datos = datos;
                this.error = null;
                this.cargando = false;
                this._cdr.markForCheck();
            },
            error: err => {
                this.cargando = false;
                this.error = this.mensajeDe(err, 'No se pudo cargar la documentación.');
                this._cdr.markForCheck();
            },
        });
    }

    documentosDe(tipo: string): DocumentoRequisicion[] {
        return (this.datos?.documentos ?? []).filter(d => d.tipoDocumento === tipo);
    }

    etiquetaEstado(t: TipoRequerido): string {
        return ({ Completo: 'Completo', EnRevision: 'En revisión', Rechazado: 'Rechazado', Falta: 'Falta' } as Record<string, string>)[t.estado] ?? t.estado;
    }

    claseEstado(estado: string): string {
        switch (estado) {
            case 'Completo': case 'Aprobado': return 'bg-emerald-100 text-emerald-700';
            case 'EnRevision': case 'Pendiente': return 'bg-amber-100 text-amber-700';
            case 'Rechazado': return 'bg-rose-100 text-rose-700';
            default: return 'bg-gray-100 text-gray-600';
        }
    }

    // ------------------------------------------------------------------ subir

    elegirArchivo(tipo: TipoRequerido, evento: Event): void {
        const input = evento.target as HTMLInputElement;
        const archivo = input.files?.[0];
        input.value = ''; // permite volver a elegir el mismo archivo
        if (!archivo) return;

        this.subiendo[tipo.tipo] = true;
        this._servicio.subir(this.idSolicitud, tipo.tipo, archivo).subscribe({
            next: () => {
                this.subiendo[tipo.tipo] = false;
                this.cargar();
                this.cambio.emit();
            },
            error: err => {
                this.subiendo[tipo.tipo] = false;
                Swal.fire('No se pudo subir el documento', this.mensajeDe(err, 'Inténtalo de nuevo.'), 'error');
                this._cdr.markForCheck();
            },
        });
    }

    // ------------------------------------------------------------------ ver, descargar, borrar

    ver(doc: DocumentoRequisicion): void {
        this._servicio.descargar(this.idSolicitud, doc.idDocumento).subscribe({
            next: blob => {
                const esPdf = doc.nombreOriginal.toLowerCase().endsWith('.pdf');
                const tipoBlob = esPdf ? new Blob([blob], { type: 'application/pdf' }) : blob;
                this._dialog.open(ImagePreviewDialogComponent, {
                    data: { url: URL.createObjectURL(tipoBlob), name: doc.nombreOriginal, isPdf: esPdf },
                });
            },
            error: err => Swal.fire('No se pudo abrir el documento', this.mensajeDe(err, 'Inténtalo de nuevo.'), 'error'),
        });
    }

    descargar(doc: DocumentoRequisicion): void {
        this._servicio.descargar(this.idSolicitud, doc.idDocumento).subscribe({
            next: blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = doc.nombreOriginal;
                a.click();
                window.URL.revokeObjectURL(url);
            },
            error: err => Swal.fire('No se pudo descargar el documento', this.mensajeDe(err, 'Inténtalo de nuevo.'), 'error'),
        });
    }

    puedeBorrar(doc: DocumentoRequisicion): boolean {
        return !this.datos?.cerrada && doc.estatus !== 'Aprobado';
    }

    eliminar(doc: DocumentoRequisicion): void {
        Swal.fire({
            title: '¿Eliminar el documento?',
            text: `Se eliminará «${doc.nombreOriginal}».`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        }).then(r => {
            if (!r.isConfirmed) return;
            this._servicio.eliminar(this.idSolicitud, doc.idDocumento).subscribe({
                next: () => { this.cargar(); this.cambio.emit(); },
                error: err => Swal.fire('No se pudo eliminar', this.mensajeDe(err, 'Inténtalo de nuevo.'), 'error'),
            });
        });
    }

    // ------------------------------------------------------------------ revisión

    aprobar(doc: DocumentoRequisicion): void {
        this._servicio.aprobar(this.idSolicitud, doc.idDocumento).subscribe({
            next: () => { this.cargar(); this.cambio.emit(); },
            error: err => Swal.fire('No se pudo aprobar', this.mensajeDe(err, 'Inténtalo de nuevo.'), 'error'),
        });
    }

    iniciarRechazo(doc: DocumentoRequisicion): void {
        this.rechazando = doc;
        this.motivoRechazo = '';
    }

    cancelarRechazo(): void {
        this.rechazando = null;
        this.motivoRechazo = '';
    }

    confirmarRechazo(): void {
        const doc = this.rechazando;
        const motivo = this.motivoRechazo.trim();
        if (!doc || !motivo) return;
        this._servicio.rechazar(this.idSolicitud, doc.idDocumento, motivo).subscribe({
            next: () => { this.cancelarRechazo(); this.cargar(); this.cambio.emit(); },
            error: err => Swal.fire('No se pudo rechazar', this.mensajeDe(err, 'Inténtalo de nuevo.'), 'error'),
        });
    }

    private mensajeDe(err: any, porDefecto: string): string {
        return err?.error?.mensaje || (err?.status === 403 ? 'No tienes permiso para esta acción.' : porDefecto);
    }
}
```

```html
<!-- src/app/modules/admin/administration/documentos-requisicion/documentos-requisicion.component.html -->
<div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
        <div class="flex items-center">
            <mat-icon class="mr-2 text-primary">fact_check</mat-icon>
            <span class="text-base font-bold text-gray-800 dark:text-gray-100">Documentación</span>
        </div>
        <span *ngIf="datos" class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase"
              [ngClass]="datos.cerrada ? 'bg-slate-200 text-slate-700' : (datos.completa ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')">
            {{ datos.cerrada ? 'Requisición cerrada' : (datos.completa ? 'Documentación completa' : 'Documentación incompleta') }}
        </span>
    </div>

    <div *ngIf="cargando && !datos" class="text-xs text-secondary">Cargando…</div>
    <div *ngIf="error" class="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">{{ error }}</div>

    <div *ngIf="datos && !datos.aplica && !datos.cerrada"
         class="text-[11px] text-secondary italic p-3 border border-dashed rounded-xl">
        Esta requisición todavía no pide documentos (se piden cuando se aprueba o se registra un pago). Puedes adelantar los que ya tengas.
    </div>

    <div *ngIf="datos?.motivoNoCierre && datos.aplica && !datos.cerrada"
         class="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
        {{ datos.motivoNoCierre }}
    </div>

    <div *ngFor="let t of datos?.requeridos" class="rounded-2xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
        <div class="flex items-center justify-between gap-2">
            <div>
                <div class="text-sm font-bold">{{ t.nombre }}</div>
                <div class="text-[10px] text-secondary uppercase">{{ t.extensiones.join(' · ') }} · máx. 10 MB</div>
            </div>
            <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase" [ngClass]="claseEstado(t.estado)">
                    {{ etiquetaEstado(t) }}
                </span>
                <label *ngIf="!datos?.cerrada"
                       class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                       [class.opacity-50]="subiendo[t.tipo]" [class.pointer-events-none]="subiendo[t.tipo]">
                    <mat-icon class="icon-size-4">upload_file</mat-icon>
                    {{ subiendo[t.tipo] ? 'Subiendo…' : 'Subir' }}
                    <input type="file" class="hidden" [accept]="aceptar(t)" (change)="elegirArchivo(t, $event)">
                </label>
            </div>
        </div>

        <div *ngIf="documentosDe(t.tipo).length === 0" class="text-[11px] text-secondary italic">Sin archivos todavía.</div>

        <div *ngFor="let d of documentosDe(t.tipo)" class="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 space-y-1">
            <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                    <div class="text-xs font-semibold truncate" [title]="d.nombreOriginal">{{ d.nombreOriginal }}</div>
                    <div class="text-[10px] text-secondary">
                        {{ tamano(d.tamanoBytes) }} · {{ d.nombreSubidoPor || 'Usuario ' + d.subidoPor }} · {{ d.fechaSubida | date:'dd/MM/yyyy HH:mm' }}
                    </div>
                </div>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase flex-shrink-0" [ngClass]="claseEstado(d.estatus)">
                    {{ d.estatus }}{{ d.aprobadoAutomaticamente ? ' (auto)' : '' }}
                </span>
            </div>

            <div *ngIf="d.estatus === 'Rechazado' && d.comentarioRevision"
                 class="text-[11px] text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-2">
                <b>Motivo del rechazo:</b> {{ d.comentarioRevision }}
                <span *ngIf="d.nombreRevisor" class="text-secondary"> — {{ d.nombreRevisor }}</span>
            </div>

            <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
                <button type="button" (click)="ver(d)" class="text-[10px] font-bold uppercase text-indigo-600 hover:underline flex items-center gap-1">
                    <mat-icon class="icon-size-4">visibility</mat-icon> Ver
                </button>
                <button type="button" (click)="descargar(d)" class="text-[10px] font-bold uppercase text-slate-500 hover:text-emerald-600 hover:underline flex items-center gap-1">
                    <mat-icon class="icon-size-4">download</mat-icon> Descargar
                </button>
                <button *ngIf="puedeBorrar(d)" type="button" (click)="eliminar(d)" class="text-[10px] font-bold uppercase text-red-500 hover:underline flex items-center gap-1">
                    <mat-icon class="icon-size-4">delete</mat-icon> Eliminar
                </button>

                <ng-container *ngIf="puedeRevisar && !datos?.cerrada">
                    <button *ngIf="d.estatus !== 'Aprobado'" type="button" (click)="aprobar(d)"
                            class="text-[10px] font-bold uppercase text-emerald-700 hover:underline flex items-center gap-1">
                        <mat-icon class="icon-size-4">check_circle</mat-icon> Aprobar
                    </button>
                    <button *ngIf="d.estatus !== 'Rechazado'" type="button" (click)="iniciarRechazo(d)"
                            class="text-[10px] font-bold uppercase text-rose-700 hover:underline flex items-center gap-1">
                        <mat-icon class="icon-size-4">cancel</mat-icon> Rechazar
                    </button>
                </ng-container>
            </div>

            <div *ngIf="rechazando?.idDocumento === d.idDocumento" class="space-y-2 pt-1">
                <textarea [(ngModel)]="motivoRechazo" rows="2" maxlength="500" placeholder="Motivo del rechazo (obligatorio)"
                          class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-xs"></textarea>
                <div class="flex gap-2 justify-end">
                    <button mat-button type="button" (click)="cancelarRechazo()">Cancelar</button>
                    <button mat-flat-button color="warn" type="button" [disabled]="!motivoRechazo.trim()" (click)="confirmarRechazo()">Rechazar documento</button>
                </div>
            </div>
        </div>
    </div>
</div>
```

```ts
// src/app/modules/admin/administration/documentos-requisicion/documentos-requisicion-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { DocumentosRequisicionComponent } from './documentos-requisicion.component';

/** Ventana con la documentación de una requisición (se abre desde la lista de «Solicitud de compras»). */
@Component({
    selector: 'documentos-requisicion-dialog',
    standalone: true,
    imports: [MatDialogModule, MatButtonModule, DocumentosRequisicionComponent],
    template: `
        <div class="flex flex-col max-h-[90vh] md:min-w-160">
            <div class="flex items-center justify-between p-5 border-b">
                <div class="text-xl font-extrabold tracking-tight">Documentos de la requisición <span *ngIf="data.folio">#{{ data.folio }}</span></div>
                <button mat-button mat-dialog-close>Cerrar</button>
            </div>
            <div class="p-5 overflow-y-auto">
                <documentos-requisicion [idSolicitud]="data.idSolicitud"></documentos-requisicion>
            </div>
        </div>
    `,
})
export class DocumentosRequisicionDialogComponent {
    constructor(@Inject(MAT_DIALOG_DATA) public data: { idSolicitud: number; folio?: string | number }) {}
}
```

> `*ngIf` en el template del diálogo requiere `CommonModule` en `imports`; agregarlo (`import { CommonModule } from '@angular/common';`).

- [ ] **Step 2: Colocar el componente en el diálogo de detalle**

En `solicitud-detalle-dialog.component.ts`: agregar `import { DocumentosRequisicionComponent } from '../../documentos-requisicion/documentos-requisicion.component';`, añadirlo al arreglo `imports` del `@Component`, y justo antes del bloque `<!-- Files -->` insertar:

```html
                    <!-- Documentación (factura, evidencia, comprobante de pago) -->
                    <documentos-requisicion [idSolicitud]="data.idSolicitud" (cambio)="loadDetail()"></documentos-requisicion>

```

- [ ] **Step 3: Subir el comprobante de pago como documento `Pago`**

En `tablero-compras.component.ts`: inyectar `private _documentosService: DocumentosRequisicionService` en el constructor (con su `import`), y en `_ejecutarEstadoLiquidacion` reemplazar

```ts
const uploads = archivos.map(file => this._solicitudCompraService.subirArchivo(row.idSolicitud, file, 'Pagos'));
```

por

```ts
const uploads = archivos.map(file => this._documentosService.subir(row.idSolicitud, 'Pago', file));
```

y, en los dos `next`/`error` de ese `forkJoin(uploads)`: en `next`, tras el `Swal.fire` de éxito añadir `this._solicitudCompraService.getTodas(this.fechaInicio, this.fechaFin).subscribe();` (la requisición pudo cerrarse); en `error`, mostrar el mensaje del API:

```ts
error: (err) => {
    Swal.fire('Atención', `Se cambió el estado de pago, pero el comprobante no se pudo subir: ${err?.error?.mensaje || 'inténtalo de nuevo desde el detalle de la requisición.'}`, 'warning');
}
```

- [ ] **Step 4: Botón «Documentos» en la lista de solicitudes**

En `solicitudes-compra/list/list.component.ts`: importar `DocumentosRequisicionDialogComponent`, agregar el método

```ts
    abrirDocumentos(solicitud: any): void {
        this._dialog.open(DocumentosRequisicionDialogComponent, {
            data: { idSolicitud: solicitud.idSolicitud, folio: solicitud.idSolicitud },
            width: '100%',
            maxWidth: '720px',
            autoFocus: false,
        });
    }
```

En `list.component.html`, junto al botón de eliminar (línea ~211), antes de él:

```html
                        <button mat-icon-button class="small-icon-button" (click)="abrirDocumentos(s)" matTooltip="Documentos">
                            <mat-icon>fact_check</mat-icon>
                        </button>
```

- [ ] **Step 5: Compilar con plantillas**

Run: `cd g:/dev/jr/jringenieria && npx tsc -p tsconfig.app.json --noEmit; echo "tsc: $?"; npx ngc -p tsconfig.app.json --noEmit; echo "ngc: $?"`
Expected: `tsc: 0` y `ngc: 0`.

---

### Task 8: Front — columna, chip, filtros y Excel del tablero

**Files:**
- Modify: `tablero-compras.component.ts` (columna, filtro, Excel), `tablero-compras.component.html` (columna, botón de filtro, etiqueta del reporte)

**Interfaces:**
- Consumes (Task 6): `chipDocumentacion`, `esPagadaSinDocumentos`, `tipoIncompleto`; `SolicitudCompra.documentacion`.

- [ ] **Step 1: Columna «Documentos»**

En `tablero-compras.component.ts`: agregar `'documentos'` a `displayedColumns` justo después de `'estadoLiquidacion'`; importar las utilidades y exponer:

```ts
import { chipDocumentacion, esPagadaSinDocumentos, tipoIncompleto } from 'app/core/documentos-requisicion/documentos-requisicion.utils';
...
    readonly chipDocumentos = chipDocumentacion;
```

En `tablero-compras.component.html`, después del `ng-container` de `estadoLiquidacion` (antes de `acciones`):

```html
                        <ng-container matColumnDef="documentos">
                            <th mat-header-cell *matHeaderCellDef class="text-center">Documentos</th>
                            <td mat-cell *matCellDef="let s" class="px-2 py-3 text-center">
                                <ng-container *ngIf="chipDocumentos(s.documentacion, s.estadoLiquidacion) as chip; else sinChip">
                                    <span class="px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider shadow-sm"
                                          [ngClass]="{
                                              'bg-emerald-100 text-emerald-700': chip.color === 'verde',
                                              'bg-amber-100 text-amber-700': chip.color === 'ambar',
                                              'bg-rose-100 text-rose-700': chip.color === 'rojo'
                                          }"
                                          [matTooltip]="chip.color === 'rojo' ? 'Liquidada y con documentación pendiente' : (chip.color === 'verde' ? 'Documentación completa' : 'Faltan documentos')">
                                        {{ chip.texto }}
                                    </span>
                                </ng-container>
                                <ng-template #sinChip><span class="text-gray-300">—</span></ng-template>
                            </td>
                        </ng-container>
```

- [ ] **Step 2: Filtros con datos reales**

En el predicado de filtros (`_setupFilterPredicate`), reemplazar las ramas `pendiente_factura` y `pendiente_evidencia` y agregar la nueva:

```ts
                } else if (filterObj.reportFilter === 'pendiente_factura') {
                    passReportFilters = tipoIncompleto(data, 'Factura');
                } else if (filterObj.reportFilter === 'pendiente_evidencia') {
                    passReportFilters = tipoIncompleto(data, 'Evidencia');
                } else if (filterObj.reportFilter === 'pagadas_sin_documentos') {
                    passReportFilters = esPagadaSinDocumentos(data);
                }
```

(conservando la rama `pendiente_pago` que ya existe). En el HTML, después del botón «PENDIENTES EVIDENCIA ALMACÉN»:

```html
                    <button mat-stroked-button
                            [ngClass]="selectedReportFilter === 'pagadas_sin_documentos' ? '!bg-rose-600 !text-white' : '!bg-white text-gray-700'"
                            class="!rounded-lg !text-xs !font-bold transition-all"
                            (click)="filterByReport('pagadas_sin_documentos')">
                        <mat-icon class="icon-size-4 mr-1.5" [ngClass]="selectedReportFilter === 'pagadas_sin_documentos' ? 'text-white' : 'text-rose-600'">fact_check</mat-icon>
                        PAGADAS SIN DOCUMENTACIÓN
                    </button>
```

y en la etiqueta «Reporte: …» agregar el caso `'pagadas_sin_documentos' ? 'PAGADAS SIN DOCUMENTACIÓN'`. Actualizar el comentario del campo `selectedReportFilter` para incluir el valor nuevo.

- [ ] **Step 3: Excel con datos reales**

En el exportador (el bloque que arma `hasFactura`, `hasEvidence`), reemplazar:

```ts
            const hasFactura = !!(s.datosFacturaContpaqi?.folioInternoFactura || s.datosFacturaContpaqi?.folioFacturaProveedor);
            ...
            const hasEvidence = s.idEstatus >= 7; // Estatus Recibido / Cerrada implies evidence loaded or pending closed
```

por la lectura del resumen, y los textos de columnas:

```ts
            const estadoDe = (tipo: string): string => {
                const r = s.documentacion?.requeridos?.find(x => x.tipo === tipo);
                if (!r) return 'NO APLICA';
                return ({ Completo: 'APROBADA', EnRevision: 'EN REVISIÓN', Rechazado: 'RECHAZADA', Falta: 'PENDIENTE' } as Record<string, string>)[r.estado] ?? r.estado;
            };
```

con las celdas `Factura (documento)` → `estadoDe('Factura')`, `Soporte Evidencia` → `estadoDe('Evidencia')` y una columna nueva `Comprobante de pago` → `estadoDe('Pago')`. (Mantener la columna `Factura CONTPAQi` como informativa.)

- [ ] **Step 4: Compilar con plantillas**

Run: `cd g:/dev/jr/jringenieria && npx tsc -p tsconfig.app.json --noEmit; echo "tsc: $?"; npx ngc -p tsconfig.app.json --noEmit; echo "ngc: $?"`
Expected: `tsc: 0` y `ngc: 0`.

---

### Task 9: Verificación final y entrega

**Files:** ninguno nuevo.

- [ ] **Step 1: Todas las pruebas juntas**

Run (PowerShell): `cd <pe_test>; Remove-Item bin,obj -Recurse -Force -ErrorAction SilentlyContinue; dotnet build -c Release --nologo -v q; dotnet bin\Release\net8.0\pe_test.dll | Select-String 'FALLA|PASARON|FALLARON'` y, en el front, las pruebas de `pe_front_test` (utilidades de A, servicio de A y utilidades de documentos).
Expected: `TODAS LAS PRUEBAS PASARON`; los tres scripts del front imprimen su `OK`.

- [ ] **Step 2: Compilación completa y migración**

Run: `dotnet build jr_api.csproj --nologo -v q` (API); `npx tsc ... ; npx ngc ...` (front); `dotnet ef migrations has-pending-model-changes ... --no-build` **después** de recompilar; `dotnet ef migrations script <migración de permisos> <migración de documentos> --no-build`.
Expected: sin errores; `No changes have been made to the model since the last migration.`; el SQL contiene solo el `CREATE TABLE [SolicitudesCompra_Documentos]`, sus índices y la inserción en `__EFMigrationsHistory`.

- [ ] **Step 3: Archivos y entrega**

Run: `git status --short` en ambos repositorios y listar solo los archivos de este plan. **No** hacer commit ni push salvo que el usuario lo pida. Informar: qué quedó hecho y probado; que el servicio con base de datos y disco, las integraciones del servicio de compras y las pantallas no se ejecutaron contra datos reales; los archivos compartidos con trabajo ajeno (`SolicitudesCompraService.cs`, `ISolicitudesCompraService.cs`, `SolicitudesCompraDto.cs`, `Program.cs`, `ApplicationDbContext.cs`, `ModelSnapshot.cs`, y en el front `tablero-compras.component.*`, `list.component.*`); y los pasos de despliegue (reiniciar el contenedor del API, luego el front; los usuarios 14 y 16 ya tienen el permiso de revisión).
