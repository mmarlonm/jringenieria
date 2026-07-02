import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-scanner-agenda',
    templateUrl: './scanner-agenda.component.html',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule
    ]
})
export class ScannerAgendaComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('video') videoRef: ElementRef<HTMLVideoElement>;

    status: 'idle' | 'scanning' | 'success' | 'error' | 'unsupported' = 'idle';
    statusMessage: string = '';
    isCameraActive: boolean = false;
    isSupported: boolean = false;

    private stream: MediaStream | null = null;
    private scanInterval: any = null;

    constructor(private _router: Router, private _zone: NgZone) {}

    ngOnInit(): void {
        // Check BarcodeDetector support
        this.isSupported = 'BarcodeDetector' in window;
        if (!this.isSupported) {
            this.status = 'unsupported';
            this.statusMessage = 'Tu navegador no soporta el escáner QR integrado. Usa Google Chrome o Microsoft Edge actualizados, o accede directamente desde el enlace de tu correo.';
        }
    }

    ngAfterViewInit(): void {
        if (this.isSupported) {
            this.startCamera();
        }
    }

    async startCamera(): Promise<void> {
        this.status = 'scanning';
        this.statusMessage = 'Iniciando cámara...';

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });

            const video = this.videoRef.nativeElement;
            video.srcObject = this.stream;
            await video.play();
            this.isCameraActive = true;
            this.statusMessage = 'Apunta al código QR de tu pase de staff';

            this.startBarcodeDetection();
        } catch (err: any) {
            console.error(err);
            this.status = 'error';
            if (err?.name === 'NotAllowedError') {
                this.statusMessage = 'Permiso de cámara denegado. Habilita el acceso a la cámara en tu navegador e intenta de nuevo.';
            } else {
                this.statusMessage = 'No se pudo acceder a la cámara. Verifica los permisos de tu dispositivo.';
            }
        }
    }

    startBarcodeDetection(): void {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });

        this.scanInterval = setInterval(async () => {
            if (!this.isCameraActive) return;
            const video = this.videoRef?.nativeElement;
            if (!video || video.readyState < video.HAVE_ENOUGH_DATA) return;

            try {
                const barcodes = await detector.detect(video);
                if (barcodes.length > 0) {
                    this._zone.run(() => {
                        this.handleQrResult(barcodes[0].rawValue);
                    });
                }
            } catch { /* ignore frame errors */ }
        }, 400);
    }

    handleQrResult(rawValue: string): void {
        this.stopCamera();

        // Parse token from URL or raw UUID
        const agendaMatch = rawValue.match(/agenda-personal\/([0-9a-f\-]{36})/i);
        const fichaMatch  = rawValue.match(/ficha-personal\/([0-9a-f\-]{36})/i);
        const uuidMatch   = rawValue.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

        const token = agendaMatch?.[1] ?? fichaMatch?.[1] ?? (uuidMatch ? rawValue : null);

        if (token) {
            this.status = 'success';
            this.statusMessage = '¡QR detectado! Cargando tu agenda...';
            setTimeout(() => {
                this._router.navigate(['/eventos/agenda-personal', token]);
            }, 800);
        } else {
            this.status = 'error';
            this.statusMessage = 'QR no reconocido. Asegúrate de escanear el QR de tu pase de staff.';
            setTimeout(() => {
                this.status = 'scanning';
                this.statusMessage = 'Apunta al código QR de tu pase de staff';
                this.startCamera();
            }, 2500);
        }
    }

    retryCamera(): void {
        this.status = 'idle';
        this.startCamera();
    }

    stopCamera(): void {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
        this.isCameraActive = false;
    }

    ngOnDestroy(): void {
        this.stopCamera();
    }
}
