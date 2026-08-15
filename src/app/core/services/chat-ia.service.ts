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

    get context$(): Observable<ChatIaContext | null> {
        return this._context$.asObservable();
    }

    setContext(moduloName: string, datos: any): void {
        const datosJson = datos ? (typeof datos === 'string' ? datos : JSON.stringify(datos)) : '';
        this._context$.next({ moduloName, datosJson });
    }

    clearContext(): void {
        this._context$.next(null);
    }
}
