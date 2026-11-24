import { ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import Swal from 'sweetalert2';
import {
  ConteoPorEstatus,
  EngineeringService,
  GuardarSeguimientoMaterial,
  MATERIAL_ESTATUS,
  MaterialEstatus,
  ResumenTrazabilidadProyecto,
  SeguimientoMaterial
} from '../../../engineering.service';
import {
  MaterialesImportarExcelDialogComponent,
  MaterialesImportarExcelDialogData,
  MaterialesImportarExcelDialogResult
} from '../dialogs/materiales-importar-excel-dialog.component';
import { CLASES_ESTATUS, CLAVE_CONTEO, CONTEO_VACIO, contarPorEstatus } from './material-estatus';

export interface GrupoMateriales {
  clave: string;
  /** `null` = productos sin sección. */
  seccion: string | null;
  items: SeguimientoMaterial[];
}

export type FiltroEstatus = 'TODOS' | MaterialEstatus;

/**
 * Pestaña «Material y trazabilidad» del control de ejecución: responsable de compra, lista de productos (que viene del
 * Excel de la carpeta Materiales o se agrega a mano), estatus por producto, KPIs por estatus, proveedor y observaciones.
 */
@Component({
  selector: 'app-materiales-trazabilidad',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatDialogModule, MatIconModule, MatTooltipModule],
  templateUrl: './materiales-trazabilidad.component.html'
})
export class MaterialesTrazabilidadComponent implements OnChanges {
  @Input() idSeguimiento: number | null = null;
  /** Usuarios del sistema (`usuarioId`, `nombreUsuario`) para elegir al responsable de compra. */
  @Input() usuarios: any[] = [];

  readonly estatus = MATERIAL_ESTATUS;
  readonly clases = CLASES_ESTATUS;
  readonly claveConteo = CLAVE_CONTEO;

  resumen: ResumenTrazabilidadProyecto | null = null;
  materiales: SeguimientoMaterial[] = [];
  conteo: ConteoPorEstatus = { ...CONTEO_VACIO };
  /** Lo que se pinta: productos filtrados y agrupados por sección. Se recalcula al cambiar el dato o el filtro. */
  grupos: GrupoMateriales[] = [];
  visibles = 0;

  cargando = false;
  errorCarga: string | null = null;

  responsableId: number | null = null;
  guardandoResponsable = false;

  filtroTexto = '';
  filtroEstatus: FiltroEstatus = 'TODOS';

  seleccionados = new Set<number>();
  todosMarcados = false;
  estatusMasivo: MaterialEstatus = 'Listo';
  aplicandoMasivo = false;

  // Alta / edición manual
  showMaterialModal = false;
  editingMaterialId: number | null = null;
  materialFormTipoItem = 1; // 1: material, 2: servicio / renta
  materialFormCodigo = '';
  materialFormDescripcion = '';
  materialFormUnidad = 'PZA';
  materialFormCantidad = 1;
  materialFormPrecioUnitario = 0;
  materialFormNotas = '';
  materialFormMarca = '';
  materialFormSeccion = '';
  private marcaOriginal: string | null | undefined = null;
  private seccionOriginal: string | null | undefined = null;
  isSavingMaterial = false;
  errorModal: string | null = null;

  /** Productos con un cambio de estatus en vuelo (su selector se deshabilita). */
  private enVuelo = new Set<number>();
  private expandidos = new Set<number>();

