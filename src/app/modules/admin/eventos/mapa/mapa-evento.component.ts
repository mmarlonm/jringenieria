import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild,
  ChangeDetectionStrategy, ChangeDetectorRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MapaEventoService, StandClickEvent } from './mapa-evento.service';
import { StandConfig, StandTipo, STANDS_DATA } from './mapa-evento.models';

@Component({
  selector: 'app-mapa-evento',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
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

  private _mapaService  = inject(MapaEventoService);
  private _cdr          = inject(ChangeDetectorRef);
  private destroy$      = new Subject<void>();
  private resizeObserver!: ResizeObserver;

  selectedStand: StandConfig | null = null;
  tooltipPos = { x: 0, y: 0 };
  tooltipVisible = false;
  isLoading = true;
  tourTitulo: string | null = null;

  readonly legend: { tipo: StandTipo; label: string; color: string }[] = [
    { tipo: '3x3',       label: '3×3 m',           color: '#e2795f' },
    { tipo: '6x3',       label: '6×3 m',           color: '#b9c0ca' },
    { tipo: '9x3',       label: '9×3 m (Premium)', color: '#d4a03c' },
    { tipo: 'escenario', label: 'Escenarios',      color: '#2f3fa0' },
    { tipo: 'zona',      label: 'Zonas / Servicios', color: '#10b981' },
  ];

  readonly MAP_IMAGE = 'assets/images/eventos/plano.png';

  ngOnInit(): void {
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
          this.selectedStand  = ev.stand;
          this.tooltipPos     = ev.position;
          this.tooltipVisible = true;
        } else {
          this.tooltipVisible = false;
          this.selectedStand  = null;
        }
        this._cdr.markForCheck();
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

  readonly totalStands = STANDS_DATA.filter(s => s.esStand).length;
  readonly disponibles = STANDS_DATA.filter(s => s.esStand && s.disponible !== false).length;
}
