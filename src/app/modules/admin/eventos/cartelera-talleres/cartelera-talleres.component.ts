import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { EventosService, ActividadMetricsDto, Actividad, EventoEdicion } from '../eventos.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'cartelera-talleres',
  standalone: true,
  host: {
    'class': 'block w-full min-h-screen bg-slate-950 text-slate-100 font-sans'
  },
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatTooltipModule,
    RouterModule
  ],
  templateUrl: './cartelera-talleres.component.html',
  styleUrls: ['./cartelera-talleres.component.scss']
})
export class CarteleraTalleresComponent implements OnInit, OnDestroy {
  private _eventosService = inject(EventosService);
  private _route = inject(ActivatedRoute);
  private _cdr = inject(ChangeDetectorRef);

  @ViewChild('slideRef') slideRef!: ElementRef<HTMLDivElement>;

  public eventos: EventoEdicion[] = [];
  public selectedEventoId: number = 0;
  public talleresMetrics: ActividadMetricsDto[] = [];
  public talleresDetalle: Actividad[] = [];
  public activeFilter: 'TODOS' | 'TALLER' | 'CONFERENCIA' | 'GRATUITO' | 'PAGO' = 'TODOS';
  public searchTerm: string = '';

  // 3D Card Stack Items Array
  public sliderItems: any[] = [];
  private slideTimer: any = null;

  // Detail Modal
  public showDetailModal: boolean = false;
  public selectedTallerModal: any = null;
  public inscribirEmailInput: string = '';
  public isSubmittingEmail: boolean = false;
  public enrollmentMessage: string | null = null;
  public enrollmentSuccess: boolean = false;
  public showRegisterRedirectLink: boolean = false;

  private _subs = new Subscription();

  ngOnInit(): void {
    this._route.params.subscribe(params => {
      const routeEventoId = params['eventoId'] ? Number(params['eventoId']) : 0;
      this.initCatalog(routeEventoId);
    });
  }

  ngOnDestroy(): void {
    this.stopHeroTimer();
    this._subs.unsubscribe();
  }

  private initCatalog(forcedEventoId: number): void {
    this._subs.add(
      this._eventosService.ediciones$.subscribe(ediciones => {
        this.eventos = ediciones;
        if (ediciones.length > 0) {
          if (forcedEventoId && ediciones.some(e => e.id === forcedEventoId)) {
            this.selectedEventoId = forcedEventoId;
          } else if (!this.selectedEventoId) {
            this.selectedEventoId = ediciones[0].id;
          }
          this.loadDataForEvent(this.selectedEventoId);
        }
      })
    );

    this._subs.add(
      this._eventosService.talleresMetrics$.subscribe(metrics => {
        if (metrics && metrics.length > 0) {
          this.talleresMetrics = metrics;
          this.rebuildSliderItems();
          this.startHeroTimer();
          this._cdr.markForCheck();
        }
      })
    );

    this._eventosService.loadEventos();
  }

  public onEventoChange(eventoId: number): void {
    this.selectedEventoId = Number(eventoId);
    this.loadDataForEvent(this.selectedEventoId);
  }

  private loadDataForEvent(eventoId: number): void {
    this._eventosService.connectToEventHub(eventoId);
    this._eventosService.loadTalleresMetrics(eventoId);
    this._subs.add(
      this._eventosService.getTalleresPorEvento(eventoId).subscribe({
        next: (talleres) => {
          this.talleresDetalle = talleres;
          this.rebuildSliderItems();
          this._cdr.markForCheck();
        },
        error: (err) => console.error('Error fetching talleres detail catalog:', err)
      })
    );
  }

  private rebuildSliderItems(): void {
    const list = this.talleresMetrics.map(m => {
      const full = this.talleresDetalle.find(d => d.id === m.actividadId);
      return {
        ...m,
        expositor: full?.expositor || 'Ponente Especializado',
        ubicacionLugar: full?.ubicacionLugar || 'Auditorio Principal',
        fechaHoraInicioRaw: full?.fechaHoraInicio || m.fechaHoraInicio
      };
    });

    // Ensure hero slider stack has at least 6 items for full thumbnail stack queue on the right
    let expandedList = [...list];
    if (expandedList.length > 0 && expandedList.length < 6) {
      while (expandedList.length < 6) {
        expandedList = expandedList.concat(list);
      }
    }

    this.sliderItems = expandedList;
  }

  // --- Filtering Logic (Unique workshops for bottom grid) ---
  public get filteredTalleres(): any[] {
    let list = this.talleresMetrics.map(m => {
      const full = this.talleresDetalle.find(d => d.id === m.actividadId);
      return {
        ...m,
        expositor: full?.expositor || 'Ponente Especializado',
        ubicacionLugar: full?.ubicacionLugar || 'Auditorio Principal',
        fechaHoraInicioRaw: full?.fechaHoraInicio || m.fechaHoraInicio
      };
    });

    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase();
      list = list.filter(t => 
        t.titulo.toLowerCase().includes(q) || 
        t.expositor.toLowerCase().includes(q) ||
        t.ubicacionLugar.toLowerCase().includes(q)
      );
    }

