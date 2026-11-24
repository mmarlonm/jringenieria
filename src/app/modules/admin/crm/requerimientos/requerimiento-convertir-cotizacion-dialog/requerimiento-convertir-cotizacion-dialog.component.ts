import { Component, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { TipoCotizacionSgc } from 'app/modules/admin/dashboards/quotes-products/quotes-products.types';
import {
  CoincidenciaFolioContpaq,
  ConvertirRequerimientoResultado,
  CotizacionVinculada,
  Requerimiento,
  RequerimientosService
} from '../requerimientos.service';

export interface ConvertirCotizacionDialogData {
  requerimiento: Requerimiento;
}

/** Lo que devuelve el diálogo cuando la conversión se hizo. Cerrar sin convertir devuelve `undefined`. */
export interface ConvertirCotizacionDialogResult {
  convertido: true;
  resultado: ConvertirRequerimientoResultado;
}

/** Mismo criterio que el API (contrato §2): letras, dígitos y guion, de 1 a 30; se toleran espacios alrededor. */
const PATRON_FOLIO = /^\s*[A-Za-z0-9-]{1,30}\s*$/;

export const TIPOS_COTIZACION: ReadonlyArray<{ codigo: TipoCotizacionSgc; nombre: string }> = [
  { codigo: 'CS', nombre: 'Comercial' },
  { codigo: 'CT', nombre: 'Técnico-comercial' },
  { codigo: 'CE', nombre: 'Estratégica' }
];

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
export class RequerimientoConvertirCotizacionDialogComponent implements OnDestroy {
  readonly tipos = TIPOS_COTIZACION;
  readonly tipoSugerido: TipoCotizacionSgc;

  readonly folioControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(PATRON_FOLIO)]
  });
  readonly tipoControl: FormControl<TipoCotizacionSgc>;

  /** `null` = todavía no se ha buscado; lista vacía = se buscó y no hay nada. */
  coincidencias: CoincidenciaFolioContpaq[] | null = null;
  seleccionada: CoincidenciaFolioContpaq | null = null;
  /** Folio con el que se hizo la búsqueda: es el que se convierte, aunque después se edite el campo. */
  folioBuscado = '';
  /** Si el API contesta que el requerimiento ya tiene cotización. */
  cotizacionExistente: CotizacionVinculada | null = null;
  errorMensaje: string | null = null;
  buscando = false;
  convirtiendo = false;

  private readonly suscripciones = new Subscription();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ConvertirCotizacionDialogData,
    private dialogRef: MatDialogRef<RequerimientoConvertirCotizacionDialogComponent, ConvertirCotizacionDialogResult>,
    private reqService: RequerimientosService
  ) {
    this.tipoSugerido = RequerimientoConvertirCotizacionDialogComponent.sugerirTipo(data.requerimiento);
    this.tipoControl = new FormControl<TipoCotizacionSgc>(this.tipoSugerido, { nonNullable: true });

    // Si se edita el folio, lo que se mostró ya no corresponde: se descarta para no convertir otro documento.
    this.suscripciones.add(this.folioControl.valueChanges.subscribe(() => this.descartarResultados()));
  }

  ngOnDestroy(): void {
    this.suscripciones.unsubscribe();
  }

  /** Con caso en Ingeniería o ruta técnica se sugiere Técnico-comercial; si no, Comercial. */
  static sugerirTipo(req: Requerimiento): TipoCotizacionSgc {
    const ruta = (req?.rutaAtencion || '').toLowerCase();
    return req?.seguimientoProyectoId || ruta.includes('técnic') || ruta.includes('tecnic') ? 'CT' : 'CS';
  }

  get puedeBuscar(): boolean {
    return this.folioControl.valid && !this.buscando && !this.convirtiendo;
  }

  get puedeConvertir(): boolean {
    return !!this.seleccionada
      && !this.seleccionada.yaVinculadaARequerimiento
      && !this.cotizacionExistente
      && !this.convirtiendo
      && !this.buscando;
  }

  buscar(): void {
    if (!this.puedeBuscar) {
      return;
    }
    const folio = this.folioControl.value.trim();
    this.descartarResultados();
    this.buscando = true;
    this.reqService.buscarFolioContpaq(folio).subscribe({
      next: (res) => {
        this.buscando = false;
        this.folioBuscado = folio;
        this.coincidencias = res?.coincidencias ?? [];
        // Una sola coincidencia se selecciona sola; con varias el usuario elige la unidad.
        this.seleccionada = this.coincidencias.length === 1 ? this.coincidencias[0] : null;
      },
      error: (err: HttpErrorResponse) => {
        this.buscando = false;
        this.errorMensaje = this.mensajeDe(err, 'No se pudo buscar el folio. Intenta de nuevo.');
      }
    });
  }

  seleccionar(c: CoincidenciaFolioContpaq): void {
    if (this.convirtiendo) {
      return;
    }
    this.seleccionada = c;
  }

  async convertir(): Promise<void> {
    if (!this.puedeConvertir || !this.seleccionada) {
      return;
    }
    // Se marca antes de la confirmación: un segundo clic mientras se decide no abre otra.
    // Y no se puede cerrar con Esc ni clic afuera: la conversión en vuelo debe poder avisar su resultado.
    this.bloquear(true);
    this.errorMensaje = null;

    const confirmacion = await Swal.fire({
      title: '¿Convertir a cotización?',
      text: 'Se creará la cotización con los datos del folio de CONTPAQ y quedará ligada a este requerimiento.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, convertir',
      cancelButtonText: 'Cancelar'
    });
    if (!confirmacion.isConfirmed) {
      this.bloquear(false);
      return;
    }

    const elegida = this.seleccionada;
    this.reqService.convertirACotizacion({
      requerimientoId: this.data.requerimiento.id,
      folioContpaq: this.folioBuscado,
      unidadDeNegocioId: elegida.unidadDeNegocioId,
      tipo: this.tipoControl.value
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
    const mensaje = this.mensajeDe(err, 'No se pudo convertir el requerimiento. Intenta de nuevo.');
    if (err.status === 409 && Array.isArray(err.error?.coincidencias)) {
      // El folio existe en más de una unidad: se muestran para elegir una y reintentar.
      this.coincidencias = err.error.coincidencias;
      this.seleccionada = null;
      this.errorMensaje = mensaje;
      return;
    }
    if (err.status === 409 && err.error?.cotizacionVinculada) {
      this.cotizacionExistente = err.error.cotizacionVinculada;
    }
    this.errorMensaje = mensaje;
  }

  private mensajeDe(err: HttpErrorResponse, generico: string): string {
    const mensaje = err?.error?.mensaje;
    return typeof mensaje === 'string' && mensaje.trim() ? mensaje : generico;
  }

  private descartarResultados(): void {
    this.coincidencias = null;
    this.seleccionada = null;
    this.cotizacionExistente = null;
    this.errorMensaje = null;
  }
}
