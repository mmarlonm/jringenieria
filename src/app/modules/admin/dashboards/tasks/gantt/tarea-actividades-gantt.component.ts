import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TareaActividad } from '../models/task-activity.model';
import { TaskService } from '../tasks.service';
import { TareaActividadDialogComponent } from './dialogs/tarea-actividad-dialog.component';
import { 
  addDays, 
  differenceInDays, 
  eachDayOfInterval, 
  endOfMonth, 
  format, 
  isSameDay, 
  isToday, 
  startOfDay, 
  startOfMonth, 
  subDays 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { UsersService } from 'app/modules/admin/security/users/users.service';
import { fromEvent, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-tarea-actividades-gantt',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule
  ],
  template: `
    <div class="flex flex-col w-full h-full min-h-[450px] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden font-sans">
      
      <!-- Premium Header -->
      <div class="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div class="flex items-center gap-4">
          <div class="p-2.5 bg-primary/10 rounded-xl shadow-inner">
            <mat-icon class="text-primary icon-size-6">account_tree</mat-icon>
          </div>
          <div>
            <h2 class="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">Cronograma de Actividades</h2>
            <div class="flex items-center gap-2">
                <span class="flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                <p class="text-xs font-medium text-slate-500 dark:text-slate-400">Progreso y gestión de tiempos</p>
            </div>
          </div>
        </div>
        <button mat-flat-button color="primary" class="!rounded-xl !px-5 !py-6 !font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" (click)="openDialog()">
          <mat-icon class="mr-2 icon-size-5">add</mat-icon>
          Nueva Actividad
        </button>
      </div>

      <!-- Gantt Main Surface -->
      <div class="flex-auto flex overflow-hidden">
        
        <!-- Sidebar: Activities List -->
        <div class="w-64 sm:w-80 flex-none border-r border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50/30 dark:bg-slate-900/30 overflow-hidden">
          <div class="h-14 flex items-center px-4 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Detalles de Actividad
          </div>
          <div class="flex-auto overflow-y-auto custom-scrollbar" #sidebarScroll (scroll)="onScroll($event, timelineScroll)">
            <div *ngFor="let act of activities" 
                 class="h-24 flex flex-col justify-center px-4 border-b border-slate-100/50 dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-800/10 transition-all cursor-pointer group"
                 (click)="openDialog(act)">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-bold truncate text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">{{ act.nombre }}</span>
                <div [ngClass]="getStatusBadgeClass(act.estatus)" class="text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-sm border border-current opacity-90">
                  {{ getStatusLabel(act.estatus) }}
                </div>
              </div>
              <div class="flex items-center gap-3">
                <!-- User Avatar -->
                <div class="flex items-center gap-2 flex-auto min-w-0">
                    <div class="relative flex-none w-8 h-8 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                        <ng-container *ngIf="getUser(act.responsableId) as user; else noUser">
                            <img *ngIf="user.avatar" [src]="user.avatar" class="w-full h-full object-cover" [alt]="act.nombreResponsable">
                            <div *ngIf="!user.avatar" 
                                 class="w-full h-full flex items-center justify-center text-[10px] font-bold text-white uppercase"
                                 [style.background-color]="getUserColor(act.nombreResponsable)">
                                {{ getUserInitials(act.nombreResponsable) }}
                            </div>
                        </ng-container>
                        <ng-template #noUser>
                            <div class="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-slate-800 text-slate-400">
                                <mat-icon class="icon-size-4">person</mat-icon>
                            </div>
                        </ng-template>
                    </div>
                    <div class="flex flex-col min-w-0">
                        <span class="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">{{ act.nombreResponsable }}</span>
                        <span class="text-[9px] font-medium text-slate-400 uppercase tracking-wide">Responsable</span>
                    </div>
                </div>
                
                <div class="flex flex-col items-end gap-1 ml-auto">
                    <span class="font-black text-[10px] text-primary">{{ act.progreso }}%</span>
                    <div class="w-12 bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
                        <div class="h-full transition-all duration-500" [style.width.%]="act.progreso" [style.background-color]="getBarColor(act.estatus, 1)"></div>
                    </div>
                </div>
              </div>
            </div>
            
            <!-- Empty State -->
            <div *ngIf="activities.length === 0" class="flex flex-col items-center justify-center py-16 px-8 text-center bg-slate-50/30">
              <mat-icon class="icon-size-12 text-slate-200 dark:text-slate-700 mb-2">event_busy</mat-icon>
              <p class="text-sm text-slate-400 font-medium italic">No hay actividades registradas</p>
            </div>
          </div>
        </div>

        <!-- Timeline: Scrollable Canvas -->
        <div class="flex-auto overflow-x-auto overflow-y-hidden custom-scrollbar bg-white dark:bg-slate-900/20 relative shadow-inner" #horizontalTimeline>
          
          <div [style.width.px]="timelineWidth" class="h-full flex flex-col select-none">
            
            <!-- Timeline Header: Dates -->
            <div class="h-14 flex border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
              <div *ngFor="let day of days" 
                   class="flex-none w-11 border-r border-slate-100/30 dark:border-slate-800/30 flex flex-col items-center justify-center transition-colors"
                   [ngClass]="{'bg-primary/5': isToday(day), 'bg-slate-50/50 dark:bg-slate-900/50': isWeekend(day)}">
                <span class="text-[9px] uppercase font-bold tracking-wider mb-0.5" [ngClass]="isToday(day) ? 'text-primary' : 'text-slate-400 dark:text-slate-600'">{{ formatDay(day) }}</span>
                <span class="text-xs font-black leading-none" [ngClass]="isToday(day) ? 'text-primary' : 'text-slate-600 dark:text-slate-400'">{{ format(day, 'd') }}</span>
              </div>
            </div>

            <!-- Main Timeline Body -->
            <div class="flex-auto relative overflow-y-auto overflow-x-hidden custom-scrollbar" #timelineScroll (scroll)="onScroll($event, sidebarScroll)">
              
              <!-- Clean Background Grid -->
              <div class="absolute inset-0 flex pointer-events-none">
                <div *ngFor="let day of days" 
                     class="flex-none w-11 border-r border-slate-100/20 dark:border-slate-800/10"
                     [ngClass]="{'bg-primary/2': isToday(day)}"></div>
              </div>

              <!-- SVG Connection Layer -->
              <svg class="absolute inset-0 pointer-events-none overflow-visible z-10" [attr.width]="timelineWidth" [attr.height]="activities.length * 96">
                <defs>
                    <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                        <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
                    </marker>
                </defs>
                <ng-container *ngFor="let act of activities; let i = index">
                    <path *ngIf="getDependencyPath(act, i) as pathD" 
                          [attr.d]="pathD" 
                          fill="none" 
                          stroke="#94a3b8" 
                          stroke-width="1.5" 
                          stroke-linecap="round"
                          marker-end="url(#arrowhead)" />
                </ng-container>
              </svg>

              <!-- Content Rows -->
              <div *ngFor="let act of activities; let i = index" class="h-24 flex items-center relative border-b border-slate-100/10 dark:border-slate-800/5">
                
                <!-- Modern Interactive Gantt Bar -->
                <div class="absolute h-9 rounded-xl shadow-md flex items-center overflow-hidden cursor-pointer hover:scale-[1.01] hover:brightness-105 active:scale-[0.99] transition-all duration-300 group ring-1 ring-white/20 dark:ring-slate-700/30"
                     [ngStyle]="getBarStyles(act)"
                     [matTooltip]="act.nombre + ' (' + act.progreso + '%)'"
                     (click)="openDialog(act)">
                  
                  <!-- Glossy Progress Fill -->
                  <div class="h-full opacity-100 absolute left-0 top-0 transition-all duration-700 ease-out" 
                       [style.width.%]="act.progreso"
                       [style.background-color]="getBarColor(act.estatus)"></div>
                  
                  <!-- Activity Text Overlay -->
                  <div class="relative flex items-center w-full px-4 gap-2.5 overflow-hidden">
                    <div class="w-2 h-2 rounded-full shrink-0 shadow-sm animate-pulse" [style.background-color]="getBarColor(act.estatus)"></div>
                    <span class="text-[10px] font-black text-white truncate drop-shadow-md tracking-tight uppercase">{{ act.nombre }}</span>
                    <span class="ml-auto text-[10px] font-black text-white/90 font-mono">{{ act.progreso }}%</span>
                  </div>
                  
                  <!-- Dynamic Pattern for In Progress -->
                  <div *ngIf="act.estatus === 2" class="absolute inset-0 opacity-[0.15] pointer-events-none animate-stripes"></div>
                </div>
              </div>

              <!-- Dynamic Today Marker -->
              <div *ngIf="showTodayMarker" 
                   class="absolute top-0 bottom-0 z-20 border-l-2 border-primary/40 flex flex-col items-center pointer-events-none"
                   [style.left.px]="todayPosition">
                <div class="w-3 h-3 bg-primary rounded-full shadow-lg shadow-primary/40 -ml-[6px] border-2 border-white dark:border-slate-900 mt-1"></div>
                <div class="px-2 py-0.5 bg-primary text-white text-[8px] font-black rounded-sm -ml-[50%] mt-1 shadow-md">HOY</div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>

    <style>
      .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: rgba(203, 213, 225, 0.4); 
          border-radius: 10px; 
          transition: background 0.3s;
      }
      .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(51, 65, 85, 0.4); }
      .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.8); }
      
      @keyframes stripes {
        from { background-position: 0 0; }
        to { background-position: 40px 0; }
      }
      .animate-stripes {
        background-image: linear-gradient(45deg, rgba(255,255,255,.3) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.3) 50%, rgba(255,255,255,.3) 75%, transparent 75%, transparent);
        background-size: 20px 20px;
        animation: stripes 2s linear infinite;
      }
    </style>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
  `]
})
export class TareaActividadesGanttComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @ViewChild('horizontalTimeline') horizontalTimeline!: ElementRef;
  @ViewChild('sidebarScroll') sidebarScroll!: ElementRef;
  @ViewChild('timelineScroll') timelineScroll!: ElementRef;
  
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  private _intersectionObserver: IntersectionObserver | null = null;
  private _scrollAttemptCount: number = 0;
  @Input() tareaId!: number;
  @Input() assignedUserIds: number[] = [];
  @Input() allUsers: any[] = [];

  activities: TareaActividad[] = [];
  userList: any[] = [];
  
  days: Date[] = [];
  startDate: Date = startOfMonth(new Date());
  endDate: Date = endOfMonth(addDays(new Date(), 15));
  
  dayWidth: number = 44; 
  timelineWidth: number = 0;
  todayPosition: number = 0;
  showTodayMarker: boolean = false;
  format = format; 

  parentTask: any;

  private _palette: string[] = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899'];
  private _userColors: { [key: string]: string } = {};

  constructor(
    private _matDialog: MatDialog,
    private _taskService: TaskService,
    private _usersService: UsersService,
    private _cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initTimeline();
    this.loadData();

    // Re-centrar si cambia el tamaño de la ventana (maximizar)
    fromEvent(window, 'resize')
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(() => {
            this.scrollToTarget();
        });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
    if (this._intersectionObserver) {
        this._intersectionObserver.disconnect();
    }
  }

  ngAfterViewInit(): void {
    // Configurar observador de visibilidad (para cuando se activa la pestaña)
    this._intersectionObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            // En cuanto sea visible, intentamos centrarlo
            this._scrollAttemptCount = 0;
            this.scrollToTarget();
        }
    }, { threshold: 0.1 });

    if (this.horizontalTimeline) {
        this._intersectionObserver.observe(this.horizontalTimeline.nativeElement);
    }

    // Centrar en el objetivo al cargar la vista por si acaso
    setTimeout(() => {
        this.scrollToTarget();
    }, 1000);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tareaId'] && !changes['tareaId'].firstChange) {
      this.loadData();
    }
    if (changes['assignedUserIds'] || changes['allUsers']) {
        this.updateUserList();
    }
  }

  onScroll(event: any, target: HTMLElement): void {
    const source = event.target as HTMLElement;
    window.requestAnimationFrame(() => {
      if (target.scrollTop !== source.scrollTop) {
        target.scrollTop = source.scrollTop;
      }
    });
  }

  initTimeline(customStart?: Date, customEnd?: Date): void {
    if (customStart && customEnd) {
        this.startDate = startOfDay(customStart);
        this.endDate = startOfDay(customEnd);
    } else {
        this.startDate = startOfDay(subDays(new Date(), 30)); // 30 días atrás por defecto
        this.endDate = addDays(this.startDate, 90); // 90 días totales (un trimestre)
    }
    
    this.days = eachDayOfInterval({
      start: this.startDate,
      end: this.endDate
    });

    this.timelineWidth = this.days.length * this.dayWidth;
    this.calculateTodayMarker();
  }

  adjustTimelineRange(): void {
    if (!this.activities || this.activities.length === 0) {
        this.initTimeline();
        return;
    }

    let minDate = new Date();
    let maxDate = new Date();

    this.activities.forEach(act => {
        const start = new Date(act.fechaInicio);
        const end = new Date(act.fechaFin);
        if (start < minDate) minDate = start;
        if (end > maxDate) maxDate = end;
    });

    // Aseguramos que "Hoy" esté incluido también
    const today = new Date();
    if (today < minDate) minDate = today;
    if (today > maxDate) maxDate = today;

    // Añadir margen (15 días antes y 30 días después para planificación)
    const finalStart = subDays(minDate, 15);
    const finalEnd = addDays(maxDate, 30);
    
    this.initTimeline(finalStart, finalEnd);
    this._cdr.detectChanges();
  }

  scrollToTarget(): void {
    if (!this.horizontalTimeline) return;

    const element = this.horizontalTimeline.nativeElement;
    
    // Si el elemento no tiene ancho todavía (está oculto o en medio de renderizado)
    // Usamos un margen de seguridad más amplio para detectar que el contenido ha cargado
    if (element.scrollWidth <= element.clientWidth && this._scrollAttemptCount < 15) {
        this._scrollAttemptCount++;
        setTimeout(() => this.scrollToTarget(), 200);
        return;
    }

    // Reiniciar contador al tener éxito
    this._scrollAttemptCount = 0;

    // Determinamos la posición objetivo
    let targetPos = 0;

    if (this.activities && this.activities.length > 0) {
        // Prioridad 1: Fecha de fin de la última actividad
        const lastDate = this.activities.reduce((latest, act) => {
            const currentEnd = new Date(act.fechaFin);
            return currentEnd > latest ? currentEnd : latest;
        }, new Date(0));

        if (lastDate.getTime() > 0) {
            const diff = differenceInDays(startOfDay(lastDate), this.startDate);
            // Posicionamos un poco antes del final para que se vea la barra
            targetPos = (diff - 4) * this.dayWidth;
        }
    } else if (this.showTodayMarker) {
        // Prioridad 2: Hoy
        targetPos = this.todayPosition;
    }
    
    element.scrollTo({
        left: Math.max(0, targetPos),
        behavior: 'smooth'
    });
  }

  calculateTodayMarker(): void {
    const today = startOfDay(new Date());
    if (today >= this.startDate && today <= this.endDate) {
      const diff = differenceInDays(today, this.startDate);
      this.todayPosition = diff * this.dayWidth;
      this.showTodayMarker = true;
    }
  }

  loadData(): void {
    if (!this.tareaId) return;

    this._taskService.getTaskById(this.tareaId).subscribe(task => {
        this.parentTask = task;
        this.updateUserList();
    });

    this._taskService.getActividades(this.tareaId).subscribe({
      next: (res) => {
        this.activities = [...(res || [])];
        this.adjustTimelineRange();
        // Forzar scroll después de cargar datos y ajustar rango
        setTimeout(() => this.scrollToTarget(), 150);
      },
      error: () => {
        this.activities = [
          { id: 1, tareaId: this.tareaId, nombre: 'Levantamiento de Requerimientos', responsableId: 1, nombreResponsable: 'Juan Pérez', fechaInicio: subDays(new Date(), 2), fechaFin: addDays(new Date(), 3), estatus: 3, progreso: 100 },
          { id: 2, tareaId: this.tareaId, nombre: 'Diseño Conceptual', responsableId: 2, nombreResponsable: 'Maria López', fechaInicio: addDays(new Date(), 2), fechaFin: addDays(new Date(), 8), estatus: 2, progreso: 45 },
          { id: 3, tareaId: this.tareaId, nombre: 'Desarrollo Core API', responsableId: 1, nombreResponsable: 'Juan Pérez', fechaInicio: addDays(new Date(), 6), fechaFin: addDays(new Date(), 20), estatus: 1, progreso: 0 }
        ];
      }
    });
  }

  updateUserList(): void {
    const targetIds = (this.assignedUserIds && this.assignedUserIds.length > 0) 
        ? this.assignedUserIds 
        : (this.parentTask?.usuarioIds || []);
    
    const sourceUsers = (this.allUsers && this.allUsers.length > 0) 
        ? this.allUsers 
        : [];

    if (sourceUsers.length > 0 && targetIds.length > 0) {
        this.userList = sourceUsers.filter(u => targetIds.includes(Number(u.usuarioId || u.id)));
    } else if (sourceUsers.length > 0 && (!targetIds || targetIds.length === 0)) {
        this.userList = sourceUsers;
    }
  }

  openDialog(actividad?: TareaActividad): void {
    const defaultStart = actividad?.fechaInicio || this.parentTask?.fechaInicioEstimada || new Date();
    const defaultEnd = actividad?.fechaFin || this.parentTask?.fechaFinEstimada || addDays(new Date(), 1);

    const dialogRef = this._matDialog.open(TareaActividadDialogComponent, {
      width: '500px',
      data: {
        actividad: actividad ? { ...actividad } : { 
            tareaId: this.tareaId,
            fechaInicio: defaultStart,
            fechaFin: defaultEnd,
            estatus: 1,
            progreso: 0
        },
        userList: this.userList,
        activities: this.activities.filter(a => a.id !== actividad?.id)
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.delete) {
          this._taskService.eliminarActividad(result.id).subscribe(() => this.loadData());
          return;
        }

        result.tareaId = this.tareaId;
        this._taskService.guardarActividad(result).subscribe(() => this.loadData());
        
        if (result.id) {
          const idx = this.activities.findIndex(a => Number(a.id) === Number(result.id));
          if (idx !== -1) {
            this.activities[idx] = result;
            this.activities = [...this.activities]; 
          }
        } else {
          const newAct = { ...result, id: Math.floor(Math.random() * -1000) }; // IDs negativos temporales
          this.activities = [...this.activities, newAct];
        }
      }
    });
  }

  getUser(userId: number): any {
    if (!this.allUsers) return null;
    return this.allUsers.find(u => Number(u.usuarioId || u.id) === userId);
  }

  getUserInitials(name: string): string {
    if (!name) return '?';
    const names = name.trim().split(/\s+/);
    if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return names[0][0] ? names[0][0].toUpperCase() : '?';
  }

  getUserColor(name: string): string {
    if (!name) return '#cbd5e0';
    if (!this._userColors[name]) {
        const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
        const colorIdx = Math.abs(hash) % this._palette.length;
        this._userColors[name] = this._palette[colorIdx];
    }
    return this._userColors[name];
  }

  getBarStyles(act: TareaActividad): any {
    const start = startOfDay(new Date(act.fechaInicio));
    const end = startOfDay(new Date(act.fechaFin));
    
    let leftDays = differenceInDays(start, this.startDate);
    let durationDays = differenceInDays(end, start) + 1;

    if (leftDays < 0) {
      durationDays += leftDays;
      leftDays = 0;
    }

    if (durationDays < 0.5) return { display: 'none' };

    return {
      'left': (leftDays * this.dayWidth) + 'px',
      'width': (durationDays * this.dayWidth) + 'px',
      'background-color': this.getBarColor(act.estatus, 0.2),
      'border': `1.5px solid ${this.getBarColor(act.estatus, 0.8)}`
    };
  }

  getBarColor(estatus: number, opacity: number = 1): string {
    switch (estatus) {
      case 1: return `rgba(245, 158, 11, ${opacity})`;  // Amber 500
      case 2: return `rgba(59, 130, 246, ${opacity})`;  // Blue 500
      case 3: return `rgba(16, 185, 129, ${opacity})`;  // Emerald 500
      default: return `rgba(100, 116, 139, ${opacity})`; // Slate 500
    }
  }

  getStatusLabel(estatus: number): string {
    switch (estatus) {
      case 1: return 'Pendiente';
      case 2: return 'En Proceso';
      case 3: return 'Completado';
      default: return 'No definido';
    }
  }

  getStatusBadgeClass(estatus: number): string {
    switch (estatus) {
      case 1: return 'text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-200';
      case 2: return 'text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-200';
      case 3: return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200';
      default: return 'text-slate-500 bg-slate-50 dark:bg-slate-500/10 border-slate-200';
    }
  }

  getDependencyPath(act: TareaActividad, currentIndex: number): string | null {
    const pId = act.predecesoraId ? Number(act.predecesoraId) : 0;
    const aId = act.id ? Number(act.id) : 0;

    if (pId <= 0 || pId === aId) return null;
    
    const predIndex = this.activities.findIndex(a => Number(a.id) === pId);
    if (predIndex === -1) return null;
    
    const pred = this.activities[predIndex];
    const rowHeight = 96;
    const predStyles = this.getBarStyles(pred);
    const currStyles = this.getBarStyles(act);

    if (!predStyles || !currStyles || predStyles.display === 'none' || currStyles.display === 'none') {
        return null;
    }

    const sL = parseFloat(predStyles.left);
    const sW = parseFloat(predStyles.width);
    const eL = parseFloat(currStyles.left);
    if (isNaN(sL) || isNaN(sW) || isNaN(eL)) return null;

    const startX = sL + sW;
    const startY = (predIndex * rowHeight) + 48;
    const endX = eL;
    const endY = (currentIndex * rowHeight) + 48;
    
    // Gutter es el borde entre las filas (siempre seguro, lejos del centro h-9)
    // Si vamos de arriba a abajo, usamos el borde inferior de la fila origen.
    // Si vamos de abajo a arriba, usamos el borde superior de la fila origen.
    const gutterY = (currentIndex > predIndex) ? (predIndex + 1) * rowHeight : predIndex * rowHeight;
    const r = 6; // Radio de curvatura premium

    if (endX >= startX + 25) {
        // Flujo Progresivo: La linea baja y entra
        const midX = startX + 12;
        const dirY = (endY > startY) ? 1 : -1;

        return `M ${startX} ${startY} 
                L ${midX - r} ${startY} 
                Q ${midX} ${startY} ${midX} ${startY + dirY * r} 
                L ${midX} ${endY - dirY * r} 
                Q ${midX} ${endY} ${midX + r} ${endY} 
                L ${endX} ${endY}`;
    } else {
        // Flujo Solapado (Rodeo): Salir -> Bajar a Gutter -> Ir a la Izquierda -> Bajar a Destino -> Entrar
        const outX = startX + 15;
        const inX = endX - 15;
        const dirY = (endY > startY) ? 1 : -1;

        // Trayectoria: 
        // 1. Salida horizontal
        // 2. Bajada a canal (gutter)
        // 3. Viaje largo a la izquierda por el canal (fuera de las barras)
        // 4. Bajada/Subida final al nivel del destino
        // 5. Entrada horizontal limpia
        return `M ${startX} ${startY} 
                L ${outX - r} ${startY} 
                Q ${outX} ${startY} ${outX} ${startY + dirY * r} 
                L ${outX} ${gutterY - dirY * r} 
                Q ${outX} ${gutterY} ${outX - r} ${gutterY} 
                L ${inX + r} ${gutterY} 
                Q ${inX} ${gutterY} ${inX} ${gutterY + dirY * r} 
                L ${inX} ${endY - dirY * r} 
                Q ${inX} ${endY} ${inX + r} ${endY} 
                L ${endX} ${endY}`;
    }
  }

  formatDay(date: Date): string {
    return format(date, 'eee', { locale: es });
  }

  isToday(date: Date): boolean {
    return isToday(date);
  }

  isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }
}
