import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { EngineeringService, ProveedorLigero, SeguimientoMaterial } from '../../../engineering.service';
import { MaterialObservacionesDialogComponent, MaterialObservacionesDialogData } from '../materiales-trazabilidad/material-observaciones-dialog/material-observaciones-dialog.component';

export interface MaterialCompraDialogData {
  material: SeguimientoMaterial;
}

/** Proveedor ya elegido: del catálogo o el que traía el producto. */
export interface ProveedorElegido {
  idProveedor: number;
  etiqueta: string;
}

export const MAX_OBSERVACIONES = 1000;
export const ESPERA_BUSQUEDA_MS = 250;
export const LIMITE_PROVEEDORES = 50;

/** Nombre comercial si lo tiene; si no, la razón social. */
export function etiquetaProveedor(p: Pick<ProveedorLigero, 'razonSocial' | 'nombreComercial'>): string {
  return (p.nombreComercial || '').trim() || p.razonSocial;
}

/**
 * Elige el proveedor (del catálogo ligero, nunca del maestro completo: ese trae datos bancarios) y escribe las
 * observaciones de un producto. Siempre se mandan los dos valores al API (contrato §6.7).
 */
@Component({
  selector: 'app-material-compra-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatAutocompleteModule, MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatIconModule, MatInputModule
  ],
  templateUrl: './material-compra-dialog.component.html'
})
export class MaterialCompraDialogComponent implements OnInit, OnDestroy {
  readonly maxObservaciones = MAX_OBSERVACIONES;

  readonly busquedaControl = new FormControl<string>('', { nonNullable: true });
  readonly observacionesControl: FormControl<string>;

  proveedor: ProveedorElegido | null;
  opciones: ProveedorLigero[] = [];
  buscando = false;
  errorBusqueda: string | null = null;
  guardando = false;
  errorMensaje: string | null = null;

  private readonly inicial: { proveedorId: number | null };
  private readonly consultas = new Subject<string>();
  private readonly suscripciones = new Subscription();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: MaterialCompraDialogData,
    private dialogRef: MatDialogRef<MaterialCompraDialogComponent, SeguimientoMaterial>,
    private engineering: EngineeringService,
    private dialog: MatDialog
  ) {
    const m = data.material;
    this.proveedor = m.proveedorId
      ? { idProveedor: m.proveedorId, etiqueta: (m.proveedorNombre || '').trim() || 'Proveedor sin nombre' }
      : null;
    this.observacionesControl = new FormControl<string>('', { nonNullable: true });
    this.inicial = { proveedorId: m.proveedorId ?? null };
  }

  ngOnInit(): void {
    // Cada consulta cancela la anterior (switchMap): una respuesta vieja no pisa a la nueva.
    this.suscripciones.add(
      this.consultas.pipe(
        debounceTime(ESPERA_BUSQUEDA_MS),
        distinctUntilChanged(),
        switchMap((q) => {
          this.buscando = true;
          this.errorBusqueda = null;
          return this.engineering.getProveedoresMateriales(q, LIMITE_PROVEEDORES).pipe(
            catchError(() => {
              this.errorBusqueda = 'No se pudo consultar el catálogo de proveedores. Intenta de nuevo.';
              return of(null);
            })
          );
        })
      ).subscribe((lista) => {
        this.buscando = false;
        if (lista) {
          this.opciones = lista;
        }
      })
    );
    this.suscripciones.add(this.busquedaControl.valueChanges.subscribe((v) => this.consultas.next((v ?? '').trim())));
  }

  ngOnDestroy(): void {
    this.suscripciones.unsubscribe();
  }

  /** Al enfocar el buscador se muestran los primeros proveedores aunque no se haya escrito nada. */
  alEnfocarBusqueda(): void {
    if (this.opciones.length === 0 && !this.buscando) {
      this.consultas.next(this.busquedaControl.value.trim());
    }
  }

  alElegir(evento: MatAutocompleteSelectedEvent): void {
    const p = evento.option.value as ProveedorLigero;
    this.proveedor = { idProveedor: p.idProveedor, etiqueta: etiquetaProveedor(p) };
    this.busquedaControl.setValue('', { emitEvent: false });
  }

  quitarProveedor(): void {
    this.proveedor = null;
  }

  etiqueta(p: ProveedorLigero): string {
    return etiquetaProveedor(p);
  }

  /** Para que el autocomplete no escriba el objeto en el campo: el elegido se muestra aparte. */
  mostrarVacio = (): string => '';

  get observacionActual(): string {
    return (this.data.material.notas || '').trim();
  }

  get conteoHistorial(): number {
    return this.data.material.observacionesCount || 0;
  }

  verHistorial(): void {
    this.dialog.open<MaterialObservacionesDialogComponent, MaterialObservacionesDialogData>(
      MaterialObservacionesDialogComponent,
      { width: '600px', maxWidth: '95vw', autoFocus: false, data: { material: this.data.material } }
    );
  }

  get cuenta(): number {
    return this.observacionesControl.value.length;
  }

  get excede(): boolean {
    return this.cuenta > MAX_OBSERVACIONES;
  }

  get hayCambios(): boolean {
    const proveedorCambio = (this.proveedor?.idProveedor ?? null) !== this.inicial.proveedorId;
    const nuevaRecortada = this.observacionesControl.value.trim();
    const observacionActual = (this.data.material.notas || '').trim();
    const observacionNuevaValida = nuevaRecortada.length > 0 && nuevaRecortada !== observacionActual;
    return proveedorCambio || observacionNuevaValida;
  }

  get puedeGuardar(): boolean {
    return !this.guardando && !this.excede && this.hayCambios;
  }

  guardar(): void {
    if (!this.puedeGuardar) {
      return;
    }
    this.guardando = true;
    this.dialogRef.disableClose = true;
    this.errorMensaje = null;
    const nuevaRecortada = this.observacionesControl.value.trim();
    const notas = nuevaRecortada || (this.data.material.notas?.trim() || null);
    this.engineering.guardarCompraMaterial(this.data.material.idMaterial, {
      proveedorId: this.proveedor?.idProveedor ?? null,
      notas: notas
    }).subscribe({
      next: (material) => {
        this.dialogRef.close(material);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        this.dialogRef.disableClose = false;
        const mensaje = err?.error?.mensaje;
        this.errorMensaje = typeof mensaje === 'string' && mensaje.trim() ? mensaje : 'No se pudo guardar. Intenta de nuevo.';
      }
    });
  }

  cancelar(): void {
    if (this.guardando) {
      return;
    }
    this.dialogRef.close();
  }
}
