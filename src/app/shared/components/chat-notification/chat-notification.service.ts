import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ChatNotificationComponent } from './chat-notification.component';

@Injectable({
    providedIn: 'root'
})
export class ChatNotificationService {
    private _snackBar = inject(MatSnackBar);

    showNotification(remitenteName: string, contenido: string): void {
        this._snackBar.openFromComponent(ChatNotificationComponent, {
            data: { remitenteName, contenido },
            duration: 5000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
            panelClass: ['chat-notification-snack']
        });
    }
}
