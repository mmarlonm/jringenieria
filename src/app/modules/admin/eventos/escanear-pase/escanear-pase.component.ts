import { Component, OnInit, OnDestroy, AfterViewInit, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { EventosService, ActividadMetricsDto, Actividad, EventoEdicion } from '../eventos.service';
import { environment } from 'environments/environment';

@Component({
    selector: 'escanear-pase',
    templateUrl: './escanear-pase.component.html',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatIconModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EscanearPaseComponent implements OnInit, OnDestroy, AfterViewInit {
    private _eventosService = inject(EventosService);
    private _cdr = inject(ChangeDetectorRef);

    // Scan Mode: 'general' (Entrada General) or activity ID (number)
    public scanMode: 'general' | number = 'general';
    public availableTalleres: Actividad[] = [];
    public selectedTallerMetrics: ActividadMetricsDto | null = null;
    public selectedEventoId: number = 2026;
    public ediciones: EventoEdicion[] = [];

    // State Variables
    public scanState: 'idle' | 'scanning' | 'success' | 'duplicate' | 'error' = 'idle';
    public scanResult: any = null;
    public tokenInput: string = '';
    public cameraError: string = '';
    public cupoSobrepasado: boolean = false; // bandera de advertencia sin bloquear acceso

    // Offline / Network variables
    public isOnline: boolean = true;
    public pendingCheckInsCount: number = 0;
    private db: IDBDatabase | null = null;

    private _html5QrCode: any = null;

    // Quick Test Options (derived from service assistants)
    public availableTickets: { label: string; token: string; status: 'present' | 'absent' }[] = [];

    ngOnInit(): void {
        // Initial network status check
        this.isOnline = navigator.onLine;
        window.addEventListener('online', this.onNetworkOnline);
        window.addEventListener('offline', this.onNetworkOffline);

        // Open IndexedDB
        this.initIndexedDB().then(() => {
            this.updatePendingCount();
            this.syncOfflineCheckIns();
        });

        // Subscribe to Editions list
        this._eventosService.ediciones$.subscribe(list => {
            this.ediciones = list || [];
            this._cdr.markForCheck();
        });

        // Subscribe to Selected Event ID
        this._eventosService.selectedEventoId$.subscribe(id => {
            this.selectedEventoId = id;
            this.loadAvailableTalleres();
            this.syncServerAsistentesToLocalDB();
            this._cdr.markForCheck();
        });

        // Watch workshop metrics to keep capacity indicator updated in real-time
        this._eventosService.talleresMetrics$.subscribe(metrics => {
            this.updateSelectedTallerMetrics(metrics);
        });

        // Load assistants to populate helper quick-scan buttons for the operator
        this._eventosService.asistentes$.subscribe(list => {
            if (list.length > 0) {
                // Cache assistants list to IndexedDB whenever it's updated from the server
                this.saveAsistentesToLocalDB(list);

                const absentList = list.filter(a => a.asistencia === 'Faltante').slice(0, 3);
                const presentList = list.filter(a => a.asistencia === 'Presente').slice(0, 2);

                this.availableTickets = [
                    ...absentList.map(a => ({
                        label: `Éxito: ${a.nombre} ${a.apellidos.substring(0,1)}. (${a.tipo})`,
                        token: a.tokenQr,
                        status: 'absent' as const
                    })),
                    ...presentList.map(a => ({
                        label: `Duplicado: ${a.nombre} ${a.apellidos.substring(0,1)}.`,
                        token: a.tokenQr,
                        status: 'present' as const
                    })),
                    {
                        label: 'Error: Código Inválido',
                        token: '00000000-0000-0000-0000-000000000000',
                        status: 'absent' as const
                    }
                ];
                this._cdr.markForCheck();
            }
        });
    }

    public get now(): Date {
        return new Date();
    }

    public getStaffPhotoUrl(id: number): string {
        return `${environment.apiUrl}/PersonalStaff/photo/${id}`;
    }

    // --- Loading Workshops ---
    public loadAvailableTalleres(): void {
        this._eventosService.getTalleresPorEvento(this.selectedEventoId).subscribe({
            next: (list) => {
                this.availableTalleres = list || [];
                this._cdr.markForCheck();
            },
            error: (err) => {
                console.error('Error loading talleres for scanner dropdown:', err);
            }
        });
    }

    public onEventoChanged(eventoId: any): void {
        this._eventosService.setSeleccionEdicion(Number(eventoId));
    }

    public onModeChange(): void {
        const metrics = this._eventosService.talleresMetricsValue;
        this.updateSelectedTallerMetrics(metrics);
        
        // Reset camera scanning and restart it
        this.stopCamera().then(() => {
            this.scanState = 'idle';
            this.scanResult = null;
            this.tokenInput = '';
            this._cdr.markForCheck();
            setTimeout(() => {
                this.startCamera();
            }, 150);
        });
    }

    private updateSelectedTallerMetrics(metrics: ActividadMetricsDto[]): void {
        if (this.scanMode === 'general') {
            this.selectedTallerMetrics = null;
        } else {
            const tallerId = Number(this.scanMode);
            this.selectedTallerMetrics = (metrics || []).find(m => m.actividadId === tallerId) || null;
        }
        this._cdr.markForCheck();
    }

    ngAfterViewInit(): void {
        // Load scanner library and initialize
        this.loadScannerScript().then(() => {
            setTimeout(() => {
                this.startCamera();
            }, 150);
        }).catch(err => {
            console.error('Error loading QR Scanner library', err);
            this.cameraError = 'No se pudo cargar la librería del escáner.';
            this._cdr.markForCheck();
        });
    }

    ngOnDestroy(): void {
        this.stopCamera();
        window.removeEventListener('online', this.onNetworkOnline);
        window.removeEventListener('offline', this.onNetworkOffline);
    }

    // --- Dynamic Script Loader ---
    private loadScannerScript(): Promise<void> {
        return new Promise((resolve, reject) => {
            if ((window as any).Html5Qrcode) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/html5-qrcode';
            script.type = 'text/javascript';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = (err) => reject(err);
            document.head.appendChild(script);
        });
    }

    // --- Camera Controls ---
    public startCamera(): void {
        this.cameraError = '';
        this._cdr.markForCheck();

        const Html5Qrcode = (window as any).Html5Qrcode;
        if (!Html5Qrcode) {
            console.warn('Html5Qrcode library not loaded.');
            this.cameraError = 'Librería de escáner no disponible.';
            this._cdr.markForCheck();
            return;
        }

        // Check if browser blocks camera access due to insecure context (HTTP)
        if (!window.isSecureContext) {
            console.warn('Insecure Context: Camera access is blocked by the browser.');
            this.cameraError = 'Para usar la cámara, debes usar HTTPS o localhost. En red local, inicia "ng serve --ssl" o agrega la URL a "Insecure origins treated as secure" en chrome://flags.';
            this._cdr.markForCheck();
            return;
        }

        if (this._html5QrCode && this._html5QrCode.isScanning) {
            console.log("Scanner is already running.");
            return;
        }

        try {
            if (!this._html5QrCode) {
                this._html5QrCode = new Html5Qrcode("reader");
            }
        } catch (e) {
            console.error("Error creating Html5Qrcode instance: ", e);
            this.cameraError = 'Error al inicializar el escáner.';
            this._cdr.markForCheck();
            return;
        }

        const config = { 
            fps: 10, 
            aspectRatio: 1.0,
            qrbox: (width: number, height: number) => {
                const size = Math.min(width, height) * 0.75;
                return { width: size, height: size };
            }
        };

        // Enumerate devices to request permission and choose the best camera
        Html5Qrcode.getCameras().then((devices: any[]) => {
            if (devices && devices.length > 0) {
                // Find a rear/back camera
                let cameraId = devices[0].id;
                const backCamera = devices.find(device => {
                    const label = (device.label || '').toLowerCase();
                    return label.includes('back') || 
                           label.includes('rear') || 
                           label.includes('trasera') || 
                           label.includes('ambiente') || 
                           label.includes('environment') || 
                           label.includes('dir 1') || 
                           label.includes('secondary');
                });
                
                if (backCamera) {
                    cameraId = backCamera.id;
                    console.log("Using back camera:", backCamera.label);
                } else {
                    console.log("No explicit back camera found, using default:", devices[0].label);
                }

                return this._html5QrCode.start(
                    cameraId, 
                    config, 
                    (decodedText: string) => this.onScanToken(decodedText),
                    (errorMessage: string) => { /* ignore */ }
                );
            } else {
                console.warn("No camera devices found, falling back to facingMode constraint");
                return this._html5QrCode.start(
                    { facingMode: "environment" }, 
                    config, 
                    (decodedText: string) => this.onScanToken(decodedText),
                    (errorMessage: string) => { /* ignore */ }
                );
            }
        }).catch((err: any) => {
            console.warn("getCameras or start failed, trying fallback facingMode directly:", err);
            if (this._html5QrCode) {
                return this._html5QrCode.start(
                    { facingMode: "environment" }, 
                    config, 
                    (decodedText: string) => this.onScanToken(decodedText),
                    (errorMessage: string) => { /* ignore */ }
                ).catch((fallbackErr: any) => {
                    console.error("Camera start failed completely: ", fallbackErr);
                    this.cameraError = 'No se pudo iniciar la cámara. Asegúrese de otorgar permisos de acceso y de que no esté en uso por otra aplicación.';
                    this._cdr.markForCheck();
                });
            }
        });
    }

    public stopCamera(): Promise<void> {
        if (this._html5QrCode && this._html5QrCode.isScanning) {
            return this._html5QrCode.stop().then(() => {
                this._html5QrCode = null;
                this._cdr.markForCheck();
            }).catch((err: any) => {
                console.error("Error stopping camera: ", err);
                this._html5QrCode = null;
            });
        }
        this._html5QrCode = null;
        return Promise.resolve();
    }

    // --- QR Scanning Flow ---
    public onScanToken(token: string): void {
        if (!token) return;
        
        // Stop the camera as soon as a scan is detected, then send to backend or process offline
        this.stopCamera().then(() => {
            this.tokenInput = token;
            this.scanState = 'scanning';
            this.scanResult = null;
            this._cdr.markForCheck();

            // Extract GUID from token if it's a public URL link
            let finalToken = token.trim();
            if (finalToken.includes('/')) {
                const parts = finalToken.split('/');
                const lastPart = parts[parts.length - 1];
                const guidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
                if (guidRegex.test(lastPart)) {
                    finalToken = lastPart;
                }
            }

            // Route check-in depending on connectivity status
            if (this.isOnline) {
                this.checkInOnline(finalToken);
            } else {
                this.checkInOffline(finalToken);
            }
        });
    }

    private checkInOnline(token: string): void {
        if (this.scanMode === 'general') {
            // Perform backend check-in directly, passing active event ID
            this._eventosService.checkInPublico(token, this.selectedEventoId).subscribe({
                next: (res) => {
                    if (res.status === 'SUCCESS') {
                        this.scanState = 'success';
                        this.scanResult = res.asistente;
                        this.playBeep('success');
                    } else if (res.status === 'DUPLICADO') {
                        this.scanState = 'duplicate';
                        this.scanResult = res.asistente;
                        this.playBeep('warning');
                    } else {
                        this.scanState = 'error';
                        this.scanResult = { message: res.message };
                        this.playBeep('error');
                    }
                    this._cdr.markForCheck();
                },
                error: (err) => {
                    // Fall back to offline flow if HTTP call fails (e.g. timeout or network dropped mid-air)
                    console.warn('Network call failed, falling back to offline check-in', err);
                    this.checkInOffline(token);
                }
            });
        } else {
            // Taller o Conferencia específico
            const tallerId = Number(this.scanMode);
            this._eventosService.checkInTaller(token, tallerId).subscribe({
                next: (res) => {
                    this.scanResult = {
                        nombreCompleto: res.nombreAsistente,
                        tipo: res.tipoAsistente,
                        organizacion: res.organizacion,
                        fechaCheckIn: new Date().toISOString(),
                        mensaje: res.mensaje,
                        cupoSobrepasado: res.cupoSobrepasado
                    };
                    this.cupoSobrepasado = !!res.cupoSobrepasado;
                    
                    if (res.mensaje && res.mensaje.includes('Re-ingreso')) {
                        this.scanState = 'duplicate';
                        this.playBeep('warning');
                    } else if (res.cupoSobrepasado) {
                        this.scanState = 'success';
                        this.playBeep('warning');
                    } else {
                        this.scanState = 'success';
                        this.playBeep('success');
                    }
                    this._eventosService.loadTalleresMetrics(this.selectedEventoId);
                    this._cdr.markForCheck();
                },
                error: (err) => {
                    // Fall back to offline check-in if HTTP call fails
                    console.warn('Network call failed, falling back to offline check-in', err);
                    this.checkInOffline(token);
                }
            });
        }
    }

    private checkInOffline(token: string): void {
        this.getAsistenteFromLocalDB(token).then((asistente) => {
            if (!asistente) {
                // If not found in offline db, access denied
                this.scanState = 'error';
                this.scanResult = {
                    message: 'Pase Inválido. Código no encontrado en la base de datos local fuera de línea.'
                };
                this.playBeep('error');
                this._cdr.markForCheck();
                return;
            }

            // Check if already registered offline or already marked as Presente
            this.checkIfCheckInExistsLocal(token, this.scanMode).then((isDuplicateOffline) => {
                const isDuplicateOnline = asistente.asistencia === 'Presente';

                if (isDuplicateOffline || isDuplicateOnline) {
                    this.scanState = 'duplicate';
                    this.scanResult = {
                        nombreCompleto: `${asistente.nombre} ${asistente.apellidos}`,
                        fechaCheckIn: 'Escaneado previamente'
                    };
                    this.playBeep('warning');
                    this._cdr.markForCheck();
                } else {
                    // Successful Offline check-in
                    const offlineCheckIn = {
                        tokenQr: token,
                        scanMode: this.scanMode,
                        eventoId: this.selectedEventoId,
                        timestamp: new Date().toISOString()
                    };

                    this.saveOfflineCheckInToLocalDB(offlineCheckIn).then(() => {
                        this.scanState = 'success';
                        this.scanResult = {
                            nombreCompleto: `${asistente.nombre} ${asistente.apellidos}`,
                            tipo: asistente.tipo,
                            organizacion: asistente.empresa || asistente.universidad || 'Ninguna',
                            fechaCheckIn: offlineCheckIn.timestamp,
                            isOfflineScan: true
                        };
                        this.playBeep('success');
                        this.updatePendingCount();
                        this._cdr.markForCheck();
                    });
                }
            });
        }).catch((err) => {
            console.error('Error in offline check-in:', err);
            this.scanState = 'error';
            this.scanResult = { message: 'Error interno en la base de datos local.' };
            this.playBeep('error');
            this._cdr.markForCheck();
        });
    }

    // --- IndexedDB Local Database Logic ---

    private initIndexedDB(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('TuzoforumOfflineDB', 1);

            request.onupgradeneeded = (event: any) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('asistentes')) {
                    db.createObjectStore('asistentes', { keyPath: 'tokenQr' });
                }
                if (!db.objectStoreNames.contains('cola_checkins')) {
                    db.createObjectStore('cola_checkins', { autoIncrement: true });
                }
            };

            request.onsuccess = (event: any) => {
                this.db = event.target.result;
                console.log('📦 [IndexedDB] Database initialized successfully.');
                resolve();
            };

            request.onerror = (event: any) => {
                console.error('📦 [IndexedDB] Error initializing database:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    private saveAsistentesToLocalDB(asistentes: any[]): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) return resolve();
            const transaction = this.db.transaction(['asistentes'], 'readwrite');
            const store = transaction.objectStore(transaction.objectStoreNames[0]);

            // Clear old cache first
            store.clear();

            asistentes.forEach(a => {
                store.put(a);
            });

            transaction.oncomplete = () => {
                console.log(`📦 [IndexedDB] Cached ${asistentes.length} assistants to local DB.`);
                resolve();
            };

            transaction.onerror = (event: any) => {
                console.error('📦 [IndexedDB] Error caching assistants:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    private getAsistenteFromLocalDB(tokenQr: string): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.db) return resolve(null);
            const transaction = this.db.transaction(['asistentes'], 'readonly');
            const store = transaction.objectStore('asistentes');
            const request = store.get(tokenQr);

            request.onsuccess = (event: any) => {
                resolve(event.target.result || null);
            };

            request.onerror = (event: any) => {
                reject(event.target.error);
            };
        });
    }

    private saveOfflineCheckInToLocalDB(checkIn: any): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) return resolve();
            const transaction = this.db.transaction(['cola_checkins'], 'readwrite');
            const store = transaction.objectStore('cola_checkins');
            const request = store.add(checkIn);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = (event: any) => {
                reject(event.target.error);
            };
        });
    }

    private checkIfCheckInExistsLocal(tokenQr: string, scanMode: 'general' | number): Promise<boolean> {
        return new Promise((resolve) => {
            if (!this.db) return resolve(false);
            const transaction = this.db.transaction(['cola_checkins'], 'readonly');
            const store = transaction.objectStore('cola_checkins');
            const request = store.getAll();

            request.onsuccess = (event: any) => {
                const list = event.target.result || [];
                const found = list.some((item: any) => item.tokenQr === tokenQr && item.scanMode === scanMode);
                resolve(found);
            };

            request.onerror = () => {
                resolve(false);
            };
        });
    }

    private updatePendingCount(): void {
        if (!this.db) return;
        const transaction = this.db.transaction(['cola_checkins'], 'readonly');
        const store = transaction.objectStore('cola_checkins');
        const request = store.count();

        request.onsuccess = (event: any) => {
            this.pendingCheckInsCount = event.target.result || 0;
            this._cdr.markForCheck();
        };
    }

    private syncServerAsistentesToLocalDB(): void {
        if (this.isOnline) {
            // Service fetch logic automatically updates assistants BehaviorSubject, 
            // triggering saveAsistentesToLocalDB cached subscription above.
            this._eventosService.loadEventos();
        }
    }

    // --- Network Connectivity & Syncing Loop ---

    private onNetworkOnline = (): void => {
        this.isOnline = true;
        this._cdr.markForCheck();
        console.log('📡 [Network] Browser went ONLINE. Dispatching sync process.');
        this.syncOfflineCheckIns();
    };

    private onNetworkOffline = (): void => {
        this.isOnline = false;
        this._cdr.markForCheck();
        console.log('📡 [Network] Browser went OFFLINE.');
    };

    private syncOfflineCheckIns(): void {
        if (!this.isOnline || !this.db) return;

        const transaction = this.db.transaction(['cola_checkins'], 'readonly');
        const store = transaction.objectStore('cola_checkins');
        const request = store.getAll();

        request.onsuccess = (event: any) => {
            const list = event.target.result || [];
            if (list.length === 0) return;

            console.log(`📡 [Sync] Found ${list.length} offline check-ins to synchronize.`);
            this.processSyncQueue(list);
        };
    }

    private async processSyncQueue(queue: any[]): Promise<void> {
        for (const item of queue) {
            try {
                if (item.scanMode === 'general') {
                    await this._eventosService.checkInPublico(item.tokenQr, item.eventoId).toPromise();
                } else {
                    await this._eventosService.checkInTaller(item.tokenQr, Number(item.scanMode)).toPromise();
                }
                // Remove synced item from local DB
                await this.removeOfflineCheckInFromDB(item.tokenQr, item.scanMode);
            } catch (err) {
                console.error('📡 [Sync] Failed to sync item, will retry later:', item, err);
                break; // Stop sync queue loop if network drops again
            }
        }
        this.updatePendingCount();
        this.syncServerAsistentesToLocalDB();
    }

    private removeOfflineCheckInFromDB(tokenQr: string, scanMode: any): Promise<void> {
        return new Promise((resolve) => {
            if (!this.db) return resolve();
            const transaction = this.db.transaction(['cola_checkins'], 'readwrite');
            const store = transaction.objectStore('cola_checkins');
            const request = store.getAll();

            request.onsuccess = (event: any) => {
                const list = event.target.result || [];
                const target = list.find((item: any) => item.tokenQr === tokenQr && item.scanMode === scanMode);
                if (target) {
                    // IndexedDB requires primary key (auto-incremented ID or key)
                    // We open a cursor or use cursor deletion to delete the exact record matching.
                    const cursorRequest = store.openCursor();
                    cursorRequest.onsuccess = (cursorEvent: any) => {
                        const cursor = cursorEvent.target.result;
                        if (cursor) {
                            if (cursor.value.tokenQr === tokenQr && cursor.value.scanMode === scanMode) {
                                cursor.delete();
                                resolve();
                            } else {
                                cursor.continue();
                            }
                        } else {
                            resolve();
                        }
                    };
                } else {
                    resolve();
                }
            };
            request.onerror = () => resolve();
        });
    }

    public onScanManualSubmit(): void {
        if (this.tokenInput.trim()) {
            this.onScanToken(this.tokenInput.trim());
        }
    }

    public resetScanner(): void {
        this.scanState = 'idle';
        this.scanResult = null;
        this.tokenInput = '';
        this.cupoSobrepasado = false;
        this._cdr.markForCheck();
        
        // Wait 150ms for Angular DOM rendering to fully display the #reader container before starting camera
        setTimeout(() => {
            this.startCamera();
        }, 150);
    }

    // --- Audio Feedback Synth ---
    private playBeep(type: 'success' | 'warning' | 'error'): void {
        try {
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContextClass();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            if (type === 'success') {
                // High pitch short beep
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(950, audioCtx.currentTime);
                gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.12);
            } else if (type === 'warning') {
                // Two medium pitched drop beeps
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(580, audioCtx.currentTime);
                gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.15);
                
                setTimeout(() => {
                    const ctx2 = new AudioContextClass();
                    const osc2 = ctx2.createOscillator();
                    const gain2 = ctx2.createGain();
                    osc2.connect(gain2);
                    gain2.connect(ctx2.destination);
                    osc2.type = 'triangle';
                    osc2.frequency.setValueAtTime(580, ctx2.currentTime);
                    gain2.gain.setValueAtTime(0.12, ctx2.currentTime);
                    osc2.start();
                    osc2.stop(ctx2.currentTime + 0.15);
                }, 200);
            } else {
                // Low buzz error sound
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(180, audioCtx.currentTime);
                gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.4);
            }
        } catch (e) {
            console.warn('Audio Context is blocked or not supported on this browser.', e);
        }
    }
}
