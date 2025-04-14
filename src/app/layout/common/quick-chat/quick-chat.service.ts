import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Chat } from 'app/layout/common/quick-chat/quick-chat.types';
import {
    BehaviorSubject,
    map,
    Observable,
    of,
    switchMap,
    tap,
    throwError,
} from 'rxjs';
import { environment } from 'environments/environment'; // Asegúrate de tener la URL base de tu API aquí

@Injectable({ providedIn: 'root' })
export class QuickChatService {
    private _chat: BehaviorSubject<Chat> = new BehaviorSubject(null);
    private _chats: BehaviorSubject<Chat[]> = new BehaviorSubject<Chat[]>(null);
    private apiUrl = `${environment.apiUrl}/Chat`; // Asegúrate de que esto sea correcto

    /**
     * Constructor
     */
    constructor(private _httpClient: HttpClient) {}

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for chat
     */
    get chat$(): Observable<Chat> {
        return this._chat.asObservable();
    }

    get userInformation(): string {
        return localStorage.getItem("userInformation") ?? "";
      }

    /**
     * Getter for chat
     */
    get chats$(): Observable<Chat[]> {
        return this._chats.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------


    /**
     * Get chat
     *
     * @param id
     */
    getChatById(id: string): Observable<any> {
        return this._httpClient
            .get<Chat>('api/apps/chat/chat', { params: { id } })
            .pipe(
                map((chat) => {
                    // Update the chat
                    this._chat.next(chat);

                    // Return the chat
                    return chat;
                }),
                switchMap((chat) => {
                    if (!chat) {
                        return throwError(
                            'Could not found chat with id of ' + id + '!'
                        );
                    }

                    return of(chat);
                })
            );
    }

    getChats(id : number): Observable<any> {
        return this._httpClient.get<Chat[]>(`${this.apiUrl}/chats/${id}`).pipe(
            tap((response: Chat[]) => {
                this._chats.next(response);
            })
        );
    }

    enviarMensaje(mensaje: { remitenteId: number; destinatarioId: number; contenido: string }): Observable<any> {
        return this._httpClient.post<any>(`${this.apiUrl}/enviar`, mensaje).pipe(
            tap((mensajeEnviado) => {
            })
        );
    }

    getChatById1(id : number, usuarioActualId: number): Observable<any> {
        return this._httpClient.get<Chat>(`${this.apiUrl}/obtener/${id}/${usuarioActualId}`).pipe(
            tap((chat) => {
                this._chat.next(chat);
            })
        );
    }
}
