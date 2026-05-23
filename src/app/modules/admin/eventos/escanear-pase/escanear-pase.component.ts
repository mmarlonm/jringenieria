import { Component, OnInit, OnDestroy, AfterViewInit, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { EventosService } from '../eventos.service';

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

    // State Variables
    public scanState: 'idle' | 'scanning' | 'success' | 'duplicate' | 'error' = 'idle';
    public scanResult: any = null;
    public tokenInput: string = '';
    public cameraError: string = '';

    private _html5QrCode: any = null;

    // Quick Test Options (derived from service assistants)
    public availableTickets: { label: string; token: string; status: 'present' | 'absent' }[] = [];

    ngOnInit(): void {
        // Load assistants to populate helper quick-scan buttons for the operator
        this._eventosService.asistentes$.subscribe(list => {
            if (list.length > 0) {
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
            return;
        }

        // Initialize/Recreate scanner instance to avoid internal state machine conflicts
        try {
            this._html5QrCode = new Html5Qrcode("reader");
        } catch (e) {
            console.error("Error creating Html5Qrcode instance: ", e);
            return;
        }

        const config = { 
            fps: 10, 
            qrbox: (width: number, height: number) => {
                const size = Math.min(width, height) * 0.75;
                return { width: size, height: size };
            }
        };

        this._html5QrCode.start(
            { facingMode: "environment" }, 
            config, 
            (decodedText: string) => {
                this.onScanToken(decodedText);
            },
            (errorMessage: string) => {
                // Ignore verbose non-detection frame logging
            }
        ).catch((err: any) => {
            console.error("No se pudo iniciar la cámara: ", err);
            this.cameraError = 'No se pudo iniciar la cámara. Asegúrese de otorgar permisos de acceso.';
            this._cdr.markForCheck();
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
        
        // Stop the camera as soon as a scan is detected, then send to backend
        this.stopCamera().then(() => {
            this.tokenInput = token;
            this.scanState = 'scanning';
            this.scanResult = null;
            this._cdr.markForCheck();

            // Perform backend check-in directly
            this._eventosService.checkInPublico(token).subscribe({
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
                    this.scanState = 'error';
                    this.scanResult = { message: err?.error?.mensaje || 'Error al conectar con el servidor.' };
                    this.playBeep('error');
                    this._cdr.markForCheck();
                }
            });
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
