import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { ActivitySignalRService, ActivityLog } from '../../../../core/signalr/activity-signalr.service';
import {
    INITIAL_NEURAL_NODES,
    INITIAL_NEURAL_LINKS,
    NeuralNode,
    NeuralLink,
    SynapticPulse,
    SynapseLog
} from './neural-graph.data';

@Injectable({
    providedIn: 'root'
})
export class NeuralGraphService {
    private _activitySignalR = inject(ActivitySignalRService);

    private _nodes = new BehaviorSubject<NeuralNode[]>(JSON.parse(JSON.stringify(INITIAL_NEURAL_NODES)));
    public nodes$ = this._nodes.asObservable();

    private _links = new BehaviorSubject<NeuralLink[]>(JSON.parse(JSON.stringify(INITIAL_NEURAL_LINKS)));
    public links$ = this._links.asObservable();

    private _pulses = new BehaviorSubject<SynapticPulse[]>([]);
    public pulses$ = this._pulses.asObservable();

    private _logs = new BehaviorSubject<SynapseLog[]>([]);
    public logs$ = this._logs.asObservable();

    // Métricas en vivo
    private _synapsesPerSecond = new BehaviorSubject<number>(0);
    public synapsesPerSecond$ = this._synapsesPerSecond.asObservable();

    private _totalSynapses = new BehaviorSubject<number>(0);
    public totalSynapses$ = this._totalSynapses.asObservable();

    private _isAutoDemoActive = new BehaviorSubject<boolean>(false);
    public isAutoDemoActive$ = this._isAutoDemoActive.asObservable();

    private _signalRSubscription: Subscription | null = null;
    private _demoInterval: any = null;
    private _hzCounter = 0;
    private _hzTimer: any = null;

    constructor() {
        this.initSignalRListener();
        this.startHzCalculator();
    }

    /**
     * Escucha movimientos reales provenientes del Hub de Navegación
     */
    private initSignalRListener(): void {
        this._activitySignalR.startConnection();
        this._signalRSubscription = this._activitySignalR.movimientos$.subscribe((mov: ActivityLog) => {
            if (!mov) return;
            this.handleIncomingMovement(mov);
        });
    }

    /**
     * Mapea un movimiento real del usuario a un disparo sináptico en la red
     */
    public handleIncomingMovement(mov: ActivityLog): void {
        const userName = mov.nombreUsuario || 'Usuario JR';
        const modulo = (mov.modulo || '').toLowerCase();

        // Identificar nodo de usuario
        let userId = 'user_operativo';
        if (userName.toLowerCase().includes('ricardo')) userId = 'user_ricardo';
        else if (userName.toLowerCase().includes('marlon')) userId = 'user_marlon';

        // Identificar módulo
        let modId = 'mod_cotizaciones';
        let ctrlId = 'api_cotizacion_ctrl';
        let dbId = 'db_sql_server';

        if (modulo.includes('gasto') || modulo.includes('viatico')) {
            modId = 'mod_gastos';
            ctrlId = 'api_solicitudes_ctrl';
            dbId = 'db_sql_server';
        } else if (modulo.includes('compra') || modulo.includes('solicitud')) {
            modId = 'mod_compras';
            ctrlId = 'api_solicitudes_ctrl';
            dbId = 'db_sql_server';
        } else if (modulo.includes('proyecto') || modulo.includes('seguimiento') || modulo.includes('obra')) {
            modId = 'mod_proyectos';
            ctrlId = 'api_proyectos_ctrl';
            dbId = 'db_sql_server';
        } else if (modulo.includes('iso') || modulo.includes('evento') || modulo.includes('stand')) {
            modId = 'mod_iso_eventos';
            ctrlId = 'api_navegacion_hub';
            dbId = 'db_sql_server';
        }

        this.fireSynapticCascade({
            userId,
            modId,
            serviceId: 'srv_http_interceptor',
            ctrlId,
            dbId,
            userName,
            moduleName: mov.modulo || 'Módulo',
            actionName: mov.accion || 'Navegación / Vista'
        });
    }

