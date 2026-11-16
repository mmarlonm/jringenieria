import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { QuotesService } from '../../quotes-products.service';
import {
  AccionesSgc,
  CatalogosSgc,
  RegistrarSeguimientoDto,
  ResumenSeguimiento,
  SeguimientoItemSgc
} from '../../quotes-products.types';
import { EtapaChipComponent } from '../etapa-chip/etapa-chip.component';

const TIPOS_SEGUIMIENTO_DEFECTO: { codigo: string; nombre: string }[] = [
  { codigo: 'PrimerSeguimiento', nombre: 'Primer seguimiento' },
  { codigo: 'RespuestaCliente', nombre: 'Respuesta del cliente' },
  { codigo: 'Aclaracion', nombre: 'Aclaración solicitada' },
  { codigo: 'Ajuste', nombre: 'Ajuste requerido' },
  { codigo: 'CambioAlcance', nombre: 'Cambio de alcance' },
  { codigo: 'VisitaValidacion', nombre: 'Visita o validación adicional' },
  { codigo: 'DecisionCliente', nombre: 'Decisión del cliente' },
  { codigo: 'Otro', nombre: 'Otro' },
];

@Component({
  selector: 'app-seguimiento-sgc',
  templateUrl: './seguimiento-sgc.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    EtapaChipComponent,
  ],
})
export class SeguimientoSgcComponent implements OnInit, OnChanges {
  @Input() cotizacionId: number = 0;
  @Input() etapa: string = 'Borrador';
  @Input() probabilidadPorcentaje: number | null | undefined = null;
  @Input() seguimiento: ResumenSeguimiento | null | undefined = null;
  @Input() acciones: AccionesSgc = {
    editar: true,
    enviarRevision: false,
    volverBorrador: false,
    revisar: [],
    emitir: false,
    nuevaVersion: false,
    seguimiento: false,
  };
  @Input() catalogos: CatalogosSgc | null = null;
  @Output() recargar = new EventEmitter<void>();

  form: FormGroup;
  bitacora: SeguimientoItemSgc[] = [];
  cargandoBitacora: boolean = false;
  guardando: boolean = false;
  errorMensaje: string | null = null;
  hoy: string = '';

  constructor(
    private fb: FormBuilder,
    private quotesService: QuotesService
  ) {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    this.hoy = `${y}-${m}-${day}`;

    this.form = this.fb.group({
      tipo: ['PrimerSeguimiento', [Validators.required]],
      notas: ['', [Validators.required, Validators.maxLength(1000)]],
      proximaAccion: [null, [Validators.maxLength(300)]],
      fechaProximaAccion: [null, [(c: AbstractControl) => this.validadorFechaNoPasada(c)]],
      probabilidadPorcentaje: [null, [Validators.min(0), Validators.max(100)]],
    });
  }

  ngOnInit(): void {
    if (this.probabilidadPorcentaje !== null && this.probabilidadPorcentaje !== undefined) {
      this.form.patchValue({ probabilidadPorcentaje: this.probabilidadPorcentaje });
    }
    this.cargarBitacora();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cotizacionId'] && !changes['cotizacionId'].isFirstChange()) {
      this.cargarBitacora();
    }
    if (changes['probabilidadPorcentaje'] && changes['probabilidadPorcentaje'].currentValue !== undefined) {
      if (this.form && !this.form.dirty) {
        this.form.patchValue({ probabilidadPorcentaje: this.probabilidadPorcentaje });
      }
    }
  }

  validadorFechaNoPasada(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    const hoyStr = this.hoy || new Date().toISOString().substring(0, 10);
    return control.value < hoyStr ? { fechaPasada: true } : null;
  }

  get tiposSeguimiento(): { codigo: string; nombre: string }[] {
    if (this.catalogos?.tiposSeguimiento && this.catalogos.tiposSeguimiento.length > 0) {
      return this.catalogos.tiposSeguimiento;
    }
    return TIPOS_SEGUIMIENTO_DEFECTO;
  }

  nombreTipoSeguimiento(codigo: string): string {
    const item = this.tiposSeguimiento.find((t) => t.codigo === codigo);
    return item ? item.nombre : codigo;
  }

  textoVencimiento(diasParaVencer?: number | null): string {
    if (diasParaVencer === null || diasParaVencer === undefined) {
      return '—';
    }
    if (diasParaVencer >= 0) {
      return `Vence en ${diasParaVencer} ${diasParaVencer === 1 ? 'día' : 'días'}`;
    }
    const pasados = Math.abs(diasParaVencer);
    return `Venció hace ${pasados} ${pasados === 1 ? 'día' : 'días'}`;
  }

  formatearFechaSoloDia(fechaStr?: string | null): string {
    if (!fechaStr) {
      return '—';
    }
    const parte = String(fechaStr).substring(0, 10);
    const pedazos = parte.split('-');
    if (pedazos.length === 3) {
      return `${pedazos[2]}/${pedazos[1]}/${pedazos[0]}`;
    }
    return parte;
  }

  cargarBitacora(): void {
    if (!this.cotizacionId || typeof this.quotesService?.seguimientos !== 'function') {
      this.bitacora = [];
      return;
    }
    this.cargandoBitacora = true;
    this.quotesService.seguimientos(this.cotizacionId).subscribe({
      next: (res) => {
        this.cargandoBitacora = false;
        this.bitacora = res || [];
      },
      error: () => {
        this.cargandoBitacora = false;
      },
    });
  }

  guardarSeguimiento(): void {
    if (this.guardando || this.form.invalid || !this.cotizacionId) {
      return;
    }
    this.guardando = true;
    this.errorMensaje = null;

    const val = this.form.value;
    const dto: RegistrarSeguimientoDto = {
      tipo: val.tipo,
      notas: val.notas,
      proximaAccion: val.proximaAccion || null,
      fechaProximaAccion: val.fechaProximaAccion || null,
      probabilidadPorcentaje:
        val.probabilidadPorcentaje !== null &&
        val.probabilidadPorcentaje !== undefined &&
        val.probabilidadPorcentaje !== ''
          ? Number(val.probabilidadPorcentaje)
          : null,
    };

    this.quotesService.registrarSeguimiento(this.cotizacionId, dto).subscribe({
      next: () => {
        this.guardando = false;
        this.form.reset({
          tipo: 'PrimerSeguimiento',
          notas: '',
          proximaAccion: null,
          fechaProximaAccion: null,
          probabilidadPorcentaje: dto.probabilidadPorcentaje,
        });
        this.cargarBitacora();
        this.recargar.emit();
      },
      error: (err) => {
        this.guardando = false;
        this.errorMensaje =
          err?.error?.mensaje ||
          err?.message ||
          'Error al registrar el seguimiento.';
      },
    });
  }
}
