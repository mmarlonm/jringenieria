import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserTrackerService } from 'app/core/tracker/user-tracker.service';

export interface ChatIaContext {
    moduloName: string;
    datosJson: string;
}

@Injectable({
    providedIn: 'root'
})
export class ChatIaService {
    private _context$ = new BehaviorSubject<ChatIaContext | null>(null);
    private _isOpen$ = new BehaviorSubject<boolean>(false);
    private _userTrackerService = inject(UserTrackerService);

    get context$(): Observable<ChatIaContext | null> {
        return this._context$.asObservable();
    }

    get isOpen$(): Observable<boolean> {
        return this._isOpen$.asObservable();
    }

    toggleChat(): void {
        const wasOpen = this._isOpen$.value;
        this._isOpen$.next(!wasOpen);
        if (!wasOpen) {
            this._userTrackerService.registrarEvento('Rayito IA', 'Abrir chat', 'RayitoIA');
        }
    }

    openChat(): void {
        this._isOpen$.next(true);
        this._userTrackerService.registrarEvento('Rayito IA', 'Abrir chat', 'RayitoIA');
    }

    closeChat(): void {
        this._isOpen$.next(false);
    }

    setContext(moduloName: string, datos: any): void {
        const datosJson = datos ? (typeof datos === 'string' ? datos : JSON.stringify(datos)) : '';
        this._context$.next({ moduloName, datosJson });
    }

    clearContext(): void {
        this._context$.next(null);
    }
}