    if (this.activeFilter === 'GRATUITO') {
      list = list.filter(t => t.tipo === 'Gratuito');
    } else if (this.activeFilter === 'PAGO') {
      list = list.filter(t => t.tipo === 'Pago');
    }

    return list;
  }

  public setFilter(filter: 'TODOS' | 'TALLER' | 'CONFERENCIA' | 'GRATUITO' | 'PAGO'): void {
    this.activeFilter = filter;
  }

  // --- 3D Card Stack Slider Control (EXACT SIERRA NEGRA NATIVE DOM ALGORITHM) ---
  private startHeroTimer(): void {
    this.stopHeroTimer();
    this.slideTimer = setInterval(() => {
      this.nextSlide();
    }, 20000);
  }

  private stopHeroTimer(): void {
    if (this.slideTimer) {
      clearInterval(this.slideTimer);
      this.slideTimer = null;
    }
  }

  public nextSlide(): void {
    const slide = this.slideRef?.nativeElement;
    if (!slide) return;
    const items = slide.querySelectorAll('.item');
    if (items.length > 0) {
      slide.appendChild(items[0]);
    }
    this.startHeroTimer();
  }

  public prevSlide(): void {
    const slide = this.slideRef?.nativeElement;
    if (!slide) return;
    const items = slide.querySelectorAll('.item');
    if (items.length > 0) {
      slide.prepend(items[items.length - 1]);
    }
    this.startHeroTimer();
  }

  public onCardClick(e: MouseEvent): void {
    const slide = this.slideRef?.nativeElement;
    if (!slide) return;
    const target = (e.target as HTMLElement).closest('.item');
    if (!target) return;

    const items = Array.from(slide.querySelectorAll('.item'));
    const index = items.indexOf(target as Element);

    if (index > 1) {
      this.nextSlide();
    }
  }

  // --- Detail Modal & Self-Registration ---
  public openDetailModal(taller: any): void {
    this.selectedTallerModal = taller;
    this.inscribirEmailInput = '';
    this.enrollmentMessage = null;
    this.enrollmentSuccess = false;
    this.showRegisterRedirectLink = false;
    this.showDetailModal = true;
  }

  public closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedTallerModal = null;
  }

  public onSubmitInscripcionCorreo(): void {
    if (!this.inscribirEmailInput || !this.selectedTallerModal) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.inscribirEmailInput.trim())) {
      Swal.fire({
        icon: 'warning',
        title: 'Correo Inválido',
        text: 'Por favor ingresa un correo electrónico válido.'
      });
      return;
    }

    this.isSubmittingEmail = true;
    this.enrollmentMessage = null;
    this.showRegisterRedirectLink = false;

    this._eventosService.inscribirTallerPorCorreo(
      this.inscribirEmailInput.trim(),
      this.selectedTallerModal.actividadId,
      this.selectedEventoId
    ).subscribe({
      next: (res) => {
        this.isSubmittingEmail = false;
        if (res.exito) {
          this.enrollmentSuccess = true;
          this.enrollmentMessage = res.mensaje || '¡Te has inscrito exitosamente!';
          Swal.fire({
            icon: 'success',
            title: '¡Inscripción Exitosa!',
            text: res.mensaje,
            timer: 2500,
            showConfirmButton: false
          });
        } else {
          this.enrollmentSuccess = false;
          this.enrollmentMessage = res.mensaje;
          if (res.noRegistrado) {
            this.showRegisterRedirectLink = true;
          }
        }
        this._cdr.markForCheck();
      },
      error: (err) => {
        this.isSubmittingEmail = false;
        this.enrollmentSuccess = false;
        const errObj = err?.error;
        if (errObj && errObj.noRegistrado) {
          this.enrollmentMessage = errObj.mensaje || 'No estás registrado en el evento. Por favor completa tu pre-registro.';
          this.showRegisterRedirectLink = true;
        } else {
          this.enrollmentMessage = errObj?.mensaje || 'Ocurrió un error al procesar tu registro.';
        }
        this._cdr.markForCheck();
      }
    });
  }

  public getOccupancyPercent(taller: ActividadMetricsDto): number {
    if (!taller || taller.cupoMaximo <= 0) return 0;
    const pct = (taller.registradosActuales / taller.cupoMaximo) * 100;
    return Math.min(Math.round(pct), 100);
  }

  public getProgressBarColor(taller: ActividadMetricsDto): string {
    const pct = this.getOccupancyPercent(taller);
    if (pct >= 90) return 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]';
    if (pct >= 75) return 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]';
    return 'bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]';
  }
}
