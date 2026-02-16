import { Component, OnInit, ViewChild, AfterViewInit, ChangeDetectorRef, OnDestroy } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { TaskService } from "../tasks.service";
import { Task } from "./../models/tasks.model";
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProjectService } from 'app/modules/admin/dashboards/project/project.service';
import { TaskViewConfigService, TaskViewConfig } from '../services/task-view-config.service';

import { TaskFormDialogComponent } from "./../task-form-dialog/task-form-dialog.component";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { MatSelectModule } from "@angular/material/select";
import Swal from "sweetalert2";
import { User } from "app/core/user/user.types";
import { UserService } from "app/core/user/user.service";
import { Subject, takeUntil, Subscription, fromEvent, merge, finalize } from "rxjs";
import moment from "moment";
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkDragDrop, moveItemInArray, transferArrayItem, DragDropModule, CdkDragHandle } from '@angular/cdk/drag-drop';
import Sortable from 'sortablejs';
import { TaskMediaDialogComponent } from "../task-media-dialog/task-media-dialog.component";
import { ResizeColumnDirective } from './resize-column.directive';
import { ResizableDirective, ResizeHandleDirective, ResizeEvent } from 'angular-resizable-element';
import { UsersService } from "app/modules/admin/security/users/users.service";
import { HighchartsChartModule } from 'highcharts-angular';
import * as Highcharts from 'highcharts';
import Gantt from 'frappe-gantt';

interface GroupedTasks {
    groupName: string;
    groupKey: string; // Internal key for tracking expanded state
    tasks: MatTableDataSource<Task>;
    count: number;
    color?: string; // Color for the header/badge
    displayedColumns: string[]; // Independent columns per group
}

