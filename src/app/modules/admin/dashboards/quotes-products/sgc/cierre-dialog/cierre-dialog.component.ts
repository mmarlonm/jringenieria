import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { QuotesService } from '../../quotes-products.service';
import {
  CatalogosSgc,
  CierreResultado,
  CierreSgcDto,
} from '../../quotes-products.types';

// Lo que devuelve el dialogo al cerrarse. `conflicto` = el API respondio 409 (la cotizacion ya cambio):
// quien lo abrio muestra el mensaje y recarga para ver el estado real.
export interface CierreDialogResultado {
  guardado: boolean;
  conflicto?: boolean;
  mensaje?: string;
  resultado?: string;
  fechaCierre?: string | Date;
}

export interface CierreDialogData {
  cotizacionId: number;
  total: number;
  moneda: string;
  accionesCerrar: string[]; // ['Ganada', 'Perdida', 'Cancelada', 'Vencida', 'CerradaSinRespuesta']
  catalogos?: CatalogosSgc | null;
}

export const MOTIVOS_CIERRE_DEFECTO: { codigo: string; nombre: string }[] = [
  { codigo: 'Precio', nombre: 'Precio' },
  { codigo: 'Tiempo', nombre: 'Tiempo de entrega' },
  { codigo: 'Competencia', nombre: 'Competencia' },
  { codigo: 'DecisionCliente', nombre: 'Decisión del cliente' },
  { codigo: 'FaltaPresupuesto', nombre: 'Falta de presupuesto' },
  { codigo: 'CancelacionProyecto', nombre: 'Cancelación del proyecto' },
  { codigo: 'NoRespuesta', nombre: 'No respuesta' },
  { codigo: 'CambioPrioridad', nombre: 'Cambio de prioridad del cliente' },
  { codigo: 'Otro', nombre: 'Otro' },
];

export const TIPOS_EVIDENCIA_DEFECTO: { codigo: string; nombre: string }[] = [
  { codigo: 'OrdenCompra', nombre: 'Orden de compra' },
  { codigo: 'CorreoAceptacion', nombre: 'Correo de aceptación' },
  { codigo: 'ContratoFirmado', nombre: 'Contrato firmado' },
  { codigo: 'Anticipo', nombre: 'Anticipo' },
  { codigo: 'Otro', nombre: 'Otro' },
];

const NOMBRES_RESULTADOS: Record<string, string> = {
  Ganada: 'Ganada',
  Perdida: 'Perdida',
  Cancelada: 'Cancelada',
  Vencida: 'Vencida',
  CerradaSinRespuesta: 'Cerrada sin respuesta',
};

