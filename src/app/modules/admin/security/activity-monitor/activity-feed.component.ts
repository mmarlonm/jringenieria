import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { ActivitySignalRService, ActivityLog } from 'app/core/signalr/activity-signalr.service';
import { Subject, takeUntil } from 'rxjs';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

@Component({
    selector: 'activity-feed',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './activity-feed.component.html',
    styles: [`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
        .backdrop-blur-md { backdrop-filter: blur(12px); }
    `],
    animations: [
        trigger('listAnimation', [
            transition('* <=> *', [
                query(':enter', [
                    style({ opacity: 0, transform: 'translateY(-10px)' }),
                    stagger('50ms', animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })))
                ], { optional: true })
            ])
        ])
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityFeedComponent implements OnInit, OnDestroy {
    private _activityService = inject(ActivitySignalRService);
    private _changeDetectorRef = inject(ChangeDetectorRef);
    private _router = inject(Router);
    private _unsubscribeAll = new Subject<void>();
    
    @Input() activities: ActivityLog[] = [];

    ngOnInit(): void {
        // Suscribirse a los movimientos del nuevo servicio centralizado
        this._activityService.movimientos$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((movimiento: ActivityLog) => {
                // Evitar duplicados si el padre ya los maneja
                if (!this.activities.find(a => a.idLog === movimiento.idLog && a.fecha === movimiento.fecha)) {
                    this.activities.unshift(movimiento);
                    if (this.activities.length > 50) this.activities.pop();
                    this._changeDetectorRef.markForCheck();
                }
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    /**
     * Redirección directa al módulo
     */
    goToModule(url: string): void {
        if (!url) return;
        const cleanUrl = url.split('?')[0]; // Quitar query params si existen
        this._router.navigateByUrl(cleanUrl);
    }

    getModuleIcon(modulo: string): string {
        const name = modulo?.toLowerCase() || '';
        if (name.includes('seguridad') || name.includes('usuarios')) return 'heroicons_outline:shield-check';
        if (name.includes('compras') || name.includes('solicitud')) return 'heroicons_outline:shopping-cart';
        if (name.includes('proyecto')) return 'heroicons_outline:briefcase';
        if (name.includes('tablero') || name.includes('dashboard')) return 'heroicons_outline:chart-bar';
        if (name.includes('monitor')) return 'heroicons_outline:desktop-computer';
        return 'heroicons_outline:cube-transparent';
    }

    trackByFn(index: number, item: ActivityLog): string {
        return (item.idLog || index) + item.fecha + item.nombreUsuario;
    }
}
