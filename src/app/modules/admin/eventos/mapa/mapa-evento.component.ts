import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild,
  ChangeDetectionStrategy, ChangeDetectorRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MapaEventoService, StandClickEvent } from './mapa-evento.service';
import { StandConfig, StandTipo, STANDS_DATA } from './mapa-evento.models';
import { EventosService } from '../eventos.service';
import { ModalApartarStand } from './modal-apartar-stand.component';

@Component({
  selector: 'app-mapa-evento',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    ReactiveFormsModule,
    ModalApartarStand
  ],
  providers: [MapaEventoService],
  templateUrl: './mapa-evento.component.html',
  styleUrls: ['./mapa-evento.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ← Ruta libre (sin layout Fuse): ocupa toda la ventana
  host: {
    style: 'display:block; position:fixed; inset:0; height:100dvh; width:100vw; overflow:hidden;'
  }
})
export class MapaEventoComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('canvas3d',  { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  private _mapaService         = inject(MapaEventoService);
  private _eventosService      = inject(EventosService);
  private _cdr                 = inject(ChangeDetectorRef);
  private _dialog              = inject(MatDialog);
  private _fb                  = inject(FormBuilder);
  private _snackBar            = inject(MatSnackBar);
  private destroy$             = new Subject<void>();
  private resizeObserver!: ResizeObserver;
  private standsData: StandConfig[] = [...STANDS_DATA];

  // Datos para modales
  formApartarStand!: FormGroup;
  asistentesProfesionales: any[] = [];
  cargandoAsistentes = false;
  standASeleccionar: StandConfig | null = null;

  selectedStand: StandConfig | null = null;
  tooltipPos = { x: 0, y: 0 };
  tooltipVisible = false;
  isLoading = true;
  tourTitulo: string | null = null;
  currentEventoId: number | null = null;

  readonly legend: { tipo: StandTipo; label: string; color: string }[] = [
    { tipo: '3x3',       label: '3×3 m',           color: '#e2795f' },
    { tipo: '6x3',       label: '6×3 m',           color: '#b9c0ca' },
    { tipo: '9x3',       label: '9×3 m (Premium)', color: '#d4a03c' },
    { tipo: 'escenario', label: 'Escenarios',      color: '#2f3fa0' },
    { tipo: 'zona',      label: 'Zonas / Servicios', color: '#10b981' },
  ];

  readonly MAP_IMAGE = 'assets/images/eventos/plano.png';

  ngOnInit(): void {
    // Inicializar formulario para apartar stand
    this.formApartarStand = this._fb.group({
      empresa: ['', Validators.required],
      logoUrl: [''],
      descripcion: ['', Validators.required],
      imagenes: [[]],
      contactoNombre: [''],
      contactoEmail: ['', [Validators.email]],
      contactoTelefono: [''],
      contactoEnlace: [''],
      asistenteId: [null, Validators.required]
    });

    // Cargar stands desde el backend cuando se selecciona un evento
    this._eventosService.selectedEventoId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((eventoId) => {
        this.currentEventoId = eventoId;
        this.loadStandsFromBackend(eventoId);
        this.loadAsistentesProfesionales(eventoId);
      });

    this._mapaService.tourStep$
      .pipe(takeUntil(this.destroy$))
      .subscribe((titulo) => {
        this.tourTitulo = titulo;
        this._cdr.markForCheck();
      });

    this._mapaService.standClick$
      .pipe(takeUntil(this.destroy$))
      .subscribe((ev: StandClickEvent | null) => {
        if (ev) {
          // Enriquecer el stand con datos del backend
          const standEnriquecido = this.standsData.find(s => s.id === ev.stand.id) || ev.stand;
          this.selectedStand  = standEnriquecido;
          this.tooltipPos     = ev.position;
          this.tooltipVisible = true;
        } else {
          this.tooltipVisible = false;
          this.selectedStand  = null;
        }
        this._cdr.markForCheck();
      });
  }

  /** Cargar stands desde el backend y enriquecer STANDS_DATA */
  private loadStandsFromBackend(eventoId: number): void {
    this._eventosService.getEventoStands(eventoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response && response.items) {
            // Mapear datos del backend a StandConfig
            const standsBackend = response.items.map((stand: any) => {
              const standBase = STANDS_DATA.find(s => s.id === stand.standId);
              return {
                ...(standBase || { id: stand.standId, label: stand.label, tipo: stand.tipoStand as StandTipo }),
                dbId: stand.id, // ID de la base de datos
                empresa: stand.empresa,
                empresaInfo: {
                  logo: stand.logoBase64,
                  imagenes: stand.imagenes || [],
                  descripcion: stand.descripcion,
                  contacto: {
                    nombre: stand.contacto?.nombre,
                    email: stand.contacto?.email,
                    telefono: stand.contacto?.telefono,
                    enlace: stand.contacto?.enlace
                  }
                },
                disponible: stand.disponible
              };
            });

            // Combinar: actualizar STANDS_DATA con datos del backend
            this.standsData = STANDS_DATA.map(stand => {
              const conInfo = standsBackend.find(s => s.id === stand.id);
              return conInfo ? { ...stand, ...conInfo } : stand;
            });
          }
        },
        error: (err) => {
          console.error('Error loading stands from backend:', err);
        }
      });
  }

  async ngAfterViewInit(): Promise<void> {
    const canvas    = this.canvasRef.nativeElement;
    const container = this.containerRef.nativeElement;

    // Dimensionar canvas al contenedor inmediatamente
    canvas.width  = container.clientWidth;
    canvas.height = container.clientHeight;

    await this._mapaService.init(canvas, this.MAP_IMAGE);

    // ResizeObserver — más preciso que window:resize para detectar cambios del contenedor
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width  = width;
        canvas.height = height;
        this._mapaService.onResize(width, height);
      }
    });
    this.resizeObserver.observe(container);

    setTimeout(() => {
      this.isLoading = false;
      this._cdr.markForCheck();
    }, 600);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.resizeObserver?.disconnect();
    this._mapaService.ngOnDestroy();
  }

  onCanvasClick(event: MouseEvent): void {
    this._mapaService.onMouseClick(event, this.canvasRef.nativeElement);
  }

  onCanvasMove(event: MouseEvent): void {
    const hover = this._mapaService.onMouseMove(event, this.canvasRef.nativeElement);
    this.canvasRef.nativeElement.style.cursor = hover ? 'pointer' : 'grab';
  }

  get isTouring(): boolean { return this._mapaService.isTouring; }

  toggleTour(): void {
    if (this._mapaService.isTouring) this._mapaService.stopTour();
    else this._mapaService.startTour();
    this._cdr.markForCheck();
  }

  resetView(): void {
    this._mapaService.resetView();
    this._cdr.markForCheck();
  }

  focusSelected(): void {
    if (this.selectedStand) this._mapaService.focusStand(this.selectedStand);
  }

  closeTooltip(): void {
    this.tooltipVisible = false;
    this.selectedStand  = null;
    this._cdr.markForCheck();
  }

  getTipoLabel(tipo: StandTipo): string {
    const map: Record<StandTipo, string> = {
      '3x3': 'Stand 3×3 m', '6x3': 'Stand 6×3 m', '9x3': 'Stand Premium 9×3 m',
      'escenario': 'Escenario', 'zona': 'Zona / Servicio',
    };
    return map[tipo] ?? tipo;
  }

  getDims(s: StandConfig): string {
    return `${s.w.toFixed(1)} m × ${s.d.toFixed(1)} m`;
  }

  getTipoColor(tipo: StandTipo): string {
    return this.legend.find(l => l.tipo === tipo)?.color ?? '#6366f1';
  }

  contactarEmpresa(): void {
    if (!this.selectedStand?.empresaInfo?.contacto?.email) return;
    const email = this.selectedStand.empresaInfo.contacto.email;
    const asunto = `Información B2B - Stand ${this.selectedStand.label} (${this.selectedStand.empresa})`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(asunto)}`;
  }

  /** Cargar asistentes profesionales del evento */
  private loadAsistentesProfesionales(eventoId: number): void {
    this.cargandoAsistentes = true;
    this._eventosService.getAsistentesProfesionales(eventoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (asistentes) => {
          this.asistentesProfesionales = asistentes;
          this.cargandoAsistentes = false;
          this._cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error loading asistentes:', err);
          this.cargandoAsistentes = false;
          this._cdr.markForCheck();
        }
      });
  }

  /** Abrir modal para apartar un stand disponible */
  abrirModalApartarStand(stand: StandConfig): void {
    if (stand.disponible === false) {
      this._snackBar.open('❌ Este stand ya está apartado', 'Cerrar', { duration: 4000, panelClass: ['snackbar-error'] });
      return;
    }

    this.standASeleccionar = stand;
    this.formApartarStand.reset();

    // Dialog para apartar stand
    const dialogRef = this._dialog.open(ModalApartarStand, {
      width: '600px',
      disableClose: false,
      data: {
        stand,
        asistentesProfesionales: this.asistentesProfesionales,
        form: this.formApartarStand,
        onGuardar: (datos: any) => {
          this.guardarApartarStand(stand, datos);
          dialogRef.close();
        }
      }
    });
  }

  /** Guardar stand apartado con información de empresa */
  private guardarApartarStand(stand: StandConfig, datos: any): void {
    const asistente = this.asistentesProfesionales.find(a => a.id === datos.asistenteId);

    const standData = {
      eventoId: this.currentEventoId,
      standId: stand.id,
      label: stand.label,
      tipoStand: stand.tipo,
      empresa: datos.empresa,
      descripcion: datos.descripcion,
      contactoNombre: datos.contactoNombre,
      contactoEmail: datos.contactoEmail,
      contactoTelefono: datos.contactoTelefono,
      contactoEnlace: datos.contactoEnlace,
      asistenteId: datos.asistenteId,
      asistenteNombre: asistente?.nombre || '',
      asistenteEmail: asistente?.correo || '',
      logoBase64: this.formApartarStand.get('logoUrl')?.value || null,
      imagenes: this.formApartarStand.get('imagenes')?.value || []
    };

    this._eventosService.apartarStand(stand.dbId || 0, standData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this._snackBar.open('✅ Stand apartado exitosamente', 'Cerrar', {
            duration: 4000,
            panelClass: ['snackbar-success'],
            horizontalPosition: 'end',
            verticalPosition: 'bottom'
          });
          // Actualizar el stand en los datos locales
          const idx = this.standsData.findIndex(s => s.id === stand.id);
          if (idx >= 0) {
            this.standsData[idx] = {
              ...this.standsData[idx],
              empresa: standData.empresa,
              disponible: false,
              empresaInfo: {
                logo: standData.logoBase64,
                imagenes: standData.imagenes || [],
                descripcion: standData.descripcion,
                contacto: {
                  nombre: standData.contactoNombre,
                  email: standData.contactoEmail,
                  telefono: standData.contactoTelefono,
                  enlace: standData.contactoEnlace
                }
              }
            };
          }
          this.tooltipVisible = false;
          this._cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error al apartar stand:', err);
          this._snackBar.open(
            '❌ Error: ' + (err?.error?.error || err.message || 'No se pudo apartar el stand'),
            'Cerrar',
            {
              duration: 5000,
              panelClass: ['snackbar-error'],
              horizontalPosition: 'end',
              verticalPosition: 'bottom'
            }
          );
        }
      });
  }

  readonly totalStands = STANDS_DATA.filter(s => s.esStand).length;
  readonly disponibles = STANDS_DATA.filter(s => s.esStand && s.disponible !== false).length;
}