    /**
     * Dispara una cascada completa de impulsos: Usuario -> Modulo -> Servicio -> Controller -> BD -> Retorno
     */
    public fireSynapticCascade(params: {
        userId: string;
        modId: string;
        serviceId: string;
        ctrlId: string;
        dbId: string;
        userName: string;
        moduleName: string;
        actionName: string;
        isError?: boolean;
    }): void {
        this._hzCounter++;
        this._totalSynapses.next(this._totalSynapses.value + 1);

        const latency = Math.floor(Math.random() * 45) + 35; // 35 - 80ms típico
        const pulseColor = params.isError ? '#FF0055' : '#00F0FF';
        const glowColor = params.isError ? 'rgba(255, 0, 85, 0.9)' : 'rgba(0, 240, 255, 0.9)';

        // 1. Activar nodo de usuario
        this.activateNode(params.userId, 1.0);

        // 2. Pulso Usuario -> Módulo
        setTimeout(() => {
            this.emitPulse(params.userId, params.modId, pulseColor, glowColor, 0.04);
            this.activateNode(params.modId, 1.0);
        }, 50);

        // 3. Pulso Módulo -> Interceptor
        setTimeout(() => {
            this.emitPulse(params.modId, params.serviceId, pulseColor, glowColor, 0.045);
            this.activateNode(params.serviceId, 0.9);
        }, 220);

        // 4. Pulso Interceptor -> Controller
        setTimeout(() => {
            this.emitPulse(params.serviceId, params.ctrlId, pulseColor, glowColor, 0.05);
            this.activateNode(params.ctrlId, 1.0);
        }, 400);

        // 5. Pulso Controller -> Base de Datos / Externo
        setTimeout(() => {
            this.emitPulse(params.ctrlId, params.dbId, pulseColor, glowColor, 0.045);
            this.activateNode(params.dbId, 1.0);
        }, 600);

        // 6. IMPULSO DE RETORNO (Response 200 OK / Feedback)
        setTimeout(() => {
            const returnColor = params.isError ? '#FF0055' : '#00FF88';
            const returnGlow = params.isError ? 'rgba(255, 0, 85, 0.9)' : 'rgba(0, 255, 136, 0.9)';

            // Retorno BD -> Controller -> Modulo -> Usuario
            this.emitPulse(params.dbId, params.ctrlId, returnColor, returnGlow, 0.06, 'backward');
            setTimeout(() => {
                this.emitPulse(params.ctrlId, params.modId, returnColor, returnGlow, 0.07, 'backward');
            }, 120);
            setTimeout(() => {
                this.emitPulse(params.modId, params.userId, returnColor, returnGlow, 0.08, 'backward');
            }, 240);

            // Registrar Log
            this.addSynapseLog({
                id: Math.random().toString(36).substring(2, 9),
                timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                userName: params.userName,
                module: params.moduleName,
                action: params.actionName,
                pathDescription: `${params.userName} ➔ ${params.moduleName} ➔ API ➔ ${params.dbId === 'db_contpaqi' ? 'CONTPAQi' : 'SQL Server'} (200 OK)`,
                latencyMs: latency,
                status: params.isError ? 'error' : 'success'
            });
        }, 800);
    }

    /**
     * Agrega un pulso viajero al sistema
     */
    public emitPulse(
        sourceId: string,
        targetId: string,
        color: string,
        glowColor: string,
        speed: number = 0.04,
        direction: 'forward' | 'backward' = 'forward',
        isError: boolean = false
    ): void {
        const pulse: SynapticPulse = {
            id: Math.random().toString(36).substring(2, 9),
            sourceId,
            targetId,
            progress: 0,
            speed,
            color,
            glowColor,
            size: direction === 'forward' ? 5.5 : 4.5,
            trailLength: 6,
            direction,
            isError
        };

        const current = this._pulses.value;
        this._pulses.next([...current, pulse]);
    }

    /**
     * Activa visualmente un nodo (efecto spike / resplandor)
     */
    public activateNode(nodeId: string, intensity: number = 1.0): void {
        const nodes = this._nodes.value;
        const target = nodes.find(n => n.id === nodeId);
        if (target) {
            target.pulseIntensity = Math.min(1.0, target.pulseIntensity + intensity);
            target.lastActivated = Date.now();
            target.status = 'firing';
            this._nodes.next([...nodes]);
        }
    }

    /**
     * Añade un log al historial en memoria (máximo 50 registros)
     */
    private addSynapseLog(log: SynapseLog): void {
        const currentLogs = this._logs.value;
        this._logs.next([log, ...currentLogs.slice(0, 49)]);
    }

    /**
     * Activa / desactiva el modo de demostración automática
     */
    public toggleAutoDemo(): boolean {
        const newState = !this._isAutoDemoActive.value;
        this._isAutoDemoActive.next(newState);

        if (newState) {
            this.startAutoDemo();
        } else {
            this.stopAutoDemo();
        }

        return newState;
    }

