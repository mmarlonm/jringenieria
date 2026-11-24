import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormControl, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import Swal from 'sweetalert2';
import { TipoCotizacionSgc } from 'app/modules/admin/dashboards/quotes-products/quotes-products.types';
import { ProjectService } from 'app/modules/admin/dashboards/project/project.service';
import {
  ConvertirRequerimientoResultado,
  CotizacionVinculada,
  Requerimiento,
  RequerimientosService
} from '../requerimientos.service';

export function folioCotizacionValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value;
    if (valor === null || valor === undefined || valor === '') {
      return null;
    }
    const str = String(valor);
    if (str.length > 0 && str.trim().length === 0) {
      return { soloEspacios: true };
    }
    if (/[\u0000-\u001F\u007F]/.test(str)) {
      return { caracterControl: true };
    }
    return null;
  };
}

export interface ConvertirCotizacionDialogData {
  requerimiento: Requerimiento;
}

/** Lo que devuelve el diálogo cuando la conversión se hizo. Cerrar sin convertir devuelve `undefined`. */
export interface ConvertirCotizacionDialogResult {
  convertido: true;
  resultado: ConvertirRequerimientoResultado;
}

export interface UnidadDeNegocioOpcion {
  unidadId: number;
  nombre: string;
}

export const TIPOS_COTIZACION: ReadonlyArray<{ codigo: TipoCotizacionSgc; nombre: string }> = [
  { codigo: 'CS', nombre: 'Comercial' },
  { codigo: 'CT', nombre: 'Técnico-comercial' },
  { codigo: 'CE', nombre: 'Estratégica' }
];

/**
 * Convierte un requerimiento aprobado en una cotización PROPIA (contrato v1.7): no se pide ni se trae nada de CONTPAQ.
 * Solo se elige el tipo y la unidad de negocio; el API copia el cliente, el contacto y la descripción del requerimiento.
 */
@Component({
  selector: 'app-requerimiento-convertir-cotizacion-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './requerimiento-convertir-cotizacion-dialog.component.html'
})
export class RequerimientoConvertirCotizacionDialogComponent implements OnInit {
  readonly tipos = TIPOS_COTIZACION;
  readonly tipoSugerido: TipoCotizacionSgc;

  readonly folioControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(50), folioCotizacionValidator()]
  });
  readonly tipoControl: FormControl<TipoCotizacionSgc>;
  readonly unidadControl = new FormControl<number | null>(null, { validators: [Validators.required] });

  unidades: UnidadDeNegocioOpcion[] = [];
  cargandoUnidades = true;
  errorUnidades = false;

  /** Si el API contesta que el requerimiento ya tiene cotización. */
  cotizacionExistente: CotizacionVinculada | null = null;
  errorMensaje: string | null = null;
  convirtiendo = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ConvertirCotizacionDialogData,
    private dialogRef: MatDialogRef<RequerimientoConvertirCotizacionDialogComponent, ConvertirCotizacionDialogResult>,
    private reqService: RequerimientosService,
    private projectService: ProjectService
  ) {
    this.tipoSugerido = RequerimientoConvertirCotizacionDialogComponent.sugerirTipo(data.requerimiento);
    this.tipoControl = new FormControl<TipoCotizacionSgc>(this.tipoSugerido, { nonNullable: true });
  }

  ngOnInit(): void {
    this.cargarUnidades();
  }

  /** Con caso en Ingeniería o ruta técnica se sugiere Técnico-comercial; si no, Comercial. */
  static sugerirTipo(req: Requerimiento): TipoCotizacionSgc {
    const ruta = (req?.rutaAtencion || '').toLowerCase();
    return req?.seguimientoProyectoId || ruta.includes('técnic') || ruta.includes('tecnic') ? 'CT' : 'CS';
  }

  get puedeConvertir(): boolean {
    return this.folioControl.valid
      && this.unidadControl.valid
      && !this.cotizacionExistente
      && !this.convirtiendo
      && !this.cargandoUnidades;
  }

  cargarUnidades(): void {
    this.cargandoUnidades = true;
    this.errorUnidades = false;
    this.projectService.getUnidadesDeNegocio().subscribe({
      next: (lista) => {
        this.unidades = (lista ?? [])
          .filter((u) => u && typeof u.unidadId === 'number')
          .map((u) => ({ unidadId: u.unidadId, nombre: u.nombre }));
        // Con una sola unidad no hay nada que elegir.
        if (this.unidades.length === 1) {
          this.unidadControl.setValue(this.unidades[0].unidadId);
        }
        this.cargandoUnidades = false;
      },
      error: () => {
        this.cargandoUnidades = false;
        this.errorUnidades = true;
      }
    });
  }

  async convertir(): Promise<void> {
    const unidadDeNegocioId = this.unidadControl.value;
    const folio = this.folioControl.value?.trim();
    if (!this.puedeConvertir || unidadDeNegocioId === null || !folio) {
      return;
    }
    // Se marca antes de la confirmación: un segundo clic mientras se decide no abre otra.
    // Y no se puede cerrar con Esc ni clic afuera: la conversión en vuelo debe poder avisar su resultado.
    this.bloquear(true);
    this.errorMensaje = null;

    const confirmacion = await Swal.fire({
      title: '¿Convertir a cotización?',
      text: 'Se creará una cotización propia en borrador con el cliente, el contacto y la descripción de este requerimiento. Después podrás capturar las partidas.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, convertir',
      cancelButtonText: 'Cancelar'
    });
    if (!confirmacion.isConfirmed) {
      this.bloquear(false);
      return;
    }

    this.reqService.convertirACotizacion({
      requerimientoId: this.data.requerimiento.id,
      tipo: this.tipoControl.value,
      unidadDeNegocioId,
      folioCotizacion: folio
    }).subscribe({
      next: (resultado) => {
        this.dialogRef.close({ convertido: true, resultado });
      },
      error: (err: HttpErrorResponse) => {
        this.bloquear(false);
        this.manejarErrorDeConversion(err);
      }
    });
  }

  private bloquear(valor: boolean): void {
    this.convirtiendo = valor;
    this.dialogRef.disableClose = valor;
  }

  cancelar(): void {
    if (this.convirtiendo) {
      return;
    }
    this.dialogRef.close();
  }

  etiquetaTipo(codigo: string): string {
    return this.tipos.find(t => t.codigo === codigo)?.nombre ?? codigo;
  }

  private manejarErrorDeConversion(err: HttpErrorResponse): void {
    if (err.status === 409 && err.error?.cotizacionVinculada) {
      this.cotizacionExistente = err.error.cotizacionVinculada;
    }
    const mensaje = err?.error?.mensaje;
    this.errorMensaje = typeof mensaje === 'string' && mensaje.trim()
      ? mensaje
      : 'No se pudo convertir el requerimiento. Intenta de nuevo.';
  }
}
