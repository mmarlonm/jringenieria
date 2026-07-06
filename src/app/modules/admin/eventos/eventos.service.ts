import { Injectable, inject, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'environments/environment';
import { Observable, BehaviorSubject, Subject, timer, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as signalR from '@microsoft/signalr';

export interface Asistente {
    id: number; // ID entero de base de datos
    tokenQr: string; // GUID único para escaneo perimetral
    nombre: string;
    apellidos: string;
    correo: string;
    telefono: string;
    tipo: 'General' | 'Estudiante';
    asistencias: string[]; // ["16 de Octubre", "17 de Octubre"]
    comoSeEntero: string[]; // ["Facebook", "LinkedIn", etc]
    motivacion: string[]; // ["Networking", "Aprendizaje", etc]
    estatusQR: 'Enviado' | 'Pendiente';
    asistencia: 'Presente' | 'Faltante';
    fechaCheckIn?: string;
    fechaCheckInRaw?: string;
    medioSeguimiento: 'Correo' | 'WhatsApp' | 'Ninguno';
    direccion?: string;
    ocupacion?: string;
    empresa?: string;
    universidad?: string;
    carrera?: string;
    eventoId: number; // ID entero del evento
}

export interface DashboardMetricasDto {
    totalRegistrados: number;
    totalAsistieron: number;
    publicoGeneral: number;
    estudiantes: number;
    historialAsistenciaTiempoReal: { hora: string; cantidad: number }[];
    mediosDifusion: { medio: string; cantidad: number }[];
}

export interface EventoEdicion {
    id: number;
    nombre: string;
    anio: number;
}

export interface ActividadMetricsDto {
    actividadId: number;
    titulo: string;
    tipo: 'Pago' | 'Gratuito';
    cupoMaximo: number;
    registradosActuales: number;
    ingresaronActuales: number;
    fechaHoraInicio: string;
    fechaHoraFin: string;
    disponibles: number;
    estaLleno: boolean;
}

export interface Actividad {
    id: number;
    eventoId: number;
    titulo: string;
    expositor: string;
    tipo: 'Pago' | 'Gratuito';
    cupoMaximo: number;
    ubicacionLugar: string;
    fechaHoraInicio: string;
    fechaHoraFin: string;
    fechaCreacion: string;
    registradosActuales: number;
}

export interface AccesoTallerResultDto {
    exito: boolean;
    mensaje: string;
    nombreAsistente: string;
    tipoAsistente: string;
    organizacion: string;
    cupoSobrepasado: boolean; // true cuando se permitió el acceso pese a cupo lleno
}

@Injectable({
    providedIn: 'root'
})
export class EventosService implements OnDestroy {
    private _http = inject(HttpClient);
    
    // API Routes
    private readonly apiBase = environment.apiUrl;
    private readonly signalRBase = environment.apiUrlSignal;

    // Available Editions (dynamic state)
    private _ediciones = new BehaviorSubject<EventoEdicion[]>([]);
    public ediciones$ = this._ediciones.asObservable();
    public get ediciones(): EventoEdicion[] {
        return this._ediciones.value;
    }

    // State Subjects
    private _selectedEventoId = new BehaviorSubject<number>(2026);
    public selectedEventoId$ = this._selectedEventoId.asObservable();

    private _asistentes = new BehaviorSubject<Asistente[]>([]);
    public asistentes$ = this._asistentes.asObservable();

    private _metricas = new BehaviorSubject<DashboardMetricasDto>({
        totalRegistrados: 0,
        totalAsistieron: 0,
        publicoGeneral: 0,
        estudiantes: 0,
        historialAsistenciaTiempoReal: [],
        mediosDifusion: []
    });
    public metricas$ = this._metricas.asObservable();

    private _talleresMetrics = new BehaviorSubject<ActividadMetricsDto[]>([]);
    public talleresMetrics$ = this._talleresMetrics.asObservable();

    public get talleresMetricsValue(): ActividadMetricsDto[] {
        return this._talleresMetrics.value;
    }

    // SignalR Variables
    private hubConnection: signalR.HubConnection | null = null;
    private _signalrStatus = new BehaviorSubject<'Connected' | 'Disconnected' | 'Reconnecting' | 'Connecting'>('Disconnected');
    public signalrStatus$ = this._signalrStatus.asObservable();



    private destroy$ = new Subject<void>();

    constructor() {
        this.loadEventos();

        // Listen to active edition change to reload real lists and restart SignalR
        this._selectedEventoId
            .pipe(takeUntil(this.destroy$))
            .subscribe(eventoId => {
                this.loadAsistentesPorEvento(eventoId);
                this.loadTalleresMetrics(eventoId);
                // Restart SignalR connection for the new group
                this.connectToEventHub(eventoId);
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        const currentId = this._selectedEventoId.value;
        this.disconnectFromEventHub(currentId);
    }

    // --- SignalR Real-Time Logic ---
    
    public connectToEventHub(eventoId: number): void {
        const oldId = this._selectedEventoId.value;
        
        // If we are changing event, leave previous group and stop
        if (this.hubConnection) {
            this.hubConnection.invoke('LeaveEventoGroup', Number(oldId))
                .then(() => {
                    console.log(`📡 [SignalR] Left group for event ${oldId}`);
                    this.stopAndCleanConnection();
                    this.initiateNewConnection(eventoId);
                })
                .catch(err => {
                    console.error('📡 [SignalR] Error leaving group:', err);
                    this.stopAndCleanConnection();
                    this.initiateNewConnection(eventoId);
                });
        } else {
            this.initiateNewConnection(eventoId);
        }
    }

    private initiateNewConnection(eventoId: number): void {
        const token = localStorage.getItem('accessToken');
        const url = `${this.signalRBase}/eventoHub`;

        this._signalrStatus.next('Connecting');

        // Build hub connection
        this.hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(url, {
                accessTokenFactory: () => token || ''
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        // Register event listeners
        this.hubConnection.on('ReceiveLiveMetrics', (res: any) => {
            console.log('📡 [SignalR] Received live metrics update:', res);
            if (res) {
                const mapped: DashboardMetricasDto = {
                    totalRegistrados: res.totalRegistrados || 0,
                    totalAsistieron: res.totalAsistieron || 0,
                    publicoGeneral: res.totalGenerales || res.publicoGeneral || 0,
                    estudiantes: res.totalEstudiantes || res.estudiantes || 0,
                    historialAsistenciaTiempoReal: (res.historialAsistenciaTiempoReal || []).map((h: any) => ({
                        hora: h.hora,
                        cantidad: h.cantidad
                    })),
                    mediosDifusion: (res.distribucionMedios || res.mediosDifusion || []).map((m: any) => ({
                        medio: m.name || m.medio,
                        cantidad: m.value || m.cantidad
                    }))
                };
                this._metricas.next(mapped);
            }
        });

        this.hubConnection.on('ReceiveTalleresMetrics', (res: ActividadMetricsDto[]) => {
            console.log('📡 [SignalR] Received live workshop metrics update:', res);
            if (res) {
                this._talleresMetrics.next(res);
            }
        });

        this.hubConnection.on('ReceiveCheckInEvent', (res: any) => {
            console.log('📡 [SignalR] Check-in event received, reloading assistants:', res);
            if (res && res.eventoId) {
                this.loadAsistentesPorEvento(res.eventoId);
            }
        });

        // Connection status triggers
        this.hubConnection.onreconnecting(() => {
            this._signalrStatus.next('Reconnecting');
        });

        this.hubConnection.onreconnected(() => {
            this._signalrStatus.next('Connected');
            this.hubConnection?.invoke('JoinEventoGroup', Number(eventoId))
                .catch(err => console.error('📡 [SignalR] Error joining group after reconnect:', err));
        });

        this.hubConnection.onclose(() => {
            this._signalrStatus.next('Disconnected');
        });

        // Start connection
        this.hubConnection.start()
            .then(() => {
                this._signalrStatus.next('Connected');
                console.log(`📡 [SignalR] Connected to /eventoHub for event ${eventoId}`);
                this.hubConnection?.invoke('JoinEventoGroup', Number(eventoId))
                    .then(() => console.log(`📡 [SignalR] Joined group: ${eventoId}`))
                    .catch(err => console.error('📡 [SignalR] Error invoking JoinEventoGroup:', err));
            })
            .catch(err => {
                console.warn('📡 [SignalR] Could not connect to real hub:', err.message);
                this._signalrStatus.next('Disconnected');
            });
    }

    public disconnectFromEventHub(eventoId: number): void {
        if (this.hubConnection) {
            this.hubConnection.invoke('LeaveEventoGroup', Number(eventoId))
                .then(() => {
                    console.log(`📡 [SignalR] Left group ${eventoId}`);
                    this.stopAndCleanConnection();
                })
                .catch(err => {
                    console.error('📡 [SignalR] Error leaving group during disconnect:', err);
                    this.stopAndCleanConnection();
                });
        }
    }

    private stopAndCleanConnection(): void {
        if (this.hubConnection) {
            this.hubConnection.stop();
            this.hubConnection = null;
            this._signalrStatus.next('Disconnected');
        }
    }    // --- REST HTTP Endpoints & Actions ---

    public setSeleccionEdicion(eventoId: number): void {
        this._selectedEventoId.next(eventoId);
    }



    // GET api/Asistentes/dashboard-metrics/{eventoId}
    public loadDashboardMetrics(eventoId: number): void {
        this._http.get<any>(`${this.apiBase}/Asistentes/dashboard-metrics/${eventoId}`)
            .subscribe({
                next: (res) => {
                    if (res) {
                        const mapped: DashboardMetricasDto = {
                            totalRegistrados: res.totalRegistrados || 0,
                            totalAsistieron: res.totalAsistieron || 0,
                            publicoGeneral: res.totalGenerales || 0,
                            estudiantes: res.totalEstudiantes || 0,
                            historialAsistenciaTiempoReal: (res.historialAsistenciaTiempoReal || []).map((h: any) => ({
                                hora: h.hora,
                                cantidad: h.cantidad
                            })),
                            mediosDifusion: (res.distribucionMedios || []).map((m: any) => ({
                                medio: m.name,
                                cantidad: m.value
                            }))
                        };
                        this._metricas.next(mapped);
                    }
                },
                error: (err) => {
                    console.error(`⚠️ [API Error] /Asistentes/dashboard-metrics/${eventoId} failed:`, err);
                    this._metricas.next({
                        totalRegistrados: 0,
                        totalAsistieron: 0,
                        publicoGeneral: 0,
                        estudiantes: 0,
                        historialAsistenciaTiempoReal: [],
                        mediosDifusion: []
                    });
                }
            });
    }

    // POST api/Asistentes/upsert
    public registrarAsistente(asistente: any): Observable<any> {
        return new Observable<any>(observer => {
            const payload = {
                id: asistente.id ? Number(asistente.id) : null,
                eventoId: Number(this._selectedEventoId.value),
                nombre: asistente.nombre,
                apellidos: asistente.apellidos,
                correoElectronico: asistente.correo,
                numeroTelefonico: asistente.telefono,
                tipoAsistente: asistente.tipo,
                direccionCiudadEstado: asistente.direccion || null,
                ocupacionCargo: asistente.ocupacion || null,
                empresaRepresenta: asistente.empresa || null,
                universidadRepresentas: asistente.universidad || null,
                carreraCursas: asistente.carrera || null,
                medioSeguimientoDeseado: asistente.medioSeguimiento || 'Ninguno',
                fechasAsistencia: (asistente.asistencias || []).map((dateStr: string) => {
                    if (dateStr.includes('16')) {
                        return `${this._selectedEventoId.value}-10-16T00:00:00.000Z`;
                    } else if (dateStr.includes('17')) {
                        return `${this._selectedEventoId.value}-10-17T00:00:00.000Z`;
                    }
                    return dateStr;
                }),
                mediosDifusion: asistente.comoSeEntero || [],
                motivaciones: asistente.motivacion || []
            };

            this._http.post<any>(`${this.apiBase}/Asistentes/upsert`, payload)
                .subscribe({
                    next: (res) => {
                        const evId = Number(this._selectedEventoId.value);
                        this.loadAsistentesPorEvento(evId);
                        observer.next(res);
                        observer.complete();
                    },
                    error: (err) => {
                        console.error('⚠️ [API Error] /Asistentes/upsert failed:', err);
                        observer.error(err);
                    }
                });
        });
    }

    // POST api/Asistentes/masivo-manual/{eventoId}
    public reenviarQRMasivo(eventoId: number): Observable<any> {
        return new Observable<any>(observer => {
            this._http.post(`${this.apiBase}/Asistentes/masivo-manual/${eventoId}`, {})
                .subscribe({
                    next: (res) => {
                        this.loadAsistentesPorEvento(eventoId);
                        observer.next(res);
                        observer.complete();
                    },
                    error: (err) => {
                        console.error('⚠️ [API Error] Bulk resend failed:', err);
                        observer.error(err);
                    }
                });
        });
    }

    // POST api/Asistentes/{id}/reenviar-qr
    public reenviarQRIndividual(id: number): Observable<any> {
        return new Observable<any>(observer => {
            this._http.post(`${this.apiBase}/Asistentes/${id}/reenviar-qr`, {})
                .subscribe({
                    next: (res) => {
                        this.loadAsistentesPorEvento(this._selectedEventoId.value);
                        observer.next(res);
                        observer.complete();
                    },
                    error: (err) => {
                        console.error(`⚠️ [API Error] Resend QR for ${id} failed:`, err);
                        observer.error(err);
                    }
                });
        });
    }

    // POST api/Asistentes/check-in-publico with header X-Staff-Event-Key: ForoEnergizaPachuca_Key_2026
    public checkInPublico(tokenQR: string, eventoId?: number): Observable<any> {
        return new Observable<any>(observer => {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'X-Staff-Event-Key': 'ForoEnergizaPachuca_Key_2026'
            });

            const queryParams = eventoId ? `?eventoId=${eventoId}` : '';
            this._http.post<any>(`${this.apiBase}/Asistentes/check-in-publico${queryParams}`, JSON.stringify(tokenQR), { headers })
                .subscribe({
                    next: (res) => {
                        if (res && res.exito) {
                            const evId = this._selectedEventoId.value;
                                       const asistente = this._asistentes.value.find(a => a.tokenQr === tokenQR);
                            observer.next({
                                status: 'SUCCESS',
                                message: res.mensaje || '¡Acceso Autorizado!',
                                asistente: {
                                    id: asistente ? asistente.id : 0,
                                    personalStaffId: res.personalStaffId,
                                    nombreCompleto: res.nombreCompleto || (asistente ? `${asistente.nombre} ${asistente.apellidos}` : 'Visitante'),
                                    tipo: res.tipoAsistente || (asistente ? asistente.tipo : 'Personal/Staff'),
                                    organizacion: res.organizacion || (asistente ? (asistente.tipo === 'General' ? (asistente.empresa || 'Ninguna') : (asistente.universidad || 'Ninguna')) : 'Ninguna'),
                                    fechaCheckIn: new Date().toISOString()
                                }
                            });
                        } else {
                            observer.next({
                                status: 'ERROR',
                                message: res.mensaje || 'No se pudo realizar el check-in.'
                            });
                        }
                        observer.complete();
                    },
                    error: (err) => {
                        console.error('⚠️ [API Error] /Asistentes/check-in-publico error:', err);
                        
                        let errorMessage = 'Error al realizar check-in.';
                        let isDuplicate = false;
 
                        if (err.error && typeof err.error === 'object') {
                            errorMessage = err.error.mensaje || errorMessage;
                            if (err.error.exito === false || err.error.estatus === 'DUPLICADO') {
                                const msg = String(err.error.mensaje).toLowerCase();
                                if (msg.includes('ya se registró') || msg.includes('asistio') || msg.includes('duplicado') || err.error.estatus === 'DUPLICADO') {
                                    isDuplicate = true;
                                }
                            }
                        } else if (err.error && typeof err.error === 'string') {
                            errorMessage = err.error;
                        }
 
                        const asistente = this._asistentes.value.find(a => a.tokenQr === tokenQR);
                        if (isDuplicate) {
                            observer.next({
                                status: 'DUPLICADO',
                                message: errorMessage,
                                asistente: {
                                    id: asistente ? asistente.id : 0,
                                    personalStaffId: err.error?.personalStaffId,
                                    nombreCompleto: err.error?.nombreCompleto || (asistente ? `${asistente.nombre} ${asistente.apellidos}` : 'Visitante'),
                                    fechaCheckIn: err.error?.fechaCheckIn ? new Date(err.error.fechaCheckIn).toLocaleString() : (asistente?.fechaCheckIn || new Date().toLocaleString())
                                }
                            });
                        } else {
                            observer.next({
                                status: 'ERROR',
                                message: errorMessage
                            });
                        }
                        observer.complete();
                    }
                });
        });
    }

    // --- State helpers ---

    private loadAsistentesPorEvento(eventoId: number): void {
        this._http.get<any[]>(`${this.apiBase}/Asistentes/evento/${eventoId}`)
            .subscribe({
                next: (list) => {
                    if (list) {
                        const mappedList: Asistente[] = list.map(item => {
                            const asistencias: string[] = (item.fechasAsistencia || []).map((dateStr: string) => {
                                if (dateStr.includes('-10-16')) return '16 de Octubre';
                                if (dateStr.includes('-10-17')) return '17 de Octubre';
                                return dateStr;
                            });

                            return {
                                id: item.id,
                                tokenQr: item.tokenQR,
                                nombre: item.nombre,
                                apellidos: item.apellidos,
                                correo: item.correoElectronico,
                                telefono: item.numeroTelefonico,
                                tipo: item.tipoAsistente as 'General' | 'Estudiante',
                                asistencias: asistencias,
                                comoSeEntero: item.mediosDifusion || [],
                                motivacion: item.motivaciones || [],
                                estatusQR: item.procesadoWorker === 1 ? 'Enviado' : 'Pendiente',
                                asistencia: item.asistio === 1 ? 'Presente' : 'Faltante',
                                fechaCheckIn: item.fechaCheckIn ? new Date(item.fechaCheckIn).toLocaleString('es-MX', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                }) : undefined,
                                fechaCheckInRaw: item.fechaCheckIn || undefined,
                                medioSeguimiento: item.medioSeguimientoDeseado as 'Correo' | 'WhatsApp' | 'Ninguno',
                                direccion: item.direccionCiudadEstado,
                                ocupacion: item.ocupacionCargo,
                                empresa: item.empresaRepresenta,
                                universidad: item.universidadRepresentas,
                                carrera: item.carreraCursas,
                                eventoId: item.eventoId
                            };
                        });
                        this._asistentes.next(mappedList);
                    } else {
                        this._asistentes.next([]);
                    }
                    this.loadDashboardMetrics(eventoId);
                },
                error: (err) => {
                    console.error(`⚠️ [API Error] GET /Asistentes/evento/${eventoId} failed:`, err);
                    this._asistentes.next([]);
                    this.loadDashboardMetrics(eventoId);
                }
            });
    }

    private generateGuid(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // --- Talleres / Actividades HTTP Client Methods ---

    public loadTalleresMetrics(eventoId: number): void {
        this._http.get<ActividadMetricsDto[]>(`${this.apiBase}/Asistentes/talleres-metrics/${eventoId}`)
            .subscribe({
                next: (res) => {
                    if (res) {
                        this._talleresMetrics.next(res);
                    }
                },
                error: (err) => {
                    console.error('⚠️ [API Error] Failed to load talleres metrics:', err);
                }
            });
    }

    public getTalleresPorEvento(eventoId: number): Observable<Actividad[]> {
        return this._http.get<Actividad[]>(`${this.apiBase}/Asistentes/talleres/${eventoId}`);
    }

    public crearTaller(taller: any): Observable<Actividad> {
        return this._http.post<Actividad>(`${this.apiBase}/Asistentes/talleres`, taller);
    }

    public editarTaller(id: number, taller: any): Observable<Actividad> {
        return this._http.put<Actividad>(`${this.apiBase}/Asistentes/talleres/${id}`, taller);
    }

    public getTalleresPreasignados(asistenteId: number): Observable<number[]> {
        return this._http.get<number[]>(`${this.apiBase}/Asistentes/${asistenteId}/talleres-pago`);
    }

    public preAsignarTalleres(payload: { asistenteId: number; actividadIds: number[] }): Observable<any> {
        return this._http.post<any>(`${this.apiBase}/Asistentes/pre-asignar-talleres`, payload);
    }

    public checkInTaller(tokenQR: string, actividadId: number): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'X-Staff-Event-Key': 'ForoEnergizaPachuca_Key_2026'
        });
        const body = { tokenQr: tokenQR, actividadId: actividadId };
        return this._http.post<any>(`${this.apiBase}/Asistentes/check-in-taller`, body, { headers });
    }

    // --- Dynamic Events Catalog API ---
    public loadEventos(): void {
        this._http.get<any[]>(`${this.apiBase}/Eventos`)
            .subscribe({
                next: (list) => {
                    if (list) {
                        const mapped: EventoEdicion[] = list.map(e => ({
                            id: e.id,
                            nombre: e.nombreNovedad,
                            anio: e.anio
                        }));
                        this._ediciones.next(mapped);

                        // If selectedEventoId is not in the list, default to first one
                        if (mapped.length > 0 && !mapped.some(m => m.id === this._selectedEventoId.value)) {
                            // Find active one first
                            const active = list.find(e => e.activo);
                            this._selectedEventoId.next(active ? active.id : mapped[0].id);
                        }
                    }
                },
                error: (err) => {
                    console.error('⚠️ [API Error] Failed to load dynamic events:', err);
                }
            });
    }

    public getEventosCompletos(): Observable<any[]> {
        return this._http.get<any[]>(`${this.apiBase}/Eventos`);
    }

    public saveEvento(evento: any): Observable<any> {
        return this._http.post<any>(`${this.apiBase}/Eventos`, evento);
    }

    public deleteEvento(id: number): Observable<any> {
        return this._http.delete<any>(`${this.apiBase}/Eventos/${id}`);
    }
}
