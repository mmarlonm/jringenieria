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
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkDragDrop, moveItemInArray, transferArrayItem, DragDropModule, CdkDragHandle } from '@angular/cdk/drag-drop';
import Sortable from 'sortablejs';
import { TaskMediaDialogComponent } from "../task-media-dialog/task-media-dialog.component";
import { ResizeColumnDirective } from './resize-column.directive';
import { ResizableDirective, ResizeHandleDirective, ResizeEvent } from 'angular-resizable-element';

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
        ResizeHandleDirective
    ],
})
export class TaskListComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;

    allColumns: string[] = ['id', 'nombre', 'fechaInicioEstimada', 'fechaFinEstimada', 'estatus', 'comentarios', 'media', 'acciones'];
    displayedColumns: string[] = [];

    // Grouping
    groupedTasks: GroupedTasks[] = [];
    viewConfig: TaskViewConfig;

    // Data
    rawTasks: Task[] = [];

    // User Info
    user: User;

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    openMediaDialog(task: Task): void {
        console.log('Opening Media Dialog for task:', task);
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

    constructor(
        private taskService: TaskService,
        public configService: TaskViewConfigService, // Public for usage in template
        private snackBar: MatSnackBar,
        private dialog: MatDialog,
        private _userService: UserService,
        private _cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        // 1. Load User Config First
        this.loadConfig();

        // 2. Load User Info
        this._userService.user$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: User) => {
                this.user = user["usuario"];
            });

        // 3. Initial Load of Tasks
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

        // Initialize column widths if missing or incomplete
        if (!this.viewConfig.columnWidths) {
            this.viewConfig.columnWidths = { ...this.configService.DEFAULT_CONFIG.columnWidths };
        } else {
            // Ensure all default columns have a width if not present in saved config
            this.viewConfig.columnWidths = {
                ...this.configService.DEFAULT_CONFIG.columnWidths,
                ...this.viewConfig.columnWidths
            };
        }

        // Restore Columns and Their Order
        this.displayedColumns = [...this.viewConfig.visibleColumns];

        // Migración: Si aún tiene 'actions', lo cambiamos a 'acciones'
        const oldActionsIndex = this.displayedColumns.indexOf('actions');
        if (oldActionsIndex > -1) {
            this.displayedColumns.splice(oldActionsIndex, 1, 'acciones');
            if (!this.displayedColumns.includes('media')) {
                this.displayedColumns.splice(oldActionsIndex, 0, 'media');
            }
        }

        // Migración recursiva para grupos guardados
        if (this.viewConfig.groupColumns) {
            Object.keys(this.viewConfig.groupColumns).forEach(key => {
                let cols = this.viewConfig.groupColumns[key];
                const actIdx = cols.indexOf('actions');
                if (actIdx > -1) {
                    cols.splice(actIdx, 1, 'acciones');
                    if (!cols.includes('media')) {
                        cols.splice(actIdx, 0, 'media');
                    }
                }
                // Asegurar columnas requeridas en grupos
                if (!cols.includes('acciones')) cols.push('acciones');
                if (!cols.includes('nombre') && this.allColumns.includes('nombre')) cols.unshift('nombre');
                this.viewConfig.groupColumns[key] = [...cols];
            });
        }

        // Asegurarnos de que las columnas obligatorias/nuevas existan en el global
        if (!this.displayedColumns.includes('acciones')) this.displayedColumns.push('acciones');
        if (!this.displayedColumns.includes('nombre')) this.displayedColumns.unshift('nombre');

        // Restore Filters
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
        this.initColumnSorting();
    }

    groupTasksByStatus(tasks: Task[]): void {
        // Refined statuses: Pending, In Progress, Completed. Removed 'Detenido'.
        const statuses = [
            { id: 1, name: 'Pendiente', color: 'border-l-4 border-gray-400' },
            { id: 2, name: 'En Proceso', color: 'border-l-4 border-orange-400' },
            { id: 3, name: 'Completada', color: 'border-l-4 border-green-500' }
        ];

        this.groupedTasks = [];

        statuses.forEach(status => {
            if (this.hideCompleted && status.id === 3) return;

            const groupTasks = tasks.filter(t => t.estatus === status.id);

            // Apply saved task order if exists
            const groupKey = `status-${status.id}`;
            const savedOrder = this.viewConfig.groupTaskOrder?.[groupKey];
            if (savedOrder && savedOrder.length > 0) {
                groupTasks.sort((a, b) => {
                    const idxA = savedOrder.indexOf(a.id!);
                    const idxB = savedOrder.indexOf(b.id!);
                    if (idxA === -1 && idxB === -1) return 0;
                    if (idxA === -1) return 1;
                    if (idxB === -1) return -1;
                    return idxA - idxB;
                });
            }

            // If filtering, hide groups with 0 tasks
            if (this.filterValue && groupTasks.length === 0) return;

            // Filter the saved group columns to only include those that are currently visible globally
            const groupColumns = (this.viewConfig.groupColumns?.[groupKey] || [...this.displayedColumns])
                .filter(col => this.displayedColumns.includes(col));

            this.groupedTasks.push({
                groupName: status.name,
                groupKey: groupKey,
                tasks: new MatTableDataSource(groupTasks),
                count: groupTasks.length,
                color: status.color,
                displayedColumns: groupColumns
            });
        });

        // Tasks without status or other non-filtered status
        const otherTasks = tasks.filter(t => !t.estatus || (t.estatus !== 1 && t.estatus !== 2 && t.estatus !== 3));
        if (otherTasks.length > 0) {
            const groupKey = 'status-0';
            // Filter the saved group columns to only include those that are currently visible globally
            const groupColumns = (this.viewConfig.groupColumns?.[groupKey] || [...this.displayedColumns])
                .filter(col => this.displayedColumns.includes(col));

            // Apply saved task order if exists
            const savedOrder = this.viewConfig.groupTaskOrder?.[groupKey];
            if (savedOrder && savedOrder.length > 0) {
                otherTasks.sort((a, b) => {
                    const idxA = savedOrder.indexOf(a.id!);
                    const idxB = savedOrder.indexOf(b.id!);
                    if (idxA === -1 && idxB === -1) return 0;
                    if (idxA === -1) return 1;
                    if (idxB === -1) return -1;
                    return idxA - idxB;
                });
            }

            this.groupedTasks.push({
                groupName: 'Sin Estatus / Otros',
                groupKey: groupKey,
                tasks: new MatTableDataSource(otherTasks),
                count: otherTasks.length,
                color: 'border-l-4 border-gray-200',
                displayedColumns: groupColumns
            });
        }
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
 * Maneja el evento de soltar una fila, actualizando el orden persistente y el estatus.
 * @param event - Evento de CdkDragDrop con el array de tareas.
 * @param targetGroupKey - Identificador del grupo destino (ej: '1', '2', '3').
 * @returns void
 */
    onRowDropped(event: CdkDragDrop<Task[]>, targetGroupKey: string): void {
        if (event.previousContainer === event.container) {
            // 1. Mover el ítem en el array de datos
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);

            // 2. Persistir el nuevo orden de los IDs
            const taskIds = event.container.data.map(t => t.id).filter(id => id !== undefined) as number[];
            this.configService.updateGroupTaskOrder(targetGroupKey, taskIds);

            // 3. ¡CRÍTICO! Notificar a la tabla que los datos cambiaron
            // Buscamos el grupo en tu array de grupos
            const group = this.groupedTasks.find(g => g.groupKey === targetGroupKey);
            if (group) {
                // Refrescamos la referencia para que Angular detecte el cambio
                group.tasks.data = [...event.container.data];
            }
        } else {
            // Lógica para mover a OTRO grupo
            const task = event.item.data as Task;
            const newStatusId = this.parseStatusIdFromGroupKey(targetGroupKey);

            if (task && newStatusId !== undefined && task.id) {
                const oldStatus = task.estatus;
                task.estatus = newStatusId;

                // Mover el item entre arrays
                transferArrayItem(
                    event.previousContainer.data,
                    event.container.data,
                    event.previousIndex,
                    event.currentIndex
                );

                // Notificar a ambos DataSources (Origen y Destino)
                this.refreshTableDataSources();

                // Guardar órdenes y llamar al servicio
                this.saveAllGroupOrders();
                this.taskService.updateTask(task.id, task).subscribe({
                    next: () => {
                        this.snackBar.open(`Tarea movida`, "Cerrar", { duration: 2000 });
                    },
                    error: () => {
                        task.estatus = oldStatus;
                        this.loadTasks(); // Revertir
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
        console.log(event);
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

        if (!width || width === 'auto') {
            return {
                'position': 'relative',
                'overflow': 'visible',
                'box-sizing': 'border-box'
            };
        }

        return {
            'width': width,
            'min-width': width,
            'max-width': width,
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

    getStatusColor(groupKey: string): string {
        if (groupKey.includes('1')) return '#808080'; // Gray (Pending)
        if (groupKey.includes('2')) return '#ffcb00'; // Yellow/Orange (In Progress)
        if (groupKey.includes('3')) return '#00c875'; // Green (Completed)
        return '#cbd5e0';
    }

    getStatusBadgeColor(status: number): string {
        switch (status) {
            case 1: return '#c4c4c4'; // Gray
            case 2: return '#fdab3d'; // Orange
            case 3: return '#00c875'; // Green
            default: return '#cbd5e0';
        }
    }
    onResizeEnd(event: ResizeEvent): void {
        console.log('Element was resized', event);
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
}
