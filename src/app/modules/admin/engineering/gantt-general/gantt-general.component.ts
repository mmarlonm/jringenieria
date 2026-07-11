import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EngineeringService } from '../engineering.service';
import { 
  addDays, 
  differenceInDays, 
  eachDayOfInterval, 
  endOfMonth, 
  format, 
  isToday, 
  startOfDay, 
  startOfMonth, 
  subDays 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { fromEvent, Subject, takeUntil } from 'rxjs';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-gantt-general',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    MatCheckboxModule
  ],
  templateUrl: './gantt-general.component.html',
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { 
        background: rgba(203, 213, 225, 0.6); 
        border-radius: 10px; 
    }
    .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(51, 65, 85, 0.6); }
    
    @keyframes stripes {
      from { background-position: 0 0; }
      to { background-position: 40px 0; }
    }
    .animate-stripes {
      background-image: linear-gradient(45deg, rgba(255,255,255,.3) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.3) 50%, rgba(255,255,255,.3) 75%, transparent 75%, transparent);
      background-size: 20px 20px;
      animation: stripes 2s linear infinite;
    }
  `]
})
export class GanttGeneralComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('horizontalTimeline') horizontalTimeline!: ElementRef;
  @ViewChild('sidebarScroll') sidebarScroll!: ElementRef;
  @ViewChild('timelineScroll') timelineScroll!: ElementRef;

  private _unsubscribeAll: Subject<any> = new Subject<any>();
  private _scrollAttemptCount: number = 0;

  timeScale: 'day' | 'week' | 'month' = 'day';
  visibleColumnIds: string[] = [];
  defaultColumns = [
    { id: 'nombre', label: 'Proyecto / Actividad / Subactividad', width: 280 },
    { id: 'responsable', label: 'Responsable', width: 120 },
    { id: 'area', label: 'Área / Empresa', width: 120 },
    { id: 'progreso', label: 'Progreso', width: 70 },
    { id: 'inicio', label: 'Inicio', width: 85 },
    { id: 'fin', label: 'Fin', width: 85 },
    { id: 'dias', label: 'Días', width: 60 },
    { id: 'predecesora', label: 'Predecesora', width: 110 },
    { id: 'equipoEspecial', label: 'Equipo Especial / Herramienta', width: 150 },
    { id: 'prioridad', label: 'Prioridad', width: 70 },
    { id: 'estatus', label: 'Estatus', width: 90 },
    { id: 'color', label: 'Color', width: 50 },
    { id: 'acciones', label: 'Acciones', width: 90 }
  ];

  projects: any[] = [];
  visibleRows: any[] = [];
  leftPanelWidthPercent: number = 60;
  
  days: Date[] = [];
  startDate: Date = startOfMonth(new Date());
  endDate: Date = endOfMonth(addDays(new Date(), 15));
  dayWidth: number = 44;
  timelineWidth: number = 0;
  todayPosition: number = 0;
  showTodayMarker: boolean = false;
  format = format;
  isLoading: boolean = true;

  // Project Selection properties
  selectedProjectIds = new Set<number>();

  constructor(
    private _engineeringService: EngineeringService,
    private _cdr: ChangeDetectorRef
  ) {}

  toggleProjectSelection(id: number): void {
    if (this.selectedProjectIds.has(id)) {
      this.selectedProjectIds.delete(id);
    } else {
      this.selectedProjectIds.add(id);
    }
    this._cdr.markForCheck();
  }

  toggleSelectAllProjects(checked: boolean): void {
    if (checked) {
      this.projects.forEach(p => this.selectedProjectIds.add(p.idSeguimiento));
    } else {
      this.selectedProjectIds.clear();
    }
    this._cdr.markForCheck();
  }

  isProjectSelected(id: number): boolean {
    return this.selectedProjectIds.has(id);
  }

  areAllProjectsSelected(): boolean {
    return this.projects.length > 0 && this.selectedProjectIds.size === this.projects.length;
  }

  ngOnInit(): void {
    // Cargar visibilidad de columnas
    const savedVis = localStorage.getItem('gantt_visible_columns_general');
    if (savedVis) {
      try {
        this.visibleColumnIds = JSON.parse(savedVis);
      } catch (e) {
        this.visibleColumnIds = this.defaultColumns.map(c => c.id);
      }
    } else {
      this.visibleColumnIds = this.defaultColumns.map(c => c.id);
    }

    const savedWidth = localStorage.getItem('gantt_general_left_panel_width_percent');
    if (savedWidth) {
      this.leftPanelWidthPercent = Number(savedWidth);
    }

    this.loadData();

    // Centrar al redimensionar
    fromEvent(window, 'resize')
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this.scrollToTarget();
      });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.scrollToTarget(), 1000);
  }

  // ==========================================
  // ⚙️ COLUMNS LAYOUT CONFIG
  // ==========================================
  toggleColumnVisibility(id: string): void {
    const idx = this.visibleColumnIds.indexOf(id);
    if (idx !== -1) {
      if (this.visibleColumnIds.length > 1) { // Al menos una columna visible
        this.visibleColumnIds.splice(idx, 1);
      }
    } else {
      this.visibleColumnIds.push(id);
    }
    localStorage.setItem('gantt_visible_columns_general', JSON.stringify(this.visibleColumnIds));
    this._cdr.markForCheck();
  }

  isColumnVisible(id: string): boolean {
    return this.visibleColumnIds.includes(id);
  }

  getLeftTableWidth(): number {
    return this.defaultColumns
      .filter(c => this.visibleColumnIds.includes(c.id))
      .reduce((sum, c) => sum + c.width, 0);
  }

  onGanttSplitterResizeStart(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const startX = event.clientX;
    const startPercent = this.leftPanelWidthPercent;
    
    const splitter = event.target as HTMLElement;
    const parentContainer = splitter.parentElement;
    const containerWidth = parentContainer ? parentContainer.offsetWidth : window.innerWidth;
    
    const mouseMoveSub = fromEvent<MouseEvent>(document, 'mousemove').subscribe(moveEv => {
      const currentX = moveEv.clientX;
      const diffX = currentX - startX;
      const diffPercent = (diffX / containerWidth) * 100;
      this.leftPanelWidthPercent = Math.min(85, Math.max(15, startPercent + diffPercent));
      this._cdr.markForCheck();
    });
    
    const mouseUpSub = fromEvent<MouseEvent>(document, 'mouseup').subscribe(() => {
      mouseMoveSub.unsubscribe();
      mouseUpSub.unsubscribe();
      localStorage.setItem('gantt_general_left_panel_width_percent', String(this.leftPanelWidthPercent));
    });
  }

  // ==========================================
  // 📅 TIME SCALES & FILTERS
  // ==========================================
  changeTimeScale(scale: 'day' | 'week' | 'month'): void {
    this.timeScale = scale;
    switch (scale) {
      case 'day':
        this.dayWidth = 44;
        break;
      case 'week':
        this.dayWidth = 90; // Ancho por columna de semana
        break;
      case 'month':
        this.dayWidth = 140; // Ancho por columna de mes
        break;
    }
    this.adjustTimelineRange();
    this._cdr.markForCheck();
  }

  loadData(): void {
    this.isLoading = true;
    this._engineeringService.getGanttGeneral().subscribe({
      next: (res) => {
        this.projects = res || [];
        
        // Por defecto colapsar todo y seleccionar todos
        this.projects.forEach((p) => {
          p.expanded = false;
          this.selectedProjectIds.add(p.idSeguimiento);
          if (p.actividadesMaestras) {
            p.actividadesMaestras.forEach((m: any) => {
              m.expanded = false;
            });
          }
        });

        this.updateVisibleRows();
        this.adjustTimelineRange();
        this.isLoading = false;
        
        setTimeout(() => this.scrollToTarget(), 150);
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  updateVisibleRows(): void {
    const rows: any[] = [];
    this.projects.forEach((p) => {
      rows.push({ type: 'project', project: p });
      if (p.expanded === true) {
        if (p.actividadesMaestras) {
          p.actividadesMaestras.forEach((m: any) => {
            rows.push({ type: 'maestra', project: p, maestra: m });
            if (m.expanded === true) {
              if (m.actividades) {
                m.actividades.forEach((act: any) => {
                  rows.push({ type: 'subactividad', project: p, maestra: m, subactividad: act });
                });
              }
            }
          });
        }
      }
    });
    this.visibleRows = rows;
    this._cdr.markForCheck();
  }

  toggleProject(p: any): void {
    p.expanded = !p.expanded;
    this.updateVisibleRows();
  }

  toggleMaestra(m: any): void {
    m.expanded = !m.expanded;
    this.updateVisibleRows();
  }

  initTimeline(customStart?: Date, customEnd?: Date): void {
    if (customStart && customEnd) {
      this.startDate = startOfDay(customStart);
      this.endDate = startOfDay(customEnd);
    } else {
      this.startDate = startOfDay(subDays(new Date(), 15));
      this.endDate = addDays(this.startDate, 60);
    }

    const intervalStart = this.startDate;
    const intervalEnd = this.endDate;

    if (this.timeScale === 'day') {
      this.days = eachDayOfInterval({
        start: intervalStart,
        end: intervalEnd
      });
    } else if (this.timeScale === 'week') {
      // Generar fechas cada lunes
      const tempDays: Date[] = [];
      let current = new Date(intervalStart);
      while (current <= intervalEnd) {
        tempDays.push(new Date(current));
        current = addDays(current, 7);
      }
      this.days = tempDays;
    } else {
      // Generar fechas cada primero de mes
      const tempDays: Date[] = [];
      let current = startOfMonth(new Date(intervalStart));
      while (current <= intervalEnd) {
        tempDays.push(new Date(current));
        current = startOfMonth(addDays(endOfMonth(current), 1));
      }
      this.days = tempDays;
    }

    this.timelineWidth = this.days.length * this.dayWidth;
    this.calculateTodayMarker();
  }

  adjustTimelineRange(): void {
    let allDates: Date[] = [];

    this.projects.forEach((p) => {
      if (p.fechaInicioProyecto) allDates.push(new Date(p.fechaInicioProyecto));
      if (p.fechaFinProyecto) allDates.push(new Date(p.fechaFinProyecto));

      if (p.actividadesMaestras) {
        p.actividadesMaestras.forEach((m: any) => {
          if (m.fechaInicio) allDates.push(new Date(m.fechaInicio));
          if (m.fechaFin) allDates.push(new Date(m.fechaFin));

          if (m.actividades) {
            m.actividades.forEach((s: any) => {
              if (s.fechaInicio) allDates.push(new Date(s.fechaInicio));
              if (s.fechaFin) allDates.push(new Date(s.fechaFin));
            });
          }
        });
      }
    });

    if (allDates.length === 0) {
      this.initTimeline();
      return;
    }

    let minDate = allDates[0];
    let maxDate = allDates[0];

    allDates.forEach((d) => {
      if (d < minDate) minDate = d;
      if (d > maxDate) maxDate = d;
    });

    const today = new Date();
    if (today < minDate) minDate = today;
    if (today > maxDate) maxDate = today;

    const finalStart = subDays(minDate, 15);
    const finalEnd = addDays(maxDate, 30);

    this.initTimeline(finalStart, finalEnd);
    this._cdr.detectChanges();
  }

  calculateTodayMarker(): void {
    const today = startOfDay(new Date());
    if (today >= this.startDate && today <= this.endDate) {
      this.todayPosition = this.getXPosition(today);
      this.showTodayMarker = true;
    } else {
      this.showTodayMarker = false;
    }
  }

  scrollToTarget(): void {
    if (!this.horizontalTimeline) return;
    const element = this.horizontalTimeline.nativeElement;

    if (element.scrollWidth <= element.clientWidth && this._scrollAttemptCount < 15) {
      this._scrollAttemptCount++;
      setTimeout(() => this.scrollToTarget(), 200);
      return;
    }

    this._scrollAttemptCount = 0;
    let targetPos = 0;

    if (this.showTodayMarker) {
      targetPos = this.todayPosition;
    } else {
      targetPos = this.timelineWidth / 2;
    }

    element.scrollTo({
      left: Math.max(0, targetPos - element.clientWidth / 3),
      behavior: 'smooth'
    });
  }

  onScroll(event: any, target: HTMLElement): void {
    const source = event.target as HTMLElement;
    window.requestAnimationFrame(() => {
      if (target.scrollTop !== source.scrollTop) {
        target.scrollTop = source.scrollTop;
      }
    });
  }

  getXPosition(date: Date | string): number {
    const d = new Date(date);
    if (d < this.startDate) return 0;
    if (d > this.endDate) return this.timelineWidth;

    const totalDays = differenceInDays(this.endDate, this.startDate) || 1;
    const currentDays = differenceInDays(d, this.startDate);

    return (currentDays / totalDays) * this.timelineWidth;
  }

  // ==========================================
  // HELPERS Y RENDERING DE BARRAS
  // ==========================================
  getDurationDays(row: any): number {
    let start: Date;
    let end: Date;

    if (row.type === 'project') {
      start = row.project.fechaInicioProyecto ? new Date(row.project.fechaInicioProyecto) : new Date();
      end = row.project.fechaFinProyecto ? new Date(row.project.fechaFinProyecto) : new Date();
    } else if (row.type === 'maestra') {
      start = new Date(row.maestra.fechaInicio);
      end = new Date(row.maestra.fechaFin);
    } else {
      start = new Date(row.subactividad.fechaInicio);
      end = new Date(row.subactividad.fechaFin);
    }

    return differenceInDays(end, start) + 1;
  }

  getColorHex(row: any): string {
    if (row.type === 'project') return '#475569'; // Slate 600
    const colorName = row.type === 'maestra' ? row.maestra.color : row.subactividad.color;
    switch (colorName) {
      case 'Azul': return '#3b82f6';
      case 'Verde': return '#10b981';
      case 'Amarillo': return '#f59e0b';
      case 'Morado': return '#8b5cf6';
      case 'Naranja': return '#f97316';
      case 'Rosa': return '#ec4899';
      default: return row.type === 'maestra' ? '#3b82f6' : '#10b981';
    }
  }

  getBarStyles(row: any): any {
    let start: Date;
    let end: Date;

    if (row.type === 'project') {
      if (!row.project.fechaInicioProyecto || !row.project.fechaFinProyecto) {
        return { display: 'none' };
      }
      start = startOfDay(new Date(row.project.fechaInicioProyecto));
      end = startOfDay(new Date(row.project.fechaFinProyecto));
    } else if (row.type === 'maestra') {
      if (!row.maestra.fechaInicio || !row.maestra.fechaFin) return { display: 'none' };
      start = startOfDay(new Date(row.maestra.fechaInicio));
      end = startOfDay(new Date(row.maestra.fechaFin));
    } else {
      if (!row.subactividad.fechaInicio || !row.subactividad.fechaFin) return { display: 'none' };
      start = startOfDay(new Date(row.subactividad.fechaInicio));
      end = startOfDay(new Date(row.subactividad.fechaFin));
    }

    const leftX = this.getXPosition(start);
    const rightX = this.getXPosition(end);
    const widthX = Math.max(12, rightX - leftX + (this.timeScale === 'day' ? this.dayWidth : (this.timelineWidth / (differenceInDays(this.endDate, this.startDate) || 1))));

    const colorHex = this.getColorHex(row);

    return {
      'left': leftX + 'px',
      'width': widthX + 'px',
      'background-color': row.type === 'project' 
        ? 'rgba(71, 85, 105, 0.05)' 
        : row.type === 'maestra' ? 'rgba(15, 23, 42, 0.03)' : 'rgba(255, 255, 255, 0.95)',
      'border': row.type === 'project' 
        ? '2px dashed #94a3b8' 
        : `1.5px solid ${colorHex}`,
      'border-left-width': row.type === 'subactividad' ? '1.5px' : '4px',
      'border-left-color': colorHex,
      'border-radius': row.type === 'subactividad' ? '8px' : '4px'
    };
  }

  getRowTooltip(row: any): string {
    const name = row.type === 'project' ? row.project.actividad : (row.type === 'maestra' ? row.maestra.nombre : row.subactividad.nombre);
    const prog = row.type === 'project' ? row.project.avanceGantt : (row.type === 'maestra' ? row.maestra.progreso : row.subactividad.progreso);
    return `${name} (${Math.round(prog || 0)}%)`;
  }

  getPrioridadClass(row: any): string {
    if (row.type === 'project') return '';
    const prio = row.type === 'maestra' ? row.maestra.prioridad : row.subactividad.prioridad;
    switch (prio) {
      case 'Alta':
      case 'Muy Alta':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'Media':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Baja':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }

  getEstatusLabel(row: any): string {
    if (row.type === 'project') return '';
    const est = row.type === 'maestra' ? row.maestra.estatus : row.subactividad.estatus;
    switch (est) {
      case 1: return 'Pendiente';
      case 2: return 'En Proceso';
      case 3: return 'Completado';
      default: return 'No definido';
    }
  }

  getEstatusClass(row: any): string {
    if (row.type === 'project') return '';
    const est = row.type === 'maestra' ? row.maestra.estatus : row.subactividad.estatus;
    switch (est) {
      case 1: return 'text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-200';
      case 2: return 'text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-200';
      case 3: return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200';
      default: return 'text-slate-500 bg-slate-50 dark:bg-slate-500/10 border-slate-200';
    }
  }

  getPredecesoraName(row: any): string {
    if (row.type === 'project') return '-';
    const pId = row.type === 'maestra' ? row.maestra.predecesoraId : row.subactividad.predecesoraId;
    if (!pId) return '-';

    if (row.type === 'maestra') {
      if (row.project && row.project.actividadesMaestras) {
        const pred = row.project.actividadesMaestras.find((m: any) => Number(m.id) === Number(pId));
        return pred ? pred.nombre : `- (ID: ${pId})`;
      }
    } else if (row.type === 'subactividad') {
      if (row.project && row.project.actividadesMaestras) {
        let foundName = '';
        row.project.actividadesMaestras.forEach((m: any) => {
          if (m.actividades) {
            const pred = m.actividades.find((a: any) => Number(a.id) === Number(pId));
            if (pred) {
              foundName = pred.nombre;
            }
          }
        });
        return foundName ? foundName : `- (ID: ${pId})`;
      }
    }
    return '-';
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

  // ==========================================
  // TRAZADO DE LÍNEAS DE DEPENDENCIAS (SVG)
  // ==========================================
  getDependencyPath(row: any, currentIndex: number): string | null {
    // Dibujar dependencias solo para subactividades
    if (row.type !== 'subactividad' || !row.subactividad.predecesoraId) return null;
    const pId = Number(row.subactividad.predecesoraId);

    // Buscar el predecesor en la lista visible (dentro del mismo proyecto, que sea subactividad)
    const predIndex = this.visibleRows.findIndex(r => 
      r.type === 'subactividad' && 
      Number(r.subactividad.id) === pId && 
      r.project.idSeguimiento === row.project.idSeguimiento
    );
    
    if (predIndex === -1) return null;

    const pred = this.visibleRows[predIndex];
    const rowHeight = 56;
    const predStyles = this.getBarStyles(pred);
    const currStyles = this.getBarStyles(row);

    if (!predStyles || !currStyles || predStyles.display === 'none' || currStyles.display === 'none') {
      return null;
    }

    const sL = parseFloat(predStyles.left);
    const sW = parseFloat(predStyles.width);
    const eL = parseFloat(currStyles.left);
    if (isNaN(sL) || isNaN(sW) || isNaN(eL)) return null;

    const startX = sL + sW;
    const startY = (predIndex * rowHeight) + 28;
    const endX = eL;
    const endY = (currentIndex * rowHeight) + 28;
    
    const gutterY = (currentIndex > predIndex) ? (predIndex + 1) * rowHeight : predIndex * rowHeight;
    const r = 6;

    if (endX >= startX + 25) {
      const midX = startX + 12;
      const dirY = (endY > startY) ? 1 : -1;
      return `M ${startX} ${startY} L ${midX - r} ${startY} Q ${midX} ${startY} ${midX} ${startY + dirY * r} L ${midX} ${endY - dirY * r} Q ${midX} ${endY} ${midX + r} ${endY} L ${endX} ${endY}`;
    } else {
      const outX = startX + 15;
      const inX = endX - 15;
      const dirY = (endY > startY) ? 1 : -1;
      return `M ${startX} ${startY} L ${outX - r} ${startY} Q ${outX} ${startY} ${outX} ${startY + dirY * r} L ${outX} ${gutterY - dirY * r} Q ${outX} ${gutterY} ${outX - r} ${gutterY} L ${inX + r} ${gutterY} Q ${inX} ${gutterY} ${inX} ${gutterY + dirY * r} L ${inX} ${endY - dirY * r} Q ${inX} ${endY} ${inX + r} ${endY} L ${endX} ${endY}`;
    }
  }

  exportarExcel(): void {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Gantt General');

    // 1. Cabeceras Fijas de Columnas
    const headers = [
      'Proyecto / Actividad / Subactividad',
      'Responsable',
      'Área / Empresa',
      'Progreso',
      'Inicio',
      'Fin',
      'Días',
      'Prioridad',
      'Estatus'
    ];

    // 2. Cabeceras de Fechas de la Línea de Tiempo (Igual al frontend)
    const timelineHeaders: string[] = [];
    this.days.forEach(d => {
      if (this.timeScale === 'day') {
        timelineHeaders.push(format(d, 'dd/MM'));
      } else if (this.timeScale === 'week') {
        timelineHeaders.push('Sem ' + format(d, 'ww'));
      } else {
        timelineHeaders.push(format(d, 'MMMM', { locale: es }));
      }
    });

    const allHeaders = [...headers, ...timelineHeaders];
    const headerRow = worksheet.addRow(allHeaders);

    // Estilos de la Fila de Cabecera
    headerRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1E293B' } // Slate-800
      };
      cell.font = {
        name: 'Segoe UI',
        size: 10,
        bold: true,
        color: { argb: 'FFFFFF' }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber > 9 ? 'center' : 'left'
      };
    });

    worksheet.getRow(1).height = 28;

    // 3. Procesar las Filas a Exportar
    // Filtramos únicamente las filas visibles que correspondan a proyectos seleccionados
    const rowsToExport: any[] = [];
    this.projects.forEach((p) => {
      if (!this.selectedProjectIds.has(p.idSeguimiento)) return;

      rowsToExport.push({ type: 'project', project: p });
      if (p.actividadesMaestras) {
        p.actividadesMaestras.forEach((m: any) => {
          rowsToExport.push({ type: 'maestra', project: p, maestra: m });
          if (m.actividades) {
            m.actividades.forEach((act: any) => {
              rowsToExport.push({ type: 'subactividad', project: p, maestra: m, subactividad: act });
            });
          }
        });
      }
    });

    // 4. Agregar Datos y Pintar Línea de Tiempo
    rowsToExport.forEach((row) => {
      let name = '';
      let resp = '';
      let area = '';
      let prog = '';
      let startStr = '';
      let endStr = '';
      let dias = 0;
      let prio = '';
      let est = '';
      let colorName = 'Azul';
      let startDateVal: Date | null = null;
      let endDateVal: Date | null = null;

      if (row.type === 'project') {
        name = row.project.actividad;
        resp = row.project.nombreSolicitante || '';
        area = row.project.empresa || '';
        prog = row.project.progreso ? `${row.project.progreso}%` : '0%';
        startStr = row.project.fechaInicioProyecto ? format(new Date(row.project.fechaInicioProyecto), 'dd/MM/yyyy') : '-';
        endStr = row.project.fechaFinProyecto ? format(new Date(row.project.fechaFinProyecto), 'dd/MM/yyyy') : '-';
        startDateVal = row.project.fechaInicioProyecto ? new Date(row.project.fechaInicioProyecto) : null;
        endDateVal = row.project.fechaFinProyecto ? new Date(row.project.fechaFinProyecto) : null;
      } else if (row.type === 'maestra') {
        name = '   ' + row.maestra.nombre;
        resp = row.maestra.nombreResponsable || '';
        area = row.maestra.area || '';
        prog = `${row.maestra.progreso || 0}%`;
        startStr = row.maestra.fechaInicio ? format(new Date(row.maestra.fechaInicio), 'dd/MM/yyyy') : '-';
        endStr = row.maestra.fechaFin ? format(new Date(row.maestra.fechaFin), 'dd/MM/yyyy') : '-';
        startDateVal = row.maestra.fechaInicio ? new Date(row.maestra.fechaInicio) : null;
        endDateVal = row.maestra.fechaFin ? new Date(row.maestra.fechaFin) : null;
        colorName = row.maestra.color || 'Azul';
        prio = row.maestra.prioridad || '';
        est = row.maestra.estatus === 1 ? 'Pendiente' : (row.maestra.estatus === 2 ? 'En Proceso' : 'Completado');
      } else {
        name = '      ' + row.subactividad.nombre;
        resp = row.subactividad.nombreResponsable || '';
        area = row.subactividad.area || '';
        prog = `${row.subactividad.progreso || 0}%`;
        startStr = row.subactividad.fechaInicio ? format(new Date(row.subactividad.fechaInicio), 'dd/MM/yyyy') : '-';
        endStr = row.subactividad.fechaFin ? format(new Date(row.subactividad.fechaFin), 'dd/MM/yyyy') : '-';
        startDateVal = row.subactividad.fechaInicio ? new Date(row.subactividad.fechaInicio) : null;
        endDateVal = row.subactividad.fechaFin ? new Date(row.subactividad.fechaFin) : null;
        colorName = row.subactividad.color || 'Verde';
        prio = row.subactividad.prioridad || '';
        est = row.subactividad.estatus === 1 ? 'Pendiente' : (row.subactividad.estatus === 2 ? 'En Proceso' : 'Completado');
      }

      if (startDateVal && endDateVal) {
        dias = Math.max(1, differenceInDays(endDateVal, startDateVal) + 1);
      }

      const excelRow = worksheet.addRow([name, resp, area, prog, startStr, endStr, dias || '-', prio, est]);
      const lastRowIdx = excelRow.number;

      // Color de relleno de la Barra del Gantt
      let barColor = '3B82F6'; // Default Azul
      if (colorName === 'Verde') barColor = '10B981';
      else if (colorName === 'Amarillo') barColor = 'F59E0B';
      else if (colorName === 'Morado') barColor = '8B5CF6';
      else if (colorName === 'Naranja') barColor = 'F97316';
      else if (colorName === 'Rosa') barColor = 'EC4899';

      // Rellenar celdas correspondientes de la Línea de Tiempo
      if (startDateVal && endDateVal) {
        this.days.forEach((day, idx) => {
          let cellMatches = false;

          if (this.timeScale === 'day') {
            cellMatches = day >= startOfDay(startDateVal) && day <= startOfDay(endDateVal);
          } else if (this.timeScale === 'week') {
            const nextWeek = addDays(day, 7);
            cellMatches = startOfDay(startDateVal) < nextWeek && startOfDay(endDateVal) >= day;
          } else {
            const nextMonth = addDays(endOfMonth(day), 1);
            cellMatches = startOfDay(startDateVal) < nextMonth && startOfDay(endDateVal) >= day;
          }

          if (cellMatches) {
            const cell = excelRow.getCell(10 + idx);
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: barColor }
            };
          }
        });
      }

      // Estilo de la fila de datos
      excelRow.eachCell((cell, colNumber) => {
        cell.font = {
          name: 'Segoe UI',
          size: 9,
          bold: row.type === 'project' || row.type === 'maestra'
        };

        if (row.type === 'project') {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'E2E8F0' } // slate-200
          };
        } else if (row.type === 'maestra') {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F1F5F9' } // slate-100
          };
        }

        cell.border = {
          bottom: { style: 'thin', color: { argb: 'E2E8F0' } }
        };
      });

      worksheet.getRow(lastRowIdx).height = 22;
    });

    // 5. Autoajustar anchos de columnas
    worksheet.columns.forEach((col, idx) => {
      if (idx < 9) {
        let maxLen = 0;
        col.eachCell({ includeEmpty: true }, (c) => {
          const valStr = c.value ? c.value.toString() : '';
          if (valStr.length > maxLen) maxLen = valStr.length;
        });
        col.width = Math.max(12, maxLen + 3);
      } else {
        col.width = 7; // Ancho constante para la cuadrícula
      }
    });

    // 6. Guardar archivo
    workbook.xlsx.writeBuffer().then((data) => {
      const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'Gantt_General_JR.xlsx');
    });
  }
}

