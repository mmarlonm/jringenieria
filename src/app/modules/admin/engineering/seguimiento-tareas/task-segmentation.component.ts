import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HighchartsChartModule } from 'highcharts-angular';
import * as Highcharts from 'highcharts';
import { TaskService } from 'app/modules/admin/dashboards/tasks/tasks.service';
import { Task } from 'app/modules/admin/dashboards/tasks/models/tasks.model';
import { EngineeringService, SeguimientoProyecto } from 'app/modules/admin/engineering/engineering.service';
import { UserService } from 'app/core/user/user.service';
import { UsersService } from 'app/modules/admin/security/users/users.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TaskFormDialogComponent } from 'app/modules/admin/dashboards/tasks/task-form-dialog/task-form-dialog.component';
import moment from 'moment';

@Component({
    selector: 'app-engineering-seguimiento-tareas',
    templateUrl: './task-segmentation.component.html',
    styleUrls: ['./task-segmentation.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatTabsModule,
        MatTableModule,
        MatSelectModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatCheckboxModule,
        MatTooltipModule,
        MatDialogModule,
        HighchartsChartModule
    ]
})
export class EngineeringSeguimientoTareasComponent implements OnInit {

    // Filters and Data
    allTasks: Task[] = [];
    filteredTasks: Task[] = [];
    approvedProjects: SeguimientoProyecto[] = [];
    selectedProjectIds: number[] = [];
    userList: any[] = [];
    currentUser: any;

    // Table settings
    dataSource = new MatTableDataSource<Task>();
    displayedColumns: string[] = [
        'proyecto', 'fase', 'nombre', 'descripcion', 'prioridad', 'importante', 'urgente',
        'estatus', 'asignado', 'rolArea', 'fechaInicio', 'fechaFin', 'diasRestantes', 'progreso', 'notas', 'acciones'
    ];

    // KPIs
    kpiTotal: number = 0;
    kpiCompletadas: number = 0;
    kpiCompletadasPorcentaje: number = 0;
    kpiPendientes: number = 0;
    kpiAtrasadas: number = 0;
    kpiVenceHoy: number = 0;

    // Charts Config
    Highcharts: typeof Highcharts = Highcharts;
    updateChartsFlag: boolean = false;
    userChartOptions: Highcharts.Options = {};
    completionChartOptions: Highcharts.Options = {};
    statusChartOptions: Highcharts.Options = {};
    categoryChartOptions: Highcharts.Options = {};
    priorityChartOptions: Highcharts.Options = {};

    constructor(
        private _taskService: TaskService,
        private _engineeringService: EngineeringService,
        private _userService: UserService,
        private _usersService: UsersService,
        private _matDialog: MatDialog,
        private _cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this._userService.user$.subscribe(user => {
            this.currentUser = user ? user['usuario'] : null;
            if (this.currentUser) {
                this.loadInitialData();
            }
        });
    }

    loadInitialData(): void {
        // Load users to map names
        this._usersService.getUsers().subscribe(users => {
            this.userList = users;
            // Load approved projects
            this._engineeringService.getSeguimientos().subscribe(projects => {
                this.approvedProjects = projects.filter(p => p.estatusAprobacion === 2);
                this.loadTasks();
            });
        });
    }

    loadTasks(): void {
        this._taskService.getTasks(this.currentUser.id).subscribe(tasks => {
            // Keep only tasks belonging to approved projects
            const approvedProjectIds = this.approvedProjects.map(p => p.idSeguimiento);
            this.allTasks = tasks.filter(t => t.proyectoId && approvedProjectIds.includes(t.proyectoId));
            
            // Set initial selection to all approved projects
            this.selectedProjectIds = [...approvedProjectIds];
            
            this.applyFilters();
        });
    }

    applyFilters(): void {
        if (this.selectedProjectIds.length === 0) {
            this.filteredTasks = [];
        } else {
            this.filteredTasks = this.allTasks.filter(t => t.proyectoId && this.selectedProjectIds.includes(t.proyectoId));
        }

        this.dataSource.data = this.filteredTasks;
        this.calculateKPIs();
        this.initCharts();
        
        this._cdr.detectChanges();
    }

    calculateKPIs(): void {
        const today = moment().startOf('day');
        this.kpiTotal = this.filteredTasks.length;
        this.kpiCompletadas = this.filteredTasks.filter(t => t.estatus === 3).length;
        this.kpiCompletadasPorcentaje = this.kpiTotal > 0 ? Math.round((this.kpiCompletadas / this.kpiTotal) * 100) : 0;
        this.kpiPendientes = this.filteredTasks.filter(t => t.estatus === 1).length;
        
        this.kpiAtrasadas = this.filteredTasks.filter(t => {
            if (t.estatus === 3 || !t.fechaFinEstimada) return false;
            return moment(t.fechaFinEstimada).isBefore(today);
        }).length;

        this.kpiVenceHoy = this.filteredTasks.filter(t => {
            if (t.estatus === 3 || !t.fechaFinEstimada) return false;
            return moment(t.fechaFinEstimada).isSame(today, 'day');
        }).length;
    }

    // Mappers for display
    getProjectName(projectId: number): string {
        const proj = this.approvedProjects.find(p => p.idSeguimiento === projectId);
        return proj ? proj.actividad : 'Desconocido';
    }

    getAssignedName(userIds: number[]): string {
        if (!userIds || userIds.length === 0) return 'Sin asignar';
        return userIds.map(uid => {
            const u = this.userList.find(usr => usr.usuarioId === uid);
            return u ? u.nombreUsuario || u.nombre : 'Usuario';
        }).join(', ');
    }