@Component({
  selector: 'app-cierre-dialog',
  templateUrl: './cierre-dialog.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
})
export class CierreDialogComponent implements OnInit {
  form: FormGroup;
  guardando: boolean = false;
  confirmando: boolean = false;
  textoConfirmacion: string =
    '¿Está seguro de cerrar definitivamente la cotización? Una vez cerrada quedará de solo lectura y no se podrán registrar más cambios.';
  errorMensaje: string | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CierreDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CierreDialogData,
    private quotesService: QuotesService
  ) {
    const resultadoInicial =
      this.data?.accionesCerrar && this.data.accionesCerrar.length > 0
        ? this.data.accionesCerrar[0]
        : 'Ganada';

    this.form = this.fb.group({
      resultado: [resultadoInicial, [Validators.required]],
      tipoEvidencia: [null],
      referenciaEvidencia: [''],
      montoVendido: [this.data?.total || 0],
      motivo: [null],
      comentario: [''],
    });
  }

  ngOnInit(): void {
    this.actualizarValidadoresPorResultado(this.form.get('resultado')?.value);

    this.form.get('resultado')?.valueChanges.subscribe((resultado) => {
      this.actualizarValidadoresPorResultado(resultado);
    });

    this.form.get('motivo')?.valueChanges.subscribe((motivo) => {
      const res = this.form.get('resultado')?.value;
      if (res === 'Perdida' || res === 'Cancelada') {
        this.actualizarValidadorComentario(motivo);
      }
    });
  }

  get resultadosDisponibles(): { codigo: string; nombre: string }[] {
    const permitidos = this.data?.accionesCerrar || [];
    return permitidos.map((codigo) => ({
      codigo,
      nombre: NOMBRES_RESULTADOS[codigo] || codigo,
    }));
  }

  get motivosCierre(): { codigo: string; nombre: string }[] {
    if (this.data?.catalogos?.motivosCierre && this.data.catalogos.motivosCierre.length > 0) {
      return this.data.catalogos.motivosCierre;
    }
    return MOTIVOS_CIERRE_DEFECTO;
  }

  get tiposEvidencia(): { codigo: string; nombre: string }[] {
    if (this.data?.catalogos?.tiposEvidencia && this.data.catalogos.tiposEvidencia.length > 0) {
      return this.data.catalogos.tiposEvidencia;
    }
    return TIPOS_EVIDENCIA_DEFECTO;
  }

  get resultadoSeleccionado(): string {
    return this.form.get('resultado')?.value;
  }

  nombreResultado(codigo: string): string {
    return NOMBRES_RESULTADOS[codigo] || codigo;
  }

  actualizarValidadoresPorResultado(resultado: string): void {
    const tipoEvidenciaCtrl = this.form.get('tipoEvidencia');
    const referenciaEvidenciaCtrl = this.form.get('referenciaEvidencia');
    const montoVendidoCtrl = this.form.get('montoVendido');
    const motivoCtrl = this.form.get('motivo');
    const comentarioCtrl = this.form.get('comentario');

    // Limpiar todos
    tipoEvidenciaCtrl?.clearValidators();
    referenciaEvidenciaCtrl?.clearValidators();
    montoVendidoCtrl?.clearValidators();
    motivoCtrl?.clearValidators();
    comentarioCtrl?.clearValidators();

    if (resultado === 'Ganada') {
      tipoEvidenciaCtrl?.setValidators([Validators.required]);
      referenciaEvidenciaCtrl?.setValidators([Validators.required, Validators.maxLength(300)]);
      montoVendidoCtrl?.setValidators([Validators.required, Validators.min(0.01)]);
      if (montoVendidoCtrl?.value === null || montoVendidoCtrl?.value === undefined || montoVendidoCtrl?.value === 0) {
        montoVendidoCtrl?.setValue(this.data?.total || 0);
      }
    } else if (resultado === 'Perdida' || resultado === 'Cancelada') {
      motivoCtrl?.setValidators([Validators.required]);
      this.actualizarValidadorComentario(motivoCtrl?.value);
    } else if (resultado === 'Vencida') {
      // motivo y comentario opcionales
      motivoCtrl?.clearValidators();
      comentarioCtrl?.setValidators([Validators.maxLength(1000)]);
    } else if (resultado === 'CerradaSinRespuesta') {
      // Todo opcional / texto fijo
    }

    tipoEvidenciaCtrl?.updateValueAndValidity();
    referenciaEvidenciaCtrl?.updateValueAndValidity();
    montoVendidoCtrl?.updateValueAndValidity();
    motivoCtrl?.updateValueAndValidity();
    comentarioCtrl?.updateValueAndValidity();
  }

  actualizarValidadorComentario(motivo: string): void {
    const comentarioCtrl = this.form.get('comentario');
    if (motivo === 'Otro') {
      comentarioCtrl?.setValidators([
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(1000),
      ]);
    } else {
      comentarioCtrl?.setValidators([Validators.maxLength(1000)]);
    }
    comentarioCtrl?.updateValueAndValidity();
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }

  solicitarConfirmacion(): void {
    if (this.form.invalid || this.guardando) {
      this.form.markAllAsTouched();
      return;
    }
    this.confirmando = true;
  }

  cancelarConfirmacion(): void {
    this.confirmando = false;
  }

  ejecutarCierre(): void {
    if (this.guardando || this.form.invalid) {
      return;
    }

    this.guardando = true;
    this.dialogRef.disableClose = true;
    this.errorMensaje = null;

    const val = this.form.value;
    const dto: CierreSgcDto = {
      resultado: val.resultado,
      tipoEvidencia: val.resultado === 'Ganada' ? val.tipoEvidencia : null,
      referenciaEvidencia:
        val.resultado === 'Ganada' ? (val.referenciaEvidencia || '').trim() : null,
      montoVendido:
        val.resultado === 'Ganada' && val.montoVendido !== null && val.montoVendido !== undefined
          ? Number(val.montoVendido)
          : null,
      motivo:
        val.resultado === 'Perdida' || val.resultado === 'Cancelada' || val.resultado === 'Vencida'
          ? val.motivo || null
          : null,
      comentario:
        val.resultado === 'Perdida' || val.resultado === 'Cancelada' || val.resultado === 'Vencida'
          ? (val.comentario || '').trim() || null
          : null,
    };

    this.quotesService.cerrar(this.data.cotizacionId, dto).subscribe({
      next: (res: CierreResultado) => {
        this.guardando = false;
        this.dialogRef.close({
          guardado: true,
          resultado: res.etapa,
          fechaCierre: res.fechaCierre,
        });
      },
      error: (err) => {
        this.guardando = false;
        const mensaje =
          err?.error?.mensaje ||
          err?.message ||
          'Error al registrar el cierre de la cotización.';
        if (err?.status === 409) {
          // La cotizacion ya cambio (cerrada, aun vigente, otra persona): se cierra el dialogo y
          // la pantalla muestra el mensaje y recarga el estado real
          const conflicto: CierreDialogResultado = { guardado: false, conflicto: true, mensaje };
          this.dialogRef.close(conflicto);
          return;
        }
        this.confirmando = false;
        this.dialogRef.disableClose = false;
        this.errorMensaje = mensaje;
      },
    });
  }
}