    private startAutoDemo(): void {
        this.stopAutoDemo();
        const demoScenarios = [
            {
                userId: 'user_ricardo',
                modId: 'mod_cotizaciones',
                serviceId: 'srv_cotizacion_ts',
                ctrlId: 'api_cotizacion_ctrl',
                dbId: 'db_contpaqi',
                userName: 'Ricardo Méndez',
                moduleName: 'Cotizaciones',
                actionName: 'Generar cotización comercial'
            },
            {
                userId: 'user_marlon',
                modId: 'mod_proyectos',
                serviceId: 'srv_http_interceptor',
                ctrlId: 'api_proyectos_ctrl',
                dbId: 'db_sql_server',
                userName: 'Marlon Santos',
                moduleName: 'Seguimiento de Obra',
                actionName: 'Actualizar avance de cuadrilla'
            },
            {
                userId: 'user_operativo',
                modId: 'mod_compras',
                serviceId: 'srv_http_interceptor',
                ctrlId: 'api_solicitudes_ctrl',
                dbId: 'db_sql_server',
                userName: 'Staff Operativo',
                moduleName: 'Solicitudes Compra',
                actionName: 'Autorizar orden de compra'
            },
            {
                userId: 'user_ricardo',
                modId: 'mod_gastos',
                serviceId: 'srv_http_interceptor',
                ctrlId: 'api_solicitudes_ctrl',
                dbId: 'db_sql_server',
                userName: 'Ricardo Méndez',
                moduleName: 'Gastos & Viáticos',
                actionName: 'Validar comprobante fiscal XML'
            },
            {
                userId: 'user_operativo',
                modId: 'mod_iso_eventos',
                serviceId: 'srv_signalr_client',
                ctrlId: 'api_navegacion_hub',
                dbId: 'ext_whatsapp_meta',
                userName: 'Staff Operativo',
                moduleName: 'Eventos & QR',
                actionName: 'Envío de pase y bienvenida'
            }
        ];

        let index = 0;
        this._demoInterval = setInterval(() => {
            const scenario = demoScenarios[index % demoScenarios.length];
            this.fireSynapticCascade(scenario);
            index++;
        }, 1800);
    }

    private stopAutoDemo(): void {
        if (this._demoInterval) {
            clearInterval(this._demoInterval);
            this._demoInterval = null;
        }
    }

    /**
     * Disparo manual de prueba
     */
    public triggerManualSpike(scenarioIndex: number = 0): void {
        const scenarios = [
            {
                userId: 'user_ricardo',
                modId: 'mod_cotizaciones',
                serviceId: 'srv_cotizacion_ts',
                ctrlId: 'api_cotizacion_ctrl',
                dbId: 'db_contpaqi',
                userName: 'Ricardo Méndez',
                moduleName: 'Cotizaciones',
                actionName: 'Sincronizar con CONTPAQi'
            },
            {
                userId: 'user_marlon',
                modId: 'mod_proyectos',
                serviceId: 'srv_http_interceptor',
                ctrlId: 'api_proyectos_ctrl',
                dbId: 'db_sql_server',
                userName: 'Marlon Santos',
                moduleName: 'Control de Ejecución',
                actionName: 'Registro de mano de obra'
            },
            {
                userId: 'user_operativo',
                modId: 'mod_iso_eventos',
                serviceId: 'srv_signalr_client',
                ctrlId: 'api_navegacion_hub',
                dbId: 'ext_gemini_ai',
                userName: 'Staff Operativo',
                moduleName: 'Rayito IA',
                actionName: 'Consulta de auditoría ISO-9001'
            }
        ];

        const target = scenarios[scenarioIndex % scenarios.length];
        this.fireSynapticCascade(target);
    }

    /**
     * Medidor de frecuencia sináptica (Hz)
     */
    private startHzCalculator(): void {
        this._hzTimer = setInterval(() => {
            this._synapsesPerSecond.next(this._hzCounter);
            this._hzCounter = 0;
        }, 1000);
    }

    public updatePulses(newPulses: SynapticPulse[]): void {
        this._pulses.next(newPulses);
    }

    public updateNodes(nodes: NeuralNode[]): void {
        this._nodes.next(nodes);
    }

    public cleanup(): void {
        this.stopAutoDemo();
        if (this._signalRSubscription) {
            this._signalRSubscription.unsubscribe();
        }
        if (this._hzTimer) {
            clearInterval(this._hzTimer);
        }
    }
}