    getStatusName(status: number): string {
        switch (status) {
            case 1: return 'Pendiente';
            case 2: return 'En proceso';
            case 3: return 'Completada';
            default: return 'Pendiente';
        }
    }

    getRemainingDays(endDate: any): number {
        if (!endDate) return 0;
        const diff = moment(endDate).diff(moment(), 'days');
        return diff;
    }

    // Open creation or edit dialog for tasks
    openTaskForm(taskId?: number): void {
        this._matDialog.open(TaskFormDialogComponent, {
            width: '1200px',
            height: '95vh',
            data: taskId ? { id: taskId } : null
        }).afterClosed().subscribe(res => {
            if (res === 'refresh') {
                this.loadTasks();
            }
        });
    }

    // Charts Initializer
    initCharts(): void {
        // 1. Tareas por Persona a Cargo
        const userCounts: { [key: string]: number } = {};
        this.filteredTasks.forEach(t => {
            const name = this.getAssignedName(t.usuarioIds);
            userCounts[name] = (userCounts[name] || 0) + 1;
        });
        const userCategories = Object.keys(userCounts);
        const userData = Object.values(userCounts);

        this.userChartOptions = {
            chart: { type: 'bar', backgroundColor: 'transparent', height: 260 },
            title: { text: 'Tareas por Persona a Cargo', style: { fontSize: '12px', fontWeight: 'bold' } },
            xAxis: { categories: userCategories },
            yAxis: { title: { text: 'Cantidad' } },
            legend: { enabled: false },
            series: [{ name: 'Tareas', data: userData, type: 'bar', color: '#1e40af' }]
        };

        // 2. Tareas Completadas (Doughnut)
        this.completionChartOptions = {
            chart: { type: 'pie', backgroundColor: 'transparent', height: 260 },
            title: { text: 'Progreso General', style: { fontSize: '12px', fontWeight: 'bold' } },
            plotOptions: {
                pie: { innerSize: '60%', dataLabels: { enabled: true, format: '{point.name}: {point.y}' } }
            },
            series: [{
                name: 'Tareas',
                type: 'pie',
                data: [
                    { name: 'Completadas', y: this.kpiCompletadas, color: '#10b981' },
                    { name: 'Pendientes', y: this.kpiTotal - this.kpiCompletadas, color: '#e2e8f0' }
                ]
            }]
        };

        // 3. Distribución por Estado (Doughnut)
        const pending = this.filteredTasks.filter(t => t.estatus === 1).length;
        const process = this.filteredTasks.filter(t => t.estatus === 2).length;
        const completed = this.filteredTasks.filter(t => t.estatus === 3).length;

        this.statusChartOptions = {
            chart: { type: 'pie', backgroundColor: 'transparent', height: 260 },
            title: { text: 'Tareas por Estado', style: { fontSize: '12px', fontWeight: 'bold' } },
            plotOptions: {
                pie: { innerSize: '60%', dataLabels: { enabled: true, format: '{point.name}: {point.percentage:.0f}%' } }
            },
            series: [{
                name: 'Estado',
                type: 'pie',
                data: [
                    { name: 'Pendiente', y: pending, color: '#f59e0b' },
                    { name: 'En Proceso', y: process, color: '#3b82f6' },
                    { name: 'Completada', y: completed, color: '#10b981' }
                ]
            }]
        };

        // 4. Distribución por Categoría (Fase) (Doughnut)
        const phaseCounts: { [key: string]: number } = {};
        this.filteredTasks.forEach(t => {
            const phase = t.fase || 'Sin Fase';
            phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
        });

        const phaseData = Object.keys(phaseCounts).map(k => ({
            name: k,
            y: phaseCounts[k]
        }));

        this.categoryChartOptions = {
            chart: { type: 'pie', backgroundColor: 'transparent', height: 260 },
            title: { text: 'Distribución por Fase / Categoría', style: { fontSize: '12px', fontWeight: 'bold' } },
            plotOptions: {
                pie: { innerSize: '60%', dataLabels: { enabled: true, format: '{point.name}: {point.y}' } }
            },
            series: [{
                name: 'Fase',
                type: 'pie',
                data: phaseData.length > 0 ? phaseData : [{ name: 'Sin Tareas', y: 0, color: '#e2e8f0' }]
            }]
        };

        // 5. Prioridad (Muy Alta a Muy Baja)
        const priorityCounts = { 'Muy Alta': 0, 'Alta': 0, 'Media': 0, 'Baja': 0, 'Muy Baja': 0 };
        this.filteredTasks.forEach(t => {
            const priority = t.prioridad || 'Media';
            if (priorityCounts.hasOwnProperty(priority)) {
                priorityCounts[priority]++;
            }
        });

        this.priorityChartOptions = {
            chart: { type: 'column', backgroundColor: 'transparent', height: 260 },
            title: { text: 'Tareas por Prioridad', style: { fontSize: '12px', fontWeight: 'bold' } },
            xAxis: { categories: ['Muy Alta', 'Alta', 'Media', 'Baja', 'Muy Baja'] },
            yAxis: { title: { text: 'Cantidad' } },
            legend: { enabled: false },
            series: [{
                name: 'Tareas',
                type: 'column',
                data: [
                    { y: priorityCounts['Muy Alta'], color: '#ef4444' },
                    { y: priorityCounts['Alta'], color: '#f97316' },
                    { y: priorityCounts['Media'], color: '#eab308' },
                    { y: priorityCounts['Baja'], color: '#3b82f6' },
                    { y: priorityCounts['Muy Baja'], color: '#10b981' }
                ]
            }]
        };

        this.updateChartsFlag = true;
    }
}
