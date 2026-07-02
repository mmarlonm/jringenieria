import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-scanner-agenda',
    templateUrl: './scanner-agenda.component.html',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        RouterModule,
        MatButtonModule,
        MatIconModule
    ]
})
export class ScannerAgendaComponent implements OnInit, AfterViewInit, OnDestroy {

    status: 'idle' | 'scanning' | 'success' | 'error' = 'idle';
    statusMessage: string = 'Preparando cámara...';
    cameraError: string = '';

    private _html5QrCode: any = null;

    constructor(private _router: Router, private _cdr: ChangeDetectorRef) {}

    ngOnInit(): void {}

    ngAfterViewInit(): void {
        this.loadScannerScript().then(() => {
            setTimeout(() => this.startCamera(), 150);
        }).catch(err => {
            console.error('Error loading QR scanner library', err);
            this.cameraError = 'No se pudo cargar la librería del escáner.';
            this._cdr.markForCheck();
        });
    }

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

    startCamera(): void {
        this.cameraError = '';
        this.status = 'idle';
        this._cdr.markForCheck();

        const Html5Qrcode = (window as any).Html5Qrcode;
        if (!Html5Qrcode) {
            this.cameraError = 'Librería de escáner no disponible.';
            this._cdr.markForCheck();
            return;
        }

        if (!window.isSecureContext) {
            this.cameraError = 'Para usar la cámara debes acceder por HTTPS o desde localhost.';
            this._cdr.markForCheck();
            return;
        }

        if (this._html5QrCode?.isScanning) return;

        try {
            if (!this._html5QrCode) {
                this._html5QrCode = new Html5Qrcode('reader-agenda');
            }
        } catch (e) {
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

        Html5Qrcode.getCameras().then((devices: any[]) => {
            if (devices && devices.length > 0) {
                let cameraId = devices[0].id;
                const backCamera = devices.find(d => {
                    const label = (d.label || '').toLowerCase();
                    return label.includes('back') || label.includes('rear') ||
                           label.includes('trasera') || label.includes('environment');
                });
                if (backCamera) cameraId = backCamera.id;

                return this._html5QrCode.start(
                    cameraId,
                    config,
                    (text: string) => this.onQrDetected(text),
                    () => { /* ignore frame errors */ }
                );
            } else {
                return this._html5QrCode.start(
                    { facingMode: 'environment' },
                    config,
                    (text: string) => this.onQrDetected(text),
                    () => { /* ignore frame errors */ }
                );
            }
        }).then(() => {
            this.status = 'scanning';
            this.statusMessage = 'Apunta al código QR de tu pase de staff';
            this._cdr.markForCheck();
        }).catch((err: any) => {
            console.warn('getCameras failed, trying facingMode fallback:', err);
            if (this._html5QrCode) {
                return this._html5QrCode.start(
                    { facingMode: 'environment' },
                    config,
                    (text: string) => this.onQrDetected(text),
                    () => {}
                ).then(() => {
                    this.status = 'scanning';
                    this.statusMessage = 'Apunta al código QR de tu pase de staff';
                    this._cdr.markForCheck();
                }).catch((fallbackErr: any) => {
                    console.error('Camera start failed completely:', fallbackErr);
                    this.cameraError = 'No se pudo iniciar la cámara. Verifica los permisos de acceso.';
                    this._cdr.markForCheck();
                });
            }
        });
    }

    onQrDetected(rawValue: string): void {
        this.stopCamera().then(() => {
            // Extract token from URL or raw UUID
            const agendaMatch = rawValue.match(/agenda-personal\/([0-9a-f\-]{36})/i);
            const fichaMatch  = rawValue.match(/ficha-personal\/([0-9a-f\-]{36})/i);
            const uuidMatch   = rawValue.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

            const token = agendaMatch?.[1] ?? fichaMatch?.[1] ?? (uuidMatch ? rawValue : null);

            if (token) {
                this.status = 'success';
                this.statusMessage = '¡QR detectado! Cargando tu agenda...';
                this._cdr.markForCheck();
                setTimeout(() => {
                    this._router.navigate(['/eventos/agenda-personal', token]);
                }, 800);
            } else {
                this.status = 'error';
                this.statusMessage = 'QR no reconocido. Escanea el QR de tu pase de staff.';
                this._cdr.markForCheck();
                setTimeout(() => {
                    this.startCamera();
                }, 2500);
            }
        });
    }

    stopCamera(): Promise<void> {
        if (this._html5QrCode?.isScanning) {
            return this._html5QrCode.stop().then(() => {
                this._html5QrCode = null;
                this._cdr.markForCheck();
            }).catch((err: any) => {
                console.error('Error stopping camera:', err);
                this._html5QrCode = null;
            });
        }
        this._html5QrCode = null;
        return Promise.resolve();
    }

    ngOnDestroy(): void {
        this.stopCamera();
    }
}
