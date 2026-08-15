import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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

    get context$(): Observable<ChatIaContext | null> {
        return this._context$.asObservable();
    }

    get isOpen$(): Observable<boolean> {
        return this._isOpen$.asObservable();
    }

    toggleChat(): void {
        this._isOpen$.next(!this._isOpen$.value);
    }

    openChat(): void {
        this._isOpen$.next(true);
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
