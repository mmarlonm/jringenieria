import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, of, catchError, tap } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ExchangeRateService {
    // API pública de Frankfurter (no requiere API Key)
    private readonly apiUrl = 'https://api.frankfurter.app/latest?from=USD&to=MXN';
    
    // Valor de respaldo por si la API falla o no hay conexión
    private readonly defaultRate = 18.50;
    
    // Almacenamos el último tipo de cambio obtenido
    private _currentRate: BehaviorSubject<number> = new BehaviorSubject<number>(this.defaultRate);

    constructor(private _httpClient: HttpClient) {
        // Intentar obtener el tipo de cambio al inicializar el servicio
        this.updateExchangeRate().subscribe();
    }

    /**
     * Getter para obtener un observable con el tipo de cambio actual
     */
    get currentRate$(): Observable<number> {
        return this._currentRate.asObservable();
    }

    /**
     * Valor síncrono del tipo de cambio actual
     */
    get currentRate(): number {
        return this._currentRate.value;
    }

    /**
     * Consulta el tipo de cambio más reciente desde la API externa
     */
    updateExchangeRate(): Observable<number> {
        return this._httpClient.get<any>(this.apiUrl).pipe(
            map(response => {
                const rate = response?.rates?.MXN;
                if (rate && typeof rate === 'number') {
                    this._currentRate.next(rate);
                    return rate;
                }
                throw new Error('Formato de respuesta de API inválido');
            }),
            catchError(err => {
                console.warn('[ExchangeRateService] Error al obtener tipo de cambio, usando valor de respaldo:', err);
                // Mantenemos el valor actual (o el default si nunca se actualizó)
                return of(this._currentRate.value);
            })
        );
    }

    /**
     * Convierte un monto a MXN basado en la moneda proporcionada
     * @param monto El monto original
     * @param moneda El código de moneda (USD, MXN, etc.)
     * @returns El monto convertido a MXN
     */
    convertMontoToMXN(monto: number, moneda: string = 'MXN'): number {
        if (!monto) return 0;
        
        const mon = (moneda || 'MXN').toUpperCase();
        
        if (mon === 'MXN' || mon === 'MXP') {
            return monto;
        }
        
        if (mon === 'USD') {
            return monto * this.currentRate;
        }
        
        // Si es otra moneda no soportada, devolvemos el monto original por ahora
        // (Podrías escalar esto añadiendo más monedas a la API y al mapeo)
        return monto;
    }
}
