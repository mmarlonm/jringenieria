import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { EngineeringService, SeguimientoEjecucion, SeguimientoEjecucionActividadMaestra, SeguimientoEjecucionSubactividad } from '../../engineering.service';
import { UsersService } from 'app/modules/admin/security/users/users.service';
import { ControlEjecucionActividadDialogComponent } from './dialogs/control-ejecucion-actividad-dialog.component';
import { ImagePreviewDialogComponent } from 'app/modules/admin/dashboards/tasks/task-media-dialog/task-media-dialog-viewer.component';
import Swal from 'sweetalert2';
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
import { fromEvent, Subject, takeUntil } from 'rxjs';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem, CdkDrag } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-control-ejecucion-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
    DragDropModule
  ],
  templateUrl: './control-ejecucion-form.component.html',
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
    .btn-float {
        position: fixed !important;
        bottom: 24px !important;
        right: 24px;
    }

    /* CDK Drag & Drop premium styles */
    .cdk-drag-preview {
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      background-color: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(4px);
      opacity: 0.95;
      border: 1px solid rgba(226, 232, 240, 0.8);
    }
    .cdk-drag-placeholder {
      opacity: 0.45;
      border: 2px dashed #6366f1 !important;
      background: rgba(99, 102, 241, 0.04) !important;
    }
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .cdk-drop-list-dragging .cdk-drag {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
  `]
})
export class ControlEjecucionFormComponent implements OnInit, OnDestroy {
  @ViewChild('horizontalTimeline') horizontalTimeline!: ElementRef;
  @ViewChild('sidebarScroll') sidebarScroll!: ElementRef;
  @ViewChild('timelineScroll') timelineScroll!: ElementRef;

  private _unsubscribeAll: Subject<any> = new Subject<any>();
  private _scrollAttemptCount: number = 0;

  idSeguimiento!: number;
  ejecucion!: SeguimientoEjecucion;
  form!: FormGroup;
  isSaving: boolean = false;

  // Dropdown options
  recursosOptions = [
    'RECURSOS TOTALMENTE DISPONIBLES',
    'NO DISPONIBLE',
    'BAJA DISPONIBILIDAD',
    'CONFLICTO CON OTROS PROYECTOS'
  ];
  riesgoOptions = ['BAJO', 'MEDIO', 'ALTO', 'MUY ALTO'];
  prioridadOptions = [
    'IMPORTANTE URGENTE',
    'IMPORTANTE NO URGENTE',
    'NO IMPORTANTE URGENTE',
    'NO IMPORTANTE NO URGENTE'
  ];
  categories = [
    { name: 'AST', label: "AST's", icon: 'heroicons_outline:shield-check' },
    { name: 'Gantt', label: 'Prog. Gantt', icon: 'heroicons_outline:calendar-days' },
    { name: 'IMSS', label: 'IMSS/SUA', icon: 'heroicons_outline:identification' },
    { name: 'Materiales', label: 'Materiales', icon: 'heroicons_outline:square-3-stack-3d' },
    { name: 'Reportes', label: 'Reportes', icon: 'heroicons_outline:document-chart-bar' },
    { name: 'Contrato', label: 'Contrato', icon: 'heroicons_outline:document-text' },
    { name: 'Fianza', label: 'Fianza', icon: 'heroicons_outline:shield-check' },
    { name: 'Dossier', label: 'Dossier', icon: 'heroicons_outline:folder-open' },
    { name: 'ActaEntrega', label: 'Acta Entrega Final', icon: 'heroicons_outline:clipboard-document-check' },
    { name: 'Planos', label: 'Planos', icon: 'heroicons_outline:map' }
  ];

  // Files
  archivos: { nombreArchivo: string, tipo: string }[] = [];
  isUploading: { [key: string]: boolean } = {};
  isUploadingOC: boolean = false;
  ocFileName: string = '';

  // Gantt State
  tasks: SeguimientoEjecucionActividadMaestra[] = [];
  visibleRows: any[] = [];
  userList: any[] = [];
  predecesorasList: any[] = []; // List of all activities for dependencies

  days: Date[] = [];
  startDate: Date = startOfMonth(new Date());
  endDate: Date = endOfMonth(addDays(new Date(), 15));
  dayWidth: number = 44;
  timelineWidth: number = 0;
  todayPosition: number = 0;
  showTodayMarker: boolean = false;
  format = format;

  // Dynamic columns
  columns: any[] = [];
  timeScale: 'day' | 'week' | 'month' = 'day';
  filterStartDate: Date | null = null;
  filterEndDate: Date | null = null;

  defaultColumns: Array<{ id: string; label: string; width: number; order?: number }> = [
    { id: 'nombre', label: 'Actividad / Subactividad', width: 220 },
    { id: 'responsable', label: 'Responsable', width: 120 },
    { id: 'area', label: 'Área', width: 100 },
    { id: 'progreso', label: 'Progreso', width: 70 },
    { id: 'inicio', label: 'Inicio', width: 85 },
    { id: 'fin', label: 'Fin', width: 85 },
    { id: 'dias', label: 'Días', width: 60 },
    { id: 'predecesora', label: 'Predecesora', width: 110 },
    { id: 'prioridad', label: 'Prioridad', width: 70 },
    { id: 'estatus', label: 'Estatus', width: 90 },
    { id: 'color', label: 'Color', width: 50 },
    { id: 'acciones', label: 'Acciones', width: 90 }
  ];

  constructor(
    private _route: ActivatedRoute,
    private _router: Router,
    private _fb: FormBuilder,
    private _dialog: MatDialog,
    private _engineeringService: EngineeringService,
    private _usersService: UsersService,
    private _cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.idSeguimiento = Number(this._route.snapshot.paramMap.get('id'));
    this.initForm();
    this.initColumns();
    this.loadData();
    this.loadUsers();
    
    // Centrar línea de tiempo al redimensionar ventana
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

  initForm(): void {
    this.form = this._fb.group({
      idEjecucion: [0],
      idSeguimiento: [this.idSeguimiento],
      utilidadEsperada: ['', [Validators.min(0)]],
      disponibilidadRecursos: [''],
      fechaInicioProyecto: [''],
      fechaFinProyecto: [''],
      riesgoTecnico: [''],
      nivelPrioridad: [''],
      contratoFolio: [''],
      fianzaFolio: [''],
      ordenCompraFolio: [''],
      ordenCompraArchivo: ['']
    });
  }

  // ==========================================
  // ⚙️ COLUMNS LAYOUT CONFIG
  // ==========================================
  initColumns(): void {
    const cached = localStorage.getItem('gantt_columns_config_seguimiento');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = this.defaultColumns.map(defCol => {
            const found = parsed.find(p => p.id === defCol.id);
            return found ? { ...defCol, width: found.width, order: found.order } : defCol;
          });
          this.columns = merged.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          return;
        }
      } catch (e) {
        console.warn('Error al parsear columnas del Gantt:', e);
      }
    }
    this.columns = this.defaultColumns.map((c, idx) => ({ ...c, order: idx }));
  }

  saveColumnsConfig(): void {
    const config = this.columns.map((c, idx) => ({
      id: c.id,
      width: c.width,
      order: idx
    }));
    localStorage.setItem('gantt_columns_config_seguimiento', JSON.stringify(config));
  }

  onColumnReordered(event: CdkDragDrop<any[]>): void {
    moveItemInArray(this.columns, event.previousIndex, event.currentIndex);
    this.saveColumnsConfig();
    this._cdr.markForCheck();
  }

  onColumnResizeStart(event: MouseEvent, index: number): void {
    event.preventDefault();
    event.stopPropagation();
    
    const startX = event.clientX;
    const startWidth = this.columns[index].width;
    
    const mouseMoveSub = fromEvent<MouseEvent>(document, 'mousemove').subscribe(moveEv => {
      const currentX = moveEv.clientX;
      const diffX = currentX - startX;
      this.columns[index].width = Math.max(50, startWidth + diffX);
      this._cdr.markForCheck();
    });
    
    const mouseUpSub = fromEvent<MouseEvent>(document, 'mouseup').subscribe(() => {
      mouseMoveSub.unsubscribe();
      mouseUpSub.unsubscribe();
      this.saveColumnsConfig();
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
        this.dayWidth = 14;
        break;
      case 'month':
        this.dayWidth = 5;
        break;
    }
    this.adjustTimelineRange();
    this._cdr.markForCheck();
  }

  applyDateRangeFilter(): void {
    if (this.filterStartDate && this.filterEndDate) {
      this.initTimeline(this.filterStartDate, this.filterEndDate);
      this.scrollToTarget();
      this._cdr.markForCheck();
    }
  }

  clearDateRangeFilter(): void {
    this.filterStartDate = null;
    this.filterEndDate = null;
    this.adjustTimelineRange();
  }

  loadData(): void {
    // Cargar la ejecución
    this._engineeringService.getSeguimientosEjecucion().subscribe({
      next: (list) => {
        const found = list.find((x) => x.idSeguimiento === this.idSeguimiento);
        if (found) {
          this.ejecucion = found;
          this.form.patchValue({
            idEjecucion: found.idEjecucion,
            idSeguimiento: found.idSeguimiento,
            utilidadEsperada: found.utilidadEsperada || '',
            disponibilidadRecursos: found.disponibilidadRecursos || '',
            fechaInicioProyecto: found.fechaInicioProyecto ? new Date(found.fechaInicioProyecto) : '',
            fechaFinProyecto: found.fechaFinProyecto ? new Date(found.fechaFinProyecto) : '',
            riesgoTecnico: found.riesgoTecnico || '',
            nivelPrioridad: found.nivelPrioridad || '',
            contratoFolio: found.contratoFolio || '',
            fianzaFolio: found.fianzaFolio || '',
            ordenCompraFolio: found.ordenCompraFolio || '',
            ordenCompraArchivo: found.ordenCompraArchivo || ''
          });
          this.ocFileName = found.ordenCompraArchivo || '';
        } else {
          // Si no existe, creamos un registro ficticio en memoria con idSeguimiento
          this.ejecucion = {
            idEjecucion: 0,
            idSeguimiento: this.idSeguimiento,
            estatusAst: 1,
            estatusProgramaGantt: 1,
            estatusImssSua: 1,
            estatusAdquisicionMateriales: 1,
            estatusConstruccionEntrega: 1,
            estatusReporte: 1,
            actividad: 'Nuevo Proyecto',
            nombreSolicitante: 'Desconocido',
            empresa: 'Empresa'
          };
        }
        this.loadFiles();
        this.loadGantt();
      },
      error: (err) => {
        console.error(err);
        Swal.fire('Error', 'No se pudo cargar el control de ejecución', 'error');
      }
    });
  }

  loadUsers(): void {
    this._usersService.getUsers().subscribe({
      next: (users) => {
        this.userList = users || [];
        this._cdr.markForCheck();
      }
    });
  }

  // ==========================================
  // 📁 FILES LOGIC
  // ==========================================
  onOCFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.isUploadingOC = true;
    this._engineeringService.subirArchivoOC(this.idSeguimiento, file).subscribe({
      next: (res) => {
        this.isUploadingOC = false;
        this.ocFileName = res.nombreArchivo;
        this.form.patchValue({ ordenCompraArchivo: res.nombreArchivo });
        Swal.fire({
          title: '¡Subido!',
          text: 'Archivo de Orden de Compra cargado con éxito.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        this.loadData();
      },
      error: (err) => {
        this.isUploadingOC = false;
        console.error(err);
        Swal.fire('Error', 'No se pudo subir el archivo de Orden de Compra.', 'error');
      }
    });
    event.target.value = '';
  }

  descargarArchivoOC(): void {
    if (!this.ocFileName) return;
    this._engineeringService.descargarArchivoOC(this.idSeguimiento).subscribe({
      next: (res) => {
        if (res && res.data) {
          const byteCharacters = atob(res.data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: res.contentType });

          const a = document.createElement('a');
          const objectUrl = URL.createObjectURL(blob);
          a.href = objectUrl;
          a.download = this.ocFileName;
          a.click();
          URL.revokeObjectURL(objectUrl);
        }
      },
      error: (err) => {
        console.error(err);
        Swal.fire('Error', 'No se pudo descargar el archivo de Orden de Compra.', 'error');
      }
    });
  }

  eliminarArchivoOC(): void {
    Swal.fire({
      title: '¿Eliminar archivo de OC?',
      text: `¿Estás seguro de eliminar el archivo "${this.ocFileName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-3xl p-6 shadow-2xl border-0',
        confirmButton: 'inline-flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all duration-300 mx-2 shadow-lg shadow-red-200',
        cancelButton: 'inline-flex items-center justify-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-bold rounded-xl transition-all duration-300 mx-2'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this._engineeringService.eliminarArchivoOC(this.idSeguimiento).subscribe({
          next: () => {
            Swal.fire({
              title: '¡Eliminado!',
              text: 'El archivo de Orden de Compra ha sido eliminado.',
              icon: 'success',
              timer: 1500,
              showConfirmButton: false
            });
            this.ocFileName = '';
            this.form.patchValue({ ordenCompraArchivo: '' });
            this.loadData();
          },
          error: (err) => {
            console.error(err);
            Swal.fire('Error', 'No se pudo eliminar el archivo.', 'error');
          }
        });
      }
    });
  }

  loadFiles(): void {
    this._engineeringService.getArchivosEjecucion(this.idSeguimiento).subscribe({
      next: (res) => {
        this.archivos = res || [];
      }
    });
  }

  getFilesByCategory(categoryName: string): any[] {
    return this.archivos.filter((a) => a.tipo === categoryName);
  }

  onFileSelected(event: any, categoryName: string): void {
    const file = event.target.files[0];
    if (!file) return;

    this.isUploading[categoryName] = true;
    this._engineeringService.subirArchivoEjecucion(this.idSeguimiento, file, categoryName).subscribe({
      next: () => {
        this.isUploading[categoryName] = false;
        Swal.fire({
          title: '¡Subido!',
          text: 'Archivo cargado con éxito.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        this.loadFiles();
      },
      error: (err) => {
        this.isUploading[categoryName] = false;
        console.error(err);
        Swal.fire('Error', 'No se pudo subir el archivo.', 'error');
      }
    });
    event.target.value = '';
  }

  descargarArchivo(file: any): void {
    this._engineeringService.descargarArchivoEjecucion(this.idSeguimiento, file.tipo, file.nombreArchivo).subscribe({
      next: (res) => {
        if (res && res.data) {
          const byteCharacters = atob(res.data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: res.contentType });

          const a = document.createElement('a');
          const objectUrl = URL.createObjectURL(blob);
          a.href = objectUrl;
          a.download = file.nombreArchivo;
          a.click();
          URL.revokeObjectURL(objectUrl);
        }
      },
      error: (err) => {
        console.error(err);
        Swal.fire('Error', 'No se pudo descargar el archivo.', 'error');
      }
    });
  }

  previsualizarArchivo(file: any): void {
    this._engineeringService.descargarArchivoEjecucion(this.idSeguimiento, file.tipo, file.nombreArchivo).subscribe({
      next: (res) => {
        if (res && res.data) {
          const byteCharacters = atob(res.data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: res.contentType });
          const fileURL = URL.createObjectURL(blob);

          const isPdf = file.nombreArchivo.toLowerCase().endsWith('.pdf');

          this._dialog.open(ImagePreviewDialogComponent, {
            data: {
              url: fileURL,
              name: file.nombreArchivo,
              isPdf: isPdf
            }
          });
        }
      },
      error: (err) => {
        console.error(err);
        Swal.fire('Error', 'No se pudo previsualizar el archivo.', 'error');
      }
    });
  }

  eliminarArchivo(file: any): void {
    Swal.fire({
      title: '¿Eliminar archivo?',
      text: `¿Estás seguro de eliminar el archivo "${file.nombreArchivo}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-3xl p-6 shadow-2xl border-0',
        confirmButton: 'inline-flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all duration-300 mx-2 shadow-lg shadow-red-200',
        cancelButton: 'inline-flex items-center justify-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-bold rounded-xl transition-all duration-300 mx-2'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this._engineeringService.eliminarArchivoEjecucion(this.idSeguimiento, file.tipo, file.nombreArchivo).subscribe({
          next: () => {
            Swal.fire({
              title: '¡Eliminado!',
              text: 'El archivo ha sido eliminado.',
              icon: 'success',
              timer: 1500,
              showConfirmButton: false
            });
            this.loadFiles();
          },
          error: (err) => {
            console.error(err);
            Swal.fire('Error', 'No se pudo eliminar el archivo.', 'error');
          }
        });
      }
    });
  }

  // ==========================================
  // 📊 GANTT LOGIC
  // ==========================================
  loadGantt(): void {
    this._engineeringService.getGanttTareas(this.idSeguimiento).subscribe({
      next: (res) => {
        this.tasks = res || [];
        // Por defecto expandir las actividades cargadas
        this.tasks.forEach(t => t.expanded = t.expanded !== false);
        this.updatePredecesorasList();
        this.updateVisibleRows();
        this.adjustTimelineRange();
        
        // Centrar timeline tras carga de datos
        setTimeout(() => this.scrollToTarget(), 150);
        this._cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  updatePredecesorasList(): void {
    const list: any[] = [];
    this.tasks.forEach((t) => {
      if (t.actividades) {
        t.actividades.forEach((act) => {
          list.push(act);
        });
      }
    });
    this.predecesorasList = list;
  }

  updateVisibleRows(): void {
    const rows: any[] = [];
    this.tasks.forEach((t) => {
      rows.push({ type: 'task', task: t });
      if (t.expanded !== false) {
        t.expanded = true;
        if (t.actividades && t.actividades.length > 0) {
          t.actividades.forEach((act) => {
            rows.push({ type: 'activity', task: t, activity: act });
          });
        } else {
          rows.push({ type: 'placeholder', task: t });
        }
      }
    });
    this.visibleRows = rows;
    this._cdr.markForCheck();
  }

  toggleTask(task: SeguimientoEjecucionActividadMaestra): void {
    task.expanded = !task.expanded;
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

    this.days = eachDayOfInterval({
      start: this.startDate,
      end: this.endDate
    });

    this.timelineWidth = this.days.length * this.dayWidth;
    this.calculateTodayMarker();
  }

  adjustTimelineRange(): void {
    let allActivities: any[] = [];
    this.tasks.forEach((t) => {
      if (t.actividades) {
        t.actividades.forEach((act) => allActivities.push(act));
      }
      // También incluir la tarea maestra si tiene fechas
      if (t.fechaInicio) allActivities.push(t);
    });

    if (allActivities.length === 0) {
      this.initTimeline();
      return;
    }

    let minDate = new Date();
    let maxDate = new Date();

    allActivities.forEach((act) => {
      const start = new Date(act.fechaInicio);
      const end = new Date(act.fechaFin);
      if (start < minDate) minDate = start;
      if (end > maxDate) maxDate = end;
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
      const diff = differenceInDays(today, this.startDate);
      this.todayPosition = diff * this.dayWidth;
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

    let allActivities: any[] = [];
    this.tasks.forEach((t) => {
      if (t.actividades) t.actividades.forEach((a) => allActivities.push(a));
    });

    if (allActivities.length > 0) {
      const lastDate = allActivities.reduce((latest, act) => {
        const currentEnd = new Date(act.fechaFin);
        return currentEnd > latest ? currentEnd : latest;
      }, new Date(0));

      if (lastDate.getTime() > 0) {
        const diff = differenceInDays(startOfDay(lastDate), this.startDate);
        targetPos = (diff - 4) * this.dayWidth;
      }
    } else if (this.showTodayMarker) {
      targetPos = this.todayPosition;
    }

    element.scrollTo({
      left: Math.max(0, targetPos),
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

  // ==========================================
  // GANTT HELPERS
  // ==========================================
  getTaskDates(t: SeguimientoEjecucionActividadMaestra) {
    if (!t.actividades || t.actividades.length === 0) {
      return { start: new Date(t.fechaInicio), end: new Date(t.fechaFin) };
    }
    let minDate = new Date(t.actividades[0].fechaInicio);
    let maxDate = new Date(t.actividades[0].fechaFin);
    t.actividades.forEach((act) => {
      const start = new Date(act.fechaInicio);
      const end = new Date(act.fechaFin);
      if (start < minDate) minDate = start;
      if (end > maxDate) maxDate = end;
    });
    return { start: minDate, end: maxDate };
  }

  getDurationDays(row: any): number {
    let start: Date;
    let end: Date;
    if (row.type === 'task') {
      const dates = this.getTaskDates(row.task);
      start = dates.start;
      end = dates.end;
    } else {
      start = new Date(row.activity.fechaInicio);
      end = new Date(row.activity.fechaFin);
    }
    return differenceInDays(end, start) + 1;
  }

  getPredecesoraName(row: any): string {
    const pId = row.type === 'task' ? row.task.predecesoraId : row.activity.predecesoraId;
    if (!pId) return '-';
    
    if (row.type === 'task') {
      const pred = this.tasks.find((t) => Number(t.id) === Number(pId));
      return pred ? pred.nombre : `- (ID: ${pId})`;
    } else {
      const pred = this.predecesorasList.find((a) => Number(a.id) === Number(pId));
      return pred ? pred.nombre : `- (ID: ${pId})`;
    }
  }

  getPrioridadClass(row: any): string {
    const prio = row.type === 'task' ? row.task.prioridad : row.activity.prioridad;
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
    const est = row.type === 'task' ? row.task.estatus : row.activity.estatus;
    switch (est) {
      case 1: return 'Pendiente';
      case 2: return 'En Proceso';
      case 3: return 'Completado';
      default: return 'No definido';
    }
  }

  getEstatusClass(row: any): string {
    const est = row.type === 'task' ? row.task.estatus : row.activity.estatus;
    switch (est) {
      case 1: return 'text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-200';
      case 2: return 'text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-200';
      case 3: return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200';
      default: return 'text-slate-500 bg-slate-50 dark:bg-slate-500/10 border-slate-200';
    }
  }

  getColorHex(row: any): string {
    const colorName = row.type === 'task' ? row.task.color : row.activity.color;
    switch (colorName) {
      case 'Azul': return '#3b82f6';
      case 'Verde': return '#10b981';
      case 'Amarillo': return '#f59e0b';
      case 'Morado': return '#8b5cf6';
      case 'Naranja': return '#f97316';
      case 'Rosa': return '#ec4899';
      default: return row.type === 'task' ? '#3b82f6' : '#10b981';
    }
  }

  getBarStyles(row: any): any {
    let start: Date;
    let end: Date;
    if (row.type === 'task') {
      const dates = this.getTaskDates(row.task);
      start = startOfDay(dates.start);
      end = startOfDay(dates.end);
    } else {
      start = startOfDay(new Date(row.activity.fechaInicio));
      end = startOfDay(new Date(row.activity.fechaFin));
    }

    let leftDays = differenceInDays(start, this.startDate);
    let durationDays = differenceInDays(end, start) + 1;

    if (leftDays < 0) {
      durationDays += leftDays;
      leftDays = 0;
    }

    if (durationDays < 0.5) return { display: 'none' };

    const colorHex = this.getColorHex(row);

    return {
      'left': (leftDays * this.dayWidth) + 'px',
      'width': (durationDays * this.dayWidth) + 'px',
      'background-color': row.type === 'task' ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.95)',
      'border': `1.5px solid ${colorHex}`,
      'border-left-width': row.type === 'task' ? '4px' : '1.5px',
      'border-left-color': colorHex,
      'border-radius': row.type === 'task' ? '4px' : '8px'
    };
  }

  getRowTooltip(row: any): string {
    const name = row.type === 'task' ? row.task.nombre : row.activity.nombre;
    const prog = row.type === 'task' ? row.task.progreso : row.activity.progreso;
    const eq = row.type === 'task' ? row.task.equipoEspecial : row.activity.equipoEspecial;
    return `${name} (${prog}%)${eq ? ' - Equipo Especial: ' + eq : ''}`;
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
  // GANTT CRUD OPERATIONS
  // ==========================================
  openActividadDialog(type: 'maestra' | 'subactividad', parentTask?: SeguimientoEjecucionActividadMaestra, editItem?: any): void {
    const isEdit = !!editItem;
    const defaultStart = editItem?.fechaInicio || parentTask?.fechaInicio || new Date();
    const defaultEnd = editItem?.fechaFin || parentTask?.fechaFin || addDays(new Date(), 1);

    let predList: any[] = [];
    if (type === 'maestra') {
      predList = this.tasks.filter((t) => Number(t.id) !== Number(editItem?.id));
    } else {
      predList = this.predecesorasList.filter((a) => Number(a.id) !== Number(editItem?.id));
    }

    const dialogRef = this._dialog.open(ControlEjecucionActividadDialogComponent, {
      width: '500px',
      data: {
        type: type,
        isEdit: isEdit,
        actividad: isEdit ? { ...editItem } : {
          idSeguimiento: this.idSeguimiento,
          actividadMaestraId: parentTask?.id,
          fechaInicio: defaultStart,
          fechaFin: defaultEnd,
          estatus: 1,
          progreso: 0,
          color: type === 'maestra' ? 'Azul' : 'Verde'
        },
        userList: this.userList,
        predecesoras: predList
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (result.delete) {
          if (type === 'maestra') {
            this._engineeringService.deleteGanttMaestra(result.id).subscribe(() => this.loadGantt());
          } else {
            this._engineeringService.deleteGanttSubactividad(result.id).subscribe(() => this.loadGantt());
          }
          return;
        }

        result.idSeguimiento = this.idSeguimiento;
        if (type === 'maestra') {
          this._engineeringService.saveGanttMaestra(result).subscribe(() => this.loadGantt());
        } else {
          result.actividadMaestraId = parentTask?.id || result.actividadMaestraId;
          this._engineeringService.saveGanttSubactividad(result).subscribe(() => this.loadGantt());
        }
      }
    });
  }

  editRow(row: any): void {
    if (row.type === 'task') {
      this.openActividadDialog('maestra', null, row.task);
    } else {
      this.openActividadDialog('subactividad', row.task, row.activity);
    }
  }

  deleteRow(row: any): void {
    Swal.fire({
      title: '¿Eliminar registro?',
      text: row.type === 'task' 
        ? 'Esto eliminará la Actividad Maestra y todas sus Subactividades asociadas.' 
        : 'Esto eliminará la Subactividad del cronograma.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-3xl p-6 shadow-2xl border-0',
        confirmButton: 'inline-flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all duration-300 mx-2 shadow-lg shadow-red-200',
        cancelButton: 'inline-flex items-center justify-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-bold rounded-xl transition-all duration-300 mx-2'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        if (row.type === 'task') {
          this._engineeringService.deleteGanttMaestra(row.task.id).subscribe(() => {
            Swal.fire('Eliminado', 'La Actividad Maestra ha sido eliminada.', 'success');
            this.loadGantt();
          });
        } else {
          this._engineeringService.deleteGanttSubactividad(row.activity.id).subscribe(() => {
            Swal.fire('Eliminado', 'La Subactividad ha sido eliminada.', 'success');
            this.loadGantt();
          });
        }
      }
    });
  }

  getDependencyPath(row: any, currentIndex: number): string | null {
    if (row.type === 'placeholder') return null;
    const pId = row.type === 'task' ? Number(row.task.predecesoraId) : Number(row.activity.predecesoraId);
    if (!pId) return null;

    let predIndex = -1;
    if (row.type === 'task') {
      predIndex = this.visibleRows.findIndex(r => r.type === 'task' && Number(r.task.id) === pId);
    } else {
      predIndex = this.visibleRows.findIndex(r => r.type === 'activity' && Number(r.activity.id) === pId);
    }

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

  // ==========================================
  // 🔀 GANTT DRAG & DROP METHODS
  // ==========================================
  masterPredicate = (drag: CdkDrag): boolean => {
    return drag.data && drag.data.actividades !== undefined;
  };

  subPredicate = (drag: CdkDrag): boolean => {
    return drag.data && drag.data.actividadMaestraId !== undefined;
  };

  onMasterDropped(event: CdkDragDrop<SeguimientoEjecucionActividadMaestra[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(this.tasks, event.previousIndex, event.currentIndex);
      this.saveGanttPositions();
    }
  }

  onSubactivityDropped(event: CdkDragDrop<SeguimientoEjecucionSubactividad[]>, parentTask: SeguimientoEjecucionActividadMaestra): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(parentTask.actividades || [], event.previousIndex, event.currentIndex);
      this.saveGanttPositions();
    } else {
      const sub = event.item.data as SeguimientoEjecucionSubactividad;
      sub.actividadMaestraId = parentTask.id!;
      
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      this.saveGanttPositions();
    }
  }

  saveGanttPositions(): void {
    const updatePayload: any[] = [];

    this.tasks.forEach((task, tIdx) => {
      updatePayload.push({
        id: task.id,
        type: 'maestra',
        orden: tIdx
      });

      if (task.actividades) {
        task.actividades.forEach((sub, sIdx) => {
          updatePayload.push({
            id: sub.id,
            type: 'subactividad',
            orden: sIdx,
            actividadMaestraId: task.id
          });
        });
      }
    });

    this._engineeringService.reordenarGantt(updatePayload).subscribe({
      next: () => {
        this.loadGantt();
      },
      error: (err) => {
        console.error('Error al guardar posiciones del Gantt:', err);
        Swal.fire('Error', 'No se pudieron guardar las posiciones en el servidor.', 'error');
      }
    });
  }

  // ==========================================
  // GENERAL INFO SAVE
  // ==========================================
  saveGeneralInfo(): void {
    if (this.form.invalid) return;

    this.isSaving = true;
    const formVal = this.form.value;

    const payload = {
      ...this.ejecucion,
      ...formVal,
      fechaInicioProyecto: formVal.fechaInicioProyecto ? new Date(formVal.fechaInicioProyecto).toISOString() : null,
      fechaFinProyecto: formVal.fechaFinProyecto ? new Date(formVal.fechaFinProyecto).toISOString() : null
    };

    this._engineeringService.saveSeguimientoEjecucion(payload).subscribe({
      next: () => {
        this.isSaving = false;
        Swal.fire({
          title: '¡Guardado!',
          text: 'Información general actualizada.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        this.loadData();
      },
      error: (err) => {
        this.isSaving = false;
        console.error(err);
        Swal.fire('Error', 'No se pudo guardar la información.', 'error');
      }
    });
  }
}
