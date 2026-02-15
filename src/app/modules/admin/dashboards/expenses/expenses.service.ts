import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, ReplaySubject, tap } from 'rxjs';
import { environment } from 'environments/environment';
import { Expense, ExpenseCatalogs } from './models/expenses.types';

@Injectable({
    providedIn: 'root'
})
export class ExpensesService {
    private apiUrl = `${environment.apiUrl}/Gastos`; // Asegúrate de que esto sea correcto
    private apiUrlProyecto = `${environment.apiUrl}/Proyecto`;

    // Sujetos para reactividad
    private _expenses: ReplaySubject<Expense[]> = new ReplaySubject<Expense[]>(1);
    private _expense: BehaviorSubject<Expense | null> = new BehaviorSubject(null);
    private _catalogs: BehaviorSubject<ExpenseCatalogs | null> = new BehaviorSubject(null);

    constructor(private _httpClient: HttpClient) { }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------
    get expenses$(): Observable<Expense[]> {
        return this._expenses.asObservable();
    }

    get expense$(): Observable<Expense> {
        return this._expense.asObservable();
    }

    get catalogs$(): Observable<ExpenseCatalogs> {
        return this._catalogs.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Obtiene todos los catálogos necesarios para el formulario
     */
    getCatalogos(): Observable<ExpenseCatalogs> {
        return this._httpClient.get<ExpenseCatalogs>(`${this.apiUrl}/catalogos`).pipe(
            tap((catalogs) => {
                this._catalogs.next(catalogs);
            })
        );
    }

    /**
     * Obtiene la lista de gastos, opcionalmente filtrada por unidad
     */
    getExpenses(unidadId?: number): Observable<Expense[]> {
        const url = unidadId ? `${this.apiUrl}?unidadId=${unidadId}` : this.apiUrl;
        return this._httpClient.get<Expense[]>(url).pipe(
            tap((expenses) => {
                this._expenses.next(expenses);
            })
        );
    }

    /**
     * Obtiene un gasto por ID
     */
    getExpenseById(id: number): Observable<Expense> {
        return this._httpClient.get<Expense>(`${this.apiUrl}/${id}`).pipe(
            tap((expense) => {
                this._expense.next(expense);
            })
        );
    }

    /**
     * Crea un nuevo gasto
     */
    createExpense(expense: Expense): Observable<Expense> {
        return this._httpClient.post<Expense>(this.apiUrl, expense).pipe(
            tap((newExpense) => {
                // Actualizar la lista local si es necesario
                this.getExpenses(expense.unidadId).subscribe();
            })
        );
    }

    /**
     * Actualiza un gasto existente
     */
    updateExpense(id: number, expense: Expense): Observable<Expense> {
        return this._httpClient.put<Expense>(`${this.apiUrl}/${id}`, expense).pipe(
            tap((updatedExpense) => {
                this._expense.next(updatedExpense);
                this.getExpenses(expense.unidadId).subscribe();
            })
        );
    }

    /**
     * Borrado lógico de un gasto
     */
    deleteExpense(id: number): Observable<any> {
        return this._httpClient.delete(`${this.apiUrl}/${id}`).pipe(
            tap(() => {
                // Podrías refrescar la lista aquí
            })
        );
    }

    getUnidadesNegocio(): Observable<any[]> {
        return this._httpClient.get<any[]>(`${this.apiUrlProyecto}/unidades-negocio`);
    }
}