  constructor(
    private engineering: EngineeringService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['idSeguimiento'] && this.idSeguimiento) {
      this.cargar();
    }
  }

  // ---------------------------------------------------------------- carga
  cargar(): void {
    if (!this.idSeguimiento) {
      return;
    }
    this.cargando = true;
    this.errorCarga = null;
    this.engineering.getMaterialesTrazabilidad(this.idSeguimiento).subscribe({
      next: (res) => {
        this.cargando = false;
        this.aplicar(res);
      },
      error: () => {
        this.cargando = false;
        this.errorCarga = 'No se pudo cargar la lista de materiales. Intenta de nuevo.';
        this.cdr.markForCheck();
      }
    });
  }

  private aplicar(res: ResumenTrazabilidadProyecto | null): void {
    this.resumen = res;
    this.materiales = (res?.materiales ?? []).map(m => ({ ...m, expanded: this.expandidos.has(m.idMaterial) }));
    this.conteo = res?.conteoPorEstatus ? { ...res.conteoPorEstatus } : contarPorEstatus(this.materiales);
    this.responsableId = res?.responsableCompra?.usuarioId ?? null;
    const ids = new Set(this.materiales.map(m => m.idMaterial));
    this.seleccionados.forEach(id => { if (!ids.has(id)) { this.seleccionados.delete(id); } });
    this.recalcular();
  }

  /** Agrupa por sección lo que pasa el filtro de texto y de estatus. */
  recalcular(): void {
    const texto = this.filtroTexto.trim().toLowerCase();
    const grupos: GrupoMateriales[] = [];
    const porClave = new Map<string, GrupoMateriales>();
    let visibles = 0;

    for (const m of this.materiales) {
      if (this.filtroEstatus !== 'TODOS' && m.estatus !== this.filtroEstatus) {
        continue;
      }
      if (texto && ![m.descripcion, m.codigoProducto, m.notas, m.marca, m.proveedorNombre, m.seccion]
        .some(v => (v ?? '').toLowerCase().includes(texto))) {
        continue;
      }
      const clave = m.seccion?.trim() || '';
      let grupo = porClave.get(clave);
      if (!grupo) {
        grupo = { clave, seccion: clave || null, items: [] };
        porClave.set(clave, grupo);
        grupos.push(grupo);
      }
      grupo.items.push(m);
      visibles++;
    }

    this.grupos = grupos;
    this.visibles = visibles;
    this.todosMarcados = visibles > 0 && grupos.every(g => g.items.every(i => this.seleccionados.has(i.idMaterial)));
    this.cdr.markForCheck();
  }

  onFiltroTexto(valor: string): void {
    this.filtroTexto = valor;
    this.recalcular();
  }

  /** Clic en una tarjeta de KPI: filtra por ese estatus; otra vez el mismo (o «Total») lo quita. */
  filtrarPor(estatus: FiltroEstatus): void {
    this.filtroEstatus = this.filtroEstatus === estatus ? 'TODOS' : estatus;
    this.recalcular();
  }

  valorKpi(clave: FiltroEstatus): number {
    return clave === 'TODOS' ? this.conteo.total : this.conteo[CLAVE_CONTEO[clave]];
  }

  etiquetaEstatus(codigo: string): string {
    return this.estatus.find(e => e.codigo === codigo)?.etiqueta ?? codigo;
  }

  trackPorMaterial(_: number, m: SeguimientoMaterial): number {
    return m.idMaterial;
  }

  // ------------------------------------------------------------ responsable
  cambiarResponsable(usuarioId: number | null): void {
    if (!this.idSeguimiento || this.guardandoResponsable) {
      return;
    }
    const anterior = this.resumen?.responsableCompra?.usuarioId ?? null;
    if (usuarioId === anterior) {
      return;
    }
    this.guardandoResponsable = true;
    this.engineering.asignarResponsableCompra(this.idSeguimiento, usuarioId).subscribe({
      next: (res) => {
        this.guardandoResponsable = false;
        if (this.resumen) {
          this.resumen = { ...this.resumen, responsableCompra: res.responsableCompra };
        }
        this.responsableId = res.responsableCompra?.usuarioId ?? null;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoResponsable = false;
        this.responsableId = anterior; // el selector vuelve al valor guardado
        this.cdr.markForCheck();
        Swal.fire('No se pudo guardar', this.mensajeDe(err, 'No se pudo asignar al responsable de compra.'), 'error');
      }
    });
  }

  // ---------------------------------------------------------------- estatus
  estaGuardando(item: SeguimientoMaterial): boolean {
    return this.enVuelo.has(item.idMaterial);
  }

  /** Cambia el estatus de un producto; si el API falla, la fila vuelve al estatus anterior. */
  cambiarEstatus(item: SeguimientoMaterial, nuevo: MaterialEstatus): void {
    if (this.enVuelo.has(item.idMaterial) || nuevo === item.estatus) {
      return;
    }
    const anterior = item.estatus;
    item.estatus = nuevo;
    this.enVuelo.add(item.idMaterial);
    this.conteo = contarPorEstatus(this.materiales);
    this.recalcular();

    this.engineering.cambiarEstatusMaterial(item.idMaterial, nuevo).subscribe({
      next: (res) => {
        this.enVuelo.delete(item.idMaterial);
        item.estatus = res?.estatus ?? nuevo;
        item.fechaEstatus = res?.fechaEstatus ?? item.fechaEstatus;
        this.conteo = contarPorEstatus(this.materiales);
        this.recalcular();
      },
      error: (err: HttpErrorResponse) => {
        this.enVuelo.delete(item.idMaterial);
        item.estatus = anterior;
        this.conteo = contarPorEstatus(this.materiales);
        this.recalcular();
        Swal.fire('No se pudo cambiar el estatus', this.mensajeDe(err, 'Intenta de nuevo.'), 'error');
      }
    });
  }

  toggleSeleccion(item: SeguimientoMaterial): void {
    if (this.seleccionados.has(item.idMaterial)) {
      this.seleccionados.delete(item.idMaterial);
    } else {
      this.seleccionados.add(item.idMaterial);
    }
    this.recalcular();
  }

  toggleTodos(): void {
    const ids = this.grupos.flatMap(g => g.items.map(i => i.idMaterial));
    if (this.todosMarcados) {
      ids.forEach(id => this.seleccionados.delete(id));
    } else {
      ids.forEach(id => this.seleccionados.add(id));
    }
    this.recalcular();
  }

  limpiarSeleccion(): void {
    this.seleccionados.clear();
    this.recalcular();
  }

  async aplicarMasivo(): Promise<void> {
    if (!this.idSeguimiento || this.aplicandoMasivo || this.seleccionados.size === 0) {
      return;
    }
    this.aplicandoMasivo = true;
    const ids = Array.from(this.seleccionados);
    const confirmacion = await Swal.fire({
      title: '¿Cambiar el estatus?',
      text: `Se cambiará el estatus de ${ids.length} producto(s) a «${this.etiquetaEstatus(this.estatusMasivo)}».`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar'
    });
    if (!confirmacion.isConfirmed) {
      this.aplicandoMasivo = false;
      this.cdr.markForCheck();
      return;
    }
    this.engineering.cambiarEstatusMasivo(this.idSeguimiento, ids, this.estatusMasivo).subscribe({
      next: (res) => {
        this.aplicandoMasivo = false;
        this.seleccionados.clear();
        this.aplicar(res);
      },
      error: (err: HttpErrorResponse) => {
        this.aplicandoMasivo = false;
        this.cdr.markForCheck();
        Swal.fire('No se pudo cambiar el estatus', this.mensajeDe(err, 'No se cambió ningún producto. Intenta de nuevo.'), 'error');
      }
    });
  }

  toggleExpandir(item: SeguimientoMaterial): void {
    item.expanded = !item.expanded;
    if (item.expanded) {
      this.expandidos.add(item.idMaterial);
    } else {
      this.expandidos.delete(item.idMaterial);
    }
    this.cdr.markForCheck();
  }

  // ---------------------------------------------------------- Excel
  abrirImportarExcel(): void {
    if (!this.idSeguimiento) {
      return;
    }
    const ref = this.dialog.open<MaterialesImportarExcelDialogComponent, MaterialesImportarExcelDialogData, MaterialesImportarExcelDialogResult>(
      MaterialesImportarExcelDialogComponent,
      { width: '1000px', maxWidth: '95vw', autoFocus: false, data: { idSeguimiento: this.idSeguimiento } }
    );
    ref.afterClosed().subscribe(res => {
      if (res?.importado) {
        this.aplicar(res.resultado.trazabilidad);
        const i = res.resultado.importacion;
        Swal.fire({
          icon: 'success',
          title: 'Importación terminada',
          text: `Agregados: ${i.agregados} · Actualizados: ${i.actualizados} · Sin cambio: ${i.sinCambio}.`,
          timer: 2500,
          showConfirmButton: false
        });
      }
    });
  }

  // ------------------------------------------------- alta / edición manual
  abrirModalNuevoMaterial(tipoItem: number = 1): void {
    this.editingMaterialId = null;
    this.materialFormTipoItem = tipoItem;
    this.materialFormCodigo = '';
    this.materialFormDescripcion = '';
    this.materialFormUnidad = tipoItem === 2 ? 'SERV' : 'PZA';
    this.materialFormCantidad = 1;
    this.materialFormPrecioUnitario = 0;
    this.materialFormNotas = '';
    this.materialFormMarca = '';
    this.materialFormSeccion = '';
    this.marcaOriginal = null;
    this.seccionOriginal = null;
    this.errorModal = null;
    this.showMaterialModal = true;
    this.cdr.markForCheck();
  }

  editarMaterial(item: SeguimientoMaterial): void {
    this.editingMaterialId = item.idMaterial;
    this.materialFormTipoItem = item.tipoItem;
    this.materialFormCodigo = item.codigoProducto || '';
    this.materialFormDescripcion = item.descripcion || '';
    this.materialFormUnidad = item.unidadMedida || 'PZA';
    this.materialFormCantidad = item.cantidadCotizada || 0;
    this.materialFormPrecioUnitario = item.precioUnitarioCotizado || 0;
    this.materialFormNotas = item.notas || '';
    this.materialFormMarca = item.marca || '';
    this.materialFormSeccion = item.seccion || '';
    this.marcaOriginal = item.marca;
    this.seccionOriginal = item.seccion;
    this.errorModal = null;
    this.showMaterialModal = true;
    this.cdr.markForCheck();
  }

  cerrarModalMaterial(): void {
    if (this.isSavingMaterial) {
      return;
    }
    this.showMaterialModal = false;
    this.editingMaterialId = null;
    this.errorModal = null;
    this.cdr.markForCheck();
  }

  get puedeGuardarMaterial(): boolean {
    return !this.isSavingMaterial && !!this.materialFormDescripcion.trim() && Number(this.materialFormCantidad) > 0;
  }

  guardarMaterialSubmit(): void {
    if (!this.idSeguimiento || !this.puedeGuardarMaterial) {
      return;
    }
    const cantidad = Number(this.materialFormCantidad);
    const precio = Number(this.materialFormPrecioUnitario) || 0;
    const payload: GuardarSeguimientoMaterial = {
      idMaterial: this.editingMaterialId || undefined,
      idSeguimiento: this.idSeguimiento,
      tipoItem: this.materialFormTipoItem,
      codigoProducto: this.materialFormCodigo?.trim() || undefined,
      descripcion: this.materialFormDescripcion.trim(),
      unidadMedida: this.materialFormUnidad.trim(),
      cantidadCotizada: cantidad,
      precioUnitarioCotizado: precio,
      importeCotizado: cantidad * precio,
      notas: this.materialFormNotas?.trim() || undefined,
      // Contrato §6.2: null/ausente = sin cambio; cadena vacía = limpiar. Solo se manda lo que la persona tocó.
      marca: this.valorOpcional(this.marcaOriginal, this.materialFormMarca),
      seccion: this.valorOpcional(this.seccionOriginal, this.materialFormSeccion)
    };

    this.isSavingMaterial = true;
    this.errorModal = null;
    const edicion = !!this.editingMaterialId;
    this.engineering.guardarMaterial(payload).subscribe({
      next: (res) => {
        this.isSavingMaterial = false;
        this.showMaterialModal = false;
        this.editingMaterialId = null;
        this.aplicar(res);
        Swal.fire({ icon: 'success', title: edicion ? 'Producto actualizado' : 'Producto agregado', timer: 1500, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => {
        this.isSavingMaterial = false;
        this.errorModal = this.mensajeDe(err, 'No se pudo guardar el producto.');
        this.cdr.markForCheck();
      }
    });
  }

  eliminarMaterialItem(item: SeguimientoMaterial): void {
    if (!item?.idMaterial) {
      return;
    }
    Swal.fire({
      title: '¿Eliminar este producto?',
      text: 'Se quitará de la lista de materiales de este proyecto.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (!result.isConfirmed) {
        return;
      }
      this.engineering.eliminarMaterial(item.idMaterial).subscribe({
        next: (res) => {
          this.aplicar(res);
          Swal.fire({ icon: 'success', title: 'Eliminado correctamente', timer: 1500, showConfirmButton: false });
        },
        error: (err: HttpErrorResponse) => {
          Swal.fire('No se pudo eliminar', this.mensajeDe(err, 'No se pudo eliminar el producto.'), 'error');
        }
      });
    });
  }

  /** Si no había valor y no se escribió nada, no se manda (`undefined` = sin cambio); si no, se manda lo escrito (vacío limpia). */
  private valorOpcional(original: string | null | undefined, escrito: string): string | undefined {
    const nuevo = (escrito ?? '').trim();
    if (!original && !nuevo) {
      return undefined;
    }
    return nuevo;
  }

  private mensajeDe(err: HttpErrorResponse, generico: string): string {
    const mensaje = err?.error?.mensaje;
    return typeof mensaje === 'string' && mensaje.trim() ? mensaje : generico;
  }
}
