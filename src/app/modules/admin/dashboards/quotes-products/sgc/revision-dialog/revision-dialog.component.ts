import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { QuotesService } from '../../quotes-products.service';
import { CatalogosSgc } from '../../quotes-products.types';

export const PUNTOS_REVISION: { codigo: string; nombre: string }[] = [
  { codigo: 'CorrespondeAlRequerimiento', nombre: 'Correspondencia con el requerimiento' },
  { codigo: 'AlcanceClaro', nombre: 'Claridad del alcance' },
  { codigo: 'CoherenciaTecnica', nombre: 'Coherencia técnica' },
  { codigo: 'ExactitudDePrecios', nombre: 'Exactitud de precios' },
  { codigo: 'CodigosYCatalogosValidos', nombre: 'Validez de códigos y catálogos' },
  { codigo: 'Existencia', nombre: 'Existencia' },
  { codigo: 'TiemposRazonables', nombre: 'Tiempos de entrega o ejecución razonables' },
  { codigo: 'CondicionesDePagoCorrectas', nombre: 'Condiciones de pago correctas' },
  { codigo: 'CondicionesDeEntrega', nombre: 'Condiciones de entrega' },
  { codigo: 'Vigencia', nombre: 'Vigencia' },
  { codigo: 'AprobacionInternaSegunNivel', nombre: 'Aprobación interna según nivel definido' },
];

const NOMBRES_ROLES: Record<string, string> = {
  Comercial: 'Comercial',
  Ingenieria: 'Ingeniería',
  Direccion: 'Dirección',
};

export const PUNTOS_REQUERIDOS_POR_ROL: Record<string, string[]> = {
  Comercial: [
    'CorrespondeAlRequerimiento',
    'ExactitudDePrecios',
    'CodigosYCatalogosValidos',
    'Existencia',
    'CondicionesDePagoCorrectas',
    'CondicionesDeEntrega',
    'Vigencia',
    'AprobacionInternaSegunNivel',
  ],
  Ingenieria: [
    'CorrespondeAlRequerimiento',
    'AlcanceClaro',
    'CoherenciaTecnica',
    'TiemposRazonables',
  ],
  Direccion: [
    'AprobacionInternaSegunNivel',
  ],
};

@Component({
  selector: 'app-revision-dialog',
  templateUrl: './revision-dialog.component.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
})
export class RevisionDialogComponent implements OnInit {
  rol: string = 'Comercial';
  cotizacionId: number = 0;
  puntos: { codigo: string; nombre: string }[] = PUNTOS_REVISION;
  puntosObligatorios: string[] = [];
  checklist: Record<string, boolean> = {};
  comentarios: string = '';
  guardando: boolean = false;
  errorMensaje: string = '';
  errores: string[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { rol: string; cotizacionId: number; catalogos?: CatalogosSgc | null },
    public dialogRef: MatDialogRef<RevisionDialogComponent>,
    private quotesService: QuotesService
  ) {}

  ngOnInit(): void {
    this.rol = this.data?.rol || 'Comercial';
    this.cotizacionId = this.data?.cotizacionId || 0;

    const obligatorios =
      this.data?.catalogos?.puntosRequeridosPorRol?.[this.rol] ||
      PUNTOS_REQUERIDOS_POR_ROL[this.rol] ||
      [];
    this.puntosObligatorios = obligatorios;

    // Los puntos y sus códigos los define el API; la constante local solo es respaldo
    const delCatalogo = this.data?.catalogos?.puntosRevision;
    if (delCatalogo && delCatalogo.length > 0) {
      this.puntos = delCatalogo;
    }

    for (const punto of this.puntos) {
      this.checklist[punto.codigo] = false;
    }
  }

  get nombreRol(): string {
    return NOMBRES_ROLES[this.rol] || this.rol;
  }

  esObligatorio(codigo: string): boolean {
    return this.puntosObligatorios.includes(codigo);
  }

  get puntosObligatoriosCompletos(): boolean {
    return this.puntosObligatorios.every((p) => !!this.checklist[p]);
  }

  get puedeAprobar(): boolean {
    return !this.guardando && this.puntosObligatoriosCompletos;
  }

  get comentariosValidos(): boolean {
    return (this.comentarios || '').trim().length >= 10;
  }

  get puedeRechazar(): boolean {
    return !this.guardando && this.comentariosValidos;
  }

  get caracteresRestantesRechazo(): number {
    return Math.max(0, 10 - (this.comentarios || '').trim().length);
  }

  aprobar(): void {
    if (!this.puedeAprobar) return;
    this.guardando = true;
    this.dialogRef.disableClose = true;
    this.errorMensaje = '';
    this.errores = [];

    this.quotesService
      .registrarRevision(this.cotizacionId, {
        rol: this.rol,
        resultado: 'Aprobada',
        checklist: this.checklist,
        comentarios: this.comentarios,
      })
      .subscribe({
        next: () => {
          this.guardando = false;
          this.dialogRef.close({ guardado: true, resultado: 'Aprobada' });
        },
        error: (err) => {
          this.guardando = false;
          this.dialogRef.disableClose = false;
          this.errorMensaje = err?.error?.mensaje || 'Error al registrar la aprobación.';
          this.errores = err?.error?.errores || [];
        },
      });
  }

  rechazar(): void {
    if (!this.puedeRechazar) return;
    this.guardando = true;
    this.dialogRef.disableClose = true;
    this.errorMensaje = '';
    this.errores = [];

    this.quotesService
      .registrarRevision(this.cotizacionId, {
        rol: this.rol,
        resultado: 'Rechazada',
        checklist: this.checklist,
        comentarios: this.comentarios,
      })
      .subscribe({
        next: () => {
          this.guardando = false;
          this.dialogRef.close({ guardado: true, resultado: 'Rechazada' });
        },
        error: (err) => {
          this.guardando = false;
          this.dialogRef.disableClose = false;
          this.errorMensaje = err?.error?.mensaje || 'Error al registrar el rechazo.';
          this.errores = err?.error?.errores || [];
        },
      });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
