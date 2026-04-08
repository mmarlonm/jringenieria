import { Component, Inject, OnInit, AfterViewInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import {
    FormBuilder,
    FormGroup,
    Validators,
    FormArray,
    ReactiveFormsModule
} from '@angular/forms';
import { TaskService } from './../tasks.service';
import { UsersService } from '../../../security/users/users.service';
import { UserService } from "app/core/user/user.service";
import { ChatNotificationService } from 'app/shared/components/chat-notification/chat-notification.service';
import {
    MatDatepickerModule
} from '@angular/material/datepicker';
import {
    MatFormFieldModule
} from '@angular/material/form-field';
import {
    MatInputModule
} from '@angular/material/input';
import {
    MatButtonModule
} from '@angular/material/button';
import {
    MatIconModule
} from '@angular/material/icon';
import {
    MatSelectModule
} from '@angular/material/select';
import {
    CommonModule
} from '@angular/common';
import flatpickr from 'flatpickr';
import { 
    addDays, 
    subDays, 
    startOfDay, 
    eachDayOfInterval, 
    differenceInDays, 
    format,
    isToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import { User } from 'app/core/user/user.types';
import { Subject, takeUntil } from 'rxjs';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { DomSanitizer } from '@angular/platform-browser';

import { TaskChatComponent } from '../task-chat/task-chat.component';
import { TareaActividadesGanttComponent } from '../gantt/tarea-actividades-gantt.component';

@Component({
    selector: 'app-task-form-dialog',
    templateUrl: './task-form-dialog.component.html',
    styleUrls: ['./task-form-dialog.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDatepickerModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatSelectModule,
        MatDialogModule,
        MatTabsModule,
        MatMenuModule,
        TaskChatComponent,
        TareaActividadesGanttComponent
    ]
})
export class TaskFormDialogComponent implements OnInit, AfterViewInit {
    form: FormGroup;
    userList: any[] = [];
    loading: boolean = false;
    isChatCollapsed: boolean = true;
    isScreenSmall: boolean = false;
    isFullscreen: boolean = false;
    today: Date = new Date();

    private flatpickrInstances: { [key: string]: flatpickr.Instance } = {};

    //informacion de usuario logeado
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    user: User;

    // ============================
    // ARCHIVOS
    // ============================
    tareaId!: number;
    files: any[] = [];
    selectedFile: File | null = null;
    categoriaArchivo: string = '';


    constructor(
        private dialogRef: MatDialogRef<TaskFormDialogComponent>,
        private fb: FormBuilder,
        private taskService: TaskService,
        private usersService: UsersService,
        private _userService: UserService,
        private _notificationService: ChatNotificationService,
        private _sanitizer: DomSanitizer,
        @Inject(MAT_DIALOG_DATA) public data: { id?: number, readOnly?: boolean } | null
    ) {
        this.form = this.fb.group({
            nombre: ['', Validators.required],
            comentarios: [''],
            fechaInicioEstimada: [null],
            fechaFinEstimada: [null],
            fechaInicioReal: [null],
            fechaFinReal: [null],
            usuarioIds: [[]],
            empresa: [''],
            ubicacion: [''],
            links: this.fb.array([]),
            CreadorId: [null], // ID del usuario que crea la tarea
            apiUrl: 'https://api.mgm-technologies-group.org/api',  // API Principal (Producción)
            apiUrlSignal: 'https://api.mgm-technologies-group.org', // SignalR
            estatus: [2, Validators.required], // Nuevo campo de estatus con valor por defecto 1
            cuadranteId: [null]
        });
        this.tareaId = data?.id;
    }

    ngOnInit(): void {
        // Subscribe to the user service
        this._userService.user$
            .subscribe((user: User) => {
                const usuario = user ? user['usuario'] : null;
                if (usuario) {
                    this.user = usuario;
                    this.form.get('CreadorId').setValue(this.user.id);
                }
            });
        this.getUsers();

        if (this.data?.id) {
            this.loadTask(this.data.id);
            this.tareaId = this.data.id;
            this.loadFiles();
        }
        if (this.data?.readOnly) {
            this.form.disable(); // Desactiva todo el formulario
        }

    }

    ngAfterViewInit(): void {
        // Inicializa flatpickr sin valor inicial (se setea luego con loadTask)
        this.initFlatpickr('fechaInicioEstimada', 'fechaInicioEstimada');
        this.initFlatpickr('fechaFinEstimada', 'fechaFinEstimada');
        this.initFlatpickr('fechaInicioReal', 'fechaInicioReal');
        this.initFlatpickr('fechaFinReal', 'fechaFinReal');
    }

    initFlatpickr(elementId: string, controlName: string): void {
        const el = document.getElementById(elementId);
        if (!el) return;

        this.flatpickrInstances[controlName] = flatpickr(el, {
            enableTime: true,
            time_24hr: true,
            dateFormat: 'Y-m-d H:i',
            defaultDate: this.form.get(controlName)?.value ?? null,
            onChange: (selectedDates) => {
                // Actualiza FormControl con la fecha/hora seleccionada
                this.form.get(controlName)?.setValue(selectedDates[0] ?? null);
            }
        });
    }

    loadTask(id: number): void {
        this.taskService.getTaskById(id).subscribe(task => {
            // Setea el valor en el form sin perder referencia a Flatpickr
            this.form.patchValue({
                nombre: task.nombre,
                comentarios: task.comentarios,
                fechaInicioEstimada: task.fechaInicioEstimada ? new Date(task.fechaInicioEstimada) : null,
                fechaFinEstimada: task.fechaFinEstimada ? new Date(task.fechaFinEstimada) : null,
                fechaInicioReal: task.fechaInicioReal ? new Date(task.fechaInicioReal) : null,
                fechaFinReal: task.fechaFinReal ? new Date(task.fechaFinReal) : null,
                usuarioIds: task.usuarioIds ?? [],
                empresa: task.empresa,
                ubicacion: task.ubicacion,
                CreadorId: this.user?.id || null, // Asigna el ID del usuario logueado de forma segura
                estatus: task.estatus,
                cuadranteId: task.cuadranteId ?? null
            });

            // Actualiza manualmente flatpickr con las fechas ya parseadas
            ['fechaInicioEstimada', 'fechaFinEstimada', 'fechaInicioReal', 'fechaFinReal'].forEach(key => {
                const date = this.form.get(key)?.value;
                if (this.flatpickrInstances[key]) {
                    this.flatpickrInstances[key].setDate(date, false); // false para no disparar onChange
                }
            });

            this.form.setControl(
                'links',
                this.fb.array((task.links || []).map(l => this.fb.control(l)))
            );


        });
    }

    get links(): FormArray {
        return this.form.get('links') as FormArray;
    }

    addLink(): void {
        this.links.push(this.fb.control(''));
    }

    removeLink(index: number): void {
        this.links.removeAt(index);
    }

    openLink(url: string): void {
        window.open(url, '_blank');
    }

    save(): void {
        if (this.form.invalid) return;

        this.loading = true;

        const formValue = this.form.value;

        // Función para convertir Date local a ISO string sin aplicar desfase horario
        function toLocalISOString(date: Date | null): string | null {
            if (!date) return null;
            // Obtiene componentes en hora local
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const hour = date.getHours().toString().padStart(2, '0');
            const minute = date.getMinutes().toString().padStart(2, '0');
            const second = date.getSeconds().toString().padStart(2, '0');
            return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
        }

        // Crear el objeto task con fechas corregidas
        const task = {
            ...formValue,
            fechaInicioEstimada: toLocalISOString(formValue.fechaInicioEstimada),
            fechaFinEstimada: toLocalISOString(formValue.fechaFinEstimada),
            fechaInicioReal: toLocalISOString(formValue.fechaInicioReal),
            fechaFinReal: toLocalISOString(formValue.fechaFinReal),
            empresa: formValue.empresa,
            ubicacion: formValue.ubicacion,
            cuadranteId: formValue.cuadranteId
        };

        if (this.data?.id) {
            this.taskService.updateTask(this.data.id, task).subscribe({
                next: () => {
                    this.loading = false;
                    this.dialogRef.close('refresh');
                },
                error: (err) => {
                    this.loading = false;
                    this._notificationService.showError('Error al actualizar', 'No se pudieron guardar los cambios en la tarea.');
                }
            });
        } else {
            this.taskService.createTask(task).subscribe({
                next: (id: number) => {
                    this.loading = false;
                    this.tareaId = id;
                    this.loadFiles();
                    this.dialogRef.close('refresh');
                },
                error: (err) => {
                    this.loading = false;
                    this._notificationService.showError('Error al crear', 'No se pudo dar de alta la nueva tarea.');
                }
            });
        }
    }


    cancel(): void {
        this.dialogRef.close();
    }

    toggleChat(): void {
        this.isChatCollapsed = !this.isChatCollapsed;
    }

    toggleFullscreen(): void {
        this.isFullscreen = !this.isFullscreen;
        if (this.isFullscreen) {
            this.dialogRef.updateSize('100vw', '100vh');
            this.dialogRef.addPanelClass('fullscreen-dialog');
        } else {
            this.dialogRef.updateSize(this.data?.id ? '1200px' : '900px', '95vh');
            this.dialogRef.removePanelClass('fullscreen-dialog');
        }
    }

    getUsers(): void {
        this.usersService.getUsers().subscribe(users => {
            this.userList = users.filter(u => u.activo !== false);
        });
    }

    onFileSelected(event: any): void {
        const files: FileList = event.target.files;
        if (!files?.length || !this.tareaId) return;

        Array.from(files).forEach(file => {
            const formData = new FormData();
            formData.append('tareaId', this.tareaId.toString());
            formData.append('categoria', 'General'); // 👈 fija o dinámica
            formData.append('archivo', file);

            this.taskService.uploadFile(formData).subscribe({
                next: () => {
                    this.loadFiles();
                    this._notificationService.showSuccess('Archivo subido', `Se ha adjuntado "${file.name}" correctamente.`);
                },
                error: err => {
                    console.error('Error al subir archivo', err);
                    this._notificationService.showError('Error de carga', `No se pudo subir el archivo "${file.name}".`);
                }
            });
        });

        // Reset input para permitir subir el mismo archivo otra vez
        event.target.value = '';
    }


    uploadFile(): void {
        if (!this.selectedFile || !this.categoriaArchivo || !this.tareaId) return;

        const formData = new FormData();
        formData.append('tareaId', this.tareaId.toString());
        formData.append('categoria', this.categoriaArchivo);
        formData.append('archivo', this.selectedFile);

        this.taskService.uploadFile(formData).subscribe({
            next: () => {
                this.loadFiles();
                this.selectedFile = null;
                this.categoriaArchivo = '';
                this._notificationService.showSuccess('Archivo subido', 'El documento se ha guardado correctamente.');
            },
            error: (err) => {
                this._notificationService.showError('Error de carga', 'No se pudo procesar el archivo.');
            }
        });
    }
    loadFiles(): void {
        if (!this.tareaId) return;

        this.taskService.getFiles(this.tareaId).subscribe(res => {
            this.files = res;
        });
    }

    download(file: any): void {
        this.taskService
            .downloadFile(this.tareaId, file.categoria, file.nombreArchivo)
            .subscribe(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = file.nombreArchivo;
                a.click();
                window.URL.revokeObjectURL(url);
            });
    }

    remove(file: any): void {
        if (!confirm('¿Eliminar archivo?')) return;

        this.taskService
            .removeFile(this.tareaId, file.categoria, file.nombreArchivo)
            .subscribe({
                next: () => {
                    this.loadFiles();
                    this._notificationService.showInfo('Archivo eliminado', 'El adjunto ha sido removido.');
                },
                error: (err) => {
                    this._notificationService.showError('Error al eliminar', 'No se pudo borrar el archivo del servidor.');
                }
            });
    }

    // ============================
    // EXPORTACIÓN PDF
    // ============================

    getEstatusLabel(estatus: number): string {
        switch (estatus) {
            case 1: return 'Pendiente';
            case 2: return 'En proceso';
            case 3: return 'Completada';
            default: return 'Desconocido';
        }
    }

    getUserName(id: any): string {
        if (!this.userList || this.userList.length === 0) return 'Cargando...';
        const user = this.userList.find(u => Number(u.usuarioId || u.id) === Number(id));
        return user ? user.nombreUsuario || user.nombre : 'Sin asignar';
    }

    async exportToPDF(): Promise<void> {
        if (this.loading) return;
        this.loading = true;

        try {
            this._notificationService.showInfo('Preparando Reporte Silencioso', 'Generando cronograma y preparando impresión...');

            // 1. Obtener datos necesarios
            const id = this.tareaId;
            const activitiesCount = await (id ? this.taskService.getActividades(id).toPromise() : Promise.resolve([]));
            const activities = activitiesCount || [];

            // 2. Lógica de Calendario Gantt (2 días atrás, 42 días total)
            const startDate = startOfDay(subDays(new Date(), 2));
            const endDate = addDays(startDate, 41);
            const daysArr = eachDayOfInterval({ start: startDate, end: endDate });
            const dayWidth = 26; // px - Ajustado para caber con sidebar
            const sidebarWidth = 200; // px

            // 3. Preparar datos de la tarea
            const nombre = this.form.get('nombre').value || 'Sin nombre';
            const estatus = this.getEstatusLabel(this.form.get('estatus').value);
            const empresa = this.form.get('empresa').value || 'JR INGENIERÍA';
            const ubicacion = this.form.get('ubicacion').value || 'NO ESPECIFICADA';
            const comentarios = this.form.get('comentarios').value || 'Sin comentarios.';
            const team = (this.form.get('usuarioIds').value || []).map(uid => this.getUserName(uid)).join(', ');

            const fInicioE = this.form.get('fechaInicioEstimada').value ? format(new Date(this.form.get('fechaInicioEstimada').value), 'dd/MM/yyyy HH:mm') : '---';
            const fFinE = this.form.get('fechaFinEstimada').value ? format(new Date(this.form.get('fechaFinEstimada').value), 'dd/MM/yyyy HH:mm') : '---';
            const fInicioR = this.form.get('fechaInicioReal').value ? format(new Date(this.form.get('fechaInicioReal').value), 'dd/MM/yyyy HH:mm') : '---';
            const fFinR = this.form.get('fechaFinReal').value ? format(new Date(this.form.get('fechaFinReal').value), 'dd/MM/yyyy HH:mm') : 'EN CURSO';

            // 4. Generar HTML del Gantt Real (con sidebar)
            const ganttGridHtml = `
                <div class="gantt-real">
                    <div class="gantt-layout">
                        <!-- Sidebar de Actividades -->
                        <div class="gantt-sidebar" style="width: ${sidebarWidth}px">
                            <div class="gantt-sidebar-header">Detalle Actividades</div>
                            <div class="gantt-sidebar-body">
                                ${activities.map(a => `
                                    <div class="gantt-sidebar-row">
                                        <div class="a-name">${a.nombre}</div>
                                        <div class="a-resp">${a.nombreResponsable} (${a.progreso}%)</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Timeline -->
                        <div class="gantt-timeline-wrap">
                            <div class="gantt-header-dates" style="width: ${daysArr.length * dayWidth}px">
                                ${daysArr.map(d => `
                                    <div class="gantt-day-col ${[0, 6].includes(d.getDay()) ? 'weekend' : ''} ${isToday(d) ? 'today' : ''}">
                                        <div class="day-name">${format(d, 'eee', { locale: es })}</div>
                                        <div class="day-num">${format(d, 'd')}</div>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="gantt-body" style="width: ${daysArr.length * dayWidth}px">
                                <!-- Grid Lines -->
                                <div class="gantt-grid-lines">
                                    ${daysArr.map(d => `<div class="grid-line ${isToday(d) ? 'today-line' : ''}" style="width: ${dayWidth}px"></div>`).join('')}
                                </div>
                                <!-- Actividades -->
                                ${activities.map((a, i) => {
                const aStart = startOfDay(new Date(a.fechaInicio));
                const aEnd = startOfDay(new Date(a.fechaFin));
                let leftDays = differenceInDays(aStart, startDate);
                let durationDays = differenceInDays(aEnd, aStart) + 1;

                if (leftDays < 0) {
                    durationDays += leftDays;
                    leftDays = 0;
                }
                const barWidth = durationDays * dayWidth;
                const barLeft = leftDays * dayWidth;
                const color = a.estatus === 3 ? '#10b981' : a.estatus === 2 ? '#3b82f6' : '#f59e0b';

                return barWidth > 0 ? `
                                        <div class="gantt-row">
                                            <div class="gantt-bar" style="left: ${barLeft}px; width: ${barWidth}px; background-color: ${color}cc; border: 1.2px solid ${color}">
                                                <span class="bar-tag">${a.progreso}%</span>
                                            </div>
                                        </div>
                                    ` : '<div class="gantt-row"></div>';
            }).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // 5. Construir Iframe de Impresión Silenciosa
            let printIframe = document.getElementById('print-iframe') as HTMLIFrameElement;
            if (!printIframe) {
                printIframe = document.createElement('iframe');
                printIframe.id = 'print-iframe';
                printIframe.style.position = 'absolute';
                printIframe.style.width = '0';
                printIframe.style.height = '0';
                printIframe.style.border = 'none';
                printIframe.style.visibility = 'hidden';
                document.body.appendChild(printIframe);
            }

            const htmlContent = `
                <html>
                <head>
                    <title>Reporte - ${nombre}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
                        body { font-family: 'Inter', sans-serif; color: #0f172a; margin: 0; padding: 12mm; background: #fff; font-size: 11px; }
                        .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2.5px solid #1e40af; padding-bottom: 8px; margin-bottom: 15px; }
                        .logo { height: 45px; }
                        .title-box { text-align: right; }
                        .main-title { font-size: 22px; font-weight: 800; color: #1e40af; margin: 0; text-transform: uppercase; }
                        
                        .section { margin-bottom: 15px; page-break-inside: avoid; }
                        .section-title { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #1e40af; background: #f8fafc; border-left: 4px solid #1e40af; padding: 5px 10px; margin-bottom: 8px; }
                        
                        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                        .grid-4 { grid-template-columns: repeat(4, 1fr); }
                        .label { font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
                        .value { font-size: 12px; font-weight: 500; }
                        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 800; border: 1px solid currentColor; }
                        .status-1 { background: #fffbeb; color: #b45309; }
                        .status-2 { background: #eff6ff; color: #1d4ed8; }
                        .status-3 { background: #ecfdf5; color: #047857; }
                        
                        /* Layout del Gantt Reporte */
                        .gantt-real { border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background: #fff; }
                        .gantt-layout { display: flex; }
                        
                        .gantt-sidebar { flex: 0 0 ${sidebarWidth}px; border-right: 1px solid #e2e8f0; background: #f8fafc; }
                        .gantt-sidebar-header { height: 35px; display: flex; align-items: center; px: 10px; padding: 0 10px; font-size: 9px; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; color: #64748b; }
                        .gantt-sidebar-row { height: 35px; border-bottom: 1px solid #f1f5f9; padding: 0 10px; display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
                        .a-name { font-weight: 700; font-size: 10px; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                        .a-resp { font-size: 8px; color: #64748b; }
                        
                        .gantt-timeline-wrap { flex: auto; overflow: hidden; position: relative; }
                        .gantt-header-dates { display: flex; height: 35px; border-bottom: 1px solid #e2e8f0; background: #fff; }
                        .gantt-day-col { flex: 0 0 ${dayWidth}px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 8px; border-right: 1px solid #f1f5f9; }
                        .day-name { font-weight: 700; text-transform: uppercase; color: #94a3b8; }
                        .day-num { font-weight: 800; color: #475569; }
                        .weekend { background: #f1f5f9; }
                        .today { background: #1e40af20; }
                        .day-num.today { color: #1e40af; }
                        
                        .gantt-body { position: relative; min-height: 100px; }
                        .gantt-grid-lines { display: flex; position: absolute; inset: 0; pointer-events: none; }
                        .grid-line { flex: 0 0 ${dayWidth}px; border-right: 1px solid #f1f5f9; height: 100%; }
                        .today-line { border-right: 2px solid #1e40af40 !important; }
                        
                        .gantt-row { height: 35px; border-bottom: 1px solid #f1f5f9; position: relative; }
                        .gantt-bar { position: absolute; top: 10px; height: 15px; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                        .bar-tag { font-size: 7px; font-weight: 800; color: #fff; text-shadow: 0 1px 1px rgba(0,0,0,0.3); }
                        
                        .footer { margin-top: 25px; padding-top: 5px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 8px; color: #94a3b8; }
                        .page-break { page-break-before: always; }
                        @media print { @page { size: A4 landscape; margin: 8mm; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <img src="/images/logo/JR-PNG-SIN-FONDO.png" class="logo">
                        <div class="title-box">
                            <h1 class="main-title">Reporte Técnico de Tarea</h1>
                            <div class="task-id">IDENTIFICADOR: #${id}</div>
                        </div>
                    </div>
                    <div class="section">
                        <div class="section-title">I. Datos Generales</div>
                        <div class="grid">
                            <div class="field"><div class="label">Tarea</div><div class="value font-bold">${nombre}</div></div>
                            <div class="field"><div class="label">Estatus</div><div class="badge status-${this.form.get('estatus').value}">${estatus}</div></div>
                            <div class="field"><div class="label">Empresa</div><div class="value">${empresa}</div></div>
                            <div class="field"><div class="label">Ubicación</div><div class="value">${ubicacion}</div></div>
                        </div>
                    </div>
                    <div class="section">
                        <div class="grid grid-4" style="background:#f8fafc; padding: 10px; border-radius: 5px;">
                            <div class="field"><div class="label">Inicio Est.</div><div class="value">${fInicioE}</div></div>
                            <div class="field"><div class="label">Fin Est.</div><div class="value">${fFinE}</div></div>
                            <div class="field"><div class="label">Inicio Real</div><div class="value">${fInicioR}</div></div>
                            <div class="field"><div class="label">Fin Real</div><div class="value">${fFinR}</div></div>
                        </div>
                    </div>
                    <div class="section">
                        <div class="section-title">II. Listado y Cronograma (Gantt)</div>
                        <p style="font-size: 9px; color: #64748b; margin-top: -5px; margin-bottom: 10px;">Visualización desde: ${format(startDate, 'dd/MM/yyyy')} (Hoy -2 días)</p>
                        ${ganttGridHtml}
                    </div>
                    <div class="footer">
                        <span>JR INGENIERÍA ELÉCTRICA - DEPARTAMENTO TÉCNICO</span>
                        <span>GENERADO: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                    <script>
                        window.onload = () => {
                            setTimeout(() => {
                                window.print();
                            }, 600);
                        };
                    </script>
                </body>
                </html>
            `;

            const doc = printIframe.contentWindow?.document || printIframe.contentDocument;
            if (doc) {
                doc.open();
                doc.write(htmlContent);
                doc.close();
            }

        } catch (error) {
            console.error('Error al generar PDF:', error);
            this._notificationService.showError('Error', 'No se pudo generar el reporte.');
        } finally {
            this.loading = false;
        }
    }
}
