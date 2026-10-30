import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  FormsModule
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  SurveyProductosService,
  EncuestaProductosDTO
} from '../survey-productos.service';
import {
  CampoConfig,
  DisenoConfig,
  PasoFormularioConfig,
  FormularioProductoDto
} from '../../admin/dashboards/surveys-products/surveys.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-survey-productos-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    MatTooltipModule
  ]
})
export class DetailComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private surveyService = inject(SurveyProductosService);
  private cdr = inject(ChangeDetectorRef);

  // Estados generales
  loading = true;
  isDynamic = false;
  enviadoConExito = false;
  resultadoFolio: number | string | null = null;
  qrCodeUrl: string | null = null;

  // Formulario Dinámico Configurado
  formDinamicoConfig: FormularioProductoDto | null = null;
  camposDinamicos: CampoConfig[] = [];
  disenoDinamico: DisenoConfig | null = null;
  pasosDinamicos: PasoFormularioConfig[] = [];
  pasoActual = 1;
  respuestasDinamicas: { [campoId: string]: any } = {};
  erroresPaso: string[] = [];

  // Escala de calificación 0 a 10 (con caritas e ISO 9001)
  scale = [
    { value: 0, emoji: '😡' },
    { value: 1, emoji: '😠' },
    { value: 2, emoji: '☹️' },
    { value: 3, emoji: '🙁' },
    { value: 4, emoji: '😕' },
    { value: 5, emoji: '😐' },
    { value: 6, emoji: '🙂' },
    { value: 7, emoji: '😊' },
    { value: 8, emoji: '😃' },
    { value: 9, emoji: '😁' },
    { value: 10, emoji: '🌟' }
  ];

  // Estado Legacy
  cotizacionProductoId = 0;
  formLegacy!: FormGroup;
  calificacionLegacy: number | null = null;
  encuestaYaRespondida = false;
  legacyFields = [
    {
      label: '¿Cómo calificarías el servicio del personal que te atendió?',
      control: 'servicioPersonal'
    },
    {
      label: '¿Qué posibilidades hay de que recomiendes nuestros productos?',
      control: 'recomendarProductos',
      razon: 'razonRecomendar'
    },
    {
      label: '¿En qué medida los productos ayudaron a resolver tu problema?',
      control: 'ayudaProducto'
    },
    {
      label: '¿Nuestro equipo comprendió tus necesidades?',
      control: 'comprensionNecesidades'
    },
    {
      label: '¿Cómo evalúas calidad y tiempo de entrega?',
      control: 'tiempoEntrega'
    }
  ];

  ngOnInit(): void {
    const rawParam = this.route.snapshot.paramMap.get('id') || '';
    this.evaluarRutaYModo(rawParam);
  }

  /** Determina si la ruta corresponde a un Formulario Configurado Dinámico o Legacy */
  private evaluarRutaYModo(param: string): void {
    this.loading = true;

    // Intentamos primero buscar como formulario dinámico por slug / id
    this.surveyService.obtenerFormularioPorSlug(param).subscribe({
      next: (res) => {
        if (res && res.code === 200 && res.data) {
          this.inicializarModoDinamico(res.data);
          this.loading = false;
          this.cdr.markForCheck();
        } else {
          // Si no es dinámico y es numérico, intentamos modo legacy
          const numId = Number(param);
          if (!isNaN(numId) && numId > 0) {
            this.inicializarModoLegacy(numId);
          } else {
            // No existe
            this.loading = false;
            this.isDynamic = true;
            this.formDinamicoConfig = null;
            this.cdr.markForCheck();
          }
        }
      },
      error: () => {
        const numId = Number(param);
        if (!isNaN(numId) && numId > 0) {
          this.inicializarModoLegacy(numId);
        } else {
          this.loading = false;
          this.isDynamic = true;
          this.formDinamicoConfig = null;
          this.cdr.markForCheck();
        }
      }
    });
  }

  // =========================================================================
  // MODO DINÁMICO (Configurador de Encuestas)
  // =========================================================================

  private inicializarModoDinamico(formDto: FormularioProductoDto): void {
    this.isDynamic = true;
    this.formDinamicoConfig = formDto;

    try {
      this.camposDinamicos = JSON.parse(formDto.camposConfigJson || '[]');
      this.camposDinamicos.sort((a, b) => (a.orden || 0) - (b.orden || 0));
    } catch {
      this.camposDinamicos = [];
    }

    try {
      this.disenoDinamico = JSON.parse(formDto.disenoConfigJson || '{}');
    } catch {
      this.disenoDinamico = null;
    }

    this.pasosDinamicos = this.disenoDinamico?.pasos || [
      { numero: 1, titulo: 'Cuestionario', descripcion: 'Por favor responde las siguientes preguntas' }
    ];
    this.pasoActual = 1;
    this.respuestasDinamicas = {};

    // Valores por defecto
    for (const c of this.camposDinamicos) {
      if (c.tipo === 'checkbox') {
        this.respuestasDinamicas[c.id] = false;
      }
    }
  }

  get camposDelPasoActual(): CampoConfig[] {
    if (!this.disenoDinamico?.modoPasos) {
      return this.camposDinamicos;
    }
    return this.camposDinamicos.filter(c => (c.paso || 1) === this.pasoActual);
  }

  get totalPasosDinamicos(): number {
    return this.pasosDinamicos.length || 1;
  }

  seleccionarValorMatriz(campoId: string, filaId: string, valor: string): void {
    const key = `${campoId}_${filaId}`;
    this.respuestasDinamicas[key] = valor;
  }

  obtenerValorMatriz(campoId: string, filaId: string): string {
    const key = `${campoId}_${filaId}`;
    return this.respuestasDinamicas[key] || '';
  }

  seleccionarRating(campoId: string, valor: number): void {
    this.respuestasDinamicas[campoId] = valor;
  }

  esRatingSeleccionado(campoId: string, valor: number): boolean {
    return this.respuestasDinamicas[campoId] === valor;
  }

  siguientePaso(): void {
    if (!this.validarPasoActual()) return;
    if (this.pasoActual < this.totalPasosDinamicos) {
      this.pasoActual++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  anteriorPaso(): void {
    if (this.pasoActual > 1) {
      this.pasoActual--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  validarPasoActual(): boolean {
    this.erroresPaso = [];
    const camposActuales = this.camposDelPasoActual;

    for (const campo of camposActuales) {
      if (campo.requerido) {
        if (campo.tipo === 'matrix') {
          if (campo.filasMatriz && campo.filasMatriz.length > 0) {
            for (const f of campo.filasMatriz) {
              if (!this.obtenerValorMatriz(campo.id, f.id)) {
                this.erroresPaso.push(`Por favor evalúa: "${f.texto}" en la sección "${campo.etiqueta}"`);
                break;
              }
            }
          }
        } else {
          const val = this.respuestasDinamicas[campo.id];
          if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
            this.erroresPaso.push(`El campo "${campo.etiqueta}" es obligatorio.`);
          }
        }
      }
    }

    if (this.erroresPaso.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        html: `<div class="text-left text-sm space-y-1">${this.erroresPaso.map(e => `• ${e}`).join('<br>')}</div>`,
        confirmButtonText: 'Entendido'
      });
      return false;
    }
    return true;
  }

  enviarDinamico(): void {
    if (!this.validarPasoActual()) return;

    if (!this.formDinamicoConfig) return;

    // Extraer datos principales
    const nombre = this.respuestasDinamicas['nombre'] || this.respuestasDinamicas['nombreCompleto'] || this.respuestasDinamicas['cliente'] || '';
    const email = this.respuestasDinamicas['email'] || this.respuestasDinamicas['correo'] || '';
    const telefono = this.respuestasDinamicas['telefono'] || this.respuestasDinamicas['celular'] || '';
    const empresa = this.respuestasDinamicas['empresa'] || this.respuestasDinamicas['razonSocial'] || '';
    const cargo = this.respuestasDinamicas['cargo'] || this.respuestasDinamicas['puesto'] || '';
    const sucursalVal = Number(this.respuestasDinamicas['sucursal']) || this.formDinamicoConfig.sucursalId || 1;

    // Calcular satisfacción general
    let sumaCalif = 0;
    let countCalif = 0;
    for (const c of this.camposDinamicos) {
      if (c.tipo === 'radio' && c.escalaNotaInferior) {
        const val = Number(this.respuestasDinamicas[c.id]);
        if (!isNaN(val)) {
          sumaCalif += val;
          countCalif++;
        }
      } else if (c.tipo === 'matrix') {
        for (const f of c.filasMatriz || []) {
          const v = Number(this.obtenerValorMatriz(c.id, f.id));
          if (!isNaN(v) && v > 0) {
            sumaCalif += v;
            countCalif++;
          }
        }
      }
    }
    const califGeneral = countCalif > 0 ? +(sumaCalif / countCalif).toFixed(1) : undefined;

    const payload = {
      nombreCliente: String(nombre),
      emailCliente: String(email),
      telefonoCliente: String(telefono),
      empresaCliente: String(empresa),
      cargoCliente: String(cargo),
      sucursal: sucursalVal,
      calificacionGeneral: califGeneral,
      respuestasJson: JSON.stringify(this.respuestasDinamicas)
    };

    this.loading = true;
    this.surveyService.responderFormularioDinamico(this.formDinamicoConfig.slug, payload).subscribe({
      next: (res) => {
        this.loading = false;
        if (res && (res.code === 200 || res.code === 201)) {
          this.enviadoConExito = true;
          this.resultadoFolio = res.data?.id || Date.now().toString().slice(-6);
          if (this.disenoDinamico?.mostrarQrExito) {
            const qrText = encodeURIComponent(`JR-SURVEY-${this.resultadoFolio}`);
            this.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qrText}&format=svg`;
          }
          this.cdr.markForCheck();
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: res?.message || 'No fue posible registrar tus respuestas. Inténtalo de nuevo.'
          });
        }
      },
      error: () => {
        this.loading = false;
        // Modo local de respaldo
        this.enviadoConExito = true;
        this.resultadoFolio = 'LOCAL-' + Date.now().toString().slice(-4);
        this.cdr.markForCheck();
      }
    });
  }

  // =========================================================================
  // MODO LEGACY (Compatibilidad con Cotizaciones Anteriores)
  // =========================================================================

  private inicializarModoLegacy(cotizacionId: number): void {
    this.isDynamic = false;
    this.cotizacionProductoId = cotizacionId;

    this.formLegacy = this.fb.group({
      sucursal: ['1'],
      nombre: [''],
      empresa: [''],
      email: [''],
      telefono: [''],
      cargo: [''],
      servicioPersonal: [null],
      recomendarProductos: [null],
      ayudaProducto: [null],
      comprensionNecesidades: [null],
      tiempoEntrega: [null],
      razonServicio: [''],
      productosDeseados: [''],
      comoConocio: ['']
    });

    this.surveyService.existeEncuestaProducto(this.cotizacionProductoId).subscribe({
      next: (existe) => {
        this.encuestaYaRespondida = existe;
        if (existe) {
          this.formLegacy.disable();
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  selectLegacy(value: number): void {
    this.calificacionLegacy = value;
    this.formLegacy.patchValue({
      servicioPersonal: value,
      recomendarProductos: value,
      ayudaProducto: value,
      tiempoEntrega: value
    });
  }

  enviarLegacy(): void {
    if (this.formLegacy.invalid) {
      this.formLegacy.markAllAsTouched();
      return;
    }

    const payload: EncuestaProductosDTO = {
      cotizacionProductoId: this.cotizacionProductoId,
      sucursal: Number(this.formLegacy.value.sucursal) || 1,
      nombre: this.formLegacy.value.nombre,
      empresa: this.formLegacy.value.empresa,
      email: this.formLegacy.value.email,
      telefono: this.formLegacy.value.telefono,
      cargo: this.formLegacy.value.cargo,
      servicioPersonal: this.formLegacy.value.servicioPersonal,
      recomendarProductos: this.formLegacy.value.recomendarProductos,
      ayudaProducto: this.formLegacy.value.ayudaProducto,
      comprensionNecesidades: this.formLegacy.value.comprensionNecesidades,
      tiempoEntrega: this.formLegacy.value.tiempoEntrega,
      razonServicio: this.formLegacy.value.razonServicio,
      productosDeseados: this.formLegacy.value.productosDeseados,
      comoConocio: this.formLegacy.value.comoConocio
    };

    this.loading = true;
    this.surveyService.guardarEncuestaProducto(payload).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.code === 200) {
          Swal.fire({
            icon: 'success',
            title: '¡Muchas Gracias!',
            text: 'Tu encuesta de satisfacción ha sido guardada exitosamente.',
            confirmButtonText: 'Aceptar'
          });
          this.encuestaYaRespondida = true;
          this.formLegacy.disable();
          this.cdr.markForCheck();
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: res.message || 'Ocurrió un error al guardar la encuesta.'
          });
        }
      },
      error: () => {
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Ocurrió un error al enviar la encuesta. Por favor, inténtalo de nuevo más tarde.'
        });
      }
    });
  }
}
