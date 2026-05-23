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

@Injectable({
    providedIn: 'root'
})
export class EventosService implements OnDestroy {
    private _http = inject(HttpClient);
    
    // API Routes
    private readonly apiBase = environment.apiUrl;
    private readonly signalRBase = environment.apiUrlSignal;

    // Available Editions
    public readonly ediciones: EventoEdicion[] = [
        { id: 2026, nombre: 'Foro Energiza 2026', anio: 2026 },
        { id: 2027, nombre: 'Edición 2027', anio: 2027 },
        { id: 2028, nombre: 'Edición 2028', anio: 2028 }
    ];

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

    // SignalR Variables
    private hubConnection: signalR.HubConnection | null = null;
    private _signalrStatus = new BehaviorSubject<'Connected' | 'Disconnected' | 'Reconnecting' | 'Connecting'>('Disconnected');
    public signalrStatus$ = this._signalrStatus.asObservable();



    private destroy$ = new Subject<void>();

    constructor() {
        // Listen to active edition change to reload real lists and restart SignalR
        this._selectedEventoId
            .pipe(takeUntil(this.destroy$))
            .subscribe(eventoId => {
                this.loadAsistentesPorEvento(eventoId);
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
    public checkInPublico(tokenQR: string): Observable<any> {
        return new Observable<any>(observer => {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'X-Staff-Event-Key': 'ForoEnergizaPachuca_Key_2026'
            });

            this._http.post<any>(`${this.apiBase}/Asistentes/check-in-publico`, JSON.stringify(tokenQR), { headers })
                .subscribe({
                    next: (res) => {
                        if (res && res.exito) {
                            const evId = this._selectedEventoId.value;
                            this.loadAsistentesPorEvento(evId);

                            const asistente = this._asistentes.value.find(a => a.tokenQr === tokenQR);
                            observer.next({
                                status: 'SUCCESS',
                                message: res.mensaje || '¡Acceso Autorizado!',
                                asistente: asistente ? {
                                    id: asistente.id,
                                    nombreCompleto: `${asistente.nombre} ${asistente.apellidos}`,
                                    tipo: asistente.tipo,
                                    organizacion: asistente.tipo === 'General' ? (asistente.empresa || 'Ninguna') : (asistente.universidad || 'Ninguna'),
                                    fechaCheckIn: new Date().toISOString()
                                } : { nombreCompleto: 'Visitante' }
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
                            if (err.error.exito === false) {
                                const msg = String(err.error.mensaje).toLowerCase();
                                if (msg.includes('ya se registró') || msg.includes('asistio') || msg.includes('duplicado')) {
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
                                asistente: asistente ? {
                                    id: asistente.id,
                                    nombreCompleto: `${asistente.nombre} ${asistente.apellidos}`,
                                    fechaCheckIn: asistente.fechaCheckIn || new Date().toLocaleString()
                                } : { nombreCompleto: 'Visitante' }
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
}
