import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { DatePipe, NgClass, NgTemplateOutlet } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit,
    TemplateRef,
    ViewChild,
    ViewContainerRef,
    ViewEncapsulation,
} from '@angular/core';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { NotificationsService } from 'app/layout/common/notifications/notifications.service';
import { Notification } from 'app/layout/common/notifications/notifications.types';
// ...imports sin cambios
import { Subject, takeUntil } from 'rxjs';
import { TimeAgoPipe } from 'app/shared/pipes/time-ago.pipe';

@Component({
    selector: 'notifications',
    templateUrl: './notifications.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    exportAs: 'notifications',
    standalone: true,
    imports: [
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        NgClass,
        NgTemplateOutlet,
        RouterLink,
        DatePipe,
        TimeAgoPipe
    ],
})
export class NotificationsComponent implements OnInit, OnDestroy {
    @ViewChild('notificationsOrigin') private _notificationsOrigin: MatButton;
    @ViewChild('notificationsPanel') private _notificationsPanel: TemplateRef<any>;

    notifications: Notification[] = [];
    unreadCount: number = 0;
    private _overlayRef: OverlayRef;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _notificationsService: NotificationsService,
        private _overlay: Overlay,
        private _viewContainerRef: ViewContainerRef
    ) {}

    ngOnInit(): void {
        this._notificationsService.notifications$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((notifications: Notification[]) => {
                // Filtrar solo notificaciones visibles (view === true)
                this.notifications = notifications.filter(n => n.view);

                this._calculateUnreadCount();
                this._changeDetectorRef.markForCheck();
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();

        if (this._overlayRef) {
            this._overlayRef.dispose();
        }
    }

    openPanel(): void {
        if (!this._notificationsPanel || !this._notificationsOrigin) {
            return;
        }

        if (!this._overlayRef) {
            this._createOverlay();
        }

        this._overlayRef.attach(
            new TemplatePortal(this._notificationsPanel, this._viewContainerRef)
        );
    }

    closePanel(): void {
        this._overlayRef.detach();
    }

    markAllAsRead(): void {
        this._notificationsService.markAllAsRead().subscribe();
    }

    markRead(notification: Notification): void {
        if (notification.read) return;

        this._notificationsService.markAsReadApi(notification.id).subscribe(() => {
            this._calculateUnreadCount();
            this._changeDetectorRef.markForCheck();
        });
    }

    toggleRead(notification: Notification): void {
        if (notification.read) {
            // Si pasamos de leído a no leído, solo actualizamos localmente
            this._notificationsService.update(notification.id, { read: false }).subscribe();
        } else {
            // Si pasamos de no leído a leído, llamamos al API
            this.markRead(notification);
        }
    }

    delete(notification: Notification): void {
        this._notificationsService.delete(notification.id).subscribe();
    }

    trackByFn(index: number, item: any): any {
        return item.id || index;
    }

    private _createOverlay(): void {
        this._overlayRef = this._overlay.create({
            hasBackdrop: true,
            backdropClass: 'fuse-backdrop-on-mobile',
            scrollStrategy: this._overlay.scrollStrategies.block(),
            positionStrategy: this._overlay
                .position()
                .flexibleConnectedTo(this._notificationsOrigin._elementRef.nativeElement)
                .withLockedPosition(true)
                .withPush(true)
                .withPositions([
                    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
                    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
                    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
                    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
                ]),
        });

        this._overlayRef.backdropClick().subscribe(() => {
            this._overlayRef.detach();
        });
    }

    private _calculateUnreadCount(): void {
        this.unreadCount = this.notifications?.filter(n => !n.read)?.length || 0;
    }
}