@Component({
    selector: "app-task-list",
    templateUrl: "./tasks-list.component.html",
    styleUrls: ["./tasks-list.component.scss"],
    standalone: true,
    imports: [
        CommonModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatPaginatorModule,
        MatSortModule,
        MatFormFieldModule,
        MatInputModule,
        FormsModule,
        ReactiveFormsModule,
        MatMenuModule,
        MatSelectModule,
        MatCheckboxModule,
        MatTooltipModule,
        DragDropModule,
        MatDialogModule,
        MatSnackBarModule,
        MatNativeDateModule,
        MatDatepickerModule,
        TaskMediaDialogComponent,
        ResizeColumnDirective,
        ResizableDirective,
        ResizeHandleDirective,
        HighchartsChartModule
    ],
})
export class TaskListComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;

    allColumns: string[] = [
        'id',
        'nombre',
        'responsable',
        'asignados',
        'fechaInicioEstimada',
        'fechaFinEstimada',
        'estatus',
        'empresa',
        'ubicacion',
        'comentarios',
        'media',
        'acciones'
    ];
    displayedColumns: string[] = [];

    // Grouping
    groupedTasks: GroupedTasks[] = [];
    viewConfig: TaskViewConfig;

    // Data
    rawTasks: Task[] = [];

    // User Info
    user: User;

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    updateFlag: boolean;

    openMediaDialog(task: Task): void {
        const dialogRef = this.dialog.open(TaskMediaDialogComponent, {
            data: { task: { ...task } },
            width: '800px',
            autoFocus: false
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                // Update the task in the list if images were changed
                const index = this.rawTasks.findIndex(t => t.id === task.id);
                if (index > -1) {
                    this.rawTasks[index] = result;
                    this.processTasks();
                }
            }
        });
    }

    // Filters State
    filterValue: string = '';
    hideCompleted: boolean = false;

    // Nuevas variables de clase
    userMap = new Map<number, any>();
    userColors: { [key: string]: string } = {};
    private palette = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#00bcd4', '#009688', '#4caf50', '#ff9800'];
    userList: any[] = [];

    public Highcharts: typeof Highcharts = Highcharts;

    // Cambia el tipo a Highcharts.Options explícitamente
    public statusChartOptions: Highcharts.Options = {};
    public userChartOptions: Highcharts.Options = {};
    private gantt: any;

    /**
 * Estado de visibilidad del panel de métricas.
 */
    public isChartsExpanded: boolean = true;
    public viewMode: 'Day' | 'Week' | 'Month' = 'Day';

    constructor(
        private taskService: TaskService,
        public configService: TaskViewConfigService, // Public for usage in template
        private snackBar: MatSnackBar,
        private dialog: MatDialog,
        private _userService: UserService,
        private _cdr: ChangeDetectorRef,
        private usersService: UsersService,
        private projectService: ProjectService,
    ) { }

    ngOnInit(): void {
        this.loadConfig();
        this.initChartsExpansion();

        // 2. Cargamos usuarios primero para tener el Map listo
        this.getUsers();

        this._userService.user$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: User) => {
                this.user = user["usuario"];
            });

        this.loadTasks();
    }



    ngAfterViewInit(): void {
        this.initColumnSorting();
    }

    /**
     * Initializes SortableJS for column reordering
     */
    initColumnSorting(): void {
        // We use a small timeout to ensure the table headers are fully rendered in the DOM
        setTimeout(() => {
            const headerRows = document.querySelectorAll('.header-row-sortable');
            headerRows.forEach((row: HTMLElement) => {
                const groupKey = row.getAttribute('data-group');
                if (!groupKey) return;

                Sortable.create(row, {
                    animation: 150,
                    ghostClass: 'cdk-drag-placeholder',
                    handle: '.column-drag-handle', // Only drag via handle
                    filter: '.resizer', // Ignore resizing handles
                    onEnd: (evt) => {
                        if (evt.oldIndex !== undefined && evt.newIndex !== undefined && evt.oldIndex !== evt.newIndex) {
                            // Find the group related to this header row
                            const group = this.groupedTasks.find(g => g.groupKey === groupKey);
                            if (group) {
                                // Column reordered for THIS specific group!
                                moveItemInArray(group.displayedColumns, evt.oldIndex, evt.newIndex);

                                // Re-assign to trigger Angular change detection
                                group.displayedColumns = [...group.displayedColumns];

                                // Save to localStorage (per group)
                                this.configService.updateGroupColumns(groupKey, group.displayedColumns);

                                // Force view refresh
                                this._cdr.detectChanges();

                                // CRITICAL: Re-initialize Sortable for the new DOM elements
                                this.initColumnSorting();
                            }
                        }
                    }
                });
            });
        }, 500);
    }

    loadConfig(): void {
        this.viewConfig = this.configService.getConfig();

        // 1. Limpiar rastro de 'actions' y asegurar nuevas columnas en la config guardada
        if (this.viewConfig.visibleColumns) {
            this.viewConfig.visibleColumns = this.viewConfig.visibleColumns.map(col => col === 'actions' ? 'acciones' : col);

            if (!this.viewConfig.visibleColumns.includes('responsable')) {
                const idx = this.viewConfig.visibleColumns.indexOf('nombre');
                this.viewConfig.visibleColumns.splice(idx + 1, 0, 'responsable', 'asignados');
            }
        }

        // 2. Aplicar anchos por defecto
        this.viewConfig.columnWidths = {
            'responsable': '100px',
            'asignados': '120px',
            'empresa': '150px',
            'ubicacion': '150px',
            ...this.configService.DEFAULT_CONFIG.columnWidths,
            ...this.viewConfig.columnWidths
        };

        // 3. Restaurar columnas visibles
        this.displayedColumns = [...this.viewConfig.visibleColumns];

        // 4. Migración recursiva para grupos (Aquí es donde solía esconderse el error 'actions')
        if (this.viewConfig.groupColumns) {
            Object.keys(this.viewConfig.groupColumns).forEach(key => {
                let cols = this.viewConfig.groupColumns[key].map(c => c === 'actions' ? 'acciones' : c);

                if (!cols.includes('responsable')) {
                    const nIdx = cols.indexOf('nombre');
                    cols.splice(nIdx + 1, 0, 'responsable', 'asignados');
                }

                // Garantizar columnas mínimas
                if (!cols.includes('acciones')) cols.push('acciones');
                if (!cols.includes('nombre')) cols.unshift('nombre');

                this.viewConfig.groupColumns[key] = [...cols];
            });
        }

        // 5. Garantía final para el global
        if (!this.displayedColumns.includes('acciones')) this.displayedColumns.push('acciones');
        if (!this.displayedColumns.includes('nombre')) this.displayedColumns.unshift('nombre');

        this.filterValue = this.viewConfig.filters['search'] || '';
        this.hideCompleted = this.viewConfig.filters['hideCompleted'] === true;
    }

    loadTasks(): void {
        this.taskService.getTasks(Number(this.user.id)).subscribe({
            next: (tasks) => {
                this.rawTasks = tasks;
                this.processTasks();
            },
            error: () => {
                this.snackBar.open("Error al cargar tareas", "Cerrar", { duration: 3000 });
            }
        });
    }

    /**
     * Process tasks: Apply filters -> Group tasks -> Create DataSources
     */
    processTasks(): void {
        let tasks = [...this.rawTasks];

        // 1. Apply Search Filter
        if (this.filterValue) {
            const filter = this.filterValue.toLowerCase();
            tasks = tasks.filter(task =>
                task.nombre.toLowerCase().includes(filter) ||
                task.comentarios?.toLowerCase().includes(filter) ||
                task.id?.toString().includes(filter) ||
                this.getStatusName(task.estatus).toLowerCase().includes(filter)
            );
        }

        // 2. Apply "Hide Completed" Filter
        if (this.hideCompleted) {
            tasks = tasks.filter(t => t.estatus !== 3);
        }

        // 3. Remove "Detenido" (Status 4) completely as requested
        tasks = tasks.filter(t => t.estatus !== 4);

        // 4. Grouping Logic
        if (this.viewConfig.groupBy === 'estatus') {
            this.groupTasksByStatus(tasks);
        } else {
            const groupKey = 'all';
            // Filter the saved group columns to only include those that are currently visible globally
            const groupColumns = (this.viewConfig.groupColumns?.[groupKey] || [...this.displayedColumns])
                .filter(col => this.displayedColumns.includes(col));

            this.groupedTasks = [{
                groupName: 'Todas las Tareas',
                groupKey: groupKey,
                tasks: new MatTableDataSource(tasks),
                count: tasks.length,
                color: 'gray',
                displayedColumns: groupColumns
            }];
        }

        // 5. Re-initialize column sorting for the newly rendered tables
        this.initHighcharts(this.groupedTasks);
        this.initGanttChart(tasks);
        this.initColumnSorting();
    }

    groupTasksByStatus(tasks: Task[]): void {
        const statuses = [
            { id: 1, name: 'Pendiente', color: 'border-l-4 border-yellow-500' },
            { id: 2, name: 'En Proceso', color: 'border-l-4 border-orange-500' },
            { id: 3, name: 'Completada', color: 'border-l-4 border-green-500' }
        ];

        this.groupedTasks = [];

        statuses.forEach(status => {
            if (this.hideCompleted && status.id === 3) return;
            const groupTasks = tasks.filter(t => t.estatus === status.id);
            const groupKey = `status-${status.id}`;

            if (this.filterValue && groupTasks.length === 0) return;

            // Recuperar columnas del grupo y filtrar para que solo existan las reales
            const groupColumns = (this.viewConfig.groupColumns?.[groupKey] || [...this.displayedColumns])
                .filter(col => this.allColumns.includes(col));

            this.groupedTasks.push({
                groupName: status.name,
                groupKey: groupKey,
                tasks: new MatTableDataSource(groupTasks),
                count: groupTasks.length,
                color: status.color,
                displayedColumns: groupColumns
            });
        });
    }

    // Toggle Group Expansion
    isGroupExpanded(groupKey: string): boolean {
        // Default to true if not set
        return this.viewConfig.expandedGroups[groupKey] !== false;
    }

    toggleGroup(groupKey: string): void {
        const currentMetadata = this.isGroupExpanded(groupKey);
        this.configService.updateExpandedGroup(groupKey, !currentMetadata);
        // Force change detection is handled by Angular usually, but we are reading from service on render
        this.viewConfig = this.configService.getConfig(); // Refresh local config
    }

    // Column Drag & Drop
    onColumnDrop(event: CdkDragDrop<string[]>): void {
        const previousIndex = this.displayedColumns.indexOf(event.item.data);
        const currentIndex = event.currentIndex;

        if (previousIndex === currentIndex || previousIndex === -1) return;

        // 1. Move the item in the local array
        moveItemInArray(this.displayedColumns, previousIndex, currentIndex);

        // 2. Create a new reference to trigger change detection across all *matHeaderRowDef and *matRowDef
        this.displayedColumns = [...this.displayedColumns];

        // 3. Save to localStorage
        this.configService.updateVisibleColumns(this.displayedColumns);

        // 4. Force a manual change detection check for consistency
        this._cdr.detectChanges();
    }

    // Columns Management
    isColumnVisible(column: string, groupKey?: string): boolean {
        if (groupKey) {
            const group = this.groupedTasks.find(g => g.groupKey === groupKey);
            return group ? group.displayedColumns.includes(column) : false;
        }
        return this.displayedColumns.includes(column);
    }

    toggleColumn(column: string, groupKey?: string): void {
        if (groupKey) {
            const group = this.groupedTasks.find(g => g.groupKey === groupKey);
            if (!group) return;

            const index = group.displayedColumns.indexOf(column);
            if (index > -1) {
                // Remove column (Visibility Off) - keep 'nombre' and 'acciones' as required
                if (column !== 'nombre' && column !== 'acciones') {
                    group.displayedColumns.splice(index, 1);
                }
            } else {
                // Add column (Visibility On)
                const accionesIndex = group.displayedColumns.indexOf('acciones');
                if (accionesIndex > -1) {
                    group.displayedColumns.splice(accionesIndex, 0, column);
                } else {
                    group.displayedColumns.push(column);
                }
            }

            group.displayedColumns = [...group.displayedColumns];
            this.configService.updateGroupColumns(groupKey, group.displayedColumns);
            this._cdr.detectChanges();
            this.initColumnSorting();
        } else {
            // Global toggle logic
            const index = this.displayedColumns.indexOf(column);
            if (index > -1) {
                if (column !== 'nombre' && column !== 'acciones') this.displayedColumns.splice(index, 1);
            } else {
                const accionesIndex = this.displayedColumns.indexOf('acciones');
                if (accionesIndex > -1) {
                    this.displayedColumns.splice(accionesIndex, 0, column);
                } else {
                    this.displayedColumns.push(column);
                }
            }
            this.displayedColumns = [...this.displayedColumns];
            this.configService.updateVisibleColumns(this.displayedColumns);

            this.processTasks();
        }
        this._cdr.detectChanges();
    }

    getAvailableColumns(groupKey?: string): string[] {
        return this.allColumns.filter(col => !this.isColumnVisible(col, groupKey) && col !== 'acciones');
    }

    addColumn(column: string, groupKey?: string): void {
        this.toggleColumn(column, groupKey);
    }

    isFirstColumn(column: string, groupKey: string): boolean {
        const group = this.groupedTasks.find(g => g.groupKey === groupKey);
        if (!group || group.displayedColumns.length === 0) return false;
        return group.displayedColumns[0] === column;
    }

    // Row Drag & Drop
    /**
 * Gestiona el evento de soltar una fila y actualiza las gráficas.
 * @param {CdkDragDrop<Task[]>} event - Evento de arrastre de Angular CDK.
 * @param {string} targetGroupKey - Identificador del grupo donde cayó la tarea.
 * @returns {void}
 */
    onRowDropped(event: CdkDragDrop<Task[]>, targetGroupKey: string): void {
        if (event.previousContainer === event.container) {
            // 1. Mover el ítem en el array de datos
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);

            // 2. Persistir el nuevo orden
            const taskIds = event.container.data.map(t => t.id).filter(id => id !== undefined) as number[];
            this.configService.updateGroupTaskOrder(targetGroupKey, taskIds);

            const group = this.groupedTasks.find(g => g.groupKey === targetGroupKey);
            if (group) {
                group.tasks.data = [...event.container.data];
            }
            this.initGanttChart(this.rawTasks);
        } else {
            const task = event.item.data as Task;
            const newStatusId = this.parseStatusIdFromGroupKey(targetGroupKey);

            if (task && newStatusId !== undefined && task.id) {
                const oldStatus = task.estatus;
                task.estatus = newStatusId;

                transferArrayItem(
                    event.previousContainer.data,
                    event.container.data,
                    event.previousIndex,
                    event.currentIndex
                );

                this.refreshTableDataSources();
                this.saveAllGroupOrders();

                this.taskService.updateTask(task.id, task).subscribe({
                    next: () => {
                        this.snackBar.open(`Tarea movida`, "Cerrar", { duration: 2000 });

                        // ACTUALIZACIÓN DE GRÁFICAS: 
                        // Se llama aquí porque el cambio de estatus afecta el pastel y la carga de usuario
                        this.initHighcharts(this.groupedTasks);
                        this.initGanttChart(this.rawTasks);
                        this.updateFlag = true;
                    },
                    error: () => {
                        task.estatus = oldStatus;
                        this.loadTasks();
                    }
                });
            }
        }
    }

    /**
     * Fuerza la actualización de todos los DataSources de las tablas.
     * @returns void
     */
    private refreshTableDataSources(): void {
        this.groupedTasks.forEach(group => {
            // Al asignar un nuevo spread array, el MatTableDataSource dispara el renderizado
            group.tasks.data = [...group.tasks.data];
        });
    }

    // Inline Status Update
    updateTaskStatus(task: Task, newStatusId: number): void {
        if (task.estatus === newStatusId) return;

        const oldStatus = task.estatus;
        task.estatus = newStatusId;

        this.taskService.updateTask(task.id!, task).subscribe({
            next: () => {
                this.snackBar.open(`Estatus actualizado a ${this.getStatusName(newStatusId)}`, "Cerrar", {
                    duration: 2000,
                    panelClass: ['success-snackbar']
                });
                this.loadTasks(); // Refresh to regroup
            },
            error: () => {
                task.estatus = oldStatus;
                Swal.fire('Error', 'No se pudo actualizar el estatus.', 'error');
            }
        });
    }

    private saveAllGroupOrders(): void {
        this.groupedTasks.forEach(group => {
            const ids = group.tasks.data.map(t => t.id).filter(id => id !== undefined) as number[];
            this.configService.updateGroupTaskOrder(group.groupKey, ids);
        });
    }

    private parseStatusIdFromGroupKey(groupKey: string): number | undefined {
        if (groupKey.startsWith('status-')) {
            return parseInt(groupKey.replace('status-', ''), 10);
        }
        return undefined;
    }

    // Filter Updates
    updateFilterValue(value: string): void {
        this.filterValue = value;
        this.configService.updateFilter('search', value);
        this.processTasks();
    }

    toggleHideCompleted(): void {
        this.hideCompleted = !this.hideCompleted;
        this.configService.updateFilter('hideCompleted', this.hideCompleted);
        this.processTasks();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    /**
 * Actualiza el ancho de una columna tras finalizar el arrastre.
 * @param event - Objeto de evento que contiene las nuevas dimensiones (ResizeEvent).
 * @param columnId - El identificador único de la columna (string).
 */
    onColumnResizeEnd(event: ResizeEvent, columnId: string): void {
        if (event.rectangle.width) {
            const newWidth = `${Math.round(event.rectangle.width)}px`;

            // 1. Actualizamos creando una nueva referencia del objeto (Inmutabilidad)
            // Esto es lo que soluciona que la columna "se quede pegada"
            this.viewConfig.columnWidths = {
                ...this.viewConfig.columnWidths,
                [columnId]: newWidth
            };

            // 2. Persistencia en el servicio
            this.configService.updateColumnWidth(columnId, newWidth);

            // 3. Forzamos detección de cambios para asegurar el repintado inmediato
            this._cdr.detectChanges();
        }
    }

    getColumnWidth(columnId: string): any {
        const width = this.viewConfig?.columnWidths?.[columnId];

        const safeWidth = width && width !== 'auto' ? (parseInt(width) < 70 ? '70px' : width) : 'auto';

        if (safeWidth === 'auto') {
            return {
                'position': 'relative',
                'overflow': 'visible',
                'box-sizing': 'border-box',
                'min-width': '70px'
            };
        }

        return {
            'width': safeWidth,
            'min-width': safeWidth,
            'max-width': safeWidth,
            'flex': 'none',
            'position': 'relative',
            'overflow': 'visible',
            'box-sizing': 'border-box'
        };
    }
    getZIndex(columnId: string, groupKey: string): number {
        const group = this.groupedTasks.find(g => g.groupKey === groupKey);
        if (!group) return 1;
        const index = group.displayedColumns.indexOf(columnId);
        return 100 - (index === -1 ? 0 : index);
    }

    resetLayout(): void {
        Swal.fire({
            title: '¿Restablecer diseño?',
            text: 'Se volverá a la configuración de columnas y anchos original.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, restablecer',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.configService.resetConfig();
                this.loadConfig();
                this.applyFilter();
                this.snackBar.open('Diseño restablecido', 'Cerrar', { duration: 2000 });
            }
        });
    }

    // --- Actions ---

    openTaskDialog(taskId?: number, readOnly: boolean = false): void {
        const dialogRef = this.dialog.open(TaskFormDialogComponent, {
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            panelClass: 'task-dialog',
            data: taskId ? { id: taskId, readOnly } : null
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result === 'refresh') {
                this.loadTasks();
                this.snackBar.open(
                    taskId ? 'Tarea actualizada correctamente' : 'Tarea agregada exitosamente',
                    'Cerrar',
                    { duration: 3000 }
                );
            }
        });
    }

    deleteTask(id: number): void {
        Swal.fire({
            title: '¿Estás seguro?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.taskService.deleteTask(id).subscribe(() => {
                    this.loadTasks();
                    this.snackBar.open('Tarea eliminada correctamente', 'Cerrar', { duration: 3000 });
                });
            }
        });
    }

    applyFilter(): void {
        // Legacy name kept for compatibility if needed, but logic moved to explicit updateFilterValue
        this.processTasks();
    }

    getStatusName(status: number): string {
        switch (status) {
            case 1: return 'Pendiente';
            case 2: return 'En proceso';
            case 3: return 'Completada';
            default: return 'Otro';
        }
    }

    getClassByStatus(status: number): string {
        switch (status) {
            case 1: return 'bg-gray-50';
            case 2: return 'bg-orange-50';
            case 3: return 'bg-green-50';
            default: return '';
        }
    }

    /**
     * 🔹 MÉTODO FALTANTE 1: Color de fondo para la cabecera (suave)
     */
    getStatusBGColor(groupKey: string): string {
        if (groupKey.includes('1')) return 'rgba(251, 39, 93, 0.09)';
        if (groupKey.includes('2')) return 'rgba(255, 203, 0, 0.09)';
        if (groupKey.includes('3')) return 'rgba(0, 200, 117, 0.09)';
        return 'rgba(241, 245, 249, 1)';
    }

    /**
     * 🔹 MÉTODO FALTANTE 2: Color de fondo para las celdas de la tabla (ultra suave)
     */
    getTableFillColor(groupKey: string): string {
        if (groupKey.includes('1')) return 'rgba(251, 39, 93, 0.04)';
        if (groupKey.includes('2')) return 'rgba(255, 203, 0, 0.04)';
        if (groupKey.includes('3')) return 'rgba(0, 200, 117, 0.04)';
        return 'transparent';
    }

    /**
     * Color sólido para el contorno del grupo
     */
    getStatusColor(groupKey: string): string {
        if (groupKey.includes('1')) return '#D9534F';
        if (groupKey.includes('2')) return '#F0AD4E';
        if (groupKey.includes('3')) return '#5CB85C';
        return '#94A3B8';
    }
    onResizeEnd(event: ResizeEvent): void {
    }


    /**
 * Retorna el color sólido según el ID del estatus de la tarea
 */
    getColorByEstatusId(estatusId: number): string {
        if (estatusId === 1) return '#FB275D'; // Rojo (Pendiente)
        if (estatusId === 2) return '#FFCB00'; // Amarillo (En Proceso)
        if (estatusId === 3) return '#00C875'; // Verde (Completada)
        return '#C4C4C4';
    }

    /**
     * Retorna el fondo sutil según el ID del estatus (aprox 6% opacidad)
     */
    getFillColorByEstatusId(estatusId: number): string {
        const color = this.getColorByEstatusId(estatusId);
        return color + '10'; // 10 en Hex es aprox 6% de opacidad
    }
    /**
     * Procesa el evento de redimensionamiento nativo.
     * @param event - Contiene el width final en px y el ID de la columna.
     */
    onNativeResize(event: { width: number, columnId: string }): void {
        const newWidth = `${event.width}px`;

        // Actualizamos con inmutabilidad para que ngStyle reaccione
        this.viewConfig.columnWidths = {
            ...this.viewConfig.columnWidths,
            [event.columnId]: newWidth
        };

        // Guardamos en el servicio
        this.configService.updateColumnWidth(event.columnId, newWidth);

        // Forzamos detección de cambios
        this._cdr.detectChanges();
    }

    /**
     * Busca un usuario en la lista local por su ID.
     * @param userId - ID del usuario a buscar.
     * @returns El objeto usuario o undefined.
     */
    getUserById(userId: number | string): any {
        return this.userList.find(u => u.id === Number(userId));
    }

    getUserInitialsById(userId: number | string): string {
        const user = this.getUserData(userId);
        if (!user) return '?';
        const name = (user.nombre || user.name || '').trim();
        const names = name.split(/\s+/);
        return names.length >= 2
            ? (names[0][0] + names[1][0]).toUpperCase()
            : names[0][0]?.toUpperCase() || '?';
    }

    getUsers(): void {
        this.usersService.getUsers().subscribe(users => {
            this.userList = users.filter(u => u.activo !== false);
            this.userMap.clear();

            this.userList.forEach(u => {
                // Usamos usuarioId según tu JSON de usuarios
                const id = Number(u.usuarioId || u.id);
                const name = u.nombreUsuario || u.nombre || 'Usuario';
                this.userMap.set(id, u);

                // Generar color de respaldo basado en el nombre
                if (!this.userColors[name]) {
                    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
                    const colorIdx = Math.abs(hash) % this.palette.length;
                    this.userColors[name] = this.palette[colorIdx];
                }
            });
            this.processTasks(); // Refrescar para vincular avatares
            this._cdr.detectChanges();
        });
    }

    getUserData(userId: number | string): any {
        return this.userMap.get(Number(userId));
    }

    getUserInitials(name: string): string {
        if (!name) return '?';
        const names = name.trim().split(/\s+/);
        if (names.length >= 2) {
            return (names[0][0] + names[1][0]).toUpperCase();
        }
        return names[0][0] ? names[0][0].toUpperCase() : '?';
    }

    getUserFullName(userId: number | string): string {
        const user = this.getUserData(userId);
        return user ? (user.nombreUsuario || user.nombre) : 'No asignado';
    }

    getUserColor(userId: number | string): string {
        const user = this.getUserData(userId);
        if (!user) return '#cbd5e0';
        return this.userColors[user.nombreUsuario || user.nombre] || '#64748b';
    }


    /**
 * Procesa la lista de tareas agrupadas para generar los datos de las gráficas.
 * @param {any[]} groups - El arreglo de tareas agrupadas (groupedTasks).
 * @returns {Object} Un objeto con los datos formateados para las gráficas de Estatus y Usuarios.
 */
    getChartsData(groups: any[]): { statusSeries: number[], statusLabels: string[], userSeries: any[] } {
        const statusCounts = { 'Pendiente': 0, 'En Proceso': 0, 'Completada': 0 };
        const userMap = new Map<string, number>();

        groups.forEach(group => {
            // 1. Datos para Estatus (Pie Chart)
            if (group.groupKey.includes('1')) statusCounts['Pendiente'] += group.count;
            if (group.groupKey.includes('2')) statusCounts['En Proceso'] += group.count;
            if (group.groupKey.includes('3')) statusCounts['Completada'] += group.count;

            // 2. Datos por Usuario (Bar Chart)
            group.tasks.data.forEach((task: any) => {
                const userName = this.getUserFullName(task.creadorId) || 'Sin Asignar';
                userMap.set(userName, (userMap.get(userName) || 0) + 1);
            });
        });

        return {
            statusSeries: Object.values(statusCounts),
            statusLabels: Object.keys(statusCounts),
            userSeries: Array.from(userMap, ([name, value]) => ({ x: name, y: value }))
        };
    }

    /**
     * Inicializa las gráficas extrayendo los datos reales de los DataSources.
     * @param {any[]} groups - Array de grupos con MatTableDataSource.
     * @returns {void}
     */
    initHighcharts(groups: any[]): void {
        if (!groups || groups.length === 0) return;

        const statusColors = ['#94A3B8', '#F59E0B', '#10B981'];

        const getSafeCount = (statusKey: string) => {
            const group = groups.find(g => g.groupKey === `status-${statusKey}`);
            return group ? group.tasks.filteredData.length : 0;
        };

        this.statusChartOptions = {
            chart: { type: 'pie', height: 200, backgroundColor: 'transparent' },
            title: { text: '' },
            credits: { enabled: false },
            plotOptions: {
                pie: {
                    innerSize: '65%',
                    borderWidth: 0,
                    showInLegend: true,
                    dataLabels: {
                        enabled: true,
                        format: '<b>{point.percentage:.1f}%</b>', // Muestra el porcentaje
                        distance: null, // Lo coloca dentro de las rebanadas
                        style: {
                            fontSize: '10px',
                            textOutline: 'none',
                            color: '#000000'
                        }
                    }
                }
            },
            series: [{
                type: 'pie',
                name: 'Tareas',
                data: [
                    { name: 'Pendientes', y: getSafeCount('1'), color: statusColors[0] },
                    { name: 'En Proceso', y: getSafeCount('2'), color: statusColors[1] },
                    { name: 'Completadas', y: getSafeCount('3'), color: statusColors[2] }
                ]
            }]
        } as Highcharts.Options;

        this.userChartOptions = {
            chart: { type: 'column', height: 200, backgroundColor: 'transparent' },
            title: { text: '' },
            credits: { enabled: false },
            xAxis: { type: 'category' },
            yAxis: { min: 0, title: { text: '' }, gridLineDashStyle: 'Dash' },
            plotOptions: {
                column: {
                    dataLabels: {
                        enabled: true, // Muestra el número arriba de la barra
                        format: '{point.y}',
                        style: {
                            fontSize: '11px',
                            fontWeight: 'bold'
                        }
                    }
                }
            },
            series: [{
                type: 'column',
                name: 'Tareas',
                color: '#6366F1',
                data: this.getTasksByUser(groups)
            }]
        } as Highcharts.Options;

        this.updateFlag = true;
    }

    /**
 * Mapea las tareas extrayendo el nombre real del usuario en lugar del ID.
 * @param {any[]} groups - Colección de grupos que contienen los MatTableDataSource.
 * @returns {any[]} Un array de arreglos con formato [NombreUsuario, Conteo] para Highcharts.
 */
    private getTasksByUser(groups: any[]): any[] {
        const userMap = new Map<string, number>();

        groups.forEach(group => {
            // Accedemos al array de datos real dentro del MatTableDataSource
            const rawTasks = group.tasks.filteredData || [];

            rawTasks.forEach((task: any) => {
                // Utilizamos tu función existente para obtener el nombre
                // Si no devuelve nada, usamos 'Desconocido' o el ID como respaldo
                const userName = this.getUserFullName(task.creadorId) || `Usuario ${task.creadorId}`;

                const currentCount = userMap.get(userName) || 0;
                userMap.set(userName, currentCount + 1);
            });
        });

        // Retornamos el formato que Highcharts requiere para series de tipo 'column'
        return Array.from(userMap, ([name, count]) => [name, count]);
    }

    /**
     * Inicializa el Diagrama de Gantt usando Frappe Gantt (Librería Gratuita)
     */
    initGanttChart(tasks: Task[]): void {
        setTimeout(() => {
            // 1. Mapeo inicial y filtrado de tareas sin nombre (evita errores internos de la librería)
            let ganttTasks = tasks
                .filter(t => t.nombre)
                .map(task => {
                    // Asegurar fechas válidas
                    const start = task.fechaInicioEstimada ? moment(task.fechaInicioEstimada).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');
                    const end = task.fechaFinEstimada ? moment(task.fechaFinEstimada).format('YYYY-MM-DD') : moment(start).add(1, 'days').format('YYYY-MM-DD');

                    // Clase CSS según estatus
                    let customClass = 'gantt-pending';
                    if (task.estatus === 2) customClass = 'gantt-progress';
                    if (task.estatus === 3) customClass = 'gantt-completed';

                    return {
                        id: task.id?.toString() || Math.random().toString(),
                        name: task.nombre,
                        start: start,
                        end: end,
                        progress: task.estatus === 3 ? 100 : (task.estatus === 2 ? 50 : 0),
                        custom_class: customClass,
                        dependencies: task.dependencies || ''
                    };
                });

            // 2. IMPORTANTE: Filtrar dependencias que no existen en el set de tareas actual
            // Frappe Gantt arroja TypeError si una dependencia apunta a un ID no presente.
            const taskIds = new Set(ganttTasks.map(t => t.id));
            ganttTasks = ganttTasks.map(t => {
                if (t.dependencies) {
                    const validDeps = t.dependencies.split(',')
                        .map(dep => dep.trim())
                        .filter(depId => depId && taskIds.has(depId))
                        .join(',');
                    return { ...t, dependencies: validDeps };
                }
                return t;
            });

            // Limpiar contenedor previo si existe
            const container = document.getElementById('gantt-container');
            if (container) container.innerHTML = '';

            if (ganttTasks.length > 0 && container) {
                this.gantt = new Gantt("#gantt-container", ganttTasks, {
                    view_mode: this.viewMode,
                    language: 'es',
                    custom_popup_html: (task: any) => {
                        const t = tasks.find(x => x.id?.toString() === task.id);

                        // Generar HTML de avatares
                        let avatarsHtml = '';
                        if (t?.usuarioIds && t.usuarioIds.length > 0) {
                            avatarsHtml = `
                                <div class="flex items-center -space-x-2 mb-3">
                                    ${t.usuarioIds.map(id => {
                                const userData = this.getUserData(id);
                                if (userData?.avatar) {
                                    return `<img src="${userData.avatar}" class="w-7 h-7 rounded-full border-2 border-white shadow-sm object-cover" title="${this.getUserFullName(id)}">`;
                                } else {
                                    const initials = this.getUserInitials(userData?.nombreUsuario || userData?.nombre || '?');
                                    const color = this.getUserColor(id);
                                    return `<div class="w-7 h-7 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white text-[8px] font-bold" style="background-color: ${color}" title="${this.getUserFullName(id)}">${initials}</div>`;
                                }
                            }).join('')}
                                </div>
                            `;
                        }

                        const responsablesTxt = t?.usuarioIds?.map(id => this.getUserFullName(id)).join(', ') || 'N/A';

                        return `
                        <div class="p-3 bg-white shadow-xl rounded-lg border border-gray-100 min-w-[220px]">
                            <div class="flex items-center justify-between mb-2">
                                <div class="text-[9px] font-black text-blue-600 uppercase tracking-tighter">Tarea #${task.id}</div>
                                <div class="text-[9px] font-bold text-gray-400 uppercase">${moment(task.start).format('DD MMM')} - ${moment(task.end).format('DD MMM')}</div>
                            </div>
                            <div class="text-sm font-bold text-gray-800 mb-3 leading-tight">${task.name}</div>
                            
                            <div class="text-[9px] text-gray-400 uppercase font-bold mb-1.5 tracking-widest">Responsables:</div>
                            ${avatarsHtml}
                            
                            <div class="flex items-center justify-between text-[10px] border-t pt-2 mt-1">
                                <span class="text-gray-400 font-medium">Estado de avance:</span>
                                <span class="font-bold text-gray-700">${task.progress}%</span>
                            </div>
                            <div class="w-full bg-gray-100 h-1 rounded-full mt-1 overflow-hidden">
                                <div class="h-full bg-blue-500" style="width: ${task.progress}%"></div>
                            </div>
                        </div>
                    `;
                    }
                } as any);
            }
        }, 0);
    }

    changeGanttView(mode: 'Day' | 'Week' | 'Month'): void {
        if (this.gantt) {
            this.gantt.change_view_mode(mode);
            this.viewMode = mode;
        }
    }

    enviarNotificacionTarea(): void {
        const recipients = this.prepareNotificationRecipients();
        if (recipients.length === 0) {
            this.snackBar.open("No hay destinatarios válidos con tareas", "Cerrar", { duration: 3000 });
            return;
        }

        const payload = {
            proyectoId: 0, // Dashboard Global
            asunto: `Actualización de Tareas Globales`,
            mensaje: `Tienes tareas pendientes o actualizadas en el sistema.`,
            destinatarios: recipients
        };

        this.projectService.enviarNotificacionTarea(payload).subscribe({
            next: () => this.snackBar.open('Notificación enviada correctamente', 'Cerrar', { duration: 3000 }),
            error: () => this.snackBar.open('Error al enviar la notificación', 'Cerrar', { duration: 3000 })
        });
    }

    private prepareNotificationRecipients(): any[] {
        const userMap = new Map<number, { nombre: string, correo: string, tareas: string[] }>();

        this.rawTasks.forEach(task => {
            task.usuarioIds?.forEach(id => {
                const userData = this.getUserData(id);
                if (userData && (userData.correo || userData.email || userData.correoElectronico)) {
                    if (!userMap.has(id)) {
                        userMap.set(id, {
                            nombre: userData.nombreUsuario || userData.nombre,
                            correo: userData.correo || userData.email || userData.correoElectronico,
                            tareas: []
                        });
                    }
                    userMap.get(id).tareas.push(task.nombre);
                }
            });
        });

        return Array.from(userMap.values()).map(u => ({
            rol: 'Integrante',
            nombre: u.nombre,
            correo: u.correo,
            nombreNotificacion: u.tareas.join(', ')
        }));
    }

    /**
     * Inicializa la configuración guardada del panel.
     * Se debe llamar en el ngOnInit.
     */
    private initChartsExpansion(): void {
        const savedState = localStorage.getItem('charts_expanded');
        // Si existe una configuración guardada, la usamos; si no, por defecto es true.
        this.isChartsExpanded = savedState !== null ? JSON.parse(savedState) : true;
    }

    /**
     * Alterna la visibilidad del panel y guarda la preferencia en el storage.
     */
    toggleChartsExpansion(): void {
        this.isChartsExpanded = !this.isChartsExpanded;
        localStorage.setItem('charts_expanded', JSON.stringify(this.isChartsExpanded));

        // Al expandir, Highcharts necesita un pequeño empujón para recalcular su ancho
        if (this.isChartsExpanded) {
            setTimeout(() => { this.updateFlag = true; }, 100);
        }
    }
